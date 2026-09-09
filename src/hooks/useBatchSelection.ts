import { useCallback, useMemo, useState } from "react";

interface UseBatchSelectionOptions<T> {
	items: T[];
	getId: (item: T) => string;
}

export function useBatchSelection<T>({
	items,
	getId,
}: UseBatchSelectionOptions<T>) {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [isBatchProcessing, setIsBatchProcessing] = useState(false);
	const [batchProgress, setBatchProgress] = useState("");

	const itemIds = useMemo(() => items.map(getId), [items, getId]);

	const isAllSelected = useMemo(
		() => itemIds.length > 0 && itemIds.every((id) => selectedIds.includes(id)),
		[itemIds, selectedIds],
	);

	const toggleSelectAll = useCallback(() => {
		setSelectedIds((prev) =>
			itemIds.length > 0 && itemIds.every((id) => prev.includes(id))
				? []
				: [...itemIds],
		);
	}, [itemIds]);

	const toggleSelect = useCallback((id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedIds([]);
	}, []);

	const executeBatch = useCallback(
		async (
			actionLabel: string,
			actionFn: (id: string) => Promise<unknown>,
			onComplete?: () => void,
		) => {
			if (selectedIds.length === 0) return;

			setIsBatchProcessing(true);
			const total = selectedIds.length;

			for (let i = 0; i < total; i++) {
				const id = selectedIds[i];
				setBatchProgress(`${actionLabel} (${i + 1}/${total}): ${id}...`);
				await actionFn(id);
			}

			setSelectedIds([]);
			setIsBatchProcessing(false);
			setBatchProgress("");
			onComplete?.();
		},
		[selectedIds],
	);

	return {
		selectedIds,
		setSelectedIds,
		isAllSelected,
		toggleSelectAll,
		toggleSelect,
		clearSelection,
		isBatchProcessing,
		batchProgress,
		executeBatch,
	};
}
