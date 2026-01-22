# Supabase Auth Emails Setup

## Problem
Supabase uporablja privzete email template namesto naših custom Resend emailov z React Email templates.

## Rešitev
Uporabimo Supabase Edge Function `send-auth-email`, ki prestrezajo auth events in pošiljajo emails preko Resend.

## Nastavitev v Supabase Dashboard

### Korak 1: Deploy Edge Function
```bash
cd supabase
npx supabase functions deploy send-auth-email
```

### Korak 2: Nastavi Environment Variables
V Supabase Dashboard → Settings → Edge Functions:

```bash
RESEND_API_KEY=re_your_resend_api_key
VITE_APP_URL=https://studko.si
```

### Korak 3: Nastavi Auth Hook
V Supabase Dashboard → Authentication → Hooks:

#### Send Email Hook
1. Klikni na **"Hooks"** v meniju Authentication
2. Enable **"Send Email"** hook
3. Select **"HTTP Request"**
4. URL: `https://your-project-ref.supabase.co/functions/v1/send-auth-email`
5. Method: `POST`
6. Headers:
   ```
   Content-Type: application/json
   ```

### Alternativa: Custom SMTP (če hooks ne delujejo)

V Supabase Dashboard → Settings → Auth:

1. Enable **"Custom SMTP"**
2. SMTP Host: Postavi webhook na Vercel:
   - Deploy `api/send-auth-email.ts` na Vercel
   - URL: `https://studko.vercel.app/api/send-auth-email`
3. Nebo potreboval username/password - uporabljamo webhook

**Note:** Auth Hooks so preferirana metoda, ker imajo boljšo integracijo.

### Korak 4: Testiranje

1. Registriraj nov račun
2. Preveri ali dobiš email od `no-reply@studko.si` (Resend)
3. Email mora imeti:
   - ✅ Študko logo in purple branding
   - ✅ Slovenski tekst
   - ✅ Gumb "Potrdi e-naslov"
   - ✅ Footer z social linki

## Email Types

Funkcija `send-auth-email` podpira:

- ✅ **signup** - Email confirmation za nove uporabnike → `welcome.tsx`
- ✅ **recovery** - Password reset → `reset-password.tsx`
- ✅ **email_change** - Email sprememba → `email-change.tsx`
- ✅ **magic_link** - Magic link prijava → `welcome.tsx`
- ✅ **invite** - Team invite → `welcome.tsx`

## Troubleshooting

### Email še vedno prihaja od Supabase?
1. Preveri ali je Edge Function deployed: `npx supabase functions list`
2. Preveri logs: `npx supabase functions logs send-auth-email`
3. Preveri ali so environment variables nastavljene
4. Preveri ali je Auth Hook enabled in ima pravilen URL

### Error: "Failed to send email"
1. Preveri RESEND_API_KEY v Edge Function secrets
2. Preveri da je domena `studko.si` verificirana na Resend
3. Preveri logs za natančno error sporočilo

### Email se ne prikaže pravilno?
1. Preveri da so vsi React Email packages instalirani v `deno.json`
2. Test email template lokalno z `npm run email:dev`
3. Preveri da se pravilno renderira HTML

## Production Checklist

- [ ] Deploy Edge Function: `npx supabase functions deploy send-auth-email`
- [ ] Set environment variables (RESEND_API_KEY, VITE_APP_URL)
- [ ] Enable Auth Hook v Supabase Dashboard
- [ ] Test signup email
- [ ] Test password reset email
- [ ] Test email change email
- [ ] Verify emails prihodijo od no-reply@studko.si
- [ ] Verify branding je pravilen (purple, Študko logo)
- [ ] Check email ne gre v spam

## Logs & Monitoring

Check Edge Function logs:
```bash
npx supabase functions logs send-auth-email --tail
```

Check Resend dashboard za email delivery status:
https://resend.com/emails
