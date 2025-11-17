import type { Host, School, Student } from '@prisma/client';
import { TimeSpan } from 'lucia';
import { alphabet } from 'oslo/crypto';

export const userIdEntropySize = 10;
export const passwordSaltCharacters = alphabet("a-z", "A-Z", "0-9", "-", "_");
export const passwordResetTokenEntropySize = 25;

export const emailVerificationCodeLength = 6;
export const emailVerificationCodeCharacters = alphabet("0-9", "A-Z");

export const permissionSlipCodeLength = 10;
export const permissionSlipCodeCharacters = alphabet("0-9", "A-Z");

export const sessionLifetime = new TimeSpan(2, "d");

export enum AuthError {
	IncorrectCredentials,
	AccountExists,
};

export interface DatabaseUserAttributes {
	email: string;
	emailVerified: boolean;
    student: Student | null;
    host: Host | null;
	adminOfSchools: School[];
    school: School | null;
    lastLogin: Date;
}