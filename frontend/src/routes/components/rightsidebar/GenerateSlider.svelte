<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import { Button, Spinner } from "flowbite-svelte";
	import RangeSlider from "svelte-range-slider-pips";
	import {
		all_data,
		categoryStore,
		click_id,
		dataset,
		datasetInfo,
		isGenerating,
		openAugmentationSection,
		topFeatures,
		x_max,
		x_min,
		y_max,
		y_min,
		genNum,
		llmPrompt,
		selectedIntPoint,
		activeInterpolateTab,
		interpolatePrompt,
	} from "../../store";
	import type { DatasetInfo, FeatureWeight, Point } from "../../utils/types";
	import { normalizeVal } from "../../utils/helpers";
	import { new_category } from "../../utils/consts";

	export let generateType = "sae"; // props: sae, llm, interpolate
	$: generateMessage =
		generateType === "sae"
			? "with this concept combination"
			: generateType === "interpolate"
				? "by interpolating with this sentence*"
				: "with this prompt";

	// slider values
	let genMin = 1;
	let genMax = 10;

	$: selectedFeatures = $topFeatures.filter((f) => f.weight[0] !== 0);
	$: clickedPoint = $all_data.find((d) => d.id === $click_id);

	$: onInterpolatePromptTab =
		generateType === "interpolate" && $activeInterpolateTab === "prompt";

	// generate new sentences based on selected features
	const generateNewSentencesSAE = async (sentence: string) => {
		isGenerating.set(true);
		const dataset = $dataset;
		const sent_id = $click_id;
		const selectedIdsAndWeights = selectedFeatures.map((f) => {
			return { id: f.id, weight: f.weight[0] };
		}) as FeatureWeight[];
		const numSentences = $all_data.length;
		try {
			const response = await fetch(
				`/api/generateNewSentences?dataset=${dataset}&genNum=${$genNum}&sentence=${sentence}&sent_id=${sent_id}&feature_ids=${JSON.stringify(selectedIdsAndWeights)}`,
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
				},
			);
			const result = await response.json();

			// add numSentences to each id in result.data
			// also normalize umap_x and umap_y using x_min, x_max, y_min, y_max
			result.data.forEach((d: Point) => {
				d.id = numSentences + d.id;
				d.x = normalizeVal(d.x, $x_min, $x_max);
				d.y = normalizeVal(d.y, $y_min, $y_max);
				d.added_features = selectedIdsAndWeights;
			});

			// append new data to all_data
			const new_data = [...$all_data, ...result.data];
			const currentDatasetInfo = $datasetInfo as DatasetInfo;
			const newDatasetInfo: DatasetInfo = {
				...currentDatasetInfo,
				all_data: new_data,
				old_size: numSentences,
			};
			datasetInfo.set(newDatasetInfo);
			if (!$categoryStore.selectedCategories.includes(new_category)) {
				// add 'New' category to selected categories if not already there
				categoryStore.changeSelectedCategory(new_category);
			}

			openAugmentationSection.set("generated");
		} catch (error) {
			console.error("Error updating dataset:", error);
		}
		setTimeout(() => {
			isGenerating.set(false);
		}, 100);
	};

	// generate new sentences based on LLM prompt
	const generateNewSentencesLLM = async (sentence: string) => {
		isGenerating.set(true);
		const dataset = $dataset;
		const prompt = $llmPrompt;
		const sent_id = $click_id;
		const numSentences = $all_data.length;
		try {
			const response = await fetch(
				`/api/generateNewSentencesLLM?dataset=${dataset}&genNum=${$genNum}&sentence=${sentence}&sent_id=${sent_id}&prompt=${prompt}`,
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
				},
			);
			const result = await response.json();

			// add numSentences to each id in result.data
			// also normalize umap_x and umap_y using x_min, x_max, y_min, y_max
			result.data.forEach((d: Point) => {
				d.id = numSentences + d.id;
				d.x = normalizeVal(d.x, $x_min, $x_max);
				d.y = normalizeVal(d.y, $y_min, $y_max);
			});

			// append new data to all_data
			const new_data = [...$all_data, ...result.data];
			const currentDatasetInfo = $datasetInfo as DatasetInfo;
			const newDatasetInfo: DatasetInfo = {
				...currentDatasetInfo,
				all_data: new_data,
				old_size: numSentences,
			};
			datasetInfo.set(newDatasetInfo);
			if (!$categoryStore.selectedCategories.includes(new_category)) {
				// add 'New' category to selected categories if not already there
				categoryStore.changeSelectedCategory(new_category);
			}

			openAugmentationSection.set("generated");
		} catch (error) {
			console.error("Error updating dataset:", error);
		}
		setTimeout(() => {
			isGenerating.set(false);
		}, 100);
	};

	// generate new sentences based on interpolation
	const generateNewSentencesInt = async (sentence: string) => {
		isGenerating.set(true);
		const dataset = $dataset;
		const sent2 = onInterpolatePromptTab
			? $interpolatePrompt
			: $all_data.find((d) => d.id === $selectedIntPoint)?.sentence;
		const sent_id = $click_id;
		const sent2_id = onInterpolatePromptTab ? -1 : $selectedIntPoint;
		const numSentences = $all_data.length;
		try {
			const response = await fetch(
				`/api/interpolateBetweenSentences?dataset=${dataset}&genNum=${$genNum}&sent1=${sentence}&id1=${sent_id}&sent2=${sent2}&id2=${sent2_id}`,
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
				},
			);
			const result = await response.json();

			// add numSentences to each id in result.data
			// also normalize umap_x and umap_y using x_min, x_max, y_min, y_max
			result.data.forEach((d: Point) => {
				d.id = numSentences + d.id;
				d.x = normalizeVal(d.x, $x_min, $x_max);
				d.y = normalizeVal(d.y, $y_min, $y_max);
			});

			// append new data to all_data
			const new_data = [...$all_data, ...result.data];
			const currentDatasetInfo = $datasetInfo as DatasetInfo;
			const newDatasetInfo: DatasetInfo = {
				...currentDatasetInfo,
				all_data: new_data,
				old_size: numSentences,
			};
			datasetInfo.set(newDatasetInfo);
			if (!$categoryStore.selectedCategories.includes(new_category)) {
				// add 'New' category to selected categories if not already there
				categoryStore.changeSelectedCategory(new_category);
			}

			openAugmentationSection.set("generated");
		} catch (error) {
			console.error("Error updating dataset:", error);
		}
		setTimeout(() => {
			isGenerating.set(false);
		}, 100);
	};

	// generate new sentences based on slider type and current sentence
	const generateNewSentences = async (sentence: string) => {
		if (generateType === "sae") {
			generateNewSentencesSAE(sentence);
		} else if (generateType === "llm") {
			generateNewSentencesLLM(sentence);
		} else if (generateType === "interpolate") {
			generateNewSentencesInt(sentence);
		} else {
			console.error("Error: unknown augmentation type");
		}
	};
</script>

<div>
	<p class="sidebar-label">
		Number of new sentences to generate {generateMessage}:
	</p>
	<div id="slider">
		<p>{genMin}</p>
		<RangeSlider float bind:values={$genNum} min={genMin} max={genMax} />
		<p>{genMax}</p>
	</div>
	<Button
		color="primary"
		size="xs"
		button-type="generate-button"
		disabled={$isGenerating ||
			(generateType === "sae"
				? selectedFeatures.length === 0
				: generateType === "interpolate"
					? (!onInterpolatePromptTab && $selectedIntPoint === -1) ||
						(onInterpolatePromptTab && $interpolatePrompt === "")
					: $llmPrompt === "")}
		on:click={() =>
			generateNewSentences(clickedPoint ? clickedPoint.sentence : "")}
		>Generate new sentences{#if $isGenerating}<Spinner
				size={"4"}
			/>{/if}</Button
	>
</div>

<style lang="scss">
	.sidebar-label {
		margin-top: 1.5rem;
		font-size: small;
	}
</style>
