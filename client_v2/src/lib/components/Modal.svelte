<script lang="ts">
	// A plain modal with a title bar and a body slot. Same look as ConfirmDialog,
	// but wide and content-driven, for forms and tables.
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		width?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let { open, title, onclose, width = '560px', children, footer }: Props = $props();

	let dialog = $state<HTMLDivElement | null>(null);
	let opener: HTMLElement | null = null;
	$effect(() => {
		if (open) {
			opener ??= document.activeElement as HTMLElement | null;
			dialog?.focus();
		} else if (opener) {
			opener.focus();
			opener = null;
		}
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') onclose();
	}}
/>

{#if open}
	<div class="overlay">
		<button class="backdrop" tabindex="-1" aria-hidden="true" onclick={onclose}></button>
		<div
			class="dialog"
			style:width
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			bind:this={dialog}
		>
			<div class="head">
				<span class="title">{title}</span>
				<button class="x" onclick={onclose} aria-label={m['buttons.close']()}><X size={16} /></button>
			</div>
			<div class="body">{@render children()}</div>
			{#if footer}<div class="foot">{@render footer()}</div>{/if}
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 60;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 8vh 16px 16px;
		overflow-y: auto;
	}
	.backdrop {
		position: fixed;
		inset: 0;
		border: none;
		margin: 0;
		padding: 0;
		background: transparent;
		cursor: default;
	}
	.dialog {
		position: relative;
		z-index: 1;
		max-width: 100%;
		background: var(--bg);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-xl);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 20px 0;
	}
	.title {
		font-weight: 700;
		font-size: 15px;
	}
	.x {
		margin-left: auto;
		color: var(--text-dim);
		cursor: pointer;
		padding: 4px 8px;
		background: none;
		border: none;
		display: inline-flex;
	}
	.x:hover {
		color: var(--text);
	}
	.body {
		padding: 14px 20px 4px;
		font-size: 13px;
		max-height: 70vh;
		overflow: auto;
	}
	.foot {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 14px 20px 18px;
	}
</style>
