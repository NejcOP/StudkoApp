/**
 * Email Sending API with React Email
 * 
 * Unified endpoint for sending all types of emails using React Email templates
 * 
 * Usage:
 * POST /api/send
 * {
 *   "type": "welcome" | "reset-password" | "pro-activation" | "payout" | "email-change",
 *   "to": "user@example.com",
 *   "data": { ... template-specific data ... }
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { render } from '@react-email/render';

// Import email templates
import WelcomeEmail from '../../emails/welcome.js';
import ResetPasswordEmail from '../../emails/reset-password.js';
import ProActivationEmail from '../../emails/pro-activation.js';
import PayoutConfirmationEmail from '../../emails/payout-confirmation.js';
import EmailChangeEmail from '../../emails/email-change.js';

interface SendEmailRequest {
  type: 'welcome' | 'reset-password' | 'pro-activation' | 'payout' | 'email-change';
  to: string;
  data: any;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda ni dovoljena' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not found');
    return res.status(500).json({ error: 'Napaka v konfiguraciji strežnika' });
  }

  const body: SendEmailRequest = req.body;

  // Validate request
  if (!body.type || !body.to) {
    return res.status(400).json({ 
      error: 'Manjkajo obvezna polja: type, to' 
    });
  }

  try {
    let emailHtml: string;
    let subject: string;

    // Render appropriate email template
    switch (body.type) {
      case 'welcome':
        subject = 'Dobrodošel/a na Študku! 📚 Potrdi svoj e-mail';
        emailHtml = await render(
          WelcomeEmail({
            userName: body.data.userName,
            confirmLink: body.data.confirmLink,
          })
        );
        break;

      case 'reset-password':
        subject = 'Navodila za ponastavitev gesla 🔑';
        emailHtml = await render(
          ResetPasswordEmail({
            userName: body.data.userName,
            resetLink: body.data.resetLink,
          })
        );
        break;

      case 'pro-activation':
        subject = 'Tvoj Študko PRO je tu! 🔥';
        emailHtml = await render(
          ProActivationEmail({
            userName: body.data.userName,
          })
        );
        break;

      case 'payout':
        subject = 'Tvoj zahtevek za izplačilo je prejet! 💸';
        emailHtml = await render(
          PayoutConfirmationEmail({
            userName: body.data.userName,
            amount: body.data.amount,
            method: body.data.method,
          })
        );
        break;

      case 'email-change':
        subject = 'Potrdi spremembo e-poštnega naslova 📧';
        emailHtml = await render(
          EmailChangeEmail({
            userName: body.data.userName,
            newEmail: body.data.newEmail,
            confirmLink: body.data.confirmLink,
          })
        );
        break;

      default:
        return res.status(400).json({ error: 'Neveljaven tip e-maila' });
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Študko <info@studko.si>',
        to: body.to,
        subject: subject,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', errorData);
      return res.status(500).json({ 
        error: 'Napaka pri pošiljanju e-maila',
        details: errorData 
      });
    }

    const data = await response.json();
    console.log(`Email sent: ${body.type} to ${body.to}`);

    return res.status(200).json({
      success: true,
      messageId: data.id,
      type: body.type,
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Napaka pri pošiljanju e-maila',
      message: error.message 
    });
  }
}
