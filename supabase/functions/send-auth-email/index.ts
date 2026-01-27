/**
 * Supabase Auth Hook - Custom Email Sender
 * 
 * This Edge Function intercepts Supabase auth emails and sends them
 * via Resend with our custom React Email templates
 * 
 * Setup in Supabase Dashboard:
 * Settings → Auth → Hooks → Send Email Hook
 * Point to: https://[project-ref].supabase.co/functions/v1/send-auth-email
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const APP_URL = Deno.env.get('VITE_APP_URL') || 'https://studko.si'

interface SupabaseAuthHookPayload {
  user: {
    id: string
    email: string
    user_metadata?: {
      name?: string
    }
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to?: string
    email_action_type: 'signup' | 'recovery' | 'magic_link' | 'email_change' | 'invite'
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: SupabaseAuthHookPayload = await req.json()
    console.log('Received hook payload:', JSON.stringify(body, null, 2))
    
    // Validate RESEND_API_KEY exists
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set!')
      // Return 200 to not block auth flow - Supabase will use default emails
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'RESEND_API_KEY not configured',
          details: 'Email sending disabled, auth flow continues'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const { user, email_data } = body
    const email = user.email
    const type = email_data.email_action_type
    const token = email_data.token
    const token_hash = email_data.token_hash
    const redirect_to = email_data.redirect_to

    // Build confirmation link based on email type
    const tokenValue = token_hash || token
    let confirmLink = ''
    let subject = ''
    let userName = user?.user_metadata?.name || 'Študent'

    console.log(`Processing ${type} email for ${email}`)

    switch (type) {
      case 'signup': {
        // Email confirmation for new signups - include email in URL
        confirmLink = `${APP_URL}/auth/confirm?token=${tokenValue}&type=signup&email=${encodeURIComponent(email)}&redirect_to=${encodeURIComponent(redirect_to || '/notes')}`
        subject = '🎉 Dobrodošel v Študko!'
        break
      }

      case 'recovery': {
        // Password reset
        confirmLink = `${APP_URL}/auth/reset-password?token=${tokenValue}`
        subject = '🔐 Ponastavi geslo - Študko'
        break
      }

      case 'email_change': {
        // Email change confirmation
        confirmLink = `${APP_URL}/auth/confirm?token=${tokenValue}&type=email_change`
        subject = '📧 Potrdi spremembo e-naslova - Študko'
        break
      }

      case 'magic_link': {
        // Magic link sign in
        confirmLink = `${APP_URL}/auth/confirm?token=${tokenValue}&type=magiclink&redirect_to=${encodeURIComponent(redirect_to || '/notes')}`
        subject = '✨ Tvoja prijava v Študko'
        break
      }

      case 'invite': {
        // Team invite (if you use this feature)
        confirmLink = `${APP_URL}/auth/confirm?token=${tokenValue}&type=invite`
        subject = '📨 Povabilo v Študko'
        break
      }

      default:
        console.error(`Unknown email type: ${type}`)
        return new Response(
          JSON.stringify({ error: 'Invalid email type' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // Build email HTML based on type
    let emailHtml = ''
    
    if (type === 'recovery') {
      // Password reset email
      emailHtml = getPasswordResetEmail(confirmLink)
    } else if (type === 'email_change') {
      // Email change confirmation
      emailHtml = getEmailChangeEmail(email, confirmLink)
    } else {
      // Welcome/signup/magic link email
      emailHtml = getWelcomeEmail(userName, confirmLink)
    }

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Študko <no-reply@studko.si>',
        to: [email],
        subject,
        html: emailHtml,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData)
      throw new Error(resendData.message || 'Failed to send email')
    }

    console.log(`Email sent successfully to ${email}`, resendData)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${type} email sent to ${email}`,
        id: resendData.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    // Always return 200 to not block auth flow - log error but continue
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
        details: 'Email sending failed but auth flow continues',
      }),
      {
        status: 200, // Changed from 500 to not block Supabase auth
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

// Email HTML Templates - inline for Deno compatibility
function getWelcomeEmail(userName: string, confirmLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                📚 Študko
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 700;">
                Dobrodošel/a na Študku, ${userName}! 🎉
              </h2>
              
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                Super, da si se odločil/a pridružiti naši skupnosti študentov! 
                Na Študku te čakajo zapiski, kvizi, AI asistent in še veliko več.
              </p>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Samo še en majhen korak te loči od začetka - <strong>potrdi svoj e-naslov</strong>:
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; margin: 0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${confirmLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%); color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                      ✅ Potrdi e-naslov
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Features -->
              <div style="background-color: #F3F4F6; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
                <p style="margin: 0 0 16px; color: #7C3AED; font-size: 14px; font-weight: 600;">
                  KAJ TE ČAKA:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                  <li style="margin-bottom: 8px;">📝 Nalaganje zapiskov (PDF, fotografije)</li>
                  <li style="margin-bottom: 8px;">🧠 AI asistent za razlago snovi</li>
                  <li style="margin-bottom: 8px;">💰 Prodaja zapiskov in zaslužek</li>
                  <li style="margin-bottom: 8px;">👨‍🏫 Iskanje in rezervacija tutorjev</li>
                  <li style="margin-bottom: 0;">🎯 Kvizi in flashcards za učenje</li>
                </ul>
              </div>
              
              <!-- Help Text -->
              <p style="margin: 0 0 8px; color: #6B7280; font-size: 14px;">
                <strong>Potrebuješ pomoč?</strong>
              </p>
              <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                Kontaktiraj nas na <a href="mailto:info@studko.si" style="color: #7C3AED; text-decoration: none;">info@studko.si</a> 
                ali nas najdi na <a href="https://instagram.com/studko.si" style="color: #7C3AED; text-decoration: none;">Instagramu</a> 📱
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 32px 40px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6B7280; font-size: 14px;">
                Študko - Študentska platforma za zapiske in učenje
              </p>
              <p style="margin: 0 0 16px;">
                <a href="https://instagram.com/studko.si" style="color: #7C3AED; text-decoration: none; margin: 0 8px; font-size: 24px;">📸</a>
                <a href="https://tiktok.com/@studko.si" style="color: #7C3AED; text-decoration: none; margin: 0 8px; font-size: 24px;">🎵</a>
                <a href="https://studko.si" style="color: #7C3AED; text-decoration: none; margin: 0 8px; font-size: 24px;">🌐</a>
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                © ${new Date().getFullYear()} Študko. Vse pravice pridržane.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getPasswordResetEmail(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                🔐 Študko
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 700;">
                Ponastavi geslo
              </h2>
              
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                Prejeli smo zahtevo za ponastavitev gesla za tvoj Študko račun.
              </p>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Klikni na spodnji gumb za nastavitev novega gesla:
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; margin: 0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%); color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                      🔑 Ponastavi geslo
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 0 0 24px; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Pomembno:</strong> Ta povezava bo aktivna samo 1 uro. 
                  Če je nisi zahteval/a ti, prezri to sporočilo - tvoj račun je varen.
                </p>
              </div>
              
              <!-- Help Text -->
              <p style="margin: 0 0 8px; color: #6B7280; font-size: 14px;">
                <strong>Potrebuješ pomoč?</strong>
              </p>
              <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                Kontaktiraj nas na <a href="mailto:info@studko.si" style="color: #7C3AED; text-decoration: none;">info@studko.si</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 32px 40px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6B7280; font-size: 14px;">
                Študko - Študentska platforma za zapiske in učenje
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                © ${new Date().getFullYear()} Študko. Vse pravice pridržane.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getEmailChangeEmail(newEmail: string, confirmLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                📧 Študko
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 700;">
                Potrdi spremembo e-naslova
              </h2>
              
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                Prejeli smo zahtevo za spremembo e-naslova na tvojem Študko računu na:
              </p>
              
              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin: 0 0 24px; text-align: center;">
                <p style="margin: 0; color: #7C3AED; font-size: 18px; font-weight: 600;">
                  ${newEmail}
                </p>
              </div>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Klikni na spodnji gumb za potrditev spremembe:
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; margin: 0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${confirmLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%); color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                      ✅ Potrdi e-naslov
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 0 0 24px; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Pomembno:</strong> Če te spremembe nisi zahteval/a ti, 
                  prezri to sporočilo in takoj spremeni geslo.
                </p>
              </div>
              
              <!-- Help Text -->
              <p style="margin: 0 0 8px; color: #6B7280; font-size: 14px;">
                <strong>Potrebuješ pomoč?</strong>
              </p>
              <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                Kontaktiraj nas na <a href="mailto:info@studko.si" style="color: #7C3AED; text-decoration: none;">info@studko.si</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 32px 40px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 12px; color: #6B7280; font-size: 14px;">
                Študko - Študentska platforma za zapiske in učenje
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                © ${new Date().getFullYear()} Študko. Vse pravice pridržane.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

