<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script>
	import logo from "$lib/images/logo.png";
	import {
		Navbar,
		NavBrand,
		NavLi,
		NavUl,
		NavHamburger,
		Button,
		Dropdown,
		DropdownItem,
	} from "flowbite-svelte";
	import { ChevronDownOutline, GithubSolid } from "flowbite-svelte-icons";
	import {
		searchTerm,
		categoryStore,
		sentLengthRange,
		minSentLength,
		maxSentLength,
		colorBy,
		sortCategoriesBy,
		resetViewTrigger,
		resetViewDisabled,
		resetSentLengthTrigger,
		tableSortBy,
		tableSortDirection,
		click_id,
		modalType,
		showModal,
		sentenceTypeInfo,
		selectedSentenceTypes,
		tableHeight,
		parentOverlay,
	} from "../store";
	import { minTableHeight } from "../utils/consts";

	$: all_cats = $sentenceTypeInfo.map((c) => c.name);

	// track if reset button should be disabled
	$: resetDisabled =
		$searchTerm === "" &&
		$categoryStore.selectedCategories.length ===
			$categoryStore.categories.length &&
		$selectedSentenceTypes.length === all_cats.length &&
		$sentLengthRange[0] === $minSentLength &&
		$sentLengthRange[1] === $maxSentLength &&
		$colorBy === "default" &&
		$sortCategoriesBy === "count" &&
		$tableSortBy === "id" &&
		$tableSortDirection === 1 &&
		$tableHeight === minTableHeight &&
		$parentOverlay === false &&
		$click_id === -1 &&
		$resetViewDisabled;

	const resetAll = () => {
		// reset all filters
		searchTerm.set("");
		categoryStore.selectAll();
		selectedSentenceTypes.set(all_cats);
		resetSentLengthTrigger.set(true);
		colorBy.set("default");
		sortCategoriesBy.set("count");
		tableSortBy.set("id");
		tableSortDirection.set(1);
		tableHeight.set(minTableHeight);
		parentOverlay.set(false);
		click_id.set(-1);
		resetViewTrigger.set(true);
	};

	const handleReset = () => {
		// reset entire system
		modalType.set("clearStorage");
		showModal.set(true);
	};
</script>

<div>
	<Navbar fluid class="navbar py-1 md:py-0">
		<NavBrand href="/">
			<img src={logo} class="me-3 h-5 logo" alt="Flowbite Logo" />
		</NavBrand>
		<div id="button-container" class:test={resetDisabled}>
			<Button
				size="xs"
				color="dark"
				title="clear search"
				disabled={resetDisabled}
				on:click={resetAll}>Reset All</Button
			>
			<Button
				size="xs"
				color="light"
				title="clear search"
				disabled={$searchTerm === ""}
				on:click={() => searchTerm.set("")}>Clear Search</Button
			>
			<Button
				size="xs"
				color="light"
				title="clear clicked point"
				disabled={$click_id === -1}
				on:click={() => {
					click_id.set(-1);
				}}>Clear Clicked Point</Button
			>
		</div>
		<NavHamburger />
		<NavUl>
			<NavLi class="cursor-pointer admin hide">
				Admin<ChevronDownOutline class="ms-2 inline" />
			</NavLi>
			<Dropdown class="w-44 z-20">
				<DropdownItem class="cursor-pointer" on:click={handleReset}
					>Reset dataset</DropdownItem
				>
			</Dropdown>
			<NavLi
				href="https://github.com/apple/ml-interactive-data-augmentation"
				class="def-weight"
				target="_blank"><GithubSolid /></NavLi
			>
		</NavUl>
	</Navbar>
</div>

<style lang="scss">
	:global(nav ul) {
		padding-top: 0.85rem !important;
		padding-bottom: 0.85rem !important;
	}

	:global(nav button[aria-label="Open main menu"]) {
		padding-top: 0.35rem;
		padding-bottom: 0.35rem;
	}
	.logo {
		margin-left: 0.5rem;
	}

	#button-container {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		transition: 0.3s;
	}

	@media (max-width: 768px) {
		#button-container {
			margin-right: 0;
		}
	}

	:global(div[role="link"]) {
		transition: 0.3s;
	}

	:global(div[role="link"].hide) {
		display: none;
	}

	:global(#default-banner) {
		transition: 0.3s;
		transform: translateY(120%) translateX(-50%);
		z-index: 10;
		width: 300px;
		margin-left: 50%;
		border: 0;
		border-radius: 0.5rem;
		color: var(--color-accent);
		border: 1px solid var(--color-border);
	}

	:global(#default-banner svg) {
		width: 1rem;
	}
</style>
