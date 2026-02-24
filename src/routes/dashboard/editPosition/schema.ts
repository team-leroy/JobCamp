import { z } from "zod";

// Match Position table limits (Prisma schema)
const MAX_SUMMARY = 2048;
const MAX_ADDRESS = 2048;
const MAX_INSTRUCTIONS = 2048;
const MAX_ATTIRE = 2048;
const MAX_TITLE = 512;
const MAX_CAREER = 512;
const MAX_CONTACT_NAME = 256;
const MAX_EMAIL = 255;
const MAX_TIME = 64;
const SLOTS_MAX = 1000;

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
		title: z
			.string()
			.min(1, "Title is required")
			.max(MAX_TITLE, `Title must be ${MAX_TITLE} characters or less`)
			.default(positionProperties.title),
		career: z
			.string()
			.min(1, "Career is required")
			.max(MAX_CAREER, `Career must be ${MAX_CAREER} characters or less`)
			.default(positionProperties.career),
		slots: z.coerce
			.number({ message: "Slots must be a number" })
			.min(1, "Minimum of 1 slot")
			.max(SLOTS_MAX, `Maximum of ${SLOTS_MAX} slots`)
			.default(positionProperties.slots),
		summary: z
			.string()
			.min(1, "Summary is required")
			.max(MAX_SUMMARY, `Summary must be ${MAX_SUMMARY} characters or less`)
			.default(positionProperties.summary),
		fullName: z
			.string()
			.min(1, "Contact name is required")
			.max(MAX_CONTACT_NAME, `Contact name must be ${MAX_CONTACT_NAME} characters or less`)
			.default(positionProperties.contact_name),
		email: z
			.string()
			.min(1, "Contact email is required")
			.max(MAX_EMAIL, `Email must be ${MAX_EMAIL} characters or less`)
			.email("Enter a valid email address")
			.default(positionProperties.contact_email),
		address: z
			.string()
			.min(1, "Address is required")
			.max(MAX_ADDRESS, `Address must be ${MAX_ADDRESS} characters or less`)
			.default(positionProperties.address),
		instructions: z
			.string()
			.max(MAX_INSTRUCTIONS, `Instructions must be ${MAX_INSTRUCTIONS} characters or less`)
			.default(positionProperties.instructions),
		attire: z
			.string()
			.max(MAX_ATTIRE, `Attire must be ${MAX_ATTIRE} characters or less`)
			.default(positionProperties.attire),
		arrival: z
			.string()
			.min(1, "Arrival time is required")
			.max(MAX_TIME, `Arrival time must be ${MAX_TIME} characters or less`)
			.default(positionProperties.arrival),
		start: z
			.string()
			.min(1, "Start time is required")
			.max(MAX_TIME, `Start time must be ${MAX_TIME} characters or less`)
			.default(positionProperties.start),
		release: z
			.string()
			.min(1, "End time is required")
			.max(MAX_TIME, `End time must be ${MAX_TIME} characters or less`)
			.default(positionProperties.end),
		attachment1: z.any().optional(),
		attachment2: z.any().optional()
	});
};
