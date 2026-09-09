import { AlertTriangle, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { Button } from "./Button";

interface ModalProps {
	isOpen: boolean;
	title: string;
	message?: string;
	children?: React.ReactNode;
	confirmText?: string;
	cancelText?: string;
	variant?: "danger" | "warning" | "primary";
	onConfirm?: () => void;
	onCancel: () => void;
}

export const Modal: React.FC<ModalProps> = ({
	isOpen,
	title,
	message,
	children,
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "danger",
	onConfirm,
	onCancel,
}) => {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onCancel();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onCancel]);

	if (!isOpen) return null;

	const iconBg = {
		danger: "bg-red-500/10 text-red-500 border border-red-500/20",
		warning: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
		primary: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
		>
			<button
				type="button"
				className="fixed inset-0 bg-transparent border-0 cursor-default"
				onClick={onCancel}
				tabIndex={-1}
				aria-hidden="true"
			/>
			<div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-surface border border-default rounded-xl shadow-2xl p-4 sm:p-6 text-primary space-y-4 relative z-10">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<div
							className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg[variant]}`}
						>
							<AlertTriangle className="w-4 h-4" />
						</div>
						<h3 className="text-sm sm:text-base font-semibold tracking-tight">
							{title}
						</h3>
					</div>
					<button
						type="button"
						onClick={onCancel}
						className="text-muted hover:text-primary p-1.5 rounded-md transition-colors shrink-0 cursor-pointer"
						aria-label="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{message && (
					<p className="text-xs text-secondary leading-relaxed sm:pl-12">
						{message}
					</p>
				)}

				{children && <div className="sm:pl-12">{children}</div>}

				<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 pt-3 border-t border-subtle">
					<Button
						variant="secondary"
						size="sm"
						onClick={onCancel}
						fullWidth
						className="sm:w-auto"
					>
						{cancelText}
					</Button>
					{onConfirm && (
						<Button
							variant={variant === "danger" ? "danger" : "primary"}
							size="sm"
							onClick={onConfirm}
							fullWidth
							className="sm:w-auto"
						>
							{confirmText}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
