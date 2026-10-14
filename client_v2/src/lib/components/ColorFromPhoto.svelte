<script lang="ts">
	import { untrack } from 'svelte';
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import Camera from '@lucide/svelte/icons/camera';
	import Upload from '@lucide/svelte/icons/upload';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { averageColor, sampleRect } from '$lib/utils/colorSample';
	import * as m from '$lib/paraglide/messages';

	// Two steps: take or choose a photo of the physical filament, then click a point on
	// it to read the colour there (instead of guessing it on a colour wheel).
	interface Props {
		open: boolean;
		/** Called with the chosen colour as "RRGGBB". */
		onpick: (hex: string) => void;
		onclose: () => void;
	}
	let { open, onpick, onclose }: Props = $props();

	type Step = 'choose' | 'camera' | 'image';
	let step = $state<Step>('choose');
	let imageUrl = $state<string | null>(null);
	let picked = $state<string | null>(null);
	let marker = $state<{ x: number; y: number } | null>(null);
	let error = $state<string | null>(null);
	let video = $state<HTMLVideoElement | null>(null);
	let img = $state<HTMLImageElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	function setImage(url: string) {
		if (imageUrl) URL.revokeObjectURL(imageUrl);
		imageUrl = url;
		picked = null;
		marker = null;
		step = 'image';
	}

	function reset() {
		if (imageUrl) URL.revokeObjectURL(imageUrl);
		imageUrl = null;
		picked = null;
		marker = null;
		error = null;
		step = 'choose';
	}

	function close() {
		reset();
		onclose();
	}

	// Start from a clean state each time the dialog opens. reset() reads the state it
	// clears, so it runs untracked: only `open` may re-trigger this.
	$effect(() => {
		if (open) untrack(reset);
	});

	function messageForError(err: unknown): string {
		const name = (err as { name?: string } | null)?.name ?? '';
		if (name === 'NotAllowedError' || name === 'SecurityError') return m['scanner.error.notAllowed']();
		if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError')
			return m['scanner.error.notFound']();
		if (name === 'NotReadableError' || name === 'TrackStartError') return m['scanner.error.inUse']();
		return m['scanner.error.unknown']({ error: name });
	}

	// The camera runs only while the camera step is showing; the cleanup stops the
	// stream so the camera light goes off as soon as the step changes or the dialog closes.
	$effect(() => {
		if (!open || step !== 'camera' || !video) return;
		error = null;
		if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
			error = !window.isSecureContext
				? m['scanner.error.insecureContext']()
				: m['scanner.error.streamApiNotSupported']();
			return;
		}
		const el = video;
		let stream: MediaStream | null = null;
		let cancelled = false;
		navigator.mediaDevices
			.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
			.then((s) => {
				if (cancelled) return s.getTracks().forEach((t) => t.stop());
				stream = s;
				el.srcObject = s;
				void el.play();
			})
			.catch((e) => {
				if (!cancelled) error = messageForError(e);
			});
		return () => {
			cancelled = true;
			stream?.getTracks().forEach((t) => t.stop());
			el.srcObject = null;
		};
	});

	function capture() {
		if (!video || !canvas || !video.videoWidth) return;
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		canvas.getContext('2d')?.drawImage(video, 0, 0);
		canvas.toBlob(
			(blob) => {
				if (blob) setImage(URL.createObjectURL(blob));
			},
			'image/jpeg',
			0.9
		);
	}

	function chosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) setImage(URL.createObjectURL(file));
	}

	// Read pixels at the photo's real resolution, not the size it is shown at.
	function sample(e: MouseEvent) {
		if (!img || !canvas) return;
		if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			canvas.getContext('2d')?.drawImage(img, 0, 0);
		}
		const rect = img.getBoundingClientRect();
		const x = Math.round(((e.clientX - rect.left) * img.naturalWidth) / rect.width);
		const y = Math.round(((e.clientY - rect.top) * img.naturalHeight) / rect.height);
		const { left, top, w, h } = sampleRect(x, y, canvas.width, canvas.height);
		const data = canvas.getContext('2d')?.getImageData(left, top, w, h).data;
		const hex = data ? averageColor(data) : null;
		if (!hex) return;
		picked = hex;
		marker = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
	}

	function use() {
		if (!picked) return;
		const hex = picked;
		reset();
		onpick(hex);
	}
</script>

<Modal {open} title={m['colorPhoto.title']()} onclose={close} width="480px">
	{#if step === 'choose'}
		<p class="hint">{m['colorPhoto.intro']()}</p>
		<div class="row">
			<Button onclick={() => (step = 'camera')}><Camera size={14} />{m['colorPhoto.takePhoto']()}</Button>
			<Button variant="outline" onclick={() => fileInput?.click()}>
				<Upload size={14} />{m['colorPhoto.upload']()}
			</Button>
		</div>
		<input bind:this={fileInput} class="file" type="file" accept="image/*" onchange={chosen} />
	{:else if step === 'camera'}
		{#if error}
			<p class="err">{error}</p>
		{:else}
			<video bind:this={video} class="video" playsinline muted></video>
		{/if}
		<div class="row">
			<Button disabled={!!error} onclick={capture}><Camera size={14} />{m['colorPhoto.capture']()}</Button>
			<Button variant="outline" onclick={reset}>{m['buttons.cancel']()}</Button>
		</div>
	{:else if imageUrl}
		<p class="hint">{m['colorPhoto.tapPoint']()}</p>
		<button class="imgbtn" type="button" onclick={sample} aria-label={m['colorPhoto.tapPoint']()}>
			<img bind:this={img} src={imageUrl} alt="" />
			{#if marker}
				<span class="marker" style:left="{marker.x * 100}%" style:top="{marker.y * 100}%"></span>
			{/if}
		</button>
		{#if picked}
			<div class="picked">
				<span class="swatch" style:background="#{picked}"></span>
				<strong class="mono">#{picked}</strong>
			</div>
		{/if}
	{/if}
	<canvas bind:this={canvas} class="hidden"></canvas>

	{#snippet footer()}
		{#if step === 'image'}
			<Button variant="outline" onclick={reset}><RotateCcw size={14} />{m['colorPhoto.another']()}</Button>
			<Button disabled={!picked} onclick={use}><Check size={14} />{m['colorPhoto.use']()}</Button>
		{:else}
			<Button variant="outline" onclick={close}>{m['buttons.cancel']()}</Button>
		{/if}
	{/snippet}
</Modal>

<style>
	.hint {
		margin: 0 0 12px;
		font-size: 12.5px;
		color: var(--text-dim);
		line-height: 1.5;
	}
	.err {
		margin: 0 0 12px;
		font-size: 13px;
		color: #e5484d;
	}
	.row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.file,
	.hidden {
		display: none;
	}
	.video {
		width: 100%;
		max-height: 340px;
		border-radius: 8px;
		background: #000;
		margin-bottom: 12px;
		display: block;
	}
	.imgbtn {
		position: relative;
		display: inline-block;
		max-width: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: crosshair;
	}
	.imgbtn img {
		max-width: 100%;
		max-height: 360px;
		border-radius: 8px;
		display: block;
	}
	.marker {
		position: absolute;
		width: 18px;
		height: 18px;
		margin: -9px 0 0 -9px;
		border-radius: 50%;
		border: 2px solid #fff;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
		pointer-events: none;
	}
	.picked {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 12px;
	}
	.swatch {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: 1px solid var(--border-strong);
	}
</style>
