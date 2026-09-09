import { describe, expect, it } from "bun:test";
import {
	escapeShellArg,
	isValidPackageName,
	sanitizePathSegment,
} from "./shell-helpers";

describe("shell-helpers", () => {
	describe("escapeShellArg", () => {
		it("handles empty string", () => {
			expect(escapeShellArg("")).toBe("''");
		});

		it("wraps normal string in single quotes", () => {
			expect(escapeShellArg("hello")).toBe("'hello'");
			expect(escapeShellArg("/sdcard/Android/obb")).toBe(
				"'/sdcard/Android/obb'",
			);
		});

		it("escapes single quotes correctly", () => {
			expect(escapeShellArg("it's a test")).toBe("'it'\\''s a test'");
		});

		it("safely neutralizes shell injection payloads", () => {
			const payload = 'com.test"; rm -rf /sdcard; echo "pwned';
			const escaped = escapeShellArg(payload);
			expect(escaped).toBe("'com.test\"; rm -rf /sdcard; echo \"pwned'");
		});

		it("safely neutralizes backticks and subshells", () => {
			const payload = "test`reboot`$(rm -rf /)";
			const escaped = escapeShellArg(payload);
			expect(escaped).toBe("'test`reboot`$(rm -rf /)'");
		});
	});

	describe("isValidPackageName", () => {
		it("accepts valid Android package names", () => {
			expect(isValidPackageName("com.example.app")).toBe(true);
			expect(isValidPackageName("org.videolan.vlc")).toBe(true);
			expect(isValidPackageName("com.meta.quest_vr")).toBe(true);
			expect(isValidPackageName("a.b")).toBe(true);
		});

		it("rejects invalid package names with malicious characters", () => {
			expect(isValidPackageName("com.example;rm -rf /")).toBe(false);
			expect(isValidPackageName("com.example/app")).toBe(false);
			expect(isValidPackageName("com.example$(id)")).toBe(false);
			expect(isValidPackageName("com.example`reboot`")).toBe(false);
			expect(isValidPackageName('com.example.app"')).toBe(false);
			expect(isValidPackageName("..")).toBe(false);
			expect(isValidPackageName("")).toBe(false);
			expect(isValidPackageName("singlepart")).toBe(false);
			expect(isValidPackageName(".leading.dot")).toBe(false);
			expect(isValidPackageName("1starting.with.number")).toBe(false);
		});
	});

	describe("sanitizePathSegment", () => {
		it("leaves normal filenames unchanged", () => {
			expect(sanitizePathSegment("main.1234.com.game.obb")).toBe(
				"main.1234.com.game.obb",
			);
		});

		it("removes directory traversal and slashes", () => {
			expect(sanitizePathSegment("../../evil.obb")).toBe("evil.obb");
			expect(sanitizePathSegment("..\\..\\evil.obb")).toBe("evil.obb");
		});

		it("strips null bytes", () => {
			expect(sanitizePathSegment("file\0name.apk")).toBe("filename.apk");
		});
	});
});
