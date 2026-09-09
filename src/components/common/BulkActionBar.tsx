import { Trash2 } from "lucide-react";
import type React from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface BulkActionBarProps {
	selectedCount: number;
	itemLabel: string;
	isBatchProcessing?: boolean;
	batchProgress?: string;
	onClearSelection: () => void;
	onAction: () => void;
	actionLabel: string;
	actionVariant?: "danger" | "primary" | "secondary";
	actionIcon?: React.ReactNode;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
	selectedCount,
	itemLabel,
	isBatchProcessing = false,
	batchProgress,
	onClearSelection,
	onAction,
	actionLabel,
	actionVariant = "danger",
	actionIcon = <Trash2 className="w-3 h-3" />,
}) => {
	if (selectedCount === 0) return null;

	return (
		<Card className="bg-card border-blue-500/50 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shadow-lg">
			<div className="flex items-center justify-between sm:justify-start gap-2.5">
				<span className="font-mono text-xs font-semibold text-primary">
					{selectedCount} {itemLabel} selected
				</span>
				{isBatchProcessing && batchProgress && (
					<Badge variant="connecting" dot className="text-[10px]">
						{batchProgress}
					</Badge>
				)}
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="secondary"
					size="sm"
					onClick={onClearSelection}
					disabled={isBatchProcessing}
					className="flex-1 sm:flex-initial justify-center"
				>
					Clear
				</Button>

				<Button
					variant={actionVariant}
					size="sm"
					onClick={onAction}
					disabled={isBatchProcessing}
					leftIcon={actionIcon}
					className="flex-1 sm:flex-initial justify-center"
				>
					{actionLabel} ({selectedCount})
				</Button>
			</div>
		</Card>
	);
};
