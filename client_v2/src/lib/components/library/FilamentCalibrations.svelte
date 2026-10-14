<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve --
	   The links are the API's own URLs (API_BASE carries the deploy base path) and the
	   external OrcaSlicer guide; resolve() does not apply to either. */
	import Button from '../Button.svelte';
	import CalibrationPhotos from '../CalibrationPhotos.svelte';
	import ConfirmDialog from '../ConfirmDialog.svelte';
	import Field from '../Field.svelte';
	import FieldGrid from '../FieldGrid.svelte';
	import Modal from '../Modal.svelte';
	import NumberInput from '../NumberInput.svelte';
	import SectionLabel from '../SectionLabel.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Info from '@lucide/svelte/icons/info';
	import { calibrationImageUrl, saveCalibrationImages } from '$lib/api/calibrationImages';
	import {
		createFilamentCalibration,
		deleteFilamentCalibration,
		listFilamentCalibrations,
		updateFilamentCalibration,
		type CalibrationValueKey,
		type FilamentCalibration
	} from '$lib/api/filamentCalibration';
	import { CALIBRATION_TYPES, calibrationType, formatCalibration, groupByType } from '$lib/calibration/types';
	import { toasts } from '$lib/stores/toasts.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		filamentId: number;
		/** View-only: no add, edit or delete (the spool panel shows its filament's tests). */
		readonly?: boolean;
	}

	let { filamentId, readonly = false }: Props = $props();

	let records = $state<FilamentCalibration[]>([]);
	let loading = $state(true);
	let revision = $state(0);

	let formOpen = $state(false);
	let editing = $state<FilamentCalibration | undefined>();
	let type = $state('');
	// Values are kept as the text typed ('' = unset), keyed by column.
	let vals = $state<Partial<Record<CalibrationValueKey, string>>>({});
	let notes = $state('');
	let removedIds = $state<number[]>([]);
	let pending = $state<File[]>([]);
	let saving = $state(false);
	let toDelete = $state<FilamentCalibration | undefined>();
	let deleting = $state(false);

	let grouped = $derived(groupByType(records));
	let shownTypes = $derived(CALIBRATION_TYPES.filter((c) => grouped.has(c.type)));
	let config = $derived(calibrationType(type));
	let valid = $derived(
		!!config && config.fields.every((f) => Number.isFinite(parseFloat((vals[f.key] ?? '').replace(',', '.'))))
	);

	$effect(() => {
		const id = filamentId;
		void revision;
		const ctrl = new AbortController();
		listFilamentCalibrations(id, ctrl.signal)
			.then((r) => {
				records = r;
				loading = false;
			})
			.catch(() => {
				if (ctrl.signal.aborted) return;
				loading = false;
				toasts.show('error', m['calibration.loadFailed']());
			});
		return () => ctrl.abort();
	});

	function openForm(record?: FilamentCalibration, newType = '') {
		editing = record;
		type = record?.calibration_type ?? newType;
		vals = {};
		for (const f of calibrationType(type)?.fields ?? []) {
			const v = record?.[f.key];
			vals[f.key] = v != null ? String(v) : '';
		}
		notes = record?.notes ?? '';
		removedIds = [];
		pending = [];
		saving = false;
		formOpen = true;
	}

	function changeType(next: string) {
		type = next;
		vals = {};
		for (const f of calibrationType(next)?.fields ?? []) vals[f.key] = '';
	}

	async function save() {
		if (!valid || saving || !config) return;
		saving = true;
		const body: Partial<Record<CalibrationValueKey, number>> & { notes: string | null } = {
			notes: notes.trim() || null
		};
		for (const f of config.fields) body[f.key] = parseFloat((vals[f.key] ?? '').replace(',', '.'));
		try {
			const saved = editing
				? await updateFilamentCalibration(editing.id, body)
				: await createFilamentCalibration(filamentId, type, body);
			await saveCalibrationImages('filament-calibration', saved.id, removedIds, pending);
			toasts.show('success', m['calibration.saved']());
			formOpen = false;
			revision++;
		} catch {
			toasts.show('error', m['calibration.saveFailed']());
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		if (!toDelete) return;
		deleting = true;
		try {
			await deleteFilamentCalibration(toDelete.id);
			toDelete = undefined;
			revision++;
		} catch {
			toasts.show('error', m['calibration.deleteFailed']());
		} finally {
			deleting = false;
		}
	}
</script>

{#if !readonly || records.length > 0}
	<SectionLabel>
		{m['calibration.title']()}
		{#snippet right()}
			{#if !readonly}
				<Button variant="ghost" ariaLabel={m['calibration.add']()} onclick={() => openForm()}>
					<Plus size={14} />
				</Button>
			{/if}
		{/snippet}
	</SectionLabel>

	{#if !loading && records.length === 0}
		<p class="empty">{m['calibration.empty']()}</p>
	{/if}

	{#each shownTypes as cfg (cfg.type)}
		<div class="group">
			<div class="gname">
				{cfg.label()}
				<span class="info" title={cfg.description()}><Info size={12} /></span>
				{#if cfg.referenceUrl}
					<a href={cfg.referenceUrl} target="_blank" rel="noopener noreferrer">{m['calibration.guide']()} ↗</a
					>
				{/if}
			</div>
			{#each grouped.get(cfg.type) ?? [] as r (r.id)}
				<div class="rec">
					{#if r.images.length}
						<div class="strip">
							{#each r.images as img (img.id)}
								<a
									href={calibrationImageUrl('filament-calibration', r.id, img.id)}
									target="_blank"
									rel="noopener noreferrer"
								>
									<img
										src={calibrationImageUrl('filament-calibration', r.id, img.id)}
										alt=""
										loading="lazy"
									/>
								</a>
							{/each}
						</div>
					{/if}
					<div class="info-col">
						<div class="date">{new Date(r.registered).toLocaleDateString()}</div>
						<div class="vals">{formatCalibration(r)}</div>
						{#if r.notes}<div class="notes">{r.notes}</div>{/if}
					</div>
					{#if !readonly}
						<Button variant="ghost" ariaLabel={m['buttons.edit']()} onclick={() => openForm(r)}>
							<Pencil size={14} />
						</Button>
						<Button variant="danger-ghost" ariaLabel={m['buttons.delete']()} onclick={() => (toDelete = r)}>
							<Trash2 size={14} />
						</Button>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
{/if}

<Modal
	open={formOpen}
	title={editing ? m['calibration.editTitle']() : m['calibration.newTitle']()}
	onclose={() => (formOpen = false)}
	width="520px"
>
	<FieldGrid labelWidth="150px">
		<Field label={m['calibration.typeLabel']()}>
			<select
				class="in"
				value={type}
				disabled={!!editing}
				onchange={(e) => changeType(e.currentTarget.value)}
			>
				<option value="" disabled>{m['calibration.selectType']()}</option>
				{#each CALIBRATION_TYPES as c (c.type)}
					<option value={c.type}>{c.label()}</option>
				{/each}
			</select>
		</Field>
		{#each config?.fields ?? [] as f (f.key)}
			<Field label={f.label()}>
				<NumberInput bind:value={vals[f.key] as string} step={f.step ?? 1} unit={f.unit} />
			</Field>
		{/each}
		{#if config}
			<Field label={m['calibration.photos']()}>
				<CalibrationPhotos
					existing={editing?.images ?? []}
					urlFor={(id) => calibrationImageUrl('filament-calibration', editing?.id ?? 0, id)}
					bind:removedIds
					bind:pending
				/>
			</Field>
			<Field label={m['calibration.notes']()}>
				<textarea class="in" rows="2" maxlength="1024" bind:value={notes}></textarea>
			</Field>
		{/if}
	</FieldGrid>
	{#if config}<p class="desc">{config.description()}</p>{/if}

	{#snippet footer()}
		<Button variant="outline" disabled={saving} onclick={() => (formOpen = false)}
			>{m['buttons.cancel']()}</Button
		>
		<Button disabled={!valid || saving} onclick={save}>{m['buttons.save']()}</Button>
	{/snippet}
</Modal>

<ConfirmDialog
	open={!!toDelete}
	title={m['calibration.deleteTitle']()}
	lines={[m['calibration.deleteLine']()]}
	confirmLabel={m['buttons.delete']()}
	busy={deleting}
	onconfirm={confirmDelete}
	onclose={() => (toDelete = undefined)}
/>

<style>
	.empty {
		margin: 4px 0 8px;
		font-size: 12px;
		color: var(--text-dim);
	}
	.group {
		margin-bottom: 10px;
	}
	.gname {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12.5px;
		font-weight: 600;
		margin-bottom: 2px;
	}
	.gname a {
		margin-left: auto;
		font-size: 11px;
		font-weight: 400;
	}
	.info {
		display: inline-flex;
		color: var(--text-dim);
		cursor: help;
	}
	.rec {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 0;
		border-top: 1px solid var(--border-soft);
	}
	.strip {
		display: flex;
		gap: 4px;
		max-width: 110px;
		flex-wrap: wrap;
	}
	.strip img {
		width: 40px;
		height: 40px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid var(--border);
		display: block;
	}
	.info-col {
		flex: 1;
		min-width: 0;
	}
	.date {
		font-size: 11px;
		color: var(--text-dim);
	}
	.vals {
		font-size: 12.5px;
	}
	.notes {
		font-size: 11.5px;
		color: var(--text-dim);
	}
	.in {
		width: 100%;
		border: 1px solid var(--border-strong);
		background: none;
		border-radius: 7px;
		padding: 7px 9px;
		color: var(--text);
		font: inherit;
		font-size: 13px;
		box-sizing: border-box;
	}
	textarea.in {
		resize: vertical;
	}
	.desc {
		margin: 10px 0 0;
		font-size: 11.5px;
		color: var(--text-dim);
		line-height: 1.5;
	}
</style>
