<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import {
		Checkbox,
		Popover,
		Spinner,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		TableSearch,
		Textarea,
	} from "flowbite-svelte";
	import {
		activeInterpolateTab,
		activeTab,
		all_data,
		categoryStore,
		click_id,
		dataset,
		datasetInfo,
		editID,
		editSentence,
		hover_id,
		interpolatePrompt,
		isAccordionOpen,
		isEditing,
		isGenerating,
		isMounting,
		llmPrompt,
		old_size,
		openAugmentationSection,
		openAugMethod,
		resultSearchTerm,
		selectedGeneratedRows,
		selectedIntPoint,
		topFeatures,
		x_max,
		x_min,
		y_max,
		y_min,
	} from "../../store";
	import {
		ArrowRightOutline,
		CheckOutline,
		ClipboardOutline,
		CloseOutline,
		InfoCircleOutline,
		PenOutline,
	} from "flowbite-svelte-icons";
	import { onMount } from "svelte";
	import type { DatasetInfo, FeatureWeight } from "../../utils/types";
	import {
		countWords,
		getCategoryColor,
		normalizeVal,
		splitLines,
	} from "../../utils/helpers";

	// sentences to display
	$: childSentences = $all_data.filter((d) => d.og_id === $click_id);
	$: displaySentences = childSentences
		.filter((d) =>
			d.sentence.toLowerCase().includes($resultSearchTerm.toLowerCase()),
		)
		.sort((a, b) => b.id - a.id);

	// handle hover inside sentence table
	const handleMouseEnter = (id: number) => {
		if ($hover_id === id) return;
		hover_id.set(id);
	};

	const handleMouseLeave = () => {
		if ($hover_id === -1) return;
		hover_id.set(-1);
	};

	let hoveredInfo: any = null;
	let tooltipX = 0;
	let tooltipY = 0;

	let hoverType = "";

	// handle hover for features
	const featureEnter = (event: MouseEvent, id: number, type: string) => {
		hoverType = type;
		hoveredInfo =
			type === "feature"
				? $topFeatures.find((f) => f.id === id)
				: $all_data.find((f) => f.id === id);
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	};

	const featureLeave = () => {
		hoveredInfo = null;
		hoverType = "";
	};

	function handleMouseMove(event: MouseEvent) {
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	}

	// handle loading/scrolling inside sentence table
	let tableWrapper: HTMLElement;
	let wrapperHeight = 0;

	onMount(() => {
		if (tableWrapper) {
			wrapperHeight = tableWrapper.clientHeight;

			const resizeObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					wrapperHeight = entry.contentRect.height;
				}
			});

			resizeObserver.observe(tableWrapper);

			return () => {
				resizeObserver.disconnect();
			};
		}
	});

	function findTableElement(): HTMLElement | null {
		return document.querySelector(
			".sentence-table .my-table.generated-rows tbody",
		);
	}

	$: if ($isMounting && displaySentences) {
		let tableElement = findTableElement();
		if (tableElement) {
			tableElement.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	// add/remove sentence from selected rows
	const addSelectedSentence = (id: number) => {
		if ($selectedGeneratedRows.includes(id)) {
			selectedGeneratedRows.set(
				$selectedGeneratedRows.filter((s) => s !== id),
			);
		} else {
			selectedGeneratedRows.set([...$selectedGeneratedRows, id]);
		}
	};

	let copiedId = -1;

	const copyPrompt = (prompt: string, id: number) => {
		// copy llm prompt
		copiedId = id;
		llmPrompt.set(prompt);
		openAugmentationSection.set("augment");
		openAugMethod.set("llm");
		setTimeout(() => {
			copiedId = -1;
		}, 3000);
	};

	const copySelectedFeatures = (features: FeatureWeight[], id: number) => {
		// copy selected features
		copiedId = id;
		const feature_ids = features.map((f) => f.id);
		// update $topFeatures based on selected rows
		topFeatures.set(
			$topFeatures.map((feature) =>
				feature_ids.includes(feature.id)
					? {
							...feature,
							weight: [
								features.find((f) => f.id === feature.id)
									?.weight || 0,
							],
						}
					: { ...feature, weight: [0] },
			),
		);
		openAugmentationSection.set("augment");
		openAugMethod.set("sae");
		if ($activeTab !== "selected") {
			activeTab.set("selected");
		}
		setTimeout(() => {
			copiedId = -1;
		}, 3000);
	};

	const copyIntPoint = (int_pt: number, id: number) => {
		// copy + update $selectedIntPoint
		copiedId = id;
		// update $selectedIntPoint based on selected rows
		selectedIntPoint.set(int_pt);
		openAugmentationSection.set("augment");
		openAugMethod.set("interpolate");
		if ($activeInterpolateTab !== "suggested") {
			activeInterpolateTab.set("suggested");
		}
		setTimeout(() => {
			copiedId = -1;
		}, 3000);
	};

	const copyIntSentence = (int_sentence: string, id: number) => {
		// copy + update $interpolatePrompt
		copiedId = id;
		interpolatePrompt.set(int_sentence);
		openAugmentationSection.set("augment");
		openAugMethod.set("interpolate");
		if ($activeInterpolateTab !== "prompt") {
			activeInterpolateTab.set("prompt");
		}
		setTimeout(() => {
			copiedId = -1;
		}, 3000);
	};

	const clearSearch = () => {
		// clear search term
		resultSearchTerm.set("");
	};

	const goToSentence = (id: number, type: string = "none") => {
		// navigate to new clicked sentence
		const sent = $all_data.find((d) => d.id === id);
		if (sent) {
			if (type !== "int") {
				if (sent.prompt) {
					// copy prompt
					copyPrompt(sent.prompt, id);
				} else if (sent.added_features) {
					// copy features
					copySelectedFeatures(sent.added_features, id);
				} else if (sent.int_pt) {
					// copy interpolation point
					copyIntPoint(sent.int_pt, id);
				} else if (sent.int_sentence) {
					// go to child sentence
					copyIntSentence(sent.int_sentence, id);
				}
			} else {
				openAugmentationSection.set("augment");
				openAugMethod.set("interpolate");
			}
			// go to child sentence
			click_id.set(id);
		}
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
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events-->
<section
	class="feature-table sentence-table"
	class:condensed={$isAccordionOpen}
>
	<p class="default-msg" class:hide={childSentences.length > 0}>
		No sentences yet...
	</p>
	<div class="info-text" class:hide={childSentences.length === 0}>
		<p class="top-text">
			<b
				>Total: {childSentences.length} sentences generated <InfoCircleOutline
					id="sentence-table-tooltip"
					class={"info-tooltip"}
				/></b
			>
			<Popover triggeredBy="#sentence-table-tooltip" placement={"right"}>
				To delete sentences, use the checkboxes to the left. To copy a
				sentence's prompt, concepts, or interpolation point for further
				augmentations, press the corresponding buttons in the "Details"
				column. Clicking a sentence ID will go to that child sentence
				and copy its augmentation details. Clicking an interpolation
				point ID will go to the corresponding sentence. Hover over a
				concept, prompt, or interpolation point to view more details.
			</Popover>
			<span class="key-text">
				<span
					><span class="square" /><span class="key-label"
						>newest generations</span
					></span
				>
				<span
					><span class="square selected" /><span class="key-label"
						>selected sentences</span
					></span
				>
			</span>
		</p>
	</div>
	<div
		class="table-wrapper"
		bind:this={tableWrapper}
		class:hide={childSentences.length === 0}
		class:no-pointer-events={$isGenerating}
		class:no-scroll={wrapperHeight < 340}
	>
		<TableSearch
			divClass="my-table"
			placeholder="Search for sentence..."
			bind:inputValue={$resultSearchTerm}
		>
			<button
				id="clear-search"
				on:click={clearSearch}
				title="clear search"
				class:hide={$resultSearchTerm === ""}><CloseOutline /></button
			>
			<TableHead>
				<TableHeadCell>Select</TableHeadCell>
				<TableHeadCell>ID</TableHeadCell>
				<TableHeadCell>Sentence</TableHeadCell>
				<TableHeadCell>Method</TableHeadCell>
				<TableHeadCell>Details</TableHeadCell>
			</TableHead>
		</TableSearch>
		<Table hoverable={true} divClass="my-table generated-rows">
			<div
				id="spinner"
				class="text-center"
				class:hide={!$isMounting && !$isGenerating}
			>
				<Spinner size="48" />
			</div>
			<TableBody>
				{#each displaySentences as sentence}
					<TableBodyRow>
						<div
							class="table-cell-wrapper"
							class:selected={$selectedGeneratedRows.includes(
								sentence.id,
							)}
							class:new={!$selectedGeneratedRows.includes(
								sentence.id,
							) && sentence.id >= $old_size}
							on:mouseenter={() => handleMouseEnter(sentence.id)}
							on:mouseleave={handleMouseLeave}
						>
							<TableBodyCell>
								<Checkbox
									checked={$selectedGeneratedRows.includes(
										sentence.id,
									)}
									on:change={() =>
										addSelectedSentence(sentence.id)}
								/>
							</TableBodyCell>
							<TableBodyCell>
								<button
									class="table-button"
									title={`go to sentence ${sentence.id}`}
									on:click={() => goToSentence(sentence.id)}
									>{sentence.id} <ArrowRightOutline /></button
								>
							</TableBodyCell>
							<TableBodyCell
								><div class="sentence-edit-box">
									{#if $editID === sentence.id}
										<Textarea
											{...textareaprops}
											bind:value={$editSentence}
											disabled={$isEditing}
										/>
										<div>
											<button
												class="table-button edit"
												disabled={$isEditing ||
													$editSentence === "" ||
													$editSentence.trim() ===
														sentence.sentence}
												title={`save changes`}
												on:click={() =>
													saveEdit(
														sentence.id,
														sentence.sentence,
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
										{sentence.sentence}<button
											class="table-button edit"
											title={`edit sentence`}
											disabled={$isEditing}
											on:click={() =>
												startEditing(
													sentence.id,
													sentence.sentence,
												)}
										>
											<PenOutline /></button
										>{/if}
								</div></TableBodyCell
							>
							<TableBodyCell
								>{sentence.method === "SAE"
									? "concept"
									: sentence.method}</TableBodyCell
							>
							<TableBodyCell
								>{#if sentence.added_features}
									<button
										class="table-button feature"
										title={`copy concepts`}
										on:click={() => {
											if (sentence.added_features)
												copySelectedFeatures(
													sentence.added_features,
													sentence.id,
												);
										}}
										disabled={copiedId === sentence.id}
									>
										{copiedId === sentence.id
											? "copied!"
											: "concepts"}
										<ClipboardOutline /></button
									>
									{#each sentence.added_features as ft}
										<p
											class="feature-text feature"
											on:mouseenter={(e) =>
												featureEnter(
													e,
													ft.id,
													"feature",
												)}
											on:mouseleave={featureLeave}
											on:mousemove={handleMouseMove}
										>
											{ft.id}:
											<span
												class="monospace added-feature"
												class:positive={ft.weight > 0}
												>{ft.weight > 0
													? "+"
													: ""}{ft.weight}</span
											>
										</p>{/each}{:else if sentence.prompt}
									<button
										class="table-button"
										on:mouseenter={(e) =>
											featureEnter(
												e,
												sentence.id,
												"prompt",
											)}
										on:mouseleave={featureLeave}
										on:mousemove={handleMouseMove}
										title={`copy prompt`}
										disabled={copiedId === sentence.id}
										on:click={() => {
											if (sentence.prompt)
												copyPrompt(
													sentence.prompt,
													sentence.id,
												);
										}}
										>{copiedId === sentence.id
											? "copied!"
											: "prompt"}
										<ClipboardOutline /></button
									>{:else if sentence.int_pt || sentence.int_sentence}
									<div class="button-contain">
										<button
											class="table-button feature"
											on:mouseenter={(e) => {
												if (
													sentence.int_pt ||
													sentence.int_sentence
												)
													featureEnter(
														e,
														sentence.int_pt
															? sentence.int_pt
															: sentence.id,
														"interpolate",
													);
											}}
											on:mouseleave={featureLeave}
											on:mousemove={handleMouseMove}
											on:click={() => {
												if (sentence.int_pt) {
													copyIntPoint(
														sentence.int_pt,
														sentence.id,
													);
												} else if (
													sentence.int_sentence
												) {
													copyIntSentence(
														sentence.int_sentence,
														sentence.id,
													);
												}
											}}
											title={sentence.int_pt
												? `copy interpolation point`
												: `copy interpolation sentence`}
											disabled={copiedId === sentence.id}
											>{copiedId === sentence.id
												? "copied!"
												: sentence.int_pt
													? sentence.int_pt
													: "new sent"}<ClipboardOutline
											/>
										</button>
										{#if sentence.int_pt}
											<button
												class="table-button feature icon"
												title={`go to interpolation point`}
												on:click={() => {
													if (sentence.int_pt)
														goToSentence(
															sentence.int_pt,
															"int",
														);
												}}
											>
												<ArrowRightOutline /></button
											>
										{/if}
									</div>
									<p class="feature-text feature">
										weight: <span
											class="monospace added-feature weight"
											>{sentence.weight}</span
										><InfoCircleOutline
											id={`sent-table-weight-tooltip-${sentence.id}`}
											class={"info-tooltip table"}
										/>
										<Popover
											triggeredBy={`#sent-table-weight-tooltip-${sentence.id}`}
											placement={"left"}
										>
											Sentences with <b>lower</b> weights
											are typically closer to the original
											parent sentence, while sentences
											with
											<b>higher</b> weights are typically closer
											to the second selected interpolation
											sentence.
										</Popover>
									</p>
								{/if}</TableBodyCell
							>
						</div>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>
	{#if hoveredInfo}
		<div
			class="tooltip"
			style="left: {tooltipX}px; top: {tooltipY}px;"
			class:expanded={hoverType === "interpolate" && hoveredInfo.int_pt}
		>
			<p>
				<span style="font-weight:500; color: white"
					>{hoverType === "feature"
						? hoveredInfo.summary
						: hoverType === "prompt"
							? hoveredInfo.prompt
							: hoveredInfo.int_sentence
								? hoveredInfo.int_sentence
								: hoveredInfo.sentence}</span
				>
			</p>
			{#if hoverType === "interpolate" && hoveredInfo.int_pt}
				<p>
					category: <span
						style={`color:rgb(${getCategoryColor(hoveredInfo.category, $categoryStore.categoryInfo)})`}
						>{hoveredInfo.category}</span
					>
				</p>
			{/if}
		</div>
	{/if}
</section>

<style lang="scss">
	.sentence-table {
		margin-left: -1rem;
		width: calc(100% + 2rem);
		position: relative;

		.table-wrapper {
			&.no-scroll {
				:global(.my-table) {
					overflow-y: hidden;
				}
			}
		}

		:global(#spinner) {
			height: 100% !important;
			max-height: 300px;
		}

		:global(#spinner svg) {
			height: 100%;
		}

		:global(.my-table) {
			transition: 0.3s;
			max-height: 300px;
		}

		.hide {
			:global(.my-table) {
				height: 0 !important;
				transform: translateY(100%);
			}
		}

		:global(tbody) {
			display: block;
			max-height: 300px;
			overflow-y: auto;
		}

		:global(td:first-child) {
			text-align: center;
		}

		.tooltip {
			transform: translateX(-75%) translateY(-100%) !important;
			width: max-content !important;

			&.expanded {
				transform: translateX(-100%) translateY(-100%) !important;

				p {
					color: white;
				}
			}
		}

		:global(.p-4:has(#table-search)) {
			padding-top: 0;
		}

		:global(.relative.mt-1:has(#table-search)) {
			margin-top: 0;
		}

		.info-text {
			margin: 0 1rem 0.5rem 1rem;

			.top-text {
				margin-top: 0 !important;
				font-size: small;
			}
		}
	}
</style>
