import { CheckSquare, Download, Play, Square, Trash2 } from "lucide-react";
import type React from "react";
import { isMetaOrSystemPackage } from "../../constants/adb";
import type { InstalledAppInfo } from "../../types/adb";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface AppCardItemProps {
	app: InstalledAppInfo;
	isSelected: boolean;
	isCurrentAction: boolean;
	actionType: "launch" | "uninstall" | "pull" | null;
	pullProgress: number;
	isBatchProcessing: boolean;
	onToggleSelect: (pkgName: string) => void;
	onPullApk: (pkgName: string) => void;
	onLaunch: (pkgName: string) => void;
	onUninstallRequest: (pkgName: string) => void;
}

function getAppInitials(label: string): string {
	const parts = label.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return label.slice(0, 2).toUpperCase();
}

export const AppCardItem: React.FC<AppCardItemProps> = ({
	app,
	isSelected,
	isCurrentAction,
	actionType,
	pullProgress,
	isBatchProcessing,
	onToggleSelect,
	onPullApk,
	onLaunch,
	onUninstallRequest,
}) => {
	const isSystemMeta = isMetaOrSystemPackage(app.packageName);
	const initials = getAppInitials(app.label);

	return (
		<div
			className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 sm:py-3.5 border-b border-subtle gap-3 transition-colors duration-150 ${
				isSelected ? "bg-elevated" : "hover:bg-card/50"
			}`}
		>
			<div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
				<button
					type="button"
					onClick={() => onToggleSelect(app.packageName)}
					className="cursor-pointer p-1 -m-1 bg-transparent border-0 flex shrink-0 mt-0.5 sm:mt-0"
					title="Select package"
				>
					{isSelected ? (
						<CheckSquare className="w-4 h-4 text-blue-500" />
					) : (
						<Square className="w-4 h-4 text-muted hover:text-primary" />
					)}
				</button>

				<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-elevated border border-default flex items-center justify-center text-xs font-mono font-bold text-primary shrink-0">
					{initials}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs sm:text-sm font-semibold text-primary truncate max-w-full">
							{app.label}
						</span>
						{isSystemMeta && (
							<Badge
								variant="warning"
								className="text-[9px] sm:text-[10px] py-0 px-1.5 shrink-0"
							>
								System Core
							</Badge>
						)}
					</div>

					<div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-muted break-all sm:truncate">
						<span className="truncate">{app.packageName}</span>
						{app.versionCode && (
							<span className="opacity-70 shrink-0">(v{app.versionCode})</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 sm:ml-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-subtle/60">
				{isCurrentAction && (
					<Badge
						variant="connecting"
						dot
						className="justify-center sm:justify-start py-1"
					>
						{actionType === "launch"
							? "Launching..."
							: actionType === "pull"
								? `Pulling APK (${pullProgress}%)...`
								: "Uninstalling..."}
					</Badge>
				)}

				<div className="flex items-center gap-1.5 sm:gap-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={() => onPullApk(app.packageName)}
						disabled={isCurrentAction || isBatchProcessing}
						leftIcon={<Download className="w-3 h-3 text-blue-400" />}
						title="Pull & backup APK file to computer"
						className="flex-1 sm:flex-none justify-center text-xs"
					>
						<span>Pull</span>
						<span className="hidden sm:inline"> APK</span>
					</Button>

					<Button
						variant="secondary"
						size="sm"
						onClick={() => onLaunch(app.packageName)}
						disabled={isCurrentAction || isBatchProcessing}
						leftIcon={<Play className="w-3 h-3 text-emerald-400" />}
						title="Launch app on Quest 3"
						className="flex-1 sm:flex-none justify-center text-xs"
					>
						Launch
					</Button>

					<Button
						variant="danger"
						size="sm"
						onClick={() => onUninstallRequest(app.packageName)}
						disabled={isCurrentAction || isBatchProcessing}
						leftIcon={<Trash2 className="w-3 h-3" />}
						title="Uninstall app from device"
						className="flex-1 sm:flex-none justify-center text-xs"
					>
						Uninstall
					</Button>
				</div>
			</div>
		</div>
	);
};
