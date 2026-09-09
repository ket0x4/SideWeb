import {
	ArrowUpCircle,
	Download,
	Info,
	Package,
	Smartphone,
} from "lucide-react";
import type React from "react";
import type { RepoGameInfo } from "../../types/repo";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface RepoGameCardProps {
	game: RepoGameInfo;
	isConnected: boolean;
	isInstalling: boolean;
	isQueued?: boolean;
	onSelectDetails: (game: RepoGameInfo) => void;
	onInstall: (game: RepoGameInfo) => void;
	onDownload: (game: RepoGameInfo) => void;
	onUpload?: (game: RepoGameInfo) => void;
}

export const RepoGameCard: React.FC<RepoGameCardProps> = ({
	game,
	isConnected,
	isInstalling,
	isQueued,
	onSelectDetails,
	onInstall,
	onDownload,
	onUpload,
}) => {
	const renderStatusBadge = () => {
		if (game.isInstalled) {
			if (game.isNewerOnDevice) {
				return (
					<Badge variant="warning" dot>
						Newer on Quest
					</Badge>
				);
			}
			if (game.hasUpdate) {
				return (
					<Badge variant="warning" dot>
						Update
					</Badge>
				);
			}
			return (
				<Badge variant="connected" dot>
					Installed
				</Badge>
			);
		}
		return <Badge variant="neutral">Available</Badge>;
	};

	return (
		<Card className="flex flex-col h-full overflow-hidden bg-card hover:border-hover border-default transition-all duration-150 group">
			<button
				type="button"
				onClick={() => onSelectDetails(game)}
				className="relative w-full aspect-[16/9] bg-elevated/60 cursor-pointer overflow-hidden border-b border-subtle flex items-center justify-center text-left"
			>
				{game.thumbnailUrl ? (
					<img
						src={game.thumbnailUrl}
						alt={game.name}
						className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
						loading="lazy"
						onError={(e) => {
							(e.target as HTMLElement).style.display = "none";
						}}
					/>
				) : (
					<div className="flex flex-col items-center justify-center text-muted">
						<Package className="w-10 h-10 mb-1 opacity-40" />
						<span className="text-[10px] uppercase font-mono tracking-wider">
							VR Package
						</span>
					</div>
				)}

				<div className="absolute top-2 right-2 z-10 flex gap-1.5">
					{renderStatusBadge()}
				</div>

				<div className="absolute bottom-2 left-2 z-10">
					<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-neutral-200 border border-white/10">
						{game.size}
					</span>
				</div>
			</button>

			<div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
				<div className="space-y-1">
					<button
						type="button"
						onClick={() => onSelectDetails(game)}
						className="text-left w-full block group/title"
					>
						<h3
							title={game.name}
							className="text-sm font-semibold text-primary truncate group-hover/title:text-blue-500 transition-colors"
						>
							{game.name}
						</h3>
					</button>

					<div className="flex items-center justify-between text-xs text-muted font-mono">
						<span
							className="truncate mr-2 max-w-[170px]"
							title={game.packageName}
						>
							{game.packageName}
						</span>
						<span className="shrink-0 text-[11px]">v{game.versionCode}</span>
					</div>
				</div>

				<div className="pt-2 border-t border-subtle flex items-center justify-between gap-1.5">
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onSelectDetails(game)}
							title="View Details & Notes"
							className="px-2"
						>
							<Info className="w-3.5 h-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDownload(game)}
							title="Download ZIP to PC"
							className="px-2"
						>
							<Download className="w-3.5 h-3.5" />
						</Button>
					</div>

					<div className="flex items-center gap-1.5">
						{game.isNewerOnDevice && onUpload && (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => onUpload(game)}
								title="Upload newer Quest version to repository server"
								leftIcon={
									<ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
								}
								className="text-xs"
							>
								Upload
							</Button>
						)}

						<Button
							variant={game.hasUpdate ? "secondary" : "primary"}
							size="sm"
							onClick={() => onInstall(game)}
							disabled={!isConnected || isInstalling || isQueued}
							isLoading={isInstalling}
							leftIcon={<Smartphone className="w-3.5 h-3.5" />}
							title={
								isConnected
									? isQueued
										? "Queued in single download pipeline"
										: game.hasUpdate
											? "Update App on Quest"
											: "Install App to Quest"
									: "Connect Quest to Install"
							}
						>
							{isQueued
								? "Queued"
								: isInstalling
									? "Installing"
									: game.hasUpdate
										? "Update"
										: "Install"}
						</Button>
					</div>
				</div>
			</div>
		</Card>
	);
};
