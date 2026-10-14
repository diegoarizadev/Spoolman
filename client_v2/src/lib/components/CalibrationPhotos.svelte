<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import type { CalibrationImage } from '$lib/api/calibrationImages';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		/** Photos already saved on the record. */
		existing: CalibrationImage[];
		urlFor: (imageId: number) => string;
		/** Ids of saved photos the user removed; applied when the form is saved. */
		removedIds: number[];
		/** New files picked but not uploaded yet. */
		pending: File[];
	}

	let { existing, urlFor, removedIds = $bindable(), pending = $bindable() }: Props = $props();

	let visible = $derived(existing.filter((i) => !removedIds.includes(i.id)));
	let pendingUrls = $derived(pending.map((f) => URL.createObjectURL(f)));

	// Release the preview URLs when the previews change or the component goes away.
	$effect(() => {
		const urls = pendingUrls;
		return () => urls.forEach((u) => URL.revokeObjectURL(u));
	});

	function pick(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		pending = [...pending, ...Array.from(input.files ?? [])];
		input.value = '';
	}
</script>

<div class="photos">
	<div class="thumbs">
		{#each visible as img (img.id)}
			<div class="thumb">
				<img src={urlFor(img.id)} alt="" />
				<button
					type="button"
					aria-label={m['buttons.delete']()}
					onclick={() => (removedIds = [...removedIds, img.id])}><X size={12} /></button
				>
			</div>
		{/each}
		{#each pending as file, i (i + file.name)}
			<div class="thumb">
				<img src={pendingUrls[i]} alt="" />
				<button
					type="button"
					aria-label={m['buttons.delete']()}
					onclick={() => (pending = pending.filter((_, j) => j !== i))}><X size={12} /></button
				>
			</div>
		{/each}
	</div>
	<input type="file" accept="image/*" multiple onchange={pick} />
</div>

<style>
	.photos {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.thumb {
		position: relative;
		width: 72px;
		height: 72px;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 8px;
		border: 1px solid var(--border);
	}
	.thumb button {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 20px;
		height: 20px;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.65);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
</style>
