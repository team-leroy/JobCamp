import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createPasswordResetToken, login } from '$lib/server/auth';
import { sendPasswordResetEmail } from '$lib/server/email';
import { generateRandomString } from 'oslo/crypto';
import { passwordSaltCharacters } from '$lib/server/authConstants';
import { scrypt } from '$lib/server/hash';
import { prisma } from '$lib/server/prisma';


export const load: PageServerLoad = async (event) => {
    if (event.locals.user && !event.locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    if (event.locals.user && event.locals.user.emailVerified) {
        redirect(302, "/dashboard")
    }

    const props = event.url.searchParams;
        
    const code = props.get("code")?.toString();
    const userId = props.get("uid")?.toString();
    
    if (code && userId) { 
        return { waiting: 2, msg: "", code, userId };
    } 

    return { waiting: 0, msg: "", code: "", userId: "" };
};


export const actions: Actions = {
    submit: async (event) => {
        const form = await event.request.formData();

        const code = form.get("code")?.toString();
        if (!code) {
            return { waiting: 2, msg: "Incorrect Link. Please contact support at admin@jobcamp.org.", code: "", userId: "" };
        }

        const userId = form.get("uid")?.toString();
        if (!userId) { redirect(302, "/signup"); }

        const password = form.get("password")?.toString();
        if (!password) { return { waiting: 2, msg: "Password must be at least 8 characters", code, userId }; }
        if (password.length < 8) { return { waiting: 2, msg: "Password must be at least 8 characters", code, userId }; }

        const passwordSalt = generateRandomString(16, passwordSaltCharacters); // 128bit salt
        const passwordHash = await scrypt.hash(password, passwordSalt);

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                passwordSalt,
                passwordHash
            }
        });

        await login(user.email, password, event);

        redirect(302, "/dashboard");
    },
    send: async (event) => {
        const form = await event.request.formData();
        
        const email = form.get("email")?.toString();
        if (!email) {
            return { waiting: 0, msg: "Please Enter an Email", code: "", userId: "" };
        }

        const userId = (await prisma.user.findFirst({where: { email }}))?.id;
        if (!userId) { return { waiting: 0, msg: "User Account Does Not Exist", code: "", userId: "" }; }

        const code = await createPasswordResetToken(userId)
        await sendPasswordResetEmail(userId, email, code);

        return { waiting: 1, msg: "", code: "", userId: "" };
    }
};