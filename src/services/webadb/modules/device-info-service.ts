import type { DeviceInfo } from "../../../types/adb";
import { BaseService } from "./base-service";

export class DeviceInfoService extends BaseService {
	public async getDeviceInfo(): Promise<DeviceInfo | null> {
		const adb = this.connection.getAdbInstance();
		if (!adb) return null;

		try {
			const [propsRaw, pmOut, batteryOutput, dfOutput, ipOut, wmOut] =
				await Promise.all([
					this.connection.execShell("getprop").catch(() => ""),
					this.connection.execShell("pm list packages -3").catch(() => ""),
					this.connection.execShell("dumpsys battery").catch(() => ""),
					this.connection.execShell("df -h /sdcard").catch(() => ""),
					this.connection.execShell("ip route").catch(() => ""),
					this.connection.execShell("wm size").catch(() => ""),
				]);

			const props = new Map<string, string>();
			for (const line of propsRaw.split("\n")) {
				const match = line.match(/^\[(.*?)\]:\s*\[(.*?)\]$/);
				if (match) {
					props.set(match[1], match[2]);
				}
			}

			const model = props.get("ro.product.model") || "Meta Quest 3";
			const serial = adb.serial || "Unknown Serial";
			const androidVersion = props.get("ro.build.version.release") || "12";
			const buildId =
				props.get("ro.build.display.id") ||
				props.get("ro.build.version.incremental") ||
				undefined;
			const cpuAbi = props.get("ro.product.cpu.abi") || undefined;
			const securityPatch =
				props.get("ro.build.version.security_patch") || undefined;
			const deviceCodename = props.get("ro.product.device") || undefined;

			let questOsVersion: string | undefined;
			const oculusRel = props.get("ro.oculus.release");
			if (oculusRel) {
				questOsVersion = `v${oculusRel}`;
			} else if (buildId) {
				const match = buildId.match(/v(\d+)/i) || buildId.match(/(\d+)\.\d+/);
				if (match) questOsVersion = `v${match[1]}`;
			}

			const installedAppsCount = pmOut
				? pmOut.split("\n").filter((l) => l.trim().startsWith("package:"))
						.length
				: undefined;

			let batteryLevel: number | null = null;
			const batteryMatch = batteryOutput.match(/level:\s*(\d+)/i);
			if (batteryMatch) {
				batteryLevel = Number.parseInt(batteryMatch[1], 10);
			}

			let storageFree = "Unknown";
			let storageTotal = "Unknown";
			const dfLines = dfOutput.trim().split("\n");
			if (dfLines.length > 1) {
				const parts = dfLines[dfLines.length - 1].trim().split(/\s+/);
				if (parts.length >= 4) {
					storageTotal = parts[1];
					storageFree = parts[3];
				}
			}

			let ipAddress: string | undefined;
			const ipMatch = ipOut.match(/src\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
			if (ipMatch) {
				ipAddress = ipMatch[1];
			} else {
				const propIp = props.get("dhcp.wlan0.ipaddress");
				if (propIp) ipAddress = propIp;
			}

			let displaySize: string | undefined;
			const wmMatch = wmOut.match(/Physical size:\s*(\d+x\d+)/i);
			if (wmMatch) {
				displaySize = wmMatch[1];
			}

			return {
				model,
				serial,
				androidVersion,
				buildId,
				questOsVersion,
				installedAppsCount,
				securityPatch,
				deviceCodename,
				batteryLevel,
				storageFree,
				storageTotal,
				ipAddress,
				displaySize,
				cpuAbi,
			};
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			this.logger.log(`Failed to retrieve device metrics: ${msg}`, "warning");
			return null;
		}
	}
}
