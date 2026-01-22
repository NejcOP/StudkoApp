/**
 * Resend Email Client
 * Central email sending utility using Resend API
 */

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via Resend API
 * Uses RESEND_API_KEY from environment variables
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResponse> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not found in environment variables');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || 'Študko <info@studko.si>',
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', errorData);
      return {
        success: false,
        error: `Failed to send email: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log('Email sent successfully:', data.id);

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Send multiple emails in batch
 */
export async function sendBatchEmails(emails: SendEmailOptions[]): Promise<EmailResponse[]> {
  const promises = emails.map(email => sendEmail(email));
  return Promise.all(promises);
}
