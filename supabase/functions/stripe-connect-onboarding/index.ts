import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY ni nastavljen v okolju!');
  throw new Error('Stripe skrivni ključ ni nastavljen.');
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    // Read JWT from Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const jwt = authHeader.replace('Bearer ', '');
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    // Get user from JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) throw new Error('Unauthorized');
    const user = userData.user;
    // Parse body
    const { returnUrl, refreshUrl } = await req.json();
    // Check if user already has a Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, full_name, email')
      .eq('id', user.id)
      .single();
    if (profileError) throw new Error('Profile not found');
    let accountId = profile.stripe_connect_account_id;
    let account = null;
    if (!accountId) {
      // Create new Stripe Connect account (Live mode for SI)
      account = await stripe.accounts.create({
        type: 'express',
        email: profile.email,
        country: 'SI',
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      // Save to profile
      await supabase
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id);
    }
    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('stripe-connect-onboarding ERROR:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});