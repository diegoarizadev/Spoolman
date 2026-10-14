import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageLoad } from './$types';

// A printer's link has no page of its own: the list opens the printer's details
// from `/printers?view=<id>`. Not prerenderable (dynamic id); the SPA fallback
// boots the app and this load runs the redirect.
export const prerender = false;

export const load: PageLoad = ({ params }) => {
	redirect(307, resolve(`/printers?view=${params.id}`));
};
