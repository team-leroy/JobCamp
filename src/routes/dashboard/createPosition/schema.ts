import { z } from "zod"

export const createNewPositionSchema = (name: string, email: string) => {
    return z.object({
        title: z.string().min(1, "Required field"),
        career: z.string().min(1, "Required field"),
        slots: z.number({message: "Expected a number"}).min(1, "Minimum of 1 slot").default(1),
        summary: z.string().min(1, "Required field").max(1024, "Exceeded Max Length"),
        fullName: z.string().min(1, "Required field").default(name),
        email: z.string().min(1, "Required field").default(email),
        address: z.string().min(1, "Required field").max(1024, "Exceeded Max Length"),
        instructions: z.string().max(1024, "Exceeded Max Length"),
        attire: z.string().max(1024, "Exceeded Max Length"),
        arrival: z.string().min(1, "Required field"),
        start: z.string().min(1, "Required field"),
        release: z.string().min(1, "Required field"),
        attachment1: z.any().optional(),
        attachment2: z.any().optional(),
    });
}