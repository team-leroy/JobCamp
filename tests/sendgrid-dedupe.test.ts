import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		SENDGRID_API_KEY: 'test-api-key',
		SENDGRID_FROM_EMAIL: 'noreply@jobcamp.org',
		SENDGRID_FROM_NAME: 'JobCamp',
		SENDGRID_SANDBOX_MODE: 'true'
	}
}));

describe('sendBulkEmail', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('deduplicates recipients by email address before calling SendGrid', async () => {
		interface SendGridPayload {
			personalizations: Array<{
				to: Array<{ email: string; name?: string }>;
				subject: string;
			}>;
		}

		const bodies: SendGridPayload[] = [];

		const fetchMock = vi.fn(async (_url, init) => {
			if (init?.body) {
				const parsed = JSON.parse(init.body.toString()) as SendGridPayload;
				bodies.push(parsed);
			}

			return {
				ok: true,
				headers: {
					get: () => 'test-message-id'
				}
			} as unknown as Response;
		});

		vi.stubGlobal('fetch', fetchMock);

		const { sendBulkEmail } = await import('$lib/server/sendgrid');

		const result = await sendBulkEmail({
			to: [
				{ email: 'student@example.com', name: 'Student' },
				{ email: 'parent@example.com', name: 'Parent One' },
				{ email: 'Parent@example.com', name: 'Parent Duplicate' }
			],
			subject: 'Test Subject',
			html: '<p>Test</p>'
		});

		expect(result.success).toBe(true);
		expect(result.messageId).toBe('test-message-id');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const payload = bodies[0];
		expect(payload.personalizations[0].to).toHaveLength(2);
		expect(payload.personalizations[0].to).toEqual([
			{ email: 'student@example.com', name: 'Student' },
			{ email: 'parent@example.com', name: 'Parent One' }
		]);
	});
});

