import type React from "react";
import type { AdbConnectionStatus } from "../../types/adb";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?:
		| "connected"
		| "connecting"
		| "disconnected"
		| "info"
		| "warning"
		| "danger"
		| "neutral";
	status?: AdbConnectionStatus;
	dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
	children,
	variant,
	status,
	dot = false,
	className = "",
	...props
}) => {
	let computedVariant = variant || "neutral";
	let label = children;

	if (status) {
		switch (status) {
			case "connected":
				computedVariant = "connected";
				label = label || "Connected";
				break;
			case "connecting":
				computedVariant = "connecting";
				label = label || "Connecting...";
				break;
			case "unauthorized":
				computedVariant = "warning";
				label = label || "Unauthorized";
				break;
			case "error":
				computedVariant = "danger";
				label = label || "Error";
				break;
			default:
				computedVariant = "disconnected";
				label = label || "Disconnected";
				break;
		}
	}

	const variantStyles = {
		connected: "bg-card text-emerald-500 border-default",
		connecting: "bg-card text-amber-500 border-default",
		disconnected: "bg-card text-muted border-default",
		info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
		warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
		danger: "bg-red-500/10 text-red-400 border-red-500/20",
		neutral: "bg-elevated text-secondary border-subtle",
	};

	const dotColors = {
		connected: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
		connecting: "bg-amber-500 animate-pulse",
		disconnected: "bg-muted",
		info: "bg-blue-400",
		warning: "bg-amber-400",
		danger: "bg-red-400",
		neutral: "bg-muted",
	};

	return (
		<span
			className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium border ${variantStyles[computedVariant]} ${className}`}
			{...props}
		>
			{(dot || status) && (
				<span
					className={`w-1.5 h-1.5 rounded-full ${dotColors[computedVariant]}`}
				/>
			)}
			{label}
		</span>
	);
};
