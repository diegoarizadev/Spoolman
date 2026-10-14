<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { lightbox } from '$lib/stores/lightbox.svelte';
	import * as m from '$lib/paraglide/messages';

	let many = $derived(lightbox.urls.length > 1);

	function onkeydown(e: KeyboardEvent) {
		if (!lightbox.isOpen) return;
		if (e.key === 'Escape') lightbox.close();
		else if (e.key === 'ArrowLeft') lightbox.step(-1);
		else if (e.key === 'ArrowRight') lightbox.step(1);
	}
</script>

<svelte:window {onkeydown} />

{#if lightbox.isOpen}
	<div class="overlay" role="dialog" aria-modal="true" aria-label={m['photo.viewer']()}>
		<button class="backdrop" tabindex="-1" aria-hidden="true" onclick={() => lightbox.close()}></button>
		<img src={lightbox.urls[lightbox.index]} alt="" />
		<button class="x" type="button" onclick={() => lightbox.close()} aria-label={m['buttons.close']()}>
			<X size={20} />
		</button>
		{#if many}
			<button class="nav prev" type="button" onclick={() => lightbox.step(-1)} aria-label={m['photo.prev']()}>
				<ChevronLeft size={26} />
			</button>
			<button class="nav next" type="button" onclick={() => lightbox.step(1)} aria-label={m['photo.next']()}>
				<ChevronRight size={26} />
			</button>
			<span class="count">{lightbox.index + 1} / {lightbox.urls.length}</span>
		{/if}
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 90;
		background: rgba(0, 0, 0, 0.88);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}
	.backdrop {
		position: absolute;
		inset: 0;
		border: none;
		background: transparent;
		cursor: zoom-out;
	}
	img {
		position: relative;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: 6px;
	}
	.x,
	.nav {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.14);
		color: #fff;
		cursor: pointer;
	}
	.x:hover,
	.nav:hover {
		background: rgba(255, 255, 255, 0.26);
	}
	.x {
		top: 16px;
		right: 16px;
	}
	.nav {
		top: 50%;
		margin-top: -20px;
	}
	.prev {
		left: 16px;
	}
	.next {
		right: 16px;
	}
	.count {
		position: absolute;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		color: #fff;
		font-size: 12px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 10px;
		padding: 2px 10px;
	}
</style>
