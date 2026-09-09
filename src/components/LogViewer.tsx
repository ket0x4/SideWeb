import {
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	FileText,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { LogEntry } from "../types/adb";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

interface LogViewerProps {
	logs: LogEntry[];
	isOpen: boolean;
	onToggle: () => void;
	onClear: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
	logs,
	isOpen,
	onToggle,
	onClear,
}) => {
	const [copied, setCopied] = useState(false);

	const copyLogs = () => {
		const text = logs
			.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`)
			.join("\n");
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const getTypeColor = (type: LogEntry["type"]) => {
		switch (type) {
			case "success":
				return "text-emerald-500";
			case "warning":
				return "text-amber-500";
			case "error":
				return "text-red-500";
			default:
				return "text-secondary";
		}
	};

	return (
		<div
			className={`fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-default shadow-2xl pb-safe transition-transform duration-200 ease-out ${
				isOpen ? "translate-y-0" : "translate-y-[calc(100%-40px)]"
			}`}
		>
			<div className="h-10 px-3.5 sm:px-6 flex items-center justify-between bg-card select-none hover:bg-elevated transition-colors">
				<button
					type="button"
					onClick={onToggle}
					className="flex items-center gap-2 flex-1 text-left bg-transparent border-0 cursor-pointer py-2 min-w-0"
				>
					<FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
					<span className="text-xs font-semibold text-primary truncate">
						WebADB Execution Logs
					</span>
					<Badge
						variant="neutral"
						className="text-[9px] sm:text-[10px] py-0 px-1.5 font-mono shrink-0"
					>
						{logs.length}
					</Badge>
				</button>

				<div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
					{isOpen && (
						<>
							<Button
								variant="secondary"
								size="sm"
								onClick={copyLogs}
								leftIcon={
									copied ? (
										<Check className="w-3 h-3 text-emerald-500" />
									) : (
										<Copy className="w-3 h-3" />
									)
								}
								className="h-7 text-xs px-2"
							>
								<span>{copied ? "Copied" : "Copy"}</span>
							</Button>

							<Button
								variant="secondary"
								size="sm"
								onClick={onClear}
								leftIcon={<Trash2 className="w-3 h-3" />}
								className="h-7 text-xs px-2"
							>
								<span>Clear</span>
							</Button>
						</>
					)}

					<button
						type="button"
						onClick={onToggle}
						className="bg-transparent border-0 p-1.5 text-muted hover:text-primary cursor-pointer flex items-center shrink-0"
						aria-label={isOpen ? "Collapse logs" : "Expand logs"}
					>
						{isOpen ? (
							<ChevronDown className="w-4 h-4" />
						) : (
							<ChevronUp className="w-4 h-4" />
						)}
					</button>
				</div>
			</div>

			<div className="font-mono h-56 sm:h-60 overflow-y-auto p-3 sm:p-4 text-xs space-y-1.5 bg-input border-t border-subtle">
				{logs.length === 0 ? (
					<span className="text-muted">
						No logs recorded yet. Connect a device or sideload an app to see
						events.
					</span>
				) : (
					logs.map((log) => (
						<div
							key={log.id}
							className="flex items-start gap-2 sm:gap-3 leading-relaxed text-[11px] sm:text-xs"
						>
							<span className="text-muted shrink-0 text-[10px] sm:text-[11px]">
								[{log.timestamp}]
							</span>
							<span
								className={`font-semibold shrink-0 w-14 sm:w-16 ${getTypeColor(log.type)}`}
							>
								[{log.type.toUpperCase()}]
							</span>
							<span className="text-primary break-all flex-1">
								{log.message}
							</span>
						</div>
					))
				)}
			</div>
		</div>
	);
};
