/**
 * Stripe Webhook Handler for Vercel Serverless Functions
 * 
 * This endpoint handles Stripe webhook events securely:
 * - Verifies webhook signature to prevent tampering
 * - Updates user PRO status in Supabase
 * - Handles subscription lifecycle events
 * 
 * Required Environment Variables (Vercel Server):
 * - STRIPE_SECRET_KEY: Stripe secret key
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (bypasses RLS)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Stripe imports
const stripe = require('stripe');

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

interface CheckoutSession {
  id: string;
  customer: string;
  subscription: string;
  amount_total?: number;
  payment_intent?: string;
  metadata: {
    userId?: string;
    note_id?: string;
    user_id?: string;
    // Dodaj še ostala polja, če jih uporabljaš
  };
}

interface Subscription {
  id: string;
  customer: string;
  status: string;
  trial_end: number | null;
  current_period_end: number;
  metadata: {
    userId?: string;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get environment variables
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Validate environment variables
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Initialize Stripe
  const stripeClient = stripe(stripeSecretKey, {
    apiVersion: '2025-08-27',
  });

  // Get raw body for signature verification
  const sig = req.headers['stripe-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  let event: StripeEvent;

  try {
    // Verify webhook signature
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    ) as StripeEvent;
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log('Received Stripe event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as CheckoutSession;
        // Nakup zapiska (note purchase)
        if (session.metadata?.note_id && session.metadata?.user_id) {
          // Zapiši nakup v note_purchases
          const purchaseData = {
            buyer_id: session.metadata.user_id,
            note_id: session.metadata.note_id,
            purchased_at: new Date().toISOString(),
            price: session.amount_total ? session.amount_total / 100 : null,
            stripe_payment_intent_id: session.payment_intent || null,
          };
          const response = await fetch(
            `${supabaseUrl}/rest/v1/note_purchases`,
            {
              method: 'POST',
              headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify(purchaseData),
            }
          );
          if (!response.ok) {
            const error = await response.text();
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: 'Database insert failed' });
          }
          console.log('Note purchase zapisano za user:', session.metadata.user_id, 'note:', session.metadata.note_id);
          break;
        }
        // PRO naročnina (subscription)
        if (!session.metadata?.userId) {
          console.error('No userId in session metadata');
          return res.status(400).json({ error: 'Missing userId' });
        }

        const userId = session.metadata.userId;

        // Get subscription details
        const subscription = await stripeClient.subscriptions.retrieve(
          session.subscription
        ) as Subscription;

        const subscriptionStatus = subscription.status;
        const trialEnd = subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;
        const currentPeriodEnd = new Date(
          subscription.current_period_end * 1000
        ).toISOString();

        // Update profile using Supabase REST API (bypasses RLS with service role key)
        const updateData: any = {
          is_pro: true,
          subscription_status: subscriptionStatus,
          pro_since: new Date().toISOString(),
          stripe_subscription_id: subscription.id,
          stripe_customer_id: session.customer,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: false,
        };

        // Set trial fields if applicable
        if (subscriptionStatus === 'trialing' && trialEnd) {
          updateData.trial_used = true;
          updateData.trial_ends_at = trialEnd;
        }

        const response = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error('Supabase update error:', error);
          return res.status(500).json({ error: 'Database update failed' });
        }

        const updatedProfile = await response.json();
        const userName = updatedProfile[0]?.full_name || 'Študent';

        console.log('PRO status activated for user:', userId);

        // Send welcome email
        try {
          const { sendEmail } = await import('./lib/emails/resend-client.js');
          const { welcomeToProTemplate } = await import('./lib/emails/templates.js');

          const emailHtml = welcomeToProTemplate(userName).replace('{{email}}', updatedProfile[0]?.email || '');
          
          await sendEmail({
            to: updatedProfile[0]?.email || '',
            subject: 'Dobrodošel v Študko PRO! 🚀',
            html: emailHtml,
            from: 'Študko <info@studko.si>',
          });

          console.log('Welcome email sent to:', updatedProfile[0]?.email);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail the webhook if email fails
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Subscription;
        
        // Get user ID from Supabase using customer ID
        const getResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?stripe_customer_id=eq.${subscription.customer}&select=id`,
          {
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
          }
        );

        if (!getResponse.ok) {
          console.error('Failed to fetch user profile');
          return res.status(500).json({ error: 'User lookup failed' });
        }

        const users = await getResponse.json();
        
        if (!users || users.length === 0) {
          console.error('User not found for customer:', subscription.customer);
          return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;
        const subscriptionStatus = subscription.status;
        const currentPeriodEnd = new Date(
          subscription.current_period_end * 1000
        ).toISOString();

        // Update subscription status
        const updateData: any = {
          subscription_status: subscriptionStatus,
          is_pro: subscriptionStatus === 'active' || subscriptionStatus === 'trialing',
          current_period_end: currentPeriodEnd,
        };

        // Update trial_ends_at if subscription is trialing
        if (subscriptionStatus === 'trialing' && subscription.trial_end) {
          updateData.trial_ends_at = new Date(
            subscription.trial_end * 1000
          ).toISOString();
        }

        const patchResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!patchResponse.ok) {
          const error = await patchResponse.text();
          console.error('Supabase update error:', error);
          return res.status(500).json({ error: 'Database update failed' });
        }

        console.log('Subscription updated for user:', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Subscription;
        
        // Get user ID from Supabase
        const getResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?stripe_customer_id=eq.${subscription.customer}&select=id`,
          {
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
          }
        );

        if (!getResponse.ok) {
          console.error('Failed to fetch user profile');
          return res.status(500).json({ error: 'User lookup failed' });
        }

        const users = await getResponse.json();
        
        if (!users || users.length === 0) {
          console.error('User not found for customer:', subscription.customer);
          return res.status(404).json({ error: 'User not found' });
        }

        const userId = users[0].id;

        // Revoke PRO status
        const updateData = {
          is_pro: false,
          subscription_status: 'canceled',
          cancel_at_period_end: false,
        };

        const patchResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!patchResponse.ok) {
          const error = await patchResponse.text();
          console.error('Supabase update error:', error);
          return res.status(500).json({ error: 'Database update failed' });
        }

        console.log('PRO status revoked for user:', userId);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    // Return success response to Stripe
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
