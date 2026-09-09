import { Play, Send, Terminal as TerminalIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";

interface TerminalProps {
	isConnected: boolean;
	onRunShell: (command: string) => Promise<string>;
	deviceModel?: string;
}

export const Terminal: React.FC<TerminalProps> = ({
	isConnected,
	onRunShell,
	deviceModel = "quest3",
}) => {
	const [command, setCommand] = useState("");
	const [history, setHistory] = useState<
		Array<{ id: string; cmd: string; output: string }>
	>([]);
	const [isExecuting, setIsExecuting] = useState(false);

	const executeCommand = async (cmdToRun: string) => {
		if (!cmdToRun.trim() || !isConnected || isExecuting) return;
		setIsExecuting(true);
		try {
			const output = await onRunShell(cmdToRun);
			setHistory((prev) => [
				...prev,
				{ id: `${Date.now()}-${prev.length}`, cmd: cmdToRun, output },
			]);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setHistory((prev) => [
				...prev,
				{
					id: `${Date.now()}-${prev.length}`,
					cmd: cmdToRun,
					output: `Error: ${msg}\n`,
				},
			]);
		} finally {
			setIsExecuting(false);
			setCommand("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			executeCommand(command);
		}
	};

	if (!isConnected) {
		return (
			<Card className="text-center py-16 px-8">
				<TerminalIcon className="w-10 h-10 text-muted mx-auto mb-4" />
				<h3 className="text-base font-semibold text-primary mb-2">
					Device Disconnected
				</h3>
				<p className="text-xs text-muted max-w-md mx-auto">
					Connect your Headset to execute real-time WebADB shell commands.
				</p>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap pb-0.5">
				<span className="shrink-0 text-[10px] font-semibold text-muted uppercase tracking-wider font-mono mr-1">
					Presets:
				</span>
				{[
					"pm list packages -3",
					"dumpsys battery",
					"getprop ro.product.model",
					"df -h /sdcard",
					"reboot",
				].map((presetCmd) => (
					<Button
						key={presetCmd}
						variant="secondary"
						size="sm"
						onClick={() => executeCommand(presetCmd)}
						leftIcon={<Play className="w-2.5 h-2.5" />}
						className="shrink-0 font-mono text-[11px] h-7 px-2"
					>
						{presetCmd}
					</Button>
				))}
			</div>

			<Card className="p-0 overflow-hidden shadow-2xl bg-surface border-default">
				<div className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-card border-b border-subtle flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shrink-0" />
					<div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shrink-0" />
					<div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shrink-0" />
					<span className="ml-1.5 sm:ml-2 text-[11px] sm:text-xs font-mono text-muted truncate">
						adb shell @ {deviceModel}
					</span>
				</div>

				<div className="font-mono h-64 sm:h-96 overflow-y-auto p-3 sm:p-4 text-xs leading-relaxed bg-terminal text-primary">
					{history.map((item) => (
						<div key={item.id} className="mb-3">
							<div className="text-cyan-400 flex items-center gap-1.5 font-semibold">
								<span>$ adb shell</span>
								<span className="text-primary truncate">{item.cmd}</span>
							</div>
							<pre className="mt-1 font-mono whitespace-pre-wrap break-all text-secondary">
								{item.output}
							</pre>
						</div>
					))}
				</div>

				<div className="p-2.5 sm:p-3 bg-card border-t border-subtle flex items-center gap-2 sm:gap-3">
					<span className="font-mono text-cyan-400 text-sm font-semibold shrink-0">
						$
					</span>
					<Input
						type="text"
						placeholder="adb shell command..."
						value={command}
						onChange={(e) => setCommand(e.target.value)}
						onKeyDown={handleKeyDown}
						isMono
						disabled={isExecuting}
						className="border-none bg-transparent focus:ring-0 focus:border-transparent px-0 text-base sm:text-xs"
					/>
					<Button
						variant="primary"
						size="sm"
						onClick={() => executeCommand(command)}
						disabled={isExecuting || !command.trim()}
						isLoading={isExecuting}
						leftIcon={<Send className="w-3 h-3" />}
						className="shrink-0 px-3"
					>
						Run
					</Button>
				</div>
			</Card>
		</div>
	);
};
