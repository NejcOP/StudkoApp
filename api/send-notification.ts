/**
 * Generic Email Notification Sender
 * 
 * Use this endpoint to send any notification email from your app
 * Requires authentication via Supabase JWT token
 * 
 * Usage from client:
 * 
 * const { data: { session } } = await supabase.auth.getSession();
 * 
 * await fetch('/api/send-notification', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${session.access_token}`,
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     to: 'user@example.com',
 *     title: 'Novo sporočilo',
 *     message: 'Nekdo je odgovoril na tvoj zapis',
 *     actionLink: 'https://studko.si/notes/123',
 *     actionText: 'Poglej odgovor',
 *   }),
 * });
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from './lib/auth-middleware.js';
import { sendEmail } from './lib/emails/resend-client.js';
import { notificationTemplate } from './lib/emails/templates.js';

interface NotificationRequest {
  to: string | string[];
  title: string;
  message: string;
  actionLink?: string;
  actionText?: string;
}

export default withAuth(async (req, res, user) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body: NotificationRequest = req.body;

  // Validate required fields
  if (!body.to || !body.title || !body.message) {
    return res.status(400).json({
      error: 'Missing required fields: to, title, message',
    });
  }

  try {
    const emailHtml = notificationTemplate(
      body.title,
      body.message,
      body.actionLink,
      body.actionText
    );

    // Replace email placeholder
    const recipients = Array.isArray(body.to) ? body.to : [body.to];
    
    // Send to all recipients
    const results = await Promise.all(
      recipients.map(email =>
        sendEmail({
          to: email,
          subject: body.title,
          html: emailHtml.replace('{{email}}', email),
          from: 'Študko <no-reply@studko.si>',
        })
      )
    );

    const allSuccessful = results.every(r => r.success);

    if (!allSuccessful) {
      const failedCount = results.filter(r => !r.success).length;
      return res.status(500).json({
        error: `Failed to send ${failedCount} email(s)`,
        results,
      });
    }

    console.log(`Notification sent to ${recipients.length} recipient(s)`);
    return res.status(200).json({
      success: true,
      sent: recipients.length,
      messageIds: results.map(r => r.messageId),
    });

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
