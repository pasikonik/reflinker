import { initCronJobs } from '$lib/server/cron';
import type { Handle } from '@sveltejs/kit';

initCronJobs();

// Regular SvelteKit hooks
export const handle: Handle = async ({ event, resolve }) => {
	return await resolve(event);
};
