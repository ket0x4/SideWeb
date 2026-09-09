export interface BrowserSupportInfo {
	/** Whether the browser is Chrome or Chromium-based */
	isChromium: boolean;
	/** Whether the navigator.usb (WebUSB) API is supported and available */
	isWebUsbSupported: boolean;
	/** Human-readable classification ("Chromium" or "Non-Chromium") */
	browserName: string;
	/** Whether the page is running in a secure context (required for WebUSB) */
	isSecureContext: boolean;
}

export interface BrowserDetectionOptions {
	userAgent?: string;
	userAgentData?: {
		brands?: Array<{ brand: string; version?: string }>;
	};
	hasWebUsb?: boolean;
	isSecureContext?: boolean;
}

/**
 * Checks whether the current environment is a Chromium-based browser.
 */
export function isChromiumBrowser(options?: BrowserDetectionOptions): boolean {
	const ua =
		options?.userAgent ??
		(typeof navigator !== "undefined" ? navigator.userAgent : "");

	const brands =
		options?.userAgentData?.brands ??
		(typeof navigator !== "undefined" && "userAgentData" in navigator
			? (
					navigator as unknown as {
						userAgentData?: { brands?: Array<{ brand: string }> };
					}
				).userAgentData?.brands
			: undefined);

	if (brands?.some((b) => /Chromium/i.test(b.brand))) {
		return true;
	}

	return /Chrome\/|Chromium\//i.test(ua) && !/CriOS/i.test(ua);
}

/**
 * Detects whether the current environment is a Chromium-based browser
 * and whether WebUSB is supported.
 */
export function detectBrowser(
	options?: BrowserDetectionOptions,
): BrowserSupportInfo {
	const isChromium = isChromiumBrowser(options);

	const isWebUsbSupported =
		options?.hasWebUsb ??
		(typeof navigator !== "undefined" &&
			"usb" in navigator &&
			Boolean(navigator.usb));

	const isSecureContext =
		options?.isSecureContext ??
		(typeof window !== "undefined" ? Boolean(window.isSecureContext) : true);

	return {
		isChromium,
		isWebUsbSupported,
		browserName: isChromium ? "Chromium" : "Non-Chromium",
		isSecureContext,
	};
}
