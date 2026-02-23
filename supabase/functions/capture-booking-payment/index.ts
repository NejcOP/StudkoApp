import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { bookingId } = await req.json();

    if (!bookingId) {
      throw new Error("Missing bookingId");
    }

    console.log("[CAPTURE-PAYMENT] Processing booking:", bookingId);

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("tutor_bookings")
      .select("*, profiles!tutor_bookings_tutor_id_fkey(stripe_connect_id)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    if (!booking.stripe_payment_intent_id) {
      throw new Error("No payment intent found for this booking");
    }

    if (booking.payment_captured) {
      console.log("[CAPTURE-PAYMENT] Payment already captured");
      return new Response(
        JSON.stringify({ message: "Payment already captured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[CAPTURE-PAYMENT] Capturing payment intent:", booking.stripe_payment_intent_id);

    // Capture the payment on the connected account
    const paymentIntent = await stripe.paymentIntents.capture(
      booking.stripe_payment_intent_id,
      {
        stripeAccount: booking.profiles.stripe_connect_id,
      }
    );

    console.log("[CAPTURE-PAYMENT] Payment captured successfully");

    // Update booking status
    const { error: updateError } = await supabase
      .from("tutor_bookings")
      .update({
        payment_captured: true,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[CAPTURE-PAYMENT] Error updating booking:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, paymentIntent: paymentIntent.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CAPTURE-PAYMENT] ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
