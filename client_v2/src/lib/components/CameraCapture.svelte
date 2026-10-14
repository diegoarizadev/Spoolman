<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import Camera from '@lucide/svelte/icons/camera';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import SwitchCamera from '@lucide/svelte/icons/switch-camera';
	import * as m from '$lib/paraglide/messages';

	// Live camera: capture a still, review it, then hand it back as a JPEG file.
	interface Props {
		open: boolean;
		oncapture: (file: File) => void;
		onclose: () => void;
	}
	let { open, oncapture, onclose }: Props = $props();

	let video = $state<HTMLVideoElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let facing = $state<'environment' | 'user'>('environment');
	let error = $state<string | null>(null);
	let blob = $state<Blob | null>(null);
	let shotUrl = $state<string | null>(null);

	function messageForError(err: unknown): string {
		const name = (err as { name?: string } | null)?.name ?? '';
		if (name === 'NotAllowedError' || name === 'SecurityError') return m['scanner.error.notAllowed']();
		if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError')
			return m['scanner.error.notFound']();
		if (name === 'NotReadableError' || name === 'TrackStartError') return m['scanner.error.inUse']();
		return m['scanner.error.unknown']({ error: name });
	}

	function discardShot() {
		if (shotUrl) URL.revokeObjectURL(shotUrl);
		shotUrl = null;
		blob = null;
	}

	// The camera runs while the dialog is open and no still is being reviewed; the
	// cleanup stops the stream so the camera light goes off straight away.
	$effect(() => {
		if (!open || shotUrl || !video) return;
		const side = facing;
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
			.getUserMedia({ video: { facingMode: side }, audio: false })
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

	// A fresh start each time the dialog opens.
	$effect(() => {
		if (!open) discardShot();
	});

	function capture() {
		if (!video || !canvas || !video.videoWidth) return;
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		canvas.getContext('2d')?.drawImage(video, 0, 0);
		canvas.toBlob(
			(b) => {
				if (!b) return;
				blob = b;
				shotUrl = URL.createObjectURL(b);
			},
			'image/jpeg',
			0.9
		);
	}

	function use() {
		if (!blob) return;
		const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
		discardShot();
		oncapture(file);
	}
</script>

<Modal {open} title={m['photo.cameraTitle']()} {onclose} width="min(94vw, 520px)">
	{#if error}
		<p class="err">{error}</p>
	{:else if shotUrl}
		<img class="shot" src={shotUrl} alt="" />
	{:else}
		<div class="live">
			<video bind:this={video} playsinline muted></video>
			<button
				class="flip"
				type="button"
				onclick={() => (facing = facing === 'environment' ? 'user' : 'environment')}
				aria-label={m['photo.flip']()}
				title={m['photo.flip']()}><SwitchCamera size={18} /></button
			>
		</div>
	{/if}
	<canvas bind:this={canvas} class="hidden"></canvas>

	{#snippet footer()}
		{#if shotUrl}
			<Button variant="outline" onclick={discardShot}><RotateCcw size={14} />{m['photo.retake']()}</Button>
			<Button onclick={use}><Check size={14} />{m['photo.usePhoto']()}</Button>
		{:else}
			<Button variant="outline" onclick={onclose}>{m['buttons.cancel']()}</Button>
			<Button disabled={!!error} onclick={capture}><Camera size={14} />{m['colorPhoto.capture']()}</Button>
		{/if}
	{/snippet}
</Modal>

<style>
	.live {
		position: relative;
		background: #000;
		border-radius: 8px;
		overflow: hidden;
	}
	video,
	.shot {
		width: 100%;
		max-height: 60vh;
		display: block;
		object-fit: contain;
		border-radius: 8px;
		background: #000;
	}
	.flip {
		position: absolute;
		right: 10px;
		bottom: 10px;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.err {
		color: #e5484d;
		font-size: 13px;
		margin: 0;
	}
	.hidden {
		display: none;
	}
</style>
