import { CheckSquare, RefreshCw, Square, XCircle } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useBatchSelection } from "../hooks/useBatchSelection";
import type { ObbFolderInfo } from "../types/adb";
import { BulkActionBar } from "./common/BulkActionBar";
import { DisconnectedStateCard } from "./common/DisconnectedStateCard";
import { ObbFolderCard } from "./obb/ObbFolderCard";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Modal } from "./ui/Modal";

interface ObbExplorerProps {
	isConnected: boolean;
	obbFolders: ObbFolderInfo[];
	isLoading: boolean;
	onRefresh: () => void;
	onDeleteFolder: (packageName: string) => Promise<boolean>;
	onPullObbFile: (
		packageName: string,
		obbFilename: string,
		onProgress?: (pct: number) => void,
	) => Promise<boolean>;
	onPullObbFolderAsZip: (
		packageName: string,
		onProgress?: (pct: number) => void,
	) => Promise<boolean>;
	onCancel?: () => void;
}

export const ObbExplorer: React.FC<ObbExplorerProps> = ({
	isConnected,
	obbFolders,
	isLoading,
	onRefresh,
	onDeleteFolder,
	onPullObbFile,
	onPullObbFolderAsZip,
	onCancel,
}) => {
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
	const [deletingFolder, setDeletingFolder] = useState<string | null>(null);
	const [pullingFolder, setPullingFolder] = useState<string | null>(null);
	const [pullingFile, setPullingFile] = useState<string | null>(null);
	const [pullProgress, setPullProgress] = useState<number>(0);
	const [confirmDeletePackage, setConfirmDeletePackage] = useState<
		string | null
	>(null);
	const [confirmBulkDelete, setConfirmBulkDelete] = useState<boolean>(false);

	useEffect(() => {
		if (isConnected && obbFolders.length === 0) {
			onRefresh();
		}
	}, [isConnected, obbFolders.length, onRefresh]);

	const getFolderPackageName = useCallback(
		(folder: ObbFolderInfo) => folder.packageName,
		[],
	);

	const {
		selectedIds: selectedFolders,
		setSelectedIds: setSelectedFolders,
		isAllSelected,
		toggleSelectAll,
		toggleSelect: toggleSelectFolder,
		clearSelection,
		isBatchProcessing,
		batchProgress,
		executeBatch,
	} = useBatchSelection({
		items: obbFolders,
		getId: getFolderPackageName,
	});

	const handlePullFolderZip = async (pkgName: string) => {
		setPullingFolder(pkgName);
		setPullProgress(0);
		await onPullObbFolderAsZip(pkgName, (pct) => setPullProgress(pct));
		setPullingFolder(null);
		setPullProgress(0);
	};

	const handlePullObbFile = async (pkgName: string, obbFilename: string) => {
		const key = `${pkgName}/${obbFilename}`;
		setPullingFile(key);
		setPullProgress(0);
		await onPullObbFile(pkgName, obbFilename, (pct) => setPullProgress(pct));
		setPullingFile(null);
		setPullProgress(0);
	};

	const handleSingleDeleteConfirm = async () => {
		if (!confirmDeletePackage) return;
		const pkgName = confirmDeletePackage;
		setConfirmDeletePackage(null);
		setDeletingFolder(pkgName);
		const success = await onDeleteFolder(pkgName);
		if (success) {
			setSelectedFolders((prev) => prev.filter((p) => p !== pkgName));
			if (selectedFolder === pkgName) setSelectedFolder(null);
			onRefresh();
		}
		setDeletingFolder(null);
	};

	const handleBulkDeleteConfirm = async () => {
		setConfirmBulkDelete(false);
		await executeBatch("Deleting", onDeleteFolder, onRefresh);
	};

	if (!isConnected) {
		return (
			<DisconnectedStateCard
				icon="hard-drive"
				description="Connect your Quest 3 to view, upload, compress, or pull game OBB files in /sdcard/Android/obb/."
			/>
		);
	}

	const isAnyPullActive = pullingFolder !== null || pullingFile !== null;

	return (
		<div className="space-y-5">
			<Modal
				isOpen={confirmDeletePackage !== null}
				title="Delete OBB Folder"
				message={`Are you sure you want to delete the directory /sdcard/Android/obb/${confirmDeletePackage}? Game assets stored inside will be permanently removed.`}
				confirmText="Delete OBB Directory"
				cancelText="Cancel"
				variant="danger"
				onConfirm={handleSingleDeleteConfirm}
				onCancel={() => setConfirmDeletePackage(null)}
			/>

			<Modal
				isOpen={confirmBulkDelete}
				title="Batch Delete OBB Directories"
				message={`Are you sure you want to delete ${selectedFolders.length} selected OBB directories from /sdcard/Android/obb/?`}
				confirmText={`Delete ${selectedFolders.length} Directories`}
				cancelText="Cancel"
				variant="danger"
				onConfirm={handleBulkDeleteConfirm}
				onCancel={() => setConfirmBulkDelete(false)}
			/>

			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<h3 className="text-sm sm:text-base font-semibold tracking-tight text-primary">
						Quest 3 OBB Storage Explorer
					</h3>
					<p className="text-xs text-muted font-mono">/sdcard/Android/obb/</p>
				</div>

				<div className="flex items-center gap-2">
					{isAnyPullActive && onCancel && (
						<Button
							variant="danger"
							size="sm"
							onClick={onCancel}
							leftIcon={<XCircle className="w-3.5 h-3.5" />}
							className="flex-1 sm:flex-initial justify-center text-xs"
						>
							Cancel Transfer
						</Button>
					)}

					<Button
						variant="secondary"
						size="sm"
						onClick={onRefresh}
						isLoading={isLoading}
						disabled={isLoading || isBatchProcessing || isAnyPullActive}
						leftIcon={
							<RefreshCw
								className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
							/>
						}
						className="flex-1 sm:flex-initial justify-center text-xs"
					>
						{isLoading ? "Refreshing..." : "Refresh OBB Folders"}
					</Button>
				</div>
			</div>

			<BulkActionBar
				selectedCount={selectedFolders.length}
				itemLabel="OBB folder(s)"
				isBatchProcessing={isBatchProcessing}
				batchProgress={batchProgress}
				onClearSelection={clearSelection}
				onAction={() => setConfirmBulkDelete(true)}
				actionLabel="Delete Selected OBBs"
			/>

			<Card className="p-0 overflow-hidden">
				<div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-subtle bg-card flex items-center justify-between">
					<div className="flex items-center gap-2.5 sm:gap-3">
						<button
							type="button"
							onClick={toggleSelectAll}
							className="cursor-pointer p-1 -m-1 bg-transparent border-0 flex items-center"
							title="Select / Deselect all OBB folders"
						>
							{isAllSelected ? (
								<CheckSquare className="w-4 h-4 text-blue-500" />
							) : (
								<Square className="w-4 h-4 text-muted" />
							)}
						</button>
						<span className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-wider font-mono">
							Package OBB Directory
						</span>
					</div>

					<span className="text-[10px] sm:text-[11px] font-semibold text-muted uppercase tracking-wider font-mono">
						Total: {obbFolders.length}
					</span>
				</div>

				{isLoading ? (
					<div className="p-8 sm:p-12 text-center text-xs text-muted">
						Scanning /sdcard/Android/obb/ directory...
					</div>
				) : obbFolders.length === 0 ? (
					<div className="p-8 sm:p-12 text-center text-xs text-muted">
						No OBB folders found on device. Sideload a game with an OBB archive
						to create one automatically.
					</div>
				) : (
					<div className="divide-y divide-subtle">
						{obbFolders.map((folder) => (
							<ObbFolderCard
								key={folder.packageName}
								folder={folder}
								isSelected={selectedFolders.includes(folder.packageName)}
								isSelectedFolder={selectedFolder === folder.packageName}
								isDeleting={deletingFolder === folder.packageName}
								isPullingZip={pullingFolder === folder.packageName}
								pullingFile={pullingFile}
								pullProgress={pullProgress}
								isBatchProcessing={isBatchProcessing}
								onToggleSelect={toggleSelectFolder}
								onToggleExpand={(pkg) =>
									setSelectedFolder(selectedFolder === pkg ? null : pkg)
								}
								onPullFolderZip={handlePullFolderZip}
								onDeleteRequest={(pkg) => setConfirmDeletePackage(pkg)}
								onPullObbFile={handlePullObbFile}
							/>
						))}
					</div>
				)}
			</Card>
		</div>
	);
};
