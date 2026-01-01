import { z } from "zod"

interface PositionProperties {
    id: string;
    title: string;
    career: string;
    slots: number;
    summary: string;
    contact_name: string;
    contact_email: string;
    address: string;
    instructions: string;
    attire: string;
    arrival: string;
    start: string;
    end: string;
}

export const editPositionSchema = (positionProperties: PositionProperties) => {
    return z.object({
        positionId: z.string().default(positionProperties.id),
        title: z.string().default(positionProperties.title),
        career: z.string().default(positionProperties.career),
        slots: z.coerce.number({message: "Expected a number"}).min(1, "Minimum of 1 slot").default(positionProperties.slots),
        summary: z.string().default(positionProperties.summary),
        fullName: z.string().default(positionProperties.contact_name),
        email: z.string().default(positionProperties.contact_email),
        address: z.string().default(positionProperties.address),
        instructions: z.string().default(positionProperties.instructions),
        attire: z.string().default(positionProperties.attire),
        arrival: z.string().default(positionProperties.arrival),
        start: z.string().default(positionProperties.start),
        release: z.string().default(positionProperties.end),
        attachment1: z.any().optional(),
        attachment2: z.any().optional(),
    });
}