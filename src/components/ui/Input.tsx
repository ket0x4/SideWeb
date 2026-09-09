import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	isMono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	(
		{ leftIcon, rightIcon, isMono = false, className = "", disabled, ...props },
		ref,
	) => {
		return (
			<div className="relative flex items-center w-full">
				{leftIcon && (
					<div className="absolute left-3 text-muted pointer-events-none flex items-center justify-center">
						{leftIcon}
					</div>
				)}
				<input
					ref={ref}
					disabled={disabled}
					className={`w-full bg-input text-primary border border-default rounded-md px-3 py-2 sm:py-1.5 text-base sm:text-xs placeholder:text-muted transition-colors duration-150 outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
						leftIcon ? "pl-9" : ""
					} ${rightIcon ? "pr-9" : ""} ${isMono ? "font-mono" : ""} ${className}`}
					{...props}
				/>
				{rightIcon && (
					<div className="absolute right-3 text-muted flex items-center justify-center">
						{rightIcon}
					</div>
				)}
			</div>
		);
	},
);
Input.displayName = "Input";
