import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Calendar } from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { sl } from "date-fns/locale";

interface AvailabilitySlot {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface TutorAvailabilityDatesProps {
  tutorId: string;
}

export const TutorAvailabilityDates = ({ tutorId }: TutorAvailabilityDatesProps) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: "",
    start_time: "09:00",
    end_time: "10:00"
  });

  useEffect(() => {
    loadAvailability();
  }, [tutorId]);

  const loadAvailability = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('tutor_availability_dates')
        .select('*')
        .eq('tutor_id', tutorId)
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

    setAdding(true);
    try {
      const { error } = await supabase
        .from('tutor_availability_dates')
        .insert({
          tutor_id: tutorId,
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
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Slot */}
      <Card className="p-6 bg-white/90 dark:bg-slate-800/90">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Dodaj nov termin
        </h3>
        
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <Label>Datum</Label>
            <Input
              type="date"
              value={newSlot.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewSlot({...newSlot, date: e.target.value})}
              className="bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <Label>Od</Label>
            <Input
              type="time"
              value={newSlot.start_time}
              onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
              className="bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <Label>Do</Label>
            <Input
              type="time"
              value={newSlot.end_time}
              onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
              className="bg-white dark:bg-slate-800"
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
      </Card>

      {/* Current Availability */}
      <Card className="p-6 bg-white/90 dark:bg-slate-800/90">
        <h3 className="text-lg font-bold mb-4">Tvoja razpoložljivost</h3>
        
        {slots.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Še nisi dodal nobenih terminov
          </p>
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {format(parseISO(slot.available_date), "EEEE, d. MMMM yyyy", { locale: sl })}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {slot.start_time} - {slot.end_time}
                    {slot.is_booked && <span className="ml-2 text-xs text-primary">(Rezervirano)</span>}
                  </p>
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
        )}
      </Card>
    </div>
  );
};
