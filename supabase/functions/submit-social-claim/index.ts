import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "info@studko.si";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, claimType, videoLink1, videoLink2 } = await req.json();

    // Get user info
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error("[SOCIAL-CLAIM] Error fetching user:", userError);
      throw new Error("Could not fetch user");
    }

    const userEmail = userData.user?.email;

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const userName = profile?.full_name || "Uporabnik";

    // Insert claim into database
    const { data: claim, error: claimError } = await supabaseAdmin
      .from("social_claims")
      .insert({
        user_id: userId,
        claim_type: claimType,
        video_link_1: videoLink1,
        video_link_2: videoLink2,
        status: "pending",
      })
      .select()
      .single();

    if (claimError) {
      console.error("[SOCIAL-CLAIM] Error inserting claim:", claimError);
      throw claimError;
    }

    // Send email notification to admin
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 30px; border-radius: 16px; text-align: center; border: 2px solid #00f2ea;">
            <h1 style="color: #00f2ea; margin: 0;">🎥 Nova TikTok prijava!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa; border-radius: 16px; margin-top: 20px;">
            <h2 style="color: #333; margin-top: 0;">Podatki o uporabniku:</h2>
            <p style="font-size: 16px; color: #333;">
              <strong>Ime:</strong> ${userName}<br>
              <strong>Email:</strong> ${userEmail}<br>
              <strong>User ID:</strong> ${userId}
            </p>
            
            <h2 style="color: #333;">TikTok video linki:</h2>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
              <p style="margin: 0;"><strong>Video 1:</strong></p>
              <a href="${videoLink1}" style="color: #00f2ea; word-break: break-all;">${videoLink1}</a>
            </div>
            ${videoLink2 ? `
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
                <p style="margin: 0;"><strong>Video 2:</strong></p>
                <a href="${videoLink2}" style="color: #00f2ea; word-break: break-all;">${videoLink2}</a>
              </div>
            ` : ''}
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #856404;">
                <strong>⚠️ Dejanje potrebno:</strong><br>
                Preveri videoposnetke in potrdi ali zavrni prijavo.
              </p>
              <a href="https://studko.si/admin/tiktok" 
                 style="display: inline-block; background: linear-gradient(135deg, #00f2ea 0%, #0891b2 100%); 
                        color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; 
                        font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                🎥 Odpri Admin Panel
              </a>
            </div>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            Študko Admin Panel
          </p>
        </div>
      `;

      // Send email asynchronously without blocking (fire-and-forget)

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Študko <no-reply@studko.si>",
          to: [ADMIN_EMAIL],
          subject: `🎥 Nova TikTok prijava - ${userName}`,
          html: emailHtml,
        }),
      }).then(async (emailResponse) => {
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error("[SOCIAL-CLAIM] Email send failed:", errorText);
        }
      }).catch((emailError) => {
        console.error("[SOCIAL-CLAIM] Email error:", emailError);
      });
    }

    // Create notification for user
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        type: "tiktok_claim_submitted",
        title: "TikTok izziv oddan! 🎥",
        message: "Tvoja prijava za TikTok izziv je bila poslana. Preverili jo bomo v nekaj dneh in ti aktivirali PRO dostop.",
        data: {
          claim_id: claim.id,
          claim_type: claimType,
        },
      });

    if (notifError) {
      console.error("[SOCIAL-CLAIM] Error creating notification:", notifError);
    }

    return new Response(
      JSON.stringify({ success: true, claimId: claim.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[SOCIAL-CLAIM] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
