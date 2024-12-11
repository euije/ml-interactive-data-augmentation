<!--
  For licensing see accompanying LICENSE file.
  Copyright (C) 2024 Apple Inc. All Rights Reserved.
-->

<script>
	import Header from "./components/Header.svelte";
	import "../app.scss";
	import { isMounting } from "./store";
	import Modal from "./components/Modal.svelte";
</script>

<div class="app" class:no-pointer-events={$isMounting}>
	<Header />
	<main>
		<slot />
	</main>
	<Modal />
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		overflow-x: hidden;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>
