# Auto-Capture Payment Setup Instructions

## Overview
Payment for tutoring sessions is now **held** until the lesson is completed. This prevents fraud and ensures students only pay for completed lessons.

## How it works

### 1. Payment Authorization
When a student pays for a lesson:
- Payment is **authorized** (money reserved on card)
- Money is **NOT immediately transferred** to instructor
- Status: `paid: true, payment_captured: false`

### 2. Lesson Completion
After the lesson end time + 1 hour grace period:
- Payment is automatically **captured**
- Money is transferred to instructor's Stripe Connect account
- Status: `paid: true, payment_captured: true, status: completed`

### 3. Automatic Capture Job
A cron job runs every hour to capture payments for completed lessons.

## Setup Cron Job in Supabase Dashboard

### Step 1: Enable pg_cron Extension

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Database** → **Extensions**
3. Search for **pg_cron** and click **Enable**

OR run this SQL in **SQL Editor**:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Step 2: Create Cron Job

1. Navigate to **Database** → **SQL Editor**
2. Create new cron job:

```sql
-- Run every hour to capture completed lesson payments
SELECT cron.schedule(
  'auto-capture-booking-payments',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://xjnffvqtqxnqobqezouv.supabase.co/functions/v1/auto-capture-payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Step 3: Verify Cron Job

```sql
SELECT * FROM cron.job WHERE jobname = 'auto-capture-booking-payments';
```

This should return one row with the job details.

## Manual Capture (if needed)

If you need to manually capture a payment, call the edge function:

```bash
curl -X POST \
  https://xjnffvqtqxnqobqezouv.supabase.co/functions/v1/capture-booking-payment \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": "UUID_HERE"}'
```

## Database Schema

### tutor_bookings columns:
- `paid` (boolean): Student has completed checkout
- `stripe_payment_intent_id` (text): Stripe payment intent ID
- `payment_captured` (boolean): Payment has been captured and released to instructor
- `status` (text): `pending`, `confirmed`, `completed`, `cancelled`

### Payment Flow States:
1. **Reserved**: `paid: false, payment_captured: false`
2. **Authorized**: `paid: true, payment_captured: false` (money held)
3. **Completed**: `paid: true, payment_captured: true` (money transferred)

## Refunds

If a lesson needs to be cancelled before capture, the authorized payment can be cancelled:
- Call `stripe.paymentIntents.cancel()` on the connected account
- Student receives full refund
- Instructor receives nothing

## Testing

Test the auto-capture function manually:
```bash
curl -X POST \
  https://xjnffvqtqxnqobqezouv.supabase.co/functions/v1/auto-capture-payments \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Check logs in Supabase Dashboard → Functions → auto-capture-payments → Logs
