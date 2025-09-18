import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { createNewPositionSchema } from "./schema";
import { sendPositionUpdateEmail } from "$lib/server/email";

const grabUserData = async (locals : App.Locals) => {
    if (!locals.user) {
        redirect(302, "/login");
    }

    const userInfo = await prisma.user.findFirst({
        where: { id: locals.user.id }
    });
    if (!userInfo) {
        redirect(302, "/lghs")
    }
    
    const hostInfo = await prisma.host.findFirst({
        where: { userId: userInfo.id }
    });
    if (!hostInfo) {
        redirect(302, "/lghs")
    }

    return { userInfo, hostInfo }
}

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    const { userInfo, hostInfo } = await grabUserData(locals);
    const form = await superValidate(zod(createNewPositionSchema(hostInfo.name, userInfo.email)));

    return { form };
};

export const actions: Actions = {
    createPosition: async ({ request, locals }) => {
        const { userInfo, hostInfo } = await grabUserData(locals);
        const form = await superValidate(request, zod(createNewPositionSchema(hostInfo.name, userInfo.email)));

        if (!form.valid) {
            // form.data.attachment1 = undefined;
            // form.data.attachment2 = undefined;
            console.log(form.errors);
            return fail(400, { form });
        }

        if (!locals.user) {
            redirect(302, "/login");
        }

        const host = await prisma.host.findFirst({
            where: { userId: locals.user.id }, 
            include: { company: { include: { school: true } } }
        })

        const schoolId = host?.company?.schoolId;
        if (!schoolId) {
            redirect(302, "/login");
        }

        // Get the active event for this school
        const activeEvent = await prisma.event.findFirst({
            where: { 
                schoolId,
                isActive: true 
            }
        });
        
        if (!activeEvent) {
            throw new Error('No active event found for this school');
        }

        // var attachments = [];

        // if (form.data.attachment1) {
        //     const bytes = await form.data.attachment1.bytes();
        //     await addNewFile(form.data.title.replace(" ", "-") +  "-" + form.data.attachment1.name, bytes);
        //     attachments.push({ fileName: form.data.attachment1.name })
        // }

        // if (form.data.attachment2) {
        //     const bytes = await form.data.attachment2.bytes();
        //     await addNewFile(form.data.title.replace(" ", "-") +  "-" + form.data.attachment2.name, bytes);
        //     attachments.push({ fileName: form.data.attachment2.name })
        // }

        await prisma.host.update({
            where: { userId: locals.user.id },
            data: {
                positions: {
                    create: [
                        {
                            title: form.data.title,
                            career: form.data.career,
                            slots: form.data.slots,
                            summary: form.data.summary,
                            contact_name: form.data.fullName,
                            contact_email: form.data.email,
                            address: form.data.address,
                            instructions: form.data.instructions,
                            attire: form.data.attire,
                            arrival: form.data.arrival,
                            start: form.data.start,
                            end:form.data.release,
                            event: { connect: { id: activeEvent.id } },
                            // attachments: { create: attachments }
                        }
                    ]
                }
            },
            include: { positions: true }
        });
        
        sendPositionUpdateEmail(userInfo.email, {
            title: form.data.title,
            career: form.data.career,
            slots: form.data.slots.toString(),
            summary: form.data.summary,
            contact_name: form.data.fullName,
            contact_email: form.data.email,
            address: form.data.address,
            instructions: form.data.instructions,
            attire: form.data.attire,
            arrival: form.data.arrival,
            start: form.data.start,
            end: form.data.release,
        });

        redirect(302, "/dashboard");
    }
};