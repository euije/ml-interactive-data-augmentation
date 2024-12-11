<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import LeftSidebar from "./components/LeftSidebar.svelte";
	import MainPlot from "./components/MainPlot.svelte";
	import RightSidebar from "./components/RightSidebar.svelte";
	import Table from "./components/Table.svelte";

	import {
		all_data,
		dataset,
		colorBy,
		isMounting,
		searchTerm,
		sentLengthRange,
		minSentLength,
		maxSentLength,
		categoryStore,
		click_id,
		sortCategoriesBy,
		tableSortBy,
		tableSortDirection,
		topFeaturesTrigger,
		additionalHighlight,
		datasetInfo,
		viewHistory,
		originallyViewingHistory,
		maxCategoryCount,
		sentenceTypeInfo,
		selectedSentenceTypes,
		openAugmentationSection,
		parentToggleDisabled,
		parentOverlay,
	} from "./store";
	import type { Category, DatasetInfo, Point } from "./utils/types";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { generateColor, normalizeVal } from "./utils/helpers";
	import { new_category, sentTypeMap, system_name } from "./utils/consts";

	// sort categories by count
	$: categories = [...new Set($all_data.map((d) => d.category))];
	$: categoryCounts = categories.map((category) => {
		return {
			name: category,
			count: $all_data.filter((d) => d.category === category).length,
		};
	});

	$: minSentLength.set(Math.min(...$all_data.map((d) => d.length)));
	$: maxSentLength.set(Math.max(...$all_data.map((d) => d.length)));

	$: initialSentRange = [$minSentLength, $maxSentLength];

	// find max number of sentences in a category
	$: maxCategoryCount.set(Math.max(...categoryCounts.map((d) => d.count)));

	// generate color map
	$: newCategoryPoints = $all_data.filter((d) => d.category === new_category);
	let colorMap: Category[];
	$: {
		let newColorMap = categoryCounts
			.filter((d) => d.name !== new_category)
			.sort((a, b) => b.count - a.count)
			.map((category, i) => {
				const catSentences = $all_data.filter(
					(d) => d.category === category.name,
				);
				const catLength = category.count;
				const color = generateColor(categories.length - 1, i);
				return {
					name: category.name,
					count: catLength,
					minLength: Math.min(...catSentences.map((d) => d.length)),
					maxLength: Math.max(...catSentences.map((d) => d.length)),
					avgLength:
						catSentences.reduce((acc, d) => acc + d.length, 0) /
						catLength,
					color: color,
				};
			}) // now sort based on order in categories
			.sort(
				(a, b) =>
					categories.indexOf(a.name) - categories.indexOf(b.name),
			);
		if (newCategoryPoints.length > 0) {
			const newCategoryCount = categoryCounts.find(
				(d) => d.name === new_category,
			);
			const newCatLength = newCategoryCount?.count || 1;
			// add new category to the color map
			newColorMap.push({
				name: new_category,
				count: newCategoryCount?.count || 0,
				minLength: Math.min(...newCategoryPoints.map((d) => d.length)),
				maxLength: Math.max(...newCategoryPoints.map((d) => d.length)),
				avgLength:
					newCategoryPoints.reduce((acc, d) => acc + d.length, 0) /
					newCatLength,
				color: [160, 162, 166],
			});
		}
		colorMap = newColorMap;
	}

	// generate sentence type map
	const all_cats = Object.keys(sentTypeMap);
	$: sentenceTypeMap = all_cats.map((cat) => {
		let catSentences;
		if (cat === "old") {
			catSentences = $all_data.filter((d) => d.category !== new_category);
		} else if (cat === "new") {
			catSentences = $all_data.filter((d) => d.category === new_category);
		} else {
			catSentences = $all_data.filter(
				(d) => d.method?.toLowerCase() === cat,
			);
		}
		const catLength = catSentences.length;
		const color = sentTypeMap[cat as keyof typeof sentTypeMap];
		return {
			name: cat,
			count: catLength,
			minLength: Math.min(...catSentences.map((d) => d.length)),
			maxLength: Math.max(...catSentences.map((d) => d.length)),
			avgLength:
				catLength > 0
					? catSentences.reduce((acc, d) => acc + d.length, 0) /
						catLength
					: 0,
			color: color,
		};
	});

	// update dataset if it changes
	const updateDataset = async (newDataset: string) => {
		try {
			const response = await fetch("/api/updateDataset", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dataset: newDataset }),
			});
			const result = await response.json();
			const newDatasetInfo: DatasetInfo = {
				// set og values too
				...result,
				og_x_min: result.x_min,
				og_x_max: result.x_max,
				og_y_min: result.y_min,
				og_y_max: result.y_max,
			};
			datasetInfo.set(newDatasetInfo as DatasetInfo);
		} catch (error) {
			console.error("Error updating dataset:", error);
		}
	};

	// add new sentences from localstore to the dataset if not already added
	const addNewSentences = async (
		newSentences: string[],
		dataset: string,
		total_sentences: number,
	) => {
		try {
			const response = await fetch("/api/addSentences", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sentences: newSentences,
					dataset: dataset,
					total_sentences: total_sentences,
				}),
			});
			const result = await response.json();
		} catch (error) {
			console.error("Error adding new sentences:", error);
		}
	};

	let mounted = false;

	// on mount, check if url params are set and update store
	onMount(() => {
		const url = new URL(window.location.href);
		const urlDataset = url.searchParams.get("dataset");
		const urlColorBy = url.searchParams.get("colorBy");
		const urlSelectedCategories =
			url.searchParams.get("selectedCategories");
		const urlSortCategoriesBy = url.searchParams.get("sortCategoriesBy");
		const urlSearchTerm = url.searchParams.get("searchTerm");
		const urlSentLengthRange = url.searchParams.get("sentLengthRange");
		const urlTableSortBy = url.searchParams.get("tableSortBy");
		const urlTableSortDirection =
			url.searchParams.get("tableSortDirection");
		const urlClickId = url.searchParams.get("clickId");
		const urlHighlightPoints = url.searchParams.get("highlightPoints");
		const urlSelectedSentenceTypes = url.searchParams.get(
			"selectedSentenceTypes",
		);

		if (urlDataset) {
			dataset.set(urlDataset);
		}

		if (urlColorBy) {
			colorBy.set(urlColorBy);
		}

		if (urlSelectedCategories) {
			categoryStore.setSelectedCategories(
				urlSelectedCategories.split(";"),
			);
		}

		if (urlSortCategoriesBy) {
			sortCategoriesBy.set(urlSortCategoriesBy);
		}

		if (urlSearchTerm) {
			searchTerm.set(urlSearchTerm);
		}

		if (urlSentLengthRange) {
			sentLengthRange.set(
				urlSentLengthRange.split(",").map((d) => parseInt(d)),
			);
		}

		if (urlTableSortBy) {
			tableSortBy.set(urlTableSortBy);
		}

		if (urlTableSortDirection) {
			tableSortDirection.set(parseInt(urlTableSortDirection));
		}

		if (urlClickId) {
			const id = parseInt(urlClickId);
			click_id.set(id);
		}

		if (urlHighlightPoints) {
			additionalHighlight.set(urlHighlightPoints);
		}

		if (urlSelectedSentenceTypes) {
			selectedSentenceTypes.set(urlSelectedSentenceTypes.split(";"));
		}

		const data = datasetInfo.load($dataset);
		if (data) {
			// renormalize sentences based on og values
			// change x and y values but keep everything else the same for each point
			const x_min = data.x_min;
			const x_max = data.x_max;
			const y_min = data.y_min;
			const y_max = data.y_max;
			const og_x_min = data.og_x_min;
			const og_x_max = data.og_x_max;
			const og_y_min = data.og_y_min;
			const og_y_max = data.og_y_max;

			if (
				!(
					x_min === og_x_min &&
					x_max === og_x_max &&
					y_min === og_y_min &&
					y_max === og_y_max
				)
			) {
				const new_data = data.map((d: Point) => {
					const x = normalizeVal(d.x, og_x_min, og_x_max);
					const y = normalizeVal(d.y, og_y_min, og_y_max);
					return { ...d, x: x, y: y };
				});

				// set x/y min/max values back to og values
				const newDatasetInfo: DatasetInfo = {
					...data,
					all_data: new_data,
					x_min: data.og_x_min,
					x_max: data.og_x_max,
					y_min: data.og_y_min,
					y_max: data.og_y_max,
				};

				datasetInfo.set(newDatasetInfo);
			} else {
				datasetInfo.set(data);
			}

			const new_sentences = $all_data
				.filter((d) => d.category === new_category)
				.map((d) => d.sentence);

			if (new_sentences.length > 0) {
				const total_sentences = $all_data.length;
				addNewSentences(new_sentences, $dataset, total_sentences);
			}
		} else {
			updateDataset($dataset);
		}
	});

	$: {
		if ($all_data && $all_data.length > 0 && !mounted) {
			// set mounted to true after initial data load
			isMounting.set(false);
			mounted = true;
		}
	}

	$: {
		// update url params when store changes
		if (!$isMounting && typeof window !== "undefined") {
			const url = new URL(window.location.href);
			// keep track of what was updated
			let updatedDataset = false;
			let updatedColor = false;
			let updatedSelectedCategories = false;
			let updatedSortCategoriesBy = false;
			let updatedSearchTerm = false;
			let updatedSentLengthRange = false;
			let updatedTableSortBy = false;
			let updatedTableSortDirection = false;
			let updatedClickId = false;
			let updatedHighlightPoints = false;
			let updatedSelectedSentenceTypes = false;

			if ($all_data) {
				categoryStore.setCategoryInfo(colorMap as Category[]);
				sentenceTypeInfo.set(sentenceTypeMap as Category[]);
				if (newCategoryPoints.length === 0) {
					parentToggleDisabled.set(true);
					parentOverlay.set(false);
				} else {
					parentToggleDisabled.set(false);
				}
			}

			if ($dataset) {
				if (url.searchParams.get("dataset") !== $dataset) {
					categoryStore.selectAll();
					selectedSentenceTypes.set(all_cats);
					url.searchParams.set("dataset", $dataset);
					url.searchParams.set(
						"selectedCategories",
						$categoryStore.selectedCategories.join(";"),
					);
					url.searchParams.set(
						"selectedSentenceTypes",
						$selectedSentenceTypes.join(";"),
					);

					if ($click_id > $all_data.length - 1) {
						click_id.set(-1);
					} else {
						topFeaturesTrigger.set(true);
					}

					sentLengthRange.set(initialSentRange);
					url.searchParams.set(
						"sentLengthRange",
						initialSentRange.join(","),
					);

					updatedDataset = true;
				}
			}

			if ($colorBy) {
				if (url.searchParams.get("colorBy") !== $colorBy) {
					url.searchParams.set("colorBy", $colorBy);
					updatedColor = true;
				}
			}

			if (!updatedDataset && $categoryStore.selectedCategories) {
				if (
					url.searchParams.get("selectedCategories") !==
					$categoryStore.selectedCategories.join(";")
				) {
					url.searchParams.set(
						"selectedCategories",
						$categoryStore.selectedCategories.join(";"),
					);
					updatedSelectedCategories = true;
				}
			}

			if ($sortCategoriesBy) {
				if (
					url.searchParams.get("sortCategoriesBy") !==
					$sortCategoriesBy
				) {
					url.searchParams.set("sortCategoriesBy", $sortCategoriesBy);
					updatedSortCategoriesBy = true;
				}
			}

			if (!updatedDataset && $sentLengthRange[0] !== 0) {
				if (
					url.searchParams.get("sentLengthRange") !==
					$sentLengthRange.join(",")
				) {
					url.searchParams.set(
						"sentLengthRange",
						$sentLengthRange.join(","),
					);
					updatedSentLengthRange = true;
				}
			}

			if ($searchTerm !== undefined) {
				if (url.searchParams.get("searchTerm") !== $searchTerm) {
					// remove if search term is empty
					if ($searchTerm === "") {
						url.searchParams.delete("searchTerm");
					} else {
						url.searchParams.set("searchTerm", $searchTerm);
					}
					updatedSearchTerm = true;
				}
			}

			if ($tableSortBy) {
				if (url.searchParams.get("tableSortBy") !== $tableSortBy) {
					url.searchParams.set("tableSortBy", $tableSortBy);
					updatedTableSortBy = true;
				}
			}

			if ($tableSortDirection) {
				if (
					url.searchParams.get("tableSortDirection") !==
					$tableSortDirection.toString()
				) {
					url.searchParams.set(
						"tableSortDirection",
						$tableSortDirection.toString(),
					);
					updatedTableSortDirection = true;
				}
			}

			if (!updatedDataset && $click_id !== undefined) {
				if (url.searchParams.get("clickId") !== $click_id.toString()) {
					// remove if click_id is -1
					if ($click_id === -1) {
						url.searchParams.delete("clickId");
					} else {
						url.searchParams.set("clickId", $click_id.toString());
						openAugmentationSection.set("augment");
					}
					updatedClickId = true;
					if ($viewHistory && !$originallyViewingHistory) {
						viewHistory.set(false);
					}
				}
			}

			if ($additionalHighlight) {
				if (
					url.searchParams.get("highlightPoints") !==
					$additionalHighlight
				) {
					url.searchParams.set(
						"highlightPoints",
						$additionalHighlight,
					);
					updatedHighlightPoints = true;
				}
			}

			if (!updatedDataset && $selectedSentenceTypes) {
				if (
					url.searchParams.get("selectedSentenceTypes") !==
					$selectedSentenceTypes.join(";")
				) {
					url.searchParams.set(
						"selectedSentenceTypes",
						$selectedSentenceTypes.join(";"),
					);
					updatedSelectedSentenceTypes = true;
				}
			}

			if (
				updatedDataset ||
				updatedColor ||
				updatedSelectedCategories ||
				updatedSortCategoriesBy ||
				updatedSearchTerm ||
				updatedSentLengthRange ||
				updatedTableSortBy ||
				updatedTableSortDirection ||
				updatedClickId ||
				updatedHighlightPoints ||
				updatedSelectedSentenceTypes
			) {
				goto(url.toString(), { replaceState: true, keepFocus: true });
			}
		}
	}
</script>

<svelte:head>
	<title>{system_name}</title>
	<meta name="description" content={system_name} />
</svelte:head>

<section id="main-app">
	<MainPlot />
	<LeftSidebar />
	<RightSidebar />
</section>
<Table />

<style lang="scss">
	#main-app {
		position: relative;
		border-top: 1px solid var(--color-border);
	}
</style>
