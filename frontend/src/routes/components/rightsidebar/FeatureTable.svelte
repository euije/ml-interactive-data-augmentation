<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import {
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Table,
		Spinner,
		TableSearch,
	} from "flowbite-svelte";

	import {
		topFeatures,
		isAccordionOpen,
		isMounting,
		featureSearchTerm,
		similarFeatures,
		isGenerating,
	} from "../../store";
	import RangeSlider from "svelte-range-slider-pips";
	import { onMount } from "svelte";
	import { CloseOutline, RefreshOutline } from "flowbite-svelte-icons";

	export let tableType = "results";

	// slider values
	let minWeight = -1;
	let maxWeight = 1;

	// constants for display
	const maxFeatures = 10;
	const maxSearchFeatures = 100;

	// computed values
	$: top10Features = $topFeatures.slice(0, maxFeatures);
	$: simFeatures = $topFeatures.filter((feature) =>
		$similarFeatures.includes(feature.id),
	);
	$: selectedFeatures = $topFeatures.filter(
		(feature) => feature.weight[0] !== 0,
	);
	$: searchResults = $topFeatures
		.filter((feature) =>
			feature.summary
				.toLowerCase()
				.includes($featureSearchTerm.toLowerCase()),
		)
		.slice(0, maxSearchFeatures);
	$: displayFeatures =
		tableType === "top"
			? top10Features
			: tableType === "selected"
				? selectedFeatures
				: tableType === "similar"
					? simFeatures
					: searchResults;

	// update weight of feature
	function updateWeight(id: number, newWeight: number) {
		topFeatures.set(
			$topFeatures.map((feature) =>
				feature.id === id
					? { ...feature, weight: [newWeight] }
					: feature,
			),
		);
	}

	// handle loading/scrolling back to top inside table
	let selectedFeatureWrapper: HTMLElement;
	let wrapperHeight = 0;

	onMount(() => {
		if (selectedFeatureWrapper) {
			wrapperHeight = selectedFeatureWrapper.clientHeight;

			const resizeObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					wrapperHeight = entry.contentRect.height;
				}
			});

			resizeObserver.observe(selectedFeatureWrapper);

			return () => {
				resizeObserver.disconnect();
			};
		}
	});

	const clearSearch = () => {
		featureSearchTerm.set("");
	};

	function findTableElement(): HTMLElement | null {
		return document.querySelector(".feature-table .my-table.main-rows");
	}

	$: if (($isGenerating || $isMounting) && $topFeatures) {
		let tableElement = findTableElement();
		if (tableElement) {
			tableElement.scrollTo({ top: 0, behavior: "smooth" });
		}
	}
</script>

<section
	class="feature-table"
	class:condensed={$isAccordionOpen}
	bind:this={selectedFeatureWrapper}
	class:no-scroll={wrapperHeight < 180}
	class:no-pointer-events={$isGenerating}
>
	{#if tableType === "results"}
		<TableSearch
			divClass="my-table"
			placeholder="Search for concept..."
			bind:inputValue={$featureSearchTerm}
		>
			<button
				id="clear-search"
				on:click={clearSearch}
				title="clear search"
				class:hide={$featureSearchTerm === ""}><CloseOutline /></button
			>
			<TableHead>
				<TableHeadCell>Reset</TableHeadCell>
				<TableHeadCell>Select Weight</TableHeadCell>
				<TableHeadCell>ID</TableHeadCell>
				<TableHeadCell>Summary</TableHeadCell>
				<TableHeadCell>Score</TableHeadCell>
			</TableHead>
		</TableSearch>
	{:else}
		<Table divClass="my-table">
			<TableHead>
				<TableHeadCell>Reset</TableHeadCell>
				<TableHeadCell>Select Weight</TableHeadCell>
				<TableHeadCell>ID</TableHeadCell>
				<TableHeadCell>Summary</TableHeadCell>
				<TableHeadCell>Score</TableHeadCell>
			</TableHead>
		</Table>
	{/if}
	<Table hoverable={true} divClass="my-table main-rows">
		<div
			id="spinner"
			class="text-center"
			class:hide={!$isGenerating && !$isMounting}
		>
			<Spinner size="48" />
		</div>
		<TableBody>
			{#each displayFeatures as feature}
				<TableBodyRow>
					<div
						class="table-cell-wrapper"
						class:positive={feature.weight[0] > 0}
						class:negative={feature.weight[0] < 0}
					>
						<TableBodyCell
							><button
								class="go-to-button small"
								title="reset feature"
								disabled={feature.weight[0] === 0}
								on:click={() => updateWeight(feature.id, 0)}
								><RefreshOutline /></button
							></TableBodyCell
						>
						<TableBodyCell>
							<div id="slider">
								<p>-</p>
								<RangeSlider
									float
									values={feature.weight}
									min={minWeight}
									max={maxWeight}
									step={0.5}
									on:stop={({ detail }) =>
										updateWeight(feature.id, detail.value)}
								/>
								<p>+</p>
							</div>
						</TableBodyCell>
						<TableBodyCell>{feature.id}</TableBodyCell>
						<TableBodyCell>{feature.summary}</TableBodyCell>
						<TableBodyCell
							>{feature.activation.toFixed(2)}</TableBodyCell
						>
					</div>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</section>

<style lang="scss">
	.feature-table {
		&.no-scroll {
			:global(.my-table) {
				overflow-y: hidden;
			}
		}
		:global(#spinner) {
			height: 100% !important;
			max-height: 180px;
		}

		:global(#spinner svg) {
			height: 100%;
		}
		:global(.p-4:has(#table-search)) {
			padding-top: 0;
		}

		:global(.relative.mt-1:has(#table-search)) {
			margin-top: 0;
		}

		#slider {
			margin-top: 0;

			p {
				font-size: 12px;
				font-weight: bold;
				color: var(--color-accent);

				&:first-child {
					color: var(--color-accent-2);
				}
			}
		}

		:global(.rangeSlider) {
			font-size: 0.5rem !important;
		}

		#clear-search {
			right: 1rem;
			transform: translateY(-35%);
		}
	}
</style>
