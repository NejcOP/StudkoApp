# Študko Security & Backend Infrastructure Setup

## 🔐 Varnostne Izboljšave

### 1. Supabase Row Level Security (RLS)

#### ✅ Implementirane Politike

**Nova migracija:** `20260122000001_secure_pro_status.sql`

**Ključne varnostne funkcije:**
- ✅ Uporabniki **NE MOREJO** spreminjati svojega `is_pro` statusa
- ✅ Samo **Service Role** (Stripe webhook) lahko posodablja PRO status
- ✅ Vse spremembe PRO statusa se beležijo v `security_audit_log`
- ✅ Social claims ni mogoče urejati po oddaji (preprečuje manipulacijo)

**Zaščitena polja v `profiles` tabeli:**
- `is_pro`
- `subscription_status`
- `pro_since`
- `trial_used`
- `trial_ends_at`
- `stripe_subscription_id`
- `stripe_customer_id`
- `cancel_at_period_end`
- `current_period_end`

### 2. Backend Serverless Functions (Vercel)

#### 📁 Struktura API

```
api/
├── stripe-webhook.ts           # Stripe webhook handler
├── verify-tiktok-challenge.ts  # TikTok verification endpoint
└── lib/
    └── auth-middleware.ts      # JWT authentication middleware
```

#### 🔗 Endpoint: `/api/stripe-webhook`

**Funkcionalnost:**
- ✅ Verifikacija Stripe webhook signature (preprečuje ponarejanje)
- ✅ Avtomatska posodobitev PRO statusa ob plačilu
- ✅ Obdelava dogodkov:
  - `checkout.session.completed` - Aktivacija PRO ob uspešnem plačilu
  - `customer.subscription.updated` - Posodobitev statusa naročnine
  - `customer.subscription.deleted` - Preklica PRO dostopa

**Varnost:**
- Uporablja Service Role Key za RLS bypass
- Verificira webhook signature z `STRIPE_WEBHOOK_SECRET`
- Logira vse aktivnosti

#### 🎵 Endpoint: `/api/verify-tiktok-challenge`

**Funkcionalnost:**
- ✅ Prejme TikTok video link od uporabnika
- ✅ Pošlje email obvestilo adminu (info@studko.si)
- ✅ Opcijsko: Discord obvestilo
- ✅ NE odobri avtomatsko - zahteva ročno preverjanje

**Varnost:**
- Zahteva JWT avtentikacijo (Supabase token)
- Preveri, da uporabnik nima že aktivne prijave
- Validira TikTok URL format
- Preveri, da uporabnikov ID v tokenu ustreza ID v requestu

**Manual Approval Process:**
1. Poglej TikTok video
2. V Supabase:
   - `social_claims` → Nastavi `status = 'approved'`
   - `profiles` → Nastavi `is_pro = true`, `pro_expires_at = NOW() + 30 days`

#### 🔒 Auth Middleware

**Uporaba:**

```typescript
import { withAuth, withProAccess } from './lib/auth-middleware';

// Zahteva samo avtentikacijo
export default withAuth(async (req, res, user) => {
  return res.json({ userId: user.id });
});

// Zahteva PRO dostop
export default withProAccess(async (req, res, user) => {
  return res.json({ premiumFeature: true });
});
```

**Funkcije:**
- `withAuth()` - Verificira JWT token
- `withProAccess()` - Dodatno preveri PRO status
- `checkRateLimit()` - Rate limiting po IP/user ID

---

## 🔑 Environment Variables (Vercel)

### ⚠️ POMEMBNO: Nastavi kot **Server Environment Variables**

V Vercel Dashboard → Project Settings → Environment Variables nastavi:

### Stripe
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Kako dobiti webhook secret:**
1. Pojdi na [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Ustvari nov webhook endpoint: `https://tvoja-domena.vercel.app/api/stripe-webhook`
3. Izberi dogodke:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Kopiraj "Signing secret"

### Supabase
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### Resend (Email)
```env
RESEND_API_KEY=re_...
ADMIN_EMAIL=info@studko.si
```

**Setup:**
1. Pojdi na [Resend Dashboard](https://resend.com/api-keys)
2. Ustvari API key
3. Dodaj in verifikuj domeno `studko.si`

### Discord (Opcijsko)
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 🚀 Deployment

### 1. Naloži Supabase Migracije

```bash
# V terminalu
cd supabase
npx supabase db push
```

### 2. Deploy na Vercel

```bash
# Če še nisi povezal projekta
vercel

# Za production deploy
vercel --prod
```

### 3. Nastavi Environment Variables

1. Pojdi na Vercel Dashboard
2. Izberi svoj projekt → Settings → Environment Variables
3. Dodaj VSE zgoraj naštete spremenljivke
4. Redeploy projekt, da se spremenljivke uporabijo

### 4. Konfiguriraj Stripe Webhook

1. Stripe Dashboard → Webhooks
2. Add endpoint: `https://studko.vercel.app/api/stripe-webhook`
3. Izberi dogodke (kot zgoraj)
4. Kopiraj webhook secret in dodaj v Vercel env vars
5. Testni webhook s "Send test webhook"

---

## 🛡️ Varnostni Checklist

- ✅ RLS omogočen na VSEH tabelah
- ✅ `is_pro` lahko spreminja samo service role
- ✅ Stripe webhook uporablja signature verification
- ✅ JWT authentication na TikTok endpoint
- ✅ Rate limiting implementiran
- ✅ Security audit logging
- ✅ HTTPS only (Vercel avtomatsko)
- ✅ HTTP security headers (že v `vercel.json`)
- ✅ Service Role Key shranjen kot server env var (nikoli v klienta)

---

## 📊 Monitoring

### Supabase Logs
```sql
-- Preveri PRO status spremembe
SELECT * FROM security_audit_log 
WHERE action = 'pro_status_change' 
ORDER BY created_at DESC 
LIMIT 50;
```

### Vercel Logs
1. Vercel Dashboard → Project → Logs
2. Filtriraj po `/api/stripe-webhook` ali `/api/verify-tiktok-challenge`

---

## 🔐 Dodatne Varnostne Priporočila

### 1. HTTP-Only Cookies (Opcijsko)
Trenutno uporabljaš `localStorage` za Supabase token. Za dodatno varnost lahko uporabljaš HTTP-only cookies:

```typescript
// V Supabase konfiguraciji
const supabase = createClient(url, key, {
  auth: {
    storage: customCookieStorage, // Custom implementation
    autoRefreshToken: true,
    persistSession: true,
  }
});
```

### 2. Content Security Policy
Že implementirana v `vercel.json` ✅

### 3. Redni Security Audit
- Pregleduj Supabase logs vsaj enkrat na teden
- Spremljaj nenavadne aktivnosti (hitri API klici, neobičajni časovni vzorci)
- Nastavi alerte za spremembe PRO statusa

### 4. Backup
```bash
# Ustvari backup Supabase baze
npx supabase db dump -f backup.sql
```

---

## 📞 Support & Troubleshooting

### Stripe webhook ne deluje
1. Preveri Stripe webhook logs v Stripe Dashboard
2. Preveri Vercel function logs
3. Testni webhook: `curl -X POST https://studko.vercel.app/api/stripe-webhook`

### TikTok verification ne pošlje emaila
1. Preveri Resend API key
2. Preveri, da je domena verificirana
3. Preveri Resend logs v Resend Dashboard

### RLS blokira uporabnika
1. Preveri policies: `\dp profiles` v Supabase SQL Editor
2. Preveri JWT token veljavnost
3. Preveri logs v `security_audit_log`

---

## ✅ Implementacija Končana

- ✅ RLS politike za vse tabele
- ✅ PRO status protection
- ✅ Stripe webhook automation
- ✅ TikTok verification workflow
- ✅ JWT authentication middleware
- ✅ Security audit logging
- ✅ Rate limiting
- ✅ Email notifications
- ✅ Discord notifications

**Sistem je zdaj varen in pripravljen na produkcijo! 🚀**
