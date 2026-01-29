import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-TUTORING-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logStep("No signature provided");
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || "",
      undefined,
      cryptoProvider
    );
  } catch (err: any) {
    logStep("Webhook signature verification failed", { error: err.message });
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  logStep("Event received", { type: event.type });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.booking_id;

        logStep("Payment intent succeeded", { 
          paymentIntentId: paymentIntent.id, 
          bookingId 
        });

        if (bookingId) {
          // Mark booking as paid
          const { error } = await supabaseClient
            .from("tutor_bookings")
            .update({
              paid: true,
              stripe_payment_intent_id: paymentIntent.id,
            })
            .eq("id", bookingId);

          if (error) {
            logStep("Error updating booking", { error });
          } else {
            logStep("Booking marked as paid", { bookingId });
          }
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          bookingId,
          paymentIntent: session.payment_intent 
        });

        if (bookingId) {
          // Get booking details first
          const { data: booking, error: bookingError } = await supabaseClient
            .from("tutor_bookings")
            .select("*, tutors!inner(user_id)")
            .eq("id", bookingId)
            .single();

          if (bookingError) {
            logStep("Error fetching booking", { error: bookingError });
          }

          // Mark booking as paid
          const { error } = await supabaseClient
            .from("tutor_bookings")
            .update({
              paid: true,
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq("id", bookingId);

          if (error) {
            logStep("Error updating booking from checkout", { error });
          } else {
            logStep("Booking marked as paid via checkout", { bookingId });
            
            // Send email to instructor
            if (booking) {
              try {
                // Get instructor profile
                const { data: instructorProfile } = await supabaseClient
                  .from("profiles")
                  .select("full_name, email")
                  .eq("id", booking.tutors.user_id)
                  .single();

                // Get student profile
                const { data: studentProfile } = await supabaseClient
                  .from("profiles")
                  .select("full_name")
                  .eq("id", booking.student_id)
                  .single();

                if (instructorProfile?.email) {
                  const bookingDate = new Date(booking.start_time).toLocaleDateString('sl-SI', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });
                  const bookingTime = new Date(booking.start_time).toLocaleTimeString('sl-SI', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  await supabaseClient.functions.invoke('send-booking-email', {
                    body: {
                      to: instructorProfile.email,
                      type: 'payment_received',
                      instructorName: instructorProfile.full_name || 'Inštruktor',
                      studentName: studentProfile?.full_name || 'Študent',
                      bookingDate: bookingDate,
                      bookingTime: bookingTime,
                      priceEur: booking.price_eur
                    }
                  });
                  
                  logStep("Payment confirmation email sent to instructor", { 
                    email: instructorProfile.email 
                  });
                }
              } catch (emailError: any) {
                logStep("Error sending email to instructor", { error: emailError.message });
              }
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment failed", { 
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message 
        });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("Error processing webhook", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
