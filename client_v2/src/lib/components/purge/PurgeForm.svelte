<script lang="ts">
	import Modal from '$components/Modal.svelte';
	import PhotoPicker from '$components/PhotoPicker.svelte';
	import Button from '$components/Button.svelte';
	import Field from '$components/Field.svelte';
	import FieldGrid from '$components/FieldGrid.svelte';
	import NumberInput from '$components/NumberInput.svelte';
	import {
		createPurge,
		purgeFilamentLabel,
		purgeImageUrl,
		updatePurge,
		deletePurgeImage,
		uploadPurgeImage,
		type PurgeCalibration,
		type PurgeFilament,
		type PurgeInput,
		type PurgeSettings
	} from '$lib/api/purge';
	import { HttpError } from '$lib/api/http';
	import { toasts } from '$lib/stores/toasts.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		/** The record being edited; omit to create one. */
		editing?: PurgeCalibration;
		/** Prefill for a new record, e.g. from a missing matrix cell. */
		prefill?: { from?: number; to?: number; nozzle?: number };
		filaments: PurgeFilament[];
		settings: PurgeSettings;
		onclose: () => void;
		onsaved: () => void;
	}

	let { open, editing, prefill, filaments, settings, onclose, onsaved }: Props = $props();

	let fromId = $state(0);
	let toId = $state(0);
	let volume = $state<number>(0);
	let factor = $state<number>(1);
	let nozzle = $state<number>(0.4);
	let temp = $state<number>(220);
	let comment = $state('');
	let photos = $state<File[]>([]);
	let removedIds = $state<number[]>([]);
	let saving = $state(false);

	// Re-seed the draft each time the dialog opens, so a cancelled edit never leaks
	// into the next one.
	$effect(() => {
		if (!open) return;
		fromId = editing?.from_filament.id ?? prefill?.from ?? 0;
		toId = editing?.to_filament.id ?? prefill?.to ?? 0;
		volume = editing?.purge_volume ?? 0;
		factor = editing?.multiplication_factor ?? 1;
		nozzle = editing?.nozzle_size ?? prefill?.nozzle ?? settings.nozzleSizes[0] ?? 0.4;
		temp = editing?.print_temp ?? 220;
		comment = editing?.comment ?? '';
		photos = [];
		removedIds = [];
		saving = false;
	});

	let nozzleOptions = $derived([...new Set([...settings.nozzleSizes, nozzle])].sort((a, b) => a - b));
	let valid = $derived(fromId > 0 && toId > 0 && fromId !== toId && nozzle > 0 && volume >= 0);

	async function save() {
		if (!valid || saving) return;
		saving = true;
		const body: PurgeInput = {
			from_filament_id: fromId,
			to_filament_id: toId,
			purge_volume: volume,
			multiplication_factor: factor,
			nozzle_size: nozzle,
			print_temp: Math.round(temp),
			comment: comment.trim() || null
		};
		try {
			const saved = editing ? await updatePurge(editing.id, body) : await createPurge(body);
			if (photos[0]) await uploadPurgeImage(saved.id, photos[0]);
			else if (editing?.image_path && removedIds.includes(0)) await deletePurgeImage(saved.id);
			toasts.show('success', m['purge.saved']());
			onsaved();
			onclose();
		} catch (e) {
			toasts.show(
				'error',
				e instanceof HttpError && e.status === 409 ? m['purge.duplicate']() : m['purge.saveFailed']()
			);
		} finally {
			saving = false;
		}
	}
</script>

<Modal {open} title={editing ? m['purge.editTitle']() : m['purge.newTitle']()} {onclose} width="560px">
	<FieldGrid>
		<Field label={m['purge.fields.from']()}>
			<select class="sel" bind:value={fromId}>
				<option value={0} disabled>—</option>
				{#each filaments as f (f.id)}
					<option value={f.id}>{purgeFilamentLabel(f)}</option>
				{/each}
			</select>
		</Field>
		<Field label={m['purge.fields.to']()}>
			<select class="sel" bind:value={toId}>
				<option value={0} disabled>—</option>
				{#each filaments as f (f.id)}
					<option value={f.id}>{purgeFilamentLabel(f)}</option>
				{/each}
			</select>
		</Field>
		<Field label={m['purge.fields.volume']()}>
			<NumberInput value={volume} min={0} step={1} unit="mm³" onchange={(v) => (volume = v)} />
		</Field>
		<Field label={m['purge.fields.factor']()}>
			<NumberInput value={factor} min={0} step={0.1} onchange={(v) => (factor = v)} />
		</Field>
		<Field label={m['purge.fields.nozzle']()}>
			<select class="sel" bind:value={nozzle}>
				{#each nozzleOptions as size (size)}
					<option value={size}>{size} mm</option>
				{/each}
			</select>
		</Field>
		<Field label={m['purge.fields.temp']()}>
			<NumberInput value={temp} min={0} step={5} unit="°C" onchange={(v) => (temp = v)} />
		</Field>
		<Field label={m['purge.fields.comment']()}>
			<textarea class="sel" rows="3" maxlength="1024" bind:value={comment}></textarea>
		</Field>
		<Field label={m['purge.fields.photo']()}>
			<PhotoPicker
				existing={editing?.image_path ? [{ id: 0, src: purgeImageUrl(editing.id) }] : []}
				bind:files={photos}
				bind:removedIds
				multiple={false}
				crop
			/>
		</Field>
	</FieldGrid>
	{#if fromId > 0 && fromId === toId}
		<p class="warn">{m['purge.sameFilament']()}</p>
	{/if}

	{#snippet footer()}
		<Button variant="outline" disabled={saving} onclick={onclose}>{m['buttons.cancel']()}</Button>
		<Button disabled={!valid || saving} onclick={save}>{m['buttons.save']()}</Button>
	{/snippet}
</Modal>

<style>
	.sel {
		width: 100%;
		border: 1px solid var(--border-strong);
		background: none;
		border-radius: 7px;
		padding: 7px 9px;
		color: var(--text);
		font: inherit;
		font-size: 13px;
	}
	.sel:focus {
		outline: none;
		border-color: var(--accent);
	}
	textarea.sel {
		resize: vertical;
	}
	.warn {
		color: #e5484d;
		font-size: 12px;
		margin: 8px 0 0;
	}
</style>
