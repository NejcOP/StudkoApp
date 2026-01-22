# 🔐 Študko Security Implementation - Quick Start

## ✅ Implementirane Komponente

### 1. Database Security
- **Migracija**: [supabase/migrations/20260122000001_secure_pro_status.sql](supabase/migrations/20260122000001_secure_pro_status.sql)
- **Status**: ✅ Pripravljena za deploy
- **Funkcionalnost**:
  - RLS politike, ki preprečujejo uporabnikom spreminjati svoj `is_pro` status
  - Samo service role (Stripe webhook) lahko posodablja PRO status
  - Audit logging vseh sprememb PRO statusa

### 2. Stripe Webhook
- **File**: [api/stripe-webhook.ts](api/stripe-webhook.ts)
- **Status**: ✅ Pripravljena za deploy
- **Endpoint**: `/api/stripe-webhook`
- **Funkcionalnost**:
  - Verifikacija webhook signature
  - Avtomatska aktivacija PRO ob plačilu
  - Posodobitev statusa naročnine
  - Preklica PRO dostopa ob preklicu

### 3. TikTok Verification
- **File**: [api/verify-tiktok-challenge.ts](api/verify-tiktok-challenge.ts)
- **Status**: ✅ Pripravljena za deploy
- **Endpoint**: `/api/verify-tiktok-challenge`
- **Funkcionalnost**:
  - Prejme TikTok video link
  - Pošlje email adminu (info@studko.si)
  - Opcijsko Discord obvestilo
  - Ročno odobravanje (ni avtomatsko)

### 4. Auth Middleware
- **File**: [api/lib/auth-middleware.ts](api/lib/auth-middleware.ts)
- **Status**: ✅ Pripravljena za uporabo
- **Funkcije**:
  - `withAuth()` - JWT authentication
  - `withProAccess()` - PRO status verification
  - `checkRateLimit()` - Rate limiting

## 🚀 Deployment Steps

### Korak 1: Deploy Supabase Migracije
```bash
cd supabase
npx supabase db push
```

### Korak 2: Nastavi Vercel Environment Variables
V **Vercel Dashboard → Settings → Environment Variables** dodaj:

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Email
RESEND_API_KEY=re_...
ADMIN_EMAIL=info@studko.si

# Optional: Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Korak 3: Namesti Pakete
```bash
npm install @vercel/node
```

### Korak 4: Deploy na Vercel
```bash
vercel --prod
```

### Korak 5: Konfiguriraj Stripe Webhook
1. Pojdi na [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Dodaj endpoint: `https://studko.vercel.app/api/stripe-webhook`
3. Izberi events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Kopiraj "Signing secret" in dodaj v Vercel env vars

### Korak 6: Testiraj
```bash
# Test Stripe webhook
curl -X POST https://studko.vercel.app/api/stripe-webhook

# Test TikTok verification (potrebuješ JWT token)
curl -X POST https://studko.vercel.app/api/verify-tiktok-challenge \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"...", "videoUrl":"https://tiktok.com/@..."}'
```

## 📚 Dodatna Dokumentacija

- **Celotna varnostna dokumentacija**: [SECURITY_SETUP.md](SECURITY_SETUP.md)
- **API usage examples**: [api/EXAMPLE_USAGE.md](api/EXAMPLE_USAGE.md)
- **Environment variables**: [.env.example](.env.example)

## ⚠️ Pomembno

1. **NIKOLI ne commitaj** `.env` file z resničnimi ključi
2. **Server env vars** nastavi SAMO v Vercel Dashboard (ne v kodi)
3. **Service Role Key** nikoli ne sme biti viden v browserju
4. **Stripe webhook secret** mora biti nastavljen preden testiraš webhook

## 🛡️ Varnostni Checklist

Pre-Production:
- [ ] Supabase migracija deployed
- [ ] Vercel env vars nastavljeni (SERVER side)
- [ ] Stripe webhook konfiguriran in testiran
- [ ] Resend domena verificirana
- [ ] Email obvestila testirana
- [ ] JWT authentication testirana
- [ ] RLS politike preverjene

Post-Production:
- [ ] Monitoring nastavljen
- [ ] Alert sistem aktiven
- [ ] Backup strategija implementirana
- [ ] Redni security audits načrtovani

## 📞 Troubleshooting

**Stripe webhook ne dela**:
- Preveri Stripe webhook logs
- Preveri Vercel function logs
- Validiraj webhook secret

**TikTok email ne pride**:
- Preveri Resend API key
- Validiraj domeno v Resend
- Preveri spam folder

**RLS blokira dostop**:
- Preveri politike v Supabase
- Validiraj JWT token
- Preveri `security_audit_log`

---

**Status**: ✅ Backend infrastruktura pripravljena za produkcijo
**Avtor**: GitHub Copilot
**Datum**: 22.1.2026
