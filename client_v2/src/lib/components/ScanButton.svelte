<script lang="ts">
	// A small camera button that opens the QR scanner and hands back what it read.
	// Used beside the lot number and in the search box.
	import ScanLine from '@lucide/svelte/icons/scan-line';
	import QrScannerModal from './QrScannerModal.svelte';

	interface Props {
		label: string;
		title?: string;
		hint?: string;
		onresult: (text: string) => void;
	}

	let { label, title, hint, onresult }: Props = $props();
	let open = $state(false);
</script>

<button type="button" class="scan" aria-label={label} title={label} onclick={() => (open = true)}>
	<ScanLine size={15} />
</button>

<QrScannerModal {open} {title} {hint} onclose={() => (open = false)} {onresult} />

<style>
	.scan {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 5px;
		background: none;
		border: 1px solid var(--border-strong);
		border-radius: 7px;
		color: var(--text-dim);
		cursor: pointer;
	}
	.scan:hover {
		color: var(--text);
		border-color: var(--accent);
	}
</style>
