import {
	Battery,
	Check,
	ChevronDown,
	Copy,
	Cpu,
	HardDrive,
	Layers,
	Monitor,
	Package,
	RectangleGoggles,
	RefreshCw,
	ShieldCheck,
	Wifi,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { DeviceInfo } from "../../types/adb";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface DeviceMetricsChipProps {
	deviceInfo: DeviceInfo;
	onRefreshDeviceInfo: () => Promise<void> | void;
}

export const DeviceMetricsChip: React.FC<DeviceMetricsChipProps> = ({
	deviceInfo,
	onRefreshDeviceInfo,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [copiedIp, setCopiedIp] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const handleRefresh = async (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsRefreshing(true);
		try {
			await onRefreshDeviceInfo();
		} finally {
			setTimeout(() => setIsRefreshing(false), 500);
		}
	};

	const handleCopyIp = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (deviceInfo.ipAddress) {
			navigator.clipboard.writeText(deviceInfo.ipAddress);
			setCopiedIp(true);
			setTimeout(() => setCopiedIp(false), 2000);
		}
	};

	return (
		<div ref={containerRef} className="relative inline-block">
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				aria-expanded={isOpen}
				className="flex items-center gap-2 sm:gap-3.5 h-8 bg-card border border-default rounded-md px-2.5 sm:px-3 text-xs font-mono cursor-pointer hover:border-hover hover:bg-elevated transition-colors select-none text-left"
			>
				<div className="flex items-center gap-1.5 text-primary font-semibold">
					<RectangleGoggles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
					<span className="truncate max-w-[90px] sm:max-w-none">
						{deviceInfo.model}
					</span>
				</div>

				<span className="hidden sm:inline text-default">|</span>

				<div
					className="flex items-center gap-1 sm:gap-1.5 text-emerald-500 sm:text-secondary font-semibold sm:font-normal"
					title="Battery Level"
				>
					<Battery className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
					<span>
						{deviceInfo.batteryLevel !== null
							? `${deviceInfo.batteryLevel}%`
							: "N/A"}
					</span>
				</div>

				<span className="hidden sm:inline text-default">|</span>

				<div
					className="hidden sm:flex items-center gap-1.5 text-secondary"
					title="Available Storage"
				>
					<HardDrive className="w-3.5 h-3.5 text-cyan-400" />
					<span>{deviceInfo.storageFree} free</span>
				</div>

				{deviceInfo.ipAddress && (
					<>
						<span className="hidden sm:inline text-default">|</span>
						<div
							className="hidden sm:flex items-center gap-1.5 text-secondary"
							title="Headset IP Address"
						>
							<Wifi className="w-3.5 h-3.5 text-amber-400" />
							<span>{deviceInfo.ipAddress}</span>
						</div>
					</>
				)}

				<ChevronDown className="w-3 h-3 opacity-70 ml-0.5 shrink-0" />
			</button>

			{isOpen && (
				<Card className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-28px)] max-w-sm sm:w-80 p-4 sm:p-5 bg-card border-default shadow-2xl backdrop-blur-xl font-mono text-xs animate-in fade-in duration-150">
					<div className="flex items-center justify-between gap-3 mb-3.5 pb-3 border-b border-subtle">
						<div className="flex items-center gap-2.5">
							<div className="w-9 h-9 rounded-md bg-elevated border border-subtle flex items-center justify-center shrink-0">
								<RectangleGoggles className="w-5 h-5 text-blue-500" />
							</div>
							<div>
								<div className="font-semibold text-sm text-primary">
									{deviceInfo.model}
								</div>
								<div className="text-[11px] text-muted">
									SN: {deviceInfo.serial}{" "}
									{deviceInfo.deviceCodename
										? `(${deviceInfo.deviceCodename})`
										: ""}
								</div>
							</div>
						</div>

						<Button
							variant="secondary"
							size="sm"
							onClick={handleRefresh}
							isLoading={isRefreshing}
							leftIcon={
								<RefreshCw
									className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
								/>
							}
							className="h-7 text-[11px] px-2"
						>
							Refresh
						</Button>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between text-xs">
							<div className="flex items-center gap-2 text-secondary">
								<Layers className="w-3.5 h-3.5 text-blue-500" />
								<span>Meta Quest OS Version</span>
							</div>
							<Badge variant="info" className="text-[11px]">
								{deviceInfo.questOsVersion || `v${deviceInfo.androidVersion}`}
							</Badge>
						</div>

						{deviceInfo.installedAppsCount !== undefined && (
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-2 text-secondary">
									<Package className="w-3.5 h-3.5 text-cyan-400" />
									<span>3rd-Party Installed Apps</span>
								</div>
								<span className="font-semibold text-primary">
									{deviceInfo.installedAppsCount} apps
								</span>
							</div>
						)}

						<div className="flex items-center justify-between text-xs">
							<div className="flex items-center gap-2 text-secondary">
								<Battery className="w-3.5 h-3.5 text-emerald-500" />
								<span>Battery Level</span>
							</div>
							<span className="font-semibold text-emerald-500">
								{deviceInfo.batteryLevel !== null
									? `${deviceInfo.batteryLevel}%`
									: "N/A"}
							</span>
						</div>

						<div className="flex items-center justify-between text-xs">
							<div className="flex items-center gap-2 text-secondary">
								<HardDrive className="w-3.5 h-3.5 text-cyan-400" />
								<span>Internal Storage</span>
							</div>
							<span className="font-semibold text-primary">
								{deviceInfo.storageFree} free{" "}
								<span className="text-muted font-normal">
									({deviceInfo.storageTotal})
								</span>
							</span>
						</div>

						{deviceInfo.ipAddress && (
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-2 text-secondary">
									<Wifi className="w-3.5 h-3.5 text-amber-400" />
									<span>Wi-Fi IP Address</span>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="font-semibold text-primary">
										{deviceInfo.ipAddress}
									</span>
									<Button
										variant="secondary"
										size="sm"
										onClick={handleCopyIp}
										className="h-5 px-1.5 text-[10px]"
									>
										{copiedIp ? (
											<Check className="w-3 h-3 text-emerald-500" />
										) : (
											<Copy className="w-3 h-3" />
										)}
									</Button>
								</div>
							</div>
						)}

						{deviceInfo.displaySize && (
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-2 text-secondary">
									<Monitor className="w-3.5 h-3.5 text-blue-500" />
									<span>Display Resolution</span>
								</div>
								<span className="font-semibold text-primary">
									{deviceInfo.displaySize}
								</span>
							</div>
						)}

						<div className="flex items-center justify-between text-xs">
							<div className="flex items-center gap-2 text-secondary">
								<ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
								<span>Android Core</span>
							</div>
							<span className="font-semibold text-primary">
								v{deviceInfo.androidVersion}{" "}
								{deviceInfo.securityPatch
									? `(${deviceInfo.securityPatch})`
									: ""}
							</span>
						</div>

						{deviceInfo.cpuAbi && (
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-2 text-secondary">
									<Cpu className="w-3.5 h-3.5 text-muted" />
									<span>Chipset Architecture</span>
								</div>
								<span className="font-semibold text-muted">
									{deviceInfo.cpuAbi}
								</span>
							</div>
						)}
					</div>
				</Card>
			)}
		</div>
	);
};
