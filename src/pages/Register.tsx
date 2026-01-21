import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Upload, Brain, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");

  useEffect(() => {
    if (user) {
      navigate('/notes');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Napaka",
        description: "Gesli se ne ujemata.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Napaka",
        description: "Geslo mora biti dolgo vsaj 6 znakov.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await signUp(formData.email, formData.password, formData.name);

    if (error) {
      toast({
        title: "Napaka pri registraciji",
        description: error.message === "User already registered"
          ? "Ta email je že registriran."
          : error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      // Handle referral if present
      if (referralCode) {
        try {
          // Get the referrer's ID from their referral code
          const { data: referrerProfile, error: referrerError } = await supabase
            .from("profiles")
            .select("id")
            .eq("referral_code", referralCode)
            .single();

          if (!referrerError && referrerProfile) {
            // Get the new user's ID
            const { data: { user: newUser } } = await supabase.auth.getUser();
            
            if (newUser) {
              // Create referral record
              await supabase
                .from("referrals")
                .insert({
                  referrer_id: referrerProfile.id,
                  referred_id: newUser.id,
                });

              toast({
                title: "Uspešna registracija!",
                description: "Dobrodošel v Študko. Tvoj prijatelj bo prejel nagrado za povabilo! 🎉",
              });
            }
          }
        } catch (referralError) {
          console.error("Error processing referral:", referralError);
          // Don't block registration if referral fails
        }
      } else {
        toast({
          title: "Uspešna registracija!",
          description: "Dobrodošel v Študko.",
        });
      }
      
      navigate('/notes');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary-dark))] to-[hsl(var(--accent))] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient blurs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-purple-500/30 blur-3xl rounded-full"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/30 blur-3xl rounded-full"></div>
      
      {/* Referral Banner */}
      {referralCode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Award className="w-5 h-5" />
          <span className="font-semibold">🎉 Povabljen si od prijatelja! Oba dobita ugodnosti!</span>
        </div>
      )}
      
      <div className="w-full max-w-6xl relative z-10">
        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          
          {/* LEFT SIDE - Brand Section (order-2 on mobile, order-1 on desktop) */}
          <div className="text-white space-y-6 p-4 sm:p-6 md:p-8 order-2 md:order-1">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-4 sm:mb-6 md:mb-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold">Študko</span>
            </div>

            {/* Welcome message */}
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                Ustvari svoj Študko račun
              </h1>
              <p className="text-xl text-white/90">
                Shrani svoje zapiske, zasluži z njimi in uporabi AI za učenje.
              </p>
            </div>

            {/* Benefits cards */}
            <div className="space-y-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg mb-1">Naloži PDF ali fotografije</p>
                    <p className="text-white/80 text-sm">Shrani svoje zapiske v PDF ali fotografiraj zvezek</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg mb-1">Dostop do najboljših zapiskov</p>
                    <p className="text-white/80 text-sm">Brskaj med zapiske drugih dijakov in študentov</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg mb-1">AI razlaga nalog in snovi</p>
                    <p className="text-white/80 text-sm">Študko AI ti pomaga razumeti težke koncepte</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm">
              <span className="inline-block px-2 py-0.5 bg-gradient-to-r from-green-400 to-blue-400 rounded text-xs font-bold text-white">
                BETA
              </span>
              Pridruži se prvi generaciji uporabnikov
            </div>
          </div>

          {/* RIGHT SIDE - Register Form Card (order-1 on mobile, order-2 on desktop) */}
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 order-1 md:order-2">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Registracija</h2>
              <p className="text-muted-foreground">Ustvari svoj brezplačen račun</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Ime in priimek
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Janez Novak"
                  value={formData.name}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-pošta
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tvoj.email@primer.si"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Geslo
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <p className="text-xs text-muted-foreground">Geslo mora biti dolgo vsaj 6 znakov</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Potrdi geslo
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="h-12 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="flex items-start gap-2 text-sm pt-2">
                <input type="checkbox" className="mt-1 rounded border-border" required />
                <span className="text-muted-foreground">
                  Strinjam se s{" "}
                  <Link to="/terms" className="text-primary hover:underline font-medium">
                    pogoji uporabe
                  </Link>{" "}
                  in{" "}
                  <Link to="/privacy" className="text-primary hover:underline font-medium">
                    politiko zasebnosti
                  </Link>
                </span>
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full h-14"
                disabled={loading}
              >
                {loading ? "Registracija..." : "Registriraj se"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Že imaš račun?{" "}
                <Link to="/login" className="text-primary font-semibold hover:underline">
                  Prijavi se
                </Link>
              </p>
            </div>
          </div>
        </div>
        
        {/* Back to home link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mt-8 transition-colors"
        >
          ← Nazaj na domačo stran
        </Link>
      </div>
    </div>
  );
};

export default Register;
