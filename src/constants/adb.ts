export const ADB_PATHS = {
	OBB_DIR: "/sdcard/Android/obb",
	TEMP_DIR: "/data/local/tmp",
} as const;

export const MAX_LOG_ENTRIES = 1000;

const SYSTEM_PACKAGE_PREFIXES = [
	"com.oculus.",
	"com.meta.",
	"com.facebook.",
	"com.qualcomm.",
	"com.android.",
	"com.google.",
] as const;

const SYSTEM_PACKAGE_EXACT = ["android"] as const;

export function isMetaOrSystemPackage(packageName: string): boolean {
	const lower = packageName.toLowerCase();
	if (SYSTEM_PACKAGE_EXACT.includes(lower as "android")) {
		return true;
	}
	return SYSTEM_PACKAGE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function formatPackageLabel(packageName: string): string {
	const parts = packageName.split(".");
	const last = parts.pop() || packageName;
	const name =
		["vr", "app", "android"].includes(last.toLowerCase()) && parts.length
			? `${parts.pop()} ${last}`
			: last;
	return name
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}
