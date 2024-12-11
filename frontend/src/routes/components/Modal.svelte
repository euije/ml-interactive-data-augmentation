<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import { Button, Modal, Spinner, Textarea } from "flowbite-svelte";
	import {
		showModal,
		filename,
		modalType,
		sentencesToDelete,
		all_data,
		dataset,
		datasetInfo,
		click_id,
		selectedHistoryRows,
		viewHistory,
		originallyViewingHistory,
		old_size,
		selectedGeneratedRows,
		newSentence,
		x_min,
		x_max,
		isMounting,
		y_min,
		y_max,
		tableSortBy,
		tableSortDirection,
	} from "../store";
	import { onMount } from "svelte";
	import {
		TrashBinOutline,
		CheckOutline,
		PlusOutline,
	} from "flowbite-svelte-icons";
	import type { DatasetInfo } from "../utils/types";
	import { new_category } from "../utils/consts";
	import { countWords, normalizeVal, splitLines } from "../utils/helpers";

	let modalElement: HTMLElement;
	let isInitialClick = true;

	$: pointsToDelete = $sentencesToDelete.map((id) =>
		$all_data.find((point) => point.id === id),
	);

	// Close modal when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (isInitialClick) {
			isInitialClick = false;
			return;
		}

		if (
			modalElement &&
			!modalElement.contains(event.target as Node) &&
			!(event.target as HTMLElement).closest("button") && // Ignore clicks on buttons
			$showModal
		) {
			showModal.set(false);
		}
	}

	onMount(() => {
		setTimeout(() => {
			document.addEventListener("click", handleClickOutside);
		}, 100); // Small delay to allow modal to open

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	});

	$: if ($showModal) {
		isInitialClick = true;
	}

	const removeSentence = async (id: number) => {
		// remove sentence from current dataset
		const dataset = $dataset;
		try {
			const response = await fetch(
				`/api/removeSentence?dataset=${dataset}&id=${id}`,
				{
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			if (result.success) {
				let new_data = $all_data.filter((d) => d.id !== id);
				new_data = new_data.map((d) => {
					if (d.id > id) {
						return { ...d, id: d.id - 1 };
					}
					return d;
				});
				const updatedOldSize =
					id < $old_size ? $old_size - 1 : $old_size;
				const currentDatasetInfo = $datasetInfo as DatasetInfo;
				const newDatasetInfo: DatasetInfo = {
					...currentDatasetInfo,
					all_data: new_data,
					old_size: updatedOldSize,
				};
				datasetInfo.set(newDatasetInfo);
			} else {
				console.error("Failed to remove sentence:", result.error);
			}
		} catch (error) {
			console.error("Error removing sentence:", error);
		}
	};

	const removeSentences = async () => {
		// remove multiple sentences from current dataset
		const sortedPoints = pointsToDelete.sort(
			(a, b) => (b?.id || 0) - (a?.id || 0),
		);
		originallyViewingHistory.set($viewHistory);

		for (const point of sortedPoints) {
			if (point) {
				await removeSentence(point.id);
			}
		}

		if ($click_id !== -1 && $click_id >= $all_data.length) {
			click_id.set($all_data.length - 1);
		}

		showModal.set(false);
		sentencesToDelete.set([]);
		selectedHistoryRows.set([]);
		selectedGeneratedRows.set([]);

		setTimeout(() => {
			if ($originallyViewingHistory) {
				originallyViewingHistory.set(false);
			}
		}, 100);
	};

	const resetData = () => {
		// remove all data points with category = 'New' from current dataset
		const new_data = $all_data.filter((d) => d.category !== new_category);
		const currentDatasetInfo = $datasetInfo as DatasetInfo;
		const newDatasetInfo: DatasetInfo = {
			...currentDatasetInfo,
			all_data: new_data,
			old_size: new_data.length,
		};
		if ($click_id !== -1 && $click_id >= new_data.length) {
			click_id.set(-1);
		}
		datasetInfo.set(newDatasetInfo);
		console.log(`${$dataset} dataset reset`);
		showModal.set(false);
	};

	let textareaprops = {
		// Textarea properties
		id: "newsentence",
		name: "newsentence",
		label: "New sentence",
		rows: 2,
		placeholder: "Your new sentence...",
	};

	const addSentence = async () => {
		// add sentence to current dataset (manual)
		showModal.set(true);
		isMounting.set(true);
		const dataset = $dataset;
		const sentence = $newSentence.trim();
		const numSentences = $all_data.length;
		try {
			const response = await fetch(`/api/addSentenceManual`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dataset: dataset, sentence: sentence }),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			if (result.success) {
				const cur_date = new Date();
				const new_points = result.data.map((d: any, i: number) => ({
					id: numSentences + i,
					sentence: sentence,
					category: new_category,
					tooltip: splitLines(sentence),
					length: countWords(sentence),
					x: normalizeVal(d.umap_x, $x_min, $x_max),
					y: normalizeVal(d.umap_y, $y_min, $y_max),
					method: "MANUAL",
					timestamp: cur_date,
				}));
				const new_data = [...$all_data, ...new_points];
				const currentDatasetInfo = $datasetInfo as DatasetInfo;
				const newDatasetInfo: DatasetInfo = {
					...currentDatasetInfo,
					all_data: new_data,
					old_size: numSentences,
				};
				datasetInfo.set(newDatasetInfo);
			} else {
				console.error("Failed to add sentence:", result.error);
			}
		} catch (error) {
			console.error("Error adding sentence:", error);
		}
		setTimeout(() => {
			newSentence.set("");
			modalType.set("add-done");
			tableSortBy.set("id");
			tableSortDirection.set(-1);
			isMounting.set(false);
		}, 100);
	};
</script>

<Modal bind:open={$showModal} size="xs" autoclose={false}>
	<div
		class="text-center inner-modal"
		bind:this={modalElement}
		class:delete={$modalType === "delete"}
	>
		{#if $modalType === "download"}
			<h3
				class="mb-2 text-sm font-normal text-gray-500 dark:text-gray-400"
			>
				Your file has been downloaded to:
			</h3>
			<pre class="mb-2">{$filename}</pre>
			<Button
				color="dark"
				size="xs"
				class="me-2"
				on:click={() => showModal.set(false)}>Close</Button
			>
		{:else if $modalType === "delete"}
			<h3
				class="mb-2 text-sm font-normal text-gray-500 dark:text-gray-400"
			>
				Are you sure you want to delete {$sentencesToDelete.length} sentence{$sentencesToDelete.length >
				1
					? "s"
					: ""}?
			</h3>
			<pre>
				{#each pointsToDelete as point}
					{#if point && point.sentence}
						<span><b>Sentence {point.id}:</b> {point.sentence}</span
						>
					{/if}
				{/each}
			</pre>
			<div class="button-contain">
				<Button
					color="primary"
					size="xs"
					class="me-2"
					on:click={removeSentences}
					><TrashBinOutline /> Delete</Button
				>
				<Button
					color="dark"
					size="xs"
					class="me-2"
					on:click={() => showModal.set(false)}>Cancel</Button
				>
			</div>
		{:else if $modalType === "add"}
			<h3
				class="mb-2 text-sm font-normal text-gray-500 dark:text-gray-400"
			>
				Enter sentence here:
			</h3>
			<Textarea
				{...textareaprops}
				bind:value={$newSentence}
				disabled={$isMounting}
			/>
			<div class="button-contain">
				<Button
					color="primary"
					size="xs"
					class="me-2"
					on:click={addSentence}
					disabled={$isMounting || $newSentence === ""}
					>{#if $isMounting}<Spinner size={"4"} />{:else}<PlusOutline
						/>{/if} Add</Button
				>
				<Button
					color="dark"
					size="xs"
					class="me-2"
					on:click={() => showModal.set(false)}>Cancel</Button
				>
			</div>
		{:else if $modalType === "add-done"}
			<h3
				class="mb-2 text-sm font-normal text-gray-500 dark:text-gray-400"
			>
				Your sentence has been added!
			</h3>
			<div class="button-contain">
				<Button
					color="primary"
					size="xs"
					class="me-2"
					on:click={() => modalType.set("add")}
					><PlusOutline /> Add another sentence</Button
				>
				<Button
					color="dark"
					size="xs"
					class="me-2"
					on:click={() => showModal.set(false)}>Close</Button
				>
			</div>
		{:else}
			<h3
				class="mb-2 text-sm font-normal text-gray-500 dark:text-gray-400"
			>
				Are you sure you want to reset the <i>{$dataset}</i> dataset?
			</h3>
			<div class="button-contain">
				<Button
					color="primary"
					size="xs"
					class="me-2"
					on:click={resetData}><CheckOutline /> Yes</Button
				>
				<Button
					color="dark"
					size="xs"
					class="me-2"
					on:click={() => showModal.set(false)}>Cancel</Button
				>
			</div>
		{/if}
	</div>
</Modal>

<style lang="scss">
	.inner-modal {
		&.delete {
			pre {
				white-space: pre-wrap;
				width: 100%;
				text-align: left;
				margin-top: 0;
				padding: 0rem 0.75rem;
				max-height: 200px;
				overflow: auto;

				span {
					display: block;

					&:first-child {
						margin-top: -0.5rem;
					}

					&:last-child {
						margin-bottom: -1.5rem;
					}

					&:not(:last-child) {
						margin-bottom: 0.5rem;
					}
				}
			}
		}

		pre {
			font-size: 12px;
			background-color: var(--color-border-light);
			padding: 0.25rem 0.5rem;
			width: min-content;
			border-radius: 0.5rem;
			margin: auto;
			margin-bottom: 1rem;
		}

		div {
			&.button-contain {
				margin-top: 1rem;
				display: flex;
				justify-content: center;
				gap: 0.5rem;
			}
		}

		:global(svg) {
			width: 1rem;
			margin-right: 0.25rem;
		}
	}

	:global(.max-w-md) {
		max-width: 36rem;
	}
</style>
