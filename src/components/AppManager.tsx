import { CheckSquare, Square } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { isMetaOrSystemPackage } from "../constants/adb";
import { useBatchSelection } from "../hooks/useBatchSelection";
import type { InstalledAppInfo } from "../types/adb";
import { AppCardItem } from "./apps/AppCardItem";
import { AppSearchFilter } from "./apps/AppSearchFilter";
import { BulkActionBar } from "./common/BulkActionBar";
import { DisconnectedStateCard } from "./common/DisconnectedStateCard";
import { Alert } from "./ui/Alert";
import { Card } from "./ui/Card";
import { Modal } from "./ui/Modal";

interface AppManagerProps {
	isConnected: boolean;
	installedApps: InstalledAppInfo[];
	isLoading: boolean;
	showSystemApps: boolean;
	onRefresh: () => void;
	onToggleSystemApps: () => void;
	onUninstall: (packageName: string) => Promise<boolean>;
	onLaunch: (packageName: string) => Promise<boolean>;
	onPullApk: (
		packageName: string,
		onProgress?: (pct: number) => void,
	) => Promise<boolean>;
}

export const AppManager: React.FC<AppManagerProps> = ({
	isConnected,
	installedApps,
	isLoading,
	showSystemApps,
	onRefresh,
	onToggleSystemApps,
	onUninstall,
	onLaunch,
	onPullApk,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [actionPackage, setActionPackage] = useState<string | null>(null);
	const [actionType, setActionType] = useState<
		"launch" | "uninstall" | "pull" | null
	>(null);
	const [pullProgress, setPullProgress] = useState<number>(0);
	const [confirmUninstallPackage, setConfirmUninstallPackage] = useState<
		string | null
	>(null);
	const [confirmBulkUninstall, setConfirmBulkUninstall] =
		useState<boolean>(false);
	const [confirmShowMetaWarning, setConfirmShowMetaWarning] =
		useState<boolean>(false);
	const [hideMetaApps, setHideMetaApps] = useState<boolean>(true);

	useEffect(() => {
		if (isConnected && installedApps.length === 0) {
			onRefresh();
		}
	}, [isConnected, installedApps.length, onRefresh]);

	const filteredApps = installedApps.filter((app) => {
		if (hideMetaApps && isMetaOrSystemPackage(app.packageName)) {
			return false;
		}
		return (
			app.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			app.label.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	const getAppPackageName = useCallback(
		(app: InstalledAppInfo) => app.packageName,
		[],
	);

	const {
		selectedIds: selectedPackages,
		setSelectedIds: setSelectedPackages,
		isAllSelected,
		toggleSelectAll,
		toggleSelect: toggleSelectApp,
		clearSelection,
		isBatchProcessing,
		batchProgress,
		executeBatch,
	} = useBatchSelection({
		items: filteredApps,
		getId: getAppPackageName,
	});

	const handleMetaToggleClick = () => {
		if (hideMetaApps) {
			setConfirmShowMetaWarning(true);
		} else {
			setHideMetaApps(true);
		}
	};

	const handleConfirmShowMeta = () => {
		setConfirmShowMetaWarning(false);
		setHideMetaApps(false);
	};

	const handleLaunch = async (pkgName: string) => {
		setActionPackage(pkgName);
		setActionType("launch");
		await onLaunch(pkgName);
		setActionPackage(null);
		setActionType(null);
	};

	const handlePullApk = async (pkgName: string) => {
		setActionPackage(pkgName);
		setActionType("pull");
		setPullProgress(0);
		await onPullApk(pkgName, (pct) => setPullProgress(pct));
		setActionPackage(null);
		setActionType(null);
		setPullProgress(0);
	};

	const handleSingleUninstallConfirm = async () => {
		if (!confirmUninstallPackage) return;
		const pkgName = confirmUninstallPackage;
		setConfirmUninstallPackage(null);
		setActionPackage(pkgName);
		setActionType("uninstall");
		const success = await onUninstall(pkgName);
		if (success) {
			setSelectedPackages((prev) => prev.filter((p) => p !== pkgName));
			onRefresh();
		}
		setActionPackage(null);
		setActionType(null);
	};

	const handleBulkUninstallConfirm = async () => {
		setConfirmBulkUninstall(false);
		await executeBatch("Uninstalling", onUninstall, onRefresh);
	};

	if (!isConnected) {
		return (
			<DisconnectedStateCard
				icon="box"
				description="Connect your Meta Quest 3 via USB to list, launch, pull, or uninstall installed packages."
			/>
		);
	}

	return (
		<div className="space-y-5">
			<Modal
				isOpen={confirmShowMetaWarning}
				title="Warning: Meta & System Core Packages"
				message="Displaying Meta, Oculus, and Android system packages allows inspecting core OS components. Modifying or uninstalling core system packages can cause Meta Quest 3 system instability, VR tracking failure, or require a factory reset. Are you sure you want to show system packages?"
				confirmText="Display System Apps"
				cancelText="Keep Hidden"
				variant="danger"
				onConfirm={handleConfirmShowMeta}
				onCancel={() => setConfirmShowMetaWarning(false)}
			/>

			<Modal
				isOpen={confirmUninstallPackage !== null}
				title="Uninstall Application"
				message={`Are you sure you want to uninstall "${confirmUninstallPackage}" from your Meta Quest 3 headset?`}
				confirmText="Uninstall App"
				cancelText="Cancel"
				variant="danger"
				onConfirm={handleSingleUninstallConfirm}
				onCancel={() => setConfirmUninstallPackage(null)}
			/>

			<Modal
				isOpen={confirmBulkUninstall}
				title="Batch Uninstall Applications"
				message={`Are you sure you want to uninstall all ${selectedPackages.length} selected applications from your Meta Quest 3 headset?`}
				confirmText={`Uninstall ${selectedPackages.length} Apps`}
				cancelText="Cancel"
				variant="danger"
				onConfirm={handleBulkUninstallConfirm}
				onCancel={() => setConfirmBulkUninstall(false)}
			/>

			<AppSearchFilter
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				hideMetaApps={hideMetaApps}
				onToggleMetaApps={handleMetaToggleClick}
				showSystemApps={showSystemApps}
				onToggleSystemApps={onToggleSystemApps}
				isLoading={isLoading}
				isBatchProcessing={isBatchProcessing}
				onRefresh={onRefresh}
			/>

			{!hideMetaApps && (
				<Alert variant="warning">
					<strong>System Apps Visible:</strong> Do not uninstall core{" "}
					<code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">
						com.oculus.*
					</code>{" "}
					or{" "}
					<code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">
						com.meta.*
					</code>{" "}
					services unless you are an experienced VR developer.
				</Alert>
			)}

			<BulkActionBar
				selectedCount={selectedPackages.length}
				itemLabel="package(s)"
				isBatchProcessing={isBatchProcessing}
				batchProgress={batchProgress}
				onClearSelection={clearSelection}
				onAction={() => setConfirmBulkUninstall(true)}
				actionLabel="Uninstall Selected"
			/>

			<Card className="p-0 overflow-hidden">
				<div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-subtle bg-card flex items-center justify-between">
					<div className="flex items-center gap-2.5 sm:gap-3">
						<button
							type="button"
							onClick={toggleSelectAll}
							className="cursor-pointer p-1 -m-1 bg-transparent border-0 flex items-center"
							title="Select / Deselect all visible apps"
						>
							{isAllSelected ? (
								<CheckSquare className="w-4 h-4 text-blue-500" />
							) : (
								<Square className="w-4 h-4 text-muted" />
							)}
						</button>
						<span className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-wider font-mono">
							Application & Package ID
						</span>
					</div>

					<span className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-wider font-mono">
						Total: {filteredApps.length}
					</span>
				</div>

				{isLoading ? (
					<div className="p-8 sm:p-12 text-center text-xs text-muted">
						Loading installed applications from Quest 3...
					</div>
				) : filteredApps.length === 0 ? (
					<div className="p-8 sm:p-12 text-center text-xs text-muted">
						No matching packages found.{" "}
						{hideMetaApps && "Meta/System apps are hidden by filter."}
					</div>
				) : (
					<div className="max-h-[540px] overflow-y-auto divide-y divide-subtle">
						{filteredApps.map((app) => (
							<AppCardItem
								key={app.packageName}
								app={app}
								isSelected={selectedPackages.includes(app.packageName)}
								isCurrentAction={actionPackage === app.packageName}
								actionType={
									actionPackage === app.packageName ? actionType : null
								}
								pullProgress={pullProgress}
								isBatchProcessing={isBatchProcessing}
								onToggleSelect={toggleSelectApp}
								onPullApk={handlePullApk}
								onLaunch={handleLaunch}
								onUninstallRequest={(pkg) => setConfirmUninstallPackage(pkg)}
							/>
						))}
					</div>
				)}
			</Card>
		</div>
	);
};
