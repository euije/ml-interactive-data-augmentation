<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import { RefreshOutline } from "flowbite-svelte-icons";
	import { activeTab, featureSearchTerm, topFeatures } from "../../store";
	import FeatureTable from "./FeatureTable.svelte";
	import { Button, TabItem, Tabs } from "flowbite-svelte";

	$: selectedFeatures = $topFeatures.filter(
		// get selected features (features with non-zero weight)
		(feature) => feature.weight[0] !== 0,
	);

	const changeTab = (newTab: string) => {
		// change feature tab
		if ($activeTab === newTab) return;
		activeTab.set(newTab);
	};

	const resetAllFeatures = () => {
		// reset all feature weights to 0
		topFeatures.set(
			$topFeatures.map((feature) => {
				return { ...feature, weight: [0] };
			}),
		);
	};

	// search results for general concept search
	$: searchResults = $topFeatures.filter((feature) =>
		feature.summary
			.toLowerCase()
			.includes($featureSearchTerm.toLowerCase()),
	);
</script>

<div class="suggestion-tabs">
	<Tabs tabStyle="underline">
		<TabItem
			open={$activeTab === "selected"}
			on:click={() => changeTab("selected")}
			title="Selected concepts"
		>
			<p
				class="default-msg features"
				class:hide={selectedFeatures.length > 0}
			>
				No concepts yet...
			</p>
			<div
				class="feature-table-wrapper"
				class:hide={selectedFeatures.length === 0}
			>
				<div class="gen-header">
					<span>Your selected concepts:</span>
					<Button
						size="xs"
						color="light"
						button-type="go-to-parent"
						title="reset all concepts"
						disabled={selectedFeatures.length === 0}
						on:click={resetAllFeatures}
						><RefreshOutline /> reset all</Button
					>
				</div>
				<FeatureTable tableType="selected" />
			</div>
		</TabItem>
		<TabItem
			open={$activeTab === "top"}
			on:click={() => changeTab("top")}
			title="Top concepts"
		>
			<div class="gen-header">
				<span>The top 10 most similar concepts for this sentence:</span>
				<Button
					size="xs"
					color="light"
					button-type="go-to-parent"
					title="reset all concepts"
					disabled={selectedFeatures.length === 0}
					on:click={resetAllFeatures}
					><RefreshOutline /> reset all</Button
				>
			</div>
			<FeatureTable tableType="top" />
		</TabItem>
		<TabItem
			open={$activeTab === "similar"}
			on:click={() => changeTab("similar")}
			title="Other suggested concepts"
		>
			<div class="gen-header">
				<span
					>Other suggested concepts that are similar to the top
					activated ones:</span
				>
				<Button
					size="xs"
					color="light"
					button-type="go-to-parent"
					title="reset all concepts"
					disabled={selectedFeatures.length === 0}
					on:click={resetAllFeatures}
					><RefreshOutline /> reset all</Button
				>
			</div>
			<FeatureTable tableType="similar" />
		</TabItem>
		<TabItem
			open={$activeTab === "search"}
			on:click={() => changeTab("search")}
			title="General concept search"
		>
			<div class="gen-header">
				<b>Total: {searchResults.length} concepts</b>
				<Button
					size="xs"
					color="light"
					button-type="go-to-parent"
					title="reset all concepts"
					disabled={selectedFeatures.length === 0}
					on:click={resetAllFeatures}
					><RefreshOutline /> reset all</Button
				>
			</div>
			<FeatureTable />
		</TabItem>
	</Tabs>
</div>

<style lang="scss">
	.suggestion-tabs {
		:global(button) {
			font-size: small;
			padding: 0.5rem 0.75rem;
		}
	}
</style>
