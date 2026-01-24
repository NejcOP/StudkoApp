
import type { VercelRequest, VercelResponse } from '@vercel/node';


import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: read raw body from stream (Node.js, Vercel)
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Stripe webhook handler poklican');
  if (req.method !== 'POST') {
    console.log('Napaka: Method Not Allowed');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;
  let rawBody: Buffer;
  const sig = req.headers['stripe-signature'] as string;

  try {
    rawBody = await getRawBody(req);
    console.log('Raw body prebran, dolžina:', rawBody.length);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('Stripe event prejet:', event.type);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err?.message || err);
    res.status(400).json({ error: `Webhook signature verification failed: ${err?.message || err}` });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('Metadata iz Stripa:', session.metadata);
    const noteId = session.metadata?.note_id;
    const userId = session.metadata?.user_id;
    const email = session.customer_details?.email;

    if (!noteId || !userId) {
      console.error('Manjka note_id ali user_id v metadata:', session.metadata);
      res.status(400).json({ error: 'Missing note_id or user_id in Stripe metadata.' });
      return;
    }

    // Vpis v Supabase
    const { error: dbError } = await supabase.from('note_purchases').insert({
      note_id: noteId,
      buyer_id: userId,
      price: session.amount_total ? session.amount_total / 100 : 0,
    });
    if (dbError) {
      console.error('Napaka pri vpisu v Supabase:', dbError.message);
      res.status(500).json({ error: 'Supabase insert error', details: dbError.message });
      return;
    }
    console.log('Vpis v Supabase OK za user_id:', userId, 'note_id:', noteId);

    // Pošlji potrditveni e-mail prek Resend (če je e-mail na voljo)
    if (email && process.env.RESEND_API_KEY) {
      try {
        const mailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'info@studko.si',
            to: email,
            subject: 'Potrdilo o nakupu zapiska',
            html: `<p>Pozdravljeni,<br>uspešno ste kupili zapisek na Študko.<br>Hvala za zaupanje!</p>`,
          }),
        });
        if (mailRes.ok) {
          console.log('E-mail poslan na:', email);
        } else {
          const mailErr = await mailRes.text();
          console.error('Napaka pri pošiljanju e-maila:', mailErr);
        }
      } catch (mailError) {
        console.error('Napaka pri pošiljanju e-maila:', mailError);
      }
    }
  }

  res.status(200).json({ received: true });
}

  api: {
    bodyParser: false,
  },
};

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}


  console.log('Stripe webhook poklican');
  if (req.method !== 'POST') {
    console.log('Napaka: Method Not Allowed');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const resendApiKey = process.env.RESEND_API_KEY!;

  // @ts-ignore
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

  let event: Stripe.Event;
  let buf: Buffer;
  const sig = req.headers['stripe-signature'] as string;

  try {
    buf = await buffer(req);
    console.log('Raw body prebran, dolžina:', buf.length);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    console.log('Webhook prejet:', event.type);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message || err);
    res.status(400).json({ error: `Webhook signature verification failed: ${err?.message || err}` });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('Metadata iz Stripa:', session.metadata);
    const noteId = session.metadata?.note_id;
    const userId = session.metadata?.user_id;
    const email = session.customer_details?.email;

    if (!noteId || !userId) {
      console.error('Stripe webhook: Missing note_id or user_id in metadata:', session.metadata);
      res.status(400).json({ error: 'Missing note_id or user_id in Stripe metadata.' });
      return;
    }

    console.log('Vpisujem v bazo za user_id:', userId, 'note_id:', noteId);
    // 1. Vpiši v Supabase
    const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/note_purchases`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
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
      res.status(500).json({ error: 'Supabase insert error', details: errorText });
      return;
    }
    console.log('Vpis v Supabase OK za user_id:', userId, 'note_id:', noteId);

    // 2. Pošlji e-mail prek Resend (če je e-mail na voljo)
    if (email) {
      console.log('Pošiljam potrditveni e-mail na:', email);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'info@studko.si',
          to: email,
          subject: 'Potrdilo o nakupu zapiska',
          html: `<p>Pozdravljeni,<br>uspešno ste kupili zapisek na Študko.<br>Hvala za zaupanje!</p>`,
        }),
      });
      console.log('E-mail poslan na:', email);
    }
  }

  res.status(200).json({ received: true });
}
