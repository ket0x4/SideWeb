import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { handleRepoApi } from "./src/services/repo/repo-api-router";

function repoApiPlugin(): Plugin {
	return {
		name: "repo-api-plugin",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (!req.url?.startsWith("/api/repo/")) {
					return next();
				}

				const protocol = "http";
				const host = req.headers.host || "localhost:3000";
				const fullUrl = `${protocol}://${host}${req.url}`;

				let body: Buffer | undefined;
				if (req.method !== "GET" && req.method !== "HEAD") {
					const chunks: Uint8Array[] = [];
					for await (const chunk of req) {
						chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
					}
					body = Buffer.concat(chunks);
				}

				const webReq = new Request(fullUrl, {
					method: req.method,
					headers: req.headers as HeadersInit,
					body: body ? new Uint8Array(body) : undefined,
				});

				try {
					const webRes = await handleRepoApi(webReq);
					if (!webRes) return next();

					res.statusCode = webRes.status;
					webRes.headers.forEach((value, key) => {
						res.setHeader(key, value);
					});

					const resBody = await webRes.arrayBuffer();
					res.end(Buffer.from(resBody));
				} catch (e) {
					console.error("Vite Repo API error:", e);
					res.statusCode = 500;
					res.end(JSON.stringify({ success: false, error: String(e) }));
				}
			});
		},
	};
}

export default defineConfig({
	plugins: [react(), tailwindcss(), repoApiPlugin()],
	server: {
		port: 3000,
		host: true,
	},
	build: {
		target: "esnext",
	},
	optimizeDeps: {
		esbuildOptions: {
			target: "esnext",
		},
	},
});
