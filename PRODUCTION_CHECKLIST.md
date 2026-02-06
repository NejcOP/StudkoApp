# 🚀 PRODUKCIJSKI KONTROLNI SEZNAM - STUDKO

## ✅ KONČANO

### 1. Varnost okolja (.env)
- ✅ .env odstranjen iz Git tracking
- ✅ .env.local, .env dodan v .gitignore
- ✅ STRIPE_SECRET_KEY odstranjen iz lokalne .env datoteke
- ✅ Spremembe pushnane na GitHub

### 2. Baza podatkov
- ✅ Vsi testni podatki izbrisani
- ✅ Admin račun (info@studko.si) obdržan
- ✅ Admin ima Studko Pro dostop

### 3. Vercel Environment Variables
- ✅ Secret ključi nastavljeni v Vercel Dashboard

---

## ⚠️ PRIPOROČILA PRED OBJAVO

### 🔑 API Ključi

**Če je tvoj GitHub repozitorij JAVNO dostopen (public):**

1. **Stripe ključi - TAKOJ regeneriraj!**
   - Pojdi na: https://dashboard.stripe.com/apikeys
   - Revoke (prekliči) ta ključa:
     - `pk_test_51QlT3pRw...` (Test publishable key)
     - `sk_test_51QlT3pRw...` (Test secret key)
   - Generiraj nove test ključe
   - Posodobi v:
     - ✅ Vercel env vars → `STRIPE_SECRET_KEY`
     - ✅ Lokalna `.env` → `VITE_STRIPE_PUBLISHABLE_KEY`

2. **Supabase ključi - Preveri stanje:**
   - Pojdi na: Supabase Dashboard → Settings → API
   - Preveri če je `anon` key izpostavljen (je bil v .env ki je bil v git)
   - Če da, klikni "Reset API keys" in posodobi:
     - ✅ Vercel env vars → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
     - ✅ Lokalna `.env` → `VITE_SUPABASE_*`

**Če je repozitorij PRIVATEN (private):**
- Ključi so verjetno varni, ampak priporočam da jih vseeno spremeniš za produkcijo

---

### 🎯 Prehod iz TEST v PRODUCTION mode

#### Stripe Production Keys
Ko si pripravljen za produkcijo:

1. Pojdi na Stripe Dashboard → Toggle "View live data" (zgoraj desno)
2. Kopiraj production ključe:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

3. Posodobi ključe:
   ```bash
   # Ustvari produkcijsko .env datoteko
   cp .env .env.production
   ```
   
   Uredi `.env.production`:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY="pk_live_..."
   ```

4. Posodobi Vercel Environment Variables:
   - Nastavi `STRIPE_SECRET_KEY=sk_live_...` za "Production" okolje
   - Trigger Vercel redeploy

#### Stripe Webhook
Nastavi produkcijski webhook:
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://studko.si/api/stripe-webhook`
3. Izberi events: `checkout.session.completed`, `customer.subscription.*`
4. Kopiraj webhook secret
5. Dodaj v Vercel env vars → `STRIPE_WEBHOOK_SECRET`

---

### 🔒 Dodatna Varnostna Priporočila

#### 1. Supabase RLS Policies
- ✅ Že omogočeno na vseh tabelah
- ✅ Admin policies nastavljene
- ✅ Storage policies nastavljene

#### 2. CORS & Domain Restrictions
V Supabase Dashboard → Settings → API:
- Dodaj allowed domain: `https://studko.si`
- Odstrani `localhost` iz production env

#### 3. Storage Bucket Limits
V Supabase Dashboard → Storage:
- Nastavi max file size limits
- Omogoči file type restrictions (samo PDF, slike)

#### 4. Rate Limiting
- ✅ Rate limit tabele že ustvarjene v bazi
- Preveri da Vercel ima rate limiting omogočen

#### 5. Database Backups
V Supabase Dashboard → Database → Backups:
- Omogoči "Point in Time Recovery" (PITR) - če je na plačanem planu
- Ali nastavi cron job za daily backups

---

### 📝 Deployment Checklist

Preden objaviš na produkcijo:

- [ ] Testiraj aplikacijo z PRODUCTION Stripe ključi na staging okolju
- [ ] Preveri da payment flow deluje (test payment s pravo kartico)
- [ ] Pregledaj Supabase logs za napake
- [ ] Preveri da se notifikacije pošiljajo pravilno
- [ ] Testiraj upload datotek (notes, avatars, videos)
- [ ] Preveri da admin panel deluje
- [ ] Testiraj tutor booking proces
- [ ] Pregledaj console za JS errors
- [ ] Preveri mobile responsive design

---

### 🌐 DNS & Domain Setup

Ko objaviš na Vercel:
1. Dodaj custom domain `studko.si`
2. Posodobi DNS records (A/CNAME)
3. Omogoči SSL certificate (automatic)
4. Posodobi `VITE_APP_URL` v Vercel env vars

---

### 📧 Email Configuration

Preveri Supabase Auth Emails:
1. Supabase Dashboard → Authentication → Email Templates
2. Preveri da so vsi emaili v slovenščini (glede na SLOVENIAN_EMAILS.md)
3. Nastavi "From" email na info@studko.si
4. Preveri SMTP settings (Resend integration)

---

## 🎉 Ko je vse končano

1. Naredi final backup celotne baze
2. Dokumentiraj vse API ključe na varnem mestu (password manager)
3. Nastavi monitoring (Vercel Analytics, Sentry)
4. Spremljaj Stripe dashboard za payments
5. Preveri Supabase logs redno

---

**Repo Status:** https://github.com/NejcOP/StudkoApp
**Deployment:** Povezano z Vercel

**Datum zadnje varnostne revizije:** 6. februar 2026
