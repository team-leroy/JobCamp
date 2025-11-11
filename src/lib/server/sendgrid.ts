/**
 * SendGrid Email Service
 * Wrapper for sending emails via SendGrid API
 */

import { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME } from '$env/static/private';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via SendGrid
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    // Check if we're in sandbox mode (staging/dev) - use Vite's built-in production detection
    const isSandbox = !import.meta.env.PROD;
    
    const payload = {
      personalizations: [
        {
          to: options.to.map(r => ({ 
            email: r.email, 
            name: r.name 
          })),
          subject: options.subject
        }
      ],
      from: {
        email: SENDGRID_FROM_EMAIL || 'admin@jobcamp.org',
        name: SENDGRID_FROM_NAME || 'JobCamp'
      },
      content: [
        {
          type: 'text/html',
          value: options.html
        }
      ],
      mail_settings: isSandbox ? {
        sandbox_mode: {
          enable: true
        }
      } : undefined
    };

    // If plain text version provided, add it
    if (options.text) {
      payload.content.unshift({
        type: 'text/plain',
        value: options.text
      });
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid API error:', error);
      return {
        success: false,
        error: `SendGrid error: ${response.status} ${error}`
      };
    }

    // Get message ID from response headers
    const messageId = response.headers.get('X-Message-Id');

    if (isSandbox) {
      console.log('📧 [SANDBOX MODE] Email would be sent to:', options.to.map(r => r.email).join(', '));
      console.log('📧 Subject:', options.subject);
    }

    return {
      success: true,
      messageId: messageId || undefined
    };
  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send bulk emails via SendGrid (handles batching for large recipient lists)
 * SendGrid allows up to 1000 recipients per request
 */
export async function sendBulkEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const BATCH_SIZE = 1000;
  const batches: EmailRecipient[][] = [];
  
  // Split recipients into batches
  for (let i = 0; i < options.to.length; i += BATCH_SIZE) {
    batches.push(options.to.slice(i, i + BATCH_SIZE));
  }

  const results: SendEmailResult[] = [];
  
  for (const batch of batches) {
    const result = await sendEmail({
      ...options,
      to: batch
    });
    results.push(result);
    
    // If any batch fails, stop and return error
    if (!result.success) {
      return {
        success: false,
        error: `Failed after ${results.filter(r => r.success).length} of ${batches.length} batches: ${result.error}`
      };
    }
  }

  return {
    success: true,
    messageId: results.map(r => r.messageId).filter(Boolean).join(',')
  };
}

