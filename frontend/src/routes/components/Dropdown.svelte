<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import { ChevronDownOutline } from "flowbite-svelte-icons";
	import { createEventDispatcher, onMount } from "svelte";
	import type { DropdownItem } from "../utils/types";

	export let options: string[] | DropdownItem[] = [];
	export let selected: string;

	let isOpen = false;
	let dropdownElement: HTMLElement;

	// props
	export let placeholder: string = "Select option...";
	export let title: string = "select option";
	export let id: string = "";
	export let label: string = "";
	export let hideOverflow: boolean = false;
	export let small: boolean = false;
	export let long: boolean = false;
	export let right: boolean = false;

	const dispatch = createEventDispatcher();

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	const cutoff = 12; // max number of characters to display
	$: selectedDisplay =
		!hideOverflow || (selected && selected.length <= cutoff)
			? selected
			: selected.slice(0, cutoff) + "...";

	function selectOption(option: string | DropdownItem) {
		// change selected option
		selected = typeof option === "string" ? option : option.label;
		const selectedVal = typeof option === "string" ? option : option.value;
		isOpen = false;
		dispatch("change", selectedVal);
	}

	function handleClickOutside(event: MouseEvent) {
		// Close dropdown when clicking outside
		if (
			dropdownElement &&
			!dropdownElement.contains(event.target as Node) &&
			isOpen
		) {
			isOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener("click", handleClickOutside);
		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	});
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
<div class="dropdown" {id} class:small class:long class:right>
	{#if label}
		<b>{label}</b>
	{/if}
	<div bind:this={dropdownElement} class="dropdown-inner">
		<div
			class="selected"
			on:click={toggleDropdown}
			class:opened={isOpen}
			{title}
		>
			<span class="option-name">{selectedDisplay || placeholder}</span>
			<span class="arrow" class:rotate={isOpen}
				><ChevronDownOutline /></span
			>
		</div>
		{#if isOpen}
			<ul class="options">
				{#each options as option}
					<li
						on:click={() => selectOption(option)}
						class:no-click={typeof option === "string"
							? selected === option
							: selected === option.value}
					>
						{typeof option === "string" ? option : option.label}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style lang="scss">
	.dropdown {
		position: relative;
		width: 100%;
		font-size: small;

		.dropdown-inner {
			position: relative;

			.option-name {
				width: max-content;
			}
		}

		&.right {
			position: absolute;
			right: 1rem;
			z-index: 1;
			display: flex;
			align-items: center;
			gap: 0.5rem;
			width: auto;

			.selected {
				width: 120px;
				padding: 0.5rem 0.5rem 0.5rem 0.75rem;
			}

			b {
				margin: 0;
				font-weight: 500;
				width: max-content;
			}
		}

		&.long {
			font-size: smaller;
			display: flex;
			align-items: center;
			gap: 0.5rem;
			width: auto;

			b {
				margin: 0;
				font-weight: 500;
				width: max-content;
			}

			.selected {
				padding: 0.2rem 0.4rem 0.2rem 0.6rem;
				width: 170px;
			}
		}

		&.small {
			font-size: x-small;
			display: grid;
			grid-template-columns: 1fr 115px;
			align-items: center;
			gap: 0.25rem;

			b {
				margin: 0;
				font-weight: 400;
			}

			.selected {
				font-size: 20px;
				padding: 0 0.5rem 0 0.55rem;
				display: grid;
				grid-template-columns: 80px 1fr;
				line-height: 1.45rem;
			}
		}

		b {
			display: block;
			margin-bottom: 0.25rem;
		}

		.selected {
			border: 1px solid var(--color-border-dark);
			border-radius: 0.5rem;
			display: flex;
			justify-content: space-between;
			align-items: center;

			&:hover {
				border-color: var(--color-accent-med);
			}

			&.opened {
				border-color: var(--color-accent);
				border-radius: 0.5rem 0.5rem 0 0;
			}

			.arrow {
				transition: 0.3s;
				margin-left: 0.5rem;

				&.rotate {
					transform: rotate(180deg);
				}
			}
		}

		.selected,
		li {
			cursor: pointer;
			padding: 0.4rem 0.5rem 0.4rem 0.75rem;
			transition: 0.3s;
		}

		.options {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: white;
			border: 1px solid var(--color-border-dark);
			border-top: none;
			border-radius: 0 0 0.5rem 0.5rem;
			list-style: none;
			padding: 0;
			margin: 0;
			max-height: 200px;
			overflow-y: auto;
			transition: 0.3s;
			z-index: 2;
		}

		li {
			&.no-click {
				pointer-events: none;
				opacity: 0.5;
			}
			&:hover {
				background-color: var(--color-border-light);
			}
		}
	}
</style>
