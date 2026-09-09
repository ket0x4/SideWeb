import path from "node:path";

import { handleRepoApi } from "./src/services/repo/repo-api-router";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "127.0.0.1";
const DIST_DIR = path.resolve(
	import.meta.dir.endsWith("dist")
		? import.meta.dir
		: path.join(import.meta.dir, "dist"),
);
const INDEX_FILE = path.join(DIST_DIR, "index.html");

const server = Bun.serve({
	port: PORT,
	hostname: HOST,
	async fetch(req) {
		const startTime = Date.now();
		const url = new URL(req.url);

		if (url.pathname.startsWith("/api/repo/")) {
			const apiRes = await handleRepoApi(req);
			if (apiRes) return apiRes;
		}

		if (req.method !== "GET" && req.method !== "HEAD") {
			return new Response("Method Not Allowed", {
				status: 405,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			});
		}

		if (url.pathname === "/healthz" || url.pathname === "/health") {
			return new Response("OK", {
				status: 200,
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"X-Content-Type-Options": "nosniff",
					"X-Frame-Options": "SAMEORIGIN",
					"Referrer-Policy": "strict-origin-when-cross-origin",
				},
			});
		}

		let pathname: string;
		try {
			pathname = decodeURIComponent(url.pathname);
		} catch {
			return new Response("Bad Request", {
				status: 400,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			});
		}

		if (pathname.endsWith("/")) {
			pathname += "index.html";
		}

		const safeDistPrefix = DIST_DIR.endsWith(path.sep)
			? DIST_DIR
			: DIST_DIR + path.sep;
		let targetPath = path.resolve(DIST_DIR, `.${pathname}`);

		if (targetPath !== DIST_DIR && !targetPath.startsWith(safeDistPrefix)) {
			return new Response("Forbidden", {
				status: 403,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			});
		}

		let file = Bun.file(targetPath);
		let isSpaFallback = false;

		if (!(await file.exists())) {
			if (path.extname(pathname)) {
				return new Response("Not Found", {
					status: 404,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}

			targetPath = INDEX_FILE;
			file = Bun.file(INDEX_FILE);
			isSpaFallback = true;
		}

		if (!(await file.exists())) {
			return new Response("Not Found", {
				status: 404,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			});
		}

		const headers = new Headers();
		headers.set("X-Content-Type-Options", "nosniff");
		headers.set("X-Frame-Options", "SAMEORIGIN");
		headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		headers.set("Permissions-Policy", "usb=(self)");
		headers.set(
			"Content-Security-Policy",
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https:;",
		);

		if (isSpaFallback || pathname === "/" || pathname === "/index.html") {
			headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
			headers.set("Pragma", "no-cache");
			headers.set("Expires", "0");
		} else if (pathname.startsWith("/assets/")) {
			headers.set("Cache-Control", "public, max-age=31536000, immutable");
		} else {
			headers.set("Cache-Control", "public, max-age=3600");
		}

		const res = new Response(req.method === "HEAD" ? null : file, {
			status: 200,
			headers,
		});

		const duration = Date.now() - startTime;
		console.log(
			`[${new Date().toISOString()}] ${req.method} ${url.pathname} -> 200 (${duration}ms)`,
		);

		return res;
	},
});

console.log(`SideWeb Bun server listening on http://${HOST}:${PORT}`);

const handleShutdown = (signal: string) => {
	console.log(`Received ${signal}. Shutting down gracefully...`);
	server.stop(true);
	process.exit(0);
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
