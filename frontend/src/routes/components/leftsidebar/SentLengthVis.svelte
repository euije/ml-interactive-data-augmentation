<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import RangeSlider from "svelte-range-slider-pips";
	import {
		all_data,
		categoryStore,
		hideVisualizations,
		hoveredCategory,
		hoveredSentenceType,
		maxSentLength,
		minSentLength,
		resetSentLengthTrigger,
		selectedSentLengthRange,
		sentenceTypeInfo,
		sentLengthRange,
	} from "../../store";
	import { getSentLengthColor } from "../../utils/helpers";

	$: minSentLength.set(Math.min(...$all_data.map((d) => d.length)));
	$: maxSentLength.set(Math.max(...$all_data.map((d) => d.length)));

	// New variables for sentence length histogram
	let sentenceLengthData: {
		minLength: number;
		maxLength: number;
		count: number;
	}[] = [];
	let hoveredLengthInfo: {
		minLength: number;
		maxLength: number;
		count: number;
	} | null = null;
	let histogramTooltipX = 0;
	let histogramTooltipY = 0;

	$: range = $maxSentLength - $minSentLength + 1;

	$: numBars = Math.min(30, (range + 1) / 2);

	// Compute sentence length distribution
	$: {
		const lengthCounts: { [key: number]: number } = {};
		$all_data.forEach((sentence) => {
			const length = sentence.length;
			lengthCounts[length] = (lengthCounts[length] || 0) + 1;
		});

		const allLengths = Object.keys(lengthCounts).map(Number);
		const barWidth = Math.ceil(range / numBars);

		// Generate all bars first
		const allBars = Array.from({ length: numBars }, (_, i) => {
			const rangeStart = $minSentLength + i * barWidth;
			const rangeEnd = Math.min(
				rangeStart + barWidth - 1,
				$maxSentLength,
			);
			const count = allLengths
				.filter((length) => length >= rangeStart && length <= rangeEnd)
				.reduce((sum, length) => sum + lengthCounts[length], 0);
			return { minLength: rangeStart, maxLength: rangeEnd, count };
		});

		// Find the last non-zero count bar
		const lastNonZeroIndex = allBars.reduceRight((acc, bar, index) => {
			if (acc === -1 && bar.count > 0) {
				return index;
			}
			return acc;
		}, -1);

		// Keep all bars up to and including the last non-zero count bar
		sentenceLengthData = allBars.slice(0, lastNonZeroIndex + 1);
	}

	// Find max count for scaling
	$: maxLengthCount = Math.max(...sentenceLengthData.map((d) => d.count));

	// Handle mouse events
	function handleHistogramMouseEnter(
		event: MouseEvent,
		data: { minLength: number; maxLength: number; count: number },
	) {
		hoveredLengthInfo = data;
		histogramTooltipX = event.clientX;
		histogramTooltipY = event.clientY;
		selectedSentLengthRange.set([data.minLength, data.maxLength]);
	}

	function handleHistogramMouseLeave() {
		hoveredLengthInfo = null;
		selectedSentLengthRange.set([0, 0]);
	}

	function handleHistogramMouseMove(event: MouseEvent) {
		histogramTooltipX = event.clientX;
		histogramTooltipY = event.clientY;
	}

	const resetSentLengthRange = () => {
		sentLengthRange.set([$minSentLength, $maxSentLength]);
	};

	$: {
		if ($resetSentLengthTrigger) {
			resetSentLengthRange();
			resetSentLengthTrigger.set(false);
		}
	}

	// Compute sentence length stats
	$: curCategoryMin = $categoryStore.categoryInfo.find(
		(c) => c.name === $hoveredCategory,
	)?.minLength;
	$: curCategoryMax = $categoryStore.categoryInfo.find(
		(c) => c.name === $hoveredCategory,
	)?.maxLength;

	$: curSentTypeMin = $sentenceTypeInfo.find(
		(c) => c.name === $hoveredSentenceType,
	)?.minLength;
	$: curSentTypeMax = $sentenceTypeInfo.find(
		(c) => c.name === $hoveredSentenceType,
	)?.maxLength;

	$: meanSentenceLength =
		$all_data.reduce((acc, d) => acc + d.length, 0) / $all_data.length;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div class="sentence-length-histogram">
	<div class="chart-outer" class:hide={$hideVisualizations}>
		<div class="chart-container">
			<svg width="100%" height="100">
				<defs>
					<!-- create numBars linear gradients -->
					{#each sentenceLengthData as data, i}
						<linearGradient
							id="grad{i}"
							x1="0%"
							y1="0%"
							x2="100%"
							y2="0%"
						>
							<stop
								offset="0%"
								stop-color="rgb({getSentLengthColor(
									data.minLength,
									$minSentLength,
									$maxSentLength,
								)})"
							/>
							<stop
								offset="100%"
								stop-color="rgb({getSentLengthColor(
									data.maxLength,
									$minSentLength,
									$maxSentLength,
								)})"
							/>
						</linearGradient>
					{/each}
				</defs>
				{#each sentenceLengthData as data, i}
					<rect
						x="{(i / sentenceLengthData.length) * 100}%"
						y="{data.count === 0
							? 100 - (data.count / maxLengthCount) * 100
							: 100 -
								(data.count / maxLengthCount) * 97.5 -
								2.5}%"
						width="{100 / sentenceLengthData.length}%"
						height="{data.count === 0
							? (data.count / maxLengthCount) * 100
							: 2.5 + (data.count / maxLengthCount) * 97.5}%"
						fill="url(#grad{i})"
						on:mouseenter={(e) =>
							handleHistogramMouseEnter(e, data)}
						on:mouseleave={handleHistogramMouseLeave}
						on:mousemove={handleHistogramMouseMove}
						class:faded={(!curCategoryMin &&
							!curCategoryMax &&
							($sentLengthRange[0] > data.maxLength ||
								$sentLengthRange[1] < data.minLength)) ||
							(curCategoryMin &&
								curCategoryMax &&
								(curCategoryMin > data.maxLength ||
									curCategoryMax < data.minLength)) ||
							(!curSentTypeMin &&
								!curSentTypeMax &&
								($sentLengthRange[0] > data.maxLength ||
									$sentLengthRange[1] < data.minLength)) ||
							(curSentTypeMin &&
								curSentTypeMax &&
								(curSentTypeMin > data.maxLength ||
									curSentTypeMax < data.minLength))}
					/>
				{/each}
			</svg>
		</div>
	</div>
	<div id="slider" class:vis-hide={$hideVisualizations}>
		<p>{$minSentLength}</p>
		<RangeSlider
			float
			range
			bind:values={$sentLengthRange}
			min={$minSentLength}
			max={$maxSentLength}
		/>
		<p>{$maxSentLength}</p>
	</div>
	<div class="caption-container">
		<p class="emphasis">
			mean: {meanSentenceLength.toFixed(2)} words per sentence
		</p>
		<div class="span-select">
			<span
				class="select"
				on:click={resetSentLengthRange}
				class:noclick={$sentLengthRange[0] === $minSentLength &&
					$sentLengthRange[1] === $maxSentLength}>reset range</span
			>
		</div>
	</div>
	{#if hoveredLengthInfo}
		<div
			class="tooltip"
			style="left: {histogramTooltipX}px; top: {histogramTooltipY}px;"
		>
			<p>
				<span style="font-weight:500"
					>{hoveredLengthInfo.minLength} - {hoveredLengthInfo.maxLength}
					words:
				</span>
				{hoveredLengthInfo.count} sentences
			</p>
			<p>
				{((hoveredLengthInfo.count / $all_data.length) * 100).toFixed(
					2,
				)}% of dataset
			</p>
		</div>
	{/if}
</div>

<style lang="scss">
	.sentence-length-histogram {
		position: relative;

		.chart-container {
			overflow: hidden;
			margin-top: 0.5rem;
		}
		svg {
			display: block;
		}
		rect {
			transition: 0.3s;
			&:hover {
				opacity: 0.7;
			}

			&.faded {
				opacity: 0.2;

				&:hover {
					opacity: 0.4;
				}
			}
		}

		.tooltip {
			p {
				color: white;
			}
		}

		#slider {
			p {
				font-size: smaller;
			}

			&.vis-hide {
				margin-top: 0;
			}
		}

		.chart-outer {
			&.hide {
				svg {
					height: 0;
				}
			}
		}
	}
</style>
