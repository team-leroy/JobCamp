import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { generateEmailVerificationCode, setNewLuciaSession, updateLastLoginToNow } from '$lib/server/auth';
import { sendEmailVerificationEmail } from '$lib/server/email';

export const load: PageServerLoad = async (event) => {
    if (event.locals.user && event.locals.user.emailVerified) {
        redirect(302, "/dashboard")
    }

    const props = event.url.searchParams;

    const code = props.get("code")?.toString();
    const userId = props.get("uid")?.toString();

    if (code && userId) {
        const correctCode = await prisma.emailVerificationCodes.findFirst({
            where: { user_id: userId }
        });

        if (!correctCode || correctCode.code != code) {
            return { msg: "Incorrect Link. Please Resend and Try again."}
        }

        if (correctCode.expires_at < new Date()) {
            return { msg: "Expired Link. Please Resend and Try again."}
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerified: true,
            }
        });
        
        await prisma.emailVerificationCodes.delete({
            where: { user_id: userId }
        });

        if (!event.locals.user) {
            await updateLastLoginToNow(userId);
            await setNewLuciaSession(userId, event);
        }

        redirect(302, "/dashboard")
    }

    return { msg: "" };
};


export const actions: Actions = {
    resend: async (event) => {
        if (!event.locals.user) return;

        const email = event.locals.user.email;
        const code = await generateEmailVerificationCode(event.locals.user.id, email)
        await sendEmailVerificationEmail(event.locals.user.id, email, code);
    }
};