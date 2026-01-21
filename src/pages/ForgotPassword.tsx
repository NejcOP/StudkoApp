import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Vnesi email naslov");
      return;
    }

    setLoading(true);

    try {
      // Use production URL for password reset redirect
      const isProduction = import.meta.env.PROD;
      const redirectUrl = isProduction 
        ? 'https://studko.vercel.app/profile?tab=password'
        : `${window.location.origin}/profile?tab=password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Email poslan!', {
        description: 'Preveri svojo e-pošto za povezavo za ponastavitev gesla.',
        duration: 8000,
      });
    } catch (error: unknown) {
      console.error("Error sending reset email:", error);
      const errorMessage = error instanceof Error ? error.message : "Napaka pri pošiljanju emaila";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary-dark))] to-[hsl(var(--accent))] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient blurs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/30 blur-3xl rounded-full"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/30 blur-3xl rounded-full"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Študko
            </span>
          </div>

          {!emailSent ? (
            <>
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Pozabljeno geslo?
                </h1>
                <p className="text-muted-foreground">
                  Vpiši svoj email in poslali ti bomo povezavo za ponastavitev gesla.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email naslov</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tvoj@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white text-lg"
                  disabled={loading}
                >
                  {loading ? (
                    "Pošiljam..."
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Pošlji povezavo
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Nazaj na prijavo
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success message */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Preveri svojo e-pošto
                </h2>
                <p className="text-muted-foreground">
                  Poslali smo ti povezavo za ponastavitev gesla na <strong>{email}</strong>
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-left">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Navodilo:</strong> Klikni na povezavo v emailu in preusmerjen boš na stran, kjer lahko nastaviš novo geslo.
                  </p>
                </div>
                <div className="pt-4">
                  <Link to="/login">
                    <Button variant="outline" className="w-full">
                      Nazaj na prijavo
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
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

export default ForgotPassword;
