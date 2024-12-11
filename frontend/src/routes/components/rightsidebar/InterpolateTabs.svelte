<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import { Button, TabItem, Tabs, Textarea } from "flowbite-svelte";
	import {
		activeInterpolateTab,
		result_ids,
		nearestIntPoints,
		selectedIntPoint,
		interpolatePrompt,
		isGenerating,
		isMounting,
		click_id,
		openAugMethod,
	} from "../../store";
	import InterpolateTable from "./InterpolateTable.svelte";
	import { CloseOutline } from "flowbite-svelte-icons";

	const changeTab = (newTab: string) => {
		// change interpolate tab
		if ($activeInterpolateTab === newTab) return;
		activeInterpolateTab.set(newTab);
	};

	const resetSelectedIntPoint = () => {
		// reset selected interpolation point
		selectedIntPoint.set(-1);
	};

	const resetInterpolatePrompt = () => {
		// clear interpolation prompt
		interpolatePrompt.set("");
	};

	let textareaprops = {
		// textarea properties
		id: "sentence",
		name: "sentence",
		label: "Your sentence",
		rows: 2,
		placeholder:
			'e.g., "tell me about a time when you encountered a difficult situation at work".',
	};
</script>

<div class="suggestion-tabs interpolate-tabs">
	<Tabs tabStyle="underline">
		<TabItem
			open={$activeInterpolateTab === "selected"}
			on:click={() => changeTab("selected")}
			title="Selected sentence"
		>
			<p
				class="default-msg features"
				class:hide={$selectedIntPoint !== -1}
			>
				No selected sentence yet...
			</p>
			<div
				class="feature-table-wrapper"
				class:hide={$selectedIntPoint === -1}
			>
				<div class="gen-header">
					<span>Your selected sentence:</span>
					<Button
						size="xs"
						color="light"
						button-type="go-to-parent"
						title="reset all features"
						disabled={$selectedIntPoint === -1}
						on:click={resetSelectedIntPoint}
						><CloseOutline /> unselect sentence</Button
					>
				</div>
				<InterpolateTable tableType="selected" />
			</div>
		</TabItem>
		<TabItem
			open={$activeInterpolateTab === "suggested"}
			on:click={() => changeTab("suggested")}
			title="Suggested sentences"
		>
			<p
				class="default-msg features"
				class:hide={$nearestIntPoints.length > 0}
			>
				Draw an arrow to receive sentence suggestions...
			</p>
			<div
				class="feature-table-wrapper"
				class:hide={$nearestIntPoints.length === 0}
			>
				<div class="gen-header info-text">
					<span>Top 20 nearest neighbors to arrow end:</span>
					<div class="top-text">
						<span class="key-text">
							<span
								><span class="square selected" /><span
									class="key-label">selected sentence</span
								></span
							></span
						>
						<Button
							size="xs"
							color="light"
							button-type="go-to-parent"
							title="reset all features"
							disabled={$selectedIntPoint === -1}
							on:click={resetSelectedIntPoint}
							><CloseOutline /> unselect sentence</Button
						>
					</div>
				</div>
				<InterpolateTable tableType="suggested" />
			</div>
		</TabItem>
		<TabItem
			open={$activeInterpolateTab === "search"}
			on:click={() => changeTab("search")}
			title="General sentence search"
		>
			<div class="gen-header info-text">
				<b>Total: {$result_ids.length} sentences</b>
				<div class="top-text">
					<span class="key-text">
						<span
							><span class="square selected" /><span
								class="key-label">selected sentence</span
							></span
						></span
					>
					<Button
						size="xs"
						color="light"
						button-type="go-to-parent"
						title="reset all features"
						disabled={$selectedIntPoint === -1}
						on:click={resetSelectedIntPoint}
						><CloseOutline /> unselect sentence</Button
					>
				</div>
			</div>
			<InterpolateTable />
		</TabItem>
		<TabItem
			open={$activeInterpolateTab === "prompt"}
			on:click={() => changeTab("prompt")}
			title="Add interpolation sentence"
		>
			<div class="gen-header info-text prompt">
				<b>Write your own sentence to interpolate with:</b>
				<Button
					size="xs"
					color="light"
					button-type="go-to-parent"
					title="clear sentence"
					disabled={$interpolatePrompt === ""}
					on:click={resetInterpolatePrompt}
					><CloseOutline /> clear sentence</Button
				>
			</div>
			<Textarea
				{...textareaprops}
				bind:value={$interpolatePrompt}
				area-type={$isGenerating || $isMounting ? "disabled" : ""}
			/>
		</TabItem>
	</Tabs>
</div>

<style lang="scss">
	.interpolate-tabs {
		:global(button) {
			font-size: small;
			padding: 0.5rem 0.75rem;
		}
	}
</style>
