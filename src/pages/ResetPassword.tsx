import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a token
    const token = searchParams.get('token');
    if (!token) {
      toast.error('Neveljavna povezava za ponastavitev gesla');
      navigate('/forgot-password');
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Gesli se ne ujemata");
      return;
    }

    if (password.length < 6) {
      toast.error("Geslo mora imeti najmanj 6 znakov");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Geslo uspešno ponastavljeno!', {
        description: 'Sedaj se lahko prijaviš z novim geslom.',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || 'Napaka pri ponastavitvi gesla');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary-dark))] to-[hsl(var(--accent))] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 md:p-10 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Geslo ponastavljeno! ✨
          </h2>
          <p className="text-muted-foreground mb-6">
            Tvoje geslo je bilo uspešno ponastavljeno. Preusmerjamo te na prijavo...
          </p>
        </div>
      </div>
    );
  }

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

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Novo geslo
            </h1>
            <p className="text-muted-foreground">
              Vnesi svoje novo, varno geslo
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Novo geslo</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Najmanj 6 znakov"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Ponovi geslo</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ponovi novo geslo"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 pl-10 rounded-xl border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white text-lg"
              disabled={loading}
            >
              {loading ? "Nastavljam..." : "Nastavi novo geslo"}
            </Button>
          </form>

          <div className="mt-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Nasvet:</strong> Uporabi kombinacijo črk, številk in posebnih znakov za varno geslo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
