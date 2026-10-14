<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import Check from '@lucide/svelte/icons/check';
	import {
		clampRect,
		defaultRect,
		moveRect,
		rectFromPoints,
		resizeRect,
		toNatural,
		type Handle,
		type Rect
	} from '$lib/utils/crop';
	import * as m from '$lib/paraglide/messages';

	// Crop a photo before it is attached. Drag the box to move it, its handles to
	// resize it, or drag on the photo outside it to draw a new one. "Use whole photo"
	// skips cropping.
	interface Props {
		/** The photo to crop; the dialog is open while this is set. */
		file: File | null;
		/** The cropped photo (or the original, when uncropped). */
		oncrop: (file: File) => void;
		oncancel: () => void;
	}
	let { file, oncrop, oncancel }: Props = $props();

	const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

	let url = $state<string | null>(null);
	let img = $state<HTMLImageElement | null>(null);
	let box = $state<HTMLDivElement | null>(null);
	let W = $state(0);
	let H = $state(0);
	let rect = $state<Rect>({ x: 0, y: 0, w: 0, h: 0 });
	let drag = $state<{
		mode: 'move' | 'resize' | 'draw';
		handle?: Handle;
		x: number;
		y: number;
		start: Rect;
	} | null>(null);

	$effect(() => {
		if (!file) {
			url = null;
			return;
		}
		const u = URL.createObjectURL(file);
		url = u;
		return () => URL.revokeObjectURL(u);
	});

	function measure() {
		if (!img) return;
		W = img.clientWidth;
		H = img.clientHeight;
	}
	function loaded() {
		measure();
		rect = defaultRect(W, H);
	}

	function point(e: PointerEvent): { x: number; y: number } {
		const r = (box as HTMLDivElement).getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	function down(e: PointerEvent, mode: 'move' | 'resize' | 'draw', handle?: Handle) {
		e.stopPropagation();
		(box as HTMLDivElement).setPointerCapture(e.pointerId);
		const p = point(e);
		drag = { mode, handle, x: p.x, y: p.y, start: rect };
		if (mode === 'draw') rect = { x: p.x, y: p.y, w: 0, h: 0 };
	}

	function move(e: PointerEvent) {
		if (!drag) return;
		const p = point(e);
		const dx = p.x - drag.x;
		const dy = p.y - drag.y;
		if (drag.mode === 'move') rect = moveRect(drag.start, dx, dy, W, H);
		else if (drag.mode === 'resize' && drag.handle) rect = resizeRect(drag.start, drag.handle, dx, dy, W, H);
		else rect = rectFromPoints(drag.x, drag.y, p.x, p.y, W, H);
	}

	function up() {
		if (drag?.mode === 'draw') rect = clampRect(rect, W, H);
		drag = null;
	}

	function confirm() {
		if (!file || !img) return;
		const r = toNatural(rect, W, H, img.naturalWidth, img.naturalHeight);
		const canvas = document.createElement('canvas');
		canvas.width = r.w;
		canvas.height = r.h;
		canvas.getContext('2d')?.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
		const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
		canvas.toBlob(
			(blob) => {
				if (!blob) return oncrop(file);
				const ext = type === 'image/png' ? 'png' : 'jpg';
				const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
				oncrop(new File([blob], `${base}-crop.${ext}`, { type }));
			},
			type,
			0.92
		);
	}
</script>

<svelte:window onresize={measure} />

<Modal open={!!file} title={m['photo.cropTitle']()} onclose={oncancel} width="min(94vw, 640px)">
	<p class="hint">{m['photo.cropHint']()}</p>
	{#if url}
		<div class="stage">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="box"
				bind:this={box}
				onpointerdown={(e) => down(e, 'draw')}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={up}
			>
				<img bind:this={img} src={url} alt="" onload={loaded} draggable="false" />
				{#if W > 0 && rect.w > 0}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="crop"
						style:left="{rect.x}px"
						style:top="{rect.y}px"
						style:width="{rect.w}px"
						style:height="{rect.h}px"
						onpointerdown={(e) => down(e, 'move')}
					>
						{#each HANDLES as h (h)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span class="h {h}" onpointerdown={(e) => down(e, 'resize', h)}></span>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={oncancel}>{m['buttons.cancel']()}</Button>
		<Button variant="outline" onclick={() => file && oncrop(file)}>{m['photo.useWhole']()}</Button>
		<Button disabled={rect.w < 1 || rect.h < 1} onclick={confirm}>
			<Check size={14} />{m['photo.cropConfirm']()}
		</Button>
	{/snippet}
</Modal>

<style>
	.hint {
		margin: 0 0 10px;
		font-size: 12.5px;
		color: var(--text-dim);
	}
	.stage {
		display: flex;
		justify-content: center;
		max-height: 62vh;
		overflow: auto;
	}
	.box {
		position: relative;
		display: inline-block;
		touch-action: none;
		cursor: crosshair;
		user-select: none;
		line-height: 0;
	}
	.box img {
		max-width: 100%;
		max-height: 58vh;
		display: block;
	}
	.crop {
		position: absolute;
		border: 2px dashed #fff;
		box-shadow:
			0 0 0 9999px rgba(0, 0, 0, 0.55),
			0 0 0 1px rgba(0, 0, 0, 0.6);
		cursor: move;
	}
	.h {
		position: absolute;
		width: 12px;
		height: 12px;
		background: #fff;
		border: 1px solid rgba(0, 0, 0, 0.6);
		border-radius: 2px;
		margin: -6px 0 0 -6px;
	}
	.nw {
		left: 0;
		top: 0;
		cursor: nwse-resize;
	}
	.n {
		left: 50%;
		top: 0;
		cursor: ns-resize;
	}
	.ne {
		left: 100%;
		top: 0;
		cursor: nesw-resize;
	}
	.e {
		left: 100%;
		top: 50%;
		cursor: ew-resize;
	}
	.se {
		left: 100%;
		top: 100%;
		cursor: nwse-resize;
	}
	.s {
		left: 50%;
		top: 100%;
		cursor: ns-resize;
	}
	.sw {
		left: 0;
		top: 100%;
		cursor: nesw-resize;
	}
	.w {
		left: 0;
		top: 50%;
		cursor: ew-resize;
	}
</style>
