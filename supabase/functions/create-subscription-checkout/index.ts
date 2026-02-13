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
    
    console.log('Received request:', { userId, trialUsed });
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!supabaseUrl || !supabaseKey || !stripeKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile and check trial status from database (authoritative source)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, trial_used, trial_ends_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    // Double-check trial status from database - this is the authoritative check
    // to prevent users from bypassing trial restrictions
    const hasUsedTrialDb = profile?.trial_used || 
      (profile?.trial_ends_at && new Date(profile.trial_ends_at) < new Date());
    
    // SECURITY: Only trust database value, ignore frontend input to prevent trial bypass
    const actualTrialUsed = hasUsedTrialDb;
    
    console.log('Trial status check:', { 
      trialUsedFromClient: trialUsed, 
      trialUsedFromDb: profile?.trial_used,
      trialEndsAt: profile?.trial_ends_at,
      finalTrialUsed: actualTrialUsed 
    });

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error('User fetch error:', userError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log('Creating checkout for user:', user.email);

    // Create checkout session configuration
    const sessionConfig: any = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Študko PRO Naročnina',
            description: 'Neomejeni AI pogovori, napredni načini, preverjanje dela in prednostna podpora',
          },
          unit_amount: 399, // 3.99 EUR in cents
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: user?.email,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        trial_used: actualTrialUsed ? 'true' : 'false',
      },
      success_url: `${req.headers.get('origin')}/profile?pro=activated&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/profile?tab=subscription`,
    };

    // Add trial only if not used (based on database check)
    if (!actualTrialUsed) {
      sessionConfig.subscription_data = {
        trial_period_days: 7,
      };
      console.log('Adding 7-day trial to subscription');
    } else {
      console.log('Trial already used, no trial period added');
    }

    console.log('Session config:', JSON.stringify(sessionConfig, null, 2));

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Subscription Checkout Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error',
      details: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
