import { AlertTriangle, Cable, Monitor, ShieldAlert, Usb } from "lucide-react";
import type React from "react";
import type { AdbConnectionStatus } from "../types/adb";
import { detectBrowser } from "../utils/browserDetection";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface ConnectionTroubleshooterProps {
	status: AdbConnectionStatus;
	onRetry: () => void;
	onClose?: () => void;
}

export const ConnectionTroubleshooter: React.FC<
	ConnectionTroubleshooterProps
> = ({ status, onRetry, onClose }) => {
	const isUnauthorized = status === "unauthorized";
	const browserInfo = detectBrowser();
	const isUnsupportedBrowser =
		!browserInfo.isChromium || !browserInfo.isWebUsbSupported;

	return (
		<Card
			className={`my-3 sm:my-4 p-4 sm:p-5 border ${
				isUnauthorized
					? "border-amber-500/50 bg-surface"
					: "border-default bg-surface"
			}`}
		>
			<div className="flex items-start sm:items-center justify-between gap-3 mb-3">
				<div className="flex items-center gap-2 sm:gap-2.5">
					<AlertTriangle
						className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isUnauthorized ? "text-amber-500" : "text-red-500"}`}
					/>
					<h3 className="text-xs sm:text-sm font-semibold tracking-tight text-primary">
						{isUnauthorized
							? "Action Required: Allow USB Debugging Prompt"
							: "Connection Diagnostic & Troubleshooting"}
					</h3>
				</div>

				{onClose && (
					<Button
						variant="secondary"
						size="sm"
						onClick={onClose}
						className="h-6 text-[11px] px-2 shrink-0"
					>
						Dismiss
					</Button>
				)}
			</div>

			<p className="text-xs text-secondary leading-relaxed mb-4">
				{isUnauthorized
					? "WebADB has established a raw USB channel, but your Meta Quest 3 headset requires RSA key authorization before allowing app installation or file transfers."
					: "Follow these steps to resolve WebUSB connection issues with Meta Quest 3:"}
			</p>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
				<div className="bg-card border border-subtle rounded-lg p-3 sm:p-3.5 space-y-1">
					<div className="flex items-center gap-2 mb-1">
						<ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
						<h4 className="text-xs font-semibold text-primary">
							1. Accept Prompt
						</h4>
					</div>
					<p className="text-[11px] text-muted leading-relaxed">
						Put on your Quest 3 headset. Look for{" "}
						<strong>"Allow USB Debugging?"</strong> and select{" "}
						<strong>"Always allow"</strong>.
					</p>
				</div>

				<div
					className={`rounded-lg p-3 sm:p-3.5 space-y-1.5 border transition-colors ${
						isUnsupportedBrowser
							? "bg-amber-500/10 border-amber-500/40"
							: "bg-card border-subtle"
					}`}
				>
					<div className="flex items-center justify-between gap-1 mb-1">
						<div className="flex items-center gap-2">
							{isUnsupportedBrowser ? (
								<AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
							) : (
								<Monitor className="w-4 h-4 text-blue-500 shrink-0" />
							)}
							<h4 className="text-xs font-semibold text-primary">
								2. Supported Browser
							</h4>
						</div>
						<Badge
							variant={isUnsupportedBrowser ? "warning" : "connected"}
							className="text-[9px] py-0 px-1 font-mono shrink-0"
						>
							{isUnsupportedBrowser ? "Unsupported" : "Supported"}
						</Badge>
					</div>
					<p className="text-[11px] text-muted leading-relaxed">
						{isUnsupportedBrowser ? (
							<>
								WebUSB is <strong>not supported</strong> in non-Chromium
								browsers. Please switch to a Chromium-based browser (
								<strong>Chrome, Edge, Brave, or Opera</strong>).
							</>
						) : (
							<>WebUSB is supported in Chromium-based browsers.</>
						)}
					</p>
				</div>

				<div className="bg-card border border-subtle rounded-lg p-3 sm:p-3.5 space-y-1">
					<div className="flex items-center gap-2 mb-1">
						<Usb className="w-4 h-4 text-emerald-500 shrink-0" />
						<h4 className="text-xs font-semibold text-primary">
							3. Developer Mode
						</h4>
					</div>
					<p className="text-[11px] text-muted leading-relaxed">
						Verify Developer Mode is turned ON in the Meta Horizon phone app
						under <em>Headset Settings &gt; Developer Mode</em>.
					</p>
				</div>

				<div className="bg-card border border-subtle rounded-lg p-3 sm:p-3.5 space-y-1">
					<div className="flex items-center gap-2 mb-1">
						<Cable className="w-4 h-4 text-cyan-400 shrink-0" />
						<h4 className="text-xs font-semibold text-primary">
							4. Cable & Conflicts
						</h4>
					</div>
					<p className="text-[11px] text-muted leading-relaxed">
						Use a USB-C data cable. Close SideQuest Desktop or Meta Developer
						Hub if running in background.
					</p>
				</div>
			</div>

			<div className="flex justify-end">
				<Button
					variant="primary"
					size="md"
					onClick={onRetry}
					leftIcon={<Usb className="w-4 h-4" />}
					fullWidth
					className="sm:w-auto"
				>
					Retry WebUSB Connection
				</Button>
			</div>
		</Card>
	);
};
