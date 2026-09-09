import {
	AlertCircle,
	AlertTriangle,
	Compass,
	Folder,
	HelpCircle,
	Monitor,
	Moon,
	Package,
	Sun,
	Terminal,
	Unplug,
	Usb,
	Zap,
} from "lucide-react";
import type React from "react";
import type { AdbConnectionStatus, DeviceInfo } from "../types/adb";
import { detectBrowser } from "../utils/browserDetection";
import { DeviceMetricsChip } from "./header/DeviceMetricsChip";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

interface HeaderProps {
	status: AdbConnectionStatus;
	deviceInfo: DeviceInfo | null;
	activeTab: "sideload" | "apps" | "obb" | "terminal" | "repo" | "faq";
	setActiveTab: (
		tab: "sideload" | "apps" | "obb" | "terminal" | "repo" | "faq",
	) => void;
	onConnect: () => void;
	onDisconnect: () => void;
	onRefreshDeviceInfo: () => Promise<void> | void;
	logsCount: number;
	onToggleLogs: () => void;
	theme: "system" | "dark" | "light";
	effectiveTheme?: "dark" | "light";
	onToggleTheme: () => void;
	onOpenTroubleshooter: () => void;
}

export const Header: React.FC<HeaderProps> = ({
	status,
	deviceInfo,
	activeTab,
	setActiveTab,
	onConnect,
	onDisconnect,
	onRefreshDeviceInfo,
	logsCount,
	onToggleLogs,
	theme,
	effectiveTheme,
	onToggleTheme,
	onOpenTroubleshooter,
}) => {
	const browserInfo = detectBrowser();
	const isUnsupportedBrowser =
		!browserInfo.isChromium || !browserInfo.isWebUsbSupported;

	const renderStatusBadge = () => {
		if (status === "unauthorized") {
			return (
				<Badge
					variant="warning"
					dot
					className="cursor-pointer hover:opacity-80 transition-opacity"
					onClick={onOpenTroubleshooter}
					title="Click for Connection Troubleshooter"
				>
					<AlertCircle className="w-3.5 h-3.5" />
					Unauthorized
				</Badge>
			);
		}
		if (status === "error") {
			return (
				<Badge
					variant="danger"
					dot
					className="cursor-pointer hover:opacity-80 transition-opacity"
					onClick={onOpenTroubleshooter}
					title="Click for Connection Troubleshooter"
				>
					<AlertCircle className="w-3.5 h-3.5" />
					Connection Error
				</Badge>
			);
		}
		if (status === "disconnected" && isUnsupportedBrowser) {
			return (
				<Badge
					variant="warning"
					dot
					className="cursor-pointer hover:opacity-80 transition-opacity"
					onClick={onOpenTroubleshooter}
					title="WebUSB is not supported in this browser. Click for details."
				>
					<AlertTriangle className="w-3.5 h-3.5" />
					Browser Unsupported
				</Badge>
			);
		}
		return <Badge status={status} />;
	};

	return (
		<header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-subtle">
			<div className="max-w-6xl mx-auto px-3.5 sm:px-6">
				<div className="flex items-center justify-between py-2.5 sm:py-3.5 flex-wrap gap-2.5 sm:gap-4">
					<div className="flex items-center gap-2 sm:gap-3">
						<div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-card border border-default flex items-center justify-center shrink-0">
							<Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
						</div>

						<div className="flex items-center gap-1.5 sm:gap-2">
							<h1 className="text-xs sm:text-sm font-semibold tracking-tight text-primary">
								SideWeb
							</h1>
							<Badge
								variant="neutral"
								className="text-[9px] sm:text-[10px] py-0 px-1 font-mono"
							>
								v1.0.0
							</Badge>
						</div>
					</div>

					{status === "connected" && deviceInfo && (
						<DeviceMetricsChip
							deviceInfo={deviceInfo}
							onRefreshDeviceInfo={onRefreshDeviceInfo}
						/>
					)}

					<div className="flex items-center gap-1.5 sm:gap-2.5">
						{renderStatusBadge()}

						{status === "connected" ? (
							<Button
								variant="secondary"
								size="sm"
								onClick={onDisconnect}
								leftIcon={<Unplug className="w-3.5 h-3.5 text-red-500" />}
								title="Disconnect Quest 3"
								className="px-2 sm:px-2.5"
							>
								<span className="hidden sm:inline">Disconnect</span>
							</Button>
						) : (
							<Button
								variant={isUnsupportedBrowser ? "secondary" : "primary"}
								size="sm"
								onClick={() => {
									if (isUnsupportedBrowser) {
										onOpenTroubleshooter();
									} else {
										onConnect();
									}
								}}
								isLoading={status === "connecting"}
								leftIcon={
									isUnsupportedBrowser ? (
										<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
									) : (
										<Usb className="w-3.5 h-3.5" />
									)
								}
								title={
									isUnsupportedBrowser
										? `WebUSB is not supported by ${browserInfo.browserName}. Click for connection troubleshooter.`
										: "Connect Quest 3 via WebUSB"
								}
								className={`px-2.5 sm:px-3 ${
									isUnsupportedBrowser
										? "border-amber-500/40 text-amber-400 hover:border-amber-500/60"
										: ""
								}`}
							>
								<span>Connect</span>
								<span className="hidden sm:inline"> Quest 3</span>
							</Button>
						)}

						<Button
							variant="secondary"
							size="sm"
							onClick={onToggleTheme}
							className="w-8 h-8 p-0 shrink-0"
							title={
								theme === "system"
									? `Theme: Auto / System (${effectiveTheme === "dark" ? "Dark" : "Light"}) • Click to switch to Dark`
									: theme === "dark"
										? "Theme: Dark • Click to switch to Light"
										: "Theme: Light • Click to switch to Auto (System)"
							}
						>
							{theme === "system" ? (
								<Monitor className="w-3.5 h-3.5 text-blue-400" />
							) : theme === "dark" ? (
								<Moon className="w-3.5 h-3.5 text-primary" />
							) : (
								<Sun className="w-3.5 h-3.5 text-amber-400" />
							)}
						</Button>

						<Button
							variant="secondary"
							size="sm"
							onClick={onToggleLogs}
							leftIcon={<Terminal className="w-3.5 h-3.5" />}
							className="px-2 sm:px-2.5"
						>
							<span>Logs</span>
							<span className="opacity-75"> ({logsCount})</span>
						</Button>
					</div>
				</div>

				<nav className="flex items-center gap-4 sm:gap-7 border-t border-subtle pt-1 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap">
					{[
						{ id: "sideload", label: "Sideload APK / OBB", icon: Usb },
						{ id: "repo", label: "Custom Repos", icon: Compass },
						{ id: "apps", label: "Installed Apps", icon: Package },
						{ id: "obb", label: "OBB Explorer", icon: Folder },
						{ id: "terminal", label: "WebADB Console", icon: Terminal },
						{ id: "faq", label: "About & FAQ", icon: HelpCircle },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								type="button"
								key={tab.id}
								onClick={() =>
									setActiveTab(
										tab.id as
											| "sideload"
											| "apps"
											| "obb"
											| "terminal"
											| "repo"
											| "faq",
									)
								}
								className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs font-medium border-b-2 -mb-px transition-colors duration-150 cursor-pointer ${
									isActive
										? "text-primary border-accent-primary font-semibold"
										: "text-muted border-transparent hover:text-primary"
								}`}
							>
								<Icon
									className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted"}`}
								/>
								<span>{tab.label}</span>
							</button>
						);
					})}
				</nav>
			</div>
		</header>
	);
};
