import {
	ArrowUpCircle,
	ArrowUpDown,
	Compass,
	Download,
	ExternalLink,
	FolderPlus,
	FolderUp,
	Grid,
	Info,
	List,
	Plus,
	RefreshCw,
	Search,
	Settings,
	ShieldCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { repoClient } from "../../services/repo/repo-client";
import type { InstalledAppInfo } from "../../types/adb";
import type {
	RepoConfig,
	RepoGameInfo,
	RepoInstallProgress,
} from "../../types/repo";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { GameDetailsModal } from "./GameDetailsModal";
import { RepoConfigModal } from "./RepoConfigModal";
import { RepoGameCard } from "./RepoGameCard";
import { RepoInstallModal } from "./RepoInstallModal";
import { RepoUploadModal } from "./RepoUploadModal";

interface RepoManagerProps {
	isConnected: boolean;
	installedApps: InstalledAppInfo[];
}

export const RepoManager: React.FC<RepoManagerProps> = ({
	isConnected,
	installedApps,
}) => {
	const [activeRepo, setActiveRepo] = useState<RepoConfig | null>(() =>
		repoClient.getActiveRepo(),
	);
	const [games, setGames] = useState<RepoGameInfo[]>([]);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncError, setSyncError] = useState<string | null>(null);

	const [activePkg, setActivePkg] = useState<string | null>(() =>
		repoClient.getActivePackageName(),
	);
	const [queuedPkgs, setQueuedPkgs] = useState<string[]>(() =>
		repoClient.getQueuedPackageNames(),
	);

	useEffect(() => {
		return repoClient.subscribeQueue(() => {
			setActivePkg(repoClient.getActivePackageName());
			setQueuedPkgs(repoClient.getQueuedPackageNames());
		});
	}, []);

	const [selectedGameForUpload, setSelectedGameForUpload] =
		useState<RepoGameInfo | null>(null);
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

	const handleOpenUpload = (game: RepoGameInfo) => {
		setSelectedGameForUpload(game);
		setIsUploadModalOpen(true);
	};

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		"all" | "installed" | "updates" | "contribute" | "uninstalled"
	>("all");
	const [sortBy, setSortBy] = useState<
		| "name_asc"
		| "name_desc"
		| "size_desc"
		| "size_asc"
		| "updated_desc"
		| "downloads_desc"
	>("name_asc");
	const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

	const [currentPage, setCurrentPage] = useState(1);
	const PAGE_SIZE = 36;

	const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
	const [configModalTab, setConfigModalTab] = useState<
		"repos" | "add" | "import"
	>("repos");
	const [selectedGameForDetails, setSelectedGameForDetails] =
		useState<RepoGameInfo | null>(null);
	const [installProgress, setInstallProgress] =
		useState<RepoInstallProgress | null>(null);
	const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

	useEffect(() => {
		if (!activeRepo) {
			setGames([]);
			return;
		}
		const cached = repoClient.getLocalCachedGames(activeRepo.id);
		if (cached.length > 0) {
			setGames(cached);
		} else {
			repoClient.getCachedServerGames().then((serverGames) => {
				if (serverGames.length > 0) {
					setGames(serverGames);
					repoClient.setLocalCachedGames(activeRepo.id, serverGames);
				}
			});
		}
	}, [activeRepo]);

	const enrichedGames = useMemo(() => {
		const installedMap = new Map<string, InstalledAppInfo>();
		for (const app of installedApps) {
			installedMap.set(app.packageName.toLowerCase(), app);
		}

		return games.map((game) => {
			const matching = installedMap.get(game.packageName.toLowerCase());
			const deviceVersion = matching?.versionCode;
			const repoVersion = Number.parseInt(game.versionCode, 10);
			const hasUpdate =
				deviceVersion !== undefined &&
				!Number.isNaN(repoVersion) &&
				deviceVersion < repoVersion;
			const isNewerOnDevice =
				deviceVersion !== undefined &&
				!Number.isNaN(repoVersion) &&
				deviceVersion > repoVersion;

			return {
				...game,
				isInstalled: Boolean(matching),
				installedVersionCode: deviceVersion,
				hasUpdate,
				isNewerOnDevice,
			};
		});
	}, [games, installedApps]);

	const filteredGames = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		return enrichedGames
			.filter((game) => {
				if (query) {
					const nameMatch = game.name.toLowerCase().includes(query);
					const pkgMatch = game.packageName.toLowerCase().includes(query);
					const releaseMatch = game.releaseName.toLowerCase().includes(query);
					if (!nameMatch && !pkgMatch && !releaseMatch) return false;
				}

				if (statusFilter === "installed" && !game.isInstalled) return false;
				if (statusFilter === "updates" && !game.hasUpdate) return false;
				if (statusFilter === "contribute" && !game.isNewerOnDevice)
					return false;
				if (statusFilter === "uninstalled" && game.isInstalled) return false;

				return true;
			})
			.sort((a, b) => {
				switch (sortBy) {
					case "name_asc":
						return a.name.localeCompare(b.name);
					case "name_desc":
						return b.name.localeCompare(a.name);
					case "size_desc":
						return b.sizeMb - a.sizeMb;
					case "size_asc":
						return a.sizeMb - b.sizeMb;
					case "updated_desc":
						return (b.lastUpdated || "").localeCompare(a.lastUpdated || "");
					case "downloads_desc":
						return (b.downloads || 0) - (a.downloads || 0);
					default:
						return 0;
				}
			});
	}, [enrichedGames, searchQuery, statusFilter, sortBy]);

	const totalPages = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));
	const paginatedGames = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filteredGames.slice(start, start + PAGE_SIZE);
	}, [filteredGames, currentPage]);

	const counts = useMemo(() => {
		const installed = enrichedGames.filter((g) => g.isInstalled).length;
		const updates = enrichedGames.filter((g) => g.hasUpdate).length;
		const contribute = enrichedGames.filter((g) => g.isNewerOnDevice).length;
		return {
			total: enrichedGames.length,
			installed,
			updates,
			contribute,
			uninstalled: enrichedGames.length - installed,
		};
	}, [enrichedGames]);

	const handleSync = async () => {
		if (!activeRepo) return;
		setIsSyncing(true);
		setSyncError(null);
		try {
			const updated = await repoClient.syncRepo(activeRepo);
			setGames(updated);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setSyncError(msg);
		} finally {
			setIsSyncing(false);
		}
	};

	const handleInstall = async (game: RepoGameInfo) => {
		if (!isConnected || !activeRepo) return;

		setIsInstallModalOpen(true);
		setInstallProgress({
			stage: "downloading",
			percentage: 5,
			statusText: `Queuing installation for ${game.name}...`,
			gameName: game.name,
			packageName: game.packageName,
		});

		try {
			await repoClient.enqueueInstall(activeRepo, game, (p) => {
				setInstallProgress(p);
			});
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setInstallProgress({
				stage: "error",
				percentage: 0,
				statusText: "Install error",
				error: msg,
				gameName: game.name,
				packageName: game.packageName,
			});
		}
	};

	const handleDownloadDirect = async (game: RepoGameInfo) => {
		if (!activeRepo) return;
		try {
			await repoClient.enqueueDownload(activeRepo, game);
		} catch (e: unknown) {
			alert(`Download error: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	if (!activeRepo) {
		return (
			<div className="space-y-4">
				<Alert variant="info" className="text-xs">
					SideWeb is an open-source client-side sideloading tool. SideWeb does
					not host, distribute, or validate any games or software. Repositories
					must be manually added by the user and are stored strictly in your
					browser. Ensure you have the legal right to access content from your
					configured sources.
				</Alert>

				<Card className="p-8 sm:p-12 text-center bg-card border-default border-dashed space-y-4 max-w-xl mx-auto my-6">
					<div className="w-14 h-14 rounded-2xl bg-elevated border border-default flex items-center justify-center mx-auto text-primary">
						<FolderPlus className="w-7 h-7 text-blue-500" />
					</div>
					<div className="space-y-1">
						<h3 className="text-base font-bold text-primary">
							Add a Custom Repository
						</h3>
						<p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
							No repository source is currently configured. To browse and
							sideload applications, add your custom repository endpoint URL or
							import an offline <code>meta.7z</code> archive.
						</p>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
						<Button
							variant="primary"
							onClick={() => setIsConfigModalOpen(true)}
							leftIcon={<Plus className="w-4 h-4" />}
						>
							Add Custom Repository
						</Button>
					</div>
				</Card>

				<RepoConfigModal
					isOpen={isConfigModalOpen}
					onClose={() => setIsConfigModalOpen(false)}
					activeRepo={null}
					initialTab={configModalTab}
					onSelectRepo={(repo) => {
						setActiveRepo(repo);
						if (repo) {
							repoClient.setActiveRepoId(repo.id);
							setGames(repoClient.getLocalCachedGames(repo.id));
						}
					}}
					onMetaImported={() => {
						const cur = repoClient.getActiveRepo();
						setActiveRepo(cur);
						if (cur) {
							setGames(repoClient.getLocalCachedGames(cur.id));
						}
					}}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Alert variant="info" className="text-xs">
				SideWeb does not host, curate, or distribute any content. Repositories
				are supplied by you and saved locally on your device.
			</Alert>

			<Card className="p-3.5 sm:p-4 bg-card border-default">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
							<Compass className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-1.5">
								<h2 className="text-sm font-bold text-primary truncate">
									{activeRepo.name}
								</h2>
								<Badge variant="connected">Active Repo</Badge>
								<Badge variant="neutral" className="gap-1 text-[10px]">
									<ShieldCheck className="w-3 h-3 text-emerald-400" />
									1-by-1 Queue Active
								</Badge>
								{activePkg && (
									<Badge variant="warning" dot className="text-[10px]">
										Active: {activePkg}
									</Badge>
								)}
								{queuedPkgs.length > 0 && (
									<Badge variant="neutral" className="text-[10px]">
										{queuedPkgs.length} Queued
									</Badge>
								)}
							</div>
							<div className="text-[11px] text-muted font-mono truncate">
								{activeRepo.baseUri}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="primary"
							size="sm"
							onClick={handleSync}
							isLoading={isSyncing}
							leftIcon={
								<RefreshCw
									className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
								/>
							}
						>
							{isSyncing ? "Syncing Catalog..." : "Sync Repo"}
						</Button>

						<Button
							variant="secondary"
							size="sm"
							onClick={() => setIsConfigModalOpen(true)}
							leftIcon={<Settings className="w-3.5 h-3.5" />}
						>
							Manage Repos
						</Button>
					</div>
				</div>

				{syncError && (
					<div className="mt-3">
						<Alert variant="error">
							<div className="space-y-2">
								<div className="flex items-start justify-between gap-2">
									<span className="text-xs">{syncError}</span>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											setConfigModalTab("repos");
											setIsConfigModalOpen(true);
										}}
										className="text-xs shrink-0 ml-2"
									>
										Settings
									</Button>
								</div>
								{syncError.includes("Cloudflare") && (
									<div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-500/20">
										<Button
											size="sm"
											variant="secondary"
											onClick={() => {
												setConfigModalTab("import");
												setIsConfigModalOpen(true);
											}}
											leftIcon={<FolderUp className="w-3.5 h-3.5" />}
										>
											Import meta.7z Offline
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												const url = activeRepo.baseUri.endsWith("/")
													? `${activeRepo.baseUri}meta.7z`
													: `${activeRepo.baseUri}/meta.7z`;
												window.open(url, "_blank", "noopener,noreferrer");
											}}
											leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
										>
											Download meta.7z in Browser
										</Button>
									</div>
								)}
							</div>
						</Alert>
					</div>
				)}
			</Card>

			{counts.contribute > 0 && (
				<div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
							<ArrowUpCircle className="w-4 h-4" />
						</div>
						<div>
							<div className="text-xs font-semibold text-primary">
								{counts.contribute} Newer{" "}
								{counts.contribute > 1 ? "Releases" : "Release"} on Your Quest
							</div>
							<div className="text-[11px] text-muted">
								Your device has newer app versions than this repository catalog.
								You can dump and upload them to help update the server.
							</div>
						</div>
					</div>
					<Button
						size="sm"
						variant="secondary"
						onClick={() => {
							setStatusFilter("contribute");
							setCurrentPage(1);
						}}
						className="text-xs shrink-0 w-full sm:w-auto"
					>
						View Can Contribute ({counts.contribute})
					</Button>
				</div>
			)}

			<div className="space-y-3">
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
					<div className="relative flex-1">
						<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setCurrentPage(1);
							}}
							placeholder="Search games by title, package name, or release..."
							className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md bg-card border border-default text-primary placeholder:text-muted outline-none focus:border-blue-500 transition-colors"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => {
									setSearchQuery("");
									setCurrentPage(1);
								}}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<div className="flex items-center gap-1 text-xs border border-default bg-card rounded-md px-2.5 py-1">
							<ArrowUpDown className="w-3 h-3 text-muted" />
							<select
								value={sortBy}
								onChange={(e) => {
									setSortBy(e.target.value as typeof sortBy);
									setCurrentPage(1);
								}}
								className="bg-transparent text-xs text-primary outline-none cursor-pointer"
							>
								<option value="name_asc">Name (A-Z)</option>
								<option value="name_desc">Name (Z-A)</option>
								<option value="size_desc">Size (Largest)</option>
								<option value="size_asc">Size (Smallest)</option>
								<option value="updated_desc">Recently Updated</option>
								<option value="downloads_desc">Most Downloads</option>
							</select>
						</div>

						<div className="flex items-center border border-default bg-card rounded-md p-0.5">
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								className={`p-1.5 rounded transition-colors ${
									viewMode === "grid"
										? "bg-elevated text-primary"
										: "text-muted hover:text-primary"
								}`}
								title="Grid View"
							>
								<Grid className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onClick={() => setViewMode("table")}
								className={`p-1.5 rounded transition-colors ${
									viewMode === "table"
										? "bg-elevated text-primary"
										: "text-muted hover:text-primary"
								}`}
								title="Table View"
							>
								<List className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-1.5 text-xs">
					<button
						type="button"
						onClick={() => {
							setStatusFilter("all");
							setCurrentPage(1);
						}}
						className={`px-3 py-1 rounded-md transition-colors ${
							statusFilter === "all"
								? "bg-elevated text-primary font-semibold border border-default"
								: "text-secondary hover:text-primary hover:bg-elevated/50"
						}`}
					>
						All Games ({counts.total})
					</button>

					<button
						type="button"
						onClick={() => {
							setStatusFilter("installed");
							setCurrentPage(1);
						}}
						className={`px-3 py-1 rounded-md transition-colors ${
							statusFilter === "installed"
								? "bg-elevated text-primary font-semibold border border-default"
								: "text-secondary hover:text-primary hover:bg-elevated/50"
						}`}
					>
						Installed on Device ({counts.installed})
					</button>

					{counts.updates > 0 && (
						<button
							type="button"
							onClick={() => {
								setStatusFilter("updates");
								setCurrentPage(1);
							}}
							className={`px-3 py-1 rounded-md transition-colors ${
								statusFilter === "updates"
									? "bg-elevated text-primary font-semibold border border-default"
									: "text-amber-500 hover:bg-amber-500/10"
							}`}
						>
							Updates Available ({counts.updates})
						</button>
					)}

					{counts.contribute > 0 && (
						<button
							type="button"
							onClick={() => {
								setStatusFilter("contribute");
								setCurrentPage(1);
							}}
							className={`px-3 py-1 rounded-md transition-colors ${
								statusFilter === "contribute"
									? "bg-elevated text-emerald-400 font-semibold border border-default"
									: "text-emerald-400 hover:bg-emerald-500/10"
							}`}
						>
							Can Contribute ({counts.contribute})
						</button>
					)}

					<button
						type="button"
						onClick={() => {
							setStatusFilter("uninstalled");
							setCurrentPage(1);
						}}
						className={`px-3 py-1 rounded-md transition-colors ${
							statusFilter === "uninstalled"
								? "bg-elevated text-primary font-semibold border border-default"
								: "text-secondary hover:text-primary hover:bg-elevated/50"
						}`}
					>
						Available ({counts.uninstalled})
					</button>

					<span className="text-muted text-[11px] ml-auto">
						Showing {filteredGames.length} of {games.length} titles
					</span>
				</div>
			</div>

			{games.length === 0 ? (
				<Card className="text-center py-16 px-4 bg-card border-2 border-dashed border-default">
					<div className="w-12 h-12 rounded-full bg-elevated border border-default flex items-center justify-center mx-auto mb-3 text-muted">
						<Compass className="w-6 h-6 text-blue-500" />
					</div>
					<h3 className="text-base font-semibold text-primary mb-1">
						Repository Not Synced
					</h3>
					<p className="text-xs text-muted max-w-md mx-auto mb-5 leading-relaxed">
						Click "Sync Repo" to fetch and extract the latest game catalog from{" "}
						<code>{activeRepo.baseUri}</code>, or manually import a{" "}
						<code>meta.7z</code> archive if network access is restricted.
					</p>
					<div className="flex justify-center gap-2">
						<Button
							variant="primary"
							size="md"
							onClick={handleSync}
							isLoading={isSyncing}
							leftIcon={<RefreshCw className="w-4 h-4" />}
						>
							Sync Repository Now
						</Button>
						<Button
							variant="secondary"
							size="md"
							onClick={() => setIsConfigModalOpen(true)}
							leftIcon={<FolderUp className="w-4 h-4" />}
						>
							Import File / Settings
						</Button>
					</div>
				</Card>
			) : filteredGames.length === 0 ? (
				<Card className="text-center py-12 px-4 bg-card border border-default">
					<p className="text-sm font-semibold text-primary mb-1">
						No games found matching your filters
					</p>
					<p className="text-xs text-muted mb-4">
						Try adjusting your search keywords or switching filter categories.
					</p>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							setSearchQuery("");
							setStatusFilter("all");
							setCurrentPage(1);
						}}
					>
						Clear Filters
					</Button>
				</Card>
			) : viewMode === "grid" ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
					{paginatedGames.map((game) => (
						<RepoGameCard
							key={game.id}
							game={game}
							isConnected={isConnected}
							isInstalling={activePkg === game.packageName}
							isQueued={queuedPkgs.includes(game.packageName)}
							onSelectDetails={(g) => setSelectedGameForDetails(g)}
							onInstall={handleInstall}
							onDownload={handleDownloadDirect}
							onUpload={handleOpenUpload}
						/>
					))}
				</div>
			) : (
				<Card className="overflow-x-auto bg-card border border-default">
					<table className="w-full text-left text-xs">
						<thead className="bg-elevated/60 text-secondary border-b border-subtle">
							<tr>
								<th className="py-2.5 px-3">Game Title</th>
								<th className="py-2.5 px-3">Package Name</th>
								<th className="py-2.5 px-3">Version</th>
								<th className="py-2.5 px-3">Size</th>
								<th className="py-2.5 px-3">Status</th>
								<th className="py-2.5 px-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-subtle">
							{paginatedGames.map((game) => {
								const isGameQueued = queuedPkgs.includes(game.packageName);
								const isGameInstalling = activePkg === game.packageName;

								return (
									<tr
										key={game.id}
										className="hover:bg-elevated/40 transition-colors"
									>
										<td className="py-2.5 px-3">
											<button
												type="button"
												onClick={() => setSelectedGameForDetails(game)}
												className="font-semibold text-primary hover:text-blue-500 text-left truncate max-w-xs block"
											>
												{game.name}
											</button>
										</td>
										<td className="py-2.5 px-3 font-mono text-muted text-[11px]">
											{game.packageName}
										</td>
										<td className="py-2.5 px-3 font-mono text-secondary">
											v{game.versionCode}
										</td>
										<td className="py-2.5 px-3 text-secondary">{game.size}</td>
										<td className="py-2.5 px-3">
											{game.isInstalled ? (
												game.isNewerOnDevice ? (
													<Badge variant="warning">Newer on Quest</Badge>
												) : game.hasUpdate ? (
													<Badge variant="warning">Update</Badge>
												) : (
													<Badge variant="connected">Installed</Badge>
												)
											) : (
												<Badge variant="neutral">Available</Badge>
											)}
										</td>
										<td className="py-2.5 px-3 text-right space-x-1.5">
											{game.isNewerOnDevice && (
												<Button
													variant="secondary"
													size="sm"
													onClick={() => handleOpenUpload(game)}
													leftIcon={
														<ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
													}
													className="px-2"
													title="Upload to Repository Server"
												>
													Upload
												</Button>
											)}
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setSelectedGameForDetails(game)}
												className="px-2"
											>
												<Info className="w-3.5 h-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleDownloadDirect(game)}
												className="px-2"
											>
												<Download className="w-3.5 h-3.5" />
											</Button>
											<Button
												variant="primary"
												size="sm"
												onClick={() => handleInstall(game)}
												disabled={
													!isConnected || isGameInstalling || isGameQueued
												}
												isLoading={isGameInstalling}
											>
												{isGameQueued
													? "Queued"
													: isGameInstalling
														? "Installing"
														: "Install"}
											</Button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</Card>
			)}

			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-3 text-xs">
					<span className="text-muted">
						Page {currentPage} of {totalPages}
					</span>

					<div className="flex items-center gap-1.5">
						<Button
							variant="secondary"
							size="sm"
							disabled={currentPage <= 1}
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						>
							Previous
						</Button>

						<Button
							variant="secondary"
							size="sm"
							disabled={currentPage >= totalPages}
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						>
							Next
						</Button>
					</div>
				</div>
			)}

			<RepoConfigModal
				isOpen={isConfigModalOpen}
				onClose={() => setIsConfigModalOpen(false)}
				activeRepo={activeRepo}
				initialTab={configModalTab}
				onSelectRepo={(repo) => {
					setActiveRepo(repo);
					if (repo) {
						repoClient.setActiveRepoId(repo.id);
						const cached = repoClient.getLocalCachedGames(repo.id);
						setGames(cached);
					} else {
						setGames([]);
					}
				}}
				onMetaImported={() => {
					const cur = repoClient.getActiveRepo();
					setActiveRepo(cur);
					if (cur) {
						const cached = repoClient.getLocalCachedGames(cur.id);
						setGames(cached);
					}
				}}
			/>

			<GameDetailsModal
				isOpen={Boolean(selectedGameForDetails)}
				onClose={() => setSelectedGameForDetails(null)}
				game={selectedGameForDetails}
				activeRepo={activeRepo}
				isConnected={isConnected}
				onInstall={(game) => {
					setSelectedGameForDetails(null);
					handleInstall(game);
				}}
				onDownload={handleDownloadDirect}
				onUpload={handleOpenUpload}
			/>

			<RepoInstallModal
				isOpen={isInstallModalOpen}
				progress={installProgress}
				onClose={() => setIsInstallModalOpen(false)}
			/>

			<RepoUploadModal
				isOpen={isUploadModalOpen}
				onClose={() => setIsUploadModalOpen(false)}
				game={selectedGameForUpload}
				isConnected={isConnected}
			/>
		</div>
	);
};
