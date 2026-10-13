<script lang="ts">
	import Card from '$components/Card.svelte';
	import SettingRow from '$components/settings/SettingRow.svelte';
	import NumberInput from '$components/NumberInput.svelte';
	import Button from '$components/Button.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { loadPurgeSettings, type PurgeSettings } from '$lib/api/purge';
	import { setSetting } from '$lib/api/settings';
	import { trackSave } from '$lib/utils/autosave';
	import * as m from '$lib/paraglide/messages';

	// The purge library's own settings: which nozzle sizes the forms offer, where the
	// matrix's green-to-red scale starts and ends, and how many filaments a matrix
	// may compare. Each edit is written straight through, like the rest of this page.
	let values = $state<PurgeSettings | null>(null);

	$effect(() => {
		const ctrl = new AbortController();
		loadPurgeSettings(ctrl.signal)
			.then((s) => (values = s))
			.catch(() => {});
		return () => ctrl.abort();
	});

	function saveNozzles(sizes: number[]) {
		if (!values) return;
		// Largest first, one of each: the first entry is what a new purge starts with.
		const clean = [...new Set(sizes.filter((s) => s > 0))].sort((a, b) => b - a);
		values.nozzleSizes = clean;
		trackSave(setSetting('purge_nozzle_sizes', clean));
	}
	function setNozzle(index: number, size: number) {
		if (!values) return;
		saveNozzles(values.nozzleSizes.map((s, i) => (i === index ? size : s)));
	}
	function addNozzle() {
		if (!values) return;
		const next = Math.round((Math.max(0, ...values.nozzleSizes) + 0.2) * 10) / 10;
		saveNozzles([...values.nozzleSizes, next]);
	}
	function removeNozzle(index: number) {
		if (!values) return;
		saveNozzles(values.nozzleSizes.filter((_, i) => i !== index));
	}

	function saveNumber(key: 'volumeLow' | 'volumeHigh' | 'maxMatrixFilaments', setting: string, v: number) {
		if (!values) return;
		values[key] = v;
		trackSave(setSetting(setting, v));
	}
</script>

{#if values}
	<Card divided>
		<SettingRow title={m['settings.purge.nozzles.label']()} desc={m['settings.purge.nozzles.desc']()}>
			<div class="nozzles">
				{#each values.nozzleSizes as size, i (i)}
					<div class="nz">
						<NumberInput
							value={size}
							min={0.1}
							max={2}
							step={0.1}
							unit="mm"
							width="120px"
							onchange={(v) => setNozzle(i, v)}
						/>
						<Button variant="ghost" ariaLabel={m['buttons.delete']()} onclick={() => removeNozzle(i)}>
							<X size={14} />
						</Button>
					</div>
				{/each}
				<Button variant="outline" onclick={addNozzle}
					><Plus size={14} />{m['settings.purge.nozzles.add']()}</Button
				>
			</div>
		</SettingRow>
		<SettingRow title={m['settings.purge.low.label']()} desc={m['settings.purge.low.desc']()}>
			<NumberInput
				value={values.volumeLow}
				min={1}
				max={9999}
				step={10}
				unit="mm³"
				width="140px"
				onchange={(v) => saveNumber('volumeLow', 'purge_volume_low', v)}
			/>
		</SettingRow>
		<SettingRow title={m['settings.purge.high.label']()} desc={m['settings.purge.high.desc']()}>
			<NumberInput
				value={values.volumeHigh}
				min={1}
				max={9999}
				step={50}
				unit="mm³"
				width="140px"
				onchange={(v) => saveNumber('volumeHigh', 'purge_volume_high', v)}
			/>
		</SettingRow>
		<SettingRow
			title={m['settings.purge.maxFilaments.label']()}
			desc={m['settings.purge.maxFilaments.desc']()}
		>
			<NumberInput
				value={values.maxMatrixFilaments}
				min={2}
				max={20}
				step={1}
				width="140px"
				onchange={(v) => saveNumber('maxMatrixFilaments', 'purge_matrix_max_filaments', Math.round(v))}
			/>
		</SettingRow>
	</Card>
{/if}

<style>
	.nozzles {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 6px;
	}
	.nz {
		display: flex;
		align-items: center;
		gap: 4px;
	}
</style>
