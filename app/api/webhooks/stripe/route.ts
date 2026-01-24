export const config = {
  api: {
    bodyParser: false,
  },
};
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

export async function POST(req: NextRequest) {
  // Stripe zahteva raw body!
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;
  const body = await req.text();


  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message || err);
    return NextResponse.json({ error: `Webhook signature verification failed: ${err?.message || err}` }, { status: 400 });
  }


  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const noteId = session.metadata?.note_id;
    const userId = session.metadata?.user_id;
    const email = session.customer_details?.email;

    if (!noteId || !userId) {
      console.error('Stripe webhook: Missing note_id or user_id in metadata:', session.metadata);
      return NextResponse.json({ error: 'Missing note_id or user_id in Stripe metadata.' }, { status: 400 });
    }

    // 1. Vpiši v Supabase
    const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/note_purchases`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        note_id: noteId,
        buyer_id: userId,
        price: session.amount_total ? session.amount_total / 100 : 0,
      }),
    });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error('Supabase insert error:', errorText);
      return NextResponse.json({ error: 'Supabase insert error', details: errorText }, { status: 500 });
    }

    // 2. Pošlji e-mail prek Resend (če je e-mail na voljo)
    if (email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "info@studko.si",
          to: email,
          subject: "Potrdilo o nakupu zapiska",
          html: `<p>Pozdravljeni,<br>uspešno ste kupili zapisek na Študko.<br>Hvala za zaupanje!</p>`,
        }),
      });
    }
  }

  // Vedno vrni 200, Stripe bo tako nehal retry-at
  return NextResponse.json({ received: true }, { status: 200 });
}
