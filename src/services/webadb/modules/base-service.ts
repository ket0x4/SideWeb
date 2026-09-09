import type { Adb, AdbSync } from "@yume-chan/adb";
import type { ConnectionManager } from "./connection-manager";
import type { LoggerService } from "./logger-service";

export abstract class BaseService {
	protected connection: ConnectionManager;
	protected logger: LoggerService;

	constructor(connection: ConnectionManager, logger: LoggerService) {
		this.connection = connection;
		this.logger = logger;
	}

	protected getConnectedAdb(): Adb | null {
		const adb = this.connection.getAdbInstance();
		if (!adb) {
			this.logger.log("Device is not connected.", "error");
			return null;
		}
		return adb;
	}

	protected formatError(err: unknown): string {
		return err instanceof Error ? err.message : String(err);
	}

	protected logError(context: string, err?: unknown): void {
		const detail = err !== undefined ? `: ${this.formatError(err)}` : "";
		this.logger.log(`${context}${detail}`, "error");
	}

	protected async withAdbSync<T>(
		errorContext: string,
		action: (sync: AdbSync) => Promise<T>,
	): Promise<T | null> {
		const adb = this.getConnectedAdb();
		if (!adb) return null;

		try {
			const sync = await adb.sync();
			try {
				return await action(sync);
			} finally {
				await sync.dispose();
			}
		} catch (err: unknown) {
			this.logError(errorContext, err);
			return null;
		}
	}
}
