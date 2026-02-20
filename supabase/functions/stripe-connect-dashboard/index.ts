const STRIPE_API = 'https://api.stripe.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('STRIPE CONNECT DASHBOARD FUNCTION STARTED');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY ni nastavljen v okolju!');
      throw new Error('Stripe skrivni ključ ni nastavljen.');
    }

    const body = await req.json();
    const { accountId } = body;
    
    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Manjka Stripe Connect accountId' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create login link via fetch
    const res = await fetch(`${STRIPE_API}/accounts/${accountId}/login_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const loginLink = await res.json();
    if (!loginLink.url) {
      throw new Error(loginLink.error?.message || 'Stripe dashboard link creation failed');
    }

    return new Response(
      JSON.stringify({ url: loginLink.url }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('stripe-connect-dashboard ERROR:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
