<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import {
		TableSearch,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Accordion,
		AccordionItem,
		Checkbox,
		Table,
		Button,
		Textarea,
		Spinner,
		Popover,
	} from "flowbite-svelte";
	import {
		all_data,
		result_ids,
		hover_id,
		categoryStore,
		searchTerm,
		sentLengthRange,
		isAccordionOpen,
		click_id,
		tableSortBy,
		tableSortDirection,
		selectedSentenceTypes,
		showModal,
		modalType,
		editID,
		datasetInfo,
		x_min,
		dataset,
		editSentence,
		x_max,
		y_max,
		y_min,
		sentencesToDelete,
		isEditing,
		tableHeight,
		isMounting,
		DEMO_MODE,
	} from "../store";
	import {
		ArrowUpOutline,
		CheckOutline,
		CloseOutline,
		InfoCircleOutline,
		PenOutline,
		PlusOutline,
		SortOutline,
		TrashBinOutline,
	} from "flowbite-svelte-icons";
	import {
		countWords,
		getCategoryColor,
		normalizeVal,
		splitLines,
	} from "../utils/helpers";
	import { afterUpdate, onMount } from "svelte";
	import {
		maxTableHeight,
		minTableHeight,
		new_category,
	} from "../utils/consts";
	import type { DatasetInfo } from "../utils/types";
	import RangeSlider from "svelte-range-slider-pips";

	const clearSearch = () => {
		searchTerm.set("");
	};

	// filter data based on search term
	$: filtered_data = $all_data.filter((d) =>
		d.sentence
			? d.sentence.toLowerCase().includes($searchTerm.toLowerCase()) &&
				$categoryStore.selectedCategories.includes(d.category) &&
				d.length >= $sentLengthRange[0] &&
				d.length <= $sentLengthRange[1] &&
				(($selectedSentenceTypes.includes("new") &&
					d.category === new_category) ||
					($selectedSentenceTypes.includes("old") &&
						d.category !== new_category) ||
					(d.method &&
						$selectedSentenceTypes.includes(
							d.method.toLowerCase(),
						)))
			: true,
	);

	// set result_ids to be the ids of the filtered data
	$: result_ids.set(filtered_data.map((d) => d.id));

	$: num_results = filtered_data.length;

	// also let user sort by a specific column
	const sortTable = (key: string) => {
		// If the same key is clicked, reverse the sort direction
		if ($tableSortBy === key) {
			tableSortDirection.set($tableSortDirection === 1 ? -1 : 1);
		} else {
			tableSortBy.set(key);
			tableSortDirection.set(1);
		}
	};

	// sort the data based on the $tableSortBy and $tableSortDirection
	$: sortedData = [...filtered_data].sort((a, b) => {
		if ($tableSortBy === "selected") {
			const aSelected = $click_id === a.id;
			const bSelected = $click_id === b.id;
			if (aSelected && !bSelected) {
				return -$tableSortDirection;
			} else if (!aSelected && bSelected) {
				return $tableSortDirection;
			}
			return 0;
		}

		const aVal = a[$tableSortBy];
		const bVal = b[$tableSortBy];
		if (aVal < bVal) {
			return -$tableSortDirection;
		} else if (aVal > bVal) {
			return $tableSortDirection;
		}
		return 0;
	});

	const maxShow = 500; // max number of sentences to show in table at once
	$: displayData = sortedData.slice(0, maxShow);

	// handle hover events inside table
	const handleMouseEnter = (id: number) => {
		if ($hover_id === id) return;
		hover_id.set(id);
	};

	const handleMouseLeave = () => {
		if ($hover_id === -1) return;
		hover_id.set(-1);
	};

	const scrollToTop = () => {
		// scroll handler for back to top button
		const tableElement = document.querySelector("#table-section .my-table");
		if (tableElement) {
			tableElement.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	function findScrollableElement(): HTMLElement | null {
		return document.querySelector("#table-section .my-table");
	}

	let showBackToTop = false; // show back to top button only after scrolling a bit
	function handleScroll(event: Event) {
		const target = event.target as HTMLElement;
		showBackToTop = target.scrollTop > 100;
	}

	let scrollableElement: HTMLElement | null = null;

	function setupScrollListener() {
		removeScrollListener(); // Remove any existing listener
		scrollableElement = findScrollableElement();
		if (scrollableElement) {
			scrollableElement.addEventListener("scroll", handleScroll);
		}
	}

	function removeScrollListener() {
		if (scrollableElement) {
			scrollableElement.removeEventListener("scroll", handleScroll);
			scrollableElement = null;
		}
	}

	const handleClick = (newId: number) => {
		// handle click events in table
		if ($click_id === newId) {
			click_id.set(-1);
		} else {
			click_id.set(newId);
		}
	};

	// React to changes in accordion state
	$: if ($isAccordionOpen) {
		// Use afterUpdate to ensure DOM is ready
		afterUpdate(() => {
			setupScrollListener();
		});
	} else {
		removeScrollListener();
		showBackToTop = false;
	}

	onMount(() => {
		setupScrollListener();

		return removeScrollListener;
	});

	const addSentence = () => {
		// add new sentence to dataset (manually)
		modalType.set("add");
		showModal.set(true);
	};

	const startEditing = (id: number, sentence: string) => {
		// start editing sentence
		editID.set(id);
		editSentence.set(sentence);
	};

	const saveEdit = async (id: number, old_sentence: string) => {
		// save edited sentence
		isEditing.set(true);
		const dataset = $dataset;
		const new_sentence = $editSentence.trim();

		try {
			const response = await fetch("/api/editSentence", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: id,
					dataset: dataset,
					sentence: old_sentence,
					new_sentence: new_sentence,
				}),
			});
			if (!response.ok) {
				throw new Error("Failed to edit sentence");
			}

			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error);
			}

			const new_point = result.data[0];

			const new_data = $all_data.map((d) => {
				if (d.id === id) {
					return {
						...d,
						sentence: new_sentence,
						tooltip: splitLines(new_sentence),
						length: countWords(new_sentence),
						x: normalizeVal(new_point.umap_x, $x_min, $x_max),
						y: normalizeVal(new_point.umap_y, $y_min, $y_max),
						edited: true,
					};
				}
				return d;
			});

			const currentDatasetInfo = $datasetInfo as DatasetInfo;
			const newDatasetInfo: DatasetInfo = {
				...currentDatasetInfo,
				all_data: new_data,
			};
			datasetInfo.set(newDatasetInfo);
			editID.set(-1);
		} catch (error) {
			console.error("Error editing sentence:", error);
			isEditing.set(false);
			return;
		}

		setTimeout(() => {
			isEditing.set(false);
		}, 100);
	};

	const cancelEdit = () => {
		// cancel editing sentence
		editID.set(-1);
		editSentence.set("");
	};

	let textareaprops = {
		// textarea properties
		id: "editsentence",
		name: "editsentence",
		label: "Edit sentence",
		rows: 1,
		placeholder: "Edit sentence here...",
	};

	const deleteSentence = (id: number) => {
		// delete selected sentences
		sentencesToDelete.set([id]);
		modalType.set("delete");
		showModal.set(true);
	};

	let isDragging = false;
	let startY: number;
	let startHeight: number;

	function handleDragStart(event: MouseEvent | TouchEvent) {
		// handle table height adjustment by dragging
		isDragging = true;
		startY = "touches" in event ? event.touches[0].clientY : event.clientY;
		startHeight = $tableHeight;

		if (document) {
			document.addEventListener("mousemove", handleDragMove);
			document.addEventListener("touchmove", handleDragMove);
			document.addEventListener("mouseup", handleDragEnd);
			document.addEventListener("touchend", handleDragEnd);

			// Prevent text selection
			document.body.style.userSelect = "none";
		}
	}

	function handleDragMove(event: MouseEvent | TouchEvent) {
		if (!isDragging) return;
		const currentY =
			"touches" in event ? event.touches[0].clientY : event.clientY;
		const deltaY = startY - currentY;
		const newTableHeight = Math.max(
			minTableHeight,
			Math.min(maxTableHeight, startHeight + deltaY),
		);
		tableHeight.set(newTableHeight);
		updateTableHeight(newTableHeight);

		// Prevent default behavior to stop text selection
		event.preventDefault();
	}

	function handleDragEnd() {
		isDragging = false;
		if (document) {
			document.removeEventListener("mousemove", handleDragMove);
			document.removeEventListener("touchmove", handleDragMove);
			document.removeEventListener("mouseup", handleDragEnd);
			document.removeEventListener("touchend", handleDragEnd);

			// Re-enable text selection
			document.body.style.userSelect = "";
		}
	}

	function updateTableHeight(value: number) {
		if (document) {
			document.documentElement.style.setProperty(
				"--table-height",
				`${value}px`,
			);
		}
	}

	$: {
		if (!$isMounting && $tableHeight && $isAccordionOpen && document) {
			updateTableHeight($tableHeight);
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions a11y-mouse-events-have-key-events -->
<section id="table-section" class:demo={$DEMO_MODE}>
	<div
		class="drag-handle"
		class:hide={!$isAccordionOpen}
		on:mousedown={handleDragStart}
		on:touchstart|preventDefault={handleDragStart}
	></div>
	<Accordion flush>
		<AccordionItem defaultClass="table-item" bind:open={$isAccordionOpen}>
			<span slot="header"
				>Data Explorer <InfoCircleOutline
					id="data-explorer-tooltip"
					class={"info-tooltip " + ($isAccordionOpen ? "" : "hide")}
				/></span
			>
			<Popover triggeredBy="#data-explorer-tooltip" placement={"right"}>
				Search for sentences below to filter the table or select a
				sentence to navigate to it in the main visualization! You can
				also sort the table columns by clicking the double arrow icons,
				or adjust the table height with the "adjust table height"
				slider. Add a sentence manually to the dataset by clicking the
				"Add new sentence" button.
			</Popover>
			<div id="num-results">
				<p>{num_results} results</p>
				<div class="slider-contain">
					<p class="emphasis">adjust table height:</p>
					<div id="slider">
						<p>min</p>
						<RangeSlider
							float
							values={[$tableHeight]}
							min={minTableHeight}
							max={maxTableHeight}
							step={10}
							on:stop={({ detail }) =>
								tableHeight.set(detail.value)}
						/>
						<p>max</p>
					</div>
				</div>
			</div>
			<div class:hide={$DEMO_MODE}>
				<Button
					color="primary"
					button-type="add"
					size="xs"
					on:click={addSentence}
				>
					<PlusOutline />Add new sentence
				</Button>
			</div>
			<TableSearch
				placeholder="Search for sentence..."
				bind:inputValue={$searchTerm}
				divClass="search-table"
			>
				<button
					id="clear-search"
					on:click={clearSearch}
					title="clear search"
					class:hide={$searchTerm === "" || !$isAccordionOpen}
					><CloseOutline /></button
				>

				<TableHead>
					<TableHeadCell
						on:click={() => sortTable("selected")}
						disabled={displayData.length === 0}
						><div class="th-inner">
							Select <SortOutline />
						</div></TableHeadCell
					>
					<TableHeadCell
						on:click={() => sortTable("id")}
						disabled={displayData.length === 0}
						><div class="th-inner">
							ID <SortOutline />
						</div></TableHeadCell
					>
					<TableHeadCell
						on:click={() => sortTable("sentence")}
						disabled={displayData.length === 0}
						><div class="th-inner">
							Sentence <SortOutline />
						</div></TableHeadCell
					>
					<TableHeadCell
						on:click={() => sortTable("length")}
						disabled={displayData.length === 0}
						><div class="th-inner">
							Length <SortOutline />
						</div></TableHeadCell
					>
					<TableHeadCell
						on:click={() => sortTable("category")}
						disabled={displayData.length === 0}
						><div class="th-inner">
							Category <SortOutline />
						</div></TableHeadCell
					>
				</TableHead>
			</TableSearch>
			<Table hoverable={true} divClass="my-table search-results">
				<TableBody>
					{#each displayData as d (d.id)}
						<TableBodyRow>
							<div
								on:mouseenter={() => handleMouseEnter(d.id)}
								on:mouseleave={handleMouseLeave}
								title="click to select sentence"
								class="table-cell-wrapper"
							>
								<TableBodyCell>
									<Checkbox
										checked={$click_id === d.id}
										on:change={() => handleClick(d.id)}
									/>
								</TableBodyCell>
								<TableBodyCell>{d.id}</TableBodyCell>
								<TableBodyCell
									>{#if d.category !== new_category}{d.sentence}{:else}<div
											class="sentence-edit-box large"
										>
											{#if $editID === d.id}
												<Textarea
													{...textareaprops}
													bind:value={$editSentence}
													disabled={$isEditing}
												/>
												<div>
													<button
														class="table-button edit"
														disabled={$isEditing ||
															$editSentence ===
																"" ||
															$editSentence.trim() ===
																d.sentence}
														title={`save changes`}
														on:click={() =>
															saveEdit(
																d.id,
																d.sentence,
															)}
													>
														{#if $isEditing}<Spinner
																size={"4"}
															/>{:else}<CheckOutline
															/>{/if}
													</button>
													<button
														class="table-button edit"
														title={`cancel edit`}
														on:click={cancelEdit}
														disabled={$isEditing}
													>
														<CloseOutline />
													</button>
												</div>
											{:else}
												{d.sentence}
												<div class="side-by-side">
													<button
														class="table-button edit"
														title={`edit sentence`}
														disabled={$isEditing}
														on:click={() =>
															startEditing(
																d.id,
																d.sentence,
															)}
													>
														<PenOutline /></button
													>
													<button
														class="table-button edit"
														title={`delete sentence`}
														disabled={$isEditing}
														on:click={() =>
															deleteSentence(
																d.id,
															)}
													>
														<TrashBinOutline
														/></button
													>
												</div>{/if}
										</div>{/if}</TableBodyCell
								>
								<TableBodyCell>{d.length}</TableBodyCell>
								<TableBodyCell
									><div
										class="circle"
										style={`background-color: rgb(${getCategoryColor(d.category, $categoryStore.categoryInfo)})`}
									></div>
									{d.category}
									{#if d.method}({d.method === "SAE"
											? "Concept"
											: d.method === "INTERP"
												? "Interpolate"
												: d.method === "MANUAL"
													? "Manual"
													: d.method}){/if}</TableBodyCell
								>
							</div>
						</TableBodyRow>
					{/each}
				</TableBody>
				<button
					on:click={scrollToTop}
					class="back-to-top"
					title="Back to top"
					class:hide={!showBackToTop || !$isAccordionOpen}
					><ArrowUpOutline /></button
				>
			</Table>
		</AccordionItem>
	</Accordion>
</section>

<style lang="scss">
	#table-section {
		position: absolute;
		width: 100%;
		bottom: 0;
		background: white;
		z-index: 3;
		transition: 0.3s;

		&.demo {
			:global(#table-search) {
				width: 100% !important;
			}

			:global(#clear-search) {
				right: 2rem;
			}
		}

		.drag-handle {
			width: 100%;
			height: 10px;
			background: var(--color-border-light);
			cursor: ns-resize;
			position: absolute;
			opacity: 0.8;
			top: -10px;
			left: 0;
			touch-action: none; // Prevents scrolling on touch devices
			transition: 0.3s;
		}

		span[slot="header"] {
			font-weight: 500;
			transition: 0.3s;
			color: var(--color-text);
		}
		#num-results {
			margin-top: -1.5rem;
			margin-left: 1rem;
			margin-right: 1rem;
			font-size: smaller;

			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 0.5rem;
			margin-bottom: 0.25rem;

			p {
				margin-bottom: 0;
				font-size: 12px;
			}

			.slider-contain {
				display: flex;
				gap: 0.5rem;
				align-items: center;
			}

			#slider {
				margin-top: 0;

				p {
					font-size: 12px;
				}
			}

			:global(.rangeSlider) {
				font-size: 0.5rem !important;
				width: 200px !important;
			}
		}

		:global(#table-search) {
			width: calc(100% - 10.25rem) !important;
		}

		:global(#clear-search) {
			right: 12rem;
		}

		:global(button[button-type="add"]) {
			position: absolute;
			z-index: 2;
			right: 1rem;
			transform: translateY(9%);
			transition: 0.3s;
			padding-top: 0.7rem;
			padding-bottom: 0.7rem;
		}
		:global(button[button-type="add"] svg) {
			width: 1rem;
			margin-right: 0.25rem;
		}

		:global(.search-results) {
			transition: 0.3s;
			height: var(--table-height);
			max-height: var(--table-height);
		}

		:global(.table-item) {
			width: 100%;
			display: flex;
			justify-content: space-between;
			padding: 1rem;
			align-items: center;
			border-top: 1px solid var(--color-border);
			border-bottom: none;
			transition: 0.3s;
			font-size: 14px;

			&:hover {
				opacity: 0.7;
			}

			:global(svg) {
				transform: rotate(180deg);
				transition: 0.3s;
				width: 10px;
			}
		}

		.back-to-top {
			position: fixed;
			bottom: 1rem;
			right: 1rem;
			background-color: rgb(255, 255, 255, 0.8);
			color: var(--color-accent);
			border: 1px solid var(--color-border);
			border-radius: 0.5rem;
			width: 2rem;
			height: 2rem;
			display: flex;
			justify-content: center;
			align-items: center;
			transition: 0.3s;
			z-index: 1000;

			:global(svg) {
				width: 1rem;
			}
			&:hover {
				opacity: 0.8;
				background-color: var(--color-accent-lightest);
				border-color: var(--color-accent-light);
			}
		}

		:global(div[role="tooltip"]) {
			max-width: 700px;
		}
	}
</style>
