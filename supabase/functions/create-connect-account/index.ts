import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      .select("stripe_connect_account_id, full_name, email")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error("Profile not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // If user already has a Connect account, create account link
    if (profile.stripe_connect_account_id) {
      const accountLink = await stripe.accountLinks.create({
        account: profile.stripe_connect_account_id,
        refresh_url: `${req.headers.get("origin")}/profile`,
        return_url: `${req.headers.get("origin")}/profile`,
        type: "account_onboarding",
      });

      return new Response(
        JSON.stringify({ url: accountLink.url, accountId: profile.stripe_connect_account_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: "SI",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      business_profile: {
        name: profile.full_name || "Študko Tutor",
        url: `${req.headers.get("origin")}/profile`,
      },
    });

    // Save account ID to profile
    await supabaseClient
      .from("profiles")
      .update({ stripe_connect_account_id: account.id })
      .eq("id", user.id);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/profile`,
      return_url: `${req.headers.get("origin")}/profile`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId: account.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating Connect account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
