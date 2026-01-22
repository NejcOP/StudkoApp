/**
 * Auth Email Handler
 * Handles Supabase authentication emails via Resend
 * 
 * This endpoint receives auth events from Supabase and sends
 * beautifully formatted emails via Resend
 * 
 * Supabase Setup:
 * Dashboard → Authentication → Email Templates
 * Change "Email Provider" to "Custom SMTP" and point webhook here
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendEmail } from './lib/emails/resend-client';
import {
  confirmEmailTemplate,
  resetPasswordTemplate,
  changeEmailTemplate,
} from './lib/emails/templates';

interface AuthEmailRequest {
  type: 'signup' | 'recovery' | 'email_change' | 'magic_link';
  email: string;
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: any;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body: AuthEmailRequest = req.body;
  const appUrl = process.env.VITE_APP_URL || 'https://studko.si';

  try {
    let emailHtml: string;
    let subject: string;
    let confirmLink: string;

    switch (body.type) {
      case 'signup': {
        // Email confirmation
        const token = body.token_hash || body.token;
        confirmLink = `${appUrl}/auth/confirm?token=${token}&type=signup&redirect_to=${encodeURIComponent(body.redirect_to || '/dashboard')}`;
        
        subject = 'Potrdi svoj e-naslov - Študko';
        emailHtml = confirmEmailTemplate(confirmLink);
        break;
      }

      case 'recovery': {
        // Password reset
        const token = body.token_hash || body.token;
        confirmLink = `${appUrl}/auth/reset-password?token=${token}`;
        
        subject = 'Ponastavi geslo - Študko';
        emailHtml = resetPasswordTemplate(confirmLink);
        break;
      }

      case 'email_change': {
        // Email change confirmation
        const token = body.token_hash || body.token;
        confirmLink = `${appUrl}/auth/confirm?token=${token}&type=email_change`;
        
        subject = 'Potrdi spremembo e-naslova - Študko';
        emailHtml = changeEmailTemplate(confirmLink, body.email);
        break;
      }

      case 'magic_link': {
        // Magic link sign in
        const token = body.token_hash || body.token;
        confirmLink = `${appUrl}/auth/confirm?token=${token}&type=magiclink&redirect_to=${encodeURIComponent(body.redirect_to || '/dashboard')}`;
        
        subject = 'Tvoja prijava v Študko';
        emailHtml = confirmEmailTemplate(confirmLink);
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    // Replace email placeholder in template
    emailHtml = emailHtml.replace('{{email}}', body.email);

    // Send email via Resend
    const result = await sendEmail({
      to: body.email,
      subject,
      html: emailHtml,
      from: 'Študko <info@studko.si>',
    });

    if (!result.success) {
      console.error('Failed to send auth email:', result.error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    console.log(`Auth email sent: ${body.type} to ${body.email}`);
    return res.status(200).json({ success: true, messageId: result.messageId });

  } catch (error: any) {
    console.error('Error sending auth email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
