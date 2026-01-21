import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Clock } from "lucide-react";

interface AvailabilitySlot {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface TutorAvailabilityManagerProps {
  tutorId: string;
}

const WEEKDAYS = [
  "Nedelja",
  "Ponedeljek",
  "Torek",
  "Sreda",
  "Četrtek",
  "Petek",
  "Sobota"
];

export const TutorAvailabilityManager = ({ tutorId }: TutorAvailabilityManagerProps) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSlot, setNewSlot] = useState({
    weekday: "1",
    start_time: "09:00",
    end_time: "10:00"
  });

  useEffect(() => {
    loadAvailability();
  }, [tutorId]);

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_availability')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('weekday')
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
    setAdding(true);
    try {
      const { error } = await supabase
        .from('tutor_availability')
        .insert({
          tutor_id: tutorId,
          weekday: parseInt(newSlot.weekday),
          start_time: newSlot.start_time,
          end_time: newSlot.end_time
        });

      if (error) throw error;

      toast.success('Termin dodan!');
      loadAvailability();
      setNewSlot({
        weekday: "1",
        start_time: "09:00",
        end_time: "10:00"
      });
    } catch (error: any) {
      console.error('Error adding slot:', error);
      if (error.code === '23505') {
        toast.error('Ta termin že obstaja');
      } else {
        toast.error('Napaka pri dodajanju termina');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('tutor_availability')
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

  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.weekday]) acc[slot.weekday] = [];
    acc[slot.weekday].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

  return (
    <div className="space-y-6">
      {/* Add New Slot */}
      <Card className="p-6 bg-white/90 dark:bg-slate-800/90">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Dodaj nov termin
        </h3>
        
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <Label>Dan</Label>
            <Select value={newSlot.weekday} onValueChange={(v) => setNewSlot({...newSlot, weekday: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Od</Label>
            <Input
              type="time"
              value={newSlot.start_time}
              onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
            />
          </div>

          <div>
            <Label>Do</Label>
            <Input
              type="time"
              value={newSlot.end_time}
              onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
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
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const daySlots = slotsByDay[day];
              if (!daySlots || daySlots.length === 0) return null;

              return (
                <div key={day} className="border-b border-border pb-4 last:border-0">
                  <h4 className="font-semibold mb-2">{WEEKDAYS[day]}</h4>
                  <div className="space-y-2">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg"
                      >
                        <span className="text-sm">
                          {slot.start_time} - {slot.end_time}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};