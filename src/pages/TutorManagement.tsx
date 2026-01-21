import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TutorAvailabilityManager } from "@/components/TutorAvailabilityManager";
import { BookingManagement } from "@/components/BookingManagement";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const TutorManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadTutorProfile();
  }, [user]);

  const loadTutorProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tutors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No tutor profile found
          toast.error('Nimaš profila tutorja. Prijavi se kot tutor.');
          navigate('/tutors/apply');
        } else {
          throw error;
        }
        return;
      }

      setTutor(data);
    } catch (error) {
      console.error('Error loading tutor profile:', error);
      toast.error('Napaka pri nalaganju profila');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tutor) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Upravljanje tutorstva
            </h1>
            <p className="text-muted-foreground">
              Nastavi razpoložljivost in upravljaj rezervacije
            </p>
          </div>

          <Tabs defaultValue="availability" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="availability">Razpoložljivost</TabsTrigger>
              <TabsTrigger value="bookings">Rezervacije</TabsTrigger>
            </TabsList>

            <TabsContent value="availability">
              <TutorAvailabilityManager tutorId={tutor.id} />
            </TabsContent>

            <TabsContent value="bookings">
              <BookingManagement tutorId={tutor.id} isTutor={true} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TutorManagement;