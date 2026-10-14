<script lang="ts">
	import { page as pageState } from '$app/state';
	import Button from '$components/Button.svelte';
	import ConfirmDialog from '$components/ConfirmDialog.svelte';
	import Pagination from '$components/Pagination.svelte';
	import PrinterDetail from '$components/printers/PrinterDetail.svelte';
	import PrinterForm from '$components/printers/PrinterForm.svelte';
	import {
		deletePrinter,
		getPrinter,
		listPrinters,
		printerImageUrl,
		printerName,
		type Printer
	} from '$lib/api/printers';
	import { splitList } from '$lib/printers/ams';
	import { toasts } from '$lib/stores/toasts.svelte';
	import * as m from '$lib/paraglide/messages';
	import Plus from '@lucide/svelte/icons/plus';
	import Eye from '@lucide/svelte/icons/eye';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';

	let rows = $state<Printer[]>([]);
	let total = $state(0);
	let page = $state(1);
	let pageSize = $state(20);
	let sortField = $state('manufacturer');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let loading = $state(true);
	let failed = $state(false);
	let revision = $state(0);

	let formOpen = $state(false);
	let editing = $state<Printer | undefined>();
	let viewing = $state<Printer | undefined>();
	let toDelete = $state<Printer | undefined>();
	let deleting = $state(false);

	$effect(() => {
		const ctrl = new AbortController();
		void revision;
		loading = true;
		failed = false;
		listPrinters(
			{ sort: `${sortField}:${sortDir}`, limit: pageSize, offset: (page - 1) * pageSize },
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

	// A shared link lands here as `?view=<id>`: open that printer's details.
	$effect(() => {
		const id = Number(pageState.url.searchParams.get('view'));
		if (!Number.isInteger(id) || id <= 0) return;
		const ctrl = new AbortController();
		getPrinter(id, ctrl.signal)
			.then((p) => (viewing = p))
			.catch(() => {
				if (!ctrl.signal.aborted) toasts.show('error', m['printers.loadFailed']());
			});
		return () => ctrl.abort();
	});

	function sortBy(field: string) {
		if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortField = field;
			sortDir = 'asc';
		}
		page = 1;
	}

	function openNew() {
		editing = undefined;
		formOpen = true;
	}
	function openEdit(p: Printer) {
		editing = p;
		formOpen = true;
	}

	/** Keep the open details and the list row in step with a saved printer. */
	function applySaved(p: Printer) {
		if (viewing?.id === p.id) viewing = p;
		revision++;
	}

	async function confirmDelete() {
		if (!toDelete) return;
		deleting = true;
		try {
			await deletePrinter(toDelete.id);
			if (viewing?.id === toDelete.id) viewing = undefined;
			toDelete = undefined;
			revision++;
		} catch {
			toasts.show('error', m['printers.deleteFailed']());
		} finally {
			deleting = false;
		}
	}

	const columns = [
		{ field: 'manufacturer', label: () => m['printers.fields.manufacturer']() },
		{ field: 'model', label: () => m['printers.fields.model']() }
	];

	function volume(p: Printer): string {
		return p.build_volume_x && p.build_volume_y && p.build_volume_z
			? `${p.build_volume_x}×${p.build_volume_y}×${p.build_volume_z} mm`
			: '';
	}
</script>

<div class="page scroll-y">
	<div class="wrap">
		<h1 class="title">{m['nav.printers']()}</h1>
		<p class="subtitle">{m['printers.subtitle']()}</p>

		<div class="toolbar">
			<span class="spacer"></span>
			<Button onclick={openNew}><Plus size={14} />{m['printers.new']()}</Button>
		</div>

		{#if failed}
			<p class="warn">{m['printers.loadFailed']()}</p>
		{:else if !loading && rows.length === 0}
			<p class="empty">{m['printers.empty']()}</p>
		{:else}
			<div class="tablewrap">
				<table>
					<thead>
						<tr>
							<th class="img"></th>
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
							<th>{m['printers.section.volume']()}</th>
							<th>{m['printers.section.ams']()}</th>
							<th>{m['printers.fields.materials']()}</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.id)}
							<tr>
								<td class="img">
									{#if row.image_path}
										<img class="thumb" src={printerImageUrl(row.id)} alt="" loading="lazy" />
									{/if}
								</td>
								<td>{row.manufacturer}</td>
								<td>{row.model}</td>
								<td class="num">{volume(row)}</td>
								<td>
									<span class="badge" class:on={row.ams_compatible}>
										{row.ams_compatible ? m['printers.yes']() : m['printers.no']()}
									</span>
								</td>
								<td>
									<span class="tags">
										{#each splitList(row.supported_materials) as t (t)}<span class="tag">{t}</span>{/each}
									</span>
								</td>
								<td class="actions">
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

<PrinterForm open={formOpen} {editing} onclose={() => (formOpen = false)} onsaved={applySaved} />

<PrinterDetail
	printer={viewing}
	onclose={() => (viewing = undefined)}
	onedit={(p) => {
		viewing = undefined;
		openEdit(p);
	}}
	onupdated={applySaved}
/>

<ConfirmDialog
	open={!!toDelete}
	title={m['printers.deleteTitle']()}
	lines={toDelete ? [m['printers.deleteLine']({ name: printerName(toDelete) })] : []}
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
	.toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 12px;
	}
	.spacer {
		flex: 1;
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
	.img {
		width: 56px;
	}
	.thumb {
		width: 40px;
		height: 40px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid var(--border);
		display: block;
	}
	.num {
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.badge {
		border: 1px solid var(--border-strong);
		border-radius: 5px;
		padding: 1px 8px;
		font-size: 11.5px;
		color: var(--text-dim);
	}
	.badge.on {
		color: #3aa655;
		border-color: #3aa655;
	}
	.tags {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.tag {
		border: 1px solid var(--border-strong);
		border-radius: 5px;
		padding: 1px 6px;
		font-size: 11px;
	}
	.actions {
		white-space: nowrap;
		text-align: right;
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
