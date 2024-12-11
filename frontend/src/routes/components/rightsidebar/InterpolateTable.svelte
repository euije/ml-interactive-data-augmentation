<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import {
		Checkbox,
		Spinner,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		TableSearch,
	} from "flowbite-svelte";
	import {
		all_data,
		categoryStore,
		hover_id,
		result_ids,
		searchTerm,
		selectedIntPoint,
		sentLengthRange,
		tableSortBy,
		tableSortDirection,
		nearestIntPoints,
		click_id,
		isGenerating,
		isMounting,
		selectedSentenceTypes,
	} from "../../store";
	import { getCategoryColor } from "../../utils/helpers";
	import { CloseOutline, SortOutline } from "flowbite-svelte-icons";
	import { new_category } from "../../utils/consts";

	export let tableType = "search";

	const clearSearch = () => {
		searchTerm.set("");
	};

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

	$: selectedPoint = $all_data.filter((d) => d.id === $selectedIntPoint);

	$: suggestedPoints = $all_data.filter((d) =>
		$nearestIntPoints.includes(d.id),
	);

	// filter data based on search term
	$: filtered_data =
		tableType === "suggested" && $click_id !== -1
			? suggestedPoints
			: $all_data.filter((d) =>
					d.sentence
						? d.sentence
								.toLowerCase()
								.includes($searchTerm.toLowerCase()) &&
							$categoryStore.selectedCategories.includes(
								d.category,
							) &&
							d.length >= $sentLengthRange[0] &&
							d.length <= $sentLengthRange[1] &&
							(($selectedSentenceTypes.includes("new") &&
								d.category === new_category) ||
								($selectedSentenceTypes.includes("old") &&
									d.category !== new_category)) &&
							d.id !== $click_id
						: true,
				);

	// set result_ids to be the ids of the filtered data
	$: result_ids.set(filtered_data.map((d) => d.id));

	// sort the data based on the $tableSortBy and $tableSortDirection
	$: sortedData = [...filtered_data].sort((a, b) => {
		if ($tableSortBy === "selected") {
			const aSelected = $selectedIntPoint === a.id;
			const bSelected = $selectedIntPoint === b.id;
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

	// only show the first 100 results
	const maxShow = 100;
	$: display_data =
		tableType !== "selected" ? sortedData.slice(0, maxShow) : selectedPoint;

	// handle mouse events
	const handleMouseEnter = (id: number) => {
		if ($hover_id === id) return;
		hover_id.set(id);
	};

	const handleMouseLeave = () => {
		if ($hover_id === -1) return;
		hover_id.set(-1);
	};

	const handleClick = (newId: number) => {
		if ($selectedIntPoint === newId) {
			selectedIntPoint.set(-1);
		} else {
			selectedIntPoint.set(newId);
		}
	};

	function findTableElement(): HTMLElement | null {
		return document.querySelector(".interpolate-table .my-table.main-rows");
	}

	$: if ($isGenerating && display_data) {
		let tableElement = findTableElement();
		if (tableElement) {
			tableElement.scrollTo({ top: 0, behavior: "smooth" });
		}
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<section
	class="feature-table interpolate-table"
	class:no-pointer-events={$isGenerating}
>
	{#if tableType === "search"}
		<TableSearch
			placeholder="Search for sentence..."
			bind:inputValue={$searchTerm}
			divClass="my-table"
		>
			<button
				id="clear-search"
				on:click={clearSearch}
				title="clear search"
				class:hide={$searchTerm === ""}><CloseOutline /></button
			>
			<TableHead>
				<TableHeadCell
					on:click={() => sortTable("selected")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						Select <SortOutline />
					</div></TableHeadCell
				>
				<TableHeadCell
					on:click={() => sortTable("id")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						ID <SortOutline />
					</div></TableHeadCell
				>
				<TableHeadCell
					on:click={() => sortTable("sentence")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						Sentence <SortOutline />
					</div></TableHeadCell
				>
				<TableHeadCell
					on:click={() => sortTable("length")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						Length <SortOutline />
					</div></TableHeadCell
				>
				<TableHeadCell
					on:click={() => sortTable("category")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						Category <SortOutline />
					</div></TableHeadCell
				>
			</TableHead>
		</TableSearch>
	{:else}
		<Table divClass="my-table">
			<TableHead>
				<TableHeadCell
					on:click={() => sortTable("selected")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						Select <SortOutline />
					</div></TableHeadCell
				>
				<TableHeadCell
					on:click={() => sortTable("id")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						ID <SortOutline />
					</div></TableHeadCell
				>
				<TableHeadCell
					on:click={() => sortTable("sentence")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						Sentence <SortOutline />
					</div></TableHeadCell
				>
				<TableHeadCell
					on:click={() => sortTable("length")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						Length <SortOutline />
					</div></TableHeadCell
				>
				<TableHeadCell
					on:click={() => sortTable("category")}
					disabled={display_data.length === 0}
					><div class="th-inner">
						Category <SortOutline />
					</div></TableHeadCell
				>
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
			{#each display_data as d (d.id)}
				<TableBodyRow>
					<div
						title="click to select sentence"
						class="table-cell-wrapper"
						class:selected={$selectedIntPoint === d.id}
						on:mouseenter={() => handleMouseEnter(d.id)}
						on:mouseleave={handleMouseLeave}
						on:click={() => handleClick(d.id)}
					>
						<TableBodyCell>
							<Checkbox checked={$selectedIntPoint === d.id} />
						</TableBodyCell>
						<TableBodyCell>{d.id}</TableBodyCell>
						<TableBodyCell>{d.sentence}</TableBodyCell>
						<TableBodyCell>{d.length}</TableBodyCell>
						<TableBodyCell
							><div
								class="circle"
								style={`background-color: rgb(${getCategoryColor(d.category, $categoryStore.categoryInfo)})`}
							></div>
							{d.category}</TableBodyCell
						>
					</div>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</section>

<style lang="scss">
	.interpolate-table {
		:global(.p-4:has(#table-search)) {
			padding-top: 0;
		}

		:global(.relative.mt-1:has(#table-search)) {
			margin-top: 0;
		}

		:global(#spinner) {
			height: 100% !important;
			max-height: 180px;
		}

		:global(#spinner svg) {
			height: 100%;
		}

		:global(th) {
			pointer-events: auto;
		}

		:global(th:hover) {
			color: var(--color-accent);
		}

		.circle {
			width: 0.4rem;
			height: 0.4rem;
			border-radius: 50%;
			margin-right: 3px;
			margin-bottom: 1px;
		}

		#clear-search {
			right: 1rem;
		}
	}
</style>
