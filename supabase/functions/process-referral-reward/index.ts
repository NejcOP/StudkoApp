import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    console.log("[REFERRAL-REWARD] Processing reward for user:", userId);

    // Count unrewarded referrals
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from("referrals")
      .select("*")
      .eq("referrer_id", userId)
      .eq("rewarded", false);

    if (referralsError) {
      console.error("[REFERRAL-REWARD] Error fetching referrals:", referralsError);
      throw referralsError;
    }

    const referralCount = referrals?.length || 0;
    console.log("[REFERRAL-REWARD] Unrewarded referrals:", referralCount);

    if (referralCount >= 3) {
      // Get user's referral history to determine tier
      const { data: allReferrals, error: historyError } = await supabaseAdmin
        .from("referrals")
        .select("rewarded")
        .eq("referrer_id", userId);

      if (historyError) {
        console.error("[REFERRAL-REWARD] Error fetching history:", historyError);
        throw historyError;
      }

      // Count how many rewards already claimed
      const rewardedCount = allReferrals?.filter(r => r.rewarded).length || 0;
      const rewardTier = Math.floor(rewardedCount / 3);

      // Define reward tiers: 0 = 30 days, 1 = 7 days, 2 = 3 days, 3+ = no more rewards
      const rewardDays: { [key: number]: number } = {
        0: 30,  // First 3 referrals = 1 month
        1: 7,   // Next 3 referrals = 1 week
        2: 3,   // Last 3 referrals = 3 days
      };

      const daysToAdd = rewardDays[rewardTier];

      if (daysToAdd === undefined) {
        console.log("[REFERRAL-REWARD] Max rewards reached");
        return new Response(
          JSON.stringify({ success: false, message: "Maximum rewards reached" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("[REFERRAL-REWARD] Reward tier:", rewardTier, "Days:", daysToAdd);
      console.log("[REFERRAL-REWARD] Reward tier:", rewardTier, "Days:", daysToAdd);
      
      // Get current PRO status
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("pro_status, pro_expires_at")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("[REFERRAL-REWARD] Error fetching profile:", profileError);
        throw profileError;
      }

      // Calculate new expiration date
      const now = new Date();
      let newExpiresAt: Date;

      if (profile.pro_status && profile.pro_expires_at) {
        // If already PRO, extend from current expiration
        const currentExpiration = new Date(profile.pro_expires_at);
        newExpiresAt = currentExpiration > now ? currentExpiration : now;
      } else {
        // If not PRO, start from now
        newExpiresAt = now;
      }

      // Add reward days
      newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);

      // Update profile with PRO access
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          pro_status: true,
          pro_expires_at: newExpiresAt.toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("[REFERRAL-REWARD] Error updating profile:", updateError);
        throw updateError;
      }

      // Mark referrals as rewarded (only the ones used for this reward)
      const referralsToMark = referrals.slice(0, 3);
      const referralIds = referralsToMark.map((r) => r.id);

      const { error: markError } = await supabaseAdmin
        .from("referrals")
        .update({ rewarded: true })
        .in("id", referralIds);

      if (markError) {
        console.error("[REFERRAL-REWARD] Error marking referrals:", markError);
        throw markError;
      }

      // Create notification with appropriate message
      const rewardMessages: { [key: number]: string } = {
        0: `Prejeli si 1 mesec brezplačnega PRO dostopa! Hvala za deljenje Študka.`,
        1: `Prejeli si 1 teden brezplačnega PRO dostopa! Hvala za deljenje Študka.`,
        2: `Prejeli si 3 dni brezplačnega PRO dostopa! To je bila tvoja zadnja nagrada.`,
      };

      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          type: "referral_reward",
          title: "🎉 Nagrada za povabila!",
          message: rewardMessages[rewardTier],
          data: {
            reward_days: daysToAdd,
            reward_tier: rewardTier,
            referrals_used: 3,
          },
        });

      if (notifError) {
        console.error("[REFERRAL-REWARD] Error creating notification:", notifError);
      }

      console.log("[REFERRAL-REWARD] Reward processed successfully:", {
        userId,
        rewardTier,
        daysToAdd,
        newExpiresAt: newExpiresAt.toISOString(),
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          rewardDays: daysToAdd,
          rewardTier,
          newExpiresAt: newExpiresAt.toISOString() 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      console.log("[REFERRAL-REWARD] Not enough referrals yet");
      return new Response(
        JSON.stringify({ success: false, message: "Not enough referrals" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("[REFERRAL-REWARD] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
