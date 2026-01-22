/**
 * Payout Request Notification Handler
 * 
 * Sends confirmation email when user requests a payout
 * Requires authentication via Supabase JWT token
 * 
 * Usage from client:
 * 
 * const { data: { session } } = await supabase.auth.getSession();
 * 
 * await fetch('/api/notify-payout-request', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${session.access_token}`,
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     amount: 25.50,
 *     method: 'IBAN',
 *   }),
 * });
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from './lib/auth-middleware';
import { sendEmail } from './lib/emails/resend-client';
import { payoutRequestTemplate } from './lib/emails/templates';

interface PayoutRequest {
  amount: number;
  method: string;
}

export default withAuth(async (req, res, user) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body: PayoutRequest = req.body;

  // Validate required fields
  if (!body.amount || !body.method) {
    return res.status(400).json({
      error: 'Missing required fields: amount, method',
    });
  }

  // Validate amount
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return res.status(400).json({
      error: 'Invalid amount',
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Get user profile
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=full_name,email`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!profileResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    const profiles = await profileResponse.json();
    
    if (!profiles || profiles.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const profile = profiles[0];
    const userName = profile.full_name || 'Študent';
    const userEmail = profile.email || user.email;

    // Generate email
    const emailHtml = payoutRequestTemplate(userName, body.amount, body.method)
      .replace('{{email}}', userEmail);

    // Send email to user
    const userEmailResult = await sendEmail({
      to: userEmail,
      subject: 'Zahtevek za izplačilo prejet - Študko',
      html: emailHtml,
      from: 'Študko <info@studko.si>',
    });

    if (!userEmailResult.success) {
      console.error('Failed to send payout email to user:', userEmailResult.error);
      return res.status(500).json({ error: 'Failed to send confirmation email' });
    }

    // Send notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'info@studko.si';
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🔔 Nov zahtevek za izplačilo</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Uporabnik:</strong> ${userName} (${userEmail})</p>
          <p><strong>User ID:</strong> <code>${user.id}</code></p>
          <p><strong>Znesek:</strong> ${body.amount.toFixed(2)} €</p>
          <p><strong>Način:</strong> ${body.method}</p>
        </div>
        <p>Zahtevek obdelaj v Admin panelu.</p>
      </body>
      </html>
    `;

    await sendEmail({
      to: adminEmail,
      subject: `💰 Nov zahtevek za izplačilo - ${userName}`,
      html: adminEmailHtml,
      from: 'Študko Admin <info@studko.si>',
    });

    console.log(`Payout notification sent to ${userEmail}`);
    return res.status(200).json({
      success: true,
      messageId: userEmailResult.messageId,
    });

  } catch (error: any) {
    console.error('Error sending payout notification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
