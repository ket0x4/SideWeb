import {
	AlertCircle,
	CheckCircle2,
	DownloadCloud,
	FileArchive,
	HardDrive,
	Loader2,
	Smartphone,
	XCircle,
} from "lucide-react";
import type React from "react";
import type { RepoInstallProgress } from "../../types/repo";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { PipelineDiagram } from "./PipelineDiagram";

interface RepoInstallModalProps {
	isOpen: boolean;
	progress: RepoInstallProgress | null;
	onClose: () => void;
	onCancel?: () => void;
}

const STEPS = [
	{ id: "downloading", label: "1. Download", icon: DownloadCloud },
	{ id: "extracting", label: "2. Extract", icon: FileArchive },
	{ id: "pushing_apk", label: "3. APK Install", icon: Smartphone },
	{ id: "pushing_obb", label: "4. OBB Sync", icon: HardDrive },
];

const STEP_ORDER = [
	"downloading",
	"extracting",
	"pushing_apk",
	"installing",
	"pushing_obb",
];

export const RepoInstallModal: React.FC<RepoInstallModalProps> = ({
	isOpen,
	progress,
	onClose,
	onCancel,
}) => {
	if (!isOpen || !progress) return null;

	const isCompleted = progress.stage === "completed";
	const isError = progress.stage === "error";
	const isBusy = !isCompleted && !isError;

	return (
		<div
			role="dialog"
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
		>
			<button
				type="button"
				className="fixed inset-0 bg-transparent border-0 cursor-default"
				onClick={isBusy ? undefined : onClose}
				tabIndex={-1}
				aria-hidden="true"
			/>

			<div className="w-full max-w-md bg-surface border border-default rounded-xl shadow-2xl p-4 sm:p-6 text-primary space-y-4 relative z-10">
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
						) : (
							<Loader2 className="w-5 h-5 animate-spin" />
						)}
					</div>

					<div className="min-w-0">
						<h3 className="text-sm font-semibold text-primary truncate">
							{isCompleted
								? "Installation Succeeded!"
								: isError
									? "Installation Failed"
									: "Installing Application..."}
						</h3>
						<p className="text-xs text-muted truncate">{progress.gameName}</p>
					</div>
				</div>

				<PipelineDiagram
					steps={STEPS}
					stage={progress.stage}
					stepOrder={STEP_ORDER}
					isCompleted={isCompleted}
					isError={isError}
				/>

				<div className="space-y-2 pt-1">
					<div className="flex justify-between text-xs font-mono">
						<span className="text-secondary truncate mr-2">
							{progress.statusText}
						</span>
						<span className="font-semibold text-primary shrink-0">
							{progress.percentage}%
						</span>
					</div>

					<ProgressBar progress={progress.percentage} />
				</div>

				{isError && progress.error && (
					<Alert variant="error">{progress.error}</Alert>
				)}

				<div className="flex justify-end gap-2 pt-2">
					{isBusy && onCancel && (
						<Button
							variant="danger"
							size="sm"
							onClick={onCancel}
							leftIcon={<XCircle className="w-3.5 h-3.5" />}
						>
							Cancel
						</Button>
					)}
					{!isBusy && (
						<Button variant="primary" size="sm" onClick={onClose}>
							Done
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
