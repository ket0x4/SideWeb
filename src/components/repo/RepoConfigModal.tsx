import {
	Check,
	FolderUp,
	Globe,
	Key,
	Loader2,
	Plus,
	Server,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { repoClient } from "../../services/repo/repo-client";
import type { RepoConfig } from "../../types/repo";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

interface RepoConfigModalProps {
	isOpen: boolean;
	onClose: () => void;
	activeRepo: RepoConfig | null;
	onSelectRepo: (repo: RepoConfig | null) => void;
	onMetaImported: () => void;
	initialTab?: "repos" | "add" | "import";
}

export const RepoConfigModal: React.FC<RepoConfigModalProps> = ({
	isOpen,
	onClose,
	activeRepo,
	onSelectRepo,
	onMetaImported,
	initialTab,
}) => {
	const [repos, setRepos] = useState<RepoConfig[]>(() => repoClient.getRepos());
	const [activeTab, setActiveTab] = useState<"repos" | "add" | "import">(
		() => initialTab || (repoClient.getRepos().length === 0 ? "add" : "repos"),
	);

	useEffect(() => {
		if (isOpen && initialTab) {
			setActiveTab(initialTab);
		}
	}, [isOpen, initialTab]);

	const [repoName, setRepoName] = useState("");
	const [baseUri, setBaseUri] = useState("");
	const [password, setPassword] = useState("");
	const [proxyUrl, setProxyUrl] = useState("");
	const [jsonInput, setJsonInput] = useState("");
	const [jsonError, setJsonError] = useState("");

	const [isImporting, setIsImporting] = useState(false);
	const [importPassword, setImportPassword] = useState("");
	const [importStatus, setImportStatus] = useState<string | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	if (!isOpen) return null;

	const handleParseJsonInput = (text: string) => {
		setJsonInput(text);
		setJsonError("");
		if (!text.trim()) return;

		try {
			const parsed = JSON.parse(text);
			if (parsed.baseUri) {
				setBaseUri(parsed.baseUri);
				if (!repoName) {
					try {
						const host = new URL(parsed.baseUri).hostname;
						setRepoName(host);
					} catch {
						setRepoName("Custom Repo");
					}
				}
			}
			if (parsed.password) {
				setPassword(parsed.password);
			}
			if (parsed.proxyUrl) {
				setProxyUrl(parsed.proxyUrl);
			}
		} catch {
			setJsonError("Invalid JSON structure");
		}
	};

	const handleSaveNewRepo = () => {
		if (!baseUri.trim()) {
			setJsonError("Base URL is required");
			return;
		}

		let finalUri = baseUri.trim();
		if (!finalUri.startsWith("http://") && !finalUri.startsWith("https://")) {
			finalUri = `https://${finalUri}`;
		}
		if (!finalUri.endsWith("/")) {
			finalUri += "/";
		}

		const newRepo: RepoConfig = {
			id: `repo_${Date.now()}`,
			name: repoName.trim() || new URL(finalUri).hostname,
			baseUri: finalUri,
			password: password.trim() || undefined,
			proxyUrl: proxyUrl.trim() || undefined,
		};

		repoClient.addOrUpdateRepo(newRepo);
		const updated = repoClient.getRepos();
		setRepos(updated);
		onSelectRepo(newRepo);
		setActiveTab("repos");

		setRepoName("");
		setBaseUri("");
		setPassword("");
		setProxyUrl("");
		setJsonInput("");
		setJsonError("");
	};

	const handleDeleteRepo = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		repoClient.deleteRepo(id);
		const updated = repoClient.getRepos();
		setRepos(updated);
		if (activeRepo?.id === id) {
			onSelectRepo(updated[0] || null);
		}
	};

	const handleFileUpload = async (file: File) => {
		setIsImporting(true);
		setImportStatus(`Reading & parsing "${file.name}"...`);
		setImportError(null);

		try {
			await repoClient.importOfflineMeta(
				file,
				importPassword.trim() || activeRepo?.password,
			);
			setImportStatus(
				`Successfully imported games catalog from "${file.name}"!`,
			);
			onMetaImported();
			setTimeout(() => {
				onClose();
			}, 1000);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setImportError(msg);
			setImportStatus(null);
		} finally {
			setIsImporting(false);
		}
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

			<div className="w-full max-w-xl max-h-[90dvh] overflow-y-auto bg-surface border border-default rounded-xl shadow-2xl p-4 sm:p-6 text-primary space-y-5 relative z-10">
				<div className="flex items-center justify-between border-b border-subtle pb-3">
					<div className="flex items-center gap-2">
						<Server className="w-5 h-5 text-blue-500" />
						<h2 className="text-base font-semibold text-primary">
							Repository Settings
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded text-secondary hover:text-primary hover:bg-elevated transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="flex gap-2 border-b border-subtle pb-2 text-xs font-medium">
					<button
						type="button"
						onClick={() => setActiveTab("repos")}
						className={`px-3 py-1.5 rounded-md transition-colors ${
							activeTab === "repos"
								? "bg-elevated text-primary font-semibold border border-default"
								: "text-secondary hover:text-primary hover:bg-elevated/50"
						}`}
					>
						Repositories ({repos.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("add")}
						className={`px-3 py-1.5 rounded-md transition-colors ${
							activeTab === "add"
								? "bg-elevated text-primary font-semibold border border-default"
								: "text-secondary hover:text-primary hover:bg-elevated/50"
						}`}
					>
						Add Repository
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("import")}
						className={`px-3 py-1.5 rounded-md transition-colors ${
							activeTab === "import"
								? "bg-elevated text-primary font-semibold border border-default"
								: "text-secondary hover:text-primary hover:bg-elevated/50"
						}`}
					>
						Import Offline File
					</button>
				</div>

				<Alert variant="info" className="text-xs">
					SideWeb is an open-source client-side sideloading tool. SideWeb does
					not host, provide, or validate external content. Any repositories you
					add are stored locally in your browser. You are responsible for
					ensuring compliance with applicable copyright laws for any content
					accessed.
				</Alert>

				{activeTab === "repos" && (
					<div className="space-y-3">
						<p className="text-xs text-secondary">
							Select the active repository to browse and sideload games:
						</p>

						{repos.length === 0 ? (
							<div className="text-center py-6 border border-dashed border-default rounded-lg p-4 space-y-3">
								<Server className="w-8 h-8 text-muted mx-auto" />
								<div>
									<p className="font-semibold text-primary text-sm">
										No Custom Repositories Configured
									</p>
									<p className="text-xs text-muted mt-1">
										Add a custom repository source to start browsing and
										sideloading applications.
									</p>
								</div>
								<Button
									variant="primary"
									size="sm"
									onClick={() => setActiveTab("add")}
									leftIcon={<Plus className="w-3.5 h-3.5" />}
								>
									Add Custom Repository
								</Button>
							</div>
						) : (
							<div className="space-y-2">
								{repos.map((repo) => {
									const isActive = Boolean(
										activeRepo && repo.id === activeRepo.id,
									);
									return (
										<Card
											key={repo.id}
											onClick={() => onSelectRepo(repo)}
											className={`p-3 cursor-pointer flex items-center justify-between border transition-all ${
												isActive
													? "border-blue-500 bg-blue-500/10"
													: "border-default hover:border-hover bg-card"
											}`}
										>
											<div className="space-y-1 min-w-0 pr-3">
												<div className="flex items-center gap-2">
													<span className="text-sm font-semibold text-primary truncate">
														{repo.name}
													</span>
													{isActive && (
														<Badge variant="connected">Active</Badge>
													)}
												</div>
												<div className="text-xs text-muted font-mono truncate">
													{repo.baseUri}
												</div>
												{repo.lastSynced && (
													<div className="text-[10px] text-muted">
														Last synced:{" "}
														{new Date(repo.lastSynced).toLocaleString()}
													</div>
												)}
											</div>

											<div className="flex items-center gap-2 shrink-0">
												{isActive ? (
													<div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
														<Check className="w-4 h-4" />
													</div>
												) : (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => onSelectRepo(repo)}
													>
														Use
													</Button>
												)}
												<button
													type="button"
													onClick={(e) => handleDeleteRepo(repo.id, e)}
													title="Delete Repository"
													className="p-1.5 rounded text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</Card>
									);
								})}
							</div>
						)}

						<div className="pt-2 flex justify-between items-center">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setActiveTab("add")}
								leftIcon={<Plus className="w-3.5 h-3.5" />}
							>
								Add Custom Repo
							</Button>
							<Button variant="secondary" size="sm" onClick={onClose}>
								Done
							</Button>
						</div>
					</div>
				)}

				{activeTab === "add" && (
					<div className="space-y-4 text-xs">
						<span className="font-semibold text-primary block">
							Paste Config JSON or Enter Details
						</span>

						<div>
							<label
								htmlFor="repo-json-config"
								className="block text-secondary mb-1"
							>
								Paste JSON Config (e.g. from custom repo json):
							</label>
							<textarea
								id="repo-json-config"
								rows={3}
								value={jsonInput}
								onChange={(e) => handleParseJsonInput(e.target.value)}
								placeholder='{"baseUri":"https://example.com/repo/","password":"optional_password"}'
								className="w-full font-mono text-xs p-2.5 rounded-md bg-card border border-default text-primary outline-none focus:border-blue-500"
							/>
							{jsonError && (
								<p className="text-red-500 text-[11px] mt-1">{jsonError}</p>
							)}
						</div>

						<div className="space-y-3 pt-1 border-t border-subtle">
							<div>
								<label
									htmlFor="repo-name-input"
									className="block text-secondary mb-1"
								>
									Repository Name:
								</label>
								<Input
									id="repo-name-input"
									value={repoName}
									onChange={(e) => setRepoName(e.target.value)}
									placeholder="My Custom Repo"
								/>
							</div>

							<div>
								<label
									htmlFor="repo-base-uri"
									className="block text-secondary mb-1"
								>
									Base URI / Endpoint:
								</label>
								<Input
									id="repo-base-uri"
									value={baseUri}
									onChange={(e) => setBaseUri(e.target.value)}
									placeholder="https://example.com/repo/"
									leftIcon={<Globe className="w-3.5 h-3.5 text-muted" />}
								/>
							</div>

							<div>
								<label
									htmlFor="repo-password"
									className="block text-secondary mb-1"
								>
									Password (Base64 Encoded or Raw):
								</label>
								<Input
									id="repo-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Archive password (if required)"
									leftIcon={<Key className="w-3.5 h-3.5 text-muted" />}
								/>
								<p className="text-[10px] text-muted mt-0.5">
									Used for decrypting meta.7z catalog and 7-Zip game archives.
								</p>
							</div>

							<div>
								<label
									htmlFor="repo-proxy-url"
									className="block text-secondary mb-1"
								>
									Custom Proxy URL (Optional):
								</label>
								<Input
									id="repo-proxy-url"
									value={proxyUrl}
									onChange={(e) => setProxyUrl(e.target.value)}
									placeholder="https://my-cors-proxy.com/?url="
								/>
								<p className="text-[10px] text-muted mt-0.5">
									Leave blank to use SideWeb's built-in backend proxy.
								</p>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-3 border-t border-subtle">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setActiveTab("repos")}
							>
								Cancel
							</Button>
							<Button variant="primary" size="sm" onClick={handleSaveNewRepo}>
								Save & Use Repository
							</Button>
						</div>
					</div>
				)}

				{activeTab === "import" && (
					<div className="space-y-4 text-xs">
						<p className="text-secondary leading-relaxed">
							If direct access to the repository is blocked by Cloudflare in
							your location, you can download <code>meta.7z</code> or{" "}
							<code>VRP-GameList.txt</code> via browser or VPN and import it
							directly below:
						</p>

						<div>
							<label
								htmlFor="import-archive-password"
								className="block text-secondary mb-1"
							>
								Archive Password (if importing meta.7z):
							</label>
							<Input
								id="import-archive-password"
								type="password"
								value={importPassword}
								onChange={(e) => setImportPassword(e.target.value)}
								placeholder={
									activeRepo?.password || "Archive password (if required)"
								}
								leftIcon={<Key className="w-3.5 h-3.5 text-muted" />}
							/>
						</div>

						<input
							ref={fileInputRef}
							type="file"
							accept=".7z,.txt"
							className="hidden"
							onChange={(e) => {
								if (e.target.files && e.target.files.length > 0) {
									handleFileUpload(e.target.files[0]);
								}
							}}
						/>

						<Card
							onClick={() => !isImporting && fileInputRef.current?.click()}
							className="border-2 border-dashed border-default hover:border-hover p-6 text-center cursor-pointer bg-card transition-colors"
						>
							<div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center mx-auto mb-2 text-primary">
								{isImporting ? (
									<Loader2 className="w-5 h-5 animate-spin text-blue-500" />
								) : (
									<FolderUp className="w-5 h-5 text-blue-500" />
								)}
							</div>
							<div className="font-semibold text-primary mb-1">
								{isImporting
									? "Importing File..."
									: "Click to Select meta.7z or VRP-GameList.txt"}
							</div>
							<div className="text-[11px] text-muted">
								Drag and drop or select file from your hard drive
							</div>
						</Card>

						{importStatus && <Alert variant="success">{importStatus}</Alert>}
						{importError && <Alert variant="error">{importError}</Alert>}

						<div className="flex justify-end pt-2">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setActiveTab("repos")}
							>
								Back to Repositories
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
