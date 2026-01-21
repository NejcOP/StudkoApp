import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Zap, Crown, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function SubscriptionUpgrade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const [checkingTrial, setCheckingTrial] = useState(true);

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!user) {
        setCheckingTrial(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('trial_used, trial_ends_at')
          .eq('id', user.id)
          .single();

        // Check if trial was used or if trial_ends_at is in the past
        const hasUsedTrial = profile?.trial_used || 
          (profile?.trial_ends_at && new Date(profile.trial_ends_at) < new Date());
        
        setTrialUsed(hasUsedTrial || false);
      } catch (error) {
        console.error('Error checking trial status:', error);
      } finally {
        setCheckingTrial(false);
      }
    };

    checkTrialStatus();
  }, [user]);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Prosimo prijavite se");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
        body: { 
          userId: user.id,
          trialUsed: trialUsed
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error("Napaka pri ustvarjanju plačilne seje. Prosimo poskusite znova.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Neomejeni AI pogovori",
      description: "Postavljajte neomejeno vprašanj AI asistentu"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Napredni AI načini",
      description: "Dostop do vseh AI funkcij: povzetki, kvizi, flashcards, korak-za-korakom"
    },
    {
      icon: <Check className="w-5 h-5" />,
      title: "Preverjanje dela",
      description: "AI preveri vaše delo in ponudi izboljšave"
    },
    {
      icon: <Crown className="w-5 h-5" />,
      title: "Prednostna podpora",
      description: "Hitre odgovore in pomoč pri težavah"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-2">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Nadgradite na PRO
          </CardTitle>
          <CardDescription className="text-lg">
            Odklenite polno moč AI asistenta in izboljšajte svoje učenje
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Features Grid */}
          <div className="grid gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10 hover:border-primary/30 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl p-6 text-center border-2 border-primary/20">
            <div className="mb-4">
              <div className="text-5xl font-bold text-primary mb-2">
                3,49 €
                <span className="text-lg text-muted-foreground font-normal">/mesec</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Brez vezave, prekliči kadarkoli.
              </p>
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={isLoading || checkingTrial}
              size="lg"
              className="w-full text-lg h-14 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Nalagam...
                </div>
              ) : checkingTrial ? (
                "Preverjam..."
              ) : (
                <>
                  {trialUsed ? "Postani član Študko PRO" : "Začni 7-dnevni brezplačni preizkus"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            {!checkingTrial && !trialUsed && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Brezplačen preizkus 7 dni, nato 3,49 €/mesec
              </p>
            )}
          </div>

          {/* Back Link */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/notes")}
              className="text-muted-foreground hover:text-foreground"
            >
              Nazaj na zapiske
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
