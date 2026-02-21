import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './lib/emails/resend-client.js';
import { 
  welcomeToProTemplate, 
  subscriptionCancelledTemplate,
  proTrialEndingTemplate,
  proExpiringReminderTemplate,
  notePurchaseTemplate
} from './lib/emails/templates.js';

export const config = { api: { bodyParser: false } };

// Validate required environment variables
const requiredEnvVars = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ CRITICAL: Missing required environment variable: ${varName}`);
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  // Check env vars on each request (in case they change)
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not set!');
    return res.status(500).json({ error: 'Server configuration error' });
  }

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
              .select('*')
              .eq('id', session.metadata.booking_id)
              .single();

            if (booking) {
              // tutor_bookings.tutor_id now references profiles.id directly (auth.users.id)
              const { data: instructorProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', booking.tutor_id)
                .single();

              const { data: studentProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
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
                    studentEmail: studentProfile?.email || '',
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
          
          // Send email notification to seller
          try {
            // Get note details
            const { data: note, error: noteError } = await supabase
              .from('notes')
              .select('title, user_id')
              .eq('id', session.metadata.note_id)
              .single();

            if (noteError || !note) {
              console.error('❌ Napaka pri pridobivanju note podatkov:', noteError);
            } else {
              // Get seller profile
              const { data: sellerProfile, error: sellerError } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', note.user_id)
                .single();

              // Get buyer profile
              const { data: buyerProfile, error: buyerError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.metadata.user_id)
                .single();

              if (sellerError || !sellerProfile) {
                console.error('❌ Napaka pri pridobivanju seller profila:', sellerError);
              } else if (buyerError || !buyerProfile) {
                console.error('❌ Napaka pri pridobivanju buyer profila:', buyerError);
              } else if (sellerProfile.email) {
                // Send email to seller
                const emailHtml = notePurchaseTemplate(
                  sellerProfile.full_name || 'Prodajalec',
                  buyerProfile.full_name || 'Kupec',
                  note.title,
                  price
                );

                const emailResult = await sendEmail({
                  to: sellerProfile.email,
                  subject: 'Tvoji zapiski so bili kupljeni! 💰',
                  html: emailHtml,
                  from: 'Študko <no-reply@studko.si>'
                });

                if (emailResult.success) {
                  console.log('✅ Email poslan prodajalcu:', sellerProfile.email);
                } else {
                  console.error('❌ Napaka pri pošiljanju emaila:', emailResult.error);
                }
              }
            }
          } catch (emailError) {
            console.error('❌ Napaka pri pošiljanju emaila prodajalcu:', emailError);
          }
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
        
        // Always set trial_used to true if user is starting a trial
        // This ensures that even if they cancel and re-subscribe, they won't get another trial
        if (subscription.status === 'trialing') {
          updateData.trial_used = true;
          updateData.trial_ends_at = trialEndsAt;
          console.log('Setting trial_used to true for user starting trial');
        }
        
        // If they already used trial before, keep it marked as used
        if (trialUsed) {
          updateData.trial_used = true;
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
    
    // Handle trial ending (3 days before trial ends)
    if (event.type === 'customer.subscription.trial_will_end') {
      const subscription = event.data.object;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, trial_ends_at')
        .eq('stripe_customer_id', subscription.customer)
        .single();
      
      if (profiles?.id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(profiles.id);
        
        if (authUser?.user?.email) {
          // Calculate days left
          const trialEnd = new Date(subscription.trial_end * 1000);
          const now = new Date();
          const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
          
          try {
            await sendEmail({
              to: authUser.user.email,
              subject: `Tvoj PRO preizkus se izteka čez ${daysLeft} ${daysLeft === 1 ? 'dan' : 'dni'}! ⏰`,
              html: proTrialEndingTemplate(profiles.full_name || 'Študent', daysLeft)
            });
            console.log('✅ PRO trial ending email poslan na:', authUser.user.email);
          } catch (emailError) {
            console.error('❌ Napaka pri pošiljanju trial ending emaila:', emailError);
          }
        }
      }
    }
    
    // Handle upcoming invoice (3-7 days before renewal)
    if (event.type === 'invoice.upcoming') {
      const invoice = event.data.object;
      
      // Only handle subscription invoices, not one-time payments
      if (invoice.subscription) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('stripe_customer_id', invoice.customer)
          .single();
        
        if (profiles?.id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(profiles.id);
          
          if (authUser?.user?.email) {
            // Format renewal date
            const renewalDate = new Date(invoice.period_end * 1000).toLocaleDateString('sl-SI', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
            
            try {
              await sendEmail({
                to: authUser.user.email,
                subject: 'Tvoja PRO naročnina se obnavlja! 💳',
                html: proExpiringReminderTemplate(profiles.full_name || 'Študent', renewalDate)
              });
              console.log('✅ PRO renewal reminder email poslan na:', authUser.user.email);
            } catch (emailError) {
              console.error('❌ Napaka pri pošiljanju renewal reminder emaila:', emailError);
            }
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
