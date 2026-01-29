import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './lib/emails/resend-client.js';
import { welcomeToProTemplate, subscriptionCancelledTemplate } from './lib/emails/templates.js';

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
      
      // Handle tutoring payment (one-time payment with booking_id)
      if (session.mode === 'payment' && session.metadata?.booking_id) {
        console.log('💰 Tutoring plačilo za booking:', session.metadata.booking_id);
        
        const { error: bookingError } = await supabase
          .from('tutor_bookings')
          .update({
            paid: true,
            stripe_payment_intent_id: session.payment_intent
          })
          .eq('id', session.metadata.booking_id);

        if (bookingError) {
          console.error('❌ Napaka pri posodobitvi booking:', bookingError);
        } else {
          console.log('✅ Booking označen kot plačan');
          
          // Send email to instructor
          try {
            const { data: booking } = await supabase
              .from('tutor_bookings')
              .select('*, tutors!inner(user_id)')
              .eq('id', session.metadata.booking_id)
              .single();

            if (booking) {
              const { data: instructorProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', booking.tutors.user_id)
                .single();

              const { data: studentProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', booking.student_id)
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

                await supabase.functions.invoke('send-booking-email', {
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
                
                console.log('✅ Email poslan inštruktorju:', instructorProfile.email);
              }
            }
          } catch (emailError) {
            console.error('❌ Napaka pri pošiljanju emaila:', emailError);
          }
        }
      }
      
      // Handle note purchase (one-time payment)
      if (session.mode === 'payment' && session.metadata?.note_id && session.metadata?.user_id) {
        console.log('Poskušam vpisati v tabelo note_purchases...');
        const price = session.amount_total ? session.amount_total / 100 : 0;
        console.log(`Poskušam vpisati: Buyer: ${session.metadata.user_id}, Note: ${session.metadata.note_id}, Price: ${price}`);

        const { data, error } = await supabase
          .from('note_purchases')
          .insert([{
            buyer_id: session.metadata.user_id,
            note_id: session.metadata.note_id,
            price: price
          }])
          .select();

        if (error) {
          console.error('❌ SUPABASE NAPAKA PRI VPISU:', JSON.stringify(error));
        } else {
          console.log('✅ SUPABASE USPEH. Vpisani podatki:', JSON.stringify(data));
        }
      }
      
      // Handle PRO subscription (subscription mode)
      if (session.mode === 'subscription' && session.client_reference_id) {
        const userId = session.client_reference_id;
        console.log('🎉 PRO subscription za uporabnika:', userId);
        
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const trialUsed = session.metadata?.trial_used === 'true';
        
        const subscriptionStatus = subscription.status === 'trialing' ? 'trialing' : 
                                   subscription.status === 'active' ? 'active' : 
                                   subscription.status;
        
        let trialEndsAt = null;
        if (subscription.status === 'trialing' && subscription.trial_end) {
          trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
        }
        
        const updateData = { 
          is_pro: true,
          subscription_status: subscriptionStatus,
          pro_since: new Date().toISOString(),
          stripe_subscription_id: subscription.id,
          stripe_customer_id: session.customer
        };
        
        if (!trialUsed && subscription.status === 'trialing') {
          updateData.trial_used = true;
          updateData.trial_ends_at = trialEndsAt;
        }

        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select();

        if (error) {
          console.error('❌ NAPAKA PRI POSODOBITVI PRO STATUSA:', JSON.stringify(error));
        } else {
          console.log('✅ PRO STATUS POSODOBLJEN:', JSON.stringify(data));
          
          // Create notification
          await supabase.from('notifications').insert({
            user_id: userId,
            type: subscription.status === 'trialing' ? 'pro_trial_started' : 'pro_subscription_active',
            title: subscription.status === 'trialing' ? 'Dobrodošel v PRO preizkusu! 🎉' : 'Dobrodošel v Študko PRO! 🎉',
            message: subscription.status === 'trialing'
              ? 'Imaš 7 dni brezplačnega preizkusa PRO funkcij!'
              : 'Hvala za naročnino! Zdaj imaš dostop do vseh PRO funkcij!',
            data: {
              subscription_id: subscription.id,
              status: subscription.status,
              trial_end: trialEndsAt
            }
          });

          // Send confirmation email
          if (data && data[0]) {
            const profile = data[0];
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            
            if (authUser?.user?.email) {
              try {
                await sendEmail({
                  to: authUser.user.email,
                  subject: subscription.status === 'trialing' 
                    ? 'Dobrodošel v Študko PRO preizkusu! 🎉' 
                    : 'Dobrodošel v Študko PRO! 🚀',
                  html: welcomeToProTemplate(profile.full_name || 'Študent')
                });
                console.log('✅ PRO aktivacijski email poslan na:', authUser.user.email);
              } catch (emailError) {
                console.error('❌ Napaka pri pošiljanju emaila:', emailError);
              }
            }
          }
        }
      }
    }
    
    // Handle subscription updates
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', subscription.customer)
        .single();
      
      if (profiles?.id) {
        const updateData = {
          subscription_status: subscription.status,
          is_pro: subscription.status === 'active' || subscription.status === 'trialing'
        };
        
        if (subscription.status === 'trialing' && subscription.trial_end) {
          updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
        }
        
        await supabase.from('profiles').update(updateData).eq('id', profiles.id);
        console.log('✅ PRO SUBSCRIPTION UPDATED');
      }
    }
    
    // Handle subscription deletion
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('stripe_customer_id', subscription.customer)
        .single();
      
      if (profiles?.id) {
        await supabase.from('profiles').update({ is_pro: false }).eq('id', profiles.id);
        console.log('✅ PRO SUBSCRIPTION CANCELLED');

        // Send cancellation email
        const { data: authUser } = await supabase.auth.admin.getUserById(profiles.id);
        
        if (authUser?.user?.email) {
          try {
            await sendEmail({
              to: authUser.user.email,
              subject: 'Študko PRO naročnina preklicana',
              html: subscriptionCancelledTemplate(profiles.full_name || 'Študent')
            });
            console.log('✅ PRO preklic email poslan na:', authUser.user.email);
          } catch (emailError) {
            console.error('❌ Napaka pri pošiljanju preklic emaila:', emailError);
          }
        }
      }
    }
    
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Napaka:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
