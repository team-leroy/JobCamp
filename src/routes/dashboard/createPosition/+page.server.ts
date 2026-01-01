import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { createNewPositionSchema } from "./schema";
import { sendPositionUpdateEmail, formatEmailDate, type EventEmailData } from "$lib/server/email";
import { addNewFile } from "../storage";

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
    publishPosition: async ({ request, locals }) => {
        console.log("[CreatePosition] publishPosition started");
        const { userInfo, hostInfo } = await grabUserData(locals);
        const form = await superValidate(request, zod(createNewPositionSchema(hostInfo.name, userInfo.email)));

        if (!form.valid) {
            console.log("[CreatePosition] Form validation failed:", JSON.stringify(form.errors, null, 2));
            // Remove File objects from form data before returning (they can't be serialized)
            const formDataWithoutFiles = {
                ...form.data,
                attachment1: undefined,
                attachment2: undefined
            };
            return fail(400, { 
                form: {
                    ...form,
                    data: formDataWithoutFiles
                }
            });
        }

        console.log("[CreatePosition] Form is valid, proceeding with creation");

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

        // Enforce 2-attachment limit
        const attachmentCount = (form.data.attachment1 ? 1 : 0) + (form.data.attachment2 ? 1 : 0);
        if (attachmentCount > 2) {
            // Remove File objects from form data before returning (they can't be serialized)
            const formDataWithoutFiles = {
                ...form.data,
                attachment1: undefined,
                attachment2: undefined
            };
            return fail(400, { 
                form: {
                    ...form,
                    data: formDataWithoutFiles
                },
                error: "Maximum 2 attachments allowed per position"
            });
        }

        const attachments = [];

        if (form.data.attachment1) {
            try {
                const bytes = await form.data.attachment1.bytes();
                const originalFileName = form.data.attachment1.name;
                // Create storage path: sanitize title and combine with original filename
                const sanitizedTitle = form.data.title.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                const storagePath = `${sanitizedTitle}-${Date.now()}-${originalFileName}`;
                
                await addNewFile(storagePath, bytes);
                attachments.push({ 
                    fileName: originalFileName,
                    storagePath: storagePath
                });
            } catch (error) {
                console.error('Error uploading attachment1:', error);
                // Continue without attachment if storage fails
            }
        }

        if (form.data.attachment2) {
            try {
                const bytes = await form.data.attachment2.bytes();
                const originalFileName = form.data.attachment2.name;
                // Create storage path: sanitize title and combine with original filename
                const sanitizedTitle = form.data.title.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                const storagePath = `${sanitizedTitle}-${Date.now()}-${originalFileName}`;
                
                await addNewFile(storagePath, bytes);
                attachments.push({ 
                    fileName: originalFileName,
                    storagePath: storagePath
                });
            } catch (error) {
                console.error('Error uploading attachment2:', error);
                // Continue without attachment if storage fails
            }
        }

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
                            isPublished: true, // Mark as published when form is submitted via Publish button
                            attachments: { create: attachments }
                        }
                    ]
                }
            },
            include: { positions: true }
        });
        
        // Get school information for email
        const school = host.company?.school;
        if (!school) {
            throw new Error('School not found');
        }

        const eventData: EventEmailData = {
            eventName: activeEvent.name || 'JobCamp',
            eventDate: formatEmailDate(activeEvent.date),
            schoolName: school.name,
            schoolId: school.id
        };

        sendPositionUpdateEmail(userInfo.email, {
            title: form.data.title,
            career: form.data.career,
            slots: form.data.slots.toString(),
            summary: form.data.summary,
            contact_name: form.data.fullName,
            contact_email: form.data.email,
            address: form.data.address || 'Not provided',
            instructions: form.data.instructions || 'Not provided',
            attire: form.data.attire || 'Not provided',
            arrival: form.data.arrival || 'Not provided',
            start: form.data.start || 'Not provided',
            end: form.data.release || 'Not provided',
            attachmentCount: attachments.length.toString(),
        }, eventData);

        redirect(302, "/dashboard");
    }
};