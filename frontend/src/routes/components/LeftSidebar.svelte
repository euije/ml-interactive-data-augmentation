<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import {
		ChevronRightOutline,
		ChevronLeftOutline,
		DownloadOutline,
		FilterOutline,
		ClipboardListOutline,
		InfoCircleOutline,
	} from "flowbite-svelte-icons";
	import {
		leftSidebarOpen,
		all_data,
		colorBy,
		categoryStore,
		openCategories,
		dataset,
		isMounting,
		minSentLength,
		maxSentLength,
		isAccordionOpen,
		showModal,
		filename,
		modalType,
		datasetInfo,
		hideVisualizations,
		parentOverlay,
		parentToggleDisabled,
		DEMO_MODE,
	} from "../store";
	import Dropdown from "./Dropdown.svelte";
	import CategoryVis from "./leftsidebar/CategoryVis.svelte";
	import SentLengthVis from "./leftsidebar/SentLengthVis.svelte";
	import {
		Button,
		Accordion,
		AccordionItem,
		Toggle,
		Popover,
	} from "flowbite-svelte";
	import type { DatasetInfo } from "../utils/types";
	import { new_category } from "../utils/consts";
	import SentTypeVis from "./leftsidebar/SentTypeVis.svelte";

	const toggleSidebar = () => {
		// toggle sidebar open/close
		leftSidebarOpen.set(!$leftSidebarOpen);
		if ($openCategories) {
			openCategories.set(false);
		}
	};

	/* UPDATE HERE IF YOU ADD A NEW DATASET */
	const dataOptions = ["wiki", "chi", "hcslab", "cps", "chi2025"]; // dataset options
	/* END UDPATE*/

	const colorOptions = [
		// color by options
		"default",
		"sentence type",
		"category",
		"sentence length",
	];

	// add new sentences to the dataset (if needed) when dataset changes
	const addNewSentences = async (
		newSentences: string[],
		dataset: string,
		total_sentences: number,
	) => {
		try {
			const response = await fetch("/api/addSentences", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sentences: newSentences,
					dataset: dataset,
					total_sentences: total_sentences,
				}),
			});
			const result = await response.json();
		} catch (error) {
			console.error("Error adding new sentences:", error);
		}
	};

	// update displayed dataset
	const updateDataset = async (newDataset: string) => {
		isMounting.set(true);
		const data = datasetInfo.load(newDataset);
		if (data) {
			datasetInfo.set(data as DatasetInfo);
			const new_sentences = $all_data
				.filter((d) => d.category === new_category)
				.map((d) => d.sentence);
			if (new_sentences.length > 0) {
				const total_sentences = $all_data.length;
				addNewSentences(new_sentences, newDataset, total_sentences);
			}
		} else {
			try {
				const response = await fetch("/api/updateDataset", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ dataset: newDataset }),
				});
				const result = await response.json();
				const newDatasetInfo: DatasetInfo = {
					// set og values too
					...result,
					og_x_min: result.x_min,
					og_x_max: result.x_max,
					og_y_min: result.y_min,
					og_y_max: result.y_max,
				};
				datasetInfo.set(newDatasetInfo as DatasetInfo);
			} catch (error) {
				console.error("Error updating dataset:", error);
			}
		}
		setTimeout(() => {
			isMounting.set(false);
		}, 100);
	};

	// derived stats for current dataset
	$: numDataPoints = $all_data.length;
	$: numCategories = $categoryStore.categories.length;
	$: avgPointsPerCategory = $all_data.length / numCategories;
	$: minPointsPerCategory = Math.min(
		...$categoryStore.categoryInfo.map((c) => c.count),
	);
	$: maxPointsPerCategory = Math.max(
		...$categoryStore.categoryInfo.map((c) => c.count),
	);
	$: avgSentenceLength =
		$all_data.reduce((acc, d) => acc + d.length, 0) / $all_data.length;
	$: originalSentences = $all_data.filter((d) => d.category !== new_category);
	$: numNewSentences = $all_data.length - originalSentences.length;
	$: numOldSentences = originalSentences.length;

	const downloadJSON = async () => {
		// download dataset as JSON
		isMounting.set(true);
		const data = $datasetInfo;
		const json = JSON.stringify(data, null, 2); // Pretty-print JSON with 2-space indentation
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;

		// get date and time for filename
		const now = new Date();
		const date = now.toLocaleDateString("en-CA").replace(/:/g, "-"); // Format: YYYY-MM-DD
		const time = now.toLocaleTimeString("en-GB").replace(/:/g, "-"); // Format: HH-MM-SS
		const fileName = `${$dataset}_${date}_${time}.json`;
		filename.set(fileName);

		// also save the file with the same name in the outputs folder in this project
		try {
			const response = await fetch("/api/saveAndDownload", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					dataset: $dataset,
					data: data,
					filename: $filename,
				}),
			});
		} catch (error) {
			console.error("Error saving and downloading file:", error);
		}

		a.download = $filename;
		a.click();
		URL.revokeObjectURL(url); // Clean up the URL object

		// Show a popup message
		setTimeout(() => {
			isMounting.set(false);
			modalType.set("download");
			showModal.set(true);
		}, 100);
	};

	// (NOT CURRENTLY USED) reproject points with new UMAP
	const reprojectPoints = async () => {
		isMounting.set(true);
		const curDataset = $dataset;
		try {
			const response = await fetch("/api/reprojectPoints", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dataset: curDataset }),
			});
			const result = await response.json();
			const curData = $all_data;
			const newPoints = result.new_data;
			const newData = curData.map((d, i) => {
				return {
					...d,
					x: newPoints[i].x,
					y: newPoints[i].y,
				};
			});
			const newDatasetInfo = {
				...$datasetInfo,
				all_data: newData,
				x_min: result.x_min,
				x_max: result.x_max,
				y_min: result.y_min,
				y_max: result.y_max,
			};
			datasetInfo.set(newDatasetInfo as DatasetInfo);
		} catch (error) {
			console.error("Error updating dataset:", error);
		}
		setTimeout(() => {
			isMounting.set(false);
		}, 100);
	};
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<section class="sidebar" id="left-sidebar" class:collapsed={!$leftSidebarOpen}>
	<button
		class="icon-tab"
		on:click={toggleSidebar}
		title={($leftSidebarOpen ? "collapse" : "expand") + " sidebar"}
	>
		{#if $leftSidebarOpen}<ChevronLeftOutline />
		{:else}<ChevronRightOutline />{/if}
	</button>
	<div
		class="sidebar-body"
		class:hidden={!$leftSidebarOpen}
		class:opened={$openCategories}
		class:lessHeight={$isAccordionOpen}
	>
		<p class="emphasis">Data Options</p>
		<div class="dropdown-container">
			<Dropdown
				options={dataOptions}
				bind:selected={$dataset}
				placeholder={"Select dataset..."}
				label={"Dataset"}
				title={"select dataset"}
				on:change={() => updateDataset($dataset)}
			/>
			<Dropdown
				options={colorOptions}
				bind:selected={$colorBy}
				placeholder={"Select color by..."}
				label={"Color by"}
				title={"select color by"}
				hideOverflow={true}
			/>
		</div>
		<Accordion id="my-accordion" flush multiple>
			<AccordionItem tab-name="filter">
				<p
					id="filter-tab"
					slot="header"
					class="accordion-title emphasis"
				>
					<!-- svelte-ignore missing-declaration -->
					<FilterOutline />Filters + Visualizations
				</p>
				<div class="filters stats">
					<div class="toggles" class:hide={$DEMO_MODE}>
						<Toggle
							size="small"
							toggle-type="small"
							bind:checked={$hideVisualizations}
							>Hide visualizations</Toggle
						>
						<div
							class:hide={$parentToggleDisabled}
							style={"transition: 0.3s"}
						>
							<Toggle
								size="small"
								toggle-type="small"
								bind:checked={$parentOverlay}
								>Parent overlay</Toggle
							>
						</div>
					</div>
					<div class="vis-container">
						<b
							>Sentence type <InfoCircleOutline
								id="sentence-type-tooltip"
								class={"info-tooltip"}
							/></b
						>
						<Popover
							triggeredBy="#sentence-type-tooltip"
							placement={"right"}
						>
							Click the legend or bars to toggle a sentence type /
							double click to (un)isolate.
						</Popover>
						<SentTypeVis />
					</div>
					<div class="vis-container">
						<b
							>Sentence category <InfoCircleOutline
								id="sentence-cat-tooltip"
								class={"info-tooltip"}
							/></b
						>
						<Popover
							triggeredBy="#sentence-cat-tooltip"
							placement={"right"}
						>
							Click to toggle a category / double click to
							(un)isolate. Scroll to view all categories, or use
							the category list to filter.
						</Popover>
						<CategoryVis />
					</div>
					<div class="vis-container">
						<b
							>Sentence length <InfoCircleOutline
								id="sentence-length-tooltip"
								class={"info-tooltip"}
							/></b
						>
						<Popover
							triggeredBy="#sentence-length-tooltip"
							placement={"right"}
						>
							Hover to see sentence length counts / use slider to
							select range.
						</Popover>
						<SentLengthVis />
					</div>
				</div>
			</AccordionItem>
			<AccordionItem tab-name="stats" open={numDataPoints > 0}>
				<p
					id="stats-tab"
					slot="header"
					class="accordion-title emphasis"
				>
					<ClipboardListOutline />Overall Stats
				</p>
				<div class="stats">
					<p>Sentence counts:</p>
					<div class="group">
						<div class="first">
							<p>Total</p>
							<pre>{numDataPoints}</pre>
						</div>
						<p class="no-above">
							(Old: {numOldSentences}, New: {numNewSentences})
						</p>
					</div>

					<p>Category counts:</p>
					<div class="group">
						<div class="first">
							<p>Total</p>
							<pre>{numCategories}</pre>
						</div>
						<p class="no-above">
							(Old: {numNewSentences > 0
								? numCategories - 1
								: numCategories}, New: {numNewSentences > 0
								? 1
								: 0})
						</p>
					</div>

					<p>Sentences per category:</p>
					<div class="group">
						<div class="first">
							<p>Mean</p>
							<pre>{avgPointsPerCategory.toFixed(2)}</pre>
						</div>
						<p class="no-above">
							(Min: {minPointsPerCategory}, Max: {maxPointsPerCategory})
						</p>
					</div>

					<p>Sentence length:</p>
					<div class="group">
						<div class="first">
							<p>Mean</p>
							<pre>{avgSentenceLength.toFixed(2)}</pre>
						</div>
						<p class="no-above">
							(Min: {$minSentLength}, Max: {$maxSentLength})
						</p>
					</div>
				</div>
			</AccordionItem>
		</Accordion>

		<!-- <Button
			size="xs"
			color="light"
			button-type="download"
			on:click={reprojectPoints}
			><RefreshOutline /> Reproject points</Button
		> -->
		<Button
			size="xs"
			color="light"
			button-type="download"
			button-top="less"
			on:click={downloadJSON}><DownloadOutline /> Download data</Button
		>
	</div>
</section>

<style lang="scss">
	.sidebar-body {
		.vis-container {
			&:not(:nth-child(2)) {
				margin-top: 1.25rem;
			}

			&:nth-child(2) {
				margin-top: 0.5rem;
			}
		}

		.dropdown-container {
			display: flex;
			gap: 0.75rem;
		}
		.stats {
			font-size: small;
			margin-top: 0.8rem;
			p,
			b {
				font-size: small;
			}

			p {
				&:not(:first-child) {
					margin-top: 0.5rem;
				}
			}

			.toggles {
				display: flex;
				gap: 0.75rem;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 0.75rem;

				&.hide {
					display: none;
				}
			}

			.group {
				margin-bottom: 0.25rem;
				display: grid;
				grid-template-columns: 1fr auto;
				align-items: center;
				gap: 0.7rem;

				div {
					display: flex;
					align-items: center;
					column-gap: 0.4rem;
				}
				p {
					margin-bottom: 0;
					opacity: 0.7;
					font-size: 0.75rem;

					&.no-above {
						margin-top: 0;
					}
				}

				pre {
					font-size: smaller;
				}
			}
		}
		:global(button[button-type="download"]) {
			margin-top: 1rem;
			width: 100%;
			background-color: transparent;
			transition: 0.3s;

			&:hover {
				background-color: var(--color-border-light);
			}
		}

		:global(button[button-top="less"]) {
			margin-top: 0.5rem;
		}

		:global(button[button-type="download"] svg) {
			margin-right: 0.5rem;
			width: 14px;
		}

		:global(.peer:checked ~ .peer-checked\:bg-primary-600) {
			background-color: var(--color-text);
		}
	}
</style>
