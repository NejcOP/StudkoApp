# Sistem 7-dnevnega preizkusa

## Pregled

Uporabniki lahko aktivirajo 7-dnevni brezplačni preizkus Študko PRO **samo enkrat**. Ko uporabnik enkrat uporabi preizkus, ne more več dobiti drugega preizkusa, tudi če prekliče naročnino in se ponovno naroči.

## Kako deluje

### 1. Preverjanje statusa preizkusa

Ko uporabnik želi začeti naročnino, sistem preveri `trial_used` polje v profilu uporabnika:

```typescript
// V create-subscription-checkout funkciji
const hasUsedTrialDb = profile?.trial_used || 
  (profile?.trial_ends_at && new Date(profile.trial_ends_at) < new Date());
```

### 2. Ustvarjanje Stripe Checkout Session

- Če `trial_used = false`: Uporabnik dobi 7-dnevni preizkus (`trial_period_days: 7`)
- Če `trial_used = true`: Uporabnik začne z plačljivo naročnino brez preizkusa

Pomembno: Funkcija uporablja **vrednost iz baze podatkov**, ne vrednost iz frontenda, da prepreči poskuse manipulacije.

### 3. Označevanje uporabljenega preizkusa

Ko Stripe webhook prejme `checkout.session.completed` dogodek:

```typescript
// V stripe-webhook funkciji
if (subscription.status === 'trialing') {
  updateData.trial_used = true;
  updateData.trial_ends_at = trialEndsAt;
}
```

### 4. Zaščita na ravni baze podatkov

Database trigger `protect_pro_status` preprečuje spreminjanje PRO-povezanih polj (vključno z `trial_used`) s strani običajnih uporabnikov:

```sql
-- Samo service role (webhook) lahko spreminja trial_used
NEW.trial_used := OLD.trial_used;
```

## Varnostne funkcije

### 1. Avtoritativni vir resnice
- `create-subscription-checkout` VEDNO preveri `trial_used` v bazi podatkov
- Vrednost iz frontenda se uporablja samo kot začetni indikator, ne kot končna odločitev

### 2. Database-level zaščita
- Trigger `protect_pro_status` blokira vse poskuse spreminjanja `trial_used` od običajnih uporabnikov
- Samo service role (Stripe webhook) lahko posodobi PRO-povezana polja

### 3. Enosmerno označevanje
- `trial_used` se lahko spremeni samo iz `false` → `true`
- Ni nobene kode, ki bi mogla resetirati `trial_used` nazaj na `false`

### 4. Ohranitev statusa po preklicu
- Ko uporabnik prekliče naročnino, se `trial_used` ohrani na `true`
- Če se uporabnik ponovno naroči, ne dobi novega preizkusa

## Potek uporabnika

### Scenarij 1: Novi uporabnik
1. Uporabnik se registrira → `trial_used = false`
2. Klikne "Nadgradi na PRO (7-dnevni preizkus)"
3. Sistem preveri DB → `trial_used = false` → dodeli preizkus
4. Stripe ustvari naročnino s statusom `trialing`
5. Webhook nastavi `trial_used = true`
6. Uporabnik ima 7 dni brezplačnega dostopa

### Scenarij 2: Uporabnik po preklicu
1. Uporabnik prekliče naročnino → `trial_used` ostane `true`
2. Uporabnik se odjavi in ponovno prijavi
3. Klikne "Nadgradi na PRO"
4. Sistem preveri DB → `trial_used = true` → brez preizkusa
5. Stripe ustvari naročnino s statusom `active` (brez trialing)
6. Uporabnik takoj začne plačati brez preizkusa

### Scenarij 3: Poskus manipulacije
1. Uporabnik poskuša spremeniti `trial_used` v browser dev tools
2. Pošlje `trialUsed: false` v API call
3. `create-subscription-checkout` ignorira frontend vrednost
4. Preveri DB → `trial_used = true` → brez preizkusa
5. Stripe ustvari naročnino brez preizkusa

## Datoteke in funkcije

### Frontend
- **src/pages/AIAssistant.tsx** - Preveri `trial_used` pred preusmeritviijo
- **src/components/SubscriptionUpgrade.tsx** - Prikaže pravilen gumb glede na status
- **src/pages/Profile.tsx** - Prikaže status naročnine in trial opcije

### Backend
- **supabase/functions/create-subscription-checkout/index.ts** - Ustvari Stripe session z/brez preizkusa
- **supabase/functions/stripe-webhook/index.ts** - Nastavi `trial_used` po aktivaciji
- **api/stripe-webhook.js** - Backup webhook (Node.js verzija)

### Database
- **supabase/migrations/20260110000001_add_trial_used.sql** - Doda `trial_used` stolpec
- **supabase/migrations/20260122000001_secure_pro_status.sql** - Zaščiti PRO polja s triggerji

## Testiranje

### Test 1: Prvi preizkus
```bash
1. Registriraj novega uporabnika
2. Preveri: `trial_used = false` v DB
3. Začni naročnino
4. Preveri: Stripe session ima `trial_period_days: 7`
5. Preveri: Po plačilu `trial_used = true` v DB
```

### Test 2: Ponovni poskus
```bash
1. Uporabnik z `trial_used = true` 
2. Prekliči naročnino
3. Ponovno začni naročnino
4. Preveri: Stripe session NIMA `trial_period_days`
5. Preveri: `trial_used` ostane `true` v DB
```

### Test 3: Security test
```bash
1. Poskusi direktno UPDATE na profiles tabeli
2. Preveri: Trigger blokira spremembo `trial_used`
3. Preveri: `trial_used` ostane nespremenjen
```

## Logiranje

Funkcije logirajo pomembne dogodke:

```typescript
console.log('Trial status check:', { 
  trialUsedFromClient: trialUsed, 
  trialUsedFromDb: profile?.trial_used,
  finalTrialUsed: actualTrialUsed 
});
```

To omogoča enostavno debugiranje in preverjanje, da sistem pravilno deluje.

## Zaključek

Sistem zagotavlja, da lahko uporabniki aktivirajo 7-dnevni preizkus samo enkrat, z večplastno zaščito:
- Database-level triggeri
- Server-side preverjanje
- Enosmerno označevanje
- Service role omejitve

Ta implementacija preprečuje zlorabo sistema in zagotavlja poštenost za vse uporabnike.
