import { z } from "zod";

const phonePattern =
	/^(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}$/;

const normalizeDomain = (domain: string) => {
	const trimmed = domain.trim().toLowerCase();
	if (!trimmed) return "";
	return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
};

export const createContactInfoSchema = (schoolEmailDomain?: string) => {
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
		parentEmail: parentEmailSchema,
		phone: z
			.string()
			.refine(
				(value) => phonePattern.test(value),
				"Please enter a valid phone number in format (XXX) XXX-XXXX."
			),
	});
};



