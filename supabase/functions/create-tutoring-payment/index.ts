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

    if (!bookingId) {
      throw new Error("Missing bookingId parameter");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("Missing auth header");
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      logStep("Auth failed", { userError });
      throw new Error("Unauthorized");
    }
    logStep("User authenticated", { userId: userData.user.id });

    // Get booking details with tutor info
    const { data: booking, error: bookingError } = await supabaseClient
      .from("tutor_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      logStep("Booking not found", { bookingError });
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (booking.student_id !== userData.user.id) {
      logStep("Not user's booking", { bookingStudentId: booking.student_id, userId: userData.user.id });
      return new Response(
        JSON.stringify({ error: "Not your booking" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (booking.paid) {
      logStep("Already paid", { bookingId });
      return new Response(
        JSON.stringify({ error: "Booking already paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Booking found", { bookingId: booking.id, tutorId: booking.tutor_id });

    // Get tutor's profile directly (tutor_id references profiles.id)
    const { data: tutorProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name, stripe_connect_id")
      .eq("id", booking.tutor_id)
      .single();

    if (profileError || !tutorProfile) {
      logStep("Tutor profile not found", { profileError });
      throw new Error("Tutor profile not found");
    }

    if (!tutorProfile.stripe_connect_id) {
      logStep("Tutor payout not setup", { 
        hasConnectId: !!tutorProfile.stripe_connect_id 
      });
      return new Response(
        JSON.stringify({ error: "Inštruktor še ni nastavil izplačil. Prosim kontaktiraj inštruktorja." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Tutor found", { 
      tutorName: tutorProfile.full_name, 
      connectAccountId: tutorProfile.stripe_connect_id 
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Verify Stripe Connect account is ready for payments
    let stripeAccount;
    const isTestMode = tutorProfile.stripe_connect_id.startsWith('acct_test_');
    
    try {
      stripeAccount = await stripe.accounts.retrieve(tutorProfile.stripe_connect_id);
      
      logStep("Stripe account retrieved", {
        accountId: stripeAccount.id,
        chargesEnabled: stripeAccount.charges_enabled,
        detailsSubmitted: stripeAccount.details_submitted,
        payoutsEnabled: stripeAccount.payouts_enabled,
        cardPaymentsCapability: stripeAccount.capabilities?.card_payments,
        isTestMode
      });

      // In test mode, skip validation to allow testing payment flow
      if (!isTestMode) {
        if (!stripeAccount.charges_enabled) {
          logStep("Charges not enabled", { 
            chargesEnabled: stripeAccount.charges_enabled,
            requirements: stripeAccount.requirements
          });
          return new Response(
            JSON.stringify({ 
              error: "Inštruktor še ni dokončal nastavitve plačilnega računa. Prosim kontaktiraj inštruktorja.",
              details: "Stripe charges not enabled"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        if (stripeAccount.capabilities?.card_payments !== 'active') {
          logStep("Card payments not active", { 
            capability: stripeAccount.capabilities?.card_payments
          });
          return new Response(
            JSON.stringify({ 
              error: "Inštruktorjev plačilni račun še ni aktiviran. Prosim kontaktiraj inštruktorja.",
              details: "Card payments capability not active"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
      } else {
        logStep("Test mode: skipping charges_enabled and card_payments validation");
      }

    } catch (accountError: any) {
      logStep("Error retrieving Stripe account", {
        error: accountError.message,
        accountId: tutorProfile.stripe_connect_id
      });
      return new Response(
        JSON.stringify({ 
          error: "Napaka pri preverjanju inštruktorjevega plačilnega računa.",
          details: accountError.message
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const bookingPriceEur = booking.price_eur || 20;
    const amount = Math.round(bookingPriceEur * 100);
    const applicationFee = Math.round(amount * 0.20); // 20% platform fee

    logStep("Creating checkout session", { 
      bookingPriceEur, 
      amount, 
      applicationFee,
      tutorReceives: amount - applicationFee
    });

    // Create checkout session with DIRECT charge to connected account
    // This only requires card_payments capability, NOT transfers capability
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_intent_data: {
          application_fee_amount: applicationFee, // Platform takes 20% fee
          capture_method: 'manual', // Hold payment until booking is completed
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
                name: `Lekcija pri inštruktorju ${tutorProfile.full_name}`,
                description: `Lekcija ${new Date(booking.start_time).toLocaleString('sl-SI')}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/profile?tab=bookings&payment=success`,
        cancel_url: `${req.headers.get("origin")}/profile?tab=bookings&payment=cancelled`,
        metadata: {
          booking_id: bookingId,
        },
      }, {
        stripeAccount: tutorProfile.stripe_connect_id, // Direct charge - payment goes directly to tutor's account
      });
    } catch (stripeError: any) {
      logStep("STRIPE API ERROR", {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
        statusCode: stripeError.statusCode,
        raw: stripeError.raw,
        stripeConnectId: tutorProfile.stripe_connect_id
      });
      
      // User-friendly error messages
      let userMessage = stripeError.message;
      
      if (stripeError.message?.includes('account or business name')) {
        userMessage = 'Inštruktor mora dokončati Stripe Connect nastavitev (manjka ime podjetja). Prosim kontaktiraj inštruktorja.';
      } else if (stripeError.message?.includes('No such account')) {
        userMessage = 'Inštruktorjev Stripe račun ne obstaja več. Prosim kontaktiraj inštruktorja da nastavi nov račun.';
      } else if (stripeError.message?.includes('charges')) {
        userMessage = 'Inštruktorjev Stripe račun še ni potrjen. Prosim kontaktiraj inštruktorja.';
      }
      
      // Return 400 instead of throwing to avoid 500 error
      return new Response(
        JSON.stringify({ 
          error: userMessage,
          details: stripeError.type || "Stripe API error"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

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
    logStep("ERROR", { 
      message: error.message,
      stack: error.stack,
      name: error.name,
      type: error.type,
      raw: error
    });
    
    console.error("Full error details:", JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error",
        details: error.stack || error.toString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
