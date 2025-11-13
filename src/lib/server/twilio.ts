/**
 * Twilio SMS Service
 * Wrapper for sending SMS messages via Twilio API
 */

import { env } from '$env/dynamic/private';

interface SendSMSOptions {
  to: string; // Phone number in E.164 format (e.g., +14155551234)
  message: string;
}

interface SendSMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Format phone number to E.164 format
 * Assumes US phone numbers if no country code provided
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Otherwise, assume it's already formatted or add + if missing
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Send an SMS via Twilio
 */
export async function sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
  try {
    // Check if we're in sandbox mode - controlled by environment variable
    // Set TWILIO_SANDBOX_MODE=true in staging, TWILIO_SANDBOX_MODE=false in production
    const isSandbox = env.TWILIO_SANDBOX_MODE === 'true';
    
    // Format the phone number
    const toNumber = formatPhoneNumber(options.to);
    
    // In sandbox mode, just log and return success
    if (isSandbox) {
      console.log('📱 [SANDBOX MODE] SMS would be sent to:', toNumber);
      console.log('📱 Message:', options.message);
      return {
        success: true,
        messageSid: `SANDBOX_${Date.now()}`
      };
    }

    // Create the request body (URL-encoded form data for Twilio)
    const formData = new URLSearchParams({
      To: toNumber,
      From: env.TWILIO_PHONE_NUMBER || '',
      Body: options.message
    });

    // Make request to Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID || ''}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${env.TWILIO_ACCOUNT_SID || ''}:${env.TWILIO_AUTH_TOKEN || ''}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Twilio API error:', error);
      return {
        success: false,
        error: `Twilio error: ${error.message || response.status}`
      };
    }

    const result = await response.json();
    
    return {
      success: true,
      messageSid: result.sid
    };
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send bulk SMS messages via Twilio
 * Note: Twilio charges per message, so this sends individual messages
 */
export async function sendBulkSMS(recipients: string[], message: string): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const phone of recipients) {
    const result = await sendSMS({ to: phone, message });
    
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${phone}: ${result.error}`);
    }
  }

  // Consider overall success if more than 50% sent successfully
  results.success = results.sent > results.failed;

  return results;
}

/**
 * Validate if a phone number can receive SMS
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // Valid if it's 10 digits (US) or 11 digits starting with 1
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

