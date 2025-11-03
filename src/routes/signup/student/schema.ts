import { z } from "zod"

import { isMobilePhone } from "$lib/server/auth";

export const createStudentSchema = () => {
    return z.object({
        graduatingClassYear: z.number().int().min(2025).max(2035),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        parentEmail: z.string().email("Please enter a valid email."),
        phone: z.string().refine((arg) => isMobilePhone.test(arg), "Please enter a valid phone number."),
        allowPhoneMessaging: z.literal(true, { errorMap: () => ({ message: "You must allow SMS messaging." })}),
        email: z.string().email("Please enter a valid email."),
        password: z.string().min(8, "Password must be at least 8 characters long."),
    });
}