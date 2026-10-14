<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import Button from '$components/Button.svelte';
	import PurgeDetail from '$components/purge/PurgeDetail.svelte';
	import PurgeForm from '$components/purge/PurgeForm.svelte';
	import PurgeMatrix from '$components/purge/PurgeMatrix.svelte';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import { listPrinters, listSpoolsAt, printerName, type AmsSpool, type Printer } from '$lib/api/printers';
	import {
		listFilamentsForPurge,
		loadPurgeSettings,
		type PurgeCalibration,
		type PurgeFilament,
		type PurgeSettings
	} from '$lib/api/purge';
	import { applyOrder, parseOrder, textColorFor } from '$lib/printers/ams';
	import { toasts } from '$lib/stores/toasts.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		/** Bump to refetch, e.g. after a printer's AMS changed. */
		revision?: number;
	}

	let { revision = 0 }: Props = $props();

	interface Card {
		printer: Printer;
		slots: AmsSpool[];
	}

	let cards = $state<Card[]>([]);

	$effect(() => {
		void revision;
		const ctrl = new AbortController();
		listPrinters({ limit: 100 }, ctrl.signal)
			.then(async ({ items }) => {
				const withAms = items.filter((p) => p.ams_location);
				const loaded = await Promise.all(
					withAms.map(async (printer) => ({
						printer,
						slots: applyOrder(
							await listSpoolsAt(printer.ams_location as string, ctrl.signal),
							parseOrder(printer.ams_slot_order)
						)
					}))
				);
				if (!ctrl.signal.aborted) cards = loaded;
			})
			.catch(() => {
				if (!ctrl.signal.aborted) toasts.show('error', m['printers.ams.loadFailed']());
			});
		return () => ctrl.abort();
	});

	/** The matrix is per filament: two spools of one filament count once, in slot order. */
	function filamentsOf(slots: AmsSpool[]): PurgeFilament[] {
		const seen = new SvelteMap<number, PurgeFilament>();
		for (const { filament } of slots) if (!seen.has(filament.id)) seen.set(filament.id, filament);
		return [...seen.values()];
	}

	// Purge settings and the filament list are only needed once a matrix is opened.
	let settings = $state<PurgeSettings>({
		nozzleSizes: [0.4, 0.2],
		volumeLow: 50,
		volumeHigh: 500,
		maxMatrixFilaments: 6
	});
	let allFilaments = $state<PurgeFilament[]>([]);
	let matrixFilaments = $state<PurgeFilament[]>([]);
	let matrixOpen = $state(false);
	let formOpen = $state(false);
	let prefill = $state<{ from?: number; to?: number; nozzle?: number } | undefined>();
	let editing = $state<PurgeCalibration | undefined>();
	let viewing = $state<PurgeCalibration | undefined>();

	async function openMatrix(slots: AmsSpool[]) {
		try {
			[settings, allFilaments] = await Promise.all([loadPurgeSettings(), listFilamentsForPurge()]);
		} catch {
			toasts.show('error', m['purge.loadFailed']());
			return;
		}
		matrixFilaments = filamentsOf(slots);
		matrixOpen = true;
	}
</script>

{#if cards.length > 0}
	<div class="cards">
		{#each cards as { printer, slots } (printer.id)}
			{@const filaments = filamentsOf(slots)}
			<section class="card">
				<header>
					<div>
						<h3>{printerName(printer)} · {m['printers.ams.title']()}</h3>
						<p class="loc">
							{printer.ams_location}
							{#if filaments.length < 2}· {m['printers.ams.needTwo']()}{/if}
						</p>
					</div>
					<Button variant="outline" disabled={filaments.length < 2} onclick={() => openMatrix(slots)}>
						<FlaskConical size={14} />{m['purge.matrix.open']()}
					</Button>
				</header>
				<div class="grid">
					{#each slots as spool, i (spool.id)}
						{@const hex = spool.filament.color_hex}
						<div class="cell">
							<span class="slot">A{i + 1}</span>
							<div
								class="spool"
								style:background={hex ? `#${hex.replace(/^#/, '')}` : '#888'}
								style:color={textColorFor(hex?.replace(/^#/, ''))}
							>
								<strong>{spool.filament.material ?? '-'}</strong>
								<span class="name">{spool.filament.name ?? `#${spool.id}`}</span>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}

<PurgeMatrix
	open={matrixOpen}
	filaments={matrixFilaments}
	{settings}
	onclose={() => (matrixOpen = false)}
	onadd={(from, to, nozzle) => {
		matrixOpen = false;
		editing = undefined;
		prefill = { from, to, nozzle };
		formOpen = true;
	}}
	onshow={(p) => {
		matrixOpen = false;
		viewing = p;
	}}
/>

<PurgeForm
	open={formOpen}
	{editing}
	{prefill}
	filaments={allFilaments}
	{settings}
	onclose={() => (formOpen = false)}
	onsaved={() => {}}
/>

<PurgeDetail
	purge={viewing}
	onclose={() => (viewing = undefined)}
	onedit={(p) => {
		viewing = undefined;
		editing = p;
		prefill = undefined;
		formOpen = true;
	}}
/>

<style>
	.cards {
		display: grid;
		gap: 14px;
		margin: 0 0 20px;
	}
	.card {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 12px 14px;
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}
	h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
	}
	.loc {
		margin: 2px 0 0;
		font-size: 12px;
		color: var(--text-dim);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
		gap: 8px;
	}
	.cell {
		text-align: center;
	}
	.slot {
		font-size: 11px;
		color: var(--text-dim);
	}
	.spool {
		border-radius: 6px;
		padding: 8px 4px;
		font-size: 11px;
		display: flex;
		flex-direction: column;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
