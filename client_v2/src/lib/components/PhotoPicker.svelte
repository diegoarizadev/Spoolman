<script lang="ts">
	import Camera from '@lucide/svelte/icons/camera';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import X from '@lucide/svelte/icons/x';
	import CameraCapture from './CameraCapture.svelte';
	import ImageCropper from './ImageCropper.svelte';
	import Button from './Button.svelte';
	import { lightbox } from '$lib/stores/lightbox.svelte';
	import { downscale } from '$lib/utils/image';
	import * as m from '$lib/paraglide/messages';

	// Photos for a record: pick files, drop them on the area, or take one with the
	// camera. `crop` sends each photo through the cropper first. In single mode
	// (`multiple` off) a new photo replaces the previous one.
	interface Props {
		/** Photos already saved on the record, shown first. */
		existing?: { id: number; src: string }[];
		/** Ids of saved photos the user removed; applied when the form is saved. */
		removedIds?: number[];
		/** New photos chosen but not uploaded yet. */
		files?: File[];
		multiple?: boolean;
		crop?: boolean;
	}

	let {
		existing = [],
		removedIds = $bindable([]),
		files = $bindable([]),
		multiple = true,
		crop = false
	}: Props = $props();

	let cameraOpen = $state(false);
	let dragging = $state(false);
	let input = $state<HTMLInputElement | null>(null);
	// Photos waiting their turn at the cropper; the first one is on screen.
	let queue = $state<File[]>([]);

	let visibleExisting = $derived(existing.filter((i) => !removedIds.includes(i.id)));
	// In single mode a new photo supersedes the saved one.
	let shownExisting = $derived(!multiple && files.length > 0 ? [] : visibleExisting);
	let pendingUrls = $derived(files.map((f) => URL.createObjectURL(f)));

	// Release the preview URLs when the previews change or the component goes away.
	$effect(() => {
		const urls = pendingUrls;
		return () => urls.forEach((u) => URL.revokeObjectURL(u));
	});

	function accept(list: File[]) {
		const images = list.filter((f) => f.type.startsWith('image/'));
		if (images.length === 0) return;
		const chosen = multiple ? images : images.slice(-1);
		if (crop) queue = multiple ? [...queue, ...chosen] : chosen;
		else add(chosen);
	}

	async function add(chosen: File[]) {
		const small = await Promise.all(chosen.map((f) => downscale(f)));
		files = multiple ? [...files, ...small] : small.slice(-1);
	}

	function cropped(file: File) {
		add([file]);
		queue = queue.slice(1);
	}

	function pick(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		accept(Array.from(el.files ?? []));
		el.value = '';
	}

	function drop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		accept(Array.from(e.dataTransfer?.files ?? []));
	}

	/** Open the viewer on every photo shown, at the one clicked. */
	function view(index: number) {
		lightbox.open([...shownExisting.map((i) => i.src), ...pendingUrls], index);
	}
</script>

<div class="picker">
	{#if shownExisting.length + files.length > 0}
		<div class="thumbs">
			{#each shownExisting as img, i (img.id)}
				<div class="thumb">
					<button class="open" type="button" onclick={() => view(i)} aria-label={m['photo.view']()}>
						<img src={img.src} alt="" />
					</button>
					{#if multiple}
						<button
							class="rm"
							type="button"
							aria-label={m['buttons.delete']()}
							onclick={() => (removedIds = [...removedIds, img.id])}><X size={12} /></button
						>
					{/if}
				</div>
			{/each}
			{#each files as file, i (i + file.name)}
				<div class="thumb">
					<button
						class="open"
						type="button"
						onclick={() => view(shownExisting.length + i)}
						aria-label={m['photo.view']()}
					>
						<img src={pendingUrls[i]} alt="" />
					</button>
					<button
						class="rm"
						type="button"
						aria-label={m['buttons.delete']()}
						onclick={() => (files = files.filter((_, j) => j !== i))}><X size={12} /></button
					>
				</div>
			{/each}
		</div>
	{/if}

	<button
		class="drop"
		class:over={dragging}
		type="button"
		onclick={() => input?.click()}
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={drop}
	>
		<ImagePlus size={18} />
		<span>{multiple ? m['photo.dropMany']() : m['photo.dropOne']()}</span>
	</button>
	<input bind:this={input} class="file" type="file" accept="image/*" {multiple} onchange={pick} />

	<div>
		<Button variant="outline" onclick={() => (cameraOpen = true)}>
			<Camera size={14} />{m['colorPhoto.takePhoto']()}
		</Button>
	</div>
</div>

<CameraCapture
	open={cameraOpen}
	onclose={() => (cameraOpen = false)}
	oncapture={(f) => {
		cameraOpen = false;
		accept([f]);
	}}
/>

<ImageCropper file={queue[0] ?? null} oncrop={cropped} oncancel={() => (queue = queue.slice(1))} />

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
		width: 100%;
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
	.open {
		width: 100%;
		height: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: zoom-in;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 8px;
		border: 1px solid var(--border);
		display: block;
	}
	.rm {
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
	.drop {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px 10px;
		border: 1px dashed var(--border-strong);
		border-radius: 8px;
		background: none;
		color: var(--text-dim);
		font: inherit;
		font-size: 12.5px;
		cursor: pointer;
	}
	.drop:hover,
	.drop.over {
		border-color: var(--accent);
		color: var(--text);
	}
	.file {
		display: none;
	}
</style>
