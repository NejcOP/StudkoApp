import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }


  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id || session.metadata?.user_id;

    // Handle note purchase (one-time payment)
    if (session.mode === 'payment' && session.metadata?.note_id && session.metadata?.user_id) {
      const noteId = session.metadata.note_id;
      const buyerId = session.metadata.user_id;
      
      // Create note purchase record
      const purchaseRes = await fetch(`${supabaseUrl}/rest/v1/note_purchases`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          note_id: noteId,
          buyer_id: buyerId,
          price: session.amount_total ? session.amount_total / 100 : 0,
        }),
      });
      
      if (!purchaseRes.ok) {
        const error = await purchaseRes.text();
        console.error('Failed to create note purchase:', error);
        return new Response(`Failed to create purchase: ${error}`, { status: 500 });
      }
      
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Če gre za Študko PRO (subscription)
    if (session.mode === 'subscription' && userId) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const trialUsed = session.metadata?.trial_used === 'true';
      
      // Determine subscription status
      const subscriptionStatus = subscription.status === 'trialing' ? 'trialing' : 
                                 subscription.status === 'active' ? 'active' : 
                                 subscription.status;
      
      // Calculate trial_ends_at if in trial
      let trialEndsAt = null;
      if (subscription.status === 'trialing' && subscription.trial_end) {
        trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
      }
      
      const updateData: any = { 
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

      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const error = await res.text();
        return new Response(`Supabase error: ${error}`, { status: 500 });
      }

      // Get user details for email notification
      const userData = await res.json();
      const userProfile = userData[0];

      // Send email notification to admin (info@studko.si)
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey && userProfile) {
        const subscriptionType = subscription.status === 'trialing' ? 'Preizkusna' : 'Plačana';
        const adminEmailBody = `
          <h2>Nova PRO naročnina</h2>
          <p>Nov uporabnik se je naročil na Študko PRO!</p>
          <ul>
            <li><strong>Ime:</strong> ${userProfile.full_name || 'Neznano'}</li>
            <li><strong>Email:</strong> ${userProfile.email || 'Neznano'}</li>
            <li><strong>Tip:</strong> ${subscriptionType}</li>
            <li><strong>Status:</strong> ${subscription.status}</li>
            <li><strong>Stripe Customer ID:</strong> ${session.customer}</li>
            <li><strong>Subscription ID:</strong> ${subscription.id}</li>
            ${trialEndsAt ? `<li><strong>Preizkus poteče:</strong> ${new Date(trialEndsAt).toLocaleDateString('sl-SI')}</li>` : ''}
          </ul>
        `;

        try {
          // Send email to admin
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Študko <no-reply@studko.si>",
              to: "info@studko.si",
              subject: `Nova PRO naročnina - ${userProfile.full_name || 'Uporabnik'}`,
              html: adminEmailBody,
            }),
          });

          // Send welcome email to user
          const userEmailBody = subscription.status === 'trialing' 
            ? `
              <h2>Dobrodošel v Študko PRO preizkusu! 🎉</h2>
              <p>Pozdravljeni ${userProfile.full_name || 'študent'},</p>
              <p>Aktivirali ste 7-dnevni brezplačni preizkus Študko PRO!</p>
              <h3>Kaj dobite s PRO:</h3>
              <ul>
                <li>✨ Neomejeno generiranje kartic, kvizov in povzetkov</li>
                <li>🤖 AI asistent brez omejitev</li>
                <li>📊 Napredna analitika učenja</li>
                <li>🎯 Prednostna podpora</li>
                <li>💾 Večji shranjevalni prostor</li>
              </ul>
              <p><strong>Preizkus poteče:</strong> ${trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Neznano'}</p>
              <p>Če preizkus prekličete pred koncem, vam ne bomo zaračunali ničesar.</p>
              <p>Srečno pri učenju! 🚀</p>
              <p>Ekipa Študko</p>
            `
            : `
              <h2>Dobrodošel v Študko PRO! 🎉</h2>
              <p>Pozdravljeni ${userProfile.full_name || 'študent'},</p>
              <p>Hvala, da ste se naročili na Študko PRO! Vaša naročnina je aktivna.</p>
              <h3>Kaj dobite s PRO:</h3>
              <ul>
                <li>✨ Neomejeno generiranje kartic, kvizov in povzetkov</li>
                <li>🤖 AI asistent brez omejitev</li>
                <li>📊 Napredna analitika učenja</li>
                <li>🎯 Prednostna podpora</li>
                <li>💾 Večji shranjevalni prostor</li>
              </ul>
              <p>Prijavite se na <a href="https://studko.si">studko.si</a> in začnite uporabljati PRO funkcije!</p>
              <p>Srečno pri učenju! 🚀</p>
              <p>Ekipa Študko</p>
            `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Študko <no-reply@studko.si>",
              to: userProfile.email,
              subject: subscription.status === 'trialing' 
                ? "Dobrodošel v Študko PRO preizkusu! 🎉" 
                : "Dobrodošel v Študko PRO! 🎉",
              html: userEmailBody,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send emails:", emailError);
          // Don't fail the webhook if email fails
        }
      }

      // Create welcome notification for PRO users
      const notificationTitle = subscription.status === 'trialing' 
        ? "Dobrodošel v PRO preizkusu! 🎉" 
        : "Dobrodošel v Študko PRO! 🎉";
      const notificationMessage = subscription.status === 'trialing'
        ? "Imaš 7 dni brezplačnega preizkusa PRO funkcij. Uživaj v neomejenih AI asistentih, napredni analitiki in še veliko več!"
        : "Hvala za naročnino! Zdaj imaš dostop do vseh PRO funkcij: neomejeni AI asistenti, napredna analitika, prednostna podpora in še več!";

      await fetch(`${supabaseUrl}/rest/v1/notifications`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          type: subscription.status === 'trialing' ? 'pro_trial_started' : 'pro_subscription_active',
          title: notificationTitle,
          message: notificationMessage,
          data: {
            subscription_id: subscription.id,
            status: subscription.status,
            trial_end: trialEndsAt
          }
        }),
      });
    }
  }

  // Handle subscription updates (e.g., trial ending, renewal)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer;
    if (customerId) {
      // Find user by stripe_customer_id
      const getRes = await fetch(`${supabaseUrl}/rest/v1/profiles?stripe_customer_id=eq.${customerId}`, {
        method: "GET",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
      });
      if (getRes.ok) {
        const users = await getRes.json();
        if (users.length > 0 && users[0].id) {
          const userId = users[0].id;
          
          const subscriptionStatus = subscription.status;
          const updateData: any = {
            subscription_status: subscriptionStatus,
            is_pro: subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
          };
          
          // Update trial_ends_at if subscription is trialing
          if (subscription.status === 'trialing' && subscription.trial_end) {
            updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
          }
          
          const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: {
              "apikey": serviceRoleKey,
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation",
            },
            body: JSON.stringify(updateData),
          });
          if (!patchRes.ok) {
            const error = await patchRes.text();
            return new Response(`Supabase error: ${error}`, { status: 500 });
          }
        }
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer;
    if (customerId) {
      // Find user by stripe_customer_id
      const getRes = await fetch(`${supabaseUrl}/rest/v1/profiles?stripe_customer_id=eq.${customerId}`, {
        method: "GET",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
      });
      if (getRes.ok) {
        const users = await getRes.json();
        if (users.length > 0 && users[0].id) {
          const userId = users[0].id;
          // Set is_pro = false
          const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: {
              "apikey": serviceRoleKey,
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation",
            },
            body: JSON.stringify({ is_pro: false }),
          });
          if (!patchRes.ok) {
            const error = await patchRes.text();
            return new Response(`Supabase error: ${error}`, { status: 500 });
          }
        }
      }
    }
  }

  return new Response("ok", { status: 200 });
});