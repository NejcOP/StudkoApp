import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log('Povezujem se na Supabase URL:', process.env.VITE_SUPABASE_URL ? 'Najden' : 'NI NAJDEN');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const chunks = [];
  for await (const chunk of req) { chunks.push(chunk); }
  const rawBody = Buffer.concat(chunks);
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Prejeti metadata:', session.metadata);
      const { userId, noteId } = session.metadata;

      if (userId && noteId) {
        const { data, error } = await supabase
          .from('note_purchases')
          .insert([{ user_id: userId, note_id: noteId }]);
        if (error) console.error('Supabase Error:', error);
        else console.log('Uspeh v bazi:', data);
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Napaka:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
