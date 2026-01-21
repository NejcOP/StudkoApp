import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TUTORING-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();
    logStep("Request received", { bookingId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");
    logStep("User authenticated", { userId: userData.user.id });

    // Get booking details with tutor info
    const { data: booking, error: bookingError } = await supabaseClient
      .from("tutor_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      logStep("Booking not found", { bookingError });
      throw new Error("Booking not found");
    }

    if (booking.student_id !== userData.user.id) {
      throw new Error("Not your booking");
    }

    if (booking.paid) {
      throw new Error("Booking already paid");
    }

    logStep("Booking found", { bookingId: booking.id, tutorId: booking.tutor_id });

    // Get tutor details from tutors table
    const { data: tutor, error: tutorError } = await supabaseClient
      .from("tutors")
      .select("id, full_name, user_id")
      .eq("id", booking.tutor_id)
      .single();

    if (tutorError || !tutor) {
      logStep("Tutor not found", { tutorError });
      throw new Error("Tutor not found");
    }

    // Get tutor's stripe connect account from profiles
    const { data: tutorProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", tutor.user_id)
      .single();

    if (profileError || !tutorProfile?.stripe_connect_account_id) {
      logStep("Tutor payout not setup", { profileError });
      throw new Error("Tutor has not set up payouts. Please contact the tutor.");
    }

    logStep("Tutor found", { 
      tutorName: tutor.full_name, 
      connectAccountId: tutorProfile.stripe_connect_account_id 
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const amount = Math.round((booking.price_eur || 20) * 100);
    const applicationFee = Math.round(amount * 0.20); // 20% platform fee

    logStep("Creating checkout session", { amount, applicationFee });

    // Create checkout session with destination charge
    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: tutorProfile.stripe_connect_account_id,
        },
        metadata: {
          booking_id: bookingId,
          tutor_id: booking.tutor_id,
          student_id: userData.user.id,
        },
      },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Tutoring session with ${tutor.full_name}`,
              description: `Session on ${new Date(booking.start_time).toLocaleString('sl-SI')}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/my-tutor-bookings?payment=success`,
      cancel_url: `${req.headers.get("origin")}/my-tutor-bookings?payment=cancelled`,
      metadata: {
        booking_id: bookingId,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Update booking with checkout session ID
    const { error: updateError } = await supabaseClient
      .from("tutor_bookings")
      .update({ 
        stripe_payment_intent_id: session.payment_intent as string || null
      })
      .eq("id", bookingId);

    if (updateError) {
      logStep("Error updating booking", { updateError });
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
