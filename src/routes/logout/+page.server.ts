import { lucia } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (locals.session) {
		await lucia.invalidateSession(locals.session.id);
		const sessionCookie = lucia.createBlankSessionCookie();
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: ".",
			...sessionCookie.attributes
		});
	}
	redirect(302, "/login");
};

export const actions = {
	default: async ({ locals, cookies }) => {
		if (locals.session) {
			await lucia.invalidateSession(locals.session.id);
			const sessionCookie = lucia.createBlankSessionCookie();
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: ".",
				...sessionCookie.attributes
			});
		}
		redirect(302, "/login");
	}
};