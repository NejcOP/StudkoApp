/**
 * TikTok Challenge Verification Endpoint
 * 
 * This endpoint receives TikTok video submissions from users and notifies admin
 * for manual verification. Does NOT automatically verify - requires human review.
 * 
 * Required Environment Variables (Vercel Server):
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 * - RESEND_API_KEY: Resend API key for sending emails
 * - ADMIN_EMAIL: Email address to receive verification notifications (e.g., info@studko.si)
 * - DISCORD_WEBHOOK_URL: (Optional) Discord webhook for instant notifications
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface VerifyTikTokBody {
  userId: string;
  videoUrl: string;
  username?: string;
}

interface TikTokClaim {
  id: string;
  user_id: string;
  platform: string;
  link: string;
  status: string;
  created_at: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL || 'info@studko.si';
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    console.error('Missing required environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Verify JWT token from request headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Validate token with Supabase
  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey,
      },
    });

    if (!userResponse.ok) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userData = await userResponse.json();
    
    // Parse request body
    const body: VerifyTikTokBody = req.body;

    if (!body.videoUrl || !body.userId) {
      return res.status(400).json({ error: 'Missing required fields: videoUrl, userId' });
    }

    // Ensure authenticated user matches userId
    if (userData.id !== body.userId) {
      return res.status(403).json({ error: 'User ID mismatch' });
    }

    // Validate TikTok URL format
    const tiktokUrlPattern = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)/i;
    if (!tiktokUrlPattern.test(body.videoUrl)) {
      return res.status(400).json({ error: 'Invalid TikTok URL format' });
    }

    // Check if user already has a pending or approved claim
    const existingClaimResponse = await fetch(
      `${supabaseUrl}/rest/v1/social_claims?user_id=eq.${body.userId}&platform=eq.tiktok&select=id,status`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (existingClaimResponse.ok) {
      const existingClaims = await existingClaimResponse.json();
      const hasPendingOrApproved = existingClaims.some(
        (claim: TikTokClaim) => claim.status === 'pending' || claim.status === 'approved'
      );

      if (hasPendingOrApproved) {
        return res.status(400).json({ 
          error: 'You already have a pending or approved TikTok challenge submission' 
        });
      }
    }

    // Insert claim into database
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/social_claims`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: body.userId,
          platform: 'tiktok',
          link: body.videoUrl,
          username: body.username || null,
          status: 'pending',
        }),
      }
    );

    if (!insertResponse.ok) {
      const error = await insertResponse.text();
      console.error('Failed to insert claim:', error);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    const newClaim: TikTokClaim = (await insertResponse.json())[0];

    // Get user profile for email notification
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${body.userId}&select=full_name,email`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let userName = 'Unknown User';
    let userEmail = 'Not available';
    
    if (profileResponse.ok) {
      const profiles = await profileResponse.json();
      if (profiles.length > 0) {
        userName = profiles[0].full_name || 'Unknown User';
        userEmail = profiles[0].email || userData.email || 'Not available';
      }
    }

    // Send email notification to admin
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          code { background: #e8e8e8; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎵 Nova TikTok Challenge Prijava</h2>
          </div>
          <div class="content">
            <p><strong>Uporabnik je oddal TikTok video za verifikacijo!</strong></p>
            
            <div class="info">
              <p><strong>👤 Uporabnik:</strong> ${userName}</p>
              <p><strong>📧 Email:</strong> ${userEmail}</p>
              <p><strong>🆔 User ID:</strong> <code>${body.userId}</code></p>
              <p><strong>📱 TikTok Username:</strong> ${body.username || 'Ni podano'}</p>
            </div>

            <div class="info">
              <p><strong>🎬 TikTok Video:</strong></p>
              <p><a href="${body.videoUrl}" class="button" target="_blank">Oglej si video</a></p>
              <p style="word-break: break-all; font-size: 12px; color: #666;">${body.videoUrl}</p>
            </div>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <h3>📋 Kako odobriti PRO dostop:</h3>
            <ol>
              <li>Poglej si TikTok video in preveri, da je legitimen</li>
              <li>Pojdi v <strong>Supabase Dashboard</strong> → <code>social_claims</code> tabela</li>
              <li>Najdi claim z ID: <code>${newClaim.id}</code></li>
              <li>Nastavi <code>status = 'approved'</code></li>
              <li>Pojdi v <code>profiles</code> tabelo</li>
              <li>Najdi uporabnika z ID: <code>${body.userId}</code></li>
              <li>Nastavi:
                <ul>
                  <li><code>is_pro = true</code></li>
                  <li><code>pro_expires_at</code> = danes + 30 dni (ali več)</li>
                  <li><code>subscription_status = 'social_claim'</code></li>
                </ul>
              </li>
            </ol>

            <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; color: #856404;">
              <strong>⚠️ Opomba:</strong> Tega NE odobri avtomatsko! Vedno preveri vsebino videa.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Študko <noreply@studko.si>',
          to: [adminEmail],
          subject: `🎵 Nova TikTok Challenge Prijava - ${userName}`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();
        console.error('Failed to send email:', emailError);
        // Don't fail the request if email fails
      } else {
        console.log('Admin notification email sent successfully');
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue even if email fails
    }

    // Send Discord notification if webhook is configured
    if (discordWebhook) {
      try {
        const discordPayload = {
          embeds: [{
            title: '🎵 Nova TikTok Challenge Prijava',
            color: 0x667eea,
            fields: [
              { name: '👤 Uporabnik', value: userName, inline: true },
              { name: '📧 Email', value: userEmail, inline: true },
              { name: '🆔 User ID', value: `\`${body.userId}\``, inline: false },
              { name: '📱 TikTok Username', value: body.username || 'Ni podano', inline: true },
              { name: '🎬 Video Link', value: `[Oglej si video](${body.videoUrl})`, inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Študko Admin' },
          }],
        };

        await fetch(discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload),
        });

        console.log('Discord notification sent successfully');
      } catch (discordError) {
        console.error('Error sending Discord notification:', discordError);
        // Continue even if Discord fails
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'TikTok challenge submission received. Admin will review your video soon!',
      claimId: newClaim.id,
    });

  } catch (error: any) {
    console.error('Error processing TikTok verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
