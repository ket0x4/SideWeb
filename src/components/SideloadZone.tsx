import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { ProgressBar } from "./ui/ProgressBar";

interface SideloadZoneProps {
	isConnected: boolean;
	onInstall: (
		file: File,
		onProgress: (step: string, progress: number) => void,
	) => Promise<boolean>;
	onCancel?: () => void;
}

export const SideloadZone: React.FC<SideloadZoneProps> = ({
	isConnected,
	onInstall,
	onCancel,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [currentStep, setCurrentStep] = useState<string>("");
	const [progressPct, setProgressPct] = useState<number>(0);
	const [resultStatus, setResultStatus] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = async (file: File) => {
		const ext = file.name.split(".").pop()?.toLowerCase();
		if (!["apk", "xapk", "apks", "zip", "obb"].includes(ext || "")) {
			setResultStatus({
				type: "error",
				message: `Unsupported file format ".${ext}". Please upload an .apk, .xapk, .apks, .obb, or .zip archive.`,
			});
			return;
		}

		setResultStatus(null);
		setIsProcessing(true);
		setCurrentStep("Initializing file stream...");
		setProgressPct(0);

		const success = await onInstall(file, (step, progress) => {
			setCurrentStep(step);
			setProgressPct(progress);
		});

		setIsProcessing(false);
		if (success) {
			setResultStatus({
				type: "success",
				message: `Successfully sideloaded "${file.name}" to Meta Quest 3!`,
			});
		} else {
			setResultStatus({
				type: "error",
				message: `Failed to sideload "${file.name}". Check the log console below for detailed traceback.`,
			});
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		if (isConnected && !isProcessing) setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (!isConnected || isProcessing) return;

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFile(e.dataTransfer.files[0]);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			handleFile(e.target.files[0]);
		}
	};

	return (
		<div className="space-y-5">
			<Card
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={() =>
					isConnected && !isProcessing && fileInputRef.current?.click()
				}
				className={`border-2 border-dashed text-center py-10 sm:py-16 px-4 sm:px-8 transition-all duration-200 ${
					isDragging
						? "border-blue-500 bg-elevated"
						: isConnected
							? "border-default hover:border-hover bg-surface"
							: "border-subtle bg-card opacity-60"
				} ${isConnected && !isProcessing ? "cursor-pointer" : "cursor-not-allowed"}`}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept=".apk,.xapk,.apks,.zip,.obb"
					className="hidden"
					onChange={handleInputChange}
					disabled={!isConnected || isProcessing}
				/>

				<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-card border border-default flex items-center justify-center mx-auto mb-4 sm:mb-5">
					{isProcessing ? (
						<Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 animate-spin" />
					) : (
						<Upload
							className={`w-5 h-5 sm:w-6 sm:h-6 ${isConnected ? "text-primary" : "text-muted"}`}
						/>
					)}
				</div>

				<h2 className="text-sm sm:text-base font-semibold tracking-tight text-primary mb-2">
					{isProcessing
						? "Sideloading Package..."
						: isConnected
							? "Drop APK, XAPK, APKS, OBB or Tap to Select"
							: "Connect Meta Quest 3 to Sideload"}
				</h2>

				<p className="text-xs text-muted max-w-md mx-auto mb-5 sm:mb-6 leading-relaxed">
					{isConnected
						? "Supports single .apk binaries, combined .xapk/.apks bundles, and standalone .obb asset files."
						: "Plug in your Quest 3 headset via USB and enable Developer Mode."}
				</p>

				{isConnected && !isProcessing && (
					<Button variant="primary" size="md" className="w-full sm:w-auto">
						Select File to Sideload
					</Button>
				)}

				{isProcessing && (
					<div className="max-w-md mx-auto w-full space-y-3 pt-2">
						<div className="flex items-center justify-between text-xs font-mono">
							<span className="text-secondary truncate mr-2">
								{currentStep}
							</span>
							<span className="font-semibold text-primary shrink-0">
								{progressPct}%
							</span>
						</div>

						<ProgressBar progress={progressPct} />

						{onCancel && (
							<Button
								variant="danger"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									onCancel();
								}}
								leftIcon={<XCircle className="w-3.5 h-3.5" />}
								fullWidth
								className="sm:w-auto"
							>
								Cancel Sideload Operation
							</Button>
						)}
					</div>
				)}
			</Card>

			{isProcessing && (
				<Card className="p-3.5 sm:p-4 bg-card">
					<div className="flex items-center justify-between gap-2 overflow-x-auto text-xs font-mono">
						{["Parsing", "Upload APK", "Installing", "OBB Sync"].map(
							(step, idx) => {
								const done = progressPct >= (idx + 1) * 25;
								const active = !done && progressPct >= idx * 25;
								return (
									<div
										key={step}
										className={`flex items-center gap-1.5 shrink-0 ${
											done
												? "text-emerald-500"
												: active
													? "text-blue-500 font-semibold"
													: "text-muted"
										}`}
									>
										{done ? (
											<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
										) : active ? (
											<Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
										) : (
											<span className="w-3.5 h-3.5 rounded-full border border-subtle text-[10px] flex items-center justify-center">
												{idx + 1}
											</span>
										)}
										<span>{step}</span>
									</div>
								);
							},
						)}
					</div>
				</Card>
			)}

			{resultStatus && (
				<Alert variant={resultStatus.type === "success" ? "success" : "error"}>
					{resultStatus.message}
				</Alert>
			)}
		</div>
	);
};
