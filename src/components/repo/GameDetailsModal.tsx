import {
	ArrowUpCircle,
	CheckCircle,
	Clock,
	Copy,
	Download,
	HardDrive,
	Hash,
	Package,
	Smartphone,
	Tag,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { repoClient } from "../../services/repo/repo-client";
import type { RepoConfig, RepoGameInfo } from "../../types/repo";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface GameDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	game: RepoGameInfo | null;
	activeRepo?: RepoConfig | null;
	isConnected: boolean;
	onInstall: (game: RepoGameInfo) => void;
	onDownload: (game: RepoGameInfo) => void;
	onUpload?: (game: RepoGameInfo) => void;
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({
	isOpen,
	onClose,
	game,
	activeRepo: _activeRepo,
	isConnected,
	onInstall,
	onDownload,
	onUpload,
}) => {
	const [noteText, setNoteText] = useState<string>("");
	const [isLoadingNote, setIsLoadingNote] = useState(false);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (isOpen && game) {
			setIsLoadingNote(true);
			repoClient
				.getGameNote(game.releaseName)
				.then((note) => {
					setNoteText(note);
				})
				.finally(() => {
					setIsLoadingNote(false);
				});
		} else {
			setNoteText("");
		}
	}, [isOpen, game]);

	if (!isOpen || !game) return null;

	const handleCopyPackageName = () => {
		navigator.clipboard.writeText(game.packageName);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
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
				onClick={onClose}
				tabIndex={-1}
				aria-hidden="true"
			/>

			<div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-surface border border-default rounded-xl shadow-2xl p-4 sm:p-6 text-primary space-y-5 relative z-10">
				<div className="flex items-start justify-between gap-3 border-b border-subtle pb-3">
					<div className="flex items-start gap-3.5 min-w-0">
						<div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-card border border-default overflow-hidden shrink-0 flex items-center justify-center">
							{game.thumbnailUrl ? (
								<img
									src={game.thumbnailUrl}
									alt={game.name}
									className="w-full h-full object-cover"
									onError={(e) => {
										(e.target as HTMLElement).style.display = "none";
									}}
								/>
							) : (
								<Package className="w-8 h-8 text-muted" />
							)}
						</div>

						<div className="min-w-0 space-y-1">
							<h2 className="text-base sm:text-lg font-bold text-primary truncate">
								{game.name}
							</h2>
							<div className="flex flex-wrap items-center gap-1.5 text-xs">
								<button
									type="button"
									onClick={handleCopyPackageName}
									className="font-mono text-muted hover:text-primary flex items-center gap-1 bg-elevated px-1.5 py-0.5 rounded transition-colors text-[11px]"
									title="Click to copy package name"
								>
									{game.packageName}
									{copied ? (
										<CheckCircle className="w-3 h-3 text-emerald-500" />
									) : (
										<Copy className="w-3 h-3 opacity-60" />
									)}
								</button>
								{game.isInstalled ? (
									game.hasUpdate ? (
										<Badge variant="warning">Update Available</Badge>
									) : (
										<Badge variant="connected">Installed</Badge>
									)
								) : (
									<Badge variant="neutral">Not Installed</Badge>
								)}
							</div>
							<div className="text-xs text-secondary font-mono">
								Version: {game.versionCode}
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded text-secondary hover:text-primary hover:bg-elevated transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
					<div className="p-2.5 rounded-lg bg-card border border-subtle space-y-1">
						<div className="flex items-center gap-1 text-muted text-[10px] uppercase font-mono">
							<HardDrive className="w-3 h-3" /> Size
						</div>
						<div className="font-semibold text-primary">{game.size}</div>
					</div>

					<div className="p-2.5 rounded-lg bg-card border border-subtle space-y-1">
						<div className="flex items-center gap-1 text-muted text-[10px] uppercase font-mono">
							<Clock className="w-3 h-3" /> Updated
						</div>
						<div className="font-semibold text-primary truncate">
							{game.lastUpdated || "N/A"}
						</div>
					</div>

					<div className="p-2.5 rounded-lg bg-card border border-subtle space-y-1">
						<div className="flex items-center gap-1 text-muted text-[10px] uppercase font-mono">
							<Hash className="w-3 h-3" /> MD5 Hash
						</div>
						<div
							className="font-mono text-[11px] text-primary truncate"
							title={game.md5Hash}
						>
							{game.md5Hash.slice(0, 10)}...
						</div>
					</div>

					<div className="p-2.5 rounded-lg bg-card border border-subtle space-y-1">
						<div className="flex items-center gap-1 text-muted text-[10px] uppercase font-mono">
							<Tag className="w-3 h-3" /> Downloads
						</div>
						<div className="font-semibold text-primary">
							{game.downloads ? game.downloads.toLocaleString() : "N/A"}
						</div>
					</div>
				</div>

				<div className="text-xs">
					<span className="text-muted block mb-0.5">Full Release Name:</span>
					<div className="font-mono text-[11px] p-2 rounded bg-card border border-subtle select-all text-secondary">
						{game.releaseName}
					</div>
				</div>

				<div className="space-y-1.5">
					<h3 className="text-xs font-semibold text-secondary uppercase tracking-wider font-mono">
						Release Notes & Changelog
					</h3>
					<div className="p-3 rounded-lg bg-card border border-subtle text-xs text-primary max-h-48 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
						{isLoadingNote ? (
							<span className="text-muted italic">Loading notes...</span>
						) : noteText ? (
							noteText
						) : (
							<span className="text-muted italic">
								No notes provided for this release.
							</span>
						)}
					</div>
				</div>

				<div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-subtle">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onDownload(game)}
						leftIcon={<Download className="w-3.5 h-3.5" />}
						className="w-full sm:w-auto"
					>
						Download Archive to PC
					</Button>

					<div className="flex items-center gap-2 w-full sm:w-auto">
						{game.isNewerOnDevice && onUpload && (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => onUpload(game)}
								leftIcon={
									<ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
								}
								className="w-full sm:w-auto"
								title="Upload newer Quest version to repository server"
							>
								Upload to Server
							</Button>
						)}

						<Button
							variant="secondary"
							size="sm"
							onClick={onClose}
							className="w-full sm:w-auto"
						>
							Close
						</Button>
						<Button
							variant="primary"
							size="sm"
							onClick={() => onInstall(game)}
							leftIcon={<Smartphone className="w-3.5 h-3.5" />}
							disabled={!isConnected}
							title={
								isConnected
									? "Install package directly to Quest"
									: "Connect Quest headset to install"
							}
							className="w-full sm:w-auto"
						>
							{game.hasUpdate ? "Update on Quest" : "Install to Quest"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
