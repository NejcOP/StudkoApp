import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Loader2, Calendar, Clock, User, Video } from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  meeting_url: string | null;
  profiles: {
    full_name: string;
  };
}

interface BookingManagementProps {
  tutorId: string;
  isTutor?: boolean;
}

export const BookingManagement = ({ tutorId, isTutor = false }: BookingManagementProps) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
    
    // Subscribe to booking changes
    const channel = supabase
      .channel('tutor_bookings_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tutor_bookings',
        filter: `tutor_id=eq.${tutorId}`
      }, () => {
        loadBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tutorId]);

  const loadBookings = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Fetch student profiles separately
      const studentIds = bookingsData?.map(b => b.student_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      // Merge the data
      const enrichedBookings = bookingsData?.map(booking => ({
        ...booking,
        profiles: profilesData?.find(p => p.id === booking.student_id) || { full_name: 'Unknown' }
      })) || [];

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (bookingId: string) => {
    setUpdating(bookingId);
    try {
      // Generate unique meeting URL
      const meetingUrl = `/call/${bookingId}`;

      const { error } = await supabase
        .from('tutor_bookings')
        .update({ 
          status: 'confirmed',
          meeting_url: meetingUrl
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Rezervacija potrjena!');
      loadBookings();
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error('Napaka pri potrjevanju');
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    setUpdating(bookingId);
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Rezervacija zavrnjena');
      loadBookings();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Napaka pri zavračanju');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    };

    const labels = {
      pending: "Na čakanju",
      confirmed: "Potrjeno",
      completed: "Zaključeno",
      cancelled: "Preklicano"
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
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
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  return (
    <div className="space-y-6">
      {/* Pending Bookings */}
      {isTutor && pendingBookings.length > 0 && (
        <Card className="p-6 bg-white/90 dark:bg-slate-800/90">
          <h3 className="text-lg font-bold mb-4">Nove rezervacije</h3>
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{booking.profiles.full_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(booking.start_time), 'EEE, d. MMM', { locale: sl })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                {booking.notes && (
                  <p className="text-sm text-muted-foreground mb-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                    {booking.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(booking.id)}
                    disabled={updating === booking.id}
                    className="flex-1"
                  >
                    {updating === booking.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Potrdi
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(booking.id)}
                    disabled={updating === booking.id}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-2" />
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
          <h3 className="text-lg font-bold mb-4">Potrjene ure</h3>
          <div className="space-y-4">
            {confirmedBookings.map((booking) => (
              <div key={booking.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{booking.profiles.full_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(booking.start_time), 'EEE, d. MMM', { locale: sl })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                {booking.meeting_url && (
                  <Button
                    variant="hero"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(booking.meeting_url!)}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Pridruži se videoklicu
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <Card className="p-6 bg-white/90 dark:bg-slate-800/90">
          <h3 className="text-lg font-bold mb-4">Pretekle ure</h3>
          <div className="space-y-3">
            {pastBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                <div>
                  <p className="font-semibold text-sm">{booking.profiles.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(booking.start_time), 'd. MMM yyyy, HH:mm', { locale: sl })}
                  </p>
                </div>
                {getStatusBadge(booking.status)}
              </div>
            ))}
          </div>
        </Card>
      )}

      {bookings.length === 0 && (
        <Card className="p-8">
          <p className="text-center text-muted-foreground">
            Ni rezervacij
          </p>
        </Card>
      )}
    </div>
  );
};