import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[AUTO-CAPTURE] Starting automatic payment capture job");

    // Find bookings that:
    // 1. Are paid
    // 2. Payment not yet captured
    // 3. End time was more than 1 hour ago (lesson completed + grace period)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: bookings, error: fetchError } = await supabase
      .from("tutor_bookings")
      .select("id, stripe_payment_intent_id, end_time, tutor_id, profiles!tutor_bookings_tutor_id_fkey(stripe_connect_id, full_name)")
      .eq("paid", true)
      .eq("payment_captured", false)
      .not("stripe_payment_intent_id", "is", null)
      .lt("end_time", oneHourAgo);

    if (fetchError) {
      console.error("[AUTO-CAPTURE] Error fetching bookings:", fetchError);
      throw fetchError;
    }

    console.log(`[AUTO-CAPTURE] Found ${bookings?.length || 0} bookings to capture`);

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No bookings to capture", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each booking
    for (const booking of bookings) {
      try {
        console.log(`[AUTO-CAPTURE] Processing booking ${booking.id}`);

        if (!booking.profiles?.stripe_connect_id) {
          console.error(`[AUTO-CAPTURE] No Stripe Connect ID for booking ${booking.id}`);
          errorCount++;
          continue;
        }

        // Capture the payment
        const paymentIntent = await stripe.paymentIntents.capture(
          booking.stripe_payment_intent_id,
          {
            stripeAccount: booking.profiles.stripe_connect_id,
          }
        );

        console.log(`[AUTO-CAPTURE] Captured payment ${paymentIntent.id} for booking ${booking.id}`);

        // Update booking status
        const { error: updateError } = await supabase
          .from("tutor_bookings")
          .update({
            payment_captured: true,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

        if (updateError) {
          console.error(`[AUTO-CAPTURE] Error updating booking ${booking.id}:`, updateError);
          errorCount++;
        } else {
          successCount++;
          
          // Send notification to instructor
          await supabase.from("notifications").insert({
            user_id: booking.tutor_id,
            type: "payment_captured",
            title: "Plačilo izplačano! 💰",
            message: `Plačilo za lekcijo ${new Date(booking.end_time).toLocaleDateString('sl-SI')} je bilo uspešno izplačano na tvoj Stripe račun.`,
          });
        }
      } catch (error) {
        console.error(`[AUTO-CAPTURE] Error processing booking ${booking.id}:`, error);
        errorCount++;
      }
    }

    console.log(`[AUTO-CAPTURE] Completed: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: "Auto-capture completed",
        processed: bookings.length,
        successful: successCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AUTO-CAPTURE] ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
