import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { User, Copy, Share2, MessageCircle, Instagram, Sparkles, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";import { TikTokChallenge } from "@/components/TikTokChallenge";
interface ReferralStats {
  referralCode: string;
  successfulReferrals: number;
  goal: number;
  rewardTier: number;
  maxReached: boolean;
}

export const ReferralDropdown = ({ userName, hasProAccess, isMobile = false }: { userName: string; hasProAccess: boolean; isMobile?: boolean }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReferralStats>({
    referralCode: "",
    successfulReferrals: 0,
    goal: 3,
    rewardTier: 0,
    maxReached: false,
  });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const getRewardText = (tier: number) => {
    const rewards: { [key: number]: string } = {
      0: "1 mesec PRO zastonj!",
      1: "1 teden PRO zastonj!",
      2: "3 dni PRO zastonj!",
    };
    return rewards[tier] || "Nagrada";
  };

  const fetchReferralStats = useCallback(async () => {
    if (!user) return;

    try {
      // Get referral code from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Get all referrals to determine tier
      const { data: allReferrals, error: allError } = await supabase
        .from("referrals")
        .select("rewarded")
        .eq("referrer_id", user.id);

      if (allError) throw allError;

      // Count rewarded and unrewarded
      const rewardedCount = allReferrals?.filter(r => r.rewarded).length || 0;
      const unrewardedCount = allReferrals?.filter(r => !r.rewarded).length || 0;
      
      // Determine current tier (0, 1, 2)
      const currentTier = Math.floor(rewardedCount / 3);
      const maxReached = currentTier >= 3;

      setStats({
        referralCode: profile?.referral_code || "",
        successfulReferrals: unrewardedCount,
        goal: 3,
        rewardTier: currentTier,
        maxReached,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReferralStats();
    }
  }, [user, fetchReferralStats]);

  const getReferralLink = () => {
    // Use production URL for referral links
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/register?ref=${stats.referralCode}`;
  };

  const copyReferralLink = async () => {
    const link = getReferralLink();
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        toast({
          title: "Kopirano! 📋",
          description: "Referalni link je kopiran v odložišče.",
        });
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = link;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          toast({
            title: "Kopirano! 📋",
            description: "Referalni link je kopiran v odložišče.",
          });
        } else {
          throw new Error("Copy command failed");
        }
      }
    } catch (error) {
      console.error("Copy failed:", error);
      // Show the link in a prompt as last resort
      toast({
        title: "Kopiraj ročno",
        description: link,
        duration: 10000,
      });
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#5b4bff", "#b67cff", "#10b981", "#fbbf24"],
    });
  };

  const handleClaimReward = async () => {
    if (stats.successfulReferrals < stats.goal || stats.maxReached) return;
    
    setClaiming(true);
    try {
      // Call edge function to reward user
      const { data, error } = await supabase.functions.invoke("process-referral-reward", {
        body: { userId: user?.id },
      });

      if (error) throw error;

      if (data.success === false) {
        toast({
          title: "Maksimum dosežen",
          description: "Že si prejel vse možne nagrade za povabila.",
          variant: "destructive",
        });
        return;
      }

      triggerConfetti();
      
      const rewardMessages: { [key: number]: string } = {
        0: "Prejeli si 1 mesec brezplačnega PRO dostopa! 🎉",
        1: "Prejeli si 1 teden brezplačnega PRO dostopa! 🎊",
        2: "Prejeli si 3 dni brezplačnega PRO dostopa! To je bila zadnja nagrada. 🏆",
      };

      toast({
        title: "🎉 Čestitamo!",
        description: rewardMessages[stats.rewardTier] || "Prejeli si PRO dostop!",
        duration: 5000,
      });

      // Wait a bit for confetti animation
      setTimeout(() => {
        navigate("/ai");
      }, 1500);

      // Refresh stats
      fetchReferralStats();
    } catch (error) {
      console.error("Error processing reward:", error);
      toast({
        title: "Napaka",
        description: "Prišlo je do napake pri prevzemu nagrade.",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const shareToWhatsApp = () => {
    const text = `Hej, uporabi Študka za povzetke in kvize, oba dobiva ugodnosti! ${getReferralLink()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareToMessenger = () => {
    const link = getReferralLink();
    window.open(`https://www.messenger.com/t/?link=${encodeURIComponent(link)}`, "_blank");
  };

  const shareToInstagram = () => {
    // Instagram doesn't support direct sharing with pre-filled text
    // Copy link and notify user
    copyReferralLink();
    toast({
      title: "Kopiraj in deli! 📱",
      description: "Link je kopiran. Deli ga v Instagram Direct sporočilu!",
    });
  };

  const progressPercentage = (stats.successfulReferrals / stats.goal) * 100;
  const remaining = stats.goal - stats.successfulReferrals;

  // Mobile inline version (no dropdown)
  if (isMobile) {
    return (
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 space-y-3 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-primary" />
          <span className="font-bold text-base">Povabi prijatelje</span>
        </div>

        {stats.maxReached ? (
          <div className="text-center py-2">
            <p className="text-sm font-bold text-yellow-600 mb-1">🏆 Maksimum dosežen!</p>
            <p className="text-xs text-muted-foreground">
              Prejeli si že vse možne nagrade! ❤️
            </p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">
                {remaining > 0 ? (
                  <>
                    Povabi še <span className="text-primary font-bold">{remaining}</span>{" "}
                    {remaining === 1 ? "sošolca" : "sošolce"} za
                  </>
                ) : (
                  <span className="text-green-600 font-bold">🎉 Cilj dosežen!</span>
                )}
              </p>
              {remaining > 0 && (
                <p className="text-primary font-bold text-sm">{getRewardText(stats.rewardTier)}</p>
              )}
            </div>

            {remaining > 0 ? (
              <div className="space-y-2">
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{stats.successfulReferrals} / {stats.goal} povabil</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                    {progressPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleClaimReward} 
                disabled={claiming}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 text-sm shadow-lg"
              >
                {claiming ? "Prevzemam..." : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Prevzemi PRO! 🎉
                  </>
                )}
              </Button>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={loading ? "Nalaganje..." : getReferralLink()}
                className="flex-1 px-3 py-2 text-xs bg-background rounded-md border border-border truncate"
              />
              <Button size="sm" variant="secondary" onClick={copyReferralLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex flex-col gap-1 h-auto py-2"
                onClick={shareToWhatsApp}
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex flex-col gap-1 h-auto py-2"
                onClick={shareToMessenger}
              >
                <MessageCircle className="w-4 h-4 text-blue-600" />
                <span className="text-xs">Messenger</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex flex-col gap-1 h-auto py-2"
                onClick={shareToInstagram}
              >
                <Instagram className="w-4 h-4 text-pink-600" />
                <span className="text-xs">Instagram</span>
              </Button>
            </div>
          </>
        )}

        {/* TikTok Challenge */}
        <div className="pt-3 border-t border-border mt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">
            🎁 Dodatna nagrada
          </p>
          <TikTokChallenge />
        </div>
      </div>
    );
  }

  // Desktop dropdown version
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 relative">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">{userName}</span>
          {hasProAccess && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-primary text-white text-xs font-bold rounded-md">
              PRO
            </span>
          )}
          {stats.successfulReferrals > 0 && stats.successfulReferrals < stats.goal && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {stats.successfulReferrals}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="text-center">
              <p className="font-semibold text-base">{userName}</p>
              <p className="text-xs text-muted-foreground">Student</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 gap-2"
              onClick={() => navigate("/profile")}
            >
              <User className="w-4 h-4" />
              Poglej profil
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Povabi prijatelje</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Progress Section */}
        <div className="px-4 py-3 space-y-3">
          {stats.maxReached ? (
            <div className="text-center py-4">
              <p className="text-lg font-bold text-yellow-600 mb-2">🏆 Maksimum dosežen!</p>
              <p className="text-sm text-muted-foreground">
                Prejeli si že vse možne nagrade za povabila. Hvala za deljenje Študka! ❤️
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground mb-1">
                  {remaining > 0 ? (
                    <>
                      Povabi še <span className="text-primary font-bold text-lg">{remaining}</span>{" "}
                      {remaining === 1 ? "sošolca" : "sošolce"} za
                    </>
                  ) : (
                    <span className="text-green-600 font-bold">🎉 Cilj dosežen!</span>
                  )}
                </p>
                {remaining > 0 && (
                  <p className="text-primary font-bold">{getRewardText(stats.rewardTier)}</p>
                )}
                {stats.rewardTier > 0 && remaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Stopnja {stats.rewardTier + 1}/3
                  </p>
                )}
              </div>

              {/* Progress Bar or Claim Button */}
              {remaining > 0 ? (
                <div className="space-y-2">
                  <Progress value={progressPercentage} className="h-3" />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>
                      {stats.successfulReferrals} / {stats.goal} povabil
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-500" />
                      {progressPercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={handleClaimReward} 
                  disabled={claiming}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
                >
                  {claiming ? (
                    "Prevzemam..."
                  ) : (
                    <>
                      <Gift className="w-5 h-5 mr-2" />
                      Prevzemi svoj PRO! 🎉
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {/* Referral Link */}
          {!stats.maxReached && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tvoj link:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={loading ? "Nalaganje..." : getReferralLink()}
                  className="flex-1 px-3 py-2 text-xs bg-muted rounded-md border border-border truncate"
                />
                <Button size="sm" variant="secondary" onClick={copyReferralLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Social Share Buttons */}
        {!stats.maxReached && (
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Hitro deljenje:</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex flex-col gap-1 h-auto py-2"
                onClick={shareToWhatsApp}
              >
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex flex-col gap-1 h-auto py-2"
                onClick={shareToMessenger}
              >
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span className="text-xs">Messenger</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex flex-col gap-1 h-auto py-2"
                onClick={shareToInstagram}
              >
                <Instagram className="w-5 h-5 text-pink-600" />
                <span className="text-xs">Instagram</span>
              </Button>
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        {/* TikTok Challenge Section */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-3 text-center">
            🎁 Dodatna nagrada
          </p>
          <TikTokChallenge />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
