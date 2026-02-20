import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      to, 
      type, 
      instructorName, 
      studentName, 
      bookingDate, 
      bookingTime,
      bookingId,
      priceEur
    } = await req.json()

    if (!to || !type) {
      throw new Error('Missing required fields: to, type')
    }

    let subject = ''
    let html = ''

    // Import templates
    const BRAND_COLOR = '#667eea'
    const BRAND_COLOR_DARK = '#764ba2'

    const emailWrapper = (content: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 32px;
            font-weight: 700;
          }
          .content {
            padding: 40px 30px;
            color: #333333;
            line-height: 1.6;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
          }
          .info-box {
            background-color: #f8f9ff;
            border-left: 4px solid ${BRAND_COLOR};
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 30px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Študko</h1>
          </div>
          <div class="content">
            ${content}
          </div>
        </div>
      </body>
      </html>
    `

    if (type === 'booking_request') {
      subject = 'Nova rezervacija lekcije!'
      const content = `
        <h2>Nova rezervacija lekcije! 📚</h2>
        <p>Pozdravljeni, <strong>${instructorName}</strong>!</p>
        <p>Študent <strong>${studentName}</strong> je rezerviral lekcijo pri tebi.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Podrobnosti rezervacije:</h3>
          <p style="margin: 5px 0;"><strong>Datum:</strong> ${bookingDate}</p>
          <p style="margin: 5px 0;"><strong>Čas:</strong> ${bookingTime}</p>
          <p style="margin: 5px 0;"><strong>Študent:</strong> ${studentName}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://studko.si/profile?tab=instructor" class="button">Potrdi ali zavrni</a>
        </div>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #666;">
          Prosimo, potrdi ali zavrni rezervacijo čim prej.
        </p>
      `
      html = emailWrapper(content)
    } else if (type === 'booking_confirmed_payment') {
      subject = 'Lekcija potrjena - Plačaj zdaj! 💳'
      const content = `
        <h2>Lekcija potrjena! ✅</h2>
        <p>Pozdravljeni, <strong>${studentName}</strong>!</p>
        <p>Tvoja rezervacija pri inštruktorju <strong>${instructorName}</strong> je bila <strong>potrjena</strong>!</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Podrobnosti lekcije:</h3>
          <p style="margin: 5px 0;"><strong>Datum:</strong> ${bookingDate}</p>
          <p style="margin: 5px 0;"><strong>Čas:</strong> ${bookingTime}</p>
          <p style="margin: 5px 0;"><strong>Inštruktor:</strong> ${instructorName}</p>
          <p style="margin: 15px 0 5px; font-size: 24px; color: ${BRAND_COLOR};"><strong>Cena: ${priceEur} €</strong></p>
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404;"><strong>⚠️ Pomembno:</strong> Za dostop do videoklica moraš najprej plačati lekcijo.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://studko.si/profile?tab=bookings" class="button" style="font-size: 18px; padding: 16px 40px;">
            💳 Plačaj zdaj (${priceEur} €)
          </a>
        </div>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #666;">
          Po plačilu boš prejel dostop do videoklica in lahko se pristopiš lekciji ob dogovorjenem času.
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          <strong>Način plačila:</strong> Varno plačilo prek Stripe (sprejemamo kartice Visa, Mastercard, American Express).
        </p>
      `
      html = emailWrapper(content)
    } else if (type === 'booking_confirmed') {
      subject = 'Lekcija potrjena! ✅'
      const content = `
        <h2>Lekcija potrjena! ✅</h2>
        <p>Pozdravljeni, <strong>${studentName}</strong>!</p>
        <p>Tvoja rezervacija pri inštruktorju <strong>${instructorName}</strong> je bila potrjena.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Podrobnosti lekcije:</h3>
          <p style="margin: 5px 0;"><strong>Datum:</strong> ${bookingDate}</p>
          <p style="margin: 5px 0;"><strong>Čas:</strong> ${bookingTime}</p>
          <p style="margin: 5px 0;"><strong>Inštruktor:</strong> ${instructorName}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://studko.si/profile?tab=purchases" class="button">Poglej rezervacije</a>
        </div>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #666;">
          Lekcija bo potekala ob dogovorjenem času. Veliko uspeha!
        </p>
      `
      html = emailWrapper(content)
    } else if (type === 'payment_received') {
      subject = 'Plačilo prejeto - Lekcija plačana! 💰'
      const content = `
        <h2>Plačilo prejeto! 💰</h2>
        <p>Pozdravljeni, <strong>${instructorName}</strong>!</p>
        <p>Študent <strong>${studentName}</strong> je uspešno plačal lekcijo.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Podrobnosti plačila:</h3>
          <p style="margin: 5px 0;"><strong>Datum lekcije:</strong> ${bookingDate}</p>
          <p style="margin: 5px 0;"><strong>Čas:</strong> ${bookingTime}</p>
          <p style="margin: 5px 0;"><strong>Študent:</strong> ${studentName}</p>
          <p style="margin: 15px 0 5px; font-size: 24px; color: ${BRAND_COLOR};"><strong>Znesek: ${priceEur} €</strong></p>
        </div>

        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #155724;"><strong>✅ Plačilo uspešno:</strong> Sredstva bodo nakazana na tvoj Stripe račun.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://studko.si/profile?tab=instructor" class="button">Preglej rezervacije</a>
        </div>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #666;">
          Lekcija bo potekala ob dogovorjenem času. Dobiček bo avtomatsko nakazan na tvoj Stripe Connect račun po uspešno zaključeni lekciji.
        </p>
      `
      html = emailWrapper(content)
    } else if (type === 'booking_rejected') {
      subject = 'Rezervacija zavrnjena'
      const content = `
        <h2>Rezervacija zavrnjena</h2>
        <p>Pozdravljeni, <strong>${studentName}</strong>!</p>
        <p>Žal je inštruktor <strong>${instructorName}</strong> zavrnil rezervacijo.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Zavrnjena rezervacija:</h3>
          <p style="margin: 5px 0;"><strong>Datum:</strong> ${bookingDate}</p>
          <p style="margin: 5px 0;"><strong>Čas:</strong> ${bookingTime}</p>
          <p style="margin: 5px 0;"><strong>Inštruktor:</strong> ${instructorName}</p>
        </div>

        <p>Lahko poskusiš rezervirati drug termin ali pa izberi drugega inštruktorja.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://studko.si/tutors" class="button">Poišči inštruktorje</a>
        </div>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #666;">
          Hvala za razumevanje.
        </p>
      `
      html = emailWrapper(content)
    } else {
      throw new Error(`Unknown email type: ${type}`)
    }

    const { data, error } = await resend.emails.send({
      from: 'Študko <noreply@studko.si>',
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
