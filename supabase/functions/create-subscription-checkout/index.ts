import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno&no-check";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, trialUsed } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const { data: { user } } = await supabase.auth.admin.getUserById(userId);

    // Determine if user gets trial or not
    const subscription_data: any = {
      trial_period_days: trialUsed ? undefined : 7,
    };

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: Deno.env.get('STRIPE_PRO_PRICE_ID') || 'price_1QYlp6LqKcILu2NQfGaFT1i2', // PRO monthly price
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: user?.email,
      client_reference_id: userId,
      subscription_data: subscription_data,
      metadata: {
        user_id: userId,
        trial_used: trialUsed ? 'true' : 'false',
      },
      success_url: `${req.headers.get('origin')}/profile?pro=activated&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/profile?tab=subscription`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Subscription Checkout Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
