import { Zip, ZipPassThrough } from "fflate";
import { ADB_PATHS } from "../../../constants/adb";
import type { ObbFolderInfo } from "../../../types/adb";
import {
	escapeShellArg,
	isValidPackageName,
	sanitizePathSegment,
} from "../utils/shell-helpers";
import {
	finalizeDownloadTarget,
	openSaveFileStream,
	pumpReadableStream,
} from "../utils/stream-helpers";
import { BaseService } from "./base-service";

function parseLsOutput(output: string): Array<{ name: string; size: number }> {
	const results: Array<{ name: string; size: number }> = [];
	for (const line of output.split("\n")) {
		const parts = line.trim().split(/\s+/);
		if (parts.length >= 5) {
			const name = parts[parts.length - 1];
			const size = parseInt(parts[4], 10) || 0;
			if (name && name !== "." && name !== "..") {
				results.push({ name, size });
			}
		}
	}
	return results;
}

export class FileTransferService extends BaseService {
	public async pullFileToBrowser(
		devicePath: string,
		downloadFilename: string,
		signal: AbortSignal,
		onProgress?: (progress: number) => void,
	): Promise<boolean> {
		this.logger.log(`Initiating pull stream for ${devicePath}...`);

		let totalSize = 0;
		try {
			const lsOut = await this.connection.execShell(
				`ls -l ${escapeShellArg(devicePath)}`,
			);
			const parts = lsOut.trim().split(/\s+/);
			if (parts.length >= 4) {
				totalSize = parseInt(parts[3], 10) || 0;
			}
		} catch {}

		const saveResult = await openSaveFileStream(
			{ suggestedName: downloadFilename },
			(msg, type) => this.logger.log(msg, type),
		);
		if (saveResult.cancelled) return false;
		const writableStream = saveResult.writableStream;

		const result = await this.withAdbSync(
			`Pull failed for ${downloadFilename}`,
			async (sync) => {
				const fileStream = sync.read(devicePath);
				const reader = fileStream.getReader();
				const fallbackChunks: Uint8Array[] = [];
				let transferred = 0;

				await pumpReadableStream(
					reader,
					signal,
					async (chunk) => {
						if (writableStream) {
							await writableStream.write(chunk);
						} else {
							fallbackChunks.push(chunk);
						}
						transferred += chunk.byteLength;
						if (onProgress && totalSize > 0) {
							const pct = Math.round((transferred / totalSize) * 100);
							onProgress(Math.min(pct, 99));
						}
					},
					async () => {
						if (writableStream) await writableStream.close();
					},
				);

				await finalizeDownloadTarget({
					writableStream,
					fallbackChunks,
					filename: downloadFilename,
					mimeType: "application/octet-stream",
					onLog: (msg, type) => this.logger.log(msg, type),
				});

				if (onProgress) onProgress(100);
				return true;
			},
		);

		return result ?? false;
	}

	public async pullObbFolderAsZip(
		packageName: string,
		signal: AbortSignal,
		onProgress?: (progress: number) => void,
	): Promise<boolean> {
		if (!isValidPackageName(packageName)) {
			this.logger.log(`Invalid package name: ${packageName}`, "error");
			return false;
		}

		this.logger.log(
			`Scanning OBB files in ${ADB_PATHS.OBB_DIR}/${packageName}/...`,
		);
		let lsOutput = "";
		try {
			lsOutput = await this.connection.execShell(
				`ls -l ${escapeShellArg(`${ADB_PATHS.OBB_DIR}/${packageName}`)}`,
			);
		} catch {
			return false;
		}
		const filesToPull = parseLsOutput(lsOutput);

		if (filesToPull.length === 0) {
			this.logger.log(
				`No OBB files found in ${ADB_PATHS.OBB_DIR}/${packageName}/`,
				"warning",
			);
			return false;
		}

		const totalFolderSize = filesToPull.reduce((acc, f) => acc + f.size, 0);
		const zipDownloadName = `${packageName}-obb.zip`;

		const saveResult = await openSaveFileStream(
			{
				suggestedName: zipDownloadName,
				types: [
					{
						description: "ZIP Archive",
						accept: { "application/zip": [".zip"] },
					},
				],
			},
			(msg, type) => this.logger.log(msg, type),
		);
		if (saveResult.cancelled) return false;
		const writableStream = saveResult.writableStream;

		this.logger.log(
			`Streaming & compressing ${filesToPull.length} OBB file(s) into single ZIP file directly to target destination...`,
			"info",
		);

		const fallbackZipChunks: Uint8Array[] = [];
		let writeChain = Promise.resolve();
		let writeError: Error | null = null;

		const zip = new Zip((err, chunk) => {
			if (err) {
				this.logger.log(`ZIP stream error: ${err.message}`, "error");
				return;
			}
			if (writableStream) {
				writeChain = writeChain
					.then(async () => {
						await writableStream.write(chunk);
					})
					.catch((wErr) => {
						writeError = wErr instanceof Error ? wErr : new Error(String(wErr));
						this.logger.log(`Disk write error: ${writeError.message}`, "error");
					});
			} else {
				fallbackZipChunks.push(chunk);
			}
		});

		let totalTransferredBytes = 0;

		const result = await this.withAdbSync(
			"Compressed OBB pull failed",
			async (sync) => {
				for (let i = 0; i < filesToPull.length; i++) {
					if (signal.aborted) {
						if (writableStream) await writableStream.close();
						throw new Error("Operation cancelled by user");
					}

					const { name: fileName } = filesToPull[i];
					const fullPath = `${ADB_PATHS.OBB_DIR}/${packageName}/${fileName}`;
					const zipInternalPath = `Android/obb/${packageName}/${fileName}`;

					this.logger.log(
						`Compressing & streaming (${i + 1}/${filesToPull.length}): ${fileName}...`,
					);

					const fileInZip = new ZipPassThrough(zipInternalPath);
					zip.add(fileInZip);

					const fileStream = sync.read(fullPath);
					const reader = fileStream.getReader();

					await pumpReadableStream(
						reader,
						signal,
						(chunk) => {
							fileInZip.push(chunk, false);
							totalTransferredBytes += chunk.byteLength;
							if (onProgress && totalFolderSize > 0) {
								const pct = Math.round(
									(totalTransferredBytes / totalFolderSize) * 95,
								);
								onProgress(Math.min(pct, 95));
							}
						},
						async () => {
							if (writableStream) await writableStream.close();
						},
					);

					fileInZip.push(new Uint8Array(0), true);
				}

				zip.end();
				await writeChain;
				if (writeError) {
					throw writeError;
				}

				await finalizeDownloadTarget({
					writableStream,
					fallbackChunks: fallbackZipChunks,
					filename: zipDownloadName,
					mimeType: "application/zip",
					diskSuccessMessage: `Successfully saved compressed OBB archive directly to disk: ${zipDownloadName}!`,
					onLog: (msg, type) => this.logger.log(msg, type),
				});

				if (onProgress) onProgress(100);
				return true;
			},
		);

		return result ?? false;
	}

	private ensureReadyForPackage(packageName: string): boolean {
		if (!this.connection.getAdbInstance()) return false;
		if (!isValidPackageName(packageName)) {
			this.logError(`Invalid package name: ${packageName}`);
			return false;
		}
		return true;
	}

	public async pullAppApk(
		packageName: string,
		signal: AbortSignal,
		onProgress?: (progress: number) => void,
	): Promise<boolean> {
		if (!this.ensureReadyForPackage(packageName)) return false;

		try {
			this.logger.log(`Locating APK path for ${packageName}...`);
			const pathOutput = await this.connection.execShell(
				`pm path ${escapeShellArg(packageName)}`,
			);
			const match = pathOutput.match(/package:(.*\.apk)/);

			if (!match) {
				this.logger.log(`Could not find APK path for ${packageName}`, "error");
				return false;
			}

			const apkPath = match[1].trim();
			return await this.pullFileToBrowser(
				apkPath,
				`${packageName}.apk`,
				signal,
				onProgress,
			);
		} catch (err: unknown) {
			this.logError("Failed to locate APK path", err);
			return false;
		}
	}

	public async pullObbFile(
		packageName: string,
		obbFilename: string,
		signal: AbortSignal,
		onProgress?: (progress: number) => void,
	): Promise<boolean> {
		if (!isValidPackageName(packageName)) {
			this.logError(`Invalid package name: ${packageName}`);
			return false;
		}
		const cleanObbName = sanitizePathSegment(obbFilename);
		const fullPath = `${ADB_PATHS.OBB_DIR}/${packageName}/${cleanObbName}`;
		return await this.pullFileToBrowser(
			fullPath,
			cleanObbName,
			signal,
			onProgress,
		);
	}

	public async listObbFolders(): Promise<ObbFolderInfo[]> {
		if (!this.connection.getAdbInstance()) return [];

		try {
			const output = await this.connection.execShell(
				`ls -la ${ADB_PATHS.OBB_DIR}/`,
			);
			const lines = output.split("\n");
			const folders: ObbFolderInfo[] = [];

			for (const line of lines) {
				const parts = line.trim().split(/\s+/);
				const folderName = parts[parts.length - 1];
				if (
					folderName &&
					folderName !== "." &&
					folderName !== ".." &&
					isValidPackageName(folderName)
				) {
					const filesOutput = await this.connection.execShell(
						`ls -l ${escapeShellArg(`${ADB_PATHS.OBB_DIR}/${folderName}`)}`,
					);
					const files = parseLsOutput(filesOutput).map((f) => ({
						name: f.name,
						size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
					}));
					folders.push({ packageName: folderName, files });
				}
			}

			return folders;
		} catch {
			return [];
		}
	}

	public async deleteObbFolder(packageName: string): Promise<boolean> {
		if (!this.ensureReadyForPackage(packageName)) return false;

		try {
			this.logger.log(`Deleting OBB folder for ${packageName}...`);
			await this.connection.execShell(
				`rm -rf ${escapeShellArg(`${ADB_PATHS.OBB_DIR}/${packageName}`)}`,
			);
			this.logger.log(
				`Deleted OBB directory: ${ADB_PATHS.OBB_DIR}/${packageName}`,
				"success",
			);
			return true;
		} catch (err: unknown) {
			this.logError("Failed to delete OBB folder", err);
			return false;
		}
	}

	public async extractAppBundle(
		packageName: string,
		signal: AbortSignal,
		onProgress?: (step: string, progress: number) => void,
	): Promise<Blob> {
		if (!this.connection.getAdbInstance()) {
			throw new Error("Device is not connected.");
		}
		if (!isValidPackageName(packageName)) {
			throw new Error(`Invalid package name: ${packageName}`);
		}

		if (onProgress) onProgress("Locating application on Quest...", 10);
		const pathOutput = await this.connection.execShell(
			`pm path ${escapeShellArg(packageName)}`,
		);
		const match = pathOutput.match(/package:(.*\.apk)/);
		if (!match) {
			throw new Error(`Could not find installed APK path for ${packageName}`);
		}
		const apkPath = match[1].trim();

		let obbFiles: Array<{ name: string; size: number }> = [];
		try {
			const lsOutput = await this.connection.execShell(
				`ls -l ${escapeShellArg(`${ADB_PATHS.OBB_DIR}/${packageName}`)}`,
			);
			obbFiles = parseLsOutput(lsOutput);
		} catch {
			obbFiles = [];
		}

		const zipChunks: Uint8Array[] = [];
		const zip = new Zip((err, chunk, _final) => {
			if (err) throw err;
			if (chunk) zipChunks.push(chunk);
		});

		const result = await this.withAdbSync(
			`Failed to extract app bundle for ${packageName}`,
			async (sync) => {
				if (onProgress) onProgress("Reading base APK from Quest...", 30);

				const apkInZip = new ZipPassThrough(`${packageName}.apk`);
				zip.add(apkInZip);

				const apkStream = sync.read(apkPath);
				const apkReader = apkStream.getReader();

				await pumpReadableStream(
					apkReader,
					signal,
					(chunk) => {
						apkInZip.push(chunk, false);
					},
					async () => {},
				);
				apkInZip.push(new Uint8Array(0), true);

				if (obbFiles.length > 0) {
					for (let i = 0; i < obbFiles.length; i++) {
						if (signal.aborted) throw new Error("Operation cancelled by user");
						const { name: fName } = obbFiles[i];
						if (onProgress) {
							const pct = Math.round(50 + (i / obbFiles.length) * 35);
							onProgress(`Reading OBB asset (${fName})...`, pct);
						}

						const obbInZip = new ZipPassThrough(
							`Android/obb/${packageName}/${fName}`,
						);
						zip.add(obbInZip);

						const obbStream = sync.read(
							`${ADB_PATHS.OBB_DIR}/${packageName}/${fName}`,
						);
						const obbReader = obbStream.getReader();

						await pumpReadableStream(
							obbReader,
							signal,
							(chunk) => {
								obbInZip.push(chunk, false);
							},
							async () => {},
						);
						obbInZip.push(new Uint8Array(0), true);
					}
				}

				if (onProgress) onProgress("Compressing package bundle...", 90);
				zip.end();

				return new Blob(zipChunks as unknown as BlobPart[], {
					type: "application/zip",
				});
			},
		);

		if (!result) {
			throw new Error("Failed to extract package bundle from Quest.");
		}
		if (onProgress) onProgress("Extraction complete!", 100);
		return result;
	}
}
