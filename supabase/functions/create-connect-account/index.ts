import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const user = userData.user;

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_connect_id, full_name, email")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error("Profile not found");

    console.log("[CREATE-CONNECT-ACCOUNT] User profile loaded:", {
      userId: user.id,
      hasStripeId: !!profile.stripe_connect_id,
      stripeId: profile.stripe_connect_id
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // If user already has a Connect account, create account link
    if (profile.stripe_connect_id) {
      console.log("[CREATE-CONNECT-ACCOUNT] Existing account found, verifying...");
      
      try {
        // First verify the account exists
        const account = await stripe.accounts.retrieve(profile.stripe_connect_id);
        console.log("[CREATE-CONNECT-ACCOUNT] Account verified:", {
          id: account.id,
          chargesEnabled: account.charges_enabled,
          detailsSubmitted: account.details_submitted
        });
        
        const accountLink = await stripe.accountLinks.create({
          account: profile.stripe_connect_id,
          refresh_url: `${req.headers.get("origin")}/profile`,
          return_url: `${req.headers.get("origin")}/profile?stripe=success&account_id=${profile.stripe_connect_id}`,
          type: "account_onboarding",
        });

        console.log("[CREATE-CONNECT-ACCOUNT] Account link created successfully");
        
        return new Response(
          JSON.stringify({ url: accountLink.url, accountId: profile.stripe_connect_id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (stripeError: any) {
        console.error("[CREATE-CONNECT-ACCOUNT] Stripe account error:", {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code
        });
        
        // If account doesn't exist, clear it from database and create new one
        if (stripeError.type === 'invalid_request_error') {
          console.log("[CREATE-CONNECT-ACCOUNT] Invalid account, clearing from database");
          await supabaseClient
            .from("profiles")
            .update({ stripe_connect_id: null })
            .eq("id", user.id);
          
          // Fall through to create new account
        } else {
          throw stripeError;
        }
      }
    }

    console.log("[CREATE-CONNECT-ACCOUNT] Creating new Stripe account...");
    
    // Create new Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: "SI",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        // Note: We only need card_payments for direct charges
        // transfers capability is NOT needed and can cause delays in onboarding
      },
      business_type: "individual",
      business_profile: {
        name: profile.full_name || "Študko Tutor",
        url: `${req.headers.get("origin")}/profile`,
      },
    });

    console.log("[CREATE-CONNECT-ACCOUNT] New account created:", account.id);

    // Save account ID to profile
    await supabaseClient
      .from("profiles")
      .update({ stripe_connect_id: account.id })
      .eq("id", user.id);

    console.log("[CREATE-CONNECT-ACCOUNT] Account ID saved to profile");

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/profile`,
      return_url: `${req.headers.get("origin")}/profile?stripe=success&account_id=${account.id}`,
      type: "account_onboarding",
    });

    console.log("[CREATE-CONNECT-ACCOUNT] Onboarding link created");

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId: account.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[CREATE-CONNECT-ACCOUNT] Error:", {
      message: error.message,
      type: error.type,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
