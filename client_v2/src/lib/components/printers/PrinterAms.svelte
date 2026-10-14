<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$components/Button.svelte';
	import Settings from '@lucide/svelte/icons/settings';
	import { listLocations, listSpoolsAt, updatePrinter, type AmsSpool, type Printer } from '$lib/api/printers';
	import { applyOrder, moveItem, parseOrder, textColorFor } from '$lib/printers/ams';
	import { toasts } from '$lib/stores/toasts.svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		printer: Printer;
		/** Called with the saved printer so the parent keeps its copy fresh. */
		onupdated: (printer: Printer) => void;
	}

	let { printer, onupdated }: Props = $props();

	let editing = $state(false);
	let locations = $state<string[]>([]);
	let spools = $state<AmsSpool[]>([]);
	let loading = $state(false);
	let localOrder = $state<number[] | null>(null);
	let dragFrom = $state<number | null>(null);

	let location = $derived(printer.ams_location);
	let slots = $derived(applyOrder(spools, localOrder ?? parseOrder(printer.ams_slot_order)));

	$effect(() => {
		const loc = location;
		if (!loc) {
			spools = [];
			return;
		}
		const ctrl = new AbortController();
		loading = true;
		listSpoolsAt(loc, ctrl.signal)
			.then((s) => {
				spools = s;
				loading = false;
			})
			.catch(() => {
				if (ctrl.signal.aborted) return;
				loading = false;
				toasts.show('error', m['printers.ams.loadFailed']());
			});
		return () => ctrl.abort();
	});

	$effect(() => {
		if (!editing) return;
		const ctrl = new AbortController();
		listLocations(ctrl.signal)
			.then((l) => (locations = l))
			.catch(() => {});
		return () => ctrl.abort();
	});

	async function save(data: Record<string, unknown>) {
		try {
			onupdated(await updatePrinter(printer.id, data));
		} catch {
			toasts.show('error', m['printers.ams.saveFailed']());
		}
	}

	function chooseLocation(value: string) {
		localOrder = null;
		void save({ ams_location: value || null, ams_slot_order: null });
	}

	function drop(to: number) {
		if (dragFrom === null || dragFrom === to) return;
		const ids = moveItem(slots, dragFrom, to).map((s) => s.id);
		localOrder = ids;
		dragFrom = null;
		void save({ ams_slot_order: JSON.stringify(ids) });
	}

	/** Keyboard route to the same reorder: arrows move the focused slot. */
	function nudge(e: KeyboardEvent, index: number) {
		const to = e.key === 'ArrowLeft' ? index - 1 : e.key === 'ArrowRight' ? index + 1 : index;
		if (to === index || to < 0 || to >= slots.length) return;
		e.preventDefault();
		const ids = moveItem(slots, index, to).map((s) => s.id);
		localOrder = ids;
		void save({ ams_slot_order: JSON.stringify(ids) });
	}

	function open(id: number) {
		void goto(resolve(`/spool/show/${id}`));
	}
</script>

<section class="ams">
	<header>
		<h3>{m['printers.ams.title']()}</h3>
		<Button variant="ghost" onclick={() => (editing = !editing)}>
			<Settings size={13} />{m['printers.ams.location']()}
		</Button>
	</header>

	{#if editing}
		<select
			class="sel"
			value={location ?? ''}
			onchange={(e) => chooseLocation(e.currentTarget.value)}
			aria-label={m['printers.ams.location']()}
		>
			<option value="">{m['printers.ams.choose']()}</option>
			{#each [...new Set([...(location ? [location] : []), ...locations])] as l (l)}
				<option value={l}>{l}</option>
			{/each}
		</select>
		<p class="hint">{m['printers.ams.reorderHint']()}</p>
	{/if}

	{#if !location}
		<p class="empty">{m['printers.ams.none']()}</p>
	{:else if !loading && slots.length === 0}
		<p class="empty">{m['printers.ams.noSpools']({ location })}</p>
	{:else}
		<p class="hint">{location} · {m['printers.ams.dragHint']()}</p>
		<div class="grid">
			{#each slots as spool, i (spool.id)}
				{@const hex = spool.filament.color_hex}
				<div class="cell">
					<span class="slot">A{i + 1}</span>
					<div
						class="spool"
						class:dragging={dragFrom === i}
						role="button"
						tabindex="0"
						draggable="true"
						title={m['printers.ams.openSpool']()}
						style:background={hex ? `#${hex.replace(/^#/, '')}` : '#888'}
						style:color={textColorFor(hex?.replace(/^#/, ''))}
						ondragstart={() => (dragFrom = i)}
						ondragover={(e) => e.preventDefault()}
						ondrop={() => drop(i)}
						ondragend={() => (dragFrom = null)}
						onclick={() => open(spool.id)}
						onkeydown={(e) => {
							if (e.key === 'Enter') open(spool.id);
							else nudge(e, i);
						}}
					>
						<strong>{spool.filament.material ?? '-'}</strong>
						<span class="name">{spool.filament.name ?? `#${spool.id}`}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.ams {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 12px 14px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
	}
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
	.hint,
	.empty {
		color: var(--text-dim);
		font-size: 12px;
		margin: 8px 0;
	}
	.empty {
		text-align: center;
		margin: 14px 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		gap: 12px;
	}
	.cell {
		text-align: center;
	}
	.slot {
		font-size: 12px;
		color: var(--text-dim);
	}
	.spool {
		cursor: grab;
		border-radius: 8px;
		padding: 14px 6px;
		border: 2px solid rgba(255, 255, 255, 0.25);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.spool:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.spool.dragging {
		opacity: 0.5;
		border: 2px dashed #fff;
	}
	.name {
		font-size: 11px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
