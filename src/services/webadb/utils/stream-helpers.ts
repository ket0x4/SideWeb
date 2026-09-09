import type { AdbSync } from "@yume-chan/adb";
import type {
	FileSystemWritableFileStream,
	SaveFilePickerOptions,
} from "../../../types/adb";

interface SaveStreamResult {
	writableStream: FileSystemWritableFileStream | null;
	cancelled: boolean;
}

interface ChunkReader {
	read(): Promise<{ done: boolean; value?: Uint8Array }>;
	cancel(reason?: unknown): Promise<unknown> | undefined;
}

function createChunkedReadableStream(
	data: Uint8Array,
	signal?: AbortSignal,
	onProgress?: (percentage: number, transferred: number, total: number) => void,
	chunkSize = 64 * 1024,
): ReadableStream<Uint8Array> {
	let offset = 0;
	const total = data.byteLength;

	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (signal?.aborted) {
				controller.error(new Error("Operation cancelled by user"));
				return;
			}

			if (offset >= total) {
				controller.close();
				return;
			}

			const chunk = data.subarray(offset, Math.min(offset + chunkSize, total));
			offset += chunk.byteLength;
			controller.enqueue(chunk);

			if (onProgress) {
				const pct = total > 0 ? Math.round((offset / total) * 100) : 100;
				onProgress(pct, offset, total);
			}
		},
	});
}

export async function pushDataToDevice(
	sync: AdbSync,
	targetPath: string,
	data: Uint8Array,
	signal?: AbortSignal,
	onProgress?: (percentage: number, transferred: number, total: number) => void,
	chunkSize = 64 * 1024,
): Promise<void> {
	const stream = createChunkedReadableStream(
		data,
		signal,
		onProgress,
		chunkSize,
	);
	await sync.write({
		filename: targetPath,
		file: stream as never,
		mtime: Math.floor(Date.now() / 1000),
	});
}

export async function openSaveFileStream(
	options: SaveFilePickerOptions,
	onLog?: (msg: string, type?: "info" | "warning" | "error") => void,
): Promise<SaveStreamResult> {
	if (
		"showSaveFilePicker" in window &&
		typeof window.showSaveFilePicker === "function"
	) {
		try {
			onLog?.(
				`Prompting save location for ${options.suggestedName || "file"} (Direct Disk Streaming)...`,
				"info",
			);
			const handle = await window.showSaveFilePicker(options);
			const writableStream = await handle.createWritable();
			return { writableStream, cancelled: false };
		} catch (pickerErr: unknown) {
			const err = pickerErr as Error;
			if (err.name === "AbortError") {
				onLog?.("File save picker cancelled by user.", "warning");
				return { writableStream: null, cancelled: true };
			}
			onLog?.(
				"Native File System Picker unavailable or declined, falling back to browser buffer...",
				"info",
			);
		}
	}
	return { writableStream: null, cancelled: false };
}

function downloadBlobToBrowser(
	chunks: Uint8Array[],
	filename: string,
	mimeType: string,
	onLog?: (msg: string, type?: "info" | "success") => void,
): void {
	onLog?.(`Generating browser download for ${filename}...`, "info");
	const blob = new Blob(chunks as BlobPart[], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	onLog?.(`Successfully downloaded ${filename}!`, "success");
}

export async function finalizeDownloadTarget({
	writableStream,
	fallbackChunks,
	filename,
	mimeType,
	diskSuccessMessage,
	onLog,
}: {
	writableStream: FileSystemWritableFileStream | null;
	fallbackChunks: Uint8Array[];
	filename: string;
	mimeType: string;
	diskSuccessMessage?: string;
	onLog?: (
		msg: string,
		type?: "info" | "success" | "warning" | "error",
	) => void;
}): Promise<void> {
	if (writableStream) {
		await writableStream.close();
		onLog?.(
			diskSuccessMessage ||
				`Successfully streamed ${filename} directly to hard drive!`,
			"success",
		);
	} else {
		downloadBlobToBrowser(fallbackChunks, filename, mimeType, onLog);
	}
}

export async function pumpReadableStream(
	reader: ChunkReader,
	signal: AbortSignal,
	onChunk: (chunk: Uint8Array) => Promise<void> | void,
	onAbort?: () => Promise<void> | void,
): Promise<void> {
	while (true) {
		if (signal.aborted) {
			await reader.cancel();
			if (onAbort) await onAbort();
			throw new Error("Operation cancelled by user");
		}

		const { done, value } = await reader.read();
		if (done) break;
		if (value) {
			await onChunk(value);
		}
	}
}
