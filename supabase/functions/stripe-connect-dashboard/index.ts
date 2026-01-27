import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Obvezno odgovori na OPTIONS zahteve za CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  try {
    // Parse JSON body
    const body = await req.json()
    const { accountId } = body
    
    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Manjka Stripe Connect accountId' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Ustvari Express dashboard link
    const loginLink = await stripe.accounts.createLoginLink(accountId)

    return new Response(
      JSON.stringify({ url: loginLink.url }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Napaka pri ustvarjanju Stripe Connect dashboard linka:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Neznana napaka' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
