# ✅ PAYMENT TESTING CHECKLIST - STUDKO

## 📊 PROVIZIJSKA STRUKTURA (POTRJENO)

| Tip plačila | Provizija platforme | Prejemnik 80% | Status |
|------------|---------------------|---------------|--------|
| **Zapisi** | 20% | Prodajalec (Stripe Connect) | ✅ Implementirano |
| **Tutoring** | 20% | Inštruktor (Stripe Connect) | ✅ Implementirano |
| **PRO Naročnina** | 100% | Platforma | ✅ Implementirano |

---

## 🧪 KAKO TESTIRATI (PRED PRODUKCIJO)

### 1️⃣ **TEST ZAPISKOV - Note Purchase**

**Ko testiraš:**
1. Prijavi se kot uporabnik A
2. Uporabnik A naloži zapis (cena: 5 EUR)
3. Uporabnik A nastavi Stripe Connect (izplačila)
4. Prijavi se kot uporabnik B
5. Kupi zapis uporabnika A

**Kaj preveriti:**
- ✅ Stripe checkout odpre
- ✅ Plačilo uspe (uporabi test card: `4242 4242 4242 4242`)
- ✅ Zapis se pojavi v "Kupljeni zapiski" (uporabnik B)
- ✅ Uporabnik B lahko prenese datoteko
- ✅ V `note_purchases` tabeli je nov zapis
- ✅ V Stripe dashboard:
  - Platform prejme **1.00 EUR** (20%)
  - Uporabnik A prejme **4.00 EUR** (80%) na svoj Connect accoun

**Test URL:** `https://studko.si/notes/{note_id}`

---

### 2️⃣ **TEST TUTORING - Instructor Payment**

**Ko testiraš:**
1. Prijavi se kot inštruktor
2. Inštruktor nastavi Stripe Connect (izplačila)
3. Prijavi se kot študent
4. Rezerviraj uro pri inštruktorju (cena: 20 EUR)
5. Inštruktor potrdi rezervacijo
6. Študent plača

**Kaj preveriti:**
- ✅ Stripe checkout odpre
- ✅ Plačilo uspe
- ✅ Booking status spremeni na `paid: true`
- ✅ Inštruktor prejme email obvestilo
- ✅ V Stripe dashboard:
  - Platform prejme **4.00 EUR** (20%)
  - Inštruktor prejme **16.00 EUR** (80%)

**Test URL:** `https://studko.si/profile?tab=bookings`

---

### 3️⃣ **TEST PRO NAROČNINE - Subscription**

**Ko testiraš:**
1. Prijavi se kot nov uporabnik
2. Poskusi uporabljati AI funkcije (bo rekel da rabiš PRO)
3. Klikni "Nadgradi na PRO"
4. Izberi "Start 7-day free trial"

**Kaj preveriti:**
- ✅ Stripe checkout odpre
- ✅ Trial aktiviran (7 dni)
- ✅ `trial_used = true` v bazi
- ✅ Lahko uporabljaš AI funkcije
- ✅ Po 7 dneh se avtomatsko zaračuna 3.49 EUR
- ✅ V Stripe dashboard:
  - Platform prejme **3.49 EUR** (100%)
- ✅ Uporabnik prejme "Dobrodošel v PRO" email

**Test trial uporabe:**
- Poskusi ponovno aktivirati trial → NE SME DELOVATI
- `trial_used` mora ostati `true`

**Test URL:** `https://studko.si/profile?tab=subscription`

---

## 🔧 STRIPE WEBHOOK SETUP

### Trenutna konfiguracija:

**Vercel API Endpoint:**
```
https://studko.si/api/stripe-webhook
```

**Required Events:**
- ✅ `checkout.session.completed` - Note purchases, tutoring, subscriptions
- ✅ `customer.subscription.updated` - PRO status spremembe
- ✅ `customer.subscription.deleted` - Preklic PRO

**Kaj moraš narediti:**

1. **Stripe Dashboard** → Developers → Webhooks
2. Dodaj endpoint: `https://studko.si/api/stripe-webhook`
3. Izberi events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Kopiraj **Webhook signing secret**
5. Dodaj v Vercel env vars → `STRIPE_WEBHOOK_SECRET`

---

## 🚨 POTENCIALNE TEŽAVE

### Problem: "Seller has not set up payment account"
**Rešitev:** 
- Prodajalec/inštruktor mora nastaviti Stripe Connect
- Profile → Nastavitve → "Omogoči izplačila"
- Zaključi Stripe onboarding

### Problem: Webhook ni prejel
**Preveriti:**
- Je `STRIPE_WEBHOOK_SECRET` nastavljen v Vercel?
- Je webhook URL pravilen?
- Preveri Stripe Dashboard → Webhooks → Recent deliveries

### Problem: Plačilo uspelo, ampak notes purchase ni v bazi
**Preveriti:**
- RLS policy za `note_purchases` dovoljuje service role INSERT
- Webhook ima `SUPABASE_SERVICE_ROLE_KEY` env var
- Preveri webhook logs v Vercel

### Problem: Inštruktor ne prejme denarja
**Preveriti:**
- Inštruktor je zaključil Stripe Connect onboarding
- `profiles.stripe_connect_id` ni NULL
- Application fee je pravilno nastavljen (20%)

---

## 📝 STRIPE TEST CARDS

```
Uspešno plačilo:
4242 4242 4242 4242

3D Secure (zahteva dodatno potrditev):
4000 0027 6000 3184

Declined card:
4000 0000 0000 0002

Insufficient funds:
4000 0000 0000 9995
```

Vse kartice:
- Expiry: Katerikoli datum v prihodnosti (npr. 12/34)
- CVC: Katerakoli 3 števila (npr. 123)
- Poštna št.: Katerakoli (npr. 12345)

---

## ✅ KONČNI CHECK PRED PRODUKCIJO

- [ ] Vse 3 payment flows testirane z test cards
- [ ] Webhook events prejeti in processirani
- [ ] Stripe Connect onboarding deluje za inštruktorje/prodajalce
- [ ] Emails poslani po uspešnih plačilih
- [ ] Note purchases zapisani v bazo
- [ ] Tutoring bookings označeni kot `paid: true`
- [ ] PRO trial deluje in ne more biti ponovno aktiviran
- [ ] Provizije pravilno razdeljene (20% platform, 80% prejemnik)
- [ ] Stripe Dashboard prikazuje pravilne transakcije

---

## 🎉 KO JE VSE TESTIRANO

1. **Spremeni iz TEST v LIVE mode:**
   - Stripe Dashboard → Toggle "View live data"
   - Spremeni API ključe v produkcijske

2. **Posodobi Vercel env variables:**
   ```
   STRIPE_SECRET_KEY=sk_live_...
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=(new live webhook secret)
   ```

3. **Ustvari nov webhook za produkcijo:**
   - Stripe Dashboard (LIVE mode) → Webhooks
   - Add endpoint: `https://studko.si/api/stripe-webhook`
   - Same events kot prej

4. **Trigger Vercel redeploy**

---

**Datum testiranja:** _________________
**Tester:** _________________
**Status:** ⬜ Vse OK | ⬜ Potrebne popravke

