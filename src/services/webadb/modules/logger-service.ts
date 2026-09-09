import type {
	AdbConnectionStatus,
	LogEntry,
	LogListener,
	StatusListener,
} from "../../../types/adb";

export class LoggerService {
	private status: AdbConnectionStatus = "disconnected";
	private logListeners: Set<LogListener> = new Set();
	private statusListeners: Set<StatusListener> = new Set();

	public onLog(listener: LogListener): () => void {
		this.logListeners.add(listener);
		return () => this.logListeners.delete(listener);
	}

	public onStatusChange(listener: StatusListener): () => void {
		this.statusListeners.add(listener);
		return () => this.statusListeners.delete(listener);
	}

	public setStatus(newStatus: AdbConnectionStatus): void {
		this.status = newStatus;
		for (const fn of this.statusListeners) {
			fn(newStatus);
		}
	}

	public getStatus(): AdbConnectionStatus {
		return this.status;
	}

	public log(message: string, type: LogEntry["type"] = "info"): void {
		const entry: LogEntry = {
			id: Math.random().toString(36).substring(2, 9),
			timestamp: new Date().toLocaleTimeString(),
			type,
			message,
		};
		for (const fn of this.logListeners) {
			fn(entry);
		}
	}
}
