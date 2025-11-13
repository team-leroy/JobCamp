import { z } from "zod";

const phonePattern =
	/^(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}$/;

export const createStudentSchema = () => {
	return z.object({
		grade: z
			.string()
			.refine(
				(value) => ["9", "10", "11", "12"].includes(value),
				{ message: "Please select a grade between 9-12." }
			),
		firstName: z.string().min(2, "First name must contain at least 2 characters."),
		lastName: z.string().min(2, "Last name must contain at least 2 characters."),
		parentEmail: z.string().email("Please enter a valid email."),
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