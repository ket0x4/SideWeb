import { AlertTriangle, EyeOff, Filter, RefreshCw, Search } from "lucide-react";
import type React from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface AppSearchFilterProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	hideMetaApps: boolean;
	onToggleMetaApps: () => void;
	showSystemApps: boolean;
	onToggleSystemApps: () => void;
	isLoading: boolean;
	isBatchProcessing: boolean;
	onRefresh: () => void;
}

export const AppSearchFilter: React.FC<AppSearchFilterProps> = ({
	searchTerm,
	onSearchChange,
	hideMetaApps,
	onToggleMetaApps,
	showSystemApps,
	onToggleSystemApps,
	isLoading,
	isBatchProcessing,
	onRefresh,
}) => {
	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3.5">
			<div className="w-full sm:flex-1 min-w-0 sm:min-w-[240px]">
				<Input
					type="text"
					placeholder="Search apps by title or package..."
					value={searchTerm}
					onChange={(e) => onSearchChange(e.target.value)}
					leftIcon={<Search className="w-3.5 h-3.5" />}
				/>
			</div>

			<div className="flex items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap pb-1 sm:pb-0">
				<Button
					variant={hideMetaApps ? "secondary" : "danger"}
					size="sm"
					onClick={onToggleMetaApps}
					className="shrink-0 text-xs"
					leftIcon={
						hideMetaApps ? (
							<EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
						) : (
							<AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
						)
					}
				>
					<span className="hidden sm:inline">
						{hideMetaApps
							? "Meta/System Apps Hidden"
							: "Showing Meta/System Apps (Warning)"}
					</span>
					<span className="sm:hidden">
						{hideMetaApps ? "Meta Apps: Hidden" : "Meta Apps: Visible"}
					</span>
				</Button>

				<Button
					variant={showSystemApps ? "primary" : "secondary"}
					size="sm"
					onClick={onToggleSystemApps}
					className="shrink-0 text-xs"
					leftIcon={<Filter className="w-3.5 h-3.5 shrink-0" />}
				>
					<span className="hidden sm:inline">
						{showSystemApps ? "Package List: All" : "Package List: 3rd Party"}
					</span>
					<span className="sm:hidden">
						{showSystemApps ? "List: All" : "List: 3rd Party"}
					</span>
				</Button>

				<Button
					variant="secondary"
					size="sm"
					onClick={onRefresh}
					isLoading={isLoading}
					disabled={isLoading || isBatchProcessing}
					className="shrink-0 text-xs"
					leftIcon={
						<RefreshCw
							className={`w-3.5 h-3.5 shrink-0 ${isLoading ? "animate-spin" : ""}`}
						/>
					}
				>
					<span>{isLoading ? "Refreshing..." : "Refresh"}</span>
				</Button>
			</div>
		</div>
	);
};
