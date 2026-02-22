import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import { 
  Loader2, 
  Clock, 
  Calendar, 
  User,
  Video,
  CreditCard,
  AlertCircle,
  XCircle
} from "lucide-react";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  paid: boolean;
  price_eur: number;
  notes: string | null;
  meeting_url: string | null;
  tutor_id: string;
  tutor_name?: string;
}

export const BookingsList = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadBookings();
      
      // Set up realtime subscription for booking updates
      const channel = supabase
        .channel('booking-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tutor_bookings',
            filter: `student_id=eq.${userId}`
          },
          (payload) => {
            console.log('Booking updated via realtime:', payload);
            loadBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  // Auto-trigger payment if booking parameter is in URL
  useEffect(() => {
    const bookingId = searchParams.get('booking');
    if (bookingId && bookings.length > 0 && !paying) {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking && !booking.paid && booking.status === 'confirmed') {
        console.log('Auto-triggering payment for booking:', bookingId);
        handlePayment(bookingId);
      }
    }
  }, [searchParams, bookings]);

  // Reload bookings after successful payment
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      console.log('Payment successful, waiting for webhook to update database');
      toast.success('Plačilo uspešno! 🎉', {
        description: 'Rezervacija se posodablja...'
      });
      
      // Remove payment parameter from URL immediately
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      newParams.delete('booking');
      navigate(`/profile?tab=bookings${newParams.toString() ? '&' + newParams.toString() : ''}`, { replace: true });
      
      // Fallback: poll for updates in case realtime subscription doesn't work
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`Fallback polling attempt ${pollCount}/15`);
        await loadBookings();
        
        if (pollCount >= 15) {
          clearInterval(pollInterval);
        }
      }, 2000);
      
      return () => clearInterval(pollInterval);
    } else if (paymentStatus === 'cancelled') {
      toast.error('Plačilo preklicano');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      navigate(`/profile?tab=bookings${newParams.toString() ? '&' + newParams.toString() : ''}`, { replace: true });
    }
  }, [searchParams]);

  const loadBookings = async () => {
    try {
      console.log('Loading bookings for user:', userId);
      const { data: bookingsData, error } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('student_id', userId)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        throw error;
      }

      console.log('Bookings loaded:', bookingsData?.length, bookingsData);

      // Get tutor profiles (tutor_id now references profiles.id)
      const tutorIds = [...new Set(bookingsData?.map(b => b.tutor_id) || [])];
      console.log('Loading profiles for tutor IDs:', tutorIds);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', tutorIds);

      if (profileError) {
        console.error('Error loading profiles:', profileError);
      }

      console.log('Profiles loaded:', profiles);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      const enrichedBookings = bookingsData?.map(b => ({
        ...b,
        tutor_name: profilesMap.get(b.tutor_id) || 'Neznano'
      })) || [];

      console.log('Enriched bookings:', enrichedBookings);
      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Napaka pri nalaganju rezervacij');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (bookingId: string) => {
    setPaying(bookingId);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      console.log('=== PAYMENT FLOW START ===');
      console.log('Creating payment for booking:', bookingId);
      console.log('Booking details:', {
        id: booking?.id,
        price_eur: booking?.price_eur,
        tutor_id: booking?.tutor_id,
        student_id: booking?.student_id,
        status: booking?.status,
        paid: booking?.paid
      });
      
      const { data, error } = await supabase.functions.invoke('create-tutoring-payment', {
        body: { bookingId }
      });

      console.log('Payment response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (data?.error) {
        console.error('Payment creation error:', data.error);
        console.error('Error details from backend:', data.details);
        throw new Error(data.error);
      }

      if (data?.url) {
        console.log('Redirecting to Stripe Checkout:', data.url);
        console.log('=== PAYMENT FLOW: Redirecting ===');
        window.location.href = data.url;
      } else {
        console.error('No URL in response:', data);
        throw new Error('Ni dobljen payment URL');
      }
    } catch (error: any) {
      console.error('=== PAYMENT FLOW ERROR ===', error);
      const errorMessage = error.message || 'Napaka pri ustvarjanju plačila';
      toast.error(errorMessage, {
        description: 'Prosim poskusi znova ali kontaktiraj inštruktorja.'
      });
    } finally {
      setPaying(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('student_id', userId);

      if (error) throw error;
      toast.success('Rezervacija preklicana');
      loadBookings();
    } catch (error) {
      console.error('Error cancelling:', error);
      toast.error('Napaka pri preklicu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const now = new Date();
  
  // Priority 1: "Na čakanju" = Confirmed but NOT paid (regardless of time)
  // These MUST be paid before they can proceed
  const awaitingPayment = bookings.filter(b => 
    b.status === 'confirmed' && 
    !b.paid
  );
  
  // Priority 2: "Prihajajoče" = Paid and future bookings
  const upcomingBookings = bookings.filter(b => 
    b.status === 'confirmed' && 
    b.paid && 
    new Date(b.start_time) > now
  );
  
  // Priority 3: "Pretekle" = Paid past bookings, or cancelled/completed
  const pastBookings = bookings.filter(b => 
    b.status === 'completed' || 
    b.status === 'cancelled' || 
    (b.paid && new Date(b.end_time) < now)
  );

  // Debug logs to diagnose tab grouping issues
  console.log('Booking buckets computed:', {
    total: bookings.length,
    awaitingPayment: awaitingPayment.length,
    upcomingPaid: upcomingBookings.length,
    past: pastBookings.length,
    now: now.toISOString()
  });

  console.log('Awaiting payment (confirmed + unpaid):', awaitingPayment.map(b => ({
    id: b.id,
    tutor: b.tutor_name,
    start: b.start_time,
    paid: b.paid
  })));

  const getStatusBadge = (booking: Booking) => {
    if (booking.status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Na čakanju</Badge>;
    }
    if (booking.status === 'confirmed' && !booking.paid) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Čaka plačilo</Badge>;
    }
    if (booking.status === 'confirmed' && booking.paid) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Plačano</Badge>;
    }
    if (booking.status === 'completed') {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Zaključeno</Badge>;
    }
    if (booking.status === 'cancelled') {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Preklicano</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">
            Prihajajoče {upcomingBookings.length > 0 && `(${upcomingBookings.length})`}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Na čakanju {awaitingPayment.length > 0 && `(${awaitingPayment.length})`}
          </TabsTrigger>
          <TabsTrigger value="past">
            Pretekle {pastBookings.length > 0 && `(${pastBookings.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nimaš nobenih prihajajočih ur</p>
              <Button onClick={() => navigate('/tutors')}>
                Najdi tutorja
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="bg-card/95 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{booking.tutor_name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(booking)}
                          <Badge variant="outline">{booking.price_eur}€</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {booking.meeting_url && (
                          <Button
                            variant="hero"
                            onClick={() => window.open(booking.meeting_url!, '_blank')}
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Pridruži se
                          </Button>
                        )}
                        {!booking.meeting_url && (
                          <div className="text-sm text-muted-foreground">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            Inštruktor bo poslal Zoom link
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {awaitingPayment.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Ni rezervacij na čakanju</p>
            </div>
          ) : (
            <div className="space-y-4">
              {awaitingPayment.map((booking) => (
                <Card key={booking.id} className="bg-card/95 backdrop-blur-sm border-orange-500/50">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{booking.tutor_name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(booking)}
                          <Badge variant="outline">{booking.price_eur}€</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePayment(booking.id)}
                          disabled={paying === booking.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {paying === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Plačaj ({booking.price_eur}€)
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(booking.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Prekliči
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {pastBookings.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Ni preteklih rezervacij</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <Card key={booking.id} className="bg-card/50 backdrop-blur-sm opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{booking.tutor_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(booking)}
                      <Badge variant="outline">{booking.price_eur}€</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
