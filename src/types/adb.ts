export type AdbConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "unauthorized"
	| "error";

export interface DeviceInfo {
	model: string;
	serial: string;
	androidVersion: string;
	buildId?: string;
	questOsVersion?: string;
	installedAppsCount?: number;
	securityPatch?: string;
	deviceCodename?: string;
	batteryLevel: number | null;
	storageFree: string;
	storageTotal: string;
	ipAddress?: string;
	displaySize?: string;
	cpuAbi?: string;
}

export interface InstalledAppInfo {
	packageName: string;
	label: string;
	versionCode?: number;
	installer?: string;
	isSystem: boolean;
}

export interface ObbFolderInfo {
	packageName: string;
	files: Array<{ name: string; size: string }>;
}

export interface LogEntry {
	id: string;
	timestamp: string;
	type: "info" | "success" | "warning" | "error";
	message: string;
}

export interface ParsedPackageInfo {
	packageName: string;
	label: string;
	versionName: string;
	versionCode: number;
	obbFiles: Array<{ filename: string; data: Uint8Array }>;
	apkFiles: Array<{ filename: string; data: Uint8Array }>;
}

export interface ObbTransferProgress {
	filename: string;
	bytesTransferred: number;
	totalBytes: number;
	percentage: number;
}

export type LogListener = (entry: LogEntry) => void;
export type StatusListener = (status: AdbConnectionStatus) => void;

// Web File System Access API Type Definitions
export interface FileSystemWritableFileStream {
	write(
		data: Uint8Array | BufferSource | Blob | string | unknown,
	): Promise<void>;
	close(): Promise<void>;
}

interface FileSystemFileHandle {
	createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface SaveFilePickerOptions {
	suggestedName?: string;
	types?: Array<{
		description?: string;
		accept: Record<string, string[]>;
	}>;
}

declare global {
	interface Window {
		showSaveFilePicker?: (
			options?: SaveFilePickerOptions,
		) => Promise<FileSystemFileHandle>;
	}
}
