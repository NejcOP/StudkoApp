import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Stripe } from "https://deno.land/x/stripe@v1.2.0/mod.ts";

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY ni nastavljen v okolju!');
  throw new Error('Stripe skrivni ključ ni nastavljen.');
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-11-15',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, email } = await req.json()
    console.log('stripe-connect-onboarding request:', { userId, email })

    // 1. Ustvarimo Stripe Connect račun za študenta, če ga še nima
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // 2. Ustvarimo link za onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get('origin')}/profile`,
      return_url: `${req.headers.get('origin')}/profile?stripe=success&account_id=${account.id}`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url, accountId: account.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('stripe-connect-onboarding ERROR:', error)
    return new Response(JSON.stringify({ error: error.message, details: error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})