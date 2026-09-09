import { Loader2 } from "lucide-react";
import type React from "react";

interface PipelineStep {
	id: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
}

function getPipelineStepStatus(
	stage: string | undefined,
	stepOrder: string[],
	index: number,
	isCompleted: boolean,
	isError: boolean,
): "completed" | "active" | "error" | "pending" {
	if (!stage) return "pending";
	if (isError) return "error";
	if (isCompleted) return "completed";

	const currentIdx = stepOrder.indexOf(stage);
	if (currentIdx > index) return "completed";
	if (currentIdx === index) return "active";
	return "pending";
}

interface PipelineDiagramProps {
	steps: PipelineStep[];
	stage?: string;
	stepOrder: string[];
	isCompleted: boolean;
	isError: boolean;
}

export const PipelineDiagram: React.FC<PipelineDiagramProps> = ({
	steps,
	stage,
	stepOrder,
	isCompleted,
	isError,
}) => {
	return (
		<div className="grid grid-cols-4 gap-1.5 pt-1">
			{steps.map((step, idx) => {
				const status = getPipelineStepStatus(
					stage,
					stepOrder,
					idx,
					isCompleted,
					isError,
				);
				const StepIcon = step.icon;
				return (
					<div
						key={step.id}
						className={`flex flex-col items-center p-2 rounded-lg text-center transition-colors ${
							status === "completed"
								? "bg-emerald-500/10 text-emerald-500"
								: status === "active"
									? "bg-blue-500/10 text-blue-500 font-semibold"
									: status === "error"
										? "bg-red-500/10 text-red-400"
										: "bg-card text-muted"
						}`}
					>
						{status === "active" ? (
							<Loader2 className="w-4 h-4 mb-1 animate-spin" />
						) : (
							<StepIcon className="w-4 h-4 mb-1" />
						)}
						<span className="text-[10px] truncate max-w-full font-mono">
							{step.label}
						</span>
					</div>
				);
			})}
		</div>
	);
};
