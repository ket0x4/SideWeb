import {
	AlertTriangle,
	ExternalLink,
	HelpCircle,
	Laptop,
	X,
} from "lucide-react";
import type React from "react";
import type { BrowserSupportInfo } from "../../utils/browserDetection";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface BrowserWarningBannerProps {
	browserInfo: BrowserSupportInfo;
	onOpenTroubleshooter?: () => void;
	onDismiss?: () => void;
	className?: string;
}

const RECOMMENDED_BROWSERS = [
	{ name: "Google Chrome", url: "https://www.google.com/chrome/" },
	{ name: "Microsoft Edge", url: "https://www.microsoft.com/edge" },
	{ name: "Brave", url: "https://brave.com/" },
	{ name: "Opera", url: "https://www.opera.com/" },
];

export const BrowserWarningBanner: React.FC<BrowserWarningBannerProps> = ({
	browserInfo,
	onOpenTroubleshooter,
	onDismiss,
	className = "",
}) => {
	if (browserInfo.isChromium && browserInfo.isWebUsbSupported) {
		return null;
	}

	const isNonChromium = !browserInfo.isChromium;

	return (
		<div
			role="alert"
			aria-live="assertive"
			className={`relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 text-primary backdrop-blur-sm transition-all shadow-sm ${className}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-3 sm:gap-3.5">
					<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
						<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
					</div>

					<div className="space-y-2">
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-xs sm:text-sm font-bold tracking-tight text-primary">
									WebUSB Not Supported by this Browser
								</h3>
								<Badge
									variant="warning"
									className="text-[10px] font-mono py-0 px-1.5"
								>
									Non-Chromium Browser
								</Badge>
							</div>

							<p className="mt-1 text-xs text-secondary leading-relaxed">
								{isNonChromium ? (
									<>
										SideWeb requires the <strong>WebUSB API</strong> to
										communicate directly with your Meta Quest 3 headset. WebUSB
										is <strong>not supported by non-Chromium browsers</strong>{" "}
										(including Mozilla Firefox and Apple Safari).
									</>
								) : (
									<>
										The <strong>WebUSB API</strong> is unavailable in this
										browser session. Ensure you are accessing SideWeb in a
										secure context (HTTPS or localhost) and that USB device
										permissions are allowed.
									</>
								)}
							</p>
						</div>

						<div className="pt-1">
							<div className="flex items-center gap-1.5 text-[11px] font-medium text-secondary mb-1.5">
								<Laptop className="w-3.5 h-3.5 text-muted shrink-0" />
								<span>Recommended Chromium-based browsers:</span>
							</div>

							<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
								{RECOMMENDED_BROWSERS.map((browser) => (
									<a
										key={browser.name}
										href={browser.url}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-card border border-subtle hover:border-hover hover:text-primary text-secondary transition-colors"
									>
										<span>{browser.name}</span>
										<ExternalLink className="w-2.5 h-2.5 opacity-60" />
									</a>
								))}
							</div>
						</div>

						{onOpenTroubleshooter && (
							<div className="pt-1 flex items-center gap-2">
								<Button
									variant="secondary"
									size="sm"
									onClick={onOpenTroubleshooter}
									leftIcon={
										<HelpCircle className="w-3.5 h-3.5 text-amber-400" />
									}
									className="text-xs h-7 px-2.5 border-amber-500/30 hover:border-amber-500/50"
								>
									Connection Troubleshooter
								</Button>
							</div>
						)}
					</div>
				</div>

				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						className="p-1 rounded-md text-muted hover:text-primary hover:bg-elevated transition-colors shrink-0"
						aria-label="Dismiss unsupported browser warning"
						title="Dismiss warning"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
};
