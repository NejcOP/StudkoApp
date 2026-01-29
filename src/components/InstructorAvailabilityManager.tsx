import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  Clock, 
  Copy, 
  X,
  ChevronLeft,
  ChevronRight,
  CopyPlus
} from "lucide-react";
import { format, addDays, startOfDay, isSameDay, subDays, addWeeks, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { sl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AvailabilitySlot {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface InstructorAvailabilityManagerProps {
  tutorId: string;
}

interface DayData {
  date: Date;
  dateStr: string;
  slots: AvailabilitySlot[];
  status: 'available' | 'booked' | 'closed';
}

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "2 uri" },
];

export const InstructorAvailabilityManager = ({ tutorId }: InstructorAvailabilityManagerProps) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startOffset, setStartOffset] = useState(0);
  const [duration, setDuration] = useState("60");
  const [newSlot, setNewSlot] = useState({
    start_time: "09:00",
    end_time: "10:00"
  });

  useEffect(() => {
    loadAvailability();

    // Subscribe to real-time updates for availability slots
    const channel = supabase
      .channel('availability-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutor_availability_dates',
          filter: `tutor_id=eq.${tutorId}`
        },
        (payload) => {
          console.log('Availability changed:', payload);
          loadAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tutorId]);

  const loadAvailability = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const twoMonthsLater = addDays(new Date(), 60).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tutor_availability_dates')
        .select('*')
        .eq('tutor_id', tutorId)
        .gte('available_date', today)
        .lte('available_date', twoMonthsLater)
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

  const generateMonthDays = (): DayData[] => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const daySlots = slots.filter(s => s.available_date === dateStr);

      // Simplified logic based on is_booked field only:
      // - Green (available): Has slots with is_booked === false
      // - Orange (booked): All slots have is_booked === true
      // - Closed: No slots at all
      let status: DayData['status'] = 'closed';
      if (daySlots.length > 0) {
        const availableSlots = daySlots.filter(s => !s.is_booked);
        if (availableSlots.length > 0) {
          status = 'available'; // Green - has available slots
        } else {
          status = 'booked'; // Orange - all slots are booked
        }
      }

      return { date, dateStr, slots: daySlots, status };
    });
  };

  // Auto-calculate end time based on duration
  const updateEndTime = (startTime: string, durationMins: string) => {
    const [hours, mins] = startTime.split(':').map(Number);
    const totalMins = hours * 60 + mins + parseInt(durationMins);
    const endHours = Math.floor(totalMins / 60);
    const endMins = totalMins % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  const handleStartTimeChange = (time: string) => {
    setNewSlot({
      start_time: time,
      end_time: updateEndTime(time, duration)
    });
  };

  const handleDurationChange = (dur: string) => {
    setDuration(dur);
    setNewSlot({
      ...newSlot,
      end_time: updateEndTime(newSlot.start_time, dur)
    });
  };

  const handleAddSlot = async () => {
    if (!selectedDate) {
      toast.error('Prosim izberi datum');
      return;
    }

    if (newSlot.start_time >= newSlot.end_time) {
      toast.error('Končni čas mora biti po začetnem');
      return;
    }

    setAdding(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      console.log('📅 Adding slot:', {
        tutorId,
        available_date: dateStr,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time
      });
      
      // Check for overlapping slots
      const existingSlots = slots.filter(s => s.available_date === dateStr);
      const overlapping = existingSlots.some(s => {
        const existStart = s.start_time;
        const existEnd = s.end_time;
        return (newSlot.start_time < existEnd && newSlot.end_time > existStart);
      });

      if (overlapping) {
        toast.error('Ta termin se prekriva z obstoječim');
        setAdding(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('tutor_availability_dates')
        .insert({
          tutor_id: tutorId,
          available_date: dateStr,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          is_booked: false
        })
        .select();

      if (error) {
        console.error('❌ Insert error - Full error object:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Slot added successfully:', data);
      toast.success('Termin dodan!');
      await loadAvailability();
    } catch (error: any) {
      console.error('Error adding slot:', error);
      toast.error(`Napaka pri dodajanju termina: ${error.message}`);
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
      await loadAvailability();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Napaka pri odstranjevanju termina');
    }
  };

  const handleCopyPreviousWeek = async () => {
    if (!selectedDate) {
      toast.error('Prosim izberi datum za kopiranje');
      return;
    }

    const previousWeekDate = subDays(selectedDate, 7);
    const previousDateStr = format(previousWeekDate, 'yyyy-MM-dd');
    const targetDateStr = format(selectedDate, 'yyyy-MM-dd');

    const previousSlots = slots.filter(s => s.available_date === previousDateStr);
    
    if (previousSlots.length === 0) {
      toast.error('Prejšnji teden nima terminov za kopiranje');
      return;
    }

    setAdding(true);
    try {
      const newSlots = previousSlots.map(slot => ({
        tutor_id: tutorId,
        available_date: targetDateStr,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_booked: false
      }));

      const { error } = await supabase
        .from('tutor_availability_dates')
        .insert(newSlots);

      if (error) throw error;

      toast.success(`Kopirano ${newSlots.length} terminov iz prejšnjega tedna`);
      await loadAvailability();
    } catch (error) {
      console.error('Error copying slots:', error);
      toast.error('Napaka pri kopiranju');
    } finally {
      setAdding(false);
    }
  };

  const handleCopyWeekToNext = async () => {
    // Copy all slots from current week (startOffset) to next week
    setAdding(true);
    try {
      const today = startOfDay(new Date());
      const currentWeekStart = addDays(today, startOffset);
      const nextWeekStart = addWeeks(currentWeekStart, 1);

      // Get all slots from current visible week
      const currentWeekSlots: { date: string; slots: AvailabilitySlot[] }[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(currentWeekStart, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const daySlots = slots.filter(s => s.available_date === dateStr && !s.is_booked);
        if (daySlots.length > 0) {
          currentWeekSlots.push({ date: dateStr, slots: daySlots });
        }
      }

      if (currentWeekSlots.length === 0) {
        toast.error('Ta teden nima terminov za kopiranje');
        setAdding(false);
        return;
      }

      // Create new slots for next week
      const newSlots = currentWeekSlots.flatMap(({ date, slots: daySlots }) => {
        const originalDate = new Date(date);
        const newDate = addWeeks(originalDate, 1);
        const newDateStr = format(newDate, 'yyyy-MM-dd');
        
        return daySlots.map(slot => ({
          tutor_id: tutorId,
          available_date: newDateStr,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_booked: false
        }));
      });

      const { error } = await supabase
        .from('tutor_availability_dates')
        .insert(newSlots);

      if (error) throw error;

      toast.success(`Kopirano ${newSlots.length} terminov v naslednji teden`);
      await loadAvailability();
    } catch (error) {
      console.error('Error copying week:', error);
      toast.error('Napaka pri kopiranju tedna');
    } finally {
      setAdding(false);
    }
  };

  const handleMarkDayClosed = async () => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const daySlots = slots.filter(s => s.available_date === dateStr && !s.is_booked);

    if (daySlots.length === 0) {
      toast.info('Ni terminov za odstranitev');
      return;
    }

    try {
      const { error } = await supabase
        .from('tutor_availability_dates')
        .delete()
        .eq('tutor_id', tutorId)
        .eq('available_date', dateStr)
        .eq('is_booked', false);

      if (error) throw error;

      toast.success('Vsi prosti termini odstranjeni');
      await loadAvailability();
    } catch (error) {
      console.error('Error removing slots:', error);
      toast.error('Napaka pri odstranjevanju');
    }
  };

  if (loading) {
    return (
      <Card className="p-8 bg-card">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const days = generateMonthDays();
  const selectedDayData = selectedDate ? days.find(d => isSameDay(d.date, selectedDate)) : null;

  const getStatusColor = (status: DayData['status']) => {
    switch (status) {
      case 'available': return 'bg-green-500/20 border-green-500 hover:bg-green-500/30';
      case 'booked': return 'bg-orange-500/20 border-orange-500 hover:bg-orange-500/30';
      case 'closed': return 'bg-muted/50 border-muted hover:bg-muted';
    }
  };

  const getStatusLabel = (status: DayData['status']) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-600 text-white text-[10px]">Prosto</Badge>;
      case 'booked': return <Badge className="bg-orange-600 text-white text-[10px]">Zasedeno</Badge>;
      case 'closed': return <Badge variant="secondary" className="text-[10px]">Zaprto</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Title */}
      <div className="text-center">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {format(currentMonth, 'LLLL yyyy', { locale: sl })}
        </h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
            className="h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="h-8"
          >
            Danes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
            className="h-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid Layout: Calendar (8 cols) + Side Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar - 8 columns */}
        <div className="lg:col-span-8">
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Koledar razpoložljivosti
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWeekToNext}
                  disabled={adding}
                  className="gap-2"
                >
                  <CopyPlus className="w-4 h-4" />
                  Kopiraj teden
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day names header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Add empty cells for days before month starts */}
                {Array.from({ length: (days[0]?.date.getDay() || 0) === 0 ? 6 : (days[0]?.date.getDay() || 1) - 1 }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square" />
                ))}
                
                {days.map((day, idx) => {
                  const isSelected = selectedDate && isSameDay(day.date, selectedDate);
                  const isToday = isSameDay(day.date, new Date());
                  const isPast = day.date < startOfDay(new Date());
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => !isPast && setSelectedDate(day.date)}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center p-2 rounded-xl border-2 cursor-pointer transition-all backdrop-blur",
                        getStatusColor(day.status),
                        isSelected && "ring-2 ring-primary ring-offset-2 scale-105",
                        isToday && "border-primary font-bold",
                        isPast && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <span className={cn(
                        "text-lg font-semibold",
                        isToday && "text-primary"
                      )}>
                        {format(day.date, 'd')}
                      </span>
                      {day.status !== 'closed' && (
                        <div className="mt-1">
                          {getStatusLabel(day.status)}
                        </div>
                      )}
                      {day.slots.length > 0 && (
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {day.slots.length}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel - 4 columns */}
        <div className="lg:col-span-4">
          {selectedDayData ? (
            <Card className="bg-card/50 backdrop-blur border-white/10 sticky top-4">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">
                  Termini za {format(selectedDayData.date, 'd. MMMM', { locale: sl })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new slot form */}
                <div className="p-3 bg-muted/50 rounded-xl space-y-3">
                  <Label className="text-sm font-semibold">Dodaj nov termin</Label>
                  <div className="space-y-2">
                    <Input
                      type="time"
                      value={newSlot.start_time}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="bg-background"
                    />
                    <Select value={duration} onValueChange={handleDurationChange}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAddSlot}
                      disabled={adding}
                      className="w-full"
                    >
                      {adding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Dodaj
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* List of slots for selected day */}
                <div className="space-y-2">
                  {selectedDayData.slots.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      Ni terminov za ta dan
                    </p>
                  ) : (
                    <>
                      {/* All slots (available and booked) */}
                      {selectedDayData.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border backdrop-blur",
                            slot.is_booked
                              ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className={cn(
                              "w-4 h-4",
                              slot.is_booked ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
                            )} />
                            <span className="font-medium text-sm">{slot.start_time} - {slot.end_time}</span>
                            <Badge className={cn(
                              "text-white text-[10px]",
                              slot.is_booked ? "bg-orange-600" : "bg-green-600"
                            )}>
                              {slot.is_booked ? "Zasedeno" : "Prosto"}
                            </Badge>
                          </div>
                          {!slot.is_booked && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Quick actions */}
                {selectedDayData.slots.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkDayClosed}
                      className="w-full text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Odstrani vse proste termine
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 backdrop-blur border-white/10">
              <CardContent className="py-16">
                <p className="text-center text-muted-foreground">
                  Klikni na datum v koledarju
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
