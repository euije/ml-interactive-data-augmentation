<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import {
		ChevronRightOutline,
		ChevronLeftOutline,
		ClockOutline,
		ExpandOutline,
		TrashBinOutline,
		ListOutline,
	} from "flowbite-svelte-icons";
	import {
		all_data,
		click_id,
		isAccordionOpen,
		topFeatures,
		openCategories,
		additionalHighlight,
		nearestNeighbors,
		isMounting,
		topFeaturesTrigger,
		rightSidebarOpen,
		isGenerating,
		similarFeatures,
		dataset,
		viewHistory,
		openAugmentationSection,
		openAugMethod,
		selectedGeneratedRows,
		sentencesToDelete,
		modalType,
		showModal,
		resultSearchTerm,
		promptIdeas,
		hideInstructions,
		DEMO_MODE,
	} from "../store";
	import {
		Accordion,
		AccordionItem,
		Button,
		TabItem,
		Tabs,
		Toggle,
	} from "flowbite-svelte";
	import FeatureTabs from "./rightsidebar/FeatureTabs.svelte";
	import SentenceTable from "./rightsidebar/SentenceTable.svelte";
	import SentenceBox from "./rightsidebar/SentenceBox.svelte";
	import SentenceHistory from "./rightsidebar/SentenceHistory.svelte";
	import { afterUpdate, onMount } from "svelte";
	import GenerateSlider from "./rightsidebar/GenerateSlider.svelte";
	import InterpolateTabs from "./rightsidebar/InterpolateTabs.svelte";
	import PromptBox from "./rightsidebar/PromptBox.svelte";
	import Dropdown from "./Dropdown.svelte";

	function toggleSidebar() {
		// toggle the right sidebar open/closed
		rightSidebarOpen.update((val) => !val);
		if ($openCategories) {
			openCategories.set(false);
		}
	}

	function toggleHistory() {
		// toggle between the data augmentation and history views
		viewHistory.set(!$viewHistory);
	}

	$: clickedPoint = $all_data.find((d) => d.id === $click_id);
	$: childSentences = $all_data.filter((d) => d.og_id === $click_id);
	$: displaySentences = childSentences.filter((d) =>
		d.sentence.toLowerCase().includes($resultSearchTerm.toLowerCase()),
	);

	const getTopFeatures = async (sentence: string, id: number) => {
		// get top features for a clicked point
		isMounting.set(true);
		const dataset = $dataset;
		try {
			const response = await fetch(
				`/api/getTopFeatures?dataset=${dataset}&sentence=${sentence}&id=${id}`,
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
				},
			);
			const result = await response.json();
			const finalFeatures = result.features;
			topFeatures.set(finalFeatures);
			nearestNeighbors.set(result.neighbors);
			similarFeatures.set(result.similar_features);
		} catch (error) {
			console.error("Error updating dataset:", error);
		}
		setTimeout(() => {
			isMounting.set(false);
		}, 100);
	};

	$: {
		// handle point click
		if (clickedPoint) {
			topFeaturesTrigger.set(true);
		} else {
			topFeatures.set([]);
			nearestNeighbors.set([]);
		}
	}

	$: {
		if ($topFeaturesTrigger && clickedPoint) {
			getTopFeatures(clickedPoint.sentence, $click_id);
			topFeaturesTrigger.set(false);
		}
	}

	// add listener to accordion tabs
	function findAccordionTab(): HTMLElement[] | null {
		const nodeList = document.querySelectorAll("#my-accordion h2.group");
		const arr = Array.from(nodeList) as HTMLElement[];
		return arr;
	}

	let accordionElements: HTMLElement[] | null = null;

	function setupAccordionListener() {
		removeAccordionListener(); // Remove any existing listeners
		accordionElements = findAccordionTab();
		if (accordionElements) {
			accordionElements.forEach((tab) => {
				tab.addEventListener("click", handleAccordionClick);
			});
		}
	}

	function handleAccordionClick(event: Event) {
		const tab = event.currentTarget as HTMLElement;
		const pElement = tab.querySelector("#right-sidebar p.accordion-title");
		if (pElement) {
			const tabName = pElement.getAttribute("id")?.split("-")[0] || "";
			if (tabName) {
				openAugmentationSection.set(tabName);
			}
		}
	}

	function removeAccordionListener() {
		if (accordionElements) {
			accordionElements.forEach((tab) => {
				tab.removeEventListener("click", handleAccordionClick);
			});
			accordionElements = null;
		}
	}

	// Use onMount to set up the listener once
	onMount(() => {
		setupAccordionListener();
		return removeAccordionListener; // This will be called when the component is destroyed
	});

	// React to changes in viewHistory
	$: if (!$viewHistory) {
		afterUpdate(() => {
			setupAccordionListener();
		});
	} else {
		removeAccordionListener();
	}

	const deselectSentences = () => {
		selectedGeneratedRows.set([]);
	};

	const selectAllSentences = () => {
		selectedGeneratedRows.set(displaySentences.map((d) => d.id));
	};

	const deleteSentences = () => {
		// delete selected sentences
		sentencesToDelete.set($selectedGeneratedRows);
		modalType.set("delete");
		showModal.set(true);
	};

	$: {
		if ($openAugMethod === "interpolate") {
			// only show parent/child points for interpolation
			additionalHighlight.set(additionalHighlightOptions[2]);
		}
	}

	const getPromptIdeas = async () => {
		// get prompt ideas for a clicked point
		const dataset = $dataset;
		const sentence = clickedPoint?.sentence || "";
		if (!sentence) {
			return;
		}
		try {
			const response = await fetch(
				`/api/getPromptIdeas?dataset=${dataset}&sentence=${sentence}`,
				{
					method: "GET",
					headers: { "Content-Type": "application/json" },
				},
			);
			const result = await response.json();
			promptIdeas.set(result.prompt_ideas);
		} catch (error) {
			console.error("Error getting prompt ideas:", error);
		}
	};

	$: {
		if (clickedPoint) {
			promptIdeas.set([]);
			getPromptIdeas();
		}
	}

	let rightSidebar: HTMLElement | null = null;
	let prevClickId: number | null = null;

	$: if ($click_id === -1 && prevClickId !== -1) {
		// scroll to top when a point is unclicked
		afterUpdate(() => {
			if (rightSidebar) {
				rightSidebar.scrollTo({ top: 0, behavior: "smooth" });
			}
		});
	}

	$: {
		if ($click_id !== -1 && $click_id !== prevClickId) {
			rightSidebarOpen.set(true);
		}
		prevClickId = $click_id;
	}

	const additionalHighlightOptions = [
		"top 10 nearest neighbors",
		"points in same cluster",
		"parent/child points only",
	];
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<section
	class="sidebar"
	id="right-sidebar"
	class:collapsed={!$rightSidebarOpen}
	class:no-pointer-events={$isMounting}
>
	<button
		class="icon-tab lower"
		on:click={toggleHistory}
		class:inactive={!$viewHistory}
		class:hidden={$click_id === -1 || !$rightSidebarOpen}
		title="toggle history"
	>
		<ClockOutline />
	</button>
	<button
		class="icon-tab"
		on:click={toggleSidebar}
		title={($rightSidebarOpen ? "collapse" : "expand") + " sidebar"}
	>
		{#if $rightSidebarOpen}<ChevronRightOutline />
		{:else}<ChevronLeftOutline />{/if}
	</button>
	<div
		class="sidebar-body"
		class:hidden={!$rightSidebarOpen}
		class:lessHeight={$isAccordionOpen}
		class:expanded={$click_id !== -1}
		bind:this={rightSidebar}
	>
		<div class="sidebar-inner">
			{#if !$viewHistory}
				<div>
					<p class="emphasis">Data Augmentation</p>
					<!-- default message when no point is clicked on -->
					<p id="default-msg" class:hide={$click_id !== -1}>
						Click a point to see augmentation suggestions!
					</p>
					<!-- augmentation options when a point is clicked on -->
					<div id="augmentation-box" class:hide={$click_id === -1}>
						<SentenceBox />
						<div id="sent-box-top">
							<p>
								<span
									class:selected={$openAugmentationSection ===
										"augment"}
									title="Start augmenting below"
									on:click={() =>
										openAugmentationSection.set("augment")}
									>Start augmenting below</span
								>
								or
								<span
									class:selected={$openAugmentationSection ===
										"generated"}
									title="view generated child sentences"
									on:click={() =>
										openAugmentationSection.set(
											"generated",
										)}>view generated child sentences</span
								>
							</p>

							<Dropdown
								long={true}
								label="Highlight clicked point and"
								options={additionalHighlightOptions}
								bind:selected={$additionalHighlight}
								id="additionalHighlightOptions"
							/>
						</div>
						<Accordion id="my-accordion" flush>
							<AccordionItem
								tab-name="augment"
								open={$openAugmentationSection === "augment"}
							>
								<p
									id="augment-tab"
									slot="header"
									class="accordion-title emphasis"
								>
									<ExpandOutline />Augment Sentence
								</p>
								<div class="feature-box">
									<p class="aug-message">
										Choose an augmentation technique below
										to generate new sentences!
										<span class:hide={$DEMO_MODE}>
											<Toggle
												size="small"
												toggle-type="small"
												bind:checked={$hideInstructions}
												>Hide instructions</Toggle
											>
										</span>
									</p>
									<div id="augment-tabs">
										<Tabs
											tabStyle="full"
											defaultClass="flex rounded-lg divide-x rtl:divide-x-reverse divide-gray-200 shadow dark:divide-gray-700"
										>
											<TabItem
												class="w-full"
												title="Augment With Concepts"
												open={$openAugMethod === "sae"}
												tab-type="augment"
												tab-val="sae"
												on:click={() =>
													openAugMethod.set("sae")}
											>
												<div
													class="feature-box"
													class:generating={$isGenerating}
												>
													<div
														class="desc-contain"
														class:hide={$hideInstructions}
													>
														<p class="desc">
															Find concepts to
															generate variations
															of this sentence!
															Browse the
															suggestions or
															search for concepts
															yourself. Adjust how
															much each concept is
															added or subtracted
															from the sentence
															via the weight
															sliders. Press the
															reset icons to set
															concept weights back
															to 0.
														</p>
														<p class="desc top">
															Only concepts with
															non-zero weights
															will be used to
															generate new
															sentences. For the
															best results, we
															recommend selecting
															no more than 3
															concepts at once.
														</p>
													</div>
													<FeatureTabs />
													<GenerateSlider />
												</div></TabItem
											>
											<TabItem
												class="w-full"
												title="Augment by Interpolation"
												open={$openAugMethod ===
													"interpolate"}
												tab-type="augment"
												tab-val="interpolate"
												on:click={() =>
													openAugMethod.set(
														"interpolate",
													)}
											>
												<div class="feature-box">
													<div
														class="desc-contain"
														class:hide={$hideInstructions}
													>
														<p class="desc">
															Generate sentence
															variations by
															interpolating
															between this
															sentence and another
															sentence. Click the
															plot to draw an
															arrow and receive
															interpolation
															suggestions, or use
															the search box.
															Click the plot again
															to remove the arrow
															and draw a new one.
															Select a sentence to
															generate
															interpolations
															between the current
															clicked point and
															the selected point.
														</p>
														<p class="desc top">
															You can also enter
															your own sentence to
															generate
															interpolations in
															the "Add
															interpolation
															sentence" tab.
														</p>
													</div>
													<InterpolateTabs />
													<GenerateSlider
														generateType="interpolate"
													/>
													<i
														style={"margin-top: 0.75rem; display: block"}
														>*Note: the arrow is
														used as a guideline, but
														it is likely that the
														generated sentences will
														diverge from it.</i
													>
												</div></TabItem
											>
											<TabItem
												class="w-full"
												title="Augment With LLM"
												open={$openAugMethod === "llm"}
												tab-type="augment"
												tab-val="llm"
												on:click={() =>
													openAugMethod.set("llm")}
											>
												<div class="feature-box">
													<div
														class="desc-contain"
														class:hide={$hideInstructions}
													>
														<p class="desc">
															Generate variations
															of this sentence by
															prompting a large
															language model
															(LLM)! Enter or
															select a prompt
															below to express how
															you'd like to change
															the sentence.
														</p>
													</div>
													<PromptBox />
													<GenerateSlider
														generateType="llm"
													/>
												</div></TabItem
											>
										</Tabs>
									</div>
								</div>
							</AccordionItem>
							<AccordionItem
								open={$openAugmentationSection === "generated"}
							>
								<p
									slot="header"
									id="generated-tab"
									class="accordion-title emphasis"
								>
									<ListOutline />All Generated Child Sentences
								</p>
								<div class="feature-box">
									<div class="gen-header results">
										<p class="desc">
											List of new sentences generated by
											augmenting this sentence.
										</p>
										<Button
											size="xs"
											color="light"
											button-type="go-to-parent"
											title="view all generated sentences"
											on:click={() => {
												viewHistory.set(true);
											}}
											><ClockOutline /> view all generated
											sentences</Button
										>
									</div>
									<SentenceTable />
									<div
										class="history-buttons generated"
										class:hide={childSentences.length === 0}
										class:test={$selectedGeneratedRows.length ===
											0}
										class:test2={$selectedGeneratedRows.length ===
											displaySentences.length}
										class:test3={($selectedGeneratedRows.length !==
											0 &&
											$selectedGeneratedRows.length !==
												displaySentences.length) ||
											$isMounting ||
											$isGenerating}
									>
										<Button
											color="primary"
											size="xs"
											button-type="delete-button"
											disabled={$selectedGeneratedRows.length ===
												0}
											title="delete selected sentences"
											on:click={deleteSentences}
											><TrashBinOutline />Delete selected
											sentences</Button
										>
										<div class="button-group">
											<Button
												color="light"
												size="xs"
												button-type="deselect-button"
												disabled={$selectedGeneratedRows.length ===
													displaySentences.length}
												title="select all sentences"
												on:click={selectAllSentences}
												>Select all</Button
											>
											<Button
												color="light"
												size="xs"
												button-type="deselect-button"
												disabled={$selectedGeneratedRows.length ===
													0}
												title="deselect all sentences"
												on:click={deselectSentences}
												>Deselect all</Button
											>
										</div>
									</div>
								</div>
							</AccordionItem>
						</Accordion>
					</div>
				</div>
			{:else}
				<SentenceHistory />
			{/if}
		</div>
	</div>
</section>

<style lang="scss">
	#right-sidebar {
		.sidebar-body {
			&.expanded {
				width: 800px;
			}

			&:not(.expanded) {
				overflow-y: hidden;
			}
		}
	}

	#default-msg {
		font-size: small;
		transition: 0.3s;
		margin-bottom: 0;

		&.hide {
			height: 0;
		}
	}

	#augmentation-box {
		font-size: small;
		transition: 0.3s;

		&.hide {
			transform: translateY(100%);
			height: 0;
		}

		#sent-box-top {
			margin-top: 0.5rem;
			display: flex;
			justify-content: space-between;
			align-items: center;

			p {
				font-size: 12px;
				width: 100%;
				margin-bottom: 0;

				span {
					cursor: pointer;
					opacity: 0.5;
					font-weight: 500;
					transition: 0.3s;
					border-bottom: 1px solid transparent;
					padding-bottom: 0.1rem;

					&.selected {
						opacity: 1;
						color: var(--color-accent);
						pointer-events: none;
						border-bottom: 1px solid var(--color-accent);
					}

					&:hover {
						opacity: 0.7;
						color: var(--color-accent);
					}
				}
			}
		}

		:global(.button-group) {
			margin-top: 0.5rem;
			width: 100%;
		}
		:global(.button-group button) {
			background-color: transparent !important;
			transition: 0.3s;

			&:not([button-type="deselect-button"]) {
				width: 50%;
			}
			&:hover {
				background-color: var(--color-border-light) !important;
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

		.aug-message {
			font-size: small;
			margin-top: 0rem;
			margin-bottom: 0;
			color: var(--color-text);
			display: flex;
			align-items: center;
			justify-content: space-between;

			:global(svg) {
				display: inline;
				width: 1rem;
			}
		}

		#augment-tabs {
			margin-top: 1rem;

			:global(ul.flex) {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
			}

			:global([role="tab"]) {
				padding: 0.4rem 1rem;
				width: 100%;
				transition: 0.3s;
				font-size: small;
			}

			:global([tab-type="augment"]) {
				background-color: var(--color-bg);

				&:hover {
					background-color: var(--color-border-light);
				}
			}

			:global([tab-type="augment"].bg-gray-100) {
				pointer-events: none;
			}

			:global(button[tab-val="sae"].bg-gray-100) {
				color: var(--color-bg);
				background-color: var(--color-accent-3-dark);
				border-color: var(--color-accent-3-dark);
			}

			:global(button[tab-val="interpolate"].bg-gray-100) {
				color: var(--color-bg);
				background-color: var(--color-accent-3);
				border-color: var(--color-accent-3);
			}

			:global(button[tab-val="llm"].bg-gray-100) {
				background-color: var(--color-accent-3-light);
				color: var(--color-accent-3-dark);
				border-color: var(--color-accent-3-light);
			}

			:global([role="tabpanel"]) {
				margin-top: 0.5rem;
				padding: 0;
			}
		}

		.feature-box {
			margin-top: 0.8rem;
			margin-bottom: 1rem;

			&.generating {
				:global([button-type="generate-button"]) {
					pointer-events: none;
					opacity: 0.5;
				}
			}

			.emphasis {
				margin-bottom: 0;
			}

			:global([button-type="generate-button"]) {
				margin-top: 0.75rem;
				width: 100%;
				transition: 0.3s;
			}

			:global([button-type="generate-button"] svg) {
				margin-left: 0.5rem;
			}

			.desc-contain {
				background: var(--color-border-light);
				padding: 0.5rem 1rem;
				border-radius: 0.5rem;
				margin-bottom: 1rem;
				transition: 0.3s;

				&.hide {
					height: 0;
					margin: 0;
					padding: 0;
				}
			}

			.desc.top {
				margin-top: 0.5rem;
			}

			p:not(.emphasis) {
				font-size: small;
			}

			.history-buttons {
				&.generated {
					.button-group {
						width: unset;
					}
				}
			}
		}
	}
</style>
