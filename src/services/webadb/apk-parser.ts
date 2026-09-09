import { strFromU8, unzipSync } from "fflate";
import type { ParsedPackageInfo } from "../../types/adb";

function parseApkManifest(manifestData: Uint8Array): {
	packageName: string;
	versionName: string;
	versionCode: number;
	label: string;
} {
	let packageName = "";
	let versionName = "";

	try {
		const view = new DataView(
			manifestData.buffer,
			manifestData.byteOffset,
			manifestData.byteLength,
		);
		const headerSize = view.getUint16(2, true);
		if (
			view.getUint16(0, true) === 0x0003 &&
			view.getUint16(headerSize, true) === 0x0001
		) {
			const stringCount = view.getUint32(headerSize + 8, true);
			const isUtf8 = (view.getUint32(headerSize + 16, true) & (1 << 8)) !== 0;
			const stringsStart = headerSize + view.getUint32(headerSize + 20, true);

			for (let i = 0; i < stringCount; i++) {
				const strOffset = view.getUint32(headerSize + 24 + i * 4, true);
				const actualStart = stringsStart + strOffset;
				if (actualStart >= manifestData.length) break;

				const str = isUtf8
					? strFromU8(
							manifestData.subarray(
								actualStart + 2,
								actualStart + 2 + manifestData[actualStart + 1],
							),
						)
					: Array.from({ length: view.getUint16(actualStart, true) }, (_, j) =>
							String.fromCharCode(
								view.getUint16(actualStart + 2 + j * 2, true),
							),
						).join("");

				if (
					!packageName &&
					/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(str) &&
					!str.startsWith("android.") &&
					!str.startsWith("androidx.") &&
					!str.startsWith("java.") &&
					!str.startsWith("javax.") &&
					!str.startsWith("kotlin.") &&
					!str.startsWith("schema.")
				) {
					packageName = str;
				}
				if (!versionName && /^\d+(\.\d+)+/.test(str)) {
					versionName = str;
				}
			}
		}
	} catch {}

	return {
		packageName: packageName || "unknown.package",
		versionName: versionName || "1.0",
		versionCode: 1,
		label: packageName || "Unknown App",
	};
}

function extractManifestInfo(apkBuffer: Uint8Array): {
	packageName: string;
	versionName: string;
	versionCode: number;
} | null {
	try {
		const unzipped = unzipSync(apkBuffer, {
			filter: (f) => f.name === "AndroidManifest.xml",
		});
		if (unzipped["AndroidManifest.xml"]) {
			return parseApkManifest(unzipped["AndroidManifest.xml"]);
		}
	} catch {}
	return null;
}

export async function processPackageFile(
	file: File,
): Promise<ParsedPackageInfo> {
	const buffer = new Uint8Array(await file.arrayBuffer());
	const filename = file.name.toLowerCase();

	const result: ParsedPackageInfo = {
		packageName: "",
		label: file.name.replace(/\.[^/.]+$/, ""),
		versionName: "1.0",
		versionCode: 1,
		obbFiles: [],
		apkFiles: [],
	};

	if (filename.endsWith(".apk")) {
		result.apkFiles.push({ filename: file.name, data: buffer });
		const parsed = extractManifestInfo(buffer);
		if (parsed) {
			result.packageName = parsed.packageName;
			result.versionName = parsed.versionName;
			result.versionCode = parsed.versionCode;
		}
	} else if (
		filename.endsWith(".xapk") ||
		filename.endsWith(".zip") ||
		filename.endsWith(".apks")
	) {
		try {
			const unzipped = unzipSync(buffer);
			let manifestApkData: Uint8Array | null = null;

			for (const path of Object.keys(unzipped)) {
				const lowerPath = path.toLowerCase();
				if (lowerPath.endsWith(".apk")) {
					result.apkFiles.push({ filename: path, data: unzipped[path] });
					if (!manifestApkData) manifestApkData = unzipped[path];
				} else if (lowerPath.endsWith(".obb")) {
					result.obbFiles.push({ filename: path, data: unzipped[path] });
				}
			}

			if (manifestApkData) {
				const parsed = extractManifestInfo(manifestApkData);
				if (parsed) {
					result.packageName = parsed.packageName;
					result.versionName = parsed.versionName;
					result.versionCode = parsed.versionCode;
				}
			}
		} catch {}
	} else if (filename.endsWith(".obb")) {
		result.obbFiles.push({ filename: file.name, data: buffer });
	}

	if (!result.packageName) {
		const pkgMatch = file.name.match(/com\.[a-zA-Z0-9._]+/i);
		if (pkgMatch) {
			result.packageName = pkgMatch[0];
		}
	}

	return result;
}
