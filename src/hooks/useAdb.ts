import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_LOG_ENTRIES } from "../constants/adb";
import { adbClient } from "../services/webadb/adb-client";
import type {
	AdbConnectionStatus,
	DeviceInfo,
	InstalledAppInfo,
	LogEntry,
	ObbFolderInfo,
} from "../types/adb";

export function useAdb() {
	const [status, setStatus] = useState<AdbConnectionStatus>(
		adbClient.getStatus(),
	);
	const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [installedApps, setInstalledApps] = useState<InstalledAppInfo[]>([]);
	const [obbFolders, setObbFolders] = useState<ObbFolderInfo[]>([]);
	const [isLoadingApps, setIsLoadingApps] = useState(false);
	const [isLoadingObb, setIsLoadingObb] = useState(false);
	const [showSystemApps, setShowSystemApps] = useState(false);

	const appsRequestId = useRef(0);
	const obbRequestId = useRef(0);

	const refreshDeviceInfo = useCallback(async () => {
		if (adbClient.isConnected()) {
			const info = await adbClient.getDeviceInfo();
			setDeviceInfo(info);
		}
	}, []);

	const refreshApps = useCallback(
		async (includeSystem = showSystemApps) => {
			if (!adbClient.isConnected()) {
				setIsLoadingApps(false);
				return;
			}
			const currentId = ++appsRequestId.current;
			setIsLoadingApps(true);
			try {
				const apps = await adbClient.listInstalledApps(includeSystem);
				if (currentId === appsRequestId.current) {
					setInstalledApps(apps);
				}
			} finally {
				if (currentId === appsRequestId.current) {
					setIsLoadingApps(false);
				}
			}
		},
		[showSystemApps],
	);

	const refreshObbFolders = useCallback(async () => {
		if (!adbClient.isConnected()) {
			setIsLoadingObb(false);
			return;
		}
		const currentId = ++obbRequestId.current;
		setIsLoadingObb(true);
		try {
			const folders = await adbClient.listObbFolders();
			if (currentId === obbRequestId.current) {
				setObbFolders(folders);
			}
		} finally {
			if (currentId === obbRequestId.current) {
				setIsLoadingObb(false);
			}
		}
	}, []);

	useEffect(() => {
		adbClient.autoConnect();

		const unsubStatus = adbClient.onStatusChange((newStatus) => {
			setStatus(newStatus);
			if (newStatus === "connected") {
				refreshDeviceInfo();
			} else {
				setDeviceInfo(null);
				setInstalledApps([]);
				setObbFolders([]);
				setIsLoadingApps(false);
				setIsLoadingObb(false);
			}
		});

		const unsubLog = adbClient.onLog((entry) => {
			setLogs((prev) => {
				const next = [...prev, entry];
				if (next.length > MAX_LOG_ENTRIES) {
					return next.slice(next.length - MAX_LOG_ENTRIES);
				}
				return next;
			});
		});

		return () => {
			unsubStatus();
			unsubLog();
		};
	}, [refreshDeviceInfo]);

	const connect = useCallback(async () => {
		return await adbClient.requestDevice();
	}, []);

	const disconnect = useCallback(async () => {
		await adbClient.disconnect();
	}, []);

	const clearLogs = useCallback(() => {
		setLogs([]);
	}, []);

	const toggleShowSystemApps = useCallback(() => {
		const nextVal = !showSystemApps;
		setShowSystemApps(nextVal);
		refreshApps(nextVal);
	}, [showSystemApps, refreshApps]);

	const cancelCurrentOperation = useCallback(() => {
		adbClient.cancelCurrentOperation();
	}, []);

	return {
		status,
		deviceInfo,
		logs,
		installedApps,
		obbFolders,
		isLoadingApps,
		isLoadingObb,
		showSystemApps,
		connect,
		disconnect,
		clearLogs,
		refreshDeviceInfo,
		refreshApps,
		refreshObbFolders,
		toggleShowSystemApps,
		cancelCurrentOperation,
		pullAppApk: adbClient.pullAppApk.bind(adbClient),
		pullObbFile: adbClient.pullObbFile.bind(adbClient),
		pullObbFolderAsZip: adbClient.pullObbFolderAsZip.bind(adbClient),
		installPackage: adbClient.installPackage.bind(adbClient),
		uninstallApp: adbClient.uninstallApp.bind(adbClient),
		launchApp: adbClient.launchApp.bind(adbClient),
		deleteObbFolder: adbClient.deleteObbFolder.bind(adbClient),
		runShellCommand: adbClient.runShellCommand.bind(adbClient),
	};
}
