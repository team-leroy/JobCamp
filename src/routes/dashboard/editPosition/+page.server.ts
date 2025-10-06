import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { editPositionSchema } from "./schema";
import { sendPositionUpdateEmail } from "$lib/server/email";

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        redirect(302, "/login");
    }
    if (!locals.user.emailVerified) {
        redirect(302, "/verify-email");
    }

    const positionId = url.searchParams.get("posId")?.toString();
    if (!positionId) {
        redirect(302, "/lghs")
    }
    const positionInfo = await prisma.position.findFirst({ where: { id: positionId }, include: { attachments : true } });
    if (!positionInfo) {
        redirect(302, "/lghs")
    }

    const attachments: Array<{ fileName: string }> = [];
    positionInfo.attachments.forEach(async attachment => {
        attachments.push(attachment);
    });
    
    const form = await superValidate(zod(editPositionSchema(positionInfo)));
    
    return { form };
};

export const actions: Actions = {
    publishPosition: async ({ url, request, locals }) => {
        const positionId = url.searchParams.get("posId")?.toString();
        if (!positionId) {
            redirect(302, "/about")
        }
        const positionInfo = await prisma.position.findFirst({ where: { id: positionId } })
        if (!positionInfo) {
            redirect(302, "/faq")
        }
        
        const form = await superValidate(request, zod(editPositionSchema(positionInfo)));
        if (!form.valid) {
            return fail(400, { form });
        }

        if (!locals.user) {
            redirect(302, "/host-tips");
        }
        console.log(form.data.slots)

        const positionOriginal = await prisma.position.findFirst({ where: { id: positionId }, include: { attachments: true } });
        if (!positionOriginal) {
            redirect(302, "/host-tips");
        }

        // const attachmentsForm = [];
        // if (form.data.attachment1) {
        //     attachmentsForm.push(form.data.attachment1);
        // }
        // if (form.data.attachment2) {
        //     attachmentsForm.push(form.data.attachment2);
        // }

        // const attachments: any = [];

        // attachmentsForm.forEach((element) => {
        //     attachments.push({ fileName: form.data.title.replace(" ", "-") +  "-" + element.fileName })
        // })

        // for (var i = 0; i < attachments.length; i++) {
        //     const element = attachments[i];
        //     addNewFile(element.fileName, await element.bytes());
        // }

        await prisma.position.update({
            where: { id: positionId },
            data: {
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
                isPublished: true, // Mark as published when form is submitted
                // attachments: { set: attachments }
            }
        });

        sendPositionUpdateEmail(locals.user.email, {
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