/**
 * Client-side Email Helper
 * Use these functions in your React components to send emails
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Send a notification email to user(s)
 * 
 * @example
 * await sendNotification({
 *   to: 'user@example.com',
 *   title: 'Novo sporočilo',
 *   message: 'Nekdo je odgovoril na tvoj zapis',
 *   actionLink: '/notes/123',
 *   actionText: 'Poglej odgovor'
 * });
 */
export async function sendNotification(options: {
  to: string | string[];
  title: string;
  message: string;
  actionLink?: string;
  actionText?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/send-notification', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send notification');
  }

  return await response.json();
}

/**
 * Notify user about payout request
 * Sends email to user and admin
 * 
 * @example
 * await notifyPayoutRequest({
 *   amount: 25.50,
 *   method: 'IBAN'
 * });
 */
export async function notifyPayoutRequest(options: {
  amount: number;
  method: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/notify-payout-request', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send payout notification');
  }

  return await response.json();
}
