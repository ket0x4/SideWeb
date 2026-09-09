import type React from "react";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
	progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
	progress,
	className = "",
	...props
}) => {
	const clampedProgress = Math.min(100, Math.max(0, progress));

	return (
		<div
			className={`w-full h-1.5 bg-elevated rounded-full overflow-hidden ${className}`}
			{...props}
		>
			<div
				className="h-full bg-accent-primary transition-all duration-200 ease-out"
				style={{ width: `${clampedProgress}%` }}
			/>
		</div>
	);
};
