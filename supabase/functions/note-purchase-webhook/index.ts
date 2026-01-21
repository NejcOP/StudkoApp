import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const sendEmailNotification = async (
  recipientEmail: string,
  buyerName: string,
  noteTitle: string,
  price: number
) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("[NOTE-PURCHASE-WEBHOOK] No RESEND_API_KEY, skipping email");
    return;
  }

  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #5b4bff 0%, #b67cff 100%); padding: 30px; border-radius: 16px; text-align: center;">
          <h1 style="color: white; margin: 0;">💰 Nova prodaja!</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa; border-radius: 16px; margin-top: 20px;">
          <p style="font-size: 16px; color: #333;">Hej!</p>
          <p style="font-size: 16px; color: #333;">
            <strong>${buyerName}</strong> je pravkar kupil tvoj zapisek <strong>"${noteTitle}"</strong>.
          </p>
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #5b4bff;">
            <p style="margin: 0; color: #666;">Zaslužek:</p>
            <p style="font-size: 24px; color: #5b4bff; font-weight: bold; margin: 5px 0;">
              €${(price * 0.80).toFixed(2)}
            </p>
            <p style="margin: 0; color: #888; font-size: 12px;">(po odbitku 20% provizije platforme)</p>
          </div>
          <p style="font-size: 14px; color: #666;">
            Sredstva bodo samodejno nakazana na tvoj Stripe račun.
          </p>
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
          Študko - Tvoja platforma za učenje
        </p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Študko <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `💰 Nova prodaja: "${noteTitle}"`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error("[NOTE-PURCHASE-WEBHOOK] Email send failed:", await response.text());
    } else {
      console.log("[NOTE-PURCHASE-WEBHOOK] Email sent successfully");
    }
  } catch (error) {
    console.error("[NOTE-PURCHASE-WEBHOOK] Email error:", error);
  }
};

const sendBuyerEmailNotification = async (
  recipientEmail: string,
  noteTitle: string,
  price: number
) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("[NOTE-PURCHASE-WEBHOOK] No RESEND_API_KEY, skipping email");
    return;
  }

  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 Hvala za nakup!</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa; border-radius: 16px; margin-top: 20px;">
          <p style="font-size: 16px; color: #333;">Hej!</p>
          <p style="font-size: 16px; color: #333;">
            Uspešno si kupil zapisek <strong>"${noteTitle}"</strong>.
          </p>
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #666;">Plačano:</p>
            <p style="font-size: 24px; color: #10b981; font-weight: bold; margin: 5px 0;">
              €${price.toFixed(2)}
            </p>
          </div>
          <p style="font-size: 14px; color: #666;">
            Zapisek zdaj najdeš v svojem profilu pod <strong>"Kupljeni zapiski"</strong>.
          </p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Srečno pri učenju! 📚
          </p>
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
          Študko - Tvoja platforma za učenje
        </p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Študko <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `🎉 Hvala za nakup: "${noteTitle}"`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error("[NOTE-PURCHASE-WEBHOOK] Buyer email send failed:", await response.text());
    } else {
      console.log("[NOTE-PURCHASE-WEBHOOK] Buyer email sent successfully");
    }
  } catch (error) {
    console.error("[NOTE-PURCHASE-WEBHOOK] Buyer email error:", error);
  }
};

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  try {
    console.log("[NOTE-PURCHASE-WEBHOOK] Received webhook");
    
    const webhookSecret = Deno.env.get("STRIPE_NOTE_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("[NOTE-PURCHASE-WEBHOOK] No webhook secret configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
      });
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log("[NOTE-PURCHASE-WEBHOOK] Event type:", event.type);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Check if this is a note purchase (has note_id in metadata)
      const noteId = session.metadata?.note_id;
      const buyerId = session.metadata?.buyer_id;
      const authorId = session.metadata?.author_id;
      const price = parseFloat(session.metadata?.price || "0");
      const noteTitle = session.metadata?.note_title || "Zapisek";
      
      if (!noteId || !buyerId) {
        console.log("[NOTE-PURCHASE-WEBHOOK] Not a note purchase, skipping");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      console.log("[NOTE-PURCHASE-WEBHOOK] Processing note purchase:", {
        noteId,
        buyerId,
        authorId,
        price
      });

      // Check if purchase already exists (idempotency)
      const { data: existingPurchase } = await supabaseAdmin
        .from("note_purchases")
        .select("id")
        .eq("buyer_id", buyerId)
        .eq("note_id", noteId)
        .maybeSingle();

      if (existingPurchase) {
        console.log("[NOTE-PURCHASE-WEBHOOK] Purchase already recorded, skipping");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Insert purchase record
      const { error: purchaseError } = await supabaseAdmin
        .from("note_purchases")
        .insert({
          buyer_id: buyerId,
          note_id: noteId,
          price: price,
        });

      if (purchaseError) {
        console.error("[NOTE-PURCHASE-WEBHOOK] Error inserting purchase:", purchaseError);
        throw purchaseError;
      }

      console.log("[NOTE-PURCHASE-WEBHOOK] Purchase recorded successfully");

      // Get buyer info for notification
      const { data: buyerProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", buyerId)
        .single();

      const buyerName = buyerProfile?.full_name || "Uporabnik";

      // Get buyer email for email notification
      const { data: buyerAuthUser } = await supabaseAdmin.auth.admin.getUserById(buyerId);
      const buyerEmail = buyerAuthUser?.user?.email;

      // If author exists, send notifications and process transfer
      if (authorId) {
        // Get author info
        const { data: authorProfile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_connect_account_id")
          .eq("id", authorId)
          .single();

        // Get author email from auth.users
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(authorId);
        const authorEmail = authUser?.user?.email;

        // Insert in-app notification
        const { error: notifError } = await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: authorId,
            type: "note_purchased",
            title: "Nova prodaja! 💰",
            message: `${buyerName} je kupil tvoj zapisek "${noteTitle}" za €${price.toFixed(2)}`,
            data: {
              note_id: noteId,
              buyer_id: buyerId,
              buyer_name: buyerName,
              note_title: noteTitle,
              price: price,
              earnings: price * 0.80
            }
          });

        if (notifError) {
          console.error("[NOTE-PURCHASE-WEBHOOK] Error inserting notification:", notifError);
        } else {
          console.log("[NOTE-PURCHASE-WEBHOOK] In-app notification sent");
        }

        // Send notification to buyer (thank you message)
        const { error: buyerNotifError } = await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: buyerId,
            type: "note_bought",
            title: "Hvala za nakup! 🎉",
            message: `Uspešno si kupil zapisek "${noteTitle}". Zdaj ga najdeš v svojem profilu pod 'Kupljeni zapiski'.`,
            data: {
              note_id: noteId,
              note_title: noteTitle,
              price: price
            }
          });

        if (buyerNotifError) {
          console.error("[NOTE-PURCHASE-WEBHOOK] Error inserting buyer notification:", buyerNotifError);
        } else {
          console.log("[NOTE-PURCHASE-WEBHOOK] Buyer notification sent");
        }

        // Send email notification to seller
        if (authorEmail) {
          await sendEmailNotification(authorEmail, buyerName, noteTitle, price);
        }

        // Send email notification to buyer
        if (buyerEmail) {
          await sendBuyerEmailNotification(buyerEmail, noteTitle, price);
        }

        // If author has Stripe Connect, process transfer
        if (authorProfile?.stripe_connect_account_id) {
          // Calculate 80% payout (20% platform fee)
          const payoutAmount = Math.round(price * 80); // In cents
          
          try {
            await stripe.transfers.create({
              amount: payoutAmount,
              currency: "eur",
              destination: authorProfile.stripe_connect_account_id,
              transfer_group: `note_${noteId}`,
              metadata: {
                note_id: noteId,
                buyer_id: buyerId,
              },
            });
            console.log("[NOTE-PURCHASE-WEBHOOK] Transfer created for author:", authorId);
          } catch (transferError) {
            console.error("[NOTE-PURCHASE-WEBHOOK] Transfer error:", transferError);
            // Don't fail the webhook, purchase is still valid
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("[NOTE-PURCHASE-WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 400,
    });
  }
});
