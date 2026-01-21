import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno&no-check"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting helper
async function checkRateLimit(supabase: any, userId: string, action: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: userId,
    p_action: action,
    p_max_requests: 10,
    p_window_minutes: 1
  });
  
  if (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error to prevent blocking legitimate users
  }
  
  return data === true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { noteId, userId } = await req.json()
    if (!noteId || !userId) {
      console.error('Missing noteId or userId in request body', { noteId, userId })
      return new Response(JSON.stringify({ error: 'Missing noteId or userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit check
    const allowed = await checkRateLimit(supabase, userId, 'create_checkout');
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    // Fetch note price and sellerStripeAccountId from DB
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title, price, profiles(stripe_connect_id)')
      .eq('id', noteId)
      .single()
    if (noteError || !note) {
      console.error('Error fetching note from DB', noteError)
      return new Response(JSON.stringify({ error: 'Note not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }
    if (!note.profiles?.stripe_connect_id) {
      console.error('Seller Stripe account not set', note)
      return new Response(JSON.stringify({ error: 'This seller has not set up their payment account yet.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: note.title },
          unit_amount: Math.round(note.price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: Math.round(note.price * 100 * 0.20),
        transfer_data: { destination: note.profiles.stripe_connect_id },
      },
      metadata: {
        user_id: userId,
        note_id: noteId
      },
      success_url: `${req.headers.get('origin')}/profile?tab=purchased&payment=success`,
      cancel_url: `${req.headers.get('origin')}/notes/${noteId}?payment=cancelled`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Checkout Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})