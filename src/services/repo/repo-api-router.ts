import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
	downloadGamePackage,
	get7zaExecutable,
	getCachedGames,
	getNoteContent,
	getThumbnailPath,
	importOfflineMeta,
	syncRepoMetadata,
	uploadExtractedPackage,
} from "./repo-backend";

function getCorsHeaders(req: Request): Record<string, string> {
	const origin = req.headers.get("origin");
	const host = req.headers.get("host") || "";

	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		Vary: "Origin",
	};

	if (!origin) {
		return headers;
	}

	try {
		const originUrl = new URL(origin);
		const isSameHost = originUrl.host.toLowerCase() === host.toLowerCase();
		const isLocalhost =
			originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1";

		if (isSameHost || isLocalhost) {
			headers["Access-Control-Allow-Origin"] = origin;
		}
	} catch {}

	return headers;
}

export async function handleRepoApi(req: Request): Promise<Response | null> {
	const url = new URL(req.url);
	const pathname = url.pathname;

	if (!pathname.startsWith("/api/repo/")) {
		return null;
	}

	const corsHeaders = getCorsHeaders(req);

	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders });
	}

	const origin = req.headers.get("origin");
	if (
		origin &&
		req.method !== "GET" &&
		req.method !== "HEAD" &&
		!corsHeaders["Access-Control-Allow-Origin"]
	) {
		return new Response("Cross-origin request forbidden", {
			status: 403,
			headers: { "Content-Type": "text/plain" },
		});
	}

	try {
		if (pathname === "/api/repo/sync" && req.method === "POST") {
			const body = (await req.json()) as {
				baseUri?: string;
				password?: string;
				proxyUrl?: string;
			};

			if (!body.baseUri) {
				return Response.json(
					{ success: false, error: "Missing required 'baseUri' field." },
					{ status: 400, headers: corsHeaders },
				);
			}

			const games = await syncRepoMetadata(
				body.baseUri,
				body.password,
				body.proxyUrl,
			);
			return Response.json(
				{ success: true, games, count: games.length },
				{ headers: corsHeaders },
			);
		}

		if (pathname === "/api/repo/games" && req.method === "GET") {
			const games = getCachedGames();
			return Response.json(
				{ success: true, games, count: games.length },
				{ headers: corsHeaders },
			);
		}

		if (pathname === "/api/repo/import-meta" && req.method === "POST") {
			const formData = await req.formData();
			const file = formData.get("file") as File | null;
			const password = (formData.get("password") as string | null) || undefined;

			if (!file) {
				return Response.json(
					{ success: false, error: "Missing file payload in request." },
					{ status: 400, headers: corsHeaders },
				);
			}

			const arrayBuffer = await file.arrayBuffer();
			const games = importOfflineMeta(
				Buffer.from(arrayBuffer),
				file.name,
				password,
			);
			return Response.json(
				{ success: true, games, count: games.length },
				{ headers: corsHeaders },
			);
		}

		if (pathname === "/api/repo/thumbnail" && req.method === "GET") {
			const pkg = url.searchParams.get("pkg");
			if (!pkg) {
				return new Response("Missing pkg query param", {
					status: 400,
					headers: corsHeaders,
				});
			}

			const thumbPath = getThumbnailPath(pkg);
			if (!thumbPath) {
				return new Response("Thumbnail not found", {
					status: 404,
					headers: corsHeaders,
				});
			}

			const fileBuffer = fs.readFileSync(thumbPath);
			return new Response(fileBuffer, {
				status: 200,
				headers: {
					...corsHeaders,
					"Content-Type": "image/jpeg",
					"Cache-Control": "public, max-age=86400",
				},
			});
		}

		if (pathname === "/api/repo/note" && req.method === "GET") {
			const release = url.searchParams.get("release");
			if (!release) {
				return Response.json(
					{ success: false, error: "Missing release param" },
					{ status: 400, headers: corsHeaders },
				);
			}

			const note = getNoteContent(release);
			return Response.json({ success: true, note }, { headers: corsHeaders });
		}

		if (pathname === "/api/repo/download" && req.method === "POST") {
			const body = (await req.json()) as {
				baseUri?: string;
				password?: string;
				releaseName?: string;
				packageName?: string;
				proxyUrl?: string;
			};

			if (!body.baseUri || !body.releaseName || !body.packageName) {
				return Response.json(
					{
						success: false,
						error: "Missing baseUri, releaseName, or packageName",
					},
					{ status: 400, headers: corsHeaders },
				);
			}

			const result = await downloadGamePackage(
				body.baseUri,
				body.releaseName,
				body.packageName,
				body.password,
				body.proxyUrl,
			);

			const safeReleaseName = path
				.basename(body.releaseName)
				.replace(/[^a-zA-Z0-9._-]/g, "_");
			if (!safeReleaseName) {
				return Response.json(
					{ success: false, error: "Invalid releaseName parameter" },
					{ status: 400, headers: corsHeaders },
				);
			}

			const zipFile = path.join(result.tempDir, `${safeReleaseName}.zip`);
			const bin = get7zaExecutable();
			const zipArgs = ["a", "-tzip", "--", zipFile, ...result.apkFiles];
			if (result.obbDir) {
				zipArgs.push(result.obbDir);
			}

			execFileSync(bin, zipArgs, { stdio: "ignore" });

			const cleanup = () => {
				try {
					fs.rmSync(result.tempDir, { recursive: true, force: true });
				} catch {}
			};

			const stream = Bun.file(zipFile)
				.stream()
				.pipeThrough(
					new TransformStream({
						flush: cleanup,
					}),
				);

			return new Response(stream, {
				status: 200,
				headers: {
					...corsHeaders,
					"Content-Type": "application/zip",
					"Content-Disposition": `attachment; filename="${encodeURIComponent(safeReleaseName)}.zip"`,
				},
			});
		}

		if (pathname === "/api/repo/upload" && req.method === "POST") {
			const formData = await req.formData();
			const file = formData.get("file") as File | null;
			const packageName = (formData.get("packageName") as string | null) || "";
			const releaseName =
				(formData.get("releaseName") as string | null) || packageName;

			if (!file || !packageName) {
				return Response.json(
					{ success: false, error: "Missing file or packageName payload." },
					{ status: 400, headers: corsHeaders },
				);
			}

			const arrayBuffer = await file.arrayBuffer();
			const result = await uploadExtractedPackage(
				packageName,
				releaseName,
				Buffer.from(arrayBuffer),
			);

			return Response.json(
				{ success: true, message: result.message },
				{ headers: corsHeaders },
			);
		}

		return new Response("Endpoint Not Found", {
			status: 404,
			headers: corsHeaders,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[RepoApi Error] ${pathname}:`, message);
		return Response.json(
			{ success: false, error: message },
			{ status: 500, headers: corsHeaders },
		);
	}
}
