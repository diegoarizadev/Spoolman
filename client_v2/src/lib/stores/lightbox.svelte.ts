// App-wide photo viewer: any thumbnail can open the full-size photo (or a whole
// set, to step through with the arrow keys) without leaving the page. One viewer,
// mounted once in the root layout, serves every caller.

class LightboxState {
	urls = $state<string[]>([]);
	index = $state(0);
	isOpen = $state(false);

	/** Show `urls`, starting at `index`. */
	open(urls: string[], index = 0) {
		if (urls.length === 0) return;
		this.urls = urls;
		this.index = Math.min(Math.max(index, 0), urls.length - 1);
		this.isOpen = true;
	}

	close() {
		this.isOpen = false;
	}

	/** Step by `delta`, wrapping around either end. */
	step(delta: number) {
		const n = this.urls.length;
		if (n > 1) this.index = (this.index + delta + n) % n;
	}
}

export const lightbox = new LightboxState();
