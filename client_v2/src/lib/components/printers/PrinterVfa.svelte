<script lang="ts">
	import Button from '$components/Button.svelte';
	import ConfirmDialog from '$components/ConfirmDialog.svelte';
	import Field from '$components/Field.svelte';
	import FieldGrid from '$components/FieldGrid.svelte';
	import PhotoPicker from '$components/PhotoPicker.svelte';
	import Modal from '$components/Modal.svelte';
	import NumberInput from '$components/NumberInput.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Info from '@lucide/svelte/icons/info';
	import {
		createPrinterVfa,
		deletePrinterVfa,
		listPrinterVfa,
		saveVfaImages,
		updatePrinterVfa,
		vfaImageUrl,
		type PrinterVfa
	} from '$lib/api/printerCalibration';
	import type { Printer } from '$lib/api/printers';
	import { splitList } from '$lib/printers/ams';
	import { toasts } from '$lib/stores/toasts.svelte';
	import { lightbox } from '$lib/stores/lightbox.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		printer: Printer;
	}

	let { printer }: Props = $props();

	const GUIDE_URL = 'https://www.orcaslicer.com/wiki/calibration/vfa_calib.html';

	let records = $state<PrinterVfa[]>([]);
	let loading = $state(true);
	let revision = $state(0);

	let formOpen = $state(false);
	let editing = $state<PrinterVfa | undefined>();
	let toDelete = $state<PrinterVfa | undefined>();
	let deleting = $state(false);

	let speedMin = $state('');
	let speedMax = $state('');
	let speedBest = $state('');
	let nozzle = $state(0);
	let notes = $state('');
	let removedIds = $state<number[]>([]);
	let pending = $state<File[]>([]);
	let saving = $state(false);

	// Nozzles the printer offers, plus the one on the record being edited so an old
	// value is never silently dropped.
	let nozzleOptions = $derived(
		[...new Set([...splitList(printer.nozzle_diameters).map(Number), nozzle].filter((n) => n > 0))].sort(
			(a, b) => a - b
		)
	);
	let valid = $derived(
		Number.isFinite(parseFloat(speedMin)) &&
			Number.isFinite(parseFloat(speedMax)) &&
			parseFloat(speedMin) <= parseFloat(speedMax) &&
			nozzle > 0
	);

	$effect(() => {
		const ctrl = new AbortController();
		void revision;
		listPrinterVfa(printer.id, ctrl.signal)
			.then((r) => {
				records = r;
				loading = false;
			})
			.catch(() => {
				if (ctrl.signal.aborted) return;
				loading = false;
				toasts.show('error', m['printers.vfa.loadFailed']());
			});
		return () => ctrl.abort();
	});

	function openForm(record?: PrinterVfa) {
		editing = record;
		speedMin = record?.vfa_speed_min != null ? String(record.vfa_speed_min) : '';
		speedMax = record?.vfa_speed_max != null ? String(record.vfa_speed_max) : '';
		const sizes = splitList(printer.nozzle_diameters).map(Number);
		// The nozzle the test used; for a new test, the printer's usual one (0.4 if offered).
		speedBest = record?.vfa_speed_best != null ? String(record.vfa_speed_best) : '';
		nozzle = record?.nozzle_size ?? (sizes.includes(0.4) ? 0.4 : (sizes[0] ?? 0.4));
		notes = record?.notes ?? '';
		removedIds = [];
		pending = [];
		saving = false;
		formOpen = true;
	}

	async function save() {
		if (!valid || saving) return;
		saving = true;
		const body = {
			vfa_speed_min: parseFloat(speedMin),
			vfa_speed_max: parseFloat(speedMax),
			vfa_speed_best: Number.isFinite(parseFloat(speedBest)) ? parseFloat(speedBest) : null,
			nozzle_size: nozzle,
			notes: notes.trim() || null
		};
		try {
			const saved = editing
				? await updatePrinterVfa(editing.id, body)
				: await createPrinterVfa(printer.id, body);
			await saveVfaImages(saved.id, removedIds, pending);
			toasts.show('success', m['printers.vfa.saved']());
			formOpen = false;
			revision++;
		} catch {
			toasts.show('error', m['printers.vfa.saveFailed']());
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		if (!toDelete) return;
		deleting = true;
		try {
			await deletePrinterVfa(toDelete.id);
			toDelete = undefined;
			revision++;
		} catch {
			toasts.show('error', m['printers.vfa.deleteFailed']());
		} finally {
			deleting = false;
		}
	}
</script>

<section class="vfa">
	<header>
		<h3>{m['printers.vfa.title']()}</h3>
		<Button variant="ghost" ariaLabel={m['printers.vfa.add']()} onclick={() => openForm()}>
			<Plus size={14} />
		</Button>
	</header>
	<p class="desc">
		<Info size={12} />
		{m['printers.vfa.description']()}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external guide -->
		<a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">{m['printers.vfa.guide']()} ↗</a>
	</p>

	{#if !loading && records.length === 0}
		<p class="empty">{m['printers.vfa.empty']()}</p>
	{:else}
		{#each records as r (r.id)}
			<div class="rec">
				<div class="strip">
					{#each r.images as img (img.id)}
						<button
							class="plain"
							type="button"
							onclick={() =>
								lightbox.open(
									r.images.map((i) => vfaImageUrl(r.id, i.id)),
									r.images.indexOf(img)
								)}
							aria-label={m['photo.view']()}
						>
							<img src={vfaImageUrl(r.id, img.id)} alt="" loading="lazy" />
						</button>
					{/each}
				</div>
				<div class="info">
					<div class="date">{new Date(r.registered).toLocaleDateString()}</div>
					<div class="vals">
						{m['printers.vfa.speedRange']({ min: r.vfa_speed_min ?? '-', max: r.vfa_speed_max ?? '-' })}
						{#if r.vfa_speed_best}
							<span class="best">{m['printers.vfa.bestShown']({ speed: r.vfa_speed_best })}</span>
						{/if}
						{#if r.nozzle_size}
							<span class="noz">{r.nozzle_size} mm</span>
						{/if}
					</div>
					{#if r.notes}<div class="notes">{r.notes}</div>{/if}
				</div>
				<Button variant="ghost" ariaLabel={m['buttons.edit']()} onclick={() => openForm(r)}>
					<Pencil size={14} />
				</Button>
				<Button variant="danger-ghost" ariaLabel={m['buttons.delete']()} onclick={() => (toDelete = r)}>
					<Trash2 size={14} />
				</Button>
			</div>
		{/each}
	{/if}
</section>

<Modal
	open={formOpen}
	title={editing ? m['printers.vfa.editTitle']() : m['printers.vfa.newTitle']()}
	onclose={() => (formOpen = false)}
	width="520px"
>
	<FieldGrid labelWidth="150px">
		<Field label={m['printers.vfa.nozzle']()}>
			<select class="in" bind:value={nozzle}>
				{#each nozzleOptions as size (size)}
					<option value={size}>{size} mm</option>
				{/each}
			</select>
		</Field>
		<Field label={m['printers.vfa.speedMin']()}>
			<NumberInput bind:value={speedMin} unit="mm/s" />
		</Field>
		<Field label={m['printers.vfa.speedMax']()}>
			<NumberInput bind:value={speedMax} unit="mm/s" />
		</Field>
		<Field label={m['printers.vfa.speedBest']()} help={m['printers.vfa.speedBestHelp']()}>
			<NumberInput bind:value={speedBest} unit="mm/s" />
		</Field>
		<Field label={m['printers.vfa.photos']()}>
			<PhotoPicker
				existing={(editing?.images ?? []).map((i) => ({
					id: i.id,
					src: vfaImageUrl(editing?.id ?? 0, i.id)
				}))}
				bind:removedIds
				bind:files={pending}
			/>
		</Field>
		<Field label={m['printers.fields.comment']()}>
			<textarea class="in" rows="2" maxlength="1024" bind:value={notes}></textarea>
		</Field>
	</FieldGrid>
	{#if speedMin !== '' && speedMax !== '' && parseFloat(speedMin) > parseFloat(speedMax)}
		<p class="warn">{m['printers.vfa.rangeInvalid']()}</p>
	{/if}

	{#snippet footer()}
		<Button variant="outline" disabled={saving} onclick={() => (formOpen = false)}
			>{m['buttons.cancel']()}</Button
		>
		<Button disabled={!valid || saving} onclick={save}>{m['buttons.save']()}</Button>
	{/snippet}
</Modal>

<ConfirmDialog
	open={!!toDelete}
	title={m['printers.vfa.deleteTitle']()}
	lines={[m['printers.vfa.deleteLine']()]}
	confirmLabel={m['buttons.delete']()}
	busy={deleting}
	onconfirm={confirmDelete}
	onclose={() => (toDelete = undefined)}
/>

<style>
	.plain {
		padding: 0;
		border: none;
		background: none;
		cursor: zoom-in;
		display: block;
	}
	.vfa {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 12px 14px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
	}
	.desc {
		margin: 4px 0 10px;
		font-size: 11.5px;
		color: var(--text-dim);
		line-height: 1.5;
	}
	.empty {
		text-align: center;
		color: var(--text-dim);
		font-size: 12px;
		margin: 14px 0;
	}
	.rec {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 0;
		border-top: 1px solid var(--border-soft);
	}
	.strip {
		display: flex;
		gap: 4px;
		max-width: 150px;
		flex-wrap: wrap;
	}
	.strip img {
		width: 44px;
		height: 44px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid var(--border);
		display: block;
	}
	.info {
		flex: 1;
		min-width: 0;
	}
	.date {
		font-size: 11px;
		color: var(--text-dim);
	}
	.vals {
		font-size: 13px;
	}
	.noz {
		margin-left: 6px;
		border: 1px solid var(--border-strong);
		border-radius: 5px;
		padding: 0 6px;
		font-size: 11px;
	}
	.best {
		margin-left: 6px;
		border: 1px solid var(--accent);
		color: var(--accent);
		border-radius: 5px;
		padding: 0 6px;
		font-size: 11px;
	}
	.notes {
		font-size: 12px;
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
	.warn {
		color: #e5484d;
		font-size: 12px;
		margin: 8px 0 0;
	}
</style>
