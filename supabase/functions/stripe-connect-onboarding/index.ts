import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const STRIPE_API = 'https://api.stripe.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('PURE FETCH STRIPE EDGE FUNCTION STARTED');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  
  try {
    // Check for Stripe key inside handler to allow CORS
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY ni nastavljen v okolju!');
      throw new Error('Stripe skrivni ključ ni nastavljen.');
    }
    // Read JWT from Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    console.log('Auth header:', authHeader);
    if (!authHeader) throw new Error('No authorization header');
    const jwt = authHeader.replace('Bearer ', '');
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    // Get user from JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    console.log('Supabase userData:', userData, 'userError:', userError);
    if (userError || !userData.user) throw new Error('Unauthorized');
    const user = userData.user;
    // Parse body
    const { returnUrl, refreshUrl } = await req.json();
    console.log('Request body:', { returnUrl, refreshUrl });
    // Check if user already has a Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, full_name, email')
      .eq('id', user.id)
      .single();
    console.log('Profile:', profile, 'profileError:', profileError);
    if (profileError) throw new Error('Profile not found');
    let accountId = profile.stripe_connect_account_id;
    if (!accountId) {
      // Create Stripe Connect account via fetch
      const form = new URLSearchParams({
        type: 'express',
        email: profile.email,
        country: 'SI',
        business_type: 'individual',
        'capabilities[card_payments][requested]': 'true',
        'capabilities[transfers][requested]': 'true',
      });
      const accountRes = await fetch(`${STRIPE_API}/accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      });
      const account = await accountRes.json();
      if (!account.id) throw new Error(account.error?.message || 'Stripe account creation failed');
      accountId = account.id;
      // Save to profile
      await supabase
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id);
    }
    // Create onboarding link via fetch
    const linkForm = new URLSearchParams({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    const linkRes = await fetch(`${STRIPE_API}/account_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: linkForm,
    });
    const accountLink = await linkRes.json();
    if (!accountLink.url) throw new Error(accountLink.error?.message || 'Stripe onboarding link creation failed');
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