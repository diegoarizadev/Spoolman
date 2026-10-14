<script lang="ts">
	import Modal from '$components/Modal.svelte';
	import Button from '$components/Button.svelte';
	import Field from '$components/Field.svelte';
	import FieldGrid from '$components/FieldGrid.svelte';
	import Swatch from '$components/Swatch.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import {
		purgeFilamentColor,
		purgeFilamentLabel,
		purgeImageUrl,
		type PurgeCalibration,
		type PurgeFilament
	} from '$lib/api/purge';
	import { lightbox } from '$lib/stores/lightbox.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		purge?: PurgeCalibration;
		onclose: () => void;
		onedit: (purge: PurgeCalibration) => void;
	}

	let { purge, onclose, onedit }: Props = $props();

	function colorsOf(f: PurgeFilament): string[] | undefined {
		const c = purgeFilamentColor(f);
		return c ? [c] : undefined;
	}
	let registered = $derived(purge ? new Date(purge.registered).toLocaleString() : '');
</script>

<Modal open={!!purge} title={m['purge.detailTitle']()} {onclose} width="560px">
	{#if purge}
		<FieldGrid>
			<Field label={m['purge.fields.from']()}>
				<span class="fil"
					><Swatch colors={colorsOf(purge.from_filament)} size={14} radius={7} />{purgeFilamentLabel(
						purge.from_filament
					)}</span
				>
			</Field>
			<Field label={m['purge.fields.to']()}>
				<span class="fil"
					><Swatch colors={colorsOf(purge.to_filament)} size={14} radius={7} />{purgeFilamentLabel(
						purge.to_filament
					)}</span
				>
			</Field>
			<Field label={m['purge.fields.volume']()} mono>{purge.purge_volume.toFixed(1)} mm³</Field>
			<Field label={m['purge.fields.factor']()} mono>
				{purge.multiplication_factor > 0 ? `×${purge.multiplication_factor}` : '—'}
			</Field>
			<Field label={m['purge.fields.nozzle']()} mono>{purge.nozzle_size} mm</Field>
			<Field label={m['purge.fields.temp']()} mono>{purge.print_temp} °C</Field>
			<Field label={m['purge.fields.registered']()}>{registered}</Field>
			{#if purge.comment}
				<Field label={m['purge.fields.comment']()}>{purge.comment}</Field>
			{/if}
		</FieldGrid>
		{#if purge.image_path}
			<button
				class="photo plain"
				type="button"
				onclick={() => lightbox.open([purgeImageUrl(purge.id)])}
				aria-label={m['purge.zoomPhoto']()}
			>
				<img src={purgeImageUrl(purge.id)} alt={m['purge.fields.photo']()} />
				<span>{m['purge.zoomPhoto']()}</span>
			</button>
		{/if}
	{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={onclose}>{m['buttons.close']()}</Button>
		{#if purge}
			<Button onclick={() => purge && onedit(purge)}><Pencil size={14} />{m['buttons.edit']()}</Button>
		{/if}
	{/snippet}
</Modal>

<style>
	.plain {
		padding: 0;
		border: none;
		background: none;
		cursor: zoom-in;
		display: block;
	}
	.fil {
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}
	.photo {
		display: block;
		margin-top: 14px;
		text-align: center;
		color: var(--text-dim);
		font-size: 12px;
	}
	.photo img {
		max-width: 100%;
		max-height: 300px;
		border-radius: 8px;
		border: 1px solid var(--border);
		display: block;
		margin: 0 auto 4px;
	}
</style>
