import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const STRIPE_API = 'https://api.stripe.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('[STRIPE-CONNECT-UPDATE] Function started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  
  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    if (!stripeSecretKey) {
      console.error('[STRIPE-CONNECT-UPDATE] STRIPE_SECRET_KEY not set!');
      throw new Error('Stripe skrivni ključ ni nastavljen.');
    }

    // Read JWT from Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    console.log('[STRIPE-CONNECT-UPDATE] Auth header present:', !!authHeader);
    if (!authHeader) throw new Error('No authorization header');
    const jwt = authHeader.replace('Bearer ', '');

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    console.log('[STRIPE-CONNECT-UPDATE] User:', userData?.user?.id, 'error:', userError);
    if (userError || !userData.user) throw new Error('Unauthorized');
    const user = userData.user;

    // Parse body
    const { returnUrl, refreshUrl } = await req.json();
    console.log('[STRIPE-CONNECT-UPDATE] Request body:', { returnUrl, refreshUrl });

    // Get user's Stripe account ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', user.id)
      .single();

    console.log('[STRIPE-CONNECT-UPDATE] Profile:', { 
      hasProfile: !!profile,
      hasAccountId: !!profile?.stripe_connect_id,
      error: profileError 
    });

    if (profileError || !profile?.stripe_connect_id) {
      throw new Error('Stripe račun ni nastavljen. Najprej dokončaj onboarding.');
    }

    const accountId = profile.stripe_connect_id;

    // Create account update link via fetch
    // Using account_update type allows user to update their business information
    const linkForm = new URLSearchParams({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_update',
    });

    console.log('[STRIPE-CONNECT-UPDATE] Creating account_update link for:', accountId);
    const linkRes = await fetch(`${STRIPE_API}/account_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: linkForm,
    });

    const accountLink = await linkRes.json();
    console.log('[STRIPE-CONNECT-UPDATE] Stripe response:', { 
      status: linkRes.status,
      hasUrl: !!accountLink.url,
      error: accountLink.error
    });

    if (!accountLink.url) {
      throw new Error(accountLink.error?.message || 'Stripe account update link creation failed');
    }

    console.log('[STRIPE-CONNECT-UPDATE] Success, returning URL');
    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[STRIPE-CONNECT-UPDATE] ERROR:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
