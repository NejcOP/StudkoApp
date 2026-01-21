import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { sl } from "date-fns/locale";
import { 
  Loader2, 
  Calendar, 
  Plus, 
  Trash2,
  Clock
} from "lucide-react";

interface AvailabilitySlot {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

const TutorAvailability = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [newSlot, setNewSlot] = useState({
    date: "",
    start_time: "09:00",
    end_time: "10:00"
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    checkTutorAndLoad();
  }, [user]);

  const checkTutorAndLoad = async () => {
    if (!user) return;

    try {
      // Check if user is an approved tutor
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_instructor')
        .eq('id', user.id)
        .single();

      if (!profile?.is_instructor) {
        toast.error('Nisi tutor');
        navigate('/tutors/apply');
        return;
      }

      loadAvailability();
    } catch (error) {
      console.error('Error checking tutor status:', error);
      navigate('/tutors');
    }
  };

  const loadAvailability = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('tutor_availability_dates')
        .select('*')
        .eq('tutor_id', user.id)
        .gte('available_date', today)
        .order('available_date')
        .order('start_time');

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('Napaka pri nalaganju razpoložljivosti');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlot.date) {
      toast.error('Prosim izberi datum');
      return;
    }

    if (newSlot.start_time >= newSlot.end_time) {
      toast.error('Končni čas mora biti po začetnem');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (newSlot.date < today) {
      toast.error('Datum mora biti danes ali v prihodnosti');
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('tutor_availability_dates')
        .insert({
          tutor_id: user!.id,
          available_date: newSlot.date,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          is_booked: false
        });

      if (error) throw error;

      toast.success('Termin dodan!');
      loadAvailability();
      setNewSlot({
        date: "",
        start_time: "09:00",
        end_time: "10:00"
      });
    } catch (error: any) {
      console.error('Error adding slot:', error);
      toast.error('Napaka pri dodajanju termina');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('tutor_availability_dates')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      toast.success('Termin odstranjen');
      loadAvailability();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Napaka pri odstranjevanju termina');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.available_date]) {
      acc[slot.available_date] = [];
    }
    acc[slot.available_date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="absolute top-32 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-96 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Moja razpoložljivost
            </h1>
            <p className="text-muted-foreground">
              Dodaj časovne bloke, ko si na voljo za tutorstvo
            </p>
          </div>

          {/* Add New Slot */}
          <Card className="mb-8 bg-card/95 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Dodaj nov termin
              </CardTitle>
              <CardDescription>
                Izberi datum in časovni razpon, ko boš na voljo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={newSlot.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewSlot({...newSlot, date: e.target.value})}
                    className="bg-background"
                  />
                </div>

                <div>
                  <Label>Od</Label>
                  <Input
                    type="time"
                    value={newSlot.start_time}
                    onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
                    className="bg-background"
                  />
                </div>

                <div>
                  <Label>Do</Label>
                  <Input
                    type="time"
                    value={newSlot.end_time}
                    onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
                    className="bg-background"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleAddSlot}
                    disabled={adding}
                    className="w-full"
                  >
                    {adding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Dodaj
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Availability */}
          <Card className="bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Trenutna razpoložljivost
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Še nisi dodal nobenih terminov
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dodaj časovne bloke zgoraj, da se študenti lahko prijavijo na tvoje ure.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                    <div key={date}>
                      <h3 className="font-semibold text-lg mb-3 border-b pb-2">
                        {format(parseISO(date), "EEEE, d. MMMM yyyy", { locale: sl })}
                      </h3>
                      <div className="space-y-2">
                        {dateSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center justify-between p-4 rounded-lg ${
                              slot.is_booked 
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                : 'bg-slate-50 dark:bg-slate-900/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="w-5 h-5 text-muted-foreground" />
                              <span className="font-medium">
                                {slot.start_time} - {slot.end_time}
                              </span>
                              {slot.is_booked && (
                                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                  Rezervirano
                                </span>
                              )}
                            </div>
                            {!slot.is_booked && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="mt-6 flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/tutor/dashboard')}>
              Nazaj na nadzorno ploščo
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TutorAvailability;
