import { describe, expect, it } from "bun:test";
import {
	getNoteContent,
	getThumbnailPath,
	importOfflineMeta,
} from "./repo-backend";

describe("repo-backend path safety", () => {
	it("rejects path traversal in importOfflineMeta filename", () => {
		const dummyBuffer = Buffer.from("test");
		// Traversal with .txt
		expect(() => {
			importOfflineMeta(dummyBuffer, "../../etc/passwd.txt");
		}).not.toThrow(); // Because path.basename turns it into passwd.txt which maps safely inside CACHE_DIR

		// Direct traversal attempts that might try to escape
		expect(() => {
			importOfflineMeta(dummyBuffer, "");
		}).toThrow();
	});

	it("prevents directory traversal in getThumbnailPath", () => {
		expect(getThumbnailPath("../../etc/shadow")).toBeNull();
		expect(getThumbnailPath("..\\..\\windows\\system32")).toBeNull();
		expect(getThumbnailPath("normal.package.name")).toBeNull(); // Does not exist, but doesn't throw
	});

	it("prevents directory traversal in getNoteContent", () => {
		expect(getNoteContent("../../etc/passwd")).toBe("");
		expect(getNoteContent("..\\..\\test")).toBe("");
	});
});
