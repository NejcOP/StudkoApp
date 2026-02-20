/**
 * Email Templates for Študko
 * Modern, responsive email designs with purple theme
 */

const BRAND_COLOR = '#667eea';
const BRAND_COLOR_DARK = '#764ba2';

/**
 * Base email wrapper with Študko branding
 */
function emailWrapper(content: string): string {
  return `
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
          margin: 20px 0;
        }
        .footer {
          background-color: #f9f9f9;
          padding: 30px;
          text-align: center;
          color: #666666;
          font-size: 14px;
        }
        .divider {
          height: 1px;
          background-color: #e0e0e0;
          margin: 30px 0;
        }
        .info-box {
          background-color: #f8f9ff;
          border-left: 4px solid ${BRAND_COLOR};
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 Študko</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Študko - Tvoj študijski pomočnik</p>
          <p style="font-size: 12px; color: #999;">
            Ta mail je bil poslan na <strong>{{email}}</strong><br>
            Če nisi zahteval tega dejanja, prosim ignoriraj ta mail.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Email confirmation template
 */
export function confirmEmailTemplate(confirmLink: string): string {
  const content = `
    <h2>Potrdi svoj e-naslov</h2>
    <p>Hvala za registracijo na Študko! 🎉</p>
    <p>Prosimo, potrdi svoj e-naslov s klikom na gumb spodaj:</p>
    <div style="text-align: center;">
      <a href="${confirmLink}" class="button">Potrdi E-naslov</a>
    </div>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #666;">
      Če gumb ne deluje, kopiraj in prilepi to povezavo v brskalnik:<br>
      <code style="background: #f5f5f5; padding: 8px; display: inline-block; margin-top: 10px; word-break: break-all;">${confirmLink}</code>
    </p>
    <div class="warning-box">
      <strong>⚠️ Varnost:</strong> Ta povezava je veljavna 24 ur. Nikoli ne deli te povezave z nikomer.
    </div>
  `;
  return emailWrapper(content);
}

/**
 * Password reset template
 */
export function resetPasswordTemplate(resetLink: string): string {
  const content = `
    <h2>Ponastavi geslo</h2>
    <p>Prejeli smo zahtevo za ponastavitev gesla za tvoj Študko račun.</p>
    <p>Klikni na gumb spodaj za nastavitev novega gesla:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Ponastavi Geslo</a>
    </div>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #666;">
      Če gumb ne deluje, kopiraj in prilepi to povezavo v brskalnik:<br>
      <code style="background: #f5f5f5; padding: 8px; display: inline-block; margin-top: 10px; word-break: break-all;">${resetLink}</code>
    </p>
    <div class="warning-box">
      <strong>⚠️ Varnost:</strong> Ta povezava je veljavna 1 uro. Če nisi zahteval ponastavitve gesla, ignoriraj ta mail in tvoje geslo bo ostalo nespremenjeno.
    </div>
  `;
  return emailWrapper(content);
}

/**
 * Email change confirmation template
 */
export function changeEmailTemplate(confirmLink: string, newEmail: string): string {
  const content = `
    <h2>Potrdi spremembo e-naslova</h2>
    <p>Zahtevana je bila sprememba e-naslova za tvoj Študko račun.</p>
    <div class="info-box">
      <strong>Nov e-naslov:</strong> ${newEmail}
    </div>
    <p>Klikni na gumb spodaj za potrditev spremembe:</p>
    <div style="text-align: center;">
      <a href="${confirmLink}" class="button">Potrdi Spremembo</a>
    </div>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #666;">
      Če gumb ne deluje, kopiraj in prilepi to povezavo v brskalnik:<br>
      <code style="background: #f5f5f5; padding: 8px; display: inline-block; margin-top: 10px; word-break: break-all;">${confirmLink}</code>
    </p>
    <div class="warning-box">
      <strong>⚠️ Varnost:</strong> Če nisi zahteval te spremembe, takoj se prijavi v svoj račun in spremeni geslo.
    </div>
  `;
  return emailWrapper(content);
}

/**
 * Welcome to PRO template
 */
export function welcomeToProTemplate(userName: string): string {
  const content = `
    <h2>Dobrodošel v Študko PRO! 🚀</h2>
    <p>Pozdravljeni, <strong>${userName}</strong>!</p>
    <p>Tvoja PRO naročnina je zdaj aktivna. Hvala, ker si se odločil za Študko PRO!</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Kaj lahko zdaj počneš:</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>✨ Neomejen AI asistent za učenje</li>
        <li>📝 Ustvari neomejeno povzetkov</li>
        <li>🎯 Generiraj kvize in flashcarde</li>
        <li>🎓 Dostop do vseh premium funkcij</li>
        <li>⚡ Prednost pri novih funkcijah</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studko.si/ai" class="button">Začni Uporabljati AI Asistenta</a>
    </div>

    <div class="divider"></div>

    <p><strong>Potrebuješ pomoč?</strong></p>
    <p>Če imaš kakršnakoli vprašanja, nam piši na <a href="mailto:info@studko.si" style="color: ${BRAND_COLOR};">info@studko.si</a></p>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Tvoja naročnina se bo avtomatsko podaljšala vsak mesec. Kadarkoli jo lahko prekliceš v nastavitvah profila.
    </p>
  `;
  return emailWrapper(content);
}

/**
 * Subscription cancellation template
 */
export function subscriptionCancelledTemplate(userName: string): string {
  const content = `
    <h2>Naročnina preklicana</h2>
    <p>Pozdravljeni, <strong>${userName}</strong>!</p>
    <p>Tvoja Študko PRO naročnina je bila uspešno preklicana.</p>
    
    <div class="info-box">
      <p style="margin: 0;">
        Dostop do PRO funkcij boš ohranil do konca trenutnega obračunskega obdobja. 
        Po tem datumu se bodo PRO funkcije onemogočile.
      </p>
    </div>

    <div class="divider"></div>

    <p><strong>Premislil si?</strong></p>
    <p>Kadarkoli se lahko ponovno naročiš na PRO v nastavitvah profila.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studko.si/profile" class="button">Nazaj na Profil</a>
    </div>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Hvala, ker si bil del Študko PRO. Upamo, da se kmalu vrneš! 💙
    </p>
  `;
  return emailWrapper(content);
}

/**
 * PRO trial ending reminder template
 */
export function proTrialEndingTemplate(userName: string, daysLeft: number): string {
  const content = `
    <h2>Tvoj PRO preizkus se izteka! ⏰</h2>
    <p>Pozdravljeni, <strong>${userName}</strong>!</p>
    <p>Tvoj 7-dnevni brezplačni preizkus Študko PRO se bo iztekol čez <strong>${daysLeft} ${daysLeft === 1 ? 'dan' : 'dni'}</strong>.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Kaj se bo zgodilo:</h3>
      <p style="margin: 10px 0;">
        Po koncu preizkusnega obdobja se bo tvoja naročnina <strong>samodejno aktivirala za 3,99 €/mesec</strong>. 
        Kadarkoli jo lahko prekliceš v nastavitvah profila.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studko.si/profile?tab=subscription" class="button">Upravljaj Naročnino</a>
    </div>

    <div class="divider"></div>

    <p><strong>Ne želiš nadaljevati?</strong></p>
    <p>Če ne želiš nadaljevati s PRO naročnino, lahko kadarkoli prekliceš naročnino v nastavitvah profila. Po preklicu boš še vedno lahko uporabljal PRO funkcije do konca preizkusnega obdobja.</p>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Hvala ker si poskusil Študko PRO! 💜
    </p>
  `;
  return emailWrapper(content);
}

/**
 * PRO subscription expiring reminder template
 */
export function proExpiringReminderTemplate(userName: string, expiryDate: string): string {
  const content = `
    <h2>Tvoja PRO naročnina se obnavlja! 💳</h2>
    <p>Pozdravljeni, <strong>${userName}</strong>!</p>
    <p>Tvoja Študko PRO naročnina se bo avtomatsko obnovila <strong>${expiryDate}</strong>.</p>
    
    <div class="info-box">
      <p style="margin: 0;">
        Znesek <strong>3,99 €</strong> bo zaračunan na kartico, ki si jo dodal ob naročilu. 
        Če želiš spremeniti način plačila, lahko to storiš v nastavitvah profila.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studko.si/profile?tab=subscription" class="button">Upravljaj Naročnino</a>
    </div>

    <div class="divider"></div>

    <p><strong>Želiš preklicati?</strong></p>
    <p>Če ne želiš nadaljevati s PRO naročnino, lahko kadarkoli prekliceš naročnino v nastavitvah profila.</p>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Hvala ker si del Študko PRO! 🚀
    </p>
  `;
  return emailWrapper(content);
}

/**
 * Payout request confirmation template
 */
export function payoutRequestTemplate(userName: string, amount: number, method: string): string {
  const content = `
    <h2>Zahtevek za izplačilo prejet</h2>
    <p>Pozdravljeni, <strong>${userName}</strong>!</p>
    <p>Uspešno smo prejeli tvoj zahtevek za izplačilo.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Podrobnosti izplačila:</h3>
      <p style="margin: 5px 0;"><strong>Znesek:</strong> ${amount.toFixed(2)} €</p>
      <p style="margin: 5px 0;"><strong>Način:</strong> ${method}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> V obdelavi</p>
    </div>

    <p>Izplačilo bo obdelano v roku <strong>3-5 delovnih dni</strong>.</p>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">
      Ko bo izplačilo opravljeno, boš prejel dodatno obvestilo.
    </p>

    <p>Če imaš vprašanja, nas kontaktiraj na <a href="mailto:info@studko.si" style="color: ${BRAND_COLOR};">info@studko.si</a></p>
  `;
  return emailWrapper(content);
}

/**
 * Generic notification template
 */
export function notificationTemplate(title: string, message: string, actionLink?: string, actionText?: string): string {
  const content = `
    <h2>${title}</h2>
    <p>${message}</p>
    ${actionLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${actionLink}" class="button">${actionText || 'Poglej več'}</a>
      </div>
    ` : ''}
    <div class="divider"></div>
    <p style="font-size: 14px; color: #666;">
      To obvestilo je bilo poslano, ker si naročen na Študko obvestila.
    </p>
  `;
  return emailWrapper(content);
}

/**
 * Booking request notification for instructor
 */
export function bookingRequestTemplate(
  instructorName: string,
  studentName: string,
  bookingDate: string,
  bookingTime: string
): string {
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
  `;
  return emailWrapper(content);
}

/**
 * Booking confirmed notification for student
 */
export function bookingConfirmedTemplate(
  studentName: string,
  instructorName: string,
  bookingDate: string,
  bookingTime: string
): string {
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
  `;
  return emailWrapper(content);
}

/**
 * Booking rejected notification for student
 */
export function bookingRejectedTemplate(
  studentName: string,
  instructorName: string,
  bookingDate: string,
  bookingTime: string
): string {
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
  `;
  return emailWrapper(content);
}

/**
 * Note purchase notification for seller
 */
export function notePurchaseTemplate(
  sellerName: string,
  buyerName: string,
  noteTitle: string,
  priceEur: number
): string {
  const content = `
    <h2>Tvoje zapiski so bili kupljeni! 💰</h2>
    <p>Pozdravljeni, <strong>${sellerName}</strong>!</p>
    <p><strong>${buyerName}</strong> je kupil tvoje zapiske.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Podrobnosti prodaje:</h3>
      <p style="margin: 5px 0;"><strong>Naslov zapiskov:</strong> ${noteTitle}</p>
      <p style="margin: 5px 0;"><strong>Kupec:</strong> ${buyerName}</p>
      <p style="margin: 5px 0;"><strong>Zaslužek:</strong> ${priceEur.toFixed(2)}€</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studko.si/profile" class="button">Poglej profil</a>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">
      Zaslužke lahko dvigneš preko Stripe Connect na svojem profilu.
    </p>
  `;
  return emailWrapper(content);
}

/**
 * Instructor application approved notification
 */
export function instructorApprovedTemplate(
  applicantName: string
): string {
  const content = `
    <h2>Tvoja prijava je bila odobrena! 🎉</h2>
    <p>Pozdravljeni, <strong>${applicantName}</strong>!</p>
    <p>Veseli nas, da ti sporočimo, da je bila tvoja prijava za instruktorja <strong>odobrena</strong>.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Kaj zdaj?</h3>
      <p style="margin: 5px 0;">✅ Zdaj lahko nastaviš svojo razpoložljivost za inštrukcije</p>
      <p style="margin: 5px 0;">✅ Študentje lahko pri tebi rezervirajo termine</p>
      <p style="margin: 5px 0;">✅ Povezati moraš Stripe Connect za prejemanje plačil</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studko.si/profile?tab=instructor" class="button">Nastavi razpoložljivost</a>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">
      Dobrodošel v ekipi instruktorjev Študko!
    </p>
  `;
  return emailWrapper(content);
}

/**
 * Instructor application rejected notification
 */
export function instructorRejectedTemplate(
  applicantName: string,
  reason?: string
): string {
  const content = `
    <h2>Obvestilo o prijavi za instruktorja</h2>
    <p>Pozdravljeni, <strong>${applicantName}</strong>!</p>
    <p>Žal ti moramo sporočiti, da tvoja prijava za instruktorja trenutno ni bila odobrena.</p>
    
    ${reason ? `
    <div class="info-box">
      <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Razlog:</h3>
      <p style="margin: 5px 0;">${reason}</p>
    </div>
    ` : ''}

    <p>Če želiš več informacij ali se želiš ponovno prijaviti, nas kontaktiraj.</p>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">
      Kontakt: <a href="mailto:info@studko.si" style="color: ${BRAND_COLOR};">info@studko.si</a>
    </p>
  `;
  return emailWrapper(content);
}

/**
 * TikTok challenge approved notification
 */
export function tiktokApprovedTemplate(
  userName: string,
  videoUrl: string
): string {
  const content = `
    <h2>TikTok izziv potrjen! 🎉</h2>
    <p>Pozdravljeni, <strong>${userName}</strong>!</p>
    <p>Tvoj video za TikTok izziv je bil <strong>potrjen</strong>!</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Nagrada:</h3>
      <p style="margin: 5px 0;">🎁 <strong>1 mesec brezplačnega PRO dostopa</strong></p>
      <p style="margin: 5px 0;">✅ Dostop do vseh PRO funkcij</p>
      <p style="margin: 5px 0;">📚 Neomejeno pregledov zapiskov</p>
    </div>

    ${videoUrl ? `<p style="margin: 15px 0;">Tvoj video: <a href="${videoUrl}" style="color: ${BRAND_COLOR};">${videoUrl}</a></p>` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studko.si/dashboard" class="button">Raziskuj PRO funkcije</a>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">
      Hvala za tvojo podporo Študko! 🚀
    </p>
  `;
  return emailWrapper(content);
}

/**
 * TikTok challenge rejected notification
 */
export function tiktokRejectedTemplate(
  userName: string,
  videoUrl: string,
  reason?: string
): string {
  const content = `
    <h2>Obvestilo o TikTok izzivu</h2>
    <p>Pozdravljeni, <strong>${userName}</strong>!</p>
    <p>Žal ti moramo sporočiti, da tvoj video za TikTok izziv ni bil potrjen.</p>
    
    ${reason ? `
    <div class="info-box">
      <h3 style="margin-top: 0; color: ${BRAND_COLOR};">Razlog:</h3>
      <p style="margin: 5px 0;">${reason}</p>
    </div>
    ` : ''}

    ${videoUrl ? `<p style="margin: 15px 0;">Tvoj video: <a href="${videoUrl}" style="color: ${BRAND_COLOR};">${videoUrl}</a></p>` : ''}

    <p>Poskusi ponovno z drugim videom, ki ustreza vsem pogojem izziva!</p>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">
      Kontakt: <a href="mailto:info@studko.si" style="color: ${BRAND_COLOR};">info@studko.si</a>
    </p>
  `;
  return emailWrapper(content);
}
