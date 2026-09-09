function isPrivateIp(rawIp: string): boolean {
	const ip = rawIp.replace(/^\[|\]$/g, "").toLowerCase();
	const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (m) {
		const [b0, b1] = [Number(m[1]), Number(m[2])];
		return (
			b0 === 0 ||
			b0 === 10 ||
			b0 === 127 ||
			(b0 === 100 && b1 >= 64 && b1 <= 127) ||
			(b0 === 169 && b1 === 254) ||
			(b0 === 172 && b1 >= 16 && b1 <= 31) ||
			(b0 === 192 && b1 === 168) ||
			b0 >= 224
		);
	}
	return (
		ip === "::1" ||
		ip === "::" ||
		(ip.includes(":") &&
			(/^f[cd][0-9a-f]{2}:/i.test(ip) ||
				/^fe[89ab][0-9a-f]:/i.test(ip) ||
				ip.startsWith("::ffff:")))
	);
}

/**
 * Validates a user-provided URL to mitigate SSRF (Server-Side Request Forgery).
 */
export function validateUpstreamUrl(urlStr: string): {
	isValid: boolean;
	error?: string;
} {
	if (!urlStr || typeof urlStr !== "string") {
		return { isValid: false, error: "URL cannot be empty." };
	}

	let parsed: URL;
	try {
		parsed = new URL(urlStr.trim());
	} catch {
		return { isValid: false, error: "Malformed URL format." };
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return {
			isValid: false,
			error: `Unsupported protocol: ${parsed.protocol}. Only http and https are allowed.`,
		};
	}

	const hostname = parsed.hostname.toLowerCase();
	if (!hostname) {
		return { isValid: false, error: "URL missing hostname." };
	}

	if (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname.endsWith(".local") ||
		hostname.endsWith(".internal")
	) {
		return {
			isValid: false,
			error: `Access to local/internal host '${hostname}' is forbidden.`,
		};
	}

	if (isPrivateIp(hostname)) {
		return {
			isValid: false,
			error: `Access to private/reserved IP address '${hostname}' is forbidden.`,
		};
	}

	return { isValid: true };
}

/**
 * Checks if a target URL host matches an explicit allowlist of trusted upstream repository hosts.
 */
export function isTrustedUpstreamHost(
	urlStr: string,
	allowedHostsList: string[] = [],
): boolean {
	try {
		const targetHost = new URL(urlStr).hostname.toLowerCase();
		if (!targetHost) return false;

		const allowed = [...allowedHostsList];
		const uploadUrl = process.env.REPO_UPLOAD_URL?.trim();
		if (uploadUrl) {
			try {
				allowed.push(new URL(uploadUrl).hostname.toLowerCase());
			} catch {}
		}
		const envAllowed = process.env.ALLOWED_REPO_HOSTS?.trim();
		if (envAllowed) {
			allowed.push(...envAllowed.split(",").map((h) => h.trim().toLowerCase()));
		}

		return allowed.some(
			(host) =>
				host && (targetHost === host || targetHost.endsWith(`.${host}`)),
		);
	} catch {
		return false;
	}
}
