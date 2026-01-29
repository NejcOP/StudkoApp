import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import { sendBookingNotification } from "@/hooks/useNotifications";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  paid: boolean;
  price_eur: number;
  notes: string | null;
  student: {
    full_name: string;
  };
}

interface TutorBookingRequestsProps {
  tutorId: string;
}

export const TutorBookingRequests = ({ tutorId }: TutorBookingRequestsProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [hasPayoutSetup, setHasPayoutSetup] = useState<boolean>(false);
  const [checkingPayout, setCheckingPayout] = useState(true);

  useEffect(() => {
    loadBookings();
    checkPayoutStatus();

    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutor_bookings',
          filter: `tutor_id=eq.${tutorId}`
        },
        () => loadBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tutorId]);

  const checkPayoutStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_connect_account_id')
        .eq('id', user.id)
        .single();

      setHasPayoutSetup(!!profile?.stripe_connect_account_id);
    } catch (error) {
      console.error('Error checking payout:', error);
    } finally {
      setCheckingPayout(false);
    }
  };

  const loadBookings = async () => {
    try {
      // Get tutor's user_id from tutors table
      const { data: tutorData } = await supabase
        .from('tutors')
        .select('user_id')
        .eq('id', tutorId)
        .single();

      if (!tutorData) return;

      const { data, error } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_id', tutorId)
        .in('status', ['pending', 'confirmed'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Fetch student names separately
      const studentIds = [...new Set(data?.map(b => b.student_id) || [])];
      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const studentsMap = new Map(students?.map(s => [s.id, s.full_name]) || []);
      
      const bookingsWithStudents = data?.map(b => ({
        ...b,
        student: { full_name: studentsMap.get(b.student_id) || 'Neznano' }
      })) || [];

      setBookings(bookingsWithStudents as Booking[]);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Napaka pri nalaganju povpraševanj');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (bookingId: string) => {
    // Check if payout is set up before confirming paid bookings
    const booking = bookings.find(b => b.id === bookingId);
    if (booking && booking.price_eur > 0 && !hasPayoutSetup) {
      toast.error('Nastavi podatke za izplačila v profilu, da lahko spreješ plačljive rezervacije.');
      return;
    }

    setUpdating(bookingId);
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      // Get tutor name for notification
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      // Send notification to student
      if (booking) {
        await sendBookingNotification({
          type: 'booking_confirmed',
          recipientUserId: booking.student_id,
          senderName: profileData?.full_name || 'Inštruktor',
          bookingDate: format(new Date(booking.start_time), 'd. MMMM yyyy', { locale: sl }),
          bookingTime: format(new Date(booking.start_time), 'HH:mm', { locale: sl }),
          bookingId: bookingId
        });

        // Send email to student with payment link
        try {
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.student_id)
            .single();
          
          if (studentProfile?.email) {
            await supabase.functions.invoke('send-booking-email', {
              body: {
                to: studentProfile.email,
                type: 'booking_confirmed_payment',
                instructorName: profileData?.full_name || 'Inštruktor',
                studentName: studentProfile.full_name || 'Študent',
                bookingDate: format(new Date(booking.start_time), 'd. MMMM yyyy', { locale: sl }),
                bookingTime: format(new Date(booking.start_time), 'HH:mm', { locale: sl }),
                bookingId: bookingId,
                priceEur: booking.price_eur
              }
            });
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      toast.success('Rezervacija potrjena');
      loadBookings();
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error('Napaka pri potrditvi');
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    setUpdating(bookingId);
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      // Get tutor name for notification
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      // Send notification to student
      if (booking) {
        await sendBookingNotification({
          type: 'booking_rejected',
          recipientUserId: booking.student_id,
          senderName: profileData?.full_name || 'Inštruktor',
          bookingDate: format(new Date(booking.start_time), 'd. MMMM yyyy', { locale: sl }),
          bookingTime: format(new Date(booking.start_time), 'HH:mm', { locale: sl }),
          bookingId: bookingId
        });

        // Send email to student about rejection
        try {
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.student_id)
            .single();
          
          if (studentProfile?.email) {
            await supabase.functions.invoke('send-booking-email', {
              body: {
                to: studentProfile.email,
                type: 'booking_rejected',
                instructorName: profileData?.full_name || 'Inštruktor',
                studentName: studentProfile.full_name || 'Študent',
                bookingDate: format(new Date(booking.start_time), 'd. MMMM yyyy', { locale: sl }),
                bookingTime: format(new Date(booking.start_time), 'HH:mm', { locale: sl })
              }
            });
          }
        } catch (emailError) {
          console.error('Error sending rejection email:', emailError);
        }
      }

      toast.success('Rezervacija zavrnjena');
      loadBookings();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Napaka pri zavračanju');
    } finally {
      setUpdating(null);
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

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className="space-y-6">
      {/* Payout Warning */}
      {!checkingPayout && !hasPayoutSetup && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-1">
                Nastavi podatke za izplačila
              </p>
              <p className="text-xs text-orange-800 dark:text-orange-300">
                Če želiš prejemati plačano tutorstvo, moraš najprej nastaviti Podatke za izplačila v profilu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingBookings.length > 0 && (
        <Card className="p-6 bg-white/90 dark:bg-slate-800/90">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Čakajoča povpraševanja ({pendingBookings.length})
          </h3>
          <div className="space-y-3">
            {pendingBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {booking.student.full_name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                  </p>
                  {booking.notes && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      "{booking.notes}"
                    </p>
                  )}
                  <p className="text-sm font-medium text-primary mt-1">
                    {booking.price_eur}€
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(booking.id)}
                    disabled={updating === booking.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updating === booking.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Potrdi
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(booking.id)}
                    disabled={updating === booking.id}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Zavrni
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Confirmed Bookings */}
      {confirmedBookings.length > 0 && (
        <Card className="p-6 bg-white/90 dark:bg-slate-800/90">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Potrjene rezervacije ({confirmedBookings.length})
          </h3>
          <div className="space-y-3">
            {confirmedBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {booking.student.full_name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={booking.paid ? "default" : "secondary"} className="text-xs">
                      {booking.paid ? "Plačano" : "Čaka plačilo"}
                    </Badge>
                    <span className="text-sm font-medium text-primary">
                      {booking.price_eur}€
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {bookings.length === 0 && (
        <Card className="p-8 bg-white/90 dark:bg-slate-800/90">
          <p className="text-center text-muted-foreground">
            Trenutno ni novih povpraševanj
          </p>
        </Card>
      )}
    </div>
  );
};
