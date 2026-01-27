import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role key for database updates
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's profile with subscription info
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, subscription_status, is_pro")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError });
      throw new Error(`Profile fetch error: ${profileError.message}`);
    }
    
    if (!profile) {
      throw new Error("Profile not found");
    }

    logStep("Profile fetched", { 
      customerId: profile.stripe_customer_id, 
      subscriptionId: profile.stripe_subscription_id,
      status: profile.subscription_status,
      isPro: profile.is_pro
    });

    if (!profile.stripe_subscription_id) {
      logStep("No subscription ID found", { isPro: profile.is_pro });
      
      return new Response(JSON.stringify({ 
        error: "No active Stripe subscription found. If you have PRO access, it was granted manually and cannot be cancelled through this interface. Please contact support.",
        noSubscription: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Set subscription to cancel at period end (no immediate cancellation, no refund)
    let subscription;
    try {
      subscription = await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        { cancel_at_period_end: true }
      );
    } catch (stripeError: any) {
      logStep("Stripe API error", { error: stripeError?.message, code: stripeError?.code });
      throw new Error(`Stripe error: ${stripeError?.message || 'Unknown Stripe error'}`);
    }

    logStep("Subscription set to cancel at period end", { 
      subscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    });

    // Update profile to reflect cancellation status
    await supabaseClient
      .from("profiles")
      .update({ cancel_at_period_end: true })
      .eq("id", user.id);

    logStep("Profile updated with cancel_at_period_end flag");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Naročnina bo preklicana ob koncu obračunskega obdobja. Dostop imaš do " + 
               new Date(subscription.current_period_end * 1000).toLocaleDateString("sl-SI") + ".",
      periodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR in cancel-subscription", { message: errorMessage, stack: errorStack });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Check Supabase logs for more information" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
