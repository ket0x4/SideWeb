import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sevenBin from "7zip-bin";
import type { RepoGameInfo } from "../../types/repo";
import { isTrustedUpstreamHost, validateUpstreamUrl } from "./url-validator";

const CACHE_DIR = path.resolve(process.cwd(), ".repo_cache");
const TEMP_DOWNLOAD_DIR = path.resolve(process.cwd(), ".repo_downloads");

fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(TEMP_DOWNLOAD_DIR, { recursive: true });

const REPO_API_KEY = process.env.REPO_API_KEY?.trim() || "";
const REPO_UPLOAD_URL = process.env.REPO_UPLOAD_URL?.trim() || "";
const RATE_LIMIT_DELAY_MS = 1000;
let lastRequestTime = 0;

async function rateLimitDelay(ms = RATE_LIMIT_DELAY_MS): Promise<void> {
	const now = Date.now();
	const elapsed = now - lastRequestTime;
	if (elapsed < ms) {
		const waitTime = ms - elapsed;
		await new Promise((resolve) => setTimeout(resolve, waitTime));
	}
	lastRequestTime = Date.now();
}

function getUpstreamHeaders(
	targetUrl?: string,
	extraHeaders?: Record<string, string>,
): Record<string, string> {
	const headers: Record<string, string> = {
		"User-Agent":
			"rclone/v1.66.0 (Mozilla/5.0 Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		Accept: "*/*",
		...extraHeaders,
	};
	if (REPO_API_KEY && targetUrl && isTrustedUpstreamHost(targetUrl)) {
		headers.Authorization = `Bearer ${REPO_API_KEY}`;
		headers["X-API-Key"] = REPO_API_KEY;
	}
	return headers;
}

export function get7zaExecutable(): string {
	const binPath = sevenBin.path7za;
	try {
		fs.chmodSync(binPath, 0o755);
	} catch {}
	return binPath;
}

function decodeRepoPassword(password?: string): string {
	if (!password) return "";
	try {
		return atob(password.trim());
	} catch {
		return password;
	}
}

function computeReleaseHash(releaseName: string): string {
	return crypto
		.createHash("md5")
		.update(`${releaseName.trim()}\n`)
		.digest("hex");
}

function parseGameListText(text: string): RepoGameInfo[] {
	const lines = text.split(/\r?\n/);
	if (lines.length === 0) return [];

	const headerLine = lines[0].trim();
	if (!headerLine) return [];

	const columns = headerLine.split(";").map((col) => col.trim().toLowerCase());
	const gameNameIdx = columns.findIndex(
		(c) => c.includes("game name") || c === "name",
	);
	const releaseNameIdx = columns.findIndex(
		(c) => c.includes("release name") || c.includes("release"),
	);
	const packageNameIdx = columns.findIndex(
		(c) => c.includes("package name") || c.includes("package"),
	);
	const versionCodeIdx = columns.findIndex(
		(c) => c.includes("version code") || c.includes("version"),
	);
	const sizeIdx = columns.findIndex(
		(c) => c.includes("size (mb)") || c.includes("size"),
	);
	const updatedIdx = columns.findIndex(
		(c) => c.includes("last updated") || c.includes("updated"),
	);
	const downloadsIdx = columns.findIndex((c) => c.includes("downloads"));

	const games: RepoGameInfo[] = [];
	const thumbnailsDir = path.join(CACHE_DIR, ".meta", "thumbnails");
	const notesDir = path.join(CACHE_DIR, ".meta", "notes");

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const parts = line.split(";");
		if (parts.length < 3) continue;

		const name =
			gameNameIdx >= 0 && parts[gameNameIdx]
				? parts[gameNameIdx].trim()
				: "Unknown";
		const releaseName =
			releaseNameIdx >= 0 && parts[releaseNameIdx]
				? parts[releaseNameIdx].trim()
				: name;
		const packageName =
			packageNameIdx >= 0 && parts[packageNameIdx]
				? parts[packageNameIdx].trim()
				: "";
		const versionCode =
			versionCodeIdx >= 0 && parts[versionCodeIdx]
				? parts[versionCodeIdx].trim()
				: "1";
		const rawSize =
			sizeIdx >= 0 && parts[sizeIdx] ? parts[sizeIdx].trim() : "0";
		const lastUpdated =
			updatedIdx >= 0 && parts[updatedIdx] ? parts[updatedIdx].trim() : "";
		const downloads =
			downloadsIdx >= 0 && parts[downloadsIdx]
				? Number.parseFloat(parts[downloadsIdx].trim()) || 0
				: 0;

		if (!packageName && !releaseName) continue;

		const sizeMb = Number.parseFloat(rawSize) || 0;
		let sizeFormatted = `${sizeMb} MB`;
		if (sizeMb >= 1024) {
			sizeFormatted = `${(sizeMb / 1024).toFixed(2)} GB`;
		}

		const md5Hash = computeReleaseHash(releaseName);
		const hasThumbnail =
			packageName &&
			fs.existsSync(path.join(thumbnailsDir, `${packageName}.jpg`));
		const hasNote =
			releaseName && fs.existsSync(path.join(notesDir, `${releaseName}.txt`));

		games.push({
			id: packageName || md5Hash,
			name,
			releaseName,
			packageName,
			versionCode,
			size: sizeFormatted,
			sizeMb,
			lastUpdated,
			downloads,
			md5Hash,
			hasThumbnail: Boolean(hasThumbnail),
			thumbnailUrl: hasThumbnail
				? `/api/repo/thumbnail?pkg=${encodeURIComponent(packageName)}`
				: undefined,
			hasNote: Boolean(hasNote),
		});
	}

	return games;
}

async function extract7zArchive(
	archivePath: string,
	outputDir: string,
	password?: string,
): Promise<void> {
	const bin = get7zaExecutable();
	const args = ["x", `-o${outputDir}`, "-y", "-bso0", "-bsp0"];
	if (password) {
		args.push(`-p${password}`);
	}
	args.push("--", archivePath);

	try {
		execFileSync(bin, args, { stdio: "pipe" });
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to extract 7z archive: ${msg}`);
	}
}

function prepareRepoRequest(
	baseUri: string,
	rawPassword?: string,
	proxyUrl?: string,
): { normalizedUri: string; decodedPassword?: string } {
	const baseCheck = validateUpstreamUrl(baseUri);
	if (!baseCheck.isValid) {
		throw new Error(`Invalid baseUri: ${baseCheck.error}`);
	}
	if (proxyUrl) {
		const proxyCheck = validateUpstreamUrl(proxyUrl);
		if (!proxyCheck.isValid) {
			throw new Error(`Invalid proxyUrl: ${proxyCheck.error}`);
		}
	}

	return {
		normalizedUri: baseUri.endsWith("/") ? baseUri : `${baseUri}/`,
		decodedPassword: decodeRepoPassword(rawPassword),
	};
}

export async function syncRepoMetadata(
	baseUri: string,
	rawPassword?: string,
	proxyUrl?: string,
): Promise<RepoGameInfo[]> {
	const { normalizedUri, decodedPassword } = prepareRepoRequest(
		baseUri,
		rawPassword,
		proxyUrl,
	);

	const targetUrl = proxyUrl
		? `${proxyUrl}${encodeURIComponent(`${normalizedUri}meta.7z`)}`
		: `${normalizedUri}meta.7z`;

	console.log(`[RepoSync] Fetching meta.7z from ${targetUrl}...`);

	await rateLimitDelay();
	const headers = getUpstreamHeaders(targetUrl);

	let response: globalThis.Response;
	try {
		response = await fetch(targetUrl, {
			headers,
			signal: AbortSignal.timeout(30000),
		});
	} catch (fetchErr: unknown) {
		const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
		throw new Error(`Could not connect to repository meta endpoint: ${msg}`);
	}

	if (!response.ok) {
		if (response.status === 403) {
			throw new Error(
				"Repository blocked the request (HTTP 403 / Cloudflare protection). Try using a proxy or manually import meta.7z.",
			);
		}
		throw new Error(
			`Repository returned HTTP ${response.status}: ${response.statusText}`,
		);
	}

	const arrayBuffer = await response.arrayBuffer();
	const metaArchiveFile = path.join(CACHE_DIR, "meta.7z");
	fs.writeFileSync(metaArchiveFile, Buffer.from(arrayBuffer));

	console.log(
		`[RepoSync] Downloaded meta.7z (${arrayBuffer.byteLength} bytes). Extracting...`,
	);

	await extract7zArchive(metaArchiveFile, CACHE_DIR, decodedPassword);

	const gameListFile = path.join(CACHE_DIR, "VRP-GameList.txt");
	if (!fs.existsSync(gameListFile)) {
		throw new Error(
			"VRP-GameList.txt was not found inside the extracted meta archive.",
		);
	}

	const content = fs.readFileSync(gameListFile, "utf-8");
	const games = parseGameListText(content);
	console.log(`[RepoSync] Successfully loaded ${games.length} games.`);
	return games;
}

export function importOfflineMeta(
	buffer: Buffer,
	filename: string,
	rawPassword?: string,
): RepoGameInfo[] {
	const decodedPassword = decodeRepoPassword(rawPassword);
	const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
	if (!safeFilename) {
		throw new Error("Invalid or empty filename.");
	}

	const safeCachePrefix = CACHE_DIR.endsWith(path.sep)
		? CACHE_DIR
		: CACHE_DIR + path.sep;
	const metaFile = path.resolve(CACHE_DIR, safeFilename);

	if (!metaFile.startsWith(safeCachePrefix)) {
		throw new Error("Path traversal detected in upload filename.");
	}

	if (safeFilename.endsWith(".7z")) {
		fs.writeFileSync(metaFile, buffer);
		try {
			extract7zArchive(metaFile, CACHE_DIR, decodedPassword);
		} finally {
			try {
				fs.unlinkSync(metaFile);
			} catch {}
		}
	} else if (safeFilename.endsWith(".txt")) {
		const gameListFile = path.join(CACHE_DIR, "VRP-GameList.txt");
		fs.writeFileSync(gameListFile, buffer);
	} else {
		throw new Error(
			"Unsupported file format. Please upload meta.7z or VRP-GameList.txt",
		);
	}

	return getCachedGames();
}

export function getCachedGames(): RepoGameInfo[] {
	const gameListFile = path.join(CACHE_DIR, "VRP-GameList.txt");
	if (!fs.existsSync(gameListFile)) {
		return [];
	}
	const content = fs.readFileSync(gameListFile, "utf-8");
	return parseGameListText(content);
}

export function getThumbnailPath(packageName: string): string | null {
	const sanitized = packageName.replace(/[^a-zA-Z0-9._-]/g, "");
	if (!sanitized || sanitized.includes("..")) return null;
	const thumbnailsDir = path.resolve(CACHE_DIR, ".meta", "thumbnails");
	const filePath = path.resolve(thumbnailsDir, `${sanitized}.jpg`);
	if (
		filePath.startsWith(thumbnailsDir + path.sep) &&
		fs.existsSync(filePath)
	) {
		return filePath;
	}
	return null;
}

export function getNoteContent(releaseName: string): string {
	const sanitized = releaseName
		.replace(/[/\\?%*:|"<>]/g, "")
		.replace(/\.\.+/g, "");
	if (!sanitized) return "";
	const notesDir = path.resolve(CACHE_DIR, ".meta", "notes");
	const filePath = path.resolve(notesDir, `${sanitized}.txt`);
	if (filePath.startsWith(notesDir + path.sep) && fs.existsSync(filePath)) {
		return fs.readFileSync(filePath, "utf-8");
	}
	return "";
}

/**
 * Downloads and prepares a game package from the repository endpoint.
 */
export async function downloadGamePackage(
	baseUri: string,
	releaseName: string,
	packageName: string,
	rawPassword?: string,
	proxyUrl?: string,
	onProgress?: (progress: number, stage: string) => void,
): Promise<{ apkFiles: string[]; obbDir: string | null; tempDir: string }> {
	const { normalizedUri, decodedPassword } = prepareRepoRequest(
		baseUri,
		rawPassword,
		proxyUrl,
	);
	const hash = computeReleaseHash(releaseName);

	const gameWorkDir = path.join(TEMP_DOWNLOAD_DIR, `${hash}_${Date.now()}`);
	fs.mkdirSync(gameWorkDir, { recursive: true });

	if (onProgress) onProgress(5, "Connecting to repository...");

	const downloadedParts: string[] = [];
	let partIndex = 1;
	let hasMoreParts = true;

	const singleUrl = proxyUrl
		? `${proxyUrl}${encodeURIComponent(`${normalizedUri}${hash}/${hash}.7z`)}`
		: `${normalizedUri}${hash}/${hash}.7z`;

	await rateLimitDelay();
	const singleHeaders = getUpstreamHeaders(singleUrl);
	const singleRes = await fetch(singleUrl, { headers: singleHeaders }).catch(
		() => null,
	);
	if (singleRes?.ok) {
		if (onProgress) onProgress(15, "Downloading game archive...");
		const partFile = path.join(gameWorkDir, `${hash}.7z`);
		const fileData = await singleRes.arrayBuffer();
		fs.writeFileSync(partFile, Buffer.from(fileData));
		downloadedParts.push(partFile);
	} else {
		while (hasMoreParts && partIndex <= 99) {
			const partSuffix = String(partIndex).padStart(3, "0");
			const partFilename = `${hash}.7z.${partSuffix}`;
			const partUrl = proxyUrl
				? `${proxyUrl}${encodeURIComponent(`${normalizedUri}${hash}/${partFilename}`)}`
				: `${normalizedUri}${hash}/${partFilename}`;

			if (onProgress)
				onProgress(
					Math.min(10 + partIndex * 15, 60),
					`Downloading part ${partIndex}...`,
				);

			await rateLimitDelay();
			const partHeaders = getUpstreamHeaders(partUrl);
			const partRes = await fetch(partUrl, { headers: partHeaders }).catch(
				() => null,
			);
			if (partRes?.ok) {
				const partData = await partRes.arrayBuffer();
				const partFile = path.join(gameWorkDir, partFilename);
				fs.writeFileSync(partFile, Buffer.from(partData));
				downloadedParts.push(partFile);
				partIndex++;
			} else {
				hasMoreParts = false;
			}
		}
	}

	if (downloadedParts.length === 0) {
		throw new Error(
			`Could not locate downloadable archive for ${releaseName} (hash: ${hash}) at ${normalizedUri}`,
		);
	}

	if (onProgress) onProgress(70, "Extracting game package...");

	const extractedDir = path.join(gameWorkDir, "extracted");
	fs.mkdirSync(extractedDir, { recursive: true });

	await extract7zArchive(downloadedParts[0], extractedDir, decodedPassword);

	if (onProgress) onProgress(85, "Organizing installation binaries...");

	const apkFiles: string[] = [];
	let obbDir: string | null = null;

	function scanDirectory(dir: string) {
		const items = fs.readdirSync(dir, { withFileTypes: true });
		for (const item of items) {
			const full = path.join(dir, item.name);
			if (item.isDirectory()) {
				if (item.name === packageName) {
					obbDir = full;
				} else {
					scanDirectory(full);
				}
			} else if (item.name.toLowerCase().endsWith(".apk")) {
				apkFiles.push(full);
			}
		}
	}

	scanDirectory(extractedDir);

	if (apkFiles.length === 0) {
		throw new Error("No APK files found inside extracted archive.");
	}

	return {
		apkFiles,
		obbDir,
		tempDir: gameWorkDir,
	};
}

export async function uploadExtractedPackage(
	packageName: string,
	releaseName: string,
	zipBuffer: Buffer,
): Promise<{ success: boolean; message: string }> {
	if (!REPO_UPLOAD_URL) {
		throw new Error(
			"REPO_UPLOAD_URL is not configured on the server environment (.env).",
		);
	}
	const uploadCheck = validateUpstreamUrl(REPO_UPLOAD_URL);
	if (!uploadCheck.isValid) {
		throw new Error(`Invalid REPO_UPLOAD_URL: ${uploadCheck.error}`);
	}

	const formData = new FormData();
	const fileBlob = new Blob([zipBuffer as unknown as BlobPart], {
		type: "application/zip",
	});
	formData.append("file", fileBlob, `${packageName}.zip`);
	formData.append("packageName", packageName);
	formData.append("releaseName", releaseName);

	const headers = getUpstreamHeaders(REPO_UPLOAD_URL);
	delete headers.Accept; // Let fetch set boundary for multipart

	const response = await fetch(REPO_UPLOAD_URL, {
		method: "POST",
		headers,
		body: formData,
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(
			`Upstream upload failed with HTTP ${response.status}: ${text || response.statusText}`,
		);
	}

	return {
		success: true,
		message: "Package successfully submitted to repository upstream!",
	};
}
