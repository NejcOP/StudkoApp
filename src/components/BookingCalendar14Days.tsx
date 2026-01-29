import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { format, addDays, startOfDay, isSameDay, isAfter, isBefore } from "date-fns";
import { sl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { sendBookingNotification } from "@/hooks/useNotifications";

interface AvailabilitySlot {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface ExistingBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface BookingCalendar14DaysProps {
  tutorId: string;
  tutorName: string;
  pricePerHour?: number;
  showBookingForm?: boolean;
}

interface DayData {
  date: Date;
  slots: AvailabilitySlot[];
  confirmedBookings: ExistingBooking[];
  status: 'open' | 'closed' | 'partial' | 'booked';
}

export const BookingCalendar14Days = ({ 
  tutorId, 
  tutorName, 
  pricePerHour = 20,
  showBookingForm = true 
}: BookingCalendar14DaysProps) => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [startOffset, setStartOffset] = useState(0);

  useEffect(() => {
    loadData();
  }, [tutorId]);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const twoWeeksLater = addDays(new Date(), 14).toISOString().split('T')[0];

      // Load availability slots
      const { data: availData, error: availError } = await supabase
        .from('tutor_availability_dates')
        .select('*')
        .eq('tutor_id', tutorId)
        .gte('available_date', today)
        .lte('available_date', twoWeeksLater)
        .order('available_date')
        .order('start_time');

      if (availError) throw availError;
      setAvailability(availData || []);

      // Load existing bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('id, start_time, end_time, status')
        .eq('tutor_id', tutorId)
        .in('status', ['confirmed', 'pending'])
        .gte('start_time', today);

      if (bookingsError) throw bookingsError;
      setExistingBookings(bookingsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Napaka pri nalaganju');
    } finally {
      setLoading(false);
    }
  };

  const generateDays = (): DayData[] => {
    const days: DayData[] = [];
    const today = startOfDay(new Date());

    for (let i = startOffset; i < startOffset + 14; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const daySlots = availability.filter(s => s.available_date === dateStr);
      const dayBookings = existingBookings.filter(b => {
        const bookingDate = format(new Date(b.start_time), 'yyyy-MM-dd');
        return bookingDate === dateStr;
      });

      let status: DayData['status'] = 'closed';
      if (daySlots.length > 0) {
        const availableSlots = daySlots.filter(s => !s.is_booked);
        if (availableSlots.length === 0) {
          status = 'booked';
        } else if (availableSlots.length === daySlots.length) {
          status = 'open';
        } else {
          status = 'partial';
        }
      }

      days.push({
        date,
        slots: daySlots,
        confirmedBookings: dayBookings,
        status
      });
    }

    return days;
  };

  const handleDayClick = (day: DayData) => {
    if (day.status === 'closed' || day.status === 'booked') return;
    if (!user) {
      toast.error('Za rezervacijo se moraš prijaviti');
      return;
    }
    setSelectedDate(day.date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    if (slot.is_booked) return;
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

  const handleBooking = async () => {
    if (!user || !selectedSlot || !selectedDate) return;

    setBooking(true);
    try {
      const [startHour, startMin] = selectedSlot.start_time.split(':');
      const [endHour, endMin] = selectedSlot.end_time.split(':');
      
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const endTime = new Date(selectedDate);
      endTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const price = Math.round(pricePerHour * durationHours * 100) / 100;

      // Get tutor's user_id for notification
      const { data: tutorData } = await supabase
        .from('tutors')
        .select('user_id')
        .eq('id', tutorId)
        .single();

      // Get student name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

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

      // Mark slot as booked
      await supabase
        .from('tutor_availability_dates')
        .update({ is_booked: true })
        .eq('id', selectedSlot.id);

      // Send notification to tutor
      if (tutorData?.user_id) {
        await sendBookingNotification({
          type: 'booking_request',
          recipientUserId: tutorData.user_id,
          senderName: profileData?.full_name || 'Študent',
          bookingDate: format(selectedDate, 'd. MMMM yyyy', { locale: sl }),
          bookingTime: `${selectedSlot.start_time} - ${selectedSlot.end_time}`,
          bookingId: bookingData?.id,
          message: bookingNotes
        });

        // Send email notification to instructor
        try {
          const { data: instructorProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', tutorData.user_id)
            .single();

          const { data: authData } = await supabase.auth.admin.getUserById(tutorData.user_id);
          
          if (authData?.user?.email) {
            await supabase.functions.invoke('send-booking-email', {
              body: {
                to: authData.user.email,
                type: 'booking_request',
                instructorName: instructorProfile?.full_name || 'Inštruktor',
                studentName: profileData?.full_name || 'Študent',
                bookingDate: format(selectedDate, 'd. MMMM yyyy', { locale: sl }),
                bookingTime: `${selectedSlot.start_time} - ${selectedSlot.end_time}`
              }
            });
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      toast.success('Rezervacija poslana!', {
        description: 'Inštruktor jo bo pregledal in potrdil.'
      });
      setShowBookingDialog(false);
      setBookingNotes("");
      setSelectedSlot(null);
      setSelectedDate(null);
      loadData();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Napaka pri rezervaciji');
    } finally {
      setBooking(false);
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

  const days = generateDays();
  const selectedDayData = selectedDate ? days.find(d => isSameDay(d.date, selectedDate)) : null;

  const getStatusColor = (status: DayData['status']) => {
    switch (status) {
      case 'open': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50';
      case 'partial': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/50';
      case 'booked': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'closed': return 'bg-muted border-border opacity-60';
    }
  };

  const getStatusBadge = (status: DayData['status']) => {
    switch (status) {
      case 'open': return <Badge className="bg-green-600 text-white text-[10px] px-1">Prosto</Badge>;
      case 'partial': return <Badge className="bg-yellow-600 text-white text-[10px] px-1">Delno</Badge>;
      case 'booked': return <Badge className="bg-blue-600 text-white text-[10px] px-1">Zasedeno</Badge>;
      case 'closed': return <Badge variant="secondary" className="text-[10px] px-1">Zaprto</Badge>;
    }
  };

  return (
    <>
      <Card className="bg-card border-primary/20 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Rezerviraj termin
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setStartOffset(Math.max(0, startOffset - 7))}
                disabled={startOffset === 0}
                className="h-9 w-9"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setStartOffset(startOffset + 7)}
                className="h-9 w-9"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 14-day horizontal scroll calendar - Enhanced cards */}
          <div className="overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin scrollbar-thumb-primary/20">
            <div className="flex gap-3 min-w-max">
              {days.map((day, idx) => {
                const isSelected = selectedDate && isSameDay(day.date, selectedDate);
                const isToday = isSameDay(day.date, new Date());
                const availableCount = day.slots.filter(s => !s.is_booked).length;
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border-2 min-w-[100px] transition-all duration-200",
                      getStatusColor(day.status),
                      isSelected && "ring-2 ring-primary ring-offset-2 scale-105",
                      isToday && "border-primary border-2",
                      (day.status === 'closed' || day.status === 'booked') ? "cursor-default opacity-70" : "cursor-pointer hover:scale-[1.02]"
                    )}
                  >
                    <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                      {format(day.date, 'EEE', { locale: sl })}
                    </span>
                    <span className={cn(
                      "text-2xl font-bold my-1",
                      isToday && "text-primary"
                    )}>
                      {format(day.date, 'd')}
                    </span>
                    <span className="text-xs text-muted-foreground mb-2">
                      {format(day.date, 'MMM', { locale: sl })}
                    </span>
                    <div className="mt-auto">
                      {getStatusBadge(day.status)}
                    </div>
                    {availableCount > 0 && (
                      <span className="text-xs font-medium text-primary mt-2">
                        {availableCount} {availableCount === 1 ? 'termin' : 'terminov'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day slots */}
          {selectedDayData && (
            <div className="mt-6 p-4 bg-muted/50 rounded-xl">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {format(selectedDayData.date, 'EEEE, d. MMMM', { locale: sl })}
              </h4>
              
              {selectedDayData.slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ni prostih terminov za ta dan.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDayData.slots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={slot.is_booked ? "secondary" : "outline"}
                      size="sm"
                      disabled={slot.is_booked}
                      onClick={() => handleSlotSelect(slot)}
                      className={cn(
                        "justify-start w-full",
                        !slot.is_booked && "hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      <Clock className="w-3 h-3 mr-2" />
                      {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                      {slot.is_booked && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">Zasedeno</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!user && showBookingForm && (
            <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20 text-center">
              <p className="text-sm text-muted-foreground mb-2">Za rezervacijo termina se moraš prijaviti.</p>
              <Link to="/auth/login">
                <Button variant="outline" size="sm">Prijava</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Potrdi rezervacijo</DialogTitle>
            <DialogDescription>
              Pošlji povpraševanje za inštrukcije
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && selectedDate && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold text-foreground">{tutorName}</p>
                <p className="text-sm text-muted-foreground">
                  📅 {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: sl })}
                </p>
                <p className="text-sm text-muted-foreground">
                  🕐 {selectedSlot.start_time} - {selectedSlot.end_time}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-sm">
                    {pricePerHour} €/uro
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-foreground">Opombe (opcijsko)</Label>
                <Textarea
                  id="notes"
                  placeholder="Kaj bi rad obravnaval na tej uri? Kateri predmet, tema..."
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Pošlji rezervacijo
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Inštruktor bo prejel tvoje povpraševanje in ga potrdil ali zavrnil.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
