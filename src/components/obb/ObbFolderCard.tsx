import {
	Archive,
	CheckSquare,
	Download,
	File,
	Folder,
	Square,
	Trash2,
} from "lucide-react";
import type React from "react";
import type { ObbFolderInfo } from "../../types/adb";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface ObbFolderCardProps {
	folder: ObbFolderInfo;
	isSelected: boolean;
	isSelectedFolder: boolean;
	isDeleting: boolean;
	isPullingZip: boolean;
	pullingFile: string | null;
	pullProgress: number;
	isBatchProcessing: boolean;
	onToggleSelect: (pkgName: string) => void;
	onToggleExpand: (pkgName: string) => void;
	onPullFolderZip: (pkgName: string) => void;
	onDeleteRequest: (pkgName: string) => void;
	onPullObbFile: (pkgName: string, obbFilename: string) => void;
}

export const ObbFolderCard: React.FC<ObbFolderCardProps> = ({
	folder,
	isSelected,
	isSelectedFolder,
	isDeleting,
	isPullingZip,
	pullingFile,
	pullProgress,
	isBatchProcessing,
	onToggleSelect,
	onToggleExpand,
	onPullFolderZip,
	onDeleteRequest,
	onPullObbFile,
}) => {
	return (
		<div
			className={`border-b border-subtle p-3.5 sm:p-4 transition-colors duration-150 ${
				isSelected
					? "bg-elevated"
					: isSelectedFolder
						? "bg-card"
						: "hover:bg-card/50"
			}`}
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0">
					<button
						type="button"
						onClick={() => onToggleSelect(folder.packageName)}
						className="cursor-pointer p-1 -m-1 bg-transparent border-0 flex shrink-0"
						title="Select folder"
					>
						{isSelected ? (
							<CheckSquare className="w-4 h-4 text-blue-500" />
						) : (
							<Square className="w-4 h-4 text-muted hover:text-primary" />
						)}
					</button>

					<button
						type="button"
						onClick={() => onToggleExpand(folder.packageName)}
						className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0 select-none text-left bg-transparent border-0 p-0"
					>
						<Folder className="w-5 h-5 text-cyan-400 shrink-0" />
						<div className="min-w-0 flex-1">
							<div className="text-xs sm:text-sm font-semibold font-mono text-primary truncate break-all sm:truncate">
								{folder.packageName}
							</div>
							<p className="text-[11px] sm:text-xs text-muted">
								{folder.files.length} file(s){" "}
								{isSelectedFolder ? "(expanded)" : "(tap to expand)"}
							</p>
						</div>
					</button>
				</div>

				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-subtle/60">
					{isDeleting && (
						<Badge
							variant="connecting"
							dot
							className="justify-center sm:justify-start py-1"
						>
							Deleting...
						</Badge>
					)}

					{isPullingZip && (
						<Badge
							variant="connecting"
							dot
							className="justify-center sm:justify-start py-1"
						>
							Streaming ZIP ({pullProgress}%)...
						</Badge>
					)}

					<div className="flex items-center gap-1.5 sm:gap-2">
						<Button
							variant="secondary"
							size="sm"
							onClick={() => onPullFolderZip(folder.packageName)}
							disabled={isDeleting || isPullingZip || isBatchProcessing}
							leftIcon={<Archive className="w-3 h-3 text-blue-400" />}
							title="Stream & compress entire OBB folder into single ZIP download"
							className="flex-1 sm:flex-none justify-center text-xs"
						>
							<span>Pull ZIP</span>
						</Button>

						<Button
							variant="danger"
							size="sm"
							onClick={() => onDeleteRequest(folder.packageName)}
							disabled={isDeleting || isPullingZip || isBatchProcessing}
							leftIcon={<Trash2 className="w-3 h-3" />}
							className="flex-1 sm:flex-none justify-center text-xs"
						>
							Delete
						</Button>
					</div>
				</div>
			</div>

			{isSelectedFolder && (
				<div className="mt-3 pt-3 border-t border-dashed border-subtle space-y-2 pl-2 sm:pl-8">
					{folder.files.map((file) => {
						const fileKey = `${folder.packageName}/${file.name}`;
						const isPullingThis = pullingFile === fileKey;

						return (
							<div
								key={file.name}
								className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono py-1.5 gap-2 border-b sm:border-b-0 border-subtle/40 last:border-b-0"
							>
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<File className="w-3.5 h-3.5 text-muted shrink-0" />
									<span className="text-primary truncate">{file.name}</span>
									<span className="text-muted opacity-75 shrink-0">
										({file.size})
									</span>
								</div>

								<div className="flex items-center gap-2 shrink-0 sm:ml-3">
									{isPullingThis && (
										<Badge variant="connecting" dot className="text-[10px]">
											Pulling ({pullProgress}%)...
										</Badge>
									)}

									<Button
										variant="secondary"
										size="sm"
										onClick={() => onPullObbFile(folder.packageName, file.name)}
										disabled={pullingFile !== null || isPullingZip}
										leftIcon={<Download className="w-3 h-3 text-blue-400" />}
										title="Pull single OBB file to computer"
										className="w-full sm:w-auto justify-center text-xs"
									>
										Pull File
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
