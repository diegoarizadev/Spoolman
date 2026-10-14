<script lang="ts">
	import SectionLabel from '../SectionLabel.svelte';
	import Button from '../Button.svelte';
	import FieldGrid from '../FieldGrid.svelte';
	import Field from '../Field.svelte';
	import { getMaterialDefaults, type MaterialDefaults } from '$lib/api/filamentCalibration';
	import { splitList } from '$lib/printers/ams';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		vendor?: string;
		material?: string;
		/** The filament's "tipo" extra field (Basic, Matte, High Speed...). */
		type?: string;
	}

	let { vendor, material, type }: Props = $props();

	type Row = { key: string; label: () => string; unit?: string; help?: () => string };
	type Group = { title: () => string; rows: Row[] };

	const GROUPS: Group[] = [
		{
			title: () => m['matdef.group.datasheet'](),
			rows: [
				{ key: 'density', label: () => m['matdef.field.density'](), unit: 'g/cm³' },
				{ key: 'diameter', label: () => m['matdef.field.diameter'](), unit: 'mm' },
				{ key: 'weight', label: () => m['matdef.field.weight'](), unit: 'g' },
				{ key: 'spool_weight', label: () => m['matdef.field.spoolWeight'](), unit: 'g' }
			]
		},
		{
			title: () => m['matdef.group.temps'](),
			rows: [
				{ key: 'nozzle_temp', label: () => m['matdef.field.nozzle'](), unit: '°C' },
				{ key: 'bed_temp', label: () => m['matdef.field.bed'](), unit: '°C' },
				{ key: 'chamber_temp', label: () => m['matdef.field.chamber'](), unit: '°C' }
			]
		},
		{
			title: () => m['matdef.group.speed'](),
			rows: [
				{ key: 'fan_speed', label: () => m['matdef.field.fan'](), unit: '%' },
				{ key: 'max_speed', label: () => m['matdef.field.maxSpeed'](), unit: 'mm/s' },
				{
					key: 'max_volumetric_speed',
					label: () => m['matdef.field.mvs'](),
					unit: 'mm³/s',
					help: () => m['matdef.help.mvs']()
				},
				{
					key: 'flow_ratio',
					label: () => m['matdef.field.flowRatio'](),
					help: () => m['matdef.help.flowRatio']()
				}
			]
		},
		{
			title: () => m['matdef.group.drying'](),
			rows: [
				{ key: 'drying_temp', label: () => m['matdef.field.dryingTemp'](), unit: '°C' },
				{ key: 'drying_time_h', label: () => m['matdef.field.dryingTime'](), unit: 'h' }
			]
		},
		{
			title: () => m['matdef.group.mechanical'](),
			rows: [
				{
					key: 'tensile_strength_xy',
					label: () => m['matdef.field.tensileXY'](),
					unit: 'MPa',
					help: () => m['matdef.help.tensileXY']()
				},
				{
					key: 'tensile_strength_z',
					label: () => m['matdef.field.tensileZ'](),
					unit: 'MPa',
					help: () => m['matdef.help.tensileZ']()
				},
				{
					key: 'flexural_strength_xy',
					label: () => m['matdef.field.flexXY'](),
					unit: 'MPa',
					help: () => m['matdef.help.flexXY']()
				},
				{
					key: 'flexural_strength_z',
					label: () => m['matdef.field.flexZ'](),
					unit: 'MPa',
					help: () => m['matdef.help.flexZ']()
				},
				{
					key: 'elongation_xy',
					label: () => m['matdef.field.elongXY'](),
					unit: '%',
					help: () => m['matdef.help.elongXY']()
				},
				{
					key: 'elongation_z',
					label: () => m['matdef.field.elongZ'](),
					unit: '%',
					help: () => m['matdef.help.elongZ']()
				},
				{
					key: 'izod_notched_xy',
					label: () => m['matdef.field.izod'](),
					unit: 'kJ/m²',
					help: () => m['matdef.help.izod']()
				},
				{
					key: 'charpy_notched_xy',
					label: () => m['matdef.field.charpy'](),
					unit: 'kJ/m²',
					help: () => m['matdef.help.charpy']()
				}
			]
		},
		{
			title: () => m['matdef.group.thermal'](),
			rows: [
				{
					key: 'softening_temp',
					label: () => m['matdef.field.softening'](),
					unit: '°C',
					help: () => m['matdef.help.softening']()
				},
				{
					key: 'vicat_temp',
					label: () => m['matdef.field.vicat'](),
					unit: '°C',
					help: () => m['matdef.help.vicat']()
				},
				{
					key: 'glass_transition_temp',
					label: () => m['matdef.field.tg'](),
					unit: '°C',
					help: () => m['matdef.help.tg']()
				},
				{
					key: 'melting_temp',
					label: () => m['matdef.field.melting'](),
					unit: '°C',
					help: () => m['matdef.help.melting']()
				}
			]
		},
		{
			title: () => m['matdef.group.other'](),
			rows: [
				{
					key: 'melt_flow_rate',
					label: () => m['matdef.field.mfr'](),
					unit: 'g/10min',
					help: () => m['matdef.help.mfr']()
				},
				{
					key: 'shore_hardness',
					label: () => m['matdef.field.shore'](),
					help: () => m['matdef.help.shore']()
				}
			]
		}
	];

	let data = $state<MaterialDefaults | null>(null);
	let open = $state(false);

	// A filament with no manufacturer, material or type has nothing to look up; one the
	// bundled dataset doesn't know renders nothing, so a failed lookup is silent too.
	$effect(() => {
		data = null;
		if (!vendor || !material || !type) return;
		const ctrl = new AbortController();
		getMaterialDefaults(vendor, material, type, ctrl.signal)
			.then((d) => (data = d))
			.catch(() => {});
		return () => ctrl.abort();
	});

	let groups = $derived(
		data
			? GROUPS.map((g) => ({ ...g, rows: g.rows.filter((r) => data?.[r.key]) })).filter(
					(g) => g.rows.length > 0
				)
			: []
	);
</script>

{#if data}
	<SectionLabel>
		{m['matdef.title']()} — {data.brand}
		{data.material}
		{data.type}
		{#snippet right()}
			<Button variant="ghost" onclick={() => (open = !open)}>
				{open ? m['matdef.hide']() : m['matdef.show']()}
			</Button>
		{/snippet}
	</SectionLabel>
	<p class="sub">{m['matdef.subtitle']()}</p>

	{#if open}
		{#each groups as g (g.title())}
			<div class="gname">{g.title()}</div>
			<FieldGrid labelWidth="150px">
				{#each g.rows as r (r.key)}
					<Field label={r.label()} help={r.help?.()} mono>{data[r.key]}{r.unit ? ` ${r.unit}` : ''}</Field>
				{/each}
			</FieldGrid>
		{/each}
		{#if data.ams_compatibility || data.build_plate}
			<div class="gname">{m['matdef.group.compat']()}</div>
			<FieldGrid labelWidth="150px">
				{#if data.ams_compatibility}
					<Field label={m['matdef.field.ams']()} help={m['matdef.help.ams']()}>
						<span class="tags"
							>{#each splitList(data.ams_compatibility) as t (t)}<span class="tag">{t}</span>{/each}</span
						>
					</Field>
				{/if}
				{#if data.build_plate}
					<Field label={m['matdef.field.plates']()} help={m['matdef.help.plates']()}>
						<span class="tags"
							>{#each splitList(data.build_plate) as t (t)}<span class="tag">{t}</span>{/each}</span
						>
					</Field>
				{/if}
			</FieldGrid>
		{/if}
	{/if}
{/if}

<style>
	.sub {
		margin: 0 0 8px;
		font-size: 11.5px;
		color: var(--text-dim);
	}
	.gname {
		margin: 12px 0 6px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-dim);
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
