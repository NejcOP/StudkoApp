# 🧪 MANUAL PAYMENT TESTING GUIDE

## Stvari, ki jih MORAŠ preveriti ROČNO:

### ✅ 1. **STRIPE CONNECT SETUP** (Najprej!)

**Prodajalec/Inštruktor:**
1. Prijavi se na https://studko.si
2. Pojdi na Profile → Nastavitve
3. Klikni "Omogoči izplačila" / "Setup Payouts"
4. Zaključi Stripe Connect onboarding
5. Preveri da vidiš ✅ "Stripe račun povezan"

---

### 💳 2. **TEST NOTE PURCHASE** 

**UPORABNIK A (Prodajalec):**
```
1. Prijava na studko.si
2. Naloži TESTNI zapis:
   - Naziv: "Test zapis za plačilo"
   - Cena: 5.00 EUR
   - Naloži PDF dokument
3. Preveri da je "Stripe račun povezan" ✅
4. Kopiraj URL zapiska (npr. studko.si/notes/123)
```

**UPORABNIK B (Kupec):**
```
1. Prijava na studko.si (DRUG uporabnik!)
2. Pojdi na URL zapiska (studko.si/notes/123)
3. Klikni "Kupi zapisek"
4. STRIPE CHECKOUT bo odprl
5. Uporabi test card:
   Card: 4242 4242 4242 4242
   Expiry: 12/34
   CVC: 123
6. Zaključi plačilo
```

**KAJ PREVERITI:**
- [ ] Stripe checkout se je odprl?
- [ ] Plačilo je uspelo?
- [ ] Redirect nazaj na studko.si?
- [ ] Kupec vidi zapis v "Kupljeni zapiski"?
- [ ] Kupec lahko prenese PDF?
- [ ] Prodajalec vidi prodajo v "Moji zapiski"?

**PREVERI V SUPABASE:**
```sql
-- Pojdi v Supabase → SQL Editor
SELECT * FROM note_purchases ORDER BY created_at DESC LIMIT 5;
```
Moral bi videti nov vnos!

**PREVERI V STRIPE:**
- Stripe Dashboard → Payments
- Moral bi videti plačilo 5.00 EUR
- Application Fee: 1.00 EUR (20%)
- Connect Account: 4.00 EUR (80%)

---

### 👨‍🏫 3. **TEST TUTORING PAYMENT**

**INŠTRUKTOR:**
```
1. Prijava na studko.si
2. Preveri "Stripe račun povezan" ✅
3. Počakaj na rezervacijo študenta...
```

**ŠTUDENT:**
```
1. Najdi inštruktorja (npr. studko.si/tutors)
2. Rezerviraj uro
3. Počakaj da inštruktor potrdi...
```

**INŠTRUKTOR:**
```
4. Pojdi na Profile → Inštruktor Dashboard
5. Potrdi rezervacijo študenta
```

**ŠTUDENT:**
```
4. Pojdi na Profile → Moje rezervacije
5. Klikni "Plačaj"
6. STRIPE CHECKOUT bo odprl
7. Uporabi test card: 4242 4242 4242 4242
8. Zaključi plačilo
```

**KAJ PREVERITI:**
- [ ] Stripe checkout se je odprl?
- [ ] Plačilo je uspelo?
- [ ] Status rezervacije = "Plačano" ✅
- [ ] Inštruktor prejme email obvestilo?
- [ ] Študent vidi rezervacijo kot "Plačano"?

**PREVERI V SUPABASE:**
```sql
SELECT * FROM tutor_bookings WHERE paid = true ORDER BY created_at DESC LIMIT 5;
```

**PREVERI V STRIPE:**
- Plačilo 20.00 EUR
- Application Fee: 4.00 EUR (20%)
- Connect Account: 16.00 EUR (80%)

---

### 🎓 4. **TEST PRO SUBSCRIPTION**

**NOV UPORABNIK (ki še ni uporabljal triala):**
```
1. Registracija na studko.si
2. Poskusi uporabiti AI Assistant
3. Klikni "Nadgradi na PRO"
4. Stripe checkout bo odprl
5. Uporabi test card: 4242 4242 4242 4242
6. Zaključi plačilo
```

**KAJ PREVERITI:**
- [ ] Stripe checkout prikaže "7-day free trial"?
- [ ] Plačilo uspelo (brez zaračunavanja)?
- [ ] Uporabnik ima PRO dostop?
- [ ] Lahko uporablja AI funkcije?
- [ ] Prejel email "Dobrodošel v PRO"?
- [ ] V profilu pri "Naročnina" piše "Active (Trial)"?

**PREVERI V SUPABASE:**
```sql
SELECT id, full_name, is_pro, trial_used, subscription_status, trial_ends_at 
FROM profiles 
WHERE is_pro = true 
ORDER BY created_at DESC 
LIMIT 5;
```

Moral bi videti:
- `is_pro = true`
- `trial_used = true`
- `subscription_status = 'trialing'`
- `trial_ends_at` = čez 7 dni

**PREVERI V STRIPE:**
- Dashboard → Customers
- Subscription z "trialing" status
- Po 7 dneh bo avtomatsko charged 3.49 EUR

**POMEMBNO TEST:**
```
Poskusi PONOVNO aktivirati trial (z istim uporabnikom):
→ NE SME delovati! ("Trial already used")
```

---

### 🔗 5. **TEST STRIPE WEBHOOK**

**Preveri Vercel logs:**
```
1. Vercel Dashboard → studko project
2. Logs
3. Išči "✅" in "❌" v logih
4. Pri uspešnem plačilu moraš videti:
   - "✅ SUPABASE USPEH"
   - "✅ PRO STATUS POSODOBLJEN"
   - "✅ Email poslan"
```

**Preveri Stripe webhook logs:**
```
1. Stripe Dashboard → Developers → Webhooks
2. Klikni na webhook endpoint
3. Išči "Recent deliveries"
4. Vse morajo biti zelene (200 status)
5. Rdeče (4xx, 5xx) = napaka!
```

**Če webhook ne deluje:**
- Preveri `STRIPE_WEBHOOK_SECRET` v Vercel env vars
- Preveri webhook URL: `https://studko.si/api/stripe-webhook`
- Preveri da so dogodki izbrani (checkout.session.completed, itd.)

---

## 🚨 COMMON ERRORS & FIXES

### "Seller has not set up payment account"
**Vzrok:** Prodajalec/inštruktor ni končal Stripe Connect
**Fix:** Zaključi Stripe onboarding v Profile settings

### "Missing authorization header"
**Vzrok:** Ni prijave v aplikacijo
**Fix:** Logout + Login

### Plačilo uspelo, ampak podatki niso v bazi
**Vzrok:** Webhook ni procesiran
**Fix:** 
1. Preveri Vercel logs
2. Preveri Stripe webhook logs
3. Preveri `STRIPE_WEBHOOK_SECRET`

### Inštruktor ne prejme denarja
**Vzrok:** Connect account ni pravilno nastavljen
**Fix:** Ponovno zaključi Stripe Connect onboarding

---

## ✅ FINAL CHECKLIST

- [ ] Note purchase deluje (zapis kupljen, viden v "Kupljeni")
- [ ] Tutoring payment deluje (rezervacija plačana)
- [ ] PRO trial deluje (7 dni free)
- [ ] PRO trial ne more biti ponovno aktiviran
- [ ] Vsi webhooks prejeti (preveri Stripe dashboard)
- [ ] Emaili poslani (preveri inbox)
- [ ] Provizije pravilne (20% platform, 80% prejemnik)
- [ ] Vercel logs brez napak

---

**Ko je vse OK, spremeni iz TEST v PRODUCTION:**
- [ ] Stripe Dashboard → Spremeni v "View live data"
- [ ] Generiraj nove production API ključe
- [ ] Posodobi Vercel env vars
- [ ] Ustvari nov production webhook
- [ ] Test ENO zadnjo transakciijo z real card
- [ ] GO LIVE! 🚀

