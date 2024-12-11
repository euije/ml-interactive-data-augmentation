<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->
 
 <script lang="ts">
	import { Checkbox } from "flowbite-svelte";
	import {
		categoryStore,
		openCategories,
		leftSidebarOpen,
		sortCategoriesBy,
	} from "../../store";
	import { onMount } from "svelte";
	import { new_category } from "../../utils/consts";

	let filterElement: HTMLElement;
	let prevClickedParent: HTMLElement;

	// sort categories by count, sentence length, or default
	$: myCategoryInfo =
		$sortCategoriesBy === "count"
			? $categoryStore.categoryInfoByCount
			: $sortCategoriesBy === "sentence length"
				? $categoryStore.categoryInfoByLength
				: $categoryStore.categoryInfo;

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Node;

		// filter button
		const buttons = document.querySelectorAll(
			'#category-buttons button[button-type="filter-button"]',
		);
		const button = Array.from(buttons).find((b) => b.contains(target));

		// category sort by dropdown
		const dropdowns = document.querySelectorAll(
			"#category-buttons .dropdown-inner",
		);
		const dropdown = Array.from(dropdowns).find((d) => d.contains(target));

		// select all buttons
		const selectAll = document.querySelectorAll(
			".category-visualization .span-select span",
		);
		const selectAllButton = Array.from(selectAll).find((s) =>
			s.contains(target),
		);

		// category visualization
		const categoryViz = document.querySelector(".chart-container");

		// track parent to detect dropdown item clicks
		const targetParent = target.parentElement;
		const targetParentParent = targetParent?.parentElement;
		prevClickedParent = targetParentParent as HTMLElement;

		if (
			(!categoryViz ||
				(filterElement &&
					!filterElement.contains(target) &&
					!button &&
					!dropdown &&
					!selectAllButton &&
					categoryViz &&
					!categoryViz.contains(target) &&
					prevClickedParent &&
					prevClickedParent.id !== "categorySortOptions")) &&
			$openCategories
		) {
			// close dropdown if clicked outside all relevant elements
			openCategories.set(false);
		}
	}

	onMount(() => {
		// select all categories if none are selected
		const url = new URL(window.location.href);
		const urlSelectedCategories =
			url.searchParams.get("selectedCategories");
		if (!urlSelectedCategories) {
			categoryStore.selectAll();
		}
		document.addEventListener("click", handleClickOutside);
		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	});
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions a11y-mouse-events-have-key-events -->
<div
	id="category-filter"
	bind:this={filterElement}
	class:left-pad={leftSidebarOpen}
>
	<div class="dropdown" class:hide={!$openCategories}>
		<p class="select-options">
			<b>Total: {$categoryStore.categories.length} categories</b>
			<span class="span-select"
				><span
					on:click={categoryStore.selectAll}
					class:noclick={$categoryStore.selectedCategories.length ===
						$categoryStore.categories.length}>select all</span
				>
				<b>|</b>
				<span
					on:click={categoryStore.clear}
					class:noclick={$categoryStore.selectedCategories.length ===
						0}>deselect all</span
				></span
			>
		</p>
		<div class="dropdown-inner">
			{#each myCategoryInfo as category}
				<div class="dropdown-item">
					<Checkbox
						color={"secondary"}
						checked={$categoryStore.selectedCategories.includes(
							category.name,
						)}
						on:change={() =>
							categoryStore.changeSelectedCategory(category.name)}
						><p>
							{#if category.name === new_category}<span
									class="emphasis">{category.name}</span
								>{:else}{category.name}{/if} (<span
								style={`font-size: smaller; font-family: var(--font-mono); color: rgb(${category.color})`}
								>{category.count}</span
							>)
						</p></Checkbox
					>
				</div>
			{/each}
		</div>
	</div>
</div>

<style lang="scss">
	#category-filter {
		display: flex;
		flex-direction: column;
		transition: 0.5s;
		position: absolute;
		top: 10rem;
		left: 1rem;

		&.left-pad {
			padding-left: 320px;
		}

		.dropdown {
			background-color: rgb(255, 255, 255, 0.9);
			border: 1px solid var(--color-border);
			border-radius: 0.5rem;
			padding: 0.5rem;
			transition: 0.3s;
			position: absolute;
			z-index: 100;
			top: 0;
			width: max-content;

			&.hide {
				visibility: hidden;
				pointer-events: none;
				opacity: 0;
			}

			.select-options {
				font-size: smaller;
				margin-left: 0.5rem;
				margin-right: 0.5rem;
				margin-top: 0.25rem;
				display: flex;
				justify-content: space-between;
				align-items: center;

				b {
					color: var(--color-text);
				}

				.span-select span {
					text-decoration: underline;
					cursor: pointer;
					transition: 0.3s;

					&:hover {
						opacity: 0.7;
					}

					&.noclick {
						pointer-events: none;
						opacity: 0.5;
					}
				}
			}
			.dropdown-inner {
				display: grid;
				grid-template-columns: repeat(4, 1fr);

				.dropdown-item {
					display: flex;
					max-width: 225px;
					align-items: baseline;
					padding: 0.25rem 0.5rem;

					:global(label) {
						font-weight: unset;
						font-size: smaller;
						align-items: flex-start;
					}

					:global(input) {
						margin-top: 2px;
						&:hover {
							border-color: #3f3f46 !important;
						}
					}
				}
			}
		}
	}
</style>
