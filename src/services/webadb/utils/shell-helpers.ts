/**
 * Utilities for sanitizing and escaping arguments passed to Android ADB shell commands.
 */

/**
 * Escapes an arbitrary string for safe inclusion as a single argument
 * in a POSIX / Android shell command.
 *
 * Uses standard POSIX single-quote escaping: wraps the string in single quotes
 * and replaces internal single quotes with '\'' (closing the quote, escaping a single quote,
 * and reopening the quote).
 */
export function escapeShellArg(arg: string): string {
	if (arg.length === 0) {
		return "''";
	}
	return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Validates that a string conforms to standard Android package naming conventions:
 * - Must contain at least two period-separated segments.
 * - Each segment must start with an ASCII letter and contain only letters, numbers, or underscores.
 */
export function isValidPackageName(name: string): boolean {
	if (!name || name.length > 255) return false;
	return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(name);
}

/**
 * Sanitizes a path component (such as a filename or folder name) to prevent
 * directory traversal attacks or unexpected shell characters.
 */
export function sanitizePathSegment(segment: string): string {
	if (!segment) return "";
	// Strip null bytes, path separators, and leading dots
	return segment
		.replace(/[\0/\\]/g, "")
		.replace(/^\.+/, "")
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.trim();
}
