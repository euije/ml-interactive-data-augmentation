<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script lang="ts">
	import { Button, Spinner, Textarea } from "flowbite-svelte";
	import {
		isGenerating,
		isMounting,
		llmPrompt,
		promptIdeas,
	} from "../../store";
	import { CloseOutline } from "flowbite-svelte-icons";

	const resetLLMPrompt = () => {
		// clear prompt
		llmPrompt.set("");
	};

	let textareaprops = {
		// textarea properties
		id: "prompt",
		name: "prompt",
		label: "Your prompt",
		rows: 2,
		placeholder:
			'e.g., "make the tone of this sentence more urgent", "vary the wording by substituting some synonyms", or "add concept X to the sentence in differing amounts".',
	};

	// change prompt
	let copiedId = -1;
	const changeLLMPrompt = (prompt: string, id: number) => {
		copiedId = id;
		llmPrompt.set(prompt);

		setTimeout(() => {
			copiedId = -1;
		}, 3000);
	};
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div id="prompt-box">
	<div>
		<div
			class="default-msg"
			class:hide={$promptIdeas && $promptIdeas.length > 0}
		>
			<Spinner size="4" /> loading prompt ideas...
		</div>
		<div
			class="ideas-and-header"
			class:hide={!$promptIdeas || $promptIdeas.length === 0}
		>
			<div class="ideas-box">
				<b>Click to use a prompt idea:</b>
				<i>scroll for more!</i>
			</div>
			<div class="prompt-idea-contain">
				<div class="prompt-ideas">
					{#each $promptIdeas as idea, i}
						<div
							class="prompt-idea"
							class:no-click={copiedId !== -1 ||
								$isGenerating ||
								$isMounting}
							class:selected={i === copiedId}
							on:click={() => changeLLMPrompt(idea, i)}
						>
							{i === copiedId ? "copied prompt!" : idea}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
	<div class="gen-header info-text prompt" class:test={$llmPrompt === ""}>
		<b>Or enter your own prompt:</b>
		<Button
			size="xs"
			color="light"
			button-type="go-to-parent"
			title="clear prompt"
			disabled={$llmPrompt === ""}
			on:click={resetLLMPrompt}><CloseOutline /> clear prompt</Button
		>
	</div>
	<Textarea
		{...textareaprops}
		bind:value={$llmPrompt}
		area-type={$isGenerating || $isMounting ? "disabled" : ""}
	/>
</div>

<style lang="scss">
	#prompt-box {
		padding-top: 0.25rem;
		transition: 0.3s;

		.default-msg {
			margin-left: 0 !important;
			margin-bottom: 1.5rem;

			&.hide {
				height: 0;
				margin: 0;
			}
		}

		.ideas-and-header {
			transition: 0.3s;
			&.hide {
				height: 0;
				margin: 0;
			}

			.ideas-box {
				display: flex;
				justify-content: space-between;
				align-items: center;

				i {
					font-size: 12px;
				}
			}
		}

		.prompt-idea-contain {
			overflow-x: auto;
			width: 100%;
			margin: 0.5rem 0;
			transition: 0.3s;
			.prompt-ideas {
				display: inline-flex;
				gap: 0.75rem;
				font-size: 12px;
				margin-bottom: 0.25rem;

				.prompt-idea {
					padding: 0.5rem 0.75rem;
					width: 250px;
					display: inline-flex;
					align-items: center;
					border: 1px solid var(--color-border);
					// background-color: var(--color-border-light);
					border-radius: 0.25rem;
					transition: 0.3s;
					cursor: pointer;
					font-family: var(--font-mono);
					font-size: 11px;

					&:hover {
						border-color: var(--color-accent-light) !important;
						background-color: rgb(255, 241, 238, 0.5);
						transform: scale(0.97);
					}

					&.selected {
						background-color: var(--color-accent-lightest);
						border-color: var(--color-accent-med);
						color: var(--color-accent);
						text-align: center;
					}

					&.no-click {
						pointer-events: none;

						&:not(.selected) {
							opacity: 0.5;
						}
					}

					:global(svg) {
						margin-bottom: 0.5rem;
					}
				}
			}
		}
	}
</style>
