<script lang="ts">
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import Modal from '$components/Modal.svelte';
	import Swatch from '$components/Swatch.svelte';
	import Button from '$components/Button.svelte';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import {
		listPurges,
		purgeFilamentColor,
		purgeFilamentLabel,
		type PurgeCalibration,
		type PurgeFilament,
		type PurgeSettings
	} from '$lib/api/purge';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		filaments: PurgeFilament[];
		settings: PurgeSettings;
		onclose: () => void;
		/** Open the form to record a missing pair. */
		onadd: (fromId: number, toId: number, nozzle: number) => void;
		onshow: (purge: PurgeCalibration) => void;
	}

	let { open, filaments, settings, onclose, onadd, onshow }: Props = $props();

	let purges = $state<PurgeCalibration[]>([]);
	let loading = $state(false);
	let failed = $state(false);
	let nozzle = $state<number | null>(null);

	// One request for the whole library beats one per cell: the matrix needs every
	// ordered pair of the chosen filaments, and the library is small.
	$effect(() => {
		if (!open) return;
		const ctrl = new AbortController();
		loading = true;
		failed = false;
		listPurges({ sort: 'id:asc' }, ctrl.signal)
			.then((p) => {
				purges = p.items;
				loading = false;
			})
			.catch(() => {
				if (ctrl.signal.aborted) return;
				failed = true;
				loading = false;
			});
		return () => ctrl.abort();
	});

	let nozzles = $derived.by(() => {
		const ids = new SvelteSet(filaments.map((f) => f.id));
		const sizes = new SvelteSet<number>(settings.nozzleSizes);
		for (const p of purges) {
			if (ids.has(p.from_filament.id) && ids.has(p.to_filament.id)) sizes.add(p.nozzle_size);
		}
		return [...sizes].sort((a, b) => a - b);
	});
	let activeNozzle = $derived(nozzle ?? settings.nozzleSizes[0] ?? nozzles[0] ?? 0.4);

	let cells = $derived.by(() => {
		const map = new SvelteMap<string, PurgeCalibration>();
		for (const p of purges) {
			if (p.nozzle_size === activeNozzle) map.set(`${p.from_filament.id}>${p.to_filament.id}`, p);
		}
		return map;
	});

	let missing = $derived(
		filaments.flatMap((from) =>
			filaments
				.filter((to) => to.id !== from.id && !cells.has(`${from.id}>${to.id}`))
				.map((to) => [from, to] as const)
		)
	);

	/** Green below the low threshold, red above the high one, blended between. */
	function cellColor(volume: number): string {
		const { volumeLow, volumeHigh } = settings;
		const t = Math.min(Math.max((volume - volumeLow) / Math.max(volumeHigh - volumeLow, 1), 0), 1);
		return `rgb(${Math.round(40 + t * 180)},${Math.round(180 - t * 120)},40)`;
	}

	function colorsOf(f: PurgeFilament): string[] | undefined {
		const c = purgeFilamentColor(f);
		return c ? [c] : undefined;
	}
</script>

<Modal {open} title={m['purge.matrix.title']()} {onclose} width="min(95vw, 900px)">
	<div class="bar">
		<label class="nozzle">
			<span>{m['purge.fields.nozzle']()}</span>
			<select value={activeNozzle} onchange={(e) => (nozzle = Number(e.currentTarget.value))}>
				{#each nozzles as size (size)}
					<option value={size}>{size} mm</option>
				{/each}
			</select>
		</label>
		<span class="legend"><i style:background="rgb(40,180,40)"></i>{m['purge.matrix.low']()}</span>
		<span class="legend"><i style:background="rgb(220,60,40)"></i>{m['purge.matrix.high']()}</span>
	</div>

	{#if failed}
		<p class="warn">{m['purge.loadFailed']()}</p>
	{:else}
		<div class="scroll">
			<table>
				<thead>
					<tr>
						<th class="corner">{m['purge.matrix.fromTo']()}</th>
						{#each filaments as to (to.id)}
							<th>
								<span class="fil">
									<Swatch colors={colorsOf(to)} size={14} radius={7} />
									<span class="name" title={purgeFilamentLabel(to)}>{purgeFilamentLabel(to)}</span>
								</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each filaments as from (from.id)}
						<tr>
							<th class="row">
								<span class="fil">
									<Swatch colors={colorsOf(from)} size={14} radius={7} />
									<span class="name" title={purgeFilamentLabel(from)}>{purgeFilamentLabel(from)}</span>
								</span>
							</th>
							{#each filaments as to (to.id)}
								{@const cell = cells.get(`${from.id}>${to.id}`)}
								<td>
									{#if from.id === to.id}
										<div class="diag"></div>
									{:else if loading}
										<span class="dim">…</span>
									{:else if cell}
										<button
											class="vol"
											style:background={cellColor(cell.purge_volume)}
											title={`${cell.nozzle_size} mm · ${cell.print_temp} °C${cell.multiplication_factor > 0 && cell.multiplication_factor !== 1 ? ` · ×${cell.multiplication_factor}` : ''}`}
											onclick={() => onshow(cell)}
										>
											{cell.purge_volume.toFixed(1)} mm³
										</button>
									{:else}
										<button class="missing" onclick={() => onadd(from.id, to.id, activeNozzle)}>
											<FlaskConical size={12} />{m['purge.matrix.add']()}
										</button>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if !loading}
			<p class="status" class:ok={missing.length === 0}>
				{missing.length === 0
					? m['purge.matrix.complete']()
					: m['purge.matrix.missing']({ count: missing.length })}
			</p>
		{/if}
	{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={onclose}>{m['buttons.close']()}</Button>
	{/snippet}
</Modal>

<style>
	.bar {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 12px;
		color: var(--text-dim);
		font-size: 12px;
	}
	.nozzle {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.nozzle select {
		border: 1px solid var(--border-strong);
		background: none;
		border-radius: 7px;
		padding: 5px 8px;
		color: var(--text);
		font: inherit;
	}
	.legend {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.legend i {
		width: 22px;
		height: 12px;
		border-radius: 3px;
		display: inline-block;
	}
	.scroll {
		overflow-x: auto;
	}
	table {
		border-collapse: separate;
		border-spacing: 4px;
		width: 100%;
	}
	th {
		font-weight: 500;
		text-align: center;
		vertical-align: bottom;
		min-width: 110px;
	}
	th.row,
	th.corner {
		text-align: left;
		min-width: 170px;
	}
	.corner {
		color: var(--text-dim);
		font-size: 11px;
	}
	.fil {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 190px;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
	}
	td {
		text-align: center;
		padding: 0;
	}
	.diag {
		height: 32px;
		border-radius: 6px;
		background: repeating-linear-gradient(45deg, var(--border) 0 6px, transparent 6px 12px);
		opacity: 0.6;
	}
	.vol {
		width: 100%;
		border: none;
		border-radius: 6px;
		padding: 8px 4px;
		color: #fff;
		font-weight: 700;
		font-size: 12px;
		cursor: pointer;
	}
	.missing {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 7px 4px;
		border: 1px dashed #ff7a45;
		border-radius: 6px;
		background: none;
		color: #ff7a45;
		font-size: 11px;
		cursor: pointer;
	}
	.dim {
		color: var(--text-dim);
	}
	.status {
		margin: 12px 0 8px;
		color: #d9822b;
		font-size: 12px;
	}
	.status.ok {
		color: #3aa655;
	}
	.warn {
		color: #e5484d;
	}
</style>
