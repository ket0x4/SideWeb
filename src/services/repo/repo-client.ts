import type {
	RepoConfig,
	RepoGameInfo,
	RepoInstallProgress,
	RepoUploadProgress,
} from "../../types/repo";
import { adbClient } from "../webadb/adb-client";

const REPOS_STORAGE_KEY = "sideweb_repos";
const ACTIVE_REPO_STORAGE_KEY = "sideweb_active_repo_id";
const CACHED_GAMES_STORAGE_KEY = "sideweb_cached_games_";

interface QueueItem {
	id: string;
	game: RepoGameInfo;
	type: "install" | "download";
	repo: RepoConfig;
	onProgress?: (progress: RepoInstallProgress) => void;
	resolve: (val: boolean) => void;
	reject: (err: unknown) => void;
}

const queue: QueueItem[] = [];
let activeTask: QueueItem | null = null;
const queueListeners = new Set<() => void>();

function notifyQueueChanged() {
	for (const cb of queueListeners) {
		try {
			cb();
		} catch {}
	}
}

async function processNextQueueItem() {
	if (activeTask || queue.length === 0) return;

	activeTask = queue.shift() || null;
	notifyQueueChanged();
	if (!activeTask) return;

	const task = activeTask;
	try {
		if (task.type === "install") {
			const success = await repoClient.installGameToDeviceDirect(
				task.repo,
				task.game,
				task.onProgress || (() => {}),
			);
			task.resolve(success);
		} else {
			const blob = await repoClient.downloadGameBlob(task.repo, task.game);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${task.game.releaseName}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			task.resolve(true);
		}
	} catch (err) {
		task.reject(err);
	} finally {
		activeTask = null;
		notifyQueueChanged();
		setTimeout(() => {
			processNextQueueItem();
		}, 800);
	}
}

function getStoredRepos(): RepoConfig[] {
	try {
		const parsed = JSON.parse(localStorage.getItem(REPOS_STORAGE_KEY) || "");
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveStoredRepos(repos: RepoConfig[]): void {
	try {
		localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(repos));
	} catch (e) {
		console.error("Failed to save repositories to localStorage:", e);
	}
}

export const repoClient = {
	getRepos: getStoredRepos,
	saveRepos: saveStoredRepos,

	isQueueBusy(): boolean {
		return activeTask !== null;
	},

	getActivePackageName(): string | null {
		return activeTask?.game.packageName || null;
	},

	getQueuedPackageNames(): string[] {
		return queue.map((q) => q.game.packageName);
	},

	subscribeQueue(callback: () => void): () => void {
		queueListeners.add(callback);
		return () => {
			queueListeners.delete(callback);
		};
	},

	enqueueInstall(
		repo: RepoConfig,
		game: RepoGameInfo,
		onProgress?: (progress: RepoInstallProgress) => void,
	): Promise<boolean> {
		return new Promise((resolve, reject) => {
			queue.push({
				id: `install_${game.packageName}_${Date.now()}`,
				game,
				type: "install",
				repo,
				onProgress,
				resolve,
				reject,
			});
			notifyQueueChanged();
			processNextQueueItem();
		});
	},

	enqueueDownload(repo: RepoConfig, game: RepoGameInfo): Promise<boolean> {
		return new Promise((resolve, reject) => {
			queue.push({
				id: `download_${game.packageName}_${Date.now()}`,
				game,
				type: "download",
				repo,
				resolve,
				reject,
			});
			notifyQueueChanged();
			processNextQueueItem();
		});
	},

	getActiveRepo(): RepoConfig | null {
		const repos = getStoredRepos();
		if (repos.length === 0) return null;
		const activeId = localStorage.getItem(ACTIVE_REPO_STORAGE_KEY);
		return repos.find((r) => r.id === activeId) || repos[0] || null;
	},

	setActiveRepoId(id: string): void {
		localStorage.setItem(ACTIVE_REPO_STORAGE_KEY, id);
	},

	addOrUpdateRepo(repo: RepoConfig): void {
		const repos = getStoredRepos();
		const idx = repos.findIndex((r) => r.id === repo.id);
		if (idx >= 0) repos[idx] = repo;
		else repos.push(repo);
		saveStoredRepos(repos);
		if (!localStorage.getItem(ACTIVE_REPO_STORAGE_KEY) || repos.length === 1) {
			localStorage.setItem(ACTIVE_REPO_STORAGE_KEY, repo.id);
		}
	},

	deleteRepo(id: string): void {
		const repos = getStoredRepos().filter((r) => r.id !== id);
		saveStoredRepos(repos);
		try {
			localStorage.removeItem(`${CACHED_GAMES_STORAGE_KEY}${id}`);
		} catch {}
		const activeId = localStorage.getItem(ACTIVE_REPO_STORAGE_KEY);
		if (activeId === id) {
			if (repos.length > 0) {
				localStorage.setItem(ACTIVE_REPO_STORAGE_KEY, repos[0].id);
			} else {
				localStorage.removeItem(ACTIVE_REPO_STORAGE_KEY);
			}
		}
	},

	getLocalCachedGames(repoId: string): RepoGameInfo[] {
		try {
			return JSON.parse(
				localStorage.getItem(`${CACHED_GAMES_STORAGE_KEY}${repoId}`) || "[]",
			);
		} catch {
			return [];
		}
	},

	setLocalCachedGames(repoId: string, games: RepoGameInfo[]): void {
		try {
			localStorage.setItem(
				`${CACHED_GAMES_STORAGE_KEY}${repoId}`,
				JSON.stringify(games),
			);
		} catch (e) {
			console.warn("LocalStorage quota exceeded when caching games", e);
		}
	},

	async syncRepo(repo: RepoConfig): Promise<RepoGameInfo[]> {
		const res = await fetch("/api/repo/sync", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				baseUri: repo.baseUri,
				password: repo.password,
				proxyUrl: repo.proxyUrl,
			}),
		});

		const data = await res.json();
		if (!res.ok || !data.success) {
			throw new Error(data.error || `Sync failed with HTTP ${res.status}`);
		}

		const games: RepoGameInfo[] = data.games || [];
		repo.lastSynced = new Date().toISOString();
		repoClient.addOrUpdateRepo(repo);
		repoClient.setLocalCachedGames(repo.id, games);
		return games;
	},

	async importOfflineMeta(
		file: File,
		password?: string,
	): Promise<RepoGameInfo[]> {
		const formData = new FormData();
		formData.append("file", file);
		if (password) formData.append("password", password);

		const res = await fetch("/api/repo/import-meta", {
			method: "POST",
			body: formData,
		});

		const data = await res.json();
		if (!res.ok || !data.success) {
			throw new Error(data.error || `Import failed with HTTP ${res.status}`);
		}

		const games: RepoGameInfo[] = data.games || [];
		let active = repoClient.getActiveRepo();
		if (!active) {
			active = {
				id: `offline_${Date.now()}`,
				name: file.name.replace(/\.[^/.]+$/, "") || "Offline Repository",
				baseUri: "offline://local",
				password,
			};
		}
		active.lastSynced = new Date().toISOString();
		repoClient.addOrUpdateRepo(active);
		repoClient.setLocalCachedGames(active.id, games);
		return games;
	},

	async getCachedServerGames(): Promise<RepoGameInfo[]> {
		try {
			const res = await fetch("/api/repo/games");
			return res.ok ? (await res.json()).games || [] : [];
		} catch {
			return [];
		}
	},

	async getGameNote(releaseName: string): Promise<string> {
		try {
			const res = await fetch(
				`/api/repo/note?release=${encodeURIComponent(releaseName)}`,
			);
			return res.ok ? (await res.json()).note || "" : "";
		} catch {
			return "";
		}
	},

	async downloadGameBlob(repo: RepoConfig, game: RepoGameInfo): Promise<Blob> {
		const res = await fetch("/api/repo/download", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				baseUri: repo.baseUri,
				password: repo.password,
				releaseName: game.releaseName,
				packageName: game.packageName,
				proxyUrl: repo.proxyUrl,
			}),
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.error || `Download failed with HTTP ${res.status}`);
		}

		return await res.blob();
	},

	async installGameToDeviceDirect(
		repo: RepoConfig,
		game: RepoGameInfo,
		onProgress: (progress: RepoInstallProgress) => void,
	): Promise<boolean> {
		try {
			onProgress({
				stage: "downloading",
				percentage: 10,
				statusText: `Connecting & downloading ${game.name}...`,
				gameName: game.name,
				packageName: game.packageName,
			});

			const blob = await repoClient.downloadGameBlob(repo, game);

			onProgress({
				stage: "extracting",
				percentage: 45,
				statusText: "Processing package binaries and assets...",
				gameName: game.name,
				packageName: game.packageName,
			});

			const file = new File([blob], `${game.releaseName}.zip`, {
				type: "application/zip",
			});

			const success = await adbClient.installPackage(file, (step, pct) => {
				let stage: RepoInstallProgress["stage"] = "installing";
				if (step.toLowerCase().includes("upload")) stage = "pushing_apk";
				else if (step.toLowerCase().includes("obb")) stage = "pushing_obb";

				onProgress({
					stage,
					percentage: Math.min(45 + Math.round(pct * 0.55), 99),
					statusText: step,
					gameName: game.name,
					packageName: game.packageName,
				});
			});

			if (success) {
				onProgress({
					stage: "completed",
					percentage: 100,
					statusText: `Successfully installed ${game.name}!`,
					gameName: game.name,
					packageName: game.packageName,
				});
				return true;
			}
			throw new Error("Device rejected the installation or push failed.");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			onProgress({
				stage: "error",
				percentage: 0,
				statusText: "Installation failed",
				error: message,
				gameName: game.name,
				packageName: game.packageName,
			});
			return false;
		}
	},

	async uploadNewerVersion(
		game: RepoGameInfo,
		onProgress: (progress: RepoUploadProgress) => void,
	): Promise<boolean> {
		try {
			onProgress({
				stage: "locating",
				percentage: 10,
				statusText: `Locating installed package for ${game.name} on Quest...`,
				gameName: game.name,
				packageName: game.packageName,
			});

			const bundleBlob = await adbClient.extractAppBundle(
				game.packageName,
				(step, pct) => {
					let stage: RepoUploadProgress["stage"] = "pulling_apk";
					if (step.includes("OBB")) stage = "pulling_obb";
					else if (step.includes("Compressing")) stage = "packaging";

					onProgress({
						stage,
						percentage: Math.min(10 + Math.round(pct * 0.65), 75),
						statusText: step,
						gameName: game.name,
						packageName: game.packageName,
					});
				},
			);

			onProgress({
				stage: "uploading",
				percentage: 80,
				statusText: "Uploading package bundle to repository server...",
				gameName: game.name,
				packageName: game.packageName,
			});

			const formData = new FormData();
			formData.append(
				"file",
				new File([bundleBlob], `${game.packageName}.zip`, {
					type: "application/zip",
				}),
			);
			formData.append("packageName", game.packageName);
			formData.append("releaseName", game.releaseName);

			const res = await fetch("/api/repo/upload", {
				method: "POST",
				body: formData,
			});

			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.success) {
				throw new Error(data.error || `Upload failed with HTTP ${res.status}`);
			}

			onProgress({
				stage: "completed",
				percentage: 100,
				statusText: data.message || `Successfully contributed ${game.name}!`,
				gameName: game.name,
				packageName: game.packageName,
			});

			return true;
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			onProgress({
				stage: "error",
				percentage: 0,
				statusText: "Contribution failed",
				error: message,
				gameName: game.name,
				packageName: game.packageName,
			});
			return false;
		}
	},
};
