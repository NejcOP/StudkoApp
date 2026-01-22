# 📧 Slovenske Email Predloge - Študko

## ✅ Implementirane Predloge (React Email)

Vse predloge so **100% v slovenščini** z modernim, študentom prijaznim tonom.

### 📁 Struktura

```
emails/
├── welcome.tsx                 # Dobrodošlica in potrditev računa
├── reset-password.tsx          # Ponastavitev gesla
├── pro-activation.tsx          # Študko PRO aktivacija
├── payout-confirmation.tsx     # Potrditev izplačila
└── email-change.tsx            # Sprememba e-naslova

api/
└── send.ts                     # Unified API endpoint
```

---

## 🎨 Design

**Barve:**
- Glavna: `#7C3AED` (Študko vijolična)
- Темна: `#6D28D9`
- Font: System fonts (Apple/Google/Microsoft)

**Značilnosti:**
- ✅ Responsive dizajn
- ✅ Emojiji v naslovih
- ✅ Čist, moderen izgled
- ✅ Veliki gumbi za akcije
- ✅ Varnostna opozorila

---

## 📚 Predloge

### 1. **Dobrodošlica** (`welcome.tsx`)

**Zadeva:** `Dobrodošel/a na Študku! 📚 Potrdi svoj e-mail`

**Props:**
```typescript
{
  userName: string;       // Ime uporabnika
  confirmLink: string;    // Povezava za potrditev
}
```

**Vsebina:**
- Prijeten pozdrav
- Gumb "Potrdi moj račun"
- Varnostno opozorilo (povezava veljavna 24h)

---

### 2. **Ponastavitev Gesla** (`reset-password.tsx`)

**Zadeva:** `Navodila za ponastavitev gesla 🔑`

**Props:**
```typescript
{
  userName: string;
  resetLink: string;
}
```

**Vsebina:**
- "Nič ne skrbi, vsem se zgodi" 😊
- Gumb "Ustvari novo geslo"
- Opozorilo: povezava poteče v 1 uri

---

### 3. **PRO Aktivacija** (`pro-activation.tsx`)

**Zadeva:** `Tvoj Študko PRO je tu! 🔥`

**Props:**
```typescript
{
  userName: string;
}
```

**Vsebina:**
- Čestitka za nadgradnjo
- Seznam PRO ugodnosti:
  - ✨ Neomejen AI asistent
  - 📝 Neomejeni povzetki
  - 🎯 Premium kvizi
  - 🚫 Brez oglasov
  - ⚡ Prednost pri novih funkcijah
- Gumb "Začni raziskovati"

---

### 4. **Potrditev Izplačila** (`payout-confirmation.tsx`)

**Zadeva:** `Tvoj zahtevek za izplačilo je prejet! 💸`

**Props:**
```typescript
{
  userName: string;
  amount: number;         // Znesek v EUR
  method: string;         // IBAN, PayPal, Revolut...
}
```

**Vsebina:**
- "Bravo! Tvoj zaslužek je na poti"
- Prikaz podrobnosti (znesek, način, status)
- Rok: 3-5 delovnih dni
- Nasvet za nadaljnjo prodajo

---

### 5. **Sprememba E-naslova** (`email-change.tsx`)

**Zadeva:** `Potrdi spremembo e-poštnega naslova 📧`

**Props:**
```typescript
{
  userName: string;
  newEmail: string;
  confirmLink: string;
}
```

**Vsebina:**
- Prikaz novega e-naslova
- Gumb "Potrdi spremembo"
- Varnostno opozorilo (spremeni geslo če nisi ti)

---

## 🚀 Uporaba

### API Endpoint: `/api/send`

**Request:**
```typescript
POST /api/send

{
  "type": "welcome" | "reset-password" | "pro-activation" | "payout" | "email-change",
  "to": "user@example.com",
  "data": {
    // Template-specific data
  }
}
```

### Primeri

#### 1. Pošlji Dobrodošlico

```typescript
await fetch('/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'welcome',
    to: 'user@example.com',
    data: {
      userName: 'Nejc',
      confirmLink: 'https://studko.si/auth/confirm?token=...'
    }
  })
});
```

#### 2. Reset Gesla

```typescript
await fetch('/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'reset-password',
    to: 'user@example.com',
    data: {
      userName: 'Nejc',
      resetLink: 'https://studko.si/auth/reset-password?token=...'
    }
  })
});
```

#### 3. PRO Aktivacija

```typescript
await fetch('/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'pro-activation',
    to: 'user@example.com',
    data: {
      userName: 'Nejc'
    }
  })
});
```

#### 4. Potrditev Izplačila

```typescript
await fetch('/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'payout',
    to: 'user@example.com',
    data: {
      userName: 'Nejc',
      amount: 25.50,
      method: 'IBAN'
    }
  })
});
```

#### 5. Sprememba E-naslova

```typescript
await fetch('/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'email-change',
    to: 'old-email@example.com',
    data: {
      userName: 'Nejc',
      newEmail: 'new-email@example.com',
      confirmLink: 'https://studko.si/auth/confirm?token=...'
    }
  })
});
```

---

## 🔧 Setup

### 1. Namesti Dependencies

```bash
npm install @react-email/components @react-email/render
```

### 2. Environment Variables (Vercel)

```env
RESEND_API_KEY=re_...
```

### 3. Deploy

```bash
git add .
git commit -m "Add React Email templates"
git push
```

Vercel bo avtomatsko deployal.

---

## 🎨 Prilagajanje

### Spremeni Barve

V vsaki `.tsx` datoteki najdi style objekte:

```typescript
const header = {
  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
  // Spremeni barve tukaj
};

const button = {
  backgroundColor: '#7C3AED',
  // Spremeni barvo gumba
};
```

### Dodaj Nov Template

1. Ustvari `emails/my-template.tsx`
2. Kopiraj strukturo iz obstoječe predloge
3. Dodaj v `/api/send.ts`:

```typescript
import MyTemplate from '../../emails/my-template';

// V switch statement:
case 'my-type':
  subject = 'Moj naslov';
  emailHtml = render(
    MyTemplate({ ...body.data })
  );
  break;
```

---

## 🧪 Testiranje

### Preview Emails Lokalno

```bash
# Namesti React Email CLI
npm install -g @react-email/cli

# Odpri preview
npx email dev
```

Odpre se na `http://localhost:3000` s preview vseh email predlog.

---

## 📊 Monitoring

### Preveri Poslane Emaile

**Resend Dashboard:**
https://resend.com/emails

**Vercel Logs:**
```bash
vercel logs --follow
```

---

## 🌍 Slovenska Terminologija

| Angleško | Slovensko (uporabljeno) |
|----------|------------------------|
| Subscription | Naročnina |
| Dashboard | Nadzorna plošča / Dashboard |
| Premium | PRO |
| Password reset | Ponastavitev gesla |
| Payout | Izplačilo |
| Settings | Nastavitve |
| Account | Račun |
| Email | E-naslov / E-pošta |

---

## ✅ Implementacija Končana

**Vse email predloge so pripravljene in v slovenščini!** 🇸🇮

**Značilnosti:**
- ✅ 100% slovenščina
- ✅ Študentom prijazen ton ("ti" oblika)
- ✅ Moderna vijolična tema
- ✅ React Email komponente
- ✅ Unified API endpoint
- ✅ Responsive dizajn
- ✅ Emojiji in ikone
- ✅ Varnostna opozorila

**Naslednji korak:** Namesti dependencies in deploy!

```bash
npm install @react-email/components @react-email/render
git add .
git commit -m "Add Slovenian React Email templates"
git push
```

🚀 **Študko email sistem je pripravljen!**
