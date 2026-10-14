<script lang="ts">
	import Modal from '$components/Modal.svelte';
	import Button from '$components/Button.svelte';
	import Field from '$components/Field.svelte';
	import FieldGrid from '$components/FieldGrid.svelte';
	import PrinterAms from './PrinterAms.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { printerImageUrl, printerName, type Printer } from '$lib/api/printers';
	import { splitList } from '$lib/printers/ams';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		printer?: Printer;
		onclose: () => void;
		onedit: (printer: Printer) => void;
		/** The AMS section saves on its own; hand the fresh record back. */
		onupdated: (printer: Printer) => void;
	}

	let { printer, onclose, onedit, onupdated }: Props = $props();

	const yesNo = (v: boolean) => (v ? m['printers.yes']() : m['printers.no']());
	const has = (...v: unknown[]) => v.some((x) => x !== undefined && x !== null && x !== '');
	let nozzles = $derived(splitList(printer?.nozzle_diameters).join(' / '));
</script>

<Modal open={!!printer} title={printer ? printerName(printer) : ''} {onclose} width="min(95vw, 720px)">
	{#if printer}
		<div class="body">
			{#if printer.image_path}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- API_BASE already carries the deploy base path -->
				<a class="photo" href={printerImageUrl(printer.id)} target="_blank" rel="noopener noreferrer">
					<img src={printerImageUrl(printer.id)} alt={printerName(printer)} />
				</a>
			{/if}

			<FieldGrid labelWidth="170px">
				<Field label={m['printers.fields.manufacturer']()}>{printer.manufacturer}</Field>
				<Field label={m['printers.fields.model']()}>{printer.model}</Field>
				{#if printer.sku}<Field label={m['printers.fields.sku']()} mono>{printer.sku}</Field>{/if}
				{#if has(printer.build_volume_x, printer.build_volume_y, printer.build_volume_z)}
					<Field label={m['printers.section.volume']()} mono>
						{printer.build_volume_x ?? '?'}×{printer.build_volume_y ?? '?'}×{printer.build_volume_z ?? '?'} mm
					</Field>
				{/if}
				{#if nozzles}<Field label={m['printers.fields.nozzles']()} mono>{nozzles} mm</Field>{/if}
				{#if printer.max_hotend_temp}
					<Field label={m['printers.fields.hotend']()} mono>{printer.max_hotend_temp} °C</Field>
				{/if}
				{#if printer.max_bed_temp}
					<Field label={m['printers.fields.bed']()} mono>{printer.max_bed_temp} °C</Field>
				{/if}
				<Field label={m['printers.fields.enclosed']()}>{yesNo(printer.chamber_enclosed)}</Field>
				<Field label={m['printers.fields.heated']()}>{yesNo(printer.chamber_heated)}</Field>
				{#if printer.chamber_max_temp}
					<Field label={m['printers.fields.chamberTemp']()} mono>{printer.chamber_max_temp} °C</Field>
				{/if}
				<Field label={m['printers.fields.amsCompatible']()}>{yesNo(printer.ams_compatible)}</Field>
				{#if has(printer.print_heads)}
					<Field label={m['printers.fields.heads']()} mono>{printer.print_heads}</Field>
				{/if}
				{#if has(printer.colors_supported)}
					<Field label={m['printers.fields.colors']()} mono>{printer.colors_supported}</Field>
				{/if}
				{#if printer.ams_units}
					<Field label={m['printers.fields.amsUnits']()}>
						<span class="tags">
							{#each splitList(printer.ams_units) as t (t)}<span class="tag">{t}</span>{/each}
						</span>
					</Field>
				{/if}
				{#if printer.supported_materials}
					<Field label={m['printers.fields.materials']()}>
						<span class="tags">
							{#each splitList(printer.supported_materials) as t (t)}<span class="tag">{t}</span>{/each}
						</span>
					</Field>
				{/if}
				{#if printer.max_print_speed}
					<Field label={m['printers.fields.speed']()} mono>{printer.max_print_speed} mm/s</Field>
				{/if}
				{#if printer.max_acceleration}
					<Field label={m['printers.fields.accel']()} mono>{printer.max_acceleration} mm/s²</Field>
				{/if}
				{#if has(printer.physical_width, printer.physical_depth, printer.physical_height)}
					<Field label={m['printers.section.physical']()} mono>
						{printer.physical_width ?? '?'}×{printer.physical_depth ?? '?'}×{printer.physical_height ?? '?'} mm
					</Field>
				{/if}
				{#if printer.net_weight}
					<Field label={m['printers.fields.weight']()} mono>{printer.net_weight} kg</Field>
				{/if}
				{#if printer.voltage}<Field label={m['printers.fields.voltage']()} mono>{printer.voltage}</Field>{/if}
				{#if printer.frequency}
					<Field label={m['printers.fields.frequency']()} mono>{printer.frequency} Hz</Field>
				{/if}
				{#if printer.max_power}
					<Field label={m['printers.fields.power']()} mono>{printer.max_power} W</Field>
				{/if}
				{#if printer.connectivity}
					<Field label={m['printers.fields.connectivity']()}>
						<span class="tags">
							{#each splitList(printer.connectivity) as t (t)}<span class="tag">{t}</span>{/each}
						</span>
					</Field>
				{/if}
				{#if printer.comment}<Field label={m['printers.fields.comment']()}>{printer.comment}</Field>{/if}
			</FieldGrid>

			<PrinterAms {printer} {onupdated} />
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={onclose}>{m['buttons.close']()}</Button>
		{#if printer}
			<Button onclick={() => printer && onedit(printer)}><Pencil size={14} />{m['buttons.edit']()}</Button>
		{/if}
	{/snippet}
</Modal>

<style>
	.body {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.photo img {
		width: 100%;
		max-height: 260px;
		object-fit: contain;
		border-radius: 8px;
		border: 1px solid var(--border);
	}
	.tags {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.tag {
		border: 1px solid var(--border-strong);
		border-radius: 5px;
		padding: 1px 7px;
		font-size: 11.5px;
	}
</style>
