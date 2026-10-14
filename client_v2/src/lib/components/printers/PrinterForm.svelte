<script lang="ts">
	import Modal from '$components/Modal.svelte';
	import Button from '$components/Button.svelte';
	import Field from '$components/Field.svelte';
	import FieldGrid from '$components/FieldGrid.svelte';
	import NumberInput from '$components/NumberInput.svelte';
	import Toggle from '$components/Toggle.svelte';
	import {
		createPrinter,
		printerImageUrl,
		updatePrinter,
		uploadPrinterImage,
		type Printer,
		type PrinterInput
	} from '$lib/api/printers';
	import { toasts } from '$lib/stores/toasts.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		/** The printer being edited; omit to create one. */
		editing?: Printer;
		onclose: () => void;
		onsaved: (printer: Printer) => void;
	}

	let { open, editing, onclose, onsaved }: Props = $props();

	type NumKey =
		| 'build_volume_x'
		| 'build_volume_y'
		| 'build_volume_z'
		| 'max_hotend_temp'
		| 'max_bed_temp'
		| 'chamber_max_temp'
		| 'print_heads'
		| 'colors_supported'
		| 'max_print_speed'
		| 'max_acceleration'
		| 'physical_width'
		| 'physical_depth'
		| 'physical_height'
		| 'net_weight'
		| 'max_power';
	type TextKey =
		| 'sku'
		| 'comment'
		| 'nozzle_diameters'
		| 'ams_units'
		| 'supported_materials'
		| 'voltage'
		| 'frequency'
		| 'connectivity';

	const NUM_KEYS: NumKey[] = [
		'build_volume_x',
		'build_volume_y',
		'build_volume_z',
		'max_hotend_temp',
		'max_bed_temp',
		'chamber_max_temp',
		'print_heads',
		'colors_supported',
		'max_print_speed',
		'max_acceleration',
		'physical_width',
		'physical_depth',
		'physical_height',
		'net_weight',
		'max_power'
	];
	const TEXT_KEYS: TextKey[] = [
		'sku',
		'comment',
		'nozzle_diameters',
		'ams_units',
		'supported_materials',
		'voltage',
		'frequency',
		'connectivity'
	];

	let manufacturer = $state('');
	let model = $state('');
	let chamberEnclosed = $state(false);
	let chamberHeated = $state(false);
	let amsCompatible = $state(false);
	// Optional numbers are kept as the text typed ('' = unset) so clearing a field
	// really clears it.
	let nums = $state<Record<NumKey, string>>(emptyNums());
	let texts = $state<Record<TextKey, string>>(emptyTexts());
	let file = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let saving = $state(false);

	function emptyNums(): Record<NumKey, string> {
		return Object.fromEntries(NUM_KEYS.map((k) => [k, ''])) as Record<NumKey, string>;
	}
	function emptyTexts(): Record<TextKey, string> {
		return Object.fromEntries(TEXT_KEYS.map((k) => [k, ''])) as Record<TextKey, string>;
	}

	// Re-seed the draft each time the dialog opens, so a cancelled edit never leaks
	// into the next one.
	$effect(() => {
		if (!open) return;
		manufacturer = editing?.manufacturer ?? '';
		model = editing?.model ?? '';
		chamberEnclosed = editing?.chamber_enclosed ?? false;
		chamberHeated = editing?.chamber_heated ?? false;
		amsCompatible = editing?.ams_compatible ?? false;
		nums = emptyNums();
		texts = emptyTexts();
		for (const k of NUM_KEYS) nums[k] = editing?.[k] != null ? String(editing[k]) : '';
		for (const k of TEXT_KEYS) texts[k] = editing?.[k] ?? '';
		file = null;
		preview = null;
		saving = false;
	});

	let valid = $derived(manufacturer.trim() !== '' && model.trim() !== '');

	function pick(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		file = f;
		preview = f ? URL.createObjectURL(f) : null;
	}

	async function save() {
		if (!valid || saving) return;
		saving = true;
		const body: PrinterInput = {
			manufacturer: manufacturer.trim(),
			model: model.trim(),
			chamber_enclosed: chamberEnclosed,
			chamber_heated: chamberHeated,
			ams_compatible: amsCompatible
		};
		const out = body as unknown as Record<string, unknown>;
		// null clears a field on edit; on create the API treats it as unset too.
		for (const k of NUM_KEYS) {
			const n = parseFloat(nums[k].replace(',', '.'));
			out[k] = Number.isFinite(n) ? n : null;
		}
		for (const k of TEXT_KEYS) out[k] = texts[k].trim() || null;
		try {
			let saved = editing ? await updatePrinter(editing.id, body) : await createPrinter(body);
			if (file) saved = await uploadPrinterImage(saved.id, file);
			toasts.show('success', m['printers.saved']());
			onsaved(saved);
			onclose();
		} catch {
			toasts.show('error', m['printers.saveFailed']());
		} finally {
			saving = false;
		}
	}
</script>

{#snippet num(key: NumKey, label: string, unit?: string)}
	<Field {label}>
		<NumberInput bind:value={nums[key]} min={0} {unit} />
	</Field>
{/snippet}
{#snippet text(key: TextKey, label: string, placeholder?: string)}
	<Field {label}>
		<input class="in" bind:value={texts[key]} {placeholder} />
	</Field>
{/snippet}

<Modal
	{open}
	title={editing ? m['printers.editTitle']() : m['printers.newTitle']()}
	{onclose}
	width="min(95vw, 680px)"
>
	<div class="body">
		<h3>{m['printers.section.identity']()}</h3>
		<FieldGrid labelWidth="170px">
			<Field label={m['printers.fields.manufacturer']()}>
				<input class="in" maxlength="64" placeholder="Bambu Lab" bind:value={manufacturer} />
			</Field>
			<Field label={m['printers.fields.model']()}>
				<input class="in" maxlength="64" placeholder="A1" bind:value={model} />
			</Field>
			{@render text('sku', m['printers.fields.sku']())}
			<Field label={m['printers.fields.comment']()}>
				<textarea class="in" rows="2" maxlength="1024" bind:value={texts.comment}></textarea>
			</Field>
			<Field label={m['printers.fields.photo']()}>
				<div class="photo">
					{#if preview}
						<img src={preview} alt="" />
					{:else if editing?.image_path}
						<img src={printerImageUrl(editing.id)} alt="" />
					{/if}
					<input type="file" accept="image/*" onchange={pick} />
				</div>
			</Field>
		</FieldGrid>

		<h3>{m['printers.section.volume']()}</h3>
		<FieldGrid labelWidth="170px">
			{@render num('build_volume_x', m['printers.fields.buildX'](), 'mm')}
			{@render num('build_volume_y', m['printers.fields.buildY'](), 'mm')}
			{@render num('build_volume_z', m['printers.fields.buildZ'](), 'mm')}
			{@render text('nozzle_diameters', m['printers.fields.nozzles'](), '0.2,0.4,0.6,0.8')}
		</FieldGrid>

		<h3>{m['printers.section.temps']()}</h3>
		<FieldGrid labelWidth="170px">
			{@render num('max_hotend_temp', m['printers.fields.hotend'](), '°C')}
			{@render num('max_bed_temp', m['printers.fields.bed'](), '°C')}
		</FieldGrid>

		<h3>{m['printers.section.chamber']()}</h3>
		<FieldGrid labelWidth="170px">
			<Field label={m['printers.fields.enclosed']()}>
				<Toggle
					checked={chamberEnclosed}
					onchange={(v) => (chamberEnclosed = v)}
					ariaLabel={m['printers.fields.enclosed']()}
				/>
			</Field>
			<Field label={m['printers.fields.heated']()}>
				<Toggle
					checked={chamberHeated}
					onchange={(v) => (chamberHeated = v)}
					ariaLabel={m['printers.fields.heated']()}
				/>
			</Field>
			{@render num('chamber_max_temp', m['printers.fields.chamberTemp'](), '°C')}
		</FieldGrid>

		<h3>{m['printers.section.ams']()}</h3>
		<FieldGrid labelWidth="170px">
			<Field label={m['printers.fields.amsCompatible']()}>
				<Toggle
					checked={amsCompatible}
					onchange={(v) => (amsCompatible = v)}
					ariaLabel={m['printers.fields.amsCompatible']()}
				/>
			</Field>
			{@render num('print_heads', m['printers.fields.heads']())}
			{@render num('colors_supported', m['printers.fields.colors']())}
			{@render text('ams_units', m['printers.fields.amsUnits'](), 'AMS, AMS Lite, AMS 2 Pro, AMS HT')}
			{@render text('supported_materials', m['printers.fields.materials'](), 'PLA, PETG, TPU, PVA')}
		</FieldGrid>
		<p class="hint">{m['printers.commaHint']()}</p>

		<h3>{m['printers.section.performance']()}</h3>
		<FieldGrid labelWidth="170px">
			{@render num('max_print_speed', m['printers.fields.speed'](), 'mm/s')}
			{@render num('max_acceleration', m['printers.fields.accel'](), 'mm/s²')}
		</FieldGrid>

		<h3>{m['printers.section.physical']()}</h3>
		<FieldGrid labelWidth="170px">
			{@render num('physical_width', m['printers.fields.width'](), 'mm')}
			{@render num('physical_depth', m['printers.fields.depth'](), 'mm')}
			{@render num('physical_height', m['printers.fields.height'](), 'mm')}
			{@render num('net_weight', m['printers.fields.weight'](), 'kg')}
		</FieldGrid>

		<h3>{m['printers.section.electrical']()}</h3>
		<FieldGrid labelWidth="170px">
			{@render text('voltage', m['printers.fields.voltage'](), '100-240')}
			{@render text('frequency', m['printers.fields.frequency'](), '50/60')}
			{@render num('max_power', m['printers.fields.power'](), 'W')}
			{@render text('connectivity', m['printers.fields.connectivity'](), 'WiFi, Bambu-Bus, USB')}
		</FieldGrid>
	</div>

	{#snippet footer()}
		<Button variant="outline" disabled={saving} onclick={onclose}>{m['buttons.cancel']()}</Button>
		<Button disabled={!valid || saving} onclick={save}>{m['buttons.save']()}</Button>
	{/snippet}
</Modal>

<style>
	h3 {
		margin: 18px 0 8px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-dim);
		font-weight: 600;
	}
	h3:first-child {
		margin-top: 0;
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
	.in:focus {
		outline: none;
		border-color: var(--accent);
	}
	textarea.in {
		resize: vertical;
	}
	.hint {
		margin: 6px 0 0;
		font-size: 11.5px;
		color: var(--text-dim);
	}
	.photo {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}
	.photo img {
		max-width: 100%;
		max-height: 160px;
		border-radius: 8px;
		border: 1px solid var(--border);
	}
</style>
