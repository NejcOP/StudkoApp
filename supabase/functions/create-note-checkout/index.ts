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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-NOTE-CHECKOUT] Starting checkout session creation");
    
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    
    console.log("[CREATE-NOTE-CHECKOUT] User authenticated:", user.email);

    // Get noteId from request body
    const { noteId } = await req.json();
    
    if (!noteId) {
      throw new Error("noteId is required");
    }
    
    console.log("[CREATE-NOTE-CHECKOUT] Note ID:", noteId);

    // Fetch note metadata
    const { data: note, error: noteError } = await supabaseClient
      .from("notes")
      .select("id, title, price, author_id")
      .eq("id", noteId)
      .single();
    
    if (noteError || !note) {
      throw new Error("Note not found");
    }
    
    if (note.price <= 0) {
      throw new Error("This note is free, no payment required");
    }
    
    // Check if already purchased
    const { data: existingPurchase } = await supabaseClient
      .from("note_purchases")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("note_id", noteId)
      .maybeSingle();
    
    if (existingPurchase) {
      throw new Error("You have already purchased this note");
    }
    
    console.log("[CREATE-NOTE-CHECKOUT] Note found:", note.title, "Price:", note.price);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-NOTE-CHECKOUT] Existing customer found:", customerId);
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: note.title,
              description: `Zapiski: ${note.title}`,
            },
            unit_amount: Math.round(note.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/notes/${noteId}?checkout=success`,
      cancel_url: `${req.headers.get("origin")}/notes/${noteId}?checkout=canceled`,
      metadata: {
        note_id: noteId,
        buyer_id: user.id,
        author_id: note.author_id,
        price: note.price.toString(),
        note_title: note.title,
      },
    });

    console.log("[CREATE-NOTE-CHECKOUT] Session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-NOTE-CHECKOUT] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
