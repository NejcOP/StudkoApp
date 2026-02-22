const STRIPE_API = 'https://api.stripe.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('[STRIPE-CONNECT-DASHBOARD] Function started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    if (!stripeSecretKey) {
      console.error('[STRIPE-CONNECT-DASHBOARD] STRIPE_SECRET_KEY not set!');
      throw new Error('Stripe skrivni ključ ni nastavljen.');
    }

    const body = await req.json();
    const { accountId } = body;
    
    console.log('[STRIPE-CONNECT-DASHBOARD] Request:', { accountId });
    
    if (!accountId) {
      console.error('[STRIPE-CONNECT-DASHBOARD] Missing accountId');
      return new Response(
        JSON.stringify({ error: 'Manjka Stripe Connect accountId' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create login link via fetch
    console.log('[STRIPE-CONNECT-DASHBOARD] Creating login link for:', accountId);
    const res = await fetch(`${STRIPE_API}/accounts/${accountId}/login_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const loginLink = await res.json();
    console.log('[STRIPE-CONNECT-DASHBOARD] Stripe response:', { 
      status: res.status,
      hasUrl: !!loginLink.url,
      error: loginLink.error
    });
    
    if (!loginLink.url) {
      const errorMsg = loginLink.error?.message || 'Stripe dashboard link creation failed';
      console.error('[STRIPE-CONNECT-DASHBOARD] No URL returned:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[STRIPE-CONNECT-DASHBOARD] Success, returning URL');
    return new Response(
      JSON.stringify({ url: loginLink.url }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[STRIPE-CONNECT-DASHBOARD] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
