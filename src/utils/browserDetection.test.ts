import { describe, expect, it } from "bun:test";
import { detectBrowser, isChromiumBrowser } from "./browserDetection";

describe("browserDetection", () => {
	const cases: Array<
		[string, { ua: string; brands?: string[]; usb?: boolean }, boolean, boolean]
	> = [
		[
			"Mozilla Firefox",
			{ ua: "rv:124.0 Gecko/20100101 Firefox/124.0" },
			false,
			false,
		],
		["Apple Safari", { ua: "Version/17.4.1 Safari/605.1.15" }, false, false],
		[
			"Chrome for iOS",
			{ ua: "CriOS/123.0.6312.52 Mobile/15E148" },
			false,
			false,
		],
		[
			"Google Chrome",
			{
				ua: "Mozilla/5.0 Chrome/123.0 Safari/537.36",
				brands: ["Google Chrome", "Chromium"],
				usb: true,
			},
			true,
			true,
		],
		[
			"Microsoft Edge",
			{
				ua: "Mozilla/5.0 Chrome/123.0 Edg/123.0",
				brands: ["Microsoft Edge", "Chromium"],
				usb: true,
			},
			true,
			true,
		],
		[
			"Brave",
			{
				ua: "Mozilla/5.0 Chrome/123.0 Safari/537.36",
				brands: ["Chromium", "Brave"],
				usb: true,
			},
			true,
			true,
		],
		[
			"Generic Chromium UA without Client Hints",
			{ ua: "Mozilla/5.0 Chromium/123.0", usb: true },
			true,
			true,
		],
	];

	for (const [name, cfg, expectedChromium, expectedWebUsb] of cases) {
		it(`detects ${name}`, () => {
			const options = {
				userAgent: cfg.ua,
				userAgentData: cfg.brands
					? { brands: cfg.brands.map((b) => ({ brand: b, version: "1" })) }
					: undefined,
				hasWebUsb: cfg.usb ?? false,
			};

			expect(isChromiumBrowser(options)).toBe(expectedChromium);

			const res = detectBrowser(options);
			expect(res).toMatchObject({
				isChromium: expectedChromium,
				isWebUsbSupported: expectedWebUsb,
				browserName: expectedChromium ? "Chromium" : "Non-Chromium",
			});
		});
	}
});
