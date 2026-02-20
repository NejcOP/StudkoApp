import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // Get bookingId from URL params
    const url = new URL(req.url);
    const bookingId = url.searchParams.get('bookingId');
    
    if (!bookingId) {
      return new Response(
        `<!DOCTYPE html>
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>❌ Napaka</h1>
          <p>Manjkajoč booking ID</p>
          <a href="https://studko.si/profile?tab=bookings" style="color: #667eea;">Nazaj na profil</a>
        </body></html>`,
        { 
          status: 400, 
          headers: { "Content-Type": "text/html" } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("tutor_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        `<!DOCTYPE html>
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>❌ Napaka</h1>
          <p>Rezervacija ne obstaja</p>
          <a href="https://studko.si/profile?tab=bookings" style="color: #667eea;">Nazaj na profil</a>
        </body></html>`,
        { 
          status: 404, 
          headers: { "Content-Type": "text/html" } 
        }
      );
    }

    if (booking.paid) {
      return new Response(
        `<!DOCTYPE html>
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>✅ Že plačano</h1>
          <p>Ta rezervacija je že plačana.</p>
          <a href="https://studko.si/profile?tab=bookings" style="color: #667eea;">Poglej rezervacije</a>
        </body></html>`,
        { 
          status: 400, 
          headers: { "Content-Type": "text/html" } 
        }
      );
    }

    // Get tutor's profile
    const { data: tutorProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name, stripe_connect_id")
      .eq("id", booking.tutor_id)
      .single();

    if (profileError || !tutorProfile) {
      return new Response(
        `<!DOCTYPE html>
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>❌ Napaka</h1>
          <p>Inštruktor ne obstaja</p>
          <a href="https://studko.si/profile?tab=bookings" style="color: #667eea;">Nazaj na profil</a>
        </body></html>`,
        { 
          status: 404, 
          headers: { "Content-Type": "text/html" } 
        }
      );
    }

    if (!tutorProfile.stripe_connect_id) {
      return new Response(
        `<!DOCTYPE html>
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>⚠️ Napaka pri plačilu</h1>
          <p>Inštruktor še ni nastavil svojih podatkov za izplačila.</p>
          <p>Prosimo, kontaktirajte inštruktorja.</p>
          <a href="https://studko.si/profile?tab=bookings" style="color: #667eea;">Nazaj na profil</a>
        </body></html>`,
        { 
          status: 400, 
          headers: { "Content-Type": "text/html" } 
        }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const amount = Math.round((booking.price_eur || 20) * 100);
    const applicationFee = Math.round(amount * 0.20); // 20% platform fee

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: tutorProfile.stripe_connect_id,
        },
        metadata: {
          booking_id: bookingId,
          tutor_id: booking.tutor_id,
          student_id: booking.student_id,
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
      success_url: `${req.headers.get("origin") || 'https://studko.si'}/profile?tab=bookings&payment=success`,
      cancel_url: `${req.headers.get("origin") || 'https://studko.si'}/profile?tab=bookings&payment=cancelled`,
      metadata: {
        booking_id: bookingId,
      },
    });

    // Update booking with payment intent
    await supabaseClient
      .from("tutor_bookings")
      .update({ 
        stripe_payment_intent_id: session.payment_intent as string || null
      })
      .eq("id", bookingId);

    // Redirect to Stripe Checkout
    return new Response(null, {
      status: 303,
      headers: {
        "Location": session.url || "https://studko.si/profile?tab=bookings",
      },
    });
  } catch (error: any) {
    console.error("Error in pay-booking:", error);
    return new Response(
      `<!DOCTYPE html>
      <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>❌ Napaka</h1>
        <p>${error.message}</p>
        <a href="https://studko.si/profile?tab=bookings" style="color: #667eea;">Nazaj na profil</a>
      </body></html>`,
      { 
        status: 500, 
        headers: { "Content-Type": "text/html" } 
      }
    );
  }
});
