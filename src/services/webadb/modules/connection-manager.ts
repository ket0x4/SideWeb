import { Adb, AdbDaemonTransport } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import {
	type AdbDaemonWebUsbDevice,
	AdbDaemonWebUsbDeviceManager,
} from "@yume-chan/adb-daemon-webusb";
import type { LoggerService } from "./logger-service";

async function execAdbShell(adb: Adb, command: string): Promise<string> {
	if (adb.subprocess.shellProtocol) {
		const res = await adb.subprocess.shellProtocol.spawnWaitText(command);
		return res.stdout;
	}
	return await adb.subprocess.noneProtocol.spawnWaitText(command);
}

export class ConnectionManager {
	private adbInstance: Adb | null = null;
	private currentDevice: AdbDaemonWebUsbDevice | null = null;
	private credentialStore: AdbWebCredentialStore;
	private logger: LoggerService;

	constructor(logger: LoggerService) {
		this.logger = logger;
		this.credentialStore = new AdbWebCredentialStore("quest3-webadb");
	}

	public getAdbInstance(): Adb | null {
		return this.adbInstance;
	}

	public isConnected(): boolean {
		return this.logger.getStatus() === "connected" && this.adbInstance !== null;
	}

	public async execShell(command: string): Promise<string> {
		if (!this.adbInstance) throw new Error("Device not connected");
		return execAdbShell(this.adbInstance, command);
	}

	public async autoConnect(): Promise<boolean> {
		if (localStorage.getItem("quest3_user_disconnected") === "true") {
			return false;
		}

		const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
		if (!manager) return false;

		try {
			const devices = await manager.getDevices();
			if (devices.length > 0) {
				this.logger.log(
					`Found paired WebUSB device: ${devices[0].name || devices[0].serial || "Quest 3"}, auto-connecting...`,
				);
				this.currentDevice = devices[0];
				return await this.connectDevice(devices[0]);
			}
		} catch {}
		return false;
	}

	public async requestDevice(): Promise<boolean> {
		localStorage.removeItem("quest3_user_disconnected");
		const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
		if (!manager) {
			this.logger.log(
				"WebUSB is not supported by this browser. Please switch to a Chromium-based browser (Google Chrome, Microsoft Edge, Brave, or Opera).",
				"error",
			);
			this.logger.setStatus("error");
			return false;
		}

		try {
			this.logger.setStatus("connecting");
			this.logger.log("Requesting WebUSB device selection...");
			const device = await manager.requestDevice();
			if (!device) {
				this.logger.log("No USB device selected.", "warning");
				this.logger.setStatus("disconnected");
				return false;
			}
			this.currentDevice = device;
			return await this.connectDevice(device);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			this.logger.log(`Device connection failed: ${msg}`, "error");
			this.logger.setStatus("error");
			return false;
		}
	}

	public async connectDevice(device: AdbDaemonWebUsbDevice): Promise<boolean> {
		try {
			this.logger.setStatus("connecting");
			this.logger.log(
				`Connecting to ${device.name || device.serial || "Quest 3"}...`,
			);

			const connection = await device.connect();
			const transport = await AdbDaemonTransport.authenticate({
				serial: device.serial,
				connection,
				credentialStore: this.credentialStore,
			});

			this.adbInstance = new Adb(transport);
			this.logger.setStatus("connected");
			this.logger.log(
				`Successfully connected to device: ${device.name || device.serial}`,
				"success",
			);

			this.adbInstance.disconnected
				.then(() => {
					this.logger.log("Device disconnected", "warning");
					this.adbInstance = null;
					this.currentDevice = null;
					this.logger.setStatus("disconnected");
				})
				.catch((disconnectErr: unknown) => {
					const msg =
						disconnectErr instanceof Error
							? disconnectErr.message
							: String(disconnectErr);
					this.logger.log(`Device connection lost: ${msg}`, "warning");
					this.adbInstance = null;
					this.currentDevice = null;
					this.logger.setStatus("disconnected");
				});

			return true;
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (
				msg.toLowerCase().includes("unauthorized") ||
				msg.toLowerCase().includes("denied")
			) {
				this.logger.setStatus("unauthorized");
				this.logger.log(
					"Connection unauthorized. Please accept the USB Debugging prompt inside your Quest 3 headset.",
					"warning",
				);
			} else {
				this.logger.setStatus("error");
				this.logger.log(`Connection error: ${msg}`, "error");
			}
			return false;
		}
	}

	public async disconnect(forgetDevice = false): Promise<void> {
		localStorage.setItem("quest3_user_disconnected", "true");
		if (this.adbInstance) {
			try {
				await this.adbInstance.close();
			} catch {}
			this.adbInstance = null;
		}
		if (this.currentDevice && forgetDevice && "raw" in this.currentDevice) {
			try {
				const rawDevice = (
					this.currentDevice as unknown as {
						raw?: { forget?: () => Promise<void> };
					}
				).raw;
				if (rawDevice && typeof rawDevice.forget === "function") {
					await rawDevice.forget();
					this.logger.log("WebUSB device permission cleared.", "info");
				}
			} catch {}
		}
		this.currentDevice = null;
		this.logger.setStatus("disconnected");
		this.logger.log("Disconnected from device.", "info");
	}
}
