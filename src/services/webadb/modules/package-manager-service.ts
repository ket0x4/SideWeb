import type { Adb } from "@yume-chan/adb";
import { PackageManager } from "@yume-chan/android-bin";
import { ADB_PATHS, formatPackageLabel } from "../../../constants/adb";
import type {
	InstalledAppInfo,
	ObbTransferProgress,
	ParsedPackageInfo,
} from "../../../types/adb";
import { processPackageFile } from "../apk-parser";
import {
	escapeShellArg,
	isValidPackageName,
	sanitizePathSegment,
} from "../utils/shell-helpers";
import { pushDataToDevice } from "../utils/stream-helpers";
import { BaseService } from "./base-service";

function extractObbPackageName(filepath: string, fallback = ""): string {
	const obbMatch = filepath.match(/main\.\d+\.([a-zA-Z0-9._]+)\.obb/i);
	if (obbMatch) return obbMatch[1];
	const partMatch = filepath
		.split("/")
		.find((part) => /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(part));
	return partMatch || fallback;
}

async function pushObbFile(
	adb: Adb,
	execShell: (cmd: string) => Promise<string>,
	packageName: string,
	obbFilename: string,
	data: Uint8Array,
	signal?: AbortSignal,
	onProgress?: (progress: ObbTransferProgress) => void,
): Promise<string> {
	const cleanFilename = sanitizePathSegment(
		obbFilename.split("/").pop() || obbFilename,
	);
	const targetDir = `${ADB_PATHS.OBB_DIR}/${packageName}`;
	const targetPath = `${targetDir}/${cleanFilename}`;

	await execShell(`mkdir -p ${escapeShellArg(targetDir)}`).catch(() => {});

	const sync = await adb.sync();
	try {
		await pushDataToDevice(
			sync,
			targetPath,
			data,
			signal,
			(percentage, transferred, total) => {
				onProgress?.({
					filename: cleanFilename,
					bytesTransferred: transferred,
					totalBytes: total,
					percentage,
				});
			},
		);
		return targetPath;
	} finally {
		await sync.dispose();
	}
}

export class PackageManagerService extends BaseService {
	public async listInstalledApps(
		showSystem = false,
	): Promise<InstalledAppInfo[]> {
		const adb = this.connection.getAdbInstance();
		if (!adb) return [];

		try {
			const pm = new PackageManager(adb);
			const apps: InstalledAppInfo[] = [];

			for await (const pkg of pm.listPackages({
				listThirdParty: !showSystem,
				listSystem: showSystem,
			})) {
				const formattedLabel = formatPackageLabel(pkg.packageName);
				apps.push({
					packageName: pkg.packageName,
					label: formattedLabel,
					versionCode: pkg.versionCode,
					installer: pkg.installer,
					isSystem: showSystem,
				});
			}

			return apps.sort((a, b) => a.label.localeCompare(b.label));
		} catch (err: unknown) {
			this.logError("Failed to list packages", err);
			return [];
		}
	}

	public async uninstallApp(packageName: string): Promise<boolean> {
		if (!isValidPackageName(packageName)) {
			this.logError(`Uninstall rejected: invalid package name: ${packageName}`);
			return false;
		}

		const adb = this.connection.getAdbInstance();
		if (!adb) return false;

		try {
			this.logger.log(`Uninstalling package: ${packageName}...`);
			const pm = new PackageManager(adb);
			await pm.uninstall(packageName);
			this.logger.log(`Successfully uninstalled ${packageName}`, "success");
			return true;
		} catch (err: unknown) {
			this.logError(`Uninstall failed for ${packageName}`, err);
			return false;
		}
	}

	public async launchApp(packageName: string): Promise<boolean> {
		if (!isValidPackageName(packageName)) {
			this.logError(`Launch rejected: invalid package name: ${packageName}`);
			return false;
		}

		const adb = this.connection.getAdbInstance();
		if (!adb) return false;

		try {
			this.logger.log(`Launching package: ${packageName}...`);
			await this.connection.execShell(
				`monkey -p ${escapeShellArg(packageName)} -c android.intent.category.LAUNCHER 1`,
			);
			this.logger.log(`Launched ${packageName}`, "success");
			return true;
		} catch (err: unknown) {
			this.logError(`Launch failed for ${packageName}`, err);
			return false;
		}
	}

	public async installParsedPackage(
		parsed: ParsedPackageInfo,
		signal: AbortSignal,
		onProgress?: (step: string, progress: number) => void,
	): Promise<boolean> {
		const adb = this.getConnectedAdb();
		if (!adb) return false;

		try {
			this.logger.log(
				`Installing package: ${parsed.packageName || parsed.label || "Unknown"}...`,
			);

			if (parsed.apkFiles.length > 0) {
				if (onProgress) onProgress("Uploading & Installing APK...", 20);

				for (let i = 0; i < parsed.apkFiles.length; i++) {
					if (signal.aborted) throw new Error("Operation cancelled by user");

					const apk = parsed.apkFiles[i];
					const tempPath = `${ADB_PATHS.TEMP_DIR}/temp_${Date.now()}_${i}.apk`;
					this.logger.log(`Uploading ${apk.filename} to Quest 3...`);

					try {
						const syncResult = await this.withAdbSync(
							`Upload failed for ${apk.filename}`,
							async (sync) => {
								await pushDataToDevice(
									sync,
									tempPath,
									apk.data,
									signal,
									(pct) => {
										if (onProgress) {
											const overallPct = Math.round(20 + pct * 0.4);
											onProgress(`Uploading ${apk.filename}...`, overallPct);
										}
									},
								);
								return true;
							},
						);

						if (!syncResult) {
							throw new Error(`Failed to upload ${apk.filename} to device`);
						}

						if (signal.aborted) throw new Error("Operation cancelled by user");

						this.logger.log(
							`Installing package via pm install -r ${tempPath}...`,
						);
						if (onProgress)
							onProgress("Executing installation on device...", 65);

						const result = await this.connection.execShell(
							`pm install -r ${escapeShellArg(tempPath)}`,
						);
						const isSuccess = result.toLowerCase().includes("success");
						if (!isSuccess) {
							throw new Error(
								`Installation rejected by device OS: ${result.trim()}`,
							);
						}
						this.logger.log(`Install result: ${result.trim()}`, "success");
					} finally {
						await this.connection
							.execShell(`rm -f ${escapeShellArg(tempPath)}`)
							.catch(() => {});
					}
				}
			}

			if (parsed.obbFiles.length > 0) {
				if (onProgress) onProgress("Transferring OBB files to Quest 3...", 75);

				for (let i = 0; i < parsed.obbFiles.length; i++) {
					if (signal.aborted) throw new Error("Operation cancelled by user");

					const obb = parsed.obbFiles[i];
					const rawPkgName = extractObbPackageName(
						obb.filename,
						parsed.packageName,
					);
					const pkgName = isValidPackageName(rawPkgName) ? rawPkgName : "";

					if (!pkgName) {
						this.logger.log(
							`Skipping OBB ${obb.filename}: package name could not be resolved or is invalid.`,
							"warning",
						);
						continue;
					}

					this.logger.log(
						`Pushing OBB file ${obb.filename} to ${ADB_PATHS.OBB_DIR}/${pkgName}/...`,
					);

					await pushObbFile(
						adb,
						(cmd) => this.connection.execShell(cmd),
						pkgName,
						obb.filename,
						obb.data,
						signal,
						(obbProgress: ObbTransferProgress) => {
							if (onProgress) {
								const stepPct = Math.round(75 + obbProgress.percentage * 0.25);
								onProgress(
									`Transferring OBB (${obbProgress.percentage}%)...`,
									stepPct,
								);
							}
						},
					);
					this.logger.log(
						`OBB file ${obb.filename} successfully transferred!`,
						"success",
					);
				}
			}

			if (onProgress) onProgress("Complete!", 100);
			this.logger.log(
				`Installation completed for ${parsed.label || parsed.packageName}`,
				"success",
			);
			return true;
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			this.logger.log(`Installation failed: ${msg}`, "error");
			return false;
		}
	}

	public async installPackage(
		file: File,
		signal: AbortSignal,
		onProgress?: (step: string, progress: number) => void,
	): Promise<boolean> {
		try {
			this.logger.log(`Processing file: ${file.name}...`);
			if (onProgress) onProgress("Parsing file package...", 5);

			const parsed: ParsedPackageInfo = await processPackageFile(file);
			this.logger.log(
				`Parsed package name: ${parsed.packageName || "Unknown"}`,
				"info",
			);

			return await this.installParsedPackage(parsed, signal, onProgress);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			this.logger.log(`Sideload failed: ${msg}`, "error");
			return false;
		}
	}
}
