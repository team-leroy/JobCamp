import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(302, '/lghs');
};

/** Handle POST to / (e.g. stale form or bot) so we redirect instead of throwing "No form actions exist". */
export const actions: Actions = {
	default: async () => {
		redirect(302, '/lghs');
	}
};