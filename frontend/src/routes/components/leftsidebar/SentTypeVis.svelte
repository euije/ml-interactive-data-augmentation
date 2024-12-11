<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import { Button, ButtonGroup } from "flowbite-svelte";
	import {
		selectedSentLengthRange,
		hideVisualizations,
		sentenceTypeInfo,
		selectedSentenceTypes,
		all_data,
		hoveredSentenceType,
		hoveredCategory,
		DEMO_MODE,
	} from "../../store";
	import {
		broad_sent_groups,
		new_category,
		new_sent_groups,
		demo_new_sent_groups,
	} from "../../utils/consts";

	// New variables for sentence type visualization
	let onlyNewSentences = false;
	$: allSentenceCount = $all_data.length;
	$: newSentenceCount = $all_data.filter(
		(sentence) => sentence.category === new_category,
	).length;
	$: totalSentences = !onlyNewSentences ? allSentenceCount : newSentenceCount;

	$: active_cats = !onlyNewSentences
		? broad_sent_groups
		: $DEMO_MODE
			? demo_new_sent_groups
			: new_sent_groups;

	$: activeSentenceInfo = $sentenceTypeInfo.filter((cat) =>
		active_cats.includes(cat.name),
	);

	let hoveredCategoryInfo: any = null;
	let tooltipX = 0;
	let tooltipY = 0;

	// Handle mouse events
	function handleMouseEnter(event: MouseEvent, category: any) {
		hoveredCategoryInfo = category;
		hoveredSentenceType.set(category.name);
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	}

	function handleMouseLeave() {
		hoveredCategoryInfo = null;
		hoveredSentenceType.set("");
	}

	function handleMouseMove(event: MouseEvent) {
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	}

	// Isolate a category by double clicking
	const isolateCategory = (category: string) => {
		selectedSentenceTypes.update((currentSelected) => {
			if (
				currentSelected.length === 1 &&
				currentSelected.includes(category)
			) {
				return active_cats;
			} else {
				return [category];
			}
		});
	};

	// Filter active categories based on selected sentence length range
	$: activeCategories = $sentenceTypeInfo.filter(
		(cat) =>
			cat.minLength <= $selectedSentLengthRange[1] &&
			cat.maxLength >= $selectedSentLengthRange[0],
	);

	// Change selected sentence type
	const changeSelectedSentenceType = (sentenceType: string) => {
		if ($selectedSentenceTypes.includes(sentenceType)) {
			selectedSentenceTypes.set(
				$selectedSentenceTypes.filter((type) => type !== sentenceType),
			);
		} else {
			selectedSentenceTypes.set([
				...$selectedSentenceTypes,
				sentenceType,
			]);
		}
	};

	const selectAll = () => {
		selectedSentenceTypes.set(active_cats);
	};

	const deselectAll = () => {
		selectedSentenceTypes.set([]);
	};

	$: {
		if (onlyNewSentences !== undefined) {
			selectAll();
		}
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div
	class="category-visualization sent-type-visualization"
	class:vis-hide={$hideVisualizations}
>
	<div class="button-contain">
		<div class="mini-legend">
			{#each activeSentenceInfo as category}
				<div
					class="legend-item"
					title="click to toggle"
					class:faded={!$selectedSentenceTypes.includes(
						category.name,
					) ||
						($selectedSentLengthRange[0] === 0 &&
							!$selectedSentenceTypes.includes(category.name)) ||
						($selectedSentLengthRange[0] !== 0 &&
							!activeCategories.includes(category)) ||
						($hoveredCategory !== "" &&
							$hoveredCategory !== new_category &&
							category.name !== "old") ||
						($hoveredCategory === new_category &&
							category.name === "old")}
					on:click={() => changeSelectedSentenceType(category.name)}
					on:dblclick={() => isolateCategory(category.name)}
					on:mouseenter={(e) => handleMouseEnter(e, category)}
					on:mouseleave={handleMouseLeave}
					on:mousemove={handleMouseMove}
				>
					<div
						class="legend-color"
						style={`background-color: rgb(${category.color})`}
					/>
					<p class="legend-text">
						{category.name === "sae"
							? "con"
							: category.name === "interp"
								? "int"
								: category.name === "manual"
									? "man"
									: category.name}: {category.count}
					</p>
				</div>
			{/each}
		</div>
		<ButtonGroup class="*:!ring-primary-700 button-group">
			<Button
				size="xs"
				disabled={!onlyNewSentences}
				on:click={() => (onlyNewSentences = false)}>all</Button
			>
			<Button
				size="xs"
				disabled={onlyNewSentences}
				on:click={() => (onlyNewSentences = true)}>new</Button
			>
		</ButtonGroup>
	</div>
	<div class="chart-outer" class:hide={$hideVisualizations}>
		<div class="chart-container-outer">
			<div class="chart-container">
				<div class="category-row">
					<div class="bar-container">
						{#each activeSentenceInfo as category}
							<div
								class="bar"
								style="width: {category.count === 0
									? 0
									: Math.max(
											(category.count / totalSentences) *
												100,
											2,
										)}%; background-color: rgb({category.color});"
								class:faded={($selectedSentLengthRange[0] ===
									0 &&
									!$selectedSentenceTypes.includes(
										category.name,
									)) ||
									($selectedSentLengthRange[0] !== 0 &&
										!activeCategories.includes(category)) ||
									($hoveredCategory !== "" &&
										$hoveredCategory !== new_category &&
										category.name !== "old") ||
									($hoveredCategory === new_category &&
										category.name === "old")}
								on:mouseenter={(e) =>
									handleMouseEnter(e, category)}
								on:mouseleave={handleMouseLeave}
								on:mousemove={handleMouseMove}
								on:click={() =>
									changeSelectedSentenceType(category.name)}
								on:dblclick={() =>
									isolateCategory(category.name)}
							></div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="caption-container" class:extra-space={!$hideVisualizations}>
		<p class="emphasis">total: {totalSentences} sentences</p>
		<div class="span-select">
			<span
				id="select-all-categories"
				class="select"
				on:click={selectAll}
				class:noclick={$selectedSentenceTypes.length ===
					active_cats.length}>select all</span
			>
			<b>|</b>
			<span
				id="deselect-all-categories"
				class="select"
				on:click={deselectAll}
				class:noclick={$selectedSentenceTypes.length === 0}
				>deselect all</span
			>
		</div>
	</div>

	{#if hoveredCategoryInfo}
		<div class="tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
			<p>
				<span style="font-weight:500"
					>{hoveredCategoryInfo.name === "sae"
						? "concept"
						: hoveredCategoryInfo.name === "interp"
							? "interpolate"
							: hoveredCategoryInfo.name}</span
				>: {hoveredCategoryInfo.count}
				sentences (mean length: {hoveredCategoryInfo.avgLength.toFixed(
					2,
				)} words)
			</p>
			<p>
				{((hoveredCategoryInfo.count / totalSentences) * 100).toFixed(
					2,
				)}% of {!onlyNewSentences ? "dataset" : "new sentences"}
			</p>
		</div>
	{/if}
</div>

<style lang="scss">
	.sent-type-visualization {
		.category-row {
			display: block !important;
		}

		.bar-container {
			display: flex !important;
			border-radius: 0.5rem;
			height: 0.75rem !important;
			overflow: hidden;
			background: var(--color-border-light);
		}

		.bar {
			border-radius: 0 !important;

			&:hover {
				opacity: 0.7;
			}

			&.faded {
				opacity: 0.2;

				&:hover {
					opacity: 0.4;
				}
			}
		}

		.mini-legend {
			display: flex;
			align-items: center;
			gap: 0.65rem;

			p {
				font-size: smaller;
			}

			.legend-item {
				display: flex;
				align-items: center;
				gap: 0.25rem;
				transition: 0.3s;
				cursor: pointer;

				&:hover {
					opacity: 0.7;
				}

				&.faded {
					opacity: 0.2;
					&:hover {
						opacity: 0.4;
					}
				}
			}

			.legend-color {
				width: 0.6rem;
				height: 0.6rem;
				border-radius: 0.2rem;
			}

			.legend-text {
				font-size: x-small;
			}
		}

		:global(.button-group) {
			width: 4.5rem;
		}
		:global(.button-group button) {
			background-color: transparent !important;
			height: 1.15rem;
			transition: 0.3s;
			color: var(--color-gray);
			padding: 0.1rem 0.4rem 0.1rem 0.3rem !important;

			&:hover {
				background-color: var(--color-border-light) !important;
				color: var(--color-dark-gray);
			}

			&:first-child {
				border-top-left-radius: 0.4rem;
				border-bottom-left-radius: 0.4rem;
			}

			&:last-child {
				border-top-right-radius: 0.4rem;
				border-bottom-right-radius: 0.4rem;
			}
		}

		:global(
				.button-group
					button:not([button-type="deselect-button"])[disabled]
			) {
			opacity: 1;
			border-color: var(--color-accent);
			color: var(--color-accent);
			z-index: 1;
		}

		.button-contain {
			margin-top: 0.5rem;
			margin-bottom: 0.5rem;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
	}
</style>
