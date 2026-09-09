import type React from "react";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
	children,
	className = "",
	...props
}) => {
	return (
		<div
			className={`bg-surface border border-subtle rounded-xl transition-all duration-200 ${className}`}
			{...props}
		>
			{children}
		</div>
	);
};
