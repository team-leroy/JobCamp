import { z } from "zod";

const phonePattern =
	/^(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}$/;

const normalizeDomain = (domain: string) => {
	const trimmed = domain.trim().toLowerCase();
	if (!trimmed) return "";
	return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
};

export const createStudentSchema = (schoolEmailDomain?: string) => {
	const normalizedDomain = schoolEmailDomain ? normalizeDomain(schoolEmailDomain) : "";

	let parentEmailSchema = z
		.string()
		.email("Please enter a valid email.");

	if (normalizedDomain) {
		parentEmailSchema = parentEmailSchema.refine(
			(value) => !value.toLowerCase().trim().endsWith(normalizedDomain),
			`Parent email cannot use school email domain (${normalizedDomain}). Please provide a different email.`
		);
	}

	return z.object({
		grade: z
			.string()
			.refine(
				(value) => ["9", "10", "11", "12"].includes(value),
				{ message: "Please select a grade between 9-12." }
			),
		firstName: z.string().min(2, "First name must contain at least 2 characters."),
		lastName: z.string().min(2, "Last name must contain at least 2 characters."),
		parentEmail: parentEmailSchema,
		phone: z
			.string()
			.refine(
				(value) => phonePattern.test(value),
				"Please enter a valid phone number in format (XXX) XXX-XXXX."
			),
		allowPhoneMessaging: z.literal(true, {
			errorMap: () => ({ message: "You must allow SMS messaging." })
		}),
		email: z.string().email("Please enter a valid school email."),
		password: z.string().min(8, "Password must be at least 8 characters long.")
	});
};