import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { editPositionSchema } from "./schema";
import { sendPositionUpdateEmail, formatEmailDate, type EventEmailData } from "$lib/server/email";
import { addNewFile, deleteFile } from "../storage";

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
    
    // Verify user owns this position
    const host = await prisma.host.findFirst({
        where: { userId: locals.user.id },
        include: { positions: true }
    });

    if (!host || !host.positions.find(p => p.id === positionId)) {
        redirect(302, "/dashboard");
    }

    const form = await superValidate(zod(editPositionSchema(positionInfo)));
    
    return { 
        form,
        position: positionInfo // Return position info including attachments
    };
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

        if (!locals.user) {
            redirect(302, "/host-tips");
        }
        console.log(form.data.slots)

        const positionOriginal = await prisma.position.findFirst({ where: { id: positionId }, include: { attachments: true } });
        if (!positionOriginal) {
            redirect(302, "/host-tips");
        }

        // Enforce 2-attachment limit (existing + new)
        const existingAttachmentCount = positionOriginal.attachments.length;
        const newAttachmentCount = (form.data.attachment1 ? 1 : 0) + (form.data.attachment2 ? 1 : 0);
        
        if (existingAttachmentCount + newAttachmentCount > 2) {
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
                error: `Maximum 2 attachments allowed per position. You have ${existingAttachmentCount} existing attachment(s) and are trying to add ${newAttachmentCount} new one(s).`
            });
        }

        const attachmentsForm = [];
        if (form.data.attachment1) {
            attachmentsForm.push(form.data.attachment1);
        }
        if (form.data.attachment2) {
            attachmentsForm.push(form.data.attachment2);
        }

        const attachments: Array<{ fileName: string; storagePath: string }> = [];

        for (let i = 0; i < attachmentsForm.length; i++) {
            const fileToSave = attachmentsForm[i];
            try {
                const bytes = await fileToSave.bytes();
                const originalFileName = fileToSave.name;
                // Create storage path: sanitize title and combine with original filename
                const sanitizedTitle = form.data.title.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                const storagePath = `${sanitizedTitle}-${Date.now()}-${originalFileName}`;
                
                await addNewFile(storagePath, bytes);
                attachments.push({ 
                    fileName: originalFileName,
                    storagePath: storagePath
                });
            } catch (error) {
                console.error(`Error uploading attachment ${i + 1}:`, error);
                // Continue without attachment if storage fails
            }
        }

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
                attachments: { create: attachments }
            }
        });

        // Get event and school information for email
        const position = await prisma.position.findFirst({
            where: { id: positionId },
            include: {
                event: {
                    include: {
                        school: true
                    }
                },
                attachments: true
            }
        });

        if (!position || !position.event || !position.event.school) {
            throw new Error('Position, event, or school not found');
        }

        const eventData: EventEmailData = {
            eventName: position.event.name || 'JobCamp',
            eventDate: formatEmailDate(position.event.date),
            schoolName: position.event.school.name,
            schoolId: position.event.school.id
        };

        sendPositionUpdateEmail(locals.user.email, {
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
            attachmentCount: position.attachments.length.toString(),
        }, eventData);

        redirect(302, "/dashboard");
    },
    deleteAttachment: async ({ url, request, locals }) => {
        const positionId = url.searchParams.get("posId")?.toString();
        const attachmentId = (await request.formData()).get("attachmentId")?.toString();
        
        if (!positionId || !attachmentId) {
            return fail(400, { error: "Position ID and Attachment ID required" });
        }

        if (!locals.user) {
            redirect(302, "/login");
        }

        // Verify user owns this position
        const host = await prisma.host.findFirst({
            where: { userId: locals.user.id },
            include: { 
                positions: {
                    include: {
                        attachments: true
                    }
                }
            }
        });

        if (!host || !host.positions.find(p => p.id === positionId)) {
            return fail(403, { error: "You don't have permission to delete this attachment" });
        }

        // Get the attachment to delete
        const attachment = await prisma.attachment.findUnique({
            where: { id: attachmentId }
        });

        if (!attachment || attachment.positionId !== positionId) {
            return fail(404, { error: "Attachment not found" });
        }

        // Delete from storage
        try {
            await deleteFile(attachment.storagePath);
        } catch (error) {
            console.error('Error deleting file from storage:', error);
            // Continue to delete from database even if storage deletion fails
        }

        // Delete from database
        await prisma.attachment.delete({
            where: { id: attachmentId }
        });

        // Redirect back to edit page
        redirect(302, `/dashboard/editPosition?posId=${positionId}`);
    }
};