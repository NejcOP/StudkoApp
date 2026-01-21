import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, CheckCircle2, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/notes');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password, rememberMe);

    if (error) {
      toast({
        title: "Napaka pri prijavi",
        description: error.message === "Invalid login credentials" 
          ? "Napačno geslo ali email." 
          : error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      toast({
        title: "Uspešna prijava!",
        description: "Dobrodošel nazaj.",
      });
      navigate('/notes');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary-dark))] to-[hsl(var(--accent))] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient blurs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/30 blur-3xl rounded-full"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/30 blur-3xl rounded-full"></div>
      
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
                Dobrodošel nazaj 👋
              </h1>
              <p className="text-xl text-white/90">
                Prijavi se in dostopaj do svojih zapiskov, AI pomoči in tutorjev.
              </p>
            </div>

            {/* Benefits list */}
            <div className="space-y-4 mt-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-lg">Prodajaj svoje zapiske</p>
                  <p className="text-white/80 text-sm">Naloži svoje zapiske in zasluži z njimi</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-lg">Uporabi AI za razlago snovi</p>
                  <p className="text-white/80 text-sm">Študko AI ti pomaga razumeti snov</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-lg">Najdi tutorja v nekaj klikih</p>
                  <p className="text-white/80 text-sm">Poišči pravega tutorja za svoj predmet</p>
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Slovenska študentska platforma
            </div>
          </div>

          {/* RIGHT SIDE - Login Form Card (order-1 on mobile, order-2 on desktop) */}
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 order-1 md:order-2">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Prijava</h2>
              <p className="text-muted-foreground">Vpiši svoje podatke za prijavo</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-pošta
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tvoj.email@primer.si"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-border"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-muted-foreground">Zapomni si me</span>
                </label>
                <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                  Pozabljeno geslo?
                </Link>
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full h-14"
                disabled={loading}
              >
                {loading ? "Prijavljanje..." : "Prijava"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Nimaš računa?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Registriraj se
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

export default Login;
