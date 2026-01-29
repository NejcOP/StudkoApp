import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { sl } from "date-fns/locale";
import { sendBookingNotification } from "@/hooks/useNotifications";

interface AvailabilitySlot {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface BookingCalendarProps {
  tutorId: string;
  tutorName: string;
  pricePerHour?: number;
}

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
}

export const BookingCalendar = ({ tutorId, tutorName, pricePerHour = 20 }: BookingCalendarProps) => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    loadAvailability();
  }, [tutorId]);

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_availability')
        .select('*')
        .eq('tutor_id', tutorId);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(selectedWeekStart, i);
      const weekday = date.getDay();
      
      const dayAvailability = availability.filter(a => a.weekday === weekday);
      
      dayAvailability.forEach(avail => {
        slots.push({
          date,
          startTime: avail.start_time,
          endTime: avail.end_time
        });
      });
    }
    
    return slots;
  };

  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

  const handleBooking = async () => {
    if (!user || !selectedSlot) return;

    setBooking(true);
    try {
      const [startHour, startMin] = selectedSlot.startTime.split(':');
      const [endHour, endMin] = selectedSlot.endTime.split(':');
      
      const startTime = new Date(selectedSlot.date);
      startTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const endTime = new Date(selectedSlot.date);
      endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

      // Calculate duration in hours and price
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const price = Math.round(pricePerHour * durationHours * 100) / 100;

      const { data: bookingData, error } = await supabase
        .from('tutor_bookings')
        .insert({
          tutor_id: tutorId,
          student_id: user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: bookingNotes,
          status: 'pending',
          price_eur: price
        })
        .select()
        .single();

      if (error) throw error;

      // Get student name for notification
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Get tutor user_id for notification
      const { data: tutorData } = await supabase
        .from('tutors')
        .select('user_id')
        .eq('id', tutorId)
        .single();

      // Send notification to tutor
      if (tutorData?.user_id && bookingData) {
        await sendBookingNotification({
          type: 'booking_request',
          recipientUserId: tutorData.user_id,
          senderName: profileData?.full_name || 'Študent',
          bookingDate: format(startTime, 'd. MMMM yyyy', { locale: sl }),
          bookingTime: format(startTime, 'HH:mm', { locale: sl }),
          bookingId: bookingData.id
        });

        // Send email notification to instructor
        try {
          const { data: instructorProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', tutorData.user_id)
            .single();
          
          if (instructorProfile?.email) {
            await supabase.functions.invoke('send-booking-email', {
              body: {
                to: instructorProfile.email,
                type: 'booking_request',
                instructorName: instructorProfile.full_name || 'Inštruktor',
                studentName: profileData?.full_name || 'Študent',
                bookingDate: format(startTime, 'd. MMMM yyyy', { locale: sl }),
                bookingTime: format(startTime, 'HH:mm', { locale: sl })
              }
            });
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      toast.success('Rezervacija poslana! Tutor jo bo moral potrditi.');
      setShowBookingDialog(false);
      setBookingNotes("");
      setSelectedSlot(null);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Napaka pri rezervaciji');
    } finally {
      setBooking(false);
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

  const timeSlots = generateTimeSlots();
  const slotsByDay = timeSlots.reduce((acc, slot) => {
    const dateKey = format(slot.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <>
      <Card className="p-6 bg-white/90 dark:bg-slate-800/90">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Rezerviraj termin
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, -7))}
            >
              ← Prejšnji teden
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, 7))}
            >
              Naslednji teden →
            </Button>
          </div>
        </div>

        {availability.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Tutor še nima nastavljene razpoložljivosti
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
              const date = addDays(selectedWeekStart, dayOffset);
              const dateKey = format(date, 'yyyy-MM-dd');
              const daySlots = slotsByDay[dateKey] || [];

              return (
                <div key={dayOffset} className="space-y-2">
                  <div className="text-center">
                    <p className="text-sm font-semibold">
                      {format(date, 'EEE', { locale: sl })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(date, 'd. MMM', { locale: sl })}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {daySlots.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        Ni prostih terminov
                      </div>
                    ) : (
                      daySlots.map((slot, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleSlotClick(slot)}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {slot.startTime}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potrdi rezervacijo</DialogTitle>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <p className="font-semibold">{tutorName}</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedSlot.date, 'EEEE, d. MMMM yyyy', { locale: sl })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Opombe (opcijsko)</Label>
                <Textarea
                  id="notes"
                  placeholder="Kaj bi rad obravnaval na tej uri?"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowBookingDialog(false)}
                  className="flex-1"
                >
                  Prekliči
                </Button>
                <Button
                  onClick={handleBooking}
                  disabled={booking}
                  className="flex-1"
                >
                  {booking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Potrdi rezervacijo"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};