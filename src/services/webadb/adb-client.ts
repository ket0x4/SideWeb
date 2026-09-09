import type { AdbDaemonWebUsbDevice } from "@yume-chan/adb-daemon-webusb";
import type {
	AdbConnectionStatus,
	DeviceInfo,
	InstalledAppInfo,
	LogEntry,
	LogListener,
	ObbFolderInfo,
	ParsedPackageInfo,
	StatusListener,
} from "../../types/adb";
import { ConnectionManager } from "./modules/connection-manager";
import { DeviceInfoService } from "./modules/device-info-service";
import { FileTransferService } from "./modules/file-transfer-service";
import { LoggerService } from "./modules/logger-service";
import { PackageManagerService } from "./modules/package-manager-service";

const logger = new LoggerService();
const connection = new ConnectionManager(logger);
const deviceInfo = new DeviceInfoService(connection, logger);
const packageManager = new PackageManagerService(connection, logger);
const fileTransfer = new FileTransferService(connection, logger);

let activeAbortController: AbortController | null = null;

async function withAbortSignal<T>(
	operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	if (activeAbortController) activeAbortController.abort();
	const controller = new AbortController();
	activeAbortController = controller;
	try {
		return await operation(controller.signal);
	} finally {
		if (activeAbortController === controller) activeAbortController = null;
	}
}

export const adbClient = {
	onLog(listener: LogListener): () => void {
		return logger.onLog(listener);
	},

	onStatusChange(listener: StatusListener): () => void {
		return logger.onStatusChange(listener);
	},

	log(message: string, type: LogEntry["type"] = "info"): void {
		logger.log(message, type);
	},

	getStatus(): AdbConnectionStatus {
		return logger.getStatus();
	},

	isConnected(): boolean {
		return connection.isConnected();
	},

	cancelCurrentOperation(): void {
		if (activeAbortController) {
			activeAbortController.abort();
			activeAbortController = null;
			logger.log("Active operation cancelled by user.", "warning");
		}
	},

	async autoConnect(): Promise<boolean> {
		return connection.autoConnect();
	},

	async requestDevice(): Promise<boolean> {
		return connection.requestDevice();
	},

	async connectDevice(device: AdbDaemonWebUsbDevice): Promise<boolean> {
		return connection.connectDevice(device);
	},

	async disconnect(forgetDevice = false): Promise<void> {
		return connection.disconnect(forgetDevice);
	},

	async getDeviceInfo(): Promise<DeviceInfo | null> {
		return deviceInfo.getDeviceInfo();
	},

	async pullFileToBrowser(
		devicePath: string,
		downloadFilename: string,
		onProgress?: (progress: number) => void,
	): Promise<boolean> {
		return withAbortSignal((signal) =>
			fileTransfer.pullFileToBrowser(
				devicePath,
				downloadFilename,
				signal,
				onProgress,
			),
		);
	},

	async pullObbFolderAsZip(
		packageName: string,
		onProgress?: (progress: number) => void,
	): Promise<boolean> {
		return withAbortSignal((signal) =>
			fileTransfer.pullObbFolderAsZip(packageName, signal, onProgress),
		);
	},

	async pullAppApk(
		packageName: string,
		onProgress?: (progress: number) => void,
	): Promise<boolean> {
		return withAbortSignal((signal) =>
			fileTransfer.pullAppApk(packageName, signal, onProgress),
		);
	},

	async pullObbFile(
		packageName: string,
		obbFilename: string,
		onProgress?: (progress: number) => void,
	): Promise<boolean> {
		return withAbortSignal((signal) =>
			fileTransfer.pullObbFile(packageName, obbFilename, signal, onProgress),
		);
	},

	async extractAppBundle(
		packageName: string,
		onProgress?: (step: string, progress: number) => void,
	): Promise<Blob> {
		return withAbortSignal((signal) =>
			fileTransfer.extractAppBundle(packageName, signal, onProgress),
		);
	},

	async installPackage(
		file: File,
		onProgress?: (step: string, progress: number) => void,
	): Promise<boolean> {
		return withAbortSignal((signal) =>
			packageManager.installPackage(file, signal, onProgress),
		);
	},

	async installParsedPackage(
		parsed: ParsedPackageInfo,
		onProgress?: (step: string, progress: number) => void,
	): Promise<boolean> {
		return withAbortSignal((signal) =>
			packageManager.installParsedPackage(parsed, signal, onProgress),
		);
	},

	async listInstalledApps(showSystem = false): Promise<InstalledAppInfo[]> {
		return packageManager.listInstalledApps(showSystem);
	},

	async uninstallApp(packageName: string): Promise<boolean> {
		return packageManager.uninstallApp(packageName);
	},

	async launchApp(packageName: string): Promise<boolean> {
		return packageManager.launchApp(packageName);
	},

	async listObbFolders(): Promise<ObbFolderInfo[]> {
		return fileTransfer.listObbFolders();
	},

	async deleteObbFolder(packageName: string): Promise<boolean> {
		return fileTransfer.deleteObbFolder(packageName);
	},

	async runShellCommand(command: string): Promise<string> {
		logger.log(`$ adb shell ${command}`);
		return await connection.execShell(command);
	},
};
