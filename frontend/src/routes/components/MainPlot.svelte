<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import type { Point } from "../utils/types";
	import { Deck, OrthographicView } from "@deck.gl/core";
	import { ScatterplotLayer } from "@deck.gl/layers";
	import {
		all_data,
		leftSidebarOpen,
		result_ids,
		hover_id,
		colorBy,
		categoryStore,
		isMounting,
		minSentLength,
		maxSentLength,
		hoveredCategory,
		selectedSentLengthRange,
		isAccordionOpen,
		resetViewTrigger,
		resetViewDisabled,
		click_id,
		searchTerm,
		additionalHighlight,
		nearestNeighbors,
		rightSidebarOpen,
		openAugMethod,
		old_size,
		nearestIntPoints,
		selectedIntPoint,
		isGenerating,
		hoveredSentenceType,
		isEditing,
		parentOverlay,
	} from "../store";
	import { onMount } from "svelte";
	import { Button, ButtonGroup, Spinner } from "flowbite-svelte";
	import { ZoomInOutline, ZoomOutOutline } from "flowbite-svelte-icons";
	import {
		getCategoryColor,
		getSentLengthColor,
		getContrastingBackground,
	} from "../utils/helpers";
	import CategoryFilter from "./leftsidebar/CategoryFilter.svelte";
	import { new_category, sentTypeMap } from "../utils/consts";
	import {
		CompositeLayer,
		Layer,
		LineLayer,
		PolygonLayer,
		TextLayer,
		type CompositeLayerProps,
	} from "deck.gl";

	let deckgl: Deck<OrthographicView>;
	const minZoom = 7;
	const maxZoom = 10;
	const zoomThreshold = 7;
	const arrowZoomThreshold = 8.5;
	const arrowZoomThreshold2 = 9.5;
	const defaultOpacity = 255;
	const middleOpacity = 120;
	const lightOpacity = 75;
	const fadeOpacity = 25;

	const defaultColor = sentTypeMap["old"];
	const hoverColor = [39, 144, 235];
	const clickColor = sentTypeMap["new"];
	const parentColor = [170, 60, 243];
	const interpolateColor = [240, 213, 57];

	// map children to parents
	let parentPoints = [] as number[];
	let parentChildMap = new Map<number, number[]>();
	$: {
		// find all unique values of og_id in all_data
		if ($all_data) {
			parentPoints = Array.from(
				new Set(
					$all_data
						.map((d) => d.og_id)
						.filter((d) => d !== undefined),
				),
			) as number[];
			// map parent id to child ids
			parentChildMap = new Map<number, number[]>();
			parentPoints.forEach((parent) => {
				const children = $all_data
					.filter((d) => d.og_id === parent)
					.map((d) => d.id);
				parentChildMap.set(parent, children);
			});
		}
	}

	// derived stores for interpolation
	$: initialX = $click_id === -1 || !$rightSidebarOpen ? 0 : 0.9;
	$: initialY = $isAccordionOpen ? -0.6 : -0.15;
	$: initialTarget = [initialX, initialY];

	$: clickedPoint = $all_data.find((d) => d.id === $click_id);
	$: selectedEndPoint = $all_data.find((d) => d.id === $selectedIntPoint);

	let isDrawingArrow = true;
	let arrowEnd: number[] | null = null;
	$: interpolateActive = $openAugMethod === "interpolate" && $click_id !== -1;
	$: allowDrawing = interpolateActive;
	$: arrowStart = clickedPoint ? [clickedPoint.x, clickedPoint.y] : null;

	$: {
		// reset arrow drawing if interpolation is not active
		if (!interpolateActive) {
			isDrawingArrow = false;
			nearestIntPoints.set([]);
			if (!allowDrawing) {
				arrowEnd = null;
				selectedIntPoint.set(-1);
			}
		} else {
			isDrawingArrow = true;
			if (!allowDrawing) {
				arrowEnd = null;
				nearestIntPoints.set([]);
				selectedIntPoint.set(-1);
			}
		}
	}

	$: {
		// draw new arrow and find nearest points
		if ($selectedIntPoint !== -1) {
			arrowEnd = selectedEndPoint
				? [selectedEndPoint.x, selectedEndPoint.y]
				: null;
			isDrawingArrow = false;
			if (arrowEnd !== null) {
				findNearestPoints(arrowEnd);
			}
		}
	}

	// Helper function to find a point by id
	const findPointById = (id: number): Point | undefined =>
		$all_data.find((d) => d.id === id);

	const findParentById = (id: number): Point | undefined =>
		$all_data.find(
			(d) =>
				d.id === id &&
				d.id !== $click_id &&
				d.id !== $hover_id &&
				d.id !== $selectedIntPoint,
		);

	// Derived store for sorted data
	$: sortedData =
		$click_id !== -1 ||
		$hover_id !== -1 ||
		$selectedIntPoint !== -1 ||
		parentPoints.length > 0
			? ([
					...$all_data.filter(
						// normal points (not clicked, hovered, or selected for interpolation)
						(d) =>
							d.id !== $click_id &&
							d.id !== $hover_id &&
							d.id !== $selectedIntPoint &&
							!parentPoints.includes(d.id),
					),
					...(parentPoints.length > 0
						? parentPoints
								.map((id) => findParentById(id))
								.filter(Boolean)
						: []), // parent points
					...($selectedIntPoint !== -1
						? [findPointById($selectedIntPoint)].filter(Boolean)
						: []), // selected point for interpolation
					...($click_id !== -1
						? [findPointById($click_id)].filter(Boolean)
						: []), // clicked point
					...($hover_id !== -1
						? [findPointById($hover_id)].filter(Boolean)
						: []), // hovered point
				] as Point[])
			: $all_data;

	let initialView = {
		// initial view state
		zoom: 8,
		target: initialTarget as [number, number],
		minZoom: minZoom,
		maxZoom: maxZoom,
		transitionDuration: 500,
	};
	let zoom = initialView.zoom as number;
	let curTarget = initialView.target as [number, number];

	$: {
		if (initialTarget) {
			initialView.target = initialTarget as [number, number];
		}
	}

	let minZoomDisabled = false;
	let maxZoomDisabled = false;

	// Arrow layer for interpolation
	interface ArrowLayerProps extends CompositeLayerProps {
		data: any[];
		getSourcePosition: (d: any) => [number, number];
		getTargetPosition: (d: any) => [number, number];
		getColor: (d: any) => [number, number, number, number];
		getWidth: (d: any) => number;
		zoom: number;
	}

	class ArrowLayer extends CompositeLayer<ArrowLayerProps> {
		static layerName = "ArrowLayer";
		static defaultProps = {
			getSourcePosition: {
				type: "accessor",
				value: (d: any) => d.sourcePosition,
			},
			getTargetPosition: {
				type: "accessor",
				value: (d: any) => d.targetPosition,
			},
			getColor: { type: "accessor", value: [0, 0, 0, 255] },
			getWidth: { type: "accessor", value: 1 },
			zoom: { type: "number", value: 8 },
		};

		renderLayers() {
			const {
				data,
				getSourcePosition,
				getTargetPosition,
				getColor,
				getWidth,
				zoom,
			} = this.props;

			const lineScaleFactor =
				zoom > arrowZoomThreshold2
					? 2
					: zoom > arrowZoomThreshold
						? 1.75
						: 1; // Scale line width up
			const arrowHeadScaleFactor =
				zoom > arrowZoomThreshold2
					? 0.5
					: zoom > arrowZoomThreshold
						? 0.75
						: 1; // Scale down for arrow head

			const lineLayer = new LineLayer(
				this.getSubLayerProps({
					id: "line",
					data,
					getSourcePosition,
					getTargetPosition: (d: any) => {
						const target = getTargetPosition(d);
						const source = getSourcePosition(d);
						const direction = [
							target[0] - source[0],
							target[1] - source[1],
						];
						const length = Math.sqrt(
							direction[0] * direction[0] +
								direction[1] * direction[1],
						);
						const unitDirection = [
							direction[0] / length,
							direction[1] / length,
						];
						const arrowHeadSize =
							getWidth(d) * 0.02 * arrowHeadScaleFactor;
						const arrowHeadLength = arrowHeadSize * 1.25;

						// Adjust the end point of the line to be at the base of the arrow head
						return [
							target[0] - unitDirection[0] * arrowHeadLength,
							target[1] - unitDirection[1] * arrowHeadLength,
						];
					},
					getColor,
					getWidth: (d: any) => getWidth(d) * lineScaleFactor, // Scale line width up
				}),
			);

			const arrowHeadLayer = new PolygonLayer(
				this.getSubLayerProps({
					id: "arrow-head",
					data,
					getPolygon: (d: any) => {
						const source = getSourcePosition(d);
						const target = getTargetPosition(d);
						const direction = [
							target[0] - source[0],
							target[1] - source[1],
						];
						const length = Math.sqrt(
							direction[0] * direction[0] +
								direction[1] * direction[1],
						);
						const unitDirection = [
							direction[0] / length,
							direction[1] / length,
						];
						const perpDirection = [
							-unitDirection[1],
							unitDirection[0],
						];

						const arrowHeadSize =
							getWidth(d) * 0.02 * arrowHeadScaleFactor; // Scale arrow head size down
						const arrowHeadLength = arrowHeadSize * 1.25;
						// The arrow tip is now at the target point
						const arrowTip = target;

						// The base of the arrow is now where the line ends
						const arrowHeadBase = [
							target[0] - unitDirection[0] * arrowHeadLength,
							target[1] - unitDirection[1] * arrowHeadLength,
						];

						return [
							arrowTip,
							[
								arrowHeadBase[0] +
									(perpDirection[0] * arrowHeadSize) / 2,
								arrowHeadBase[1] +
									(perpDirection[1] * arrowHeadSize) / 2,
							],
							[
								arrowHeadBase[0] -
									(perpDirection[0] * arrowHeadSize) / 2,
								arrowHeadBase[1] -
									(perpDirection[1] * arrowHeadSize) / 2,
							],
						];
					},
					getFillColor: getColor,
					getLineColor: [0, 0, 0, 0],
				}),
			);

			return [lineLayer, arrowHeadLayer];
		}
	}

	const toArrowLayer = (arrowStart: any, arrowEnd: any, zoom: number) => {
		return new ArrowLayer({
			id: "arrow-layer",
			data:
				arrowStart && arrowEnd
					? [{ sourcePosition: arrowStart, targetPosition: arrowEnd }]
					: [],
			getSourcePosition: (d: any) => d.sourcePosition,
			getTargetPosition: (d: any) => d.targetPosition,
			getWidth: () => 3,
			getColor: () => [0, 0, 0, defaultOpacity],
			zoom: zoom,
		});
	};

	// determine if parent overlay should be shown
	const showParentPoint = (d: Point, allData: Point[]) => {
		const hoveredPoint = allData.find((d) => d.id === $hover_id);
		return (
			($click_id === -1 &&
				$hover_id === -1 &&
				$hoveredCategory === "" &&
				$hoveredSentenceType === "" &&
				$selectedSentLengthRange[0] === 0 &&
				$result_ids.includes(d.id)) ||
			$click_id === d.id ||
			(clickedPoint && clickedPoint.og_id === d.id) ||
			($click_id === -1 &&
				($hover_id === d.id ||
					(hoveredPoint &&
						hoveredPoint.og_id === d.id &&
						$result_ids.includes(hoveredPoint.og_id)) ||
					($result_ids.includes(d.id) &&
						!parentPoints.includes($hover_id) &&
						hoveredPoint &&
						(!hoveredPoint.og_id ||
							!$result_ids.includes(hoveredPoint.og_id)))))
		);
	};

	// Parent overlay data
	const prepareLineData = (
		allData: Point[],
		parentChildMap: Map<number, number[]>,
	) => {
		const lineData = [];
		for (const [parentId, childIds] of parentChildMap.entries()) {
			const parent = allData.find(
				(d) => d.id === parentId && showParentPoint(d, allData),
			);
			if (parent) {
				for (const childId of childIds) {
					if (
						$click_id !== -1 &&
						$click_id !== childId &&
						$click_id !== parentId
					) {
						continue;
					}
					const child = allData.find((d) => d.id === childId);
					if (
						child &&
						($result_ids.includes(childId) ||
							$click_id === childId ||
							$click_id === parentId)
					) {
						lineData.push({
							sourcePosition: [parent.x, parent.y],
							targetPosition: [child.x, child.y],
							parentId,
							childId,
						});
					}
				}
			}
		}
		return lineData;
	};

	// Main scatterplot layer
	const toPointLayer = (points: Point[]) => {
		// main scatterplot(s)
		const scatterplotLayer = new ScatterplotLayer({
			id: "point-layer",
			pickable: true,
			data: points,
			stroked: true,
			getPosition: (d: Point) => [d.x, d.y],
			getRadius: (d: Point) => {
				let size = 0.02;
				let multiplier =
					($click_id !== -1 && $click_id === d.id) || // clicked point
					($hover_id !== -1 && $hover_id === d.id) || // hovered point
					($selectedIntPoint !== -1 && $selectedIntPoint === d.id) || // selected point for interpolation
					(d.category === new_category &&
						d.og_id === $click_id &&
						d.id >= $old_size) || // newest child sentences
					(clickedPoint && clickedPoint.og_id == d.id) ||
					($parentOverlay &&
						parentPoints.includes(d.id) &&
						showParentPoint(d, points)) // parent sentence
						? 2
						: (clickedPoint &&
									(($additionalHighlight.includes(
										"cluster",
									) &&
										d.category === clickedPoint.category) || // points in same cluster
										($additionalHighlight.includes(
											"neighbor",
										) &&
											$nearestNeighbors.includes(d.id)) || // nearest neighbors
										(interpolateActive &&
											allowDrawing &&
											$nearestIntPoints.includes(
												d.id,
											)))) || // nearest interpolated points
							  (d.category === new_category &&
									d.og_id === $click_id) // older child sentences
							? 1.25
							: 1;
				if (zoom && (zoom as number) >= zoomThreshold) {
					size = 0.01;
				}
				return size * multiplier;
			},
			getLineColor: (d: Point) =>
				d.id === $click_id || d.id === $selectedIntPoint
					? ([...clickColor, defaultOpacity] as [
							number,
							number,
							number,
							number,
						])
					: [255, 255, 255, 0],
			getLineWidth: (d: Point) =>
				d.id === $click_id || d.id === $selectedIntPoint ? 0.01 : 0,
			getFillColor: (d: Point) => {
				let default_color =
					d.category === new_category
						? clickColor // child sentences
						: (parentPoints.includes(d.id) &&
									$parentOverlay &&
									showParentPoint(d, points)) ||
							  (clickedPoint && clickedPoint.og_id == d.id)
							? parentColor // parent sentence
							: $selectedIntPoint && $selectedIntPoint === d.id
								? interpolateColor // selected point for interpolation
								: defaultColor; // all other points
				if ($categoryStore.categoryInfo && $colorBy === "category") {
					const category_color = getCategoryColor(
						d.category,
						$categoryStore.categoryInfo,
					);
					default_color = category_color;
				} else if ($colorBy === "sentence length") {
					const length_color = getSentLengthColor(
						d.length,
						$minSentLength,
						$maxSentLength,
					);
					default_color = length_color;
				} else if ($colorBy === "sentence type") {
					if (d.method) {
						const sentence_type_color =
							sentTypeMap[
								d.method.toLowerCase() as keyof typeof sentTypeMap
							];
						default_color = sentence_type_color;
					}
				}
				const opacity =
					$hover_id === d.id || // point is hovered point
					$hoveredCategory === d.category || // point has hovered category
					($hoveredSentenceType === "old" &&
						d.category !== new_category) || // point matches hovered sentence type
					($hoveredSentenceType === "new" &&
						d.category === new_category) ||
					($hoveredSentenceType !== "" &&
						$hoveredSentenceType === d.method?.toLowerCase()) ||
					$selectedSentLengthRange.includes(d.length) || // point is in hovered sentence length
					(!$hoveredCategory && // no hovered category
						!$hoveredSentenceType && // no hovered sentence type
						$selectedSentLengthRange[0] === 0 && // and no selected sentence length
						(($searchTerm === "" && // no search term
							($click_id === d.id || // point is clicked point
								($additionalHighlight.includes("cluster") &&
									clickedPoint?.category === d.category) || // points in same cluster and colorby = cluster
								($additionalHighlight.includes("neighbor") && // or colorby = neighbor
									$nearestNeighbors.includes(d.id)) || // and point is a neighbor
								(interpolateActive &&
									allowDrawing &&
									$nearestIntPoints.includes(d.id)) || // or point is in nearest interpolated points
								$selectedIntPoint === d.id || // or point is selected for interpolation
								(d.category === new_category &&
									d.og_id === $click_id &&
									(!interpolateActive ||
										(d.id >= $old_size &&
											interpolateActive))) || // or point is newest child sentence
								(clickedPoint &&
									clickedPoint.og_id == d.id))) || // or point is parent sentence
							(($searchTerm !== "" || $click_id === -1) &&
								(!$parentOverlay ||
									($parentOverlay &&
										((parentPoints.includes(d.id) &&
											showParentPoint(d, points)) ||
											d.category === new_category))) &&
								$result_ids.includes(d.id)))) // or search term is not empty or no clicked point
						? defaultOpacity
						: interpolateActive &&
							  d.category === new_category &&
							  d.og_id === $click_id // older child sentences
							? middleOpacity
							: fadeOpacity;
				return ($click_id !== -1 && $click_id === d.id) ||
					($hover_id !== -1 && $hover_id === d.id) // clicked or hovered point
					? ([...hoverColor, opacity] as [
							number,
							number,
							number,
							number,
						])
					: ([...default_color, opacity] as [
							number,
							number,
							number,
							number,
						]);
			},
			onHover: ({ object }) => {
				hover_id.set(object ? (object as Point).id : -1);
			},
			onClick: ({ object }) => {
				if (
					interpolateActive ||
					(object && (object as Point).id === $click_id)
				) {
					// clicking the same point
					return;
				}
				// clicking a new point
				click_id.set(object ? (object as Point).id : -1);
			},
			updateTriggers: {
				getRadius: [
					zoom,
					$hover_id,
					$click_id,
					$additionalHighlight,
					$nearestIntPoints,
					$selectedIntPoint,
					$old_size,
					interpolateActive,
					allowDrawing,
					$parentOverlay,
					$hoveredCategory,
					$hoveredSentenceType,
					$selectedSentLengthRange,
					$searchTerm,
					$result_ids,
				],
				getFillColor: [
					$result_ids,
					$hover_id,
					$click_id,
					$colorBy,
					$old_size,
					$categoryStore.categoryInfo,
					$hoveredCategory,
					$selectedSentLengthRange,
					$additionalHighlight,
					$nearestNeighbors,
					$nearestIntPoints,
					$selectedIntPoint,
					interpolateActive,
					allowDrawing,
					$hoveredSentenceType,
					$parentOverlay,
				],
				getLineColor: [$click_id, $selectedIntPoint],
				getLineWidth: [$click_id, $selectedIntPoint],
			},
		});

		if (!$parentOverlay || interpolateActive) {
			return scatterplotLayer;
		}

		const lineData = prepareLineData($all_data, parentChildMap);

		// Parent overlay layer
		const parentChildArrowLayer = new ArrowLayer({
			id: "parent-child-arrows",
			data: lineData,
			getSourcePosition: (d) => d.sourcePosition,
			getTargetPosition: (d) => d.targetPosition,
			getColor: (d) => {
				let myColor = parentColor;
				let parentPoint = $all_data.find((p) => p.id === d.parentId);
				if ($colorBy === "category") {
					const category = parentPoint?.category;
					if (category) {
						myColor = getCategoryColor(
							category,
							$categoryStore.categoryInfo,
						);
					}
				} else if ($colorBy === "sentence length") {
					myColor = getCategoryColor(
						new_category,
						$categoryStore.categoryInfo,
					);
				}
				return [...myColor, lightOpacity] as [
					number,
					number,
					number,
					number,
				];
			},
			getWidth: () => 1,
			zoom: zoom,
			updateTriggers: {
				getColor: [$click_id, $hover_id, $colorBy],
			},
		});

		return [parentChildArrowLayer, scatterplotLayer];
	};

	// Text layer for parent points
	const toTextLayer = (point: Point, children: number[]) => {
		const myData = [{ point: point, text: children.length.toString() }];

		return new TextLayer({
			id: "text-layer",
			data: myData,
			getPosition: (d) => [d.point.x, d.point.y],
			getText: (d) => d.text,
			getSize:
				12 +
				(zoom - minZoom) *
					(2 +
						(zoom > arrowZoomThreshold2
							? 3
							: zoom > arrowZoomThreshold
								? 1.5
								: 0)),
			getAngle: 0,
			getTextAnchor: "middle",
			getAlignmentBaseline: "center",
			getPixelOffset: [
				0,
				-12 -
					(zoom - minZoom) *
						(2 +
							(zoom > arrowZoomThreshold2
								? 6
								: zoom > arrowZoomThreshold
									? 3
									: 0)),
			],
		});
	};

	// debounce function for viewstate change
	function debounce(fn: (...args: any[]) => void, ms: number) {
		let timer: any;
		return (...args: any[]) => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				timer = null;
				fn(...args);
			}, ms);
		};
	}

	const handleRequest = debounce((viewState: any) => {
		const { zoom: newZoom, target: newTarget } = viewState;

		if (
			newZoom === initialView.zoom &&
			newTarget &&
			initialView.target &&
			newTarget[0] === initialView.target[0] &&
			newTarget[1] === initialView.target[1]
		) {
			resetViewDisabled.set(true);
		} else {
			resetViewDisabled.set(false);
		}
		// disable zoom in/out if min/max zoom reached
		minZoomDisabled = newZoom <= minZoom;
		maxZoomDisabled = newZoom >= maxZoom;

		zoom = newZoom;
		curTarget = newTarget;
		updateLayers();
	}, 100);

	// Tooltip format
	const formatTooltip = (d: Point) => {
		const sentLengthColor = getSentLengthColor(
			d.length,
			$minSentLength,
			$maxSentLength,
		);
		const categoryColor = getCategoryColor(
			d.category,
			$categoryStore.categoryInfo,
		);

		const [r1, g1, b1] = sentLengthColor;
		const [r2, g2, b2] = categoryColor;

		const sentLengthBg = getContrastingBackground(r1, g1, b1);
		const categoryBg = getContrastingBackground(r2, g2, b2);

		let tooltip = `
        ${d.tooltip}
        <div class='metadata'>
            <div>
                <span>ID:</span>
                <pre>${d.id}</pre>
            </div>
            <span class='divider'>/</span>
            <div>
                <span>Sentence Length:</span>
                <pre style='color:rgb(${sentLengthColor}); background-color:${sentLengthBg};'>${d.length} words</pre>
            </div>
            <span class='divider'>/</span>
            <div>
                <span>Category:</span>
                <pre style='color:rgb(${categoryColor}); background-color:${categoryBg};'>${d.category}</pre>
            </div>
    `;

		if (d.method) {
			tooltip += `
            <span class='divider'>/</span>
            <div>
                <span>Method:</span>
                <pre>${d.method === "SAE" ? "concept" : d.method.toLowerCase()}</pre>
            </div>
        `;
		}

		return tooltip + "</div>";
	};

	// Handle mouse move for drawing arrow
	function handleMouseMove(event: MouseEvent) {
		if (interpolateActive && arrowStart !== null && isDrawingArrow) {
			const rect = (event.target as HTMLElement).getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			arrowEnd = deckgl.getViewports()[0].unproject([x, y]);
		}
	}

	// Find nearest points to clicked point
	const topK = 20;
	function findNearestPoints(point: number[]) {
		// first filter out clicked point
		const allExceptClicked = $all_data.filter((d) => d.id !== $click_id);
		// find 20 nearest points in all_data to point
		const distances = allExceptClicked.map((d) => {
			const x = d.x - point[0];
			const y = d.y - point[1];
			return { distance: Math.sqrt(x * x + y * y), id: d.id };
		});

		const nearest = distances
			.sort((a, b) => a.distance - b.distance)
			.slice(0, topK);

		nearestIntPoints.set(nearest.map((d) => d.id));
		selectedIntPoint.set(nearest[0].id);
	}

	onMount(() => {
		// initalize deckgl on mount
		const layers = [toPointLayer(sortedData)];

		deckgl = new Deck<OrthographicView>({
			canvas: "my-canvas",
			initialViewState: initialView,
			controller: true,
			views: new OrthographicView({ flipY: false }),
			layers: layers,
			getTooltip: ({ object }) =>
				object && {
					html: formatTooltip(object as Point),
				},
			onViewStateChange: ({ viewState }) => {
				// disable reset if viewstate = initialView
				handleRequest(viewState);
			},
			onClick: (info) => {
				if (interpolateActive) {
					if (isDrawingArrow && arrowEnd !== null) {
						// stop drawing arrow and find nearest point
						findNearestPoints(arrowEnd);
						isDrawingArrow = false;
					} else {
						// start drawing arrow again
						isDrawingArrow = true;
						nearestIntPoints.set([]);
						selectedIntPoint.set(-1);
					}
				} else if (
					!info.layer &&
					info.index === -1 &&
					$click_id !== -1
				) {
					// clicking outside of points
					click_id.set(-1);
				}
			},
		});

		const canvas = document.getElementById("my-canvas");
		canvas?.addEventListener("mousemove", handleMouseMove);

		return () => {
			canvas?.removeEventListener("mousemove", handleMouseMove);
		};
	});

	const updateLayers = () => {
		// update layers if state changes
		const layers = [toPointLayer(sortedData)] as Layer[];

		if ($parentOverlay && !interpolateActive) {
			const hoveredPoint = sortedData.find((d) => d.id === $hover_id);
			if (parentPoints.includes($click_id)) {
				// clicked point is parent point
				const children = parentChildMap.get($click_id);
				if (children && clickedPoint) {
					layers.push(toTextLayer(clickedPoint, children));
				}
			} else if ($click_id === -1 && parentPoints.includes($hover_id)) {
				// hovered point is parent point and no clicked point
				const children = parentChildMap.get($hover_id);
				if (children && hoveredPoint) {
					layers.push(toTextLayer(hoveredPoint, children));
				}
			} else if (
				$click_id === -1 &&
				hoveredPoint &&
				hoveredPoint.category === new_category &&
				$result_ids.includes(hoveredPoint.og_id as number)
			) {
				// hovered point is child point and no clicked point
				const parentPoint = sortedData.find(
					(d) => d.id === hoveredPoint.og_id,
				);
				const children = parentChildMap.get(
					hoveredPoint.og_id as number,
				);
				if (children && parentPoint) {
					layers.push(toTextLayer(parentPoint, children));
				}
			}
		}

		if (arrowStart !== null && arrowEnd !== null) {
			// interpolate arrow
			layers.push(toArrowLayer(arrowStart, arrowEnd, zoom));
		}
		deckgl.setProps({ layers: layers });
	};

	$: {
		// keep track of changes in state
		if (
			deckgl &&
			sortedData &&
			$result_ids &&
			$hover_id !== null &&
			$click_id !== null &&
			$colorBy &&
			$categoryStore.categoryInfo &&
			$hoveredCategory !== null &&
			$selectedSentLengthRange &&
			$additionalHighlight &&
			$nearestNeighbors &&
			interpolateActive !== null &&
			allowDrawing !== null &&
			isDrawingArrow !== null &&
			arrowStart !== undefined &&
			arrowEnd !== undefined &&
			$nearestIntPoints !== undefined &&
			$selectedIntPoint !== null &&
			$old_size !== null &&
			$hoveredSentenceType !== null &&
			$parentOverlay !== null
		) {
			updateLayers();
		}
	}

	$: if ($resetViewTrigger) {
		resetView();
	}

	const resetView = () => {
		// reset view to initialView
		if ($resetViewDisabled) return;
		deckgl.setProps({
			initialViewState: { ...initialView, target: [0, 0] },
		});
		deckgl.setProps({ initialViewState: initialView });
		resetViewDisabled.set(true);
		resetViewTrigger.set(false);
	};

	const changeZoom = (zoomOut: boolean) => {
		// change zoom level
		if ((minZoomDisabled && zoomOut) || (maxZoomDisabled && !zoomOut))
			return;
		const newZoom = zoomOut
			? Math.max(zoom - 0.5, minZoom)
			: Math.min(zoom + 0.5, maxZoom);
		deckgl.setProps({
			initialViewState: {
				...initialView,
				zoom: newZoom,
				target: curTarget,
			},
		});
	};
</script>

<section id="main-plot">
	<div class="button-box" class:left-pad={$leftSidebarOpen}>
		<Button
			on:click={resetView}
			size="xs"
			color="dark"
			class="button-group"
			disabled={$resetViewDisabled}
			title="reset view">Reset View</Button
		>
		<ButtonGroup class="button-group">
			<Button
				size="xs"
				disabled={minZoomDisabled}
				title="zoom out"
				on:click={() => changeZoom(true)}
				><ZoomOutOutline size="sm" /></Button
			>
			<Button
				size="xs"
				disabled={maxZoomDisabled}
				title="zoom in"
				on:click={() => changeZoom(false)}
				><ZoomInOutline size="sm" /></Button
			>
		</ButtonGroup>
	</div>
	<div
		class="legend"
		class:right-pad={$rightSidebarOpen && $click_id === -1}
		class:extra-right-pad={$rightSidebarOpen && $click_id !== -1}
	>
		<div class="legend-inner">
			<div class="legend-item">
				<span style="background-color:var(--color-accent)" />original
				point
			</div>
			<div class="legend-item">
				<span style="background-color:var(--color-accent-4)" />parent
				point
			</div>
			<div class="legend-item">
				<span style="background-color:var(--color-accent-2)" />clicked /
				hovered point
			</div>
			<div class="legend-item">
				<span style="background-color:var(--color-accent-3)" />new /
				child point
			</div>
			<div class="legend-item">
				<span
					style="background-color:var(--color-accent-5)"
				/>interpolation point
			</div>
		</div>
	</div>
	<div style="width: 100%; height: 100%; position: relative;">
		<div
			id="spinner"
			class="text-center"
			class:hide={!$isMounting && !$isGenerating && !$isEditing}
			class:right-pad={$rightSidebarOpen && $click_id === -1}
			class:extra-right-pad={$rightSidebarOpen && $click_id !== -1}
			class:left-pad={$leftSidebarOpen}
			class:bottom-pad={$isAccordionOpen}
		>
			<Spinner size="20" />
		</div>
		<canvas id="my-canvas" />
	</div>
	<CategoryFilter />
</section>

<style lang="scss">
	#main-plot {
		position: relative;
		width: 100%;
		height: calc(100vh - 3.5rem);
		.button-box {
			position: absolute;
			top: 1rem;
			left: 4rem;
			z-index: 1;
			transition: 0.5s;

			&.left-pad {
				padding-left: 320px;
			}

			:global(.button-group) {
				display: flex !important;

				&:not(:last-child) {
					margin-bottom: 0.5rem;
				}
			}
		}

		.legend {
			position: absolute;
			top: 1rem;
			right: 4rem;
			z-index: 1;
			transition: 0.5s;
			font-size: x-small;
			font-family: var(--font-mono);

			&.right-pad {
				padding-right: 320px;
			}

			&.extra-right-pad {
				padding-right: 800px;
			}

			.legend-inner {
				border-radius: 0.5rem;
				border: 1px solid var(--color-border);
				padding: 0.5rem 1rem;
				display: grid;
				grid-template-columns: repeat(2, auto);
				column-gap: 1rem;
				background: rgb(255, 255, 255, 0.7);

				span {
					width: 0.3rem;
					height: 0.3rem;
					border-radius: 100%;
					display: inline-block;
					margin-right: 0.25rem;
				}
			}
		}

		#spinner {
			position: absolute;
			width: 100%;
			height: calc(100% - 4rem);
			background: rgb(255, 255, 255, 0.5);
			top: 0;
			left: 0;
			z-index: 2;
			display: flex;
			justify-content: center;
			transition: 0.3s;
			padding-bottom: 3.5rem;

			&.left-pad {
				padding-left: 320px;
			}

			&.right-pad {
				padding-right: 320px;
			}
			&.extra-right-pad {
				padding-right: 800px;
			}

			&.bottom-pad {
				height: calc(100vh - 4rem - 290px);
			}

			:global(svg) {
				margin: auto;
			}
		}
	}
</style>
