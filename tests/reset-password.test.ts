import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';

// Mock Prisma with passwordResetTokens so verifyPasswordResetToken and submit can run.
// auth.ts imports luciaAuthDb from prisma, so we must export it.
vi.mock('../src/lib/server/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn()
		},
		passwordResetTokens: {
			findUnique: vi.fn(),
			deleteMany: vi.fn()
		}
	},
	luciaAuthDb: {}
}));

// Mock redirect so we can assert without throwing
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn()
}));

// Mock hash (scrypt) and auth.login for submit action tests
vi.mock('../src/lib/server/hash', () => ({
	scrypt: {
		hash: vi.fn().mockResolvedValue('mock-hash'),
		verify: vi.fn().mockResolvedValue(true)
	}
}));

vi.mock('../src/lib/server/auth', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../src/lib/server/auth')>();
	return {
		...actual,
		login: vi.fn().mockResolvedValue('user-1'),
		verifyPasswordResetToken: actual.verifyPasswordResetToken
	};
});

import { prisma } from '../src/lib/server/prisma';
import { verifyPasswordResetToken } from '../src/lib/server/auth';
import { actions } from '../src/routes/reset-password/+page.server';

describe('verifyPasswordResetToken', () => {
	const userId = 'user-abc';
	const rawToken = 'test-token-xyz';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns false when rawToken is empty or whitespace', async () => {
		expect(await verifyPasswordResetToken(userId, '')).toBe(false);
		expect(await verifyPasswordResetToken(userId, '   ')).toBe(false);
		expect(prisma.passwordResetTokens.findUnique).not.toHaveBeenCalled();
	});

	it('returns false when no token row exists for user', async () => {
		vi.mocked(prisma.passwordResetTokens.findUnique).mockResolvedValue(null);
		expect(await verifyPasswordResetToken(userId, rawToken)).toBe(false);
		expect(prisma.passwordResetTokens.findUnique).toHaveBeenCalledWith({
			where: { user_id: userId }
		});
	});

	it('returns false when token hash does not match', async () => {
		const wrongHash = 'wrong-hash';
		vi.mocked(prisma.passwordResetTokens.findUnique).mockResolvedValue({
			id: 'tid',
			user_id: userId,
			token_hash: wrongHash,
			expires_at: new Date(Date.now() + 60 * 60 * 1000)
		});
		expect(await verifyPasswordResetToken(userId, rawToken)).toBe(false);
	});

	it('returns false when token is expired', async () => {
		const tokenHash = encodeHex(await sha256(new TextEncoder().encode(rawToken)));
		vi.mocked(prisma.passwordResetTokens.findUnique).mockResolvedValue({
			id: 'tid',
			user_id: userId,
			token_hash: tokenHash,
			expires_at: new Date(Date.now() - 1000)
		});
		expect(await verifyPasswordResetToken(userId, rawToken)).toBe(false);
	});

	it('returns true when token exists, matches, and is not expired', async () => {
		const tokenHash = encodeHex(await sha256(new TextEncoder().encode(rawToken)));
		vi.mocked(prisma.passwordResetTokens.findUnique).mockResolvedValue({
			id: 'tid',
			user_id: userId,
			token_hash: tokenHash,
			expires_at: new Date(Date.now() + 60 * 60 * 1000)
		});
		expect(await verifyPasswordResetToken(userId, rawToken)).toBe(true);
	});
});

describe('reset-password submit action', () => {
	const code = 'valid-code';
	const userId = 'user-123';
	const password = 'newpassword8';

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			id: userId,
			email: 'user@example.com',
			passwordSalt: 'old-salt',
			passwordHash: 'old-hash',
			emailVerified: true
		} as never);
		vi.mocked(prisma.user.update).mockResolvedValue({} as never);
		vi.mocked(prisma.passwordResetTokens.deleteMany).mockResolvedValue({ count: 1 } as never);
	});

	function formData(overrides: { code?: string; uid?: string; password?: string } = {}) {
		const form = new FormData();
		form.set('code', overrides.code ?? code);
		form.set('uid', overrides.uid ?? userId);
		form.set('password', overrides.password ?? password);
		return form;
	}

	it('returns error when code is missing', async () => {
		const form = formData({ code: '' });
		const request = new Request('http://test/reset-password', { method: 'POST', body: form });
		const result = await actions.submit({ request, locals: {} } as never);
		expect(result).toEqual({
			waiting: 2,
			msg: 'Incorrect Link. Please contact support at admin@jobcamp.org.',
			code: '',
			userId: ''
		});
	});

	it('returns error when password is too short', async () => {
		const form = formData({ password: 'short' });
		const request = new Request('http://test/reset-password', { method: 'POST', body: form });
		const result = await actions.submit({ request, locals: {} } as never);
		expect(result).toEqual({
			waiting: 2,
			msg: 'Password must be at least 8 characters',
			code,
			userId
		});
	});

	it('returns invalid link message when token is invalid (verifyPasswordResetToken false)', async () => {
		// verifyPasswordResetToken is real in our mock; make it return false by having no matching token
		vi.mocked(prisma.passwordResetTokens.findUnique).mockResolvedValue(null);
		const form = formData();
		const request = new Request('http://test/reset-password', { method: 'POST', body: form });
		const result = await actions.submit({ request, locals: {} } as never);
		expect(result).toEqual({
			waiting: 2,
			msg: 'Invalid or expired reset link. Please request a new password reset.',
			code: '',
			userId: ''
		});
	});

	it('returns invalid link message when user not found', async () => {
		const tokenHash = encodeHex(await sha256(new TextEncoder().encode(code)));
		vi.mocked(prisma.passwordResetTokens.findUnique).mockResolvedValue({
			id: 'tid',
			user_id: userId,
			token_hash: tokenHash,
			expires_at: new Date(Date.now() + 3600000)
		});
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
		const form = formData();
		const request = new Request('http://test/reset-password', { method: 'POST', body: form });
		const result = await actions.submit({ request, locals: {} } as never);
		expect(result).toEqual({
			waiting: 2,
			msg: 'Invalid or expired reset link. Please request a new password reset.',
			code: '',
			userId: ''
		});
	});

	it('returns friendly message on unexpected error (e.g. DB throw)', async () => {
		const tokenHash = encodeHex(await sha256(new TextEncoder().encode(code)));
		vi.mocked(prisma.passwordResetTokens.findUnique).mockResolvedValue({
			id: 'tid',
			user_id: userId,
			token_hash: tokenHash,
			expires_at: new Date(Date.now() + 3600000)
		});
		vi.mocked(prisma.user.update).mockRejectedValue(new Error('Database error'));
		const form = formData();
		const request = new Request('http://test/reset-password', { method: 'POST', body: form });
		const result = await actions.submit({ request, locals: {} } as never);
		expect(result).toEqual({
			waiting: 2,
			msg: 'Something went wrong. Please try again or request a new reset link.',
			code,
			userId
		});
	});

	it('on valid token and user: updates password, deletes token, calls login, and redirects', async () => {
		const tokenHash = encodeHex(await sha256(new TextEncoder().encode(code)));
		vi.mocked(prisma.passwordResetTokens.findUnique).mockResolvedValue({
			id: 'tid',
			user_id: userId,
			token_hash: tokenHash,
			expires_at: new Date(Date.now() + 3600000)
		});
		const form = formData();
		const request = new Request('http://test/reset-password', { method: 'POST', body: form });
		await actions.submit({ request, locals: {} } as never);
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: userId },
			data: expect.objectContaining({
				passwordSalt: expect.any(String),
				passwordHash: 'mock-hash'
			})
		});
		expect(prisma.passwordResetTokens.deleteMany).toHaveBeenCalledWith({
			where: { user_id: userId }
		});
		expect(redirect).toHaveBeenCalledWith(302, '/dashboard');
	});
});
