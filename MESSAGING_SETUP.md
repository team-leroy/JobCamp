# Messaging Setup Guide

## Overview

The JobCamp messaging system uses **SendGrid** for email and **Twilio** for SMS. This guide explains how to set up these services for production and staging environments.

## Required Environment Variables

Add these to your `.env` file:

```bash
# SendGrid Configuration (Email)
SENDGRID_API_KEY=your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=admin@jobcamp.org
SENDGRID_FROM_NAME=JobCamp

# Twilio Configuration (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid-here
TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
TWILIO_PHONE_NUMBER=+15551234567

# Environment Flag
IS_PRODUCTION=false  # Set to 'true' in production
```

## SendGrid Setup

### 1. Create SendGrid Account

- Go to https://sendgrid.com/
- Sign up for an account (free tier: 100 emails/day)
- For production, consider paid plan based on volume

### 2. Generate API Key

- Navigate to Settings > API Keys
- Click "Create API Key"
- Name: "JobCamp Production" (or "JobCamp Staging")
- Permissions: **Full Access** (or "Restricted Access" with Mail Send permissions)
- Copy the API key (you'll only see it once!)
- Add to `.env` as `SENDGRID_API_KEY`

### 3. Sender Authentication

#### For Staging (Option A - Single Sender Verification):

1. Go to Settings > Sender Authentication > Single Sender Verification
2. Click "Create New Sender"
3. Use your personal email (e.g., `dleroy@gmail.com`)
4. Verify the email via the link sent to your inbox
5. Set in `.env`:
   ```bash
   SENDGRID_FROM_EMAIL=dleroy@gmail.com
   SENDGRID_FROM_NAME=JobCamp Staging
   ```

#### For Production (Option B - Domain Authentication):

1. Go to Settings > Sender Authentication > Domain Authentication
2. Click "Authenticate Your Domain"
3. Enter `jobcamp.org`
4. Add the provided DNS records to your domain registrar:
   - CNAME records for DKIM
   - TXT records for SPF
5. Wait for verification (can take up to 48 hours)
6. Set in `.env`:
   ```bash
   SENDGRID_FROM_EMAIL=admin@jobcamp.org
   SENDGRID_FROM_NAME=JobCamp
   ```

### 4. Sandbox Mode (Staging)

- When `IS_PRODUCTION=false`, emails are sent in **sandbox mode**
- SendGrid accepts the emails but doesn't actually deliver them
- Perfect for testing without spamming real users
- Check SendGrid Activity Feed to see "sandbox" messages

## Twilio Setup

### 1. Create Twilio Account

- Go to https://www.twilio.com/
- Sign up (free trial includes $15 credit, ~500 SMS messages)
- For production, add billing information

### 2. Get Credentials

- From Twilio Console dashboard:
  - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
  - **Auth Token**: Click "Show" to reveal
- Add to `.env`:
  ```bash
  TWILIO_ACCOUNT_SID=ACxxxxx...
  TWILIO_AUTH_TOKEN=xxxxxxx...
  ```

### 3. Get a Phone Number

- Navigate to Phone Numbers > Manage > Buy a number
- Search for a number with SMS capabilities
- Purchase the number
- Add to `.env`:
  ```bash
  TWILIO_PHONE_NUMBER=+15551234567  # Use E.164 format
  ```

### 4. Verify Phone Numbers (Trial/Staging)

- In trial mode, Twilio only sends to verified phone numbers
- Go to Phone Numbers > Manage > Verified Caller IDs
- Add your personal phone for testing
- For production, upgrade to remove this restriction

### 5. Sandbox Mode (Staging)

- When `IS_PRODUCTION=false`, SMS messages are logged but not actually sent
- This prevents accidentally texting users during development
- Check your terminal/logs to see "sandbox" SMS messages

## Testing

### Staging Environment

1. Set `IS_PRODUCTION=false` in `.env`
2. Use Single Sender Verification for SendGrid
3. All messages will be in sandbox mode
4. Check logs for message previews
5. Check SendGrid Activity Feed for email activity
6. Check Twilio Console > Logs for SMS activity (won't show sandbox messages)

### Production Environment

1. Set `IS_PRODUCTION=true` in `.env`
2. Use Domain Authentication for SendGrid
3. Verify domain ownership via DNS records
4. Ensure Twilio account is upgraded (paid)
5. Messages will be actually delivered

## GCP Deployment

### Environment Variables on GCP

```bash
gcloud run services update jobcamp \
  --set-env-vars SENDGRID_API_KEY=SG.xxx,\
SENDGRID_FROM_EMAIL=admin@jobcamp.org,\
SENDGRID_FROM_NAME=JobCamp,\
TWILIO_ACCOUNT_SID=ACxxx,\
TWILIO_AUTH_TOKEN=xxx,\
TWILIO_PHONE_NUMBER=+15551234567,\
IS_PRODUCTION=true
```

Or use Cloud Secret Manager for sensitive values.

## Cost Estimates

### SendGrid

- **Free Tier**: 100 emails/day (good for testing)
- **Essentials Plan**: $19.95/month for 100K emails
- **Pro Plan**: $89.95/month for 1.5M emails

### Twilio SMS

- **Pay-as-you-go**: ~$0.0079 per SMS (US)
- For 500 students: ~$4 per broadcast
- Monthly cost depends on usage

## Troubleshooting

### Emails Going to Spam

- Ensure domain authentication is complete (production)
- Check SPF, DKIM, DMARC records
- Avoid spam trigger words
- Include unsubscribe link (not currently implemented)

### SMS Not Sending

- Verify phone number format (E.164: +1XXXXXXXXXX)
- Verify student has a phone number on file (all students agree to SMS during signup)
- Ensure Twilio number has SMS capabilities
- Check Twilio account balance

### Sandbox Mode Not Working

- Verify `IS_PRODUCTION=false` in `.env`
- Check console logs for sandbox messages
- Restart dev server after changing `.env`

## Security Notes

- **Never commit** `.env` file to git
- Store API keys in environment variables only
- Use Secret Manager for production
- Rotate API keys periodically
- Monitor SendGrid/Twilio usage dashboards for unusual activity
