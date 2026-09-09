import { describe, expect, it } from "bun:test";
import { handleRepoApi } from "./repo-api-router";

describe("repo-api-router security", () => {
	it("allows same-origin / localhost OPTIONS preflight", async () => {
		const req = new Request("http://localhost:3000/api/repo/games", {
			method: "OPTIONS",
			headers: {
				origin: "http://localhost:3000",
				host: "localhost:3000",
			},
		});
		const res = await handleRepoApi(req);
		expect(res).not.toBeNull();
		expect(res?.status).toBe(204);
		expect(res?.headers.get("Access-Control-Allow-Origin")).toBe(
			"http://localhost:3000",
		);
	});

	it("blocks untrusted cross-origin POST requests", async () => {
		const req = new Request("http://localhost:3000/api/repo/sync", {
			method: "POST",
			headers: {
				origin: "https://evil-attacker.com",
				host: "localhost:3000",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ baseUri: "https://example.com" }),
		});
		const res = await handleRepoApi(req);
		expect(res).not.toBeNull();
		expect(res?.status).toBe(403);
	});

	it("rejects SSRF payloads in sync endpoint", async () => {
		const req = new Request("http://localhost:3000/api/repo/sync", {
			method: "POST",
			headers: {
				host: "localhost:3000",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ baseUri: "http://169.254.169.254/" }),
		});
		const res = await handleRepoApi(req);
		expect(res).not.toBeNull();
		const body = await res?.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain("Access to private/reserved IP address");
	});
});
