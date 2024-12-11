<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import {
		CompressOutline,
		ExpandOutline,
		ListOutline,
	} from "flowbite-svelte-icons";
	import {
		hoveredCategory,
		openCategories,
		sortCategoriesBy,
		categoryStore,
		selectedSentLengthRange,
		maxCategoryCount,
		hideVisualizations,
		hoveredSentenceType,
	} from "../../store";
	import { Button } from "flowbite-svelte";
	import Dropdown from "../Dropdown.svelte";
	import { new_category } from "../../utils/consts";

	$: totalSentences = $categoryStore.categoryInfo.reduce(
		(sum, category) => sum + category.count,
		0,
	);

	// sort categories by count, sentence length, or default
	$: myCategoryInfo =
		$sortCategoriesBy === "count"
			? $categoryStore.categoryInfoByCount
			: $sortCategoriesBy === "sentence length"
				? $categoryStore.categoryInfoByLength
				: $categoryStore.categoryInfo;

	const toggleOpenCategories = () => {
		openCategories.set(!$openCategories);
	};

	let hoveredCategoryInfo: any = null;
	let tooltipX = 0;
	let tooltipY = 0;

	// handle mouse events
	function handleMouseEnter(event: MouseEvent, category: any) {
		hoveredCategoryInfo = category;
		hoveredCategory.set(category.name);
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	}

	function handleMouseLeave() {
		hoveredCategoryInfo = null;
		hoveredCategory.set("");
	}

	function handleMouseMove(event: MouseEvent) {
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	}

	// isolate category on double click
	const isolateCategory = (category: string) => {
		categoryStore.updateSelectedCategories((currentSelected) => {
			if (
				currentSelected.length === 1 &&
				currentSelected.includes(category)
			) {
				return $categoryStore.categories;
			} else {
				return [category];
			}
		});
	};

	// filter categories by sentence length
	$: activeCategories = $categoryStore.categoryInfo.filter((cat) => {
		return (
			cat.minLength <= $selectedSentLengthRange[1] &&
			cat.maxLength >= $selectedSentLengthRange[0]
		);
	});

	const sortOptions = ["default", "count", "sentence length"];
	const maxChars = 8;

	let expanded = false;

	const toggleExpand = () => {
		expanded = !expanded;
	};

	$: numCategories = $categoryStore.categoryInfo.length;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div class="category-visualization" class:vis-hide={$hideVisualizations}>
	<div id="category-buttons" class:opened={$openCategories}>
		<Dropdown
			small={true}
			label="sort by"
			options={sortOptions}
			bind:selected={$sortCategoriesBy}
			id="categorySortOptions"
		/>
		<Button
			size="xs"
			color="light"
			on:click={toggleOpenCategories}
			button-type="filter-button"
			><ListOutline /> View category list</Button
		>
	</div>
	<div class="chart-outer" class:hide={$hideVisualizations}>
		<div class="chart-container-outer">
			<button
				on:click={toggleExpand}
				class="expand-button"
				title={expanded ? "collapse" : "expand"}
				>{#if expanded}<CompressOutline />{:else}<ExpandOutline
					/>{/if}</button
			>
			<div class="chart-container" class:expanded>
				{#each myCategoryInfo as category}
					<div class="category-row">
						<span
							class="category-name"
							class:emphasis={category.name === new_category}
							>{category.name.length > maxChars
								? category.name.slice(0, maxChars) + "..."
								: category.name}</span
						>
						<div
							class="bar-container"
							class:faded={($selectedSentLengthRange[0] === 0 &&
								!$categoryStore.selectedCategories.includes(
									category.name,
								)) ||
								($selectedSentLengthRange[0] !== 0 &&
									!activeCategories.includes(category)) ||
								($hoveredSentenceType !== "" &&
									$hoveredSentenceType !== "old" &&
									category.name !== new_category) ||
								($hoveredSentenceType === "old" &&
									category.name === new_category)}
							on:mouseenter={(e) => handleMouseEnter(e, category)}
							on:mouseleave={handleMouseLeave}
							on:mousemove={handleMouseMove}
							on:click={() =>
								categoryStore.changeSelectedCategory(
									category.name,
								)}
							on:dblclick={() => isolateCategory(category.name)}
						>
							<div
								class="bar"
								style="width: {Math.max(
									(category.count / $maxCategoryCount) * 100,
									2,
								)}%; background-color: rgb({category.color});"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
	<div class="caption-container" class:extra-space={!$hideVisualizations}>
		<p class="emphasis">total: {numCategories} categories</p>
		<div class="span-select">
			<span
				id="select-all-categories"
				class="select"
				on:click={categoryStore.selectAll}
				class:noclick={$categoryStore.selectedCategories.length ===
					$categoryStore.categories.length}>select all</span
			>
			<b>|</b>
			<span
				id="deselect-all-categories"
				class="select"
				on:click={categoryStore.clear}
				class:noclick={$categoryStore.selectedCategories.length === 0}
				>deselect all</span
			>
		</div>
	</div>

	{#if hoveredCategoryInfo}
		<div class="tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
			<p>
				<span style="font-weight:500">{hoveredCategoryInfo.name}</span>: {hoveredCategoryInfo.count}
				sentences (mean length: {hoveredCategoryInfo.avgLength.toFixed(
					2,
				)} words)
			</p>
			<p>
				{((hoveredCategoryInfo.count / totalSentences) * 100).toFixed(
					2,
				)}% of dataset
			</p>
		</div>
	{/if}
</div>

<style lang="scss">
	.category-visualization {
		.bar-container {
			&:hover {
				.bar {
					opacity: 0.7;
				}
			}

			&.faded {
				.bar {
					opacity: 0.2;
				}

				&:hover {
					.bar {
						opacity: 0.4;
					}
				}
			}
		}
		.expand-button {
			position: absolute;
			bottom: 0rem;
			right: 0rem;
			background-color: var(--color-bg) !important;
			color: var(--color-text);
			border: 1px solid var(--color-border);
			border-radius: 0.5rem;
			width: 1.6rem !important;
			height: 1.6rem !important;
			display: flex;
			align-items: center;
			transition: 0.3s;
			z-index: 9;

			:global(svg) {
				width: 0.75rem !important;
				margin-left: 2px;
			}
			&:hover {
				opacity: 0.8;
				background-color: var(--color-accent-lightest) !important;
				border-color: var(--color-accent-light);
				color: var(--color-accent);
			}
		}
	}
</style>
