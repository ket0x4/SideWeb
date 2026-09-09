import { Loader2 } from "lucide-react";
import type React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
	size?: "sm" | "md" | "lg";
	isLoading?: boolean;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
	children,
	variant = "secondary",
	size = "md",
	isLoading = false,
	leftIcon,
	rightIcon,
	fullWidth = false,
	disabled,
	className = "",
	...props
}) => {
	const baseClasses =
		"inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed rounded-md whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-neutral-400";

	const sizeClasses = {
		sm: "h-8 sm:h-7 px-3 sm:px-2.5 text-xs gap-1.5",
		md: "h-9 sm:h-8 px-4 sm:px-3.5 text-xs gap-2",
		lg: "h-11 sm:h-10 px-5 text-sm gap-2.5",
	};

	const variantClasses = {
		primary:
			"bg-accent-primary text-accent-text hover:opacity-90 active:scale-[0.98]",
		secondary:
			"bg-card text-primary border border-default hover:bg-elevated hover:border-hover active:scale-[0.98]",
		danger:
			"bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 active:scale-[0.98]",
		ghost:
			"bg-transparent text-secondary hover:text-primary hover:bg-elevated active:scale-[0.98]",
		outline:
			"bg-transparent text-primary border border-default hover:border-hover hover:bg-elevated active:scale-[0.98]",
	};

	const widthClass = fullWidth ? "w-full" : "";

	return (
		<button
			disabled={disabled || isLoading}
			className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
			{...props}
		>
			{isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : leftIcon}
			{children}
			{!isLoading && rightIcon}
		</button>
	);
};
