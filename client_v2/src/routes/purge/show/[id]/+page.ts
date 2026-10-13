import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageLoad } from './$types';

// Purge labels (the label designer's `url` encoding, see $lib/labels/qr.ts) point
// at `/purge/show/<id>`, the same shape as the spool and filament links. There is
// no page for it: the purge library opens a purge's details from `/purge?view=<id>`,
// so this catches the printed link and forwards it there. Not prerenderable
// (dynamic id); the SPA fallback boots the app and this load runs the redirect.
export const prerender = false;

export const load: PageLoad = ({ params }) => {
	redirect(307, resolve(`/purge?view=${params.id}`));
};
