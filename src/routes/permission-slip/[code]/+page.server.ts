import { fail, superValidate } from 'sveltekit-superforms';
import type { Actions, PageServerLoad } from './$types';
import { createPermissionSlipSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import { createPermissionSlipForEvent } from '$lib/server/permissionSlips';

export const load: PageServerLoad = async (event) => {
    const code = event.params.code;
    
    const permissionSlip = await prisma.permissionSlipCode.findFirst({
        where: { code: code }
    });
    if (!permissionSlip) {
        console.log("Test");
        redirect(302, "/permission-slip/error");
    }

    const student = await prisma.student.findFirst({
        where: { userId: permissionSlip.user_id }
    });
    if (!student) {
        console.log("Tes2t");
        redirect(302, "/permission-slip/error");
    }

    const form = await superValidate(zod(createPermissionSlipSchema(student.firstName, student.lastName)));
    return { form, firstName: student.firstName, lastName: student.lastName };
};

export const actions: Actions = {
    default: async (event) => {
        const { request } = event;
        const form = await superValidate(request, zod(createPermissionSlipSchema("", "")));
  
        if (!form.valid) {
            form.message = "error";
            return fail(400, { form });
        }

        const permissionSlipCode = await prisma.permissionSlipCode.findFirst({
            where: {code: event.params.code}
        });
        if (!permissionSlipCode) {
            return fail(400); // TODO: handle fail with message
        }

        const userId = permissionSlipCode.user_id;

        // Get the student
        const student = await prisma.student.findFirst({
            where: { userId },
            include: { school: true }
        });
        if (!student || !student.school) {
            return fail(400, { message: "Student or school not found" });
        }

        // Get the active event for the student's school
        const activeEvent = await prisma.event.findFirst({
            where: {
                schoolId: student.schoolId!,
                isActive: true
            }
        });
        if (!activeEvent) {
            return fail(400, { message: "No active event found for this school" });
        }

        // Create the event-specific permission slip
        await createPermissionSlipForEvent(student.id, activeEvent.id, {
            parentName: form.data.parentName,
            phoneNumber: form.data.phoneNumber,
            studentFirstName: form.data.studentFirstName,
            studentLastName: form.data.studentLastName,
            physicalRestrictions: form.data.physicalRestrictions,
            dietaryRestrictions: form.data.dietaryRestrictions,
            liability: form.data.liability,
            liabilityDate: form.data.liabilityDate
        });

        // Clean up the permission slip code
        await prisma.permissionSlipCode.deleteMany({
            where: {code: event.params.code}
        });
        
        redirect(302, "/permission-slip/sucess");
    }
}