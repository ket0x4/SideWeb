import { AlertTriangle, Box, HardDrive, Usb } from "lucide-react";
import type React from "react";
import { detectBrowser } from "../../utils/browserDetection";
import { Card } from "../ui/Card";

interface DisconnectedStateCardProps {
	title?: string;
	description?: string;
	icon?: "usb" | "hard-drive" | "box";
}

export const DisconnectedStateCard: React.FC<DisconnectedStateCardProps> = ({
	title,
	description,
	icon = "usb",
}) => {
	const browserInfo = detectBrowser();
	const isUnsupportedBrowser =
		!browserInfo.isChromium || !browserInfo.isWebUsbSupported;

	const resolvedTitle =
		title ??
		(isUnsupportedBrowser ? "WebUSB Not Supported" : "No Quest 3 Connected");

	const resolvedDescription =
		description ??
		(isUnsupportedBrowser
			? "WebUSB is not supported by this browser. Please open SideWeb in a Chromium-based browser (Google Chrome, Microsoft Edge, Brave, or Opera) to connect your Quest 3."
			: "Connect your Quest 3 via USB and click Connect to start managing files and installing APKs.");

	const renderIcon = () => {
		if (isUnsupportedBrowser && !title) {
			return (
				<AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
			);
		}
		switch (icon) {
			case "hard-drive":
				return <HardDrive className="w-10 h-10 text-muted mx-auto mb-4" />;
			case "box":
				return <Box className="w-10 h-10 text-muted mx-auto mb-4" />;
			default:
				return <Usb className="w-10 h-10 text-muted mx-auto mb-4" />;
		}
	};

	return (
		<Card className="text-center py-10 sm:py-16 px-4 sm:px-8">
			{renderIcon()}
			<h3 className="text-sm sm:text-base font-semibold mb-2 text-primary">
				{resolvedTitle}
			</h3>
			<p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
				{resolvedDescription}
			</p>
		</Card>
	);
};
