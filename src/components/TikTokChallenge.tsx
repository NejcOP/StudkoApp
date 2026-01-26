import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Sparkles } from "lucide-react";

export const TikTokChallenge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [videoLink1, setVideoLink1] = useState("");
  const [videoLink2, setVideoLink2] = useState("");
  const [hasClaim, setHasClaim] = useState(false);

  // Check if user already submitted a claim
  useState(() => {
    if (user) {
      supabase
        .from("social_claims")
        .select("id")
        .eq("user_id", user.id)
        .eq("claim_type", "tiktok_challenge")
        .maybeSingle()
        .then(({ data }) => {
          if (data) setHasClaim(true);
        });
    }
  });

  const handleSubmit = async () => {
    if (!user) return;

    if (!videoLink1 || !videoLink2) {
      toast({
        title: "Manjkajoči podatki",
        description: "Prosim vnesi oba linka do TikTok videov.",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    if (!videoLink1.includes("tiktok.com") || !videoLink2.includes("tiktok.com")) {
      toast({
        title: "Neveljavni linki",
        description: "Prosim vnesi veljavne TikTok linke.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("submit-social-claim", {
        body: {
          userId: user.id,
          claimType: "tiktok_challenge",
          videoLink1,
          videoLink2,
        },
      });

      if (error) throw error;

      toast({
        title: "Uspešno oddano! 🎉",
        description: "Tvoja prijava je bila poslana. Preverili jo bomo v nekaj dneh!",
      });

      setOpen(false);
      setHasClaim(true);
      setVideoLink1("");
      setVideoLink2("");
    } catch (error) {
      console.error("Error submitting claim:", error);
      toast({
        title: "Napaka",
        description: "Prišlo je do napake pri oddaji. Poskusi znova.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-black via-gray-900 to-black border-2 border-transparent hover:border-cyan-400 transition-all duration-300 shadow-lg">
      {/* Neon glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-pink-500 to-cyan-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
      
      <div className="relative p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center shadow-lg">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                TikTok Izziv
                <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
              </h3>
              <p className="text-xs text-cyan-400 font-semibold">1 mesec PRO brezplačno!</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-1 text-xs text-gray-300">
          <p className="text-white font-semibold text-xs">Kako sodelovati:</p>
          <div className="space-y-1 pl-1">
            <div className="flex items-start gap-1.5">
              <span className="text-cyan-400 text-sm">🎥</span>
              <p>Posnemi <span className="text-white font-bold">2 TikTok videa</span>, kjer pokažeš, kako uporabljaš Študko</p>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-pink-400 text-sm">#️⃣</span>
              <p>Uporabi hashtag <span className="text-cyan-400 font-mono text-xs">#studkoapp</span></p>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-yellow-400 text-sm">🏷️</span>
              <p>Označi naš profil <span className="text-pink-400 font-mono text-xs">@studkoapp</span></p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full bg-gradient-to-r from-cyan-500 via-pink-500 to-cyan-500 hover:from-cyan-600 hover:via-pink-600 hover:to-cyan-600 text-white font-bold py-2 text-xs shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
              disabled={hasClaim}
            >
              {hasClaim ? (
                <>
                  <Video className="w-3.5 h-3.5 mr-1.5" />
                  Prijava oddana ✓
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 mr-1.5" />
                  Oddaj dokazilo
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-900 to-black border-cyan-400">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-400" />
                Oddaj TikTok videe
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Prilepi linke do svojih TikTok videov z hashtag #studkoapp
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="video1" className="text-white">
                  Link do 1. videa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="video1"
                  placeholder="https://tiktok.com/@username/video/..."
                  value={videoLink1}
                  onChange={(e) => setVideoLink1(e.target.value)}
                  className="bg-gray-800 border-cyan-400/50 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video2" className="text-white">
                  Link do 2. videa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="video2"
                  placeholder="https://tiktok.com/@username/video/..."
                  value={videoLink2}
                  onChange={(e) => setVideoLink2(e.target.value)}
                  className="bg-gray-800 border-pink-400/50 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="bg-cyan-950/30 border border-cyan-400/30 rounded-lg p-3">
                <p className="text-xs text-cyan-300">
                  💡 <strong>Nasveti:</strong> Videi naj prikazujejo uporabo Študka (kvizi, AI, povzetki). 
                  Ne pozabi hashtaga #studkoapp in oznake @studkoapp!
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Prekliči
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold"
              >
                {submitting ? "Pošiljam..." : "Oddaj prijavo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {hasClaim && (
          <p className="text-xs text-center text-yellow-400 bg-yellow-400/10 py-2 rounded-lg">
            ⏳ Tvoja prijava je v pregledu. PRO dostop bo aktiviran v nekaj dneh!
          </p>
        )}
      </div>
    </div>
  );
};
