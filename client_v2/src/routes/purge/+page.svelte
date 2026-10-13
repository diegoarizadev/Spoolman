<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '$components/Button.svelte';
	import Card from '$components/Card.svelte';
	import ConfirmDialog from '$components/ConfirmDialog.svelte';
	import Pagination from '$components/Pagination.svelte';
	import Swatch from '$components/Swatch.svelte';
	import PurgeForm from '$components/purge/PurgeForm.svelte';
	import PurgeDetail from '$components/purge/PurgeDetail.svelte';
	import PurgeMatrix from '$components/purge/PurgeMatrix.svelte';
	import {
		deletePurge,
		getPurge,
		listFilamentsForPurge,
		listPurges,
		loadPurgeSettings,
		purgeFilamentColor,
		purgeFilamentLabel,
		purgeImageUrl,
		type PurgeCalibration,
		type PurgeFilament,
		type PurgeSettings
	} from '$lib/api/purge';
	import { toasts } from '$lib/stores/toasts.svelte';
	import * as m from '$lib/paraglide/messages';
	import Plus from '@lucide/svelte/icons/plus';
	import Printer from '@lucide/svelte/icons/printer';
	import Eye from '@lucide/svelte/icons/eye';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import PlayCircle from '@lucide/svelte/icons/circle-play';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';

	const RESOURCES = [
		{
			label: 'AMS Purge Calibration V2',
			href: 'https://makerworld.com/en/models/112380-ams-purge-calibration-v2#profileId-129748',
			video: false
		},
		{
			label: 'AMS Purge Calibration',
			href: 'https://makerworld.com/en/models/54909-ams-purge-calibration#profileId-56456',
			video: false
		},
		{ label: m['purge.resources.video'](), href: 'https://www.youtube.com/watch?v=FP3CwBX6A4I', video: true }
	];

	let settings = $state<PurgeSettings>({
		nozzleSizes: [0.4, 0.2],
		volumeLow: 50,
		volumeHigh: 500,
		maxMatrixFilaments: 6
	});
	let filaments = $state<PurgeFilament[]>([]);

	let rows = $state<PurgeCalibration[]>([]);
	let total = $state(0);
	let page = $state(1);
	let pageSize = $state(20);
	let sortField = $state('id');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let fromFilter = $state(0);
	let toFilter = $state(0);
	let loading = $state(true);
	let failed = $state(false);
	let revision = $state(0);

	// Selection survives page changes: keyed by id, holding the record so the matrix
	// can be built without refetching rows that are no longer on screen.
	let selected = $state<Record<number, PurgeCalibration>>({});
	let selectedCount = $derived(Object.keys(selected).length);

	let formOpen = $state(false);
	let editing = $state<PurgeCalibration | undefined>();
	let prefill = $state<{ from?: number; to?: number; nozzle?: number } | undefined>();
	let matrixOpen = $state(false);
	let matrixFilaments = $state<PurgeFilament[]>([]);
	let viewing = $state<PurgeCalibration | undefined>();
	let toDelete = $state<PurgeCalibration | undefined>();
	let deleting = $state(false);

	$effect(() => {
		const ctrl = new AbortController();
		loadPurgeSettings(ctrl.signal)
			.then((s) => (settings = s))
			.catch(() => {});
		listFilamentsForPurge(ctrl.signal)
			.then((f) => (filaments = f))
			.catch(() => {});
		return () => ctrl.abort();
	});

	$effect(() => {
		const ctrl = new AbortController();
		void revision;
		loading = true;
		failed = false;
		listPurges(
			{
				sort: `${sortField}:${sortDir}`,
				limit: pageSize,
				offset: (page - 1) * pageSize,
				from_filament_id: fromFilter || undefined,
				to_filament_id: toFilter || undefined
			},
			ctrl.signal
		)
			.then((p) => {
				rows = p.items;
				total = p.total;
				loading = false;
			})
			.catch(() => {
				if (ctrl.signal.aborted) return;
				failed = true;
				loading = false;
			});
		return () => ctrl.abort();
	});

	// A scanned or printed label lands here as `?view=<id>`: open that purge's details.
	$effect(() => {
		const id = Number(pageState.url.searchParams.get('view'));
		if (!Number.isInteger(id) || id <= 0) return;
		const ctrl = new AbortController();
		getPurge(id, ctrl.signal)
			.then((p) => (viewing = p))
			.catch(() => {
				if (!ctrl.signal.aborted) toasts.show('error', m['purge.loadFailed']());
			});
		return () => ctrl.abort();
	});

	function printLabels(ids: number[]) {
		void goto(resolve(`/labels?purges=${ids.join(',')}`));
	}

	function sortBy(field: string) {
		if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortField = field;
			sortDir = 'asc';
		}
		page = 1;
	}

	/** The selection without one record. */
	function without(id: number): Record<number, PurgeCalibration> {
		return Object.fromEntries(Object.entries(selected).filter(([key]) => Number(key) !== id));
	}

	function toggle(row: PurgeCalibration) {
		if (selected[row.id]) {
			selected = without(row.id);
		} else selected = { ...selected, [row.id]: row };
	}
	let allOnPage = $derived(rows.length > 0 && rows.every((r) => selected[r.id]));
	function togglePage() {
		if (allOnPage) {
			const next = { ...selected };
			for (const r of rows) delete next[r.id];
			selected = next;
		} else {
			const next = { ...selected };
			for (const r of rows) next[r.id] = r;
			selected = next;
		}
	}

	function openMatrix() {
		const map = new SvelteMap<number, PurgeFilament>();
		for (const p of Object.values(selected)) {
			map.set(p.from_filament.id, p.from_filament);
			map.set(p.to_filament.id, p.to_filament);
		}
		const list = [...map.values()];
		if (list.length < 2) return void toasts.show('info', m['purge.matrix.needTwo']());
		if (list.length > settings.maxMatrixFilaments)
			return void toasts.show(
				'error',
				m['purge.matrix.tooMany']({ count: list.length, max: settings.maxMatrixFilaments })
			);
		matrixFilaments = list;
		matrixOpen = true;
	}

	function openNew(p?: { from?: number; to?: number; nozzle?: number }) {
		editing = undefined;
		prefill = p;
		formOpen = true;
	}
	function openEdit(row: PurgeCalibration) {
		editing = row;
		prefill = undefined;
		formOpen = true;
	}

	async function confirmDelete() {
		if (!toDelete) return;
		deleting = true;
		try {
			await deletePurge(toDelete.id);
			selected = without(toDelete.id);
			toDelete = undefined;
			revision++;
		} catch {
			toasts.show('error', m['purge.deleteFailed']());
		} finally {
			deleting = false;
		}
	}

	function colorsOf(f: PurgeFilament): string[] | undefined {
		const c = purgeFilamentColor(f);
		return c ? [c] : undefined;
	}

	const columns = [
		{ field: 'from_filament.name', label: () => m['purge.fields.from']() },
		{ field: 'to_filament.name', label: () => m['purge.fields.to']() },
		{ field: 'purge_volume', label: () => m['purge.fields.volume']() },
		{ field: 'nozzle_size', label: () => m['purge.fields.nozzle']() },
		{ field: 'print_temp', label: () => m['purge.fields.temp']() },
		{ field: 'multiplication_factor', label: () => m['purge.fields.factor']() }
	];
</script>

<div class="page scroll-y">
	<div class="wrap">
		<h1 class="title">{m['nav.purge']()}</h1>
		<p class="subtitle">{m['purge.subtitle']()}</p>

		<Card>
			<div class="resources">
				<div class="rhead">{m['purge.resources.title']()}</div>
				<p class="rintro">{m['purge.resources.intro']()}</p>
				<div class="rlinks">
					{#each RESOURCES as r (r.href)}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external links -->
						<Button variant="outline" href={r.href}>
							{#if r.video}<PlayCircle size={14} />{:else}<ExternalLink size={14} />{/if}
							{r.label}
						</Button>
					{/each}
				</div>
			</div>
		</Card>

		<div class="toolbar">
			<select
				class="sel"
				bind:value={fromFilter}
				onchange={() => (page = 1)}
				aria-label={m['purge.fields.from']()}
			>
				<option value={0}>{m['purge.fields.from']()}: {m['purge.all']()}</option>
				{#each filaments as f (f.id)}
					<option value={f.id}>{purgeFilamentLabel(f)}</option>
				{/each}
			</select>
			<select
				class="sel"
				bind:value={toFilter}
				onchange={() => (page = 1)}
				aria-label={m['purge.fields.to']()}
			>
				<option value={0}>{m['purge.fields.to']()}: {m['purge.all']()}</option>
				{#each filaments as f (f.id)}
					<option value={f.id}>{purgeFilamentLabel(f)}</option>
				{/each}
			</select>
			<span class="spacer"></span>
			{#if selectedCount > 0}
				<span class="count">{m['purge.selected']({ count: selectedCount })}</span>
				<Button variant="ghost" onclick={() => (selected = {})}>{m['buttons.clear']()}</Button>
			{/if}
			<Button
				variant="outline"
				disabled={selectedCount < 1}
				onclick={() => printLabels(Object.keys(selected).map(Number))}
			>
				<Printer size={14} />{m['purge.printLabels']()}
			</Button>
			<Button variant="outline" disabled={selectedCount < 1} onclick={openMatrix}>
				<FlaskConical size={14} />{m['purge.matrix.open']()}
			</Button>
			<Button onclick={() => openNew()}><Plus size={14} />{m['purge.new']()}</Button>
		</div>

		{#if failed}
			<p class="warn">{m['purge.loadFailed']()}</p>
		{:else if !loading && rows.length === 0}
			<p class="empty">{m['purge.empty']()}</p>
		{:else}
			<div class="tablewrap">
				<table>
					<thead>
						<tr>
							<th class="chk">
								<input
									type="checkbox"
									checked={allOnPage}
									onchange={togglePage}
									aria-label={m['purge.selectPage']()}
								/>
							</th>
							{#each columns as c (c.field)}
								<th>
									<button class="sort" onclick={() => sortBy(c.field)}>
										{c.label()}
										{#if sortField === c.field}
											{#if sortDir === 'asc'}<ArrowUp size={11} />{:else}<ArrowDown size={11} />{/if}
										{/if}
									</button>
								</th>
							{/each}
							<th>{m['purge.fields.photo']()}</th>
							<th>{m['purge.fields.comment']()}</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.id)}
							<tr class:sel-row={!!selected[row.id]}>
								<td class="chk">
									<input
										type="checkbox"
										checked={!!selected[row.id]}
										onchange={() => toggle(row)}
										aria-label={`#${row.id}`}
									/>
								</td>
								<td>
									<span class="fil"
										><Swatch colors={colorsOf(row.from_filament)} size={14} radius={7} />{purgeFilamentLabel(
											row.from_filament
										)}</span
									>
								</td>
								<td>
									<span class="fil"
										><Swatch colors={colorsOf(row.to_filament)} size={14} radius={7} />{purgeFilamentLabel(
											row.to_filament
										)}</span
									>
								</td>
								<td class="num">{row.purge_volume.toFixed(1)} mm³</td>
								<td class="num">{row.nozzle_size} mm</td>
								<td class="num">{row.print_temp} °C</td>
								<td class="num"
									>{row.multiplication_factor > 0 && row.multiplication_factor !== 1
										? `×${row.multiplication_factor}`
										: '—'}</td
								>
								<td>
									{#if row.image_path}
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- API_BASE already carries the deploy base path -->
										<a href={purgeImageUrl(row.id)} target="_blank" rel="noopener noreferrer">
											<img class="thumb" src={purgeImageUrl(row.id)} alt="" loading="lazy" />
										</a>
									{/if}
								</td>
								<td class="comment">{row.comment ?? ''}</td>
								<td class="actions">
									<Button
										variant="ghost"
										ariaLabel={m['purge.printLabel']()}
										onclick={() => printLabels([row.id])}
									>
										<Printer size={14} />
									</Button>
									<Button
										variant="ghost"
										ariaLabel={m['purge.actions.view']()}
										onclick={() => (viewing = row)}
									>
										<Eye size={14} />
									</Button>
									<Button variant="ghost" ariaLabel={m['buttons.edit']()} onclick={() => openEdit(row)}>
										<Pencil size={14} />
									</Button>
									<Button
										variant="danger-ghost"
										ariaLabel={m['buttons.delete']()}
										onclick={() => (toDelete = row)}
									>
										<Trash2 size={14} />
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination
				{page}
				{pageSize}
				{total}
				onpage={(p) => (page = p)}
				onpagesize={(s) => {
					pageSize = s;
					page = 1;
				}}
			/>
		{/if}
	</div>
</div>

<PurgeForm
	open={formOpen}
	{editing}
	{prefill}
	{filaments}
	{settings}
	onclose={() => (formOpen = false)}
	onsaved={() => revision++}
/>

<PurgeDetail
	purge={viewing}
	onclose={() => (viewing = undefined)}
	onedit={(p) => {
		viewing = undefined;
		openEdit(p);
	}}
/>

<PurgeMatrix
	open={matrixOpen}
	filaments={matrixFilaments}
	{settings}
	onclose={() => (matrixOpen = false)}
	onadd={(from, to, nozzle) => {
		matrixOpen = false;
		openNew({ from, to, nozzle });
	}}
	onshow={(p) => {
		matrixOpen = false;
		viewing = p;
	}}
/>

<ConfirmDialog
	open={!!toDelete}
	title={m['purge.deleteTitle']()}
	lines={toDelete
		? [
				m['purge.deleteLine']({
					from: purgeFilamentLabel(toDelete.from_filament),
					to: purgeFilamentLabel(toDelete.to_filament)
				})
			]
		: []}
	confirmLabel={m['buttons.delete']()}
	busy={deleting}
	onconfirm={confirmDelete}
	onclose={() => (toDelete = undefined)}
/>

<style>
	.page {
		flex: 1;
		min-height: 0;
	}
	.wrap {
		max-width: 1180px;
		margin: 0 auto;
		padding: 28px 24px 60px;
		width: 100%;
	}
	.title {
		font-size: 20px;
		font-weight: 600;
		margin: 0;
	}
	.subtitle {
		color: var(--text-dim);
		font-size: 13px;
		margin: 6px 0 18px;
		max-width: 680px;
		line-height: 1.5;
	}
	.resources {
		padding: 14px 16px;
	}
	.rhead {
		font-weight: 600;
		font-size: 13px;
	}
	.rintro {
		color: var(--text-dim);
		font-size: 12px;
		margin: 4px 0 10px;
	}
	.rlinks {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin: 18px 0 12px;
	}
	.spacer {
		flex: 1;
	}
	.count {
		color: var(--text-dim);
		font-size: 12px;
	}
	.sel {
		border: 1px solid var(--border-strong);
		background: none;
		border-radius: 7px;
		padding: 7px 9px;
		color: var(--text);
		font: inherit;
		font-size: 13px;
		max-width: 260px;
	}
	.tablewrap {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	th,
	td {
		padding: 9px 12px;
		text-align: left;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
	th {
		color: var(--text-dim);
		font-weight: 500;
		font-size: 12px;
		white-space: nowrap;
	}
	.sort {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 0;
	}
	.sort:hover {
		color: var(--text);
	}
	.chk {
		width: 34px;
	}
	.fil {
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}
	.num {
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.thumb {
		width: 44px;
		height: 44px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid var(--border);
		display: block;
	}
	.comment {
		max-width: 240px;
		color: var(--text-dim);
	}
	.actions {
		white-space: nowrap;
		text-align: right;
	}
	.sel-row {
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}
	.empty,
	.warn {
		margin: 28px 0;
		text-align: center;
		color: var(--text-dim);
	}
	.warn {
		color: #e5484d;
	}
</style>
