<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import { Button, Popover } from "flowbite-svelte";
	import {
		activeInterpolateTab,
		activeTab,
		all_data,
		categoryStore,
		click_id,
		hover_id,
		interpolatePrompt,
		llmPrompt,
		openAugmentationSection,
		openAugMethod,
		selectedIntPoint,
		topFeatures,
	} from "../../store";
	import { getCategoryColor } from "../../utils/helpers";
	import {
		ArrowRightOutline,
		InfoCircleOutline,
	} from "flowbite-svelte-icons";
	import { new_category } from "../../utils/consts";
	import type { FeatureWeight } from "../../utils/types";

	// handle hover inside sentence box
	let hoveredFeatureInfo: any = null;
	let hoverType = "";
	let tooltipX = 0;
	let tooltipY = 0;

	$: clickedPoint = $all_data.find((d) => d.id === $click_id);

	const featureEnter = (event: MouseEvent, id: number, type: string) => {
		hoverType = type;
		if (type === "feature") {
			hoveredFeatureInfo = $topFeatures.find((f) => f.id === id);
		} else {
			// parent
			hoveredFeatureInfo = $all_data.find((f) => f.id === id);
			hover_id.set(id);
		}
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	};

	const featureLeave = () => {
		hoveredFeatureInfo = null;
		hover_id.set(-1);
		hoverType = "";
	};

	function handleMouseMove(event: MouseEvent) {
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	}

	// add dots to prompt if it's too long
	const maxPromptLength = 80;
	$: displayPrompt =
		clickedPoint && clickedPoint.prompt
			? clickedPoint?.prompt.slice(0, maxPromptLength) +
				(clickedPoint?.prompt.length > maxPromptLength ? "..." : "")
			: "";

	const copyPrompt = (prompt: string) => {
		// copy llm prompt
		llmPrompt.set(prompt);
		openAugmentationSection.set("augment");
		openAugMethod.set("llm");
	};

	const copySelectedFeatures = (features: FeatureWeight[]) => {
		// copy selected features
		const feature_ids = features.map((ft) => ft.id);
		// update $topFeatures based on selected rows
		topFeatures.set(
			$topFeatures.map((feature) =>
				feature_ids.includes(feature.id)
					? {
							...feature,
							weight: [
								features.find((f) => f.id === feature.id)
									?.weight || 0,
							],
						}
					: { ...feature, weight: [0] },
			),
		);
		openAugmentationSection.set("augment");
		openAugMethod.set("sae");
		if ($activeTab !== "selected") {
			activeTab.set("selected");
		}
	};

	const copyIntPoint = (int_pt: number) => {
		// copy + update $selectedIntPoint
		openAugmentationSection.set("augment");
		openAugMethod.set("interpolate");
		if ($activeInterpolateTab !== "suggested") {
			activeInterpolateTab.set("suggested");
		}
		selectedIntPoint.set(int_pt);
	};

	const copyIntSentence = (int_sentence: string) => {
		// copy + update $interpolatePrompt
		interpolatePrompt.set(int_sentence);
		openAugmentationSection.set("augment");
		openAugMethod.set("interpolate");
		if ($activeInterpolateTab !== "prompt") {
			activeInterpolateTab.set("prompt");
		}
	};

	const goToSentence = (id: number) => {
		// navigate to new clicked sentence
		if (clickedPoint) {
			if (clickedPoint.prompt) {
				// copy prompt
				copyPrompt(clickedPoint.prompt);
			} else if (clickedPoint.added_features) {
				// copy features
				copySelectedFeatures(clickedPoint.added_features);
			} else if (clickedPoint.int_pt) {
				// copy interpolation point
				copyIntPoint(clickedPoint.int_pt);
			} else if (clickedPoint.int_sentence) {
				// go to child sentence
				copyIntSentence(clickedPoint.int_sentence);
			}

			// go to parent sentence
			click_id.set(id);
		}
	};
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="sent-box">
	{#if hoveredFeatureInfo}
		<div
			class="tooltip"
			style={`left: ${tooltipX}px; top: ${tooltipY}px;`}
			class:expanded={hoverType === "parent" ||
				(hoverType === "interpolate" && hoveredFeatureInfo.int_pt)}
			class:centered={hoverType === "interpolate" &&
				hoveredFeatureInfo.int_pt}
		>
			<p>
				<span style="font-weight:500"
					>{hoverType === "feature"
						? hoveredFeatureInfo.summary
						: hoverType === "prompt"
							? hoveredFeatureInfo.prompt
							: hoveredFeatureInfo.int_sentence
								? hoveredFeatureInfo.int_sentence
								: hoveredFeatureInfo.sentence}</span
				>
			</p>
			{#if hoverType === "parent" || (hoverType === "interpolate" && hoveredFeatureInfo.int_pt)}
				<p>
					category: <span
						style={`color:rgb(${getCategoryColor(hoveredFeatureInfo.category, $categoryStore.categoryInfo)})`}
						>{hoveredFeatureInfo.category}</span
					>
				</p>
			{/if}
		</div>
	{/if}
	<div id="sentence-msg">
		<span id="sentence-hover-info"
			><b>Sentence</b>
			<InfoCircleOutline
				id="sentence-hover-tooltip"
				class={"info-tooltip " + (clickedPoint?.og_id ? "" : "hide")}
			/></span
		>

		<Popover triggeredBy="#sentence-hover-tooltip" placement={"right"}>
			Hover over the parent, concept, prompt, or interpolation point info
			below for more details about the selected sentence!
		</Popover>
		<div class="sent-category">
			<p>
				<span
					style={`background-color:rgb(${getCategoryColor(clickedPoint ? clickedPoint.category : "", $categoryStore.categoryInfo)})`}
				></span><span>{clickedPoint?.category}</span>
			</p>
			{#if clickedPoint && clickedPoint.category === new_category && clickedPoint.og_id}<div
					on:mouseenter={(e) => {
						if (clickedPoint.og_id) {
							featureEnter(e, clickedPoint.og_id, "parent");
						}
					}}
					on:mouseleave={featureLeave}
					on:mousemove={handleMouseMove}
				>
					<Button
						size="xs"
						color="light"
						button-type="go-to-parent"
						title="go to parent"
						on:click={() => {
							if (clickedPoint.og_id) {
								goToSentence(clickedPoint.og_id);
								hoveredFeatureInfo = null;
							}
						}}
						>go to parent: {clickedPoint.og_id}
						<ArrowRightOutline /></Button
					>
				</div>
			{/if}
		</div>
	</div>
	<pre>{clickedPoint?.sentence}</pre>
	<p class="sent-info">
		<span
			>id: {$click_id} <span class="slash">/</span> length: {clickedPoint?.length}
			words {#if clickedPoint?.method}
				<span class="slash">/</span>
				method: {clickedPoint.method.toLowerCase() === "interp"
					? "interpolation"
					: clickedPoint.method.toLowerCase() === "sae"
						? "concept"
						: clickedPoint.method.toLowerCase()}
			{/if}
			{#if clickedPoint?.int_pt}<span
					on:mouseenter={(e) =>
						featureEnter(e, clickedPoint.id, "interpolate")}
					on:mouseleave={featureLeave}
					on:mousemove={handleMouseMove}
				>
					with point {clickedPoint.int_pt}</span
				>{/if}{#if clickedPoint?.int_sentence}<span
					on:mouseenter={(e) =>
						featureEnter(e, clickedPoint.id, "interpolate")}
					on:mouseleave={featureLeave}
					on:mousemove={handleMouseMove}
				>
					with new sentence</span
				>{/if}{#if clickedPoint?.weight}<span class="slash">/</span>
				weight: {clickedPoint.weight}{/if}
			{#if clickedPoint?.prompt}<span class="slash">/</span><span
					on:mouseenter={(e) =>
						featureEnter(e, clickedPoint.id, "prompt")}
					on:mouseleave={featureLeave}
					on:mousemove={handleMouseMove}
				>
					prompt: {displayPrompt}</span
				>{/if}
			{#if clickedPoint?.added_features}<span class="slash">/</span>
				added concepts: {#each clickedPoint.added_features as ft, i}<span
						class="feature-span"
						on:mouseenter={(e) => featureEnter(e, ft.id, "feature")}
						on:mouseleave={featureLeave}
						on:mousemove={handleMouseMove}
						>{i > 0 ? ", " : ""}{ft.id}
						<span
							class="added-feature"
							class:positive={ft.weight > 0}
							>({ft.weight > 0 ? "+" : ""}{ft.weight})</span
						></span
					>{/each}{/if}</span
		>
	</p>
</div>

<style lang="scss">
	.sent-box {
		#sentence-msg {
			font-size: small;
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 0.75rem;
			margin-bottom: 0.25rem;
		}

		pre {
			white-space: pre-wrap;
			width: 100%;
			padding: 0.5rem 0.75rem;
			font-size: 11px;
		}

		.sent-category {
			display: flex;
			align-items: center;

			p {
				font-size: 12px;
				text-align: right;
				margin-bottom: 0;

				span:first-child {
					width: 0.3rem;
					height: 0.3rem;
					border-radius: 50%;
					display: inline-block;
					margin-right: 0.3rem;
					margin-bottom: 0.1rem;
				}
			}
		}

		p.sent-info {
			font-size: smaller;
			margin-top: 0.25rem;
			opacity: 0.7;

			.slash {
				font-weight: 900;
				font-size: larger;
				margin-left: 0.25rem;
				margin-right: 0.25rem;
				opacity: 0.5;
			}
		}
	}
</style>
