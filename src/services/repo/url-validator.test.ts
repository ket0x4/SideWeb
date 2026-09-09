import { describe, expect, it } from "bun:test";
import { isTrustedUpstreamHost, validateUpstreamUrl } from "./url-validator";

describe("url-validator", () => {
	describe("validateUpstreamUrl", () => {
		it("accepts valid public HTTP and HTTPS URLs", () => {
			expect(validateUpstreamUrl("https://example.com/repo/").isValid).toBe(
				true,
			);
			expect(
				validateUpstreamUrl("http://cdn.somerepo.org:8080/files/").isValid,
			).toBe(true);
			expect(validateUpstreamUrl("https://8.8.8.8/meta.7z").isValid).toBe(true);
		});

		it("rejects non-HTTP protocols", () => {
			expect(validateUpstreamUrl("file:///etc/passwd").isValid).toBe(false);
			expect(validateUpstreamUrl("gopher://127.0.0.1/").isValid).toBe(false);
			expect(validateUpstreamUrl("ftp://example.com/").isValid).toBe(false);
			expect(validateUpstreamUrl("javascript:alert(1)").isValid).toBe(false);
		});

		it("blocks loopback addresses", () => {
			expect(validateUpstreamUrl("http://localhost:3000/").isValid).toBe(false);
			expect(validateUpstreamUrl("http://127.0.0.1/").isValid).toBe(false);
			expect(validateUpstreamUrl("http://127.0.0.2:8080/").isValid).toBe(false);
			expect(validateUpstreamUrl("http://[::1]/").isValid).toBe(false);
			expect(validateUpstreamUrl("http://sub.localhost/").isValid).toBe(false);
		});

		it("blocks private RFC 1918 subnets", () => {
			expect(validateUpstreamUrl("http://10.0.0.1/").isValid).toBe(false);
			expect(validateUpstreamUrl("http://172.16.0.5/").isValid).toBe(false);
			expect(validateUpstreamUrl("http://172.31.255.255/").isValid).toBe(false);
			expect(validateUpstreamUrl("http://192.168.1.1/").isValid).toBe(false);
		});

		it("blocks cloud metadata link-local IP", () => {
			expect(
				validateUpstreamUrl("http://169.254.169.254/latest/meta-data/").isValid,
			).toBe(false);
		});

		it("blocks local domain names", () => {
			expect(validateUpstreamUrl("http://server.local/").isValid).toBe(false);
			expect(validateUpstreamUrl("http://database.internal/").isValid).toBe(
				false,
			);
		});
	});

	describe("isTrustedUpstreamHost", () => {
		it("returns true when target matches allowed list", () => {
			expect(
				isTrustedUpstreamHost("https://trusted.repo.com/meta.7z", [
					"trusted.repo.com",
				]),
			).toBe(true);
			expect(
				isTrustedUpstreamHost("https://sub.trusted.repo.com/meta.7z", [
					"trusted.repo.com",
				]),
			).toBe(true);
		});

		it("returns false for untrusted third party", () => {
			expect(
				isTrustedUpstreamHost("https://attacker.com/meta.7z", [
					"trusted.repo.com",
				]),
			).toBe(false);
		});

		it("returns false when no allowed list is provided", () => {
			expect(isTrustedUpstreamHost("https://random.com/meta.7z")).toBe(false);
		});
	});
});
