import {
	AlertCircle,
	ArrowUpCircle,
	CheckCircle2,
	FileArchive,
	HardDrive,
	Loader2,
	Smartphone,
	UploadCloud,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { repoClient } from "../../services/repo/repo-client";
import type { RepoGameInfo, RepoUploadProgress } from "../../types/repo";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { PipelineDiagram } from "./PipelineDiagram";

interface RepoUploadModalProps {
	isOpen: boolean;
	onClose: () => void;
	game: RepoGameInfo | null;
	isConnected: boolean;
}

const UPLOAD_STEPS = [
	{ id: "locating", label: "1. Locate", icon: Smartphone },
	{ id: "pulling_apk", label: "2. Pull APK", icon: FileArchive },
	{ id: "pulling_obb", label: "3. Pull OBB", icon: HardDrive },
	{ id: "uploading", label: "4. Upload", icon: UploadCloud },
];

const STEP_ORDER = [
	"locating",
	"pulling_apk",
	"pulling_obb",
	"packaging",
	"uploading",
];

export const RepoUploadModal: React.FC<RepoUploadModalProps> = ({
	isOpen,
	onClose,
	game,
	isConnected,
}) => {
	const [progress, setProgress] = useState<RepoUploadProgress | null>(null);
	const [isUploading, setIsUploading] = useState(false);

	if (!isOpen || !game) return null;

	const isCompleted = progress?.stage === "completed";
	const isError = progress?.stage === "error";

	const handleStartUpload = async () => {
		if (!isConnected || isUploading) return;

		setIsUploading(true);
		setProgress({
			stage: "locating",
			percentage: 5,
			statusText: "Initializing upload pipeline...",
			gameName: game.name,
			packageName: game.packageName,
		});

		try {
			await repoClient.uploadNewerVersion(game, (p) => {
				setProgress(p);
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleModalClose = () => {
		if (isUploading) return;
		setProgress(null);
		onClose();
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
		>
			<button
				type="button"
				className="fixed inset-0 bg-transparent border-0 cursor-default"
				onClick={handleModalClose}
				tabIndex={-1}
				aria-hidden="true"
			/>

			<div className="w-full max-w-md bg-surface border border-default rounded-xl shadow-2xl p-4 sm:p-6 text-primary space-y-4 relative z-10">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<div
							className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
								isCompleted
									? "bg-emerald-500/10 text-emerald-500"
									: isError
										? "bg-red-500/10 text-red-500"
										: "bg-blue-500/10 text-blue-500"
							}`}
						>
							{isCompleted ? (
								<CheckCircle2 className="w-5 h-5" />
							) : isError ? (
								<AlertCircle className="w-5 h-5" />
							) : isUploading ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : (
								<ArrowUpCircle className="w-5 h-5" />
							)}
						</div>
						<div className="min-w-0">
							<h3 className="text-sm font-semibold text-primary truncate">
								{isCompleted
									? "Upload Succeeded!"
									: isError
										? "Upload Failed"
										: "Upload Newer Version to Server"}
							</h3>
							<p className="text-xs text-muted truncate">{game.name}</p>
						</div>
					</div>

					<button
						type="button"
						onClick={handleModalClose}
						disabled={isUploading}
						className="text-muted hover:text-primary transition-colors p-1 rounded-md"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-elevated border border-default text-xs">
					<div className="space-y-1">
						<span className="text-[10px] text-muted uppercase font-mono tracking-wider block">
							Quest Version
						</span>
						<div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
							<span>v{game.installedVersionCode || "Newer"}</span>
							<Badge variant="connected" className="text-[10px] px-1 py-0">
								Installed
							</Badge>
						</div>
					</div>

					<div className="space-y-1 border-l border-subtle pl-2.5">
						<span className="text-[10px] text-muted uppercase font-mono tracking-wider block">
							Repo Version
						</span>
						<div className="font-mono text-muted">v{game.versionCode}</div>
					</div>
				</div>

				{!progress && (
					<p className="text-xs text-secondary leading-relaxed">
						Your connected Quest headset has a newer release of{" "}
						<strong>{game.name}</strong> than the current repository catalog.
						SideWeb will dump the APK and OBB packages from your headset and
						upload them directly to the repository server.
					</p>
				)}

				{progress && (
					<PipelineDiagram
						steps={UPLOAD_STEPS}
						stage={progress.stage}
						stepOrder={STEP_ORDER}
						isCompleted={isCompleted}
						isError={isError}
					/>
				)}

				{progress && (
					<div className="space-y-2 pt-1">
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted truncate max-w-[280px]">
								{progress.statusText}
							</span>
							<span className="font-mono font-medium text-primary shrink-0 ml-2">
								{progress.percentage}%
							</span>
						</div>
						<ProgressBar progress={progress.percentage} />
					</div>
				)}

				{isError && progress?.error && (
					<Alert variant="error" className="text-xs">
						{progress.error}
					</Alert>
				)}

				{isCompleted && (
					<Alert variant="success" className="text-xs">
						Package successfully extracted and contributed to the repository
						server!
					</Alert>
				)}

				<div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
					{!progress && (
						<>
							<Button variant="ghost" size="sm" onClick={handleModalClose}>
								Cancel
							</Button>
							<Button
								variant="primary"
								size="sm"
								disabled={!isConnected || isUploading}
								isLoading={isUploading}
								onClick={handleStartUpload}
								leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
							>
								Upload to Server
							</Button>
						</>
					)}

					{isError && (
						<>
							<Button variant="ghost" size="sm" onClick={handleModalClose}>
								Close
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={handleStartUpload}
								leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
							>
								Retry Upload
							</Button>
						</>
					)}

					{isCompleted && (
						<Button variant="primary" size="sm" onClick={handleModalClose}>
							Done
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
