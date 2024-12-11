/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import { derived, get, writable } from 'svelte/store';
import type { Category, DatasetInfo, Feature } from '../routes/utils/types';
import { browser } from '$app/environment';
import { minTableHeight } from './utils/consts';

export const DEMO_MODE = writable(false);

export const dataset = writable('wiki');
export const isMounting = writable(true);
export const isGenerating = writable(false);
export const isEditing = writable(false);
export const resetViewDisabled = writable(true);

export const searchTerm = writable('');
export const result_ids = writable([] as number[]);
export const hover_id = writable(-1);
export const click_id = writable(-1);

export const hideVisualizations = writable(false);
export const hideInstructions = writable(false);
export const hoveredCategory = writable('');
export const sortCategoriesBy = writable('count');
export const parentOverlay = writable(false);
export const parentToggleDisabled = writable(true);

export const sentenceTypeInfo = writable([] as Category[]);
export const selectedSentenceTypes = writable([] as string[]);
export const hoveredSentenceType = writable('');

export const leftSidebarOpen = writable(true);
export const rightSidebarOpen = writable(true);
export const openCategories = writable(false);
export const isAccordionOpen = writable(false);

export const viewHistory = writable(false);
export const originallyViewingHistory = writable(false);
export const historySearchTerm = writable('');
export const selectedHistoryRows = writable([] as number[]);
export const historyMethodFilter = writable('all');

export const activeTab = writable('top');
export const openAugmentationSection = writable('augment');
export const openAugMethod = writable('sae');
export const genNum = writable([5]);
export const llmPrompt = writable('');

export const activeInterpolateTab = writable('suggested');
export const selectedIntPoint = writable(-1);
export const nearestIntPoints = writable([] as number[]);
export const interpolatePrompt = writable('');

export const colorBy = writable('default');
export const additionalHighlight = writable('top 10 nearest neighbors');

export const tableSortBy = writable('id');
export const tableSortDirection = writable(1);
export const tableHeight = writable(minTableHeight);
export const editID = writable(-1);
export const editSentence = writable('');

export const minSentLength = writable(0);
export const maxSentLength = writable(0);
export const sentLengthRange = writable([0, 0]);
export const selectedSentLengthRange = writable([0, 0]);
export const maxCategoryCount = writable(0);

export const topFeatures = writable([] as Feature[]);
export const nearestNeighbors = writable([] as number[]);
export const similarFeatures = writable([] as number[]);
export const promptIdeas = writable([] as string[]);
export const featureSearchTerm = writable('');

export const selectedGeneratedRows = writable([] as number[]);
export const resultSearchTerm = writable('');

export const showModal = writable(false);
export const modalType = writable('download');
export const filename = writable('');
export const sentencesToDelete = writable([] as number[]);
export const newSentence = writable('');

// triggers
export const resetViewTrigger = writable(false);
export const resetSentLengthTrigger = writable(false);
export const topFeaturesTrigger = writable(false);

// category store
function createCategoryStore() {
    const categoryInfo = writable<Category[]>([]);
    const selectedCategories = writable<string[]>([]);

    const store = derived(
        [categoryInfo, selectedCategories],
        ([$categoryInfo, $selectedCategories]) => ({
            categoryInfo: $categoryInfo,
            categories: $categoryInfo.map(c => c.name),
            categoryInfoByCount: [...$categoryInfo].sort((a, b) => b.count - a.count),
            categoryInfoByLength: [...$categoryInfo].sort((a, b) => a.avgLength - b.avgLength),
            selectedCategories: $selectedCategories
        })
    );

    return {
        subscribe: store.subscribe,
        setCategoryInfo: categoryInfo.set,
        updateCategoryInfo: categoryInfo.update,
        selectAll: () => {
            selectedCategories.update(() => {
                return get(categoryInfo).map((c: Category) => c.name);
            });
        },
        clear: () => selectedCategories.set([]),
        setSelectedCategories: selectedCategories.set,
        updateSelectedCategories: selectedCategories.update,
        changeSelectedCategory: (category: string) => {
            selectedCategories.update(($selectedCategories) => {
                if ($selectedCategories.includes(category)) {
                    return $selectedCategories.filter(c => c !== category);
                } else {
                    return [...$selectedCategories, category];
                }
            });
        }
    };
}

export const categoryStore = createCategoryStore();

// dataset store
function createDatasetStore() {
    const { subscribe, set, update } = writable<DatasetInfo | null>(null);

    return {
        subscribe,
        set: (value: DatasetInfo) => {
            set(value);
            if (browser) {
                const currentDataset = get(dataset);
                localStorage.setItem(currentDataset, JSON.stringify(value));
                console.log('Data saved to local storage');
            }
        },
        update,
        load: (dataset: string) => {
            if (browser) {
                const storedData = localStorage.getItem(dataset);
                if (storedData) {
                    console.log(`${dataset} data loaded from local storage`);
                    const parsedData = JSON.parse(storedData);
                    return parsedData;
                }
            }
            return null;
        }
    };
}

export const datasetInfo = createDatasetStore();

// derived stores from dataset store
export const all_data = derived(datasetInfo, $datasetInfo => $datasetInfo?.all_data || []);
export const x_min = derived(datasetInfo, $datasetInfo => $datasetInfo?.x_min || 0);
export const x_max = derived(datasetInfo, $datasetInfo => $datasetInfo?.x_max || 0);
export const y_min = derived(datasetInfo, $datasetInfo => $datasetInfo?.y_min || 0);
export const y_max = derived(datasetInfo, $datasetInfo => $datasetInfo?.y_max || 0);
export const og_x_min = derived(datasetInfo, $datasetInfo => $datasetInfo?.og_x_min || 0);
export const og_x_max = derived(datasetInfo, $datasetInfo => $datasetInfo?.og_x_max || 0);
export const og_y_min = derived(datasetInfo, $datasetInfo => $datasetInfo?.og_y_min || 0);
export const og_y_max = derived(datasetInfo, $datasetInfo => $datasetInfo?.og_y_max || 0);
export const old_size = derived(datasetInfo, $datasetInfo => $datasetInfo?.old_size || 0);