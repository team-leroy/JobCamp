import { Lucia, generateIdFromEntropySize } from 'lucia';
import { dev } from '$app/environment';
import { luciaAuthDb, prisma } from './prisma.js';
import type { RequestEvent } from '@sveltejs/kit';
import { encodeHex } from 'oslo/encoding';
import { generateRandomString, sha256 } from 'oslo/crypto';
import { TimeSpan as osloTimeSpan, createDate } from 'oslo';
import { 
	passwordResetTokenEntropySize,
	emailVerificationCodeLength, 
	emailVerificationCodeCharacters, 
	AuthError, 
	sessionLifetime, 
	type DatabaseUserAttributes, 
	passwordSaltCharacters,
	permissionSlipCodeLength,
	permissionSlipCodeCharacters
} from './authConstants.js';
import { scrypt } from './hash.js';

export async function createPasswordResetToken(userId: string): Promise<string> {
	await prisma.passwordResetTokens.deleteMany({ where: { user_id: userId } });
	
	const tokenId = generateIdFromEntropySize(passwordResetTokenEntropySize);
	const tokenHash = encodeHex(await sha256(new TextEncoder().encode(tokenId)));

	await prisma.passwordResetTokens.create({
		data: {
			token_hash: tokenHash,
			user_id: userId,
			expires_at: createDate(new osloTimeSpan(2, "h"))
		}
	});

	return tokenId;
}

export async function generateEmailVerificationCode(userId: string, email: string): Promise<string> {
	await prisma.emailVerificationCodes.deleteMany({ where: { user_id: userId } });

	const code = generateRandomString(emailVerificationCodeLength, emailVerificationCodeCharacters);

	await prisma.emailVerificationCodes.create({
		data: {
			user_id: userId,
			email,
			code,
			expires_at: createDate(new osloTimeSpan(15, "m")) // 15 minutes
		}
	});

	return code;
}

export async function generatePermissionSlipCode(userId: string): Promise<string> {
	await prisma.permissionSlipCode.deleteMany({ where: { user_id: userId } });

	const code = generateRandomString(permissionSlipCodeLength, permissionSlipCodeCharacters);

	await prisma.permissionSlipCode.create({
		data: {
			user_id: userId,
			code,
		}
	});

	return code;
}

export async function setNewLuciaSession(userId: string, event: RequestEvent) {
	const session = await lucia.createSession(userId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	event.cookies.set(sessionCookie.name, sessionCookie.value, {
		path: ".",
		...sessionCookie.attributes,
	});
}

export async function updateLastLoginToNow(userId: string) {
	await prisma.user.update({
		where: {
			id: userId
		}, 
		data: {
			lastLogin: new Date()
		}
	})
}

export async function login(email: string, password: string, event: RequestEvent): Promise<AuthError.IncorrectCredentials | string> {
	const existingUser = await prisma.user.findFirst({ where: { email } });
	if (!existingUser) {
		return AuthError.IncorrectCredentials;
	}

	const validPassword = await scrypt.verify(password, existingUser.passwordSalt, existingUser.passwordHash);
	if (!validPassword) { 
		return AuthError.IncorrectCredentials;
	}

	await updateLastLoginToNow(existingUser.id);

	await setNewLuciaSession(existingUser.id, event);

	return existingUser.id;
}

export async function signup(email: string, password: string, event: RequestEvent): Promise<AuthError.AccountExists | string> {
	const existingUser = await prisma.user.findFirst({ where: { email } });
	if (existingUser) {
		return AuthError.AccountExists;
	}

	const passwordSalt = generateRandomString(16, passwordSaltCharacters); // 128bit salt
	const passwordHash = await scrypt.hash(password, passwordSalt);

	const user = await prisma.user.create({
		data: {
			email,
			passwordSalt,
			passwordHash,
			lastLogin: new Date(),
		}
	});

	await setNewLuciaSession(user.id, event);

	return user.id;
}

export const lucia = new Lucia(luciaAuthDb, {
    sessionExpiresIn: sessionLifetime,
    sessionCookie: {
        attributes: {
			// set to `true` when using HTTPS
            secure: !dev && process.env.NODE_ENV === 'production'
        }
    },
    getUserAttributes: (attributes: DatabaseUserAttributes) => {
		return {
			// attributes has the type of DatabaseUserAttributes
			email: attributes.email,
			emailVerified: attributes.emailVerified,
            student: attributes.student,
            host: attributes.host,
			adminOfSchools: attributes.adminOfSchools,
            school: attributes.school,
            lastLogin: attributes.lastLogin,
		};
	}
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

export const isMobilePhone = new RegExp(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/);

export const schoolEmailCheck = (schoolEmailDomain: string) => {
    return new RegExp('[A-Za-z0-9._%+-]+'+schoolEmailDomain);
}

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
	const passwordSalt = generateRandomString(16, passwordSaltCharacters);
	const passwordHash = await scrypt.hash(password, passwordSalt);
	return { hash: passwordHash, salt: passwordSalt };
}

/**
 * Verify a password against stored hash and salt
 */
export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
	return await scrypt.verify(password, salt, hash);
}