import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Info,
	X,
} from "lucide-react";
import type React from "react";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "info" | "warning" | "error" | "success";
	title?: string;
	onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
	variant = "info",
	title,
	children,
	onClose,
	className = "",
	...props
}) => {
	const variantStyles = {
		info: "bg-blue-500/10 border-blue-500/25 text-blue-400",
		warning: "bg-amber-500/10 border-amber-500/25 text-amber-400",
		error: "bg-red-500/10 border-red-500/25 text-red-400",
		success: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
	};

	const icons = {
		info: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
		warning: (
			<AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
		),
		error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
		success: (
			<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
		),
	};

	return (
		<div
			className={`p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-3 transition-colors ${variantStyles[variant]} ${className}`}
			{...props}
		>
			{icons[variant]}
			<div className="flex-1 space-y-1">
				{title && (
					<div className="font-semibold text-sm tracking-tight">{title}</div>
				)}
				<div className="text-secondary">{children}</div>
			</div>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="p-1 rounded hover:bg-white/10 text-inherit opacity-70 hover:opacity-100 transition-opacity shrink-0"
					aria-label="Close alert"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
		</div>
	);
};
