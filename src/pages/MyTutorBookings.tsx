import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import { 
  Loader2, 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  User,
  Video,
  CreditCard,
  AlertCircle
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

const MyTutorBookings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    // Check for payment status in URL
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast.success('Plačilo uspešno! Hvala za rezervacijo.');
    } else if (payment === 'cancelled') {
      toast.error('Plačilo preklicano.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadBookings();
  }, [user]);

  // Auto-trigger payment if booking parameter is in URL
  useEffect(() => {
    const bookingId = searchParams.get('booking');
    if (bookingId && bookings.length > 0 && !paying) {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking && booking.status === 'confirmed' && !booking.paid) {
        console.log('Auto-triggering payment for booking:', bookingId);
        // Small delay to let page load
        setTimeout(() => {
          handlePayment(bookingId);
        }, 500);
      }
    }
  }, [searchParams, bookings, paying]);

  // Reload bookings when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !loading) {
        console.log('🔄 App visible - reloading my bookings');
        loadBookings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loading]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      const { data: bookingsData, error } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('student_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Fetch tutor names from tutors table
      const tutorIds = [...new Set(bookingsData?.map(b => b.tutor_id) || [])];
      const { data: tutors } = await supabase
        .from('tutors')
        .select('id, full_name')
        .in('id', tutorIds);

      const tutorsMap = new Map(tutors?.map(t => [t.id, t.full_name]) || []);
      
      const enrichedBookings = bookingsData?.map(b => ({
        ...b,
        tutor_name: tutorsMap.get(b.tutor_id) || 'Neznano'
      })) || [];

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
      const { data, error } = await supabase.functions.invoke('create-tutoring-payment', {
        body: { bookingId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.error(error.message || 'Napaka pri ustvarjanju plačila');
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
        .eq('student_id', user?.id);

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

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const upcomingBookings = confirmedBookings.filter(b => new Date(b.start_time) > new Date());
  const awaitingPayment = confirmedBookings.filter(b => !b.paid && new Date(b.start_time) > new Date());
  const pastBookings = bookings.filter(b => 
    b.status === 'completed' || b.status === 'cancelled' || 
    (b.status === 'confirmed' && new Date(b.end_time) < new Date())
  );

  const getStatusBadge = (booking: Booking) => {
    if (booking.status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Na čakanju</Badge>;
    }
    if (booking.status === 'confirmed' && !booking.paid) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Čaka plačilo</Badge>;
    }
    if (booking.status === 'confirmed') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Potrjeno</Badge>;
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
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="absolute top-32 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-96 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Moje rezervacije
            </h1>
            <p className="text-muted-foreground">
              Preglej in upravljaj svoje rezervacije tutorskih ur
            </p>
          </div>

          {/* Payment Required Alert */}
          {awaitingPayment.length > 0 && (
            <Card className="mb-6 border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
              <CardContent className="flex items-center gap-4 py-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900 dark:text-orange-200">
                    Imaš {awaitingPayment.length} potrjen{awaitingPayment.length === 1 ? 'o' : 'e'} rezervacij{awaitingPayment.length === 1 ? 'o' : 'e'}, ki čaka{awaitingPayment.length === 1 ? '' : 'jo'} plačilo
                  </p>
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    Plačaj pred začetkom ure, da zagotoviš svoje mesto.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">
                Prihajajoče {(upcomingBookings.length + pendingBookings.length) > 0 && `(${upcomingBookings.length + pendingBookings.length})`}
              </TabsTrigger>
              <TabsTrigger value="pending">
                Na čakanju {pendingBookings.length > 0 && `(${pendingBookings.length})`}
              </TabsTrigger>
              <TabsTrigger value="past">Pretekle</TabsTrigger>
            </TabsList>

            {/* Upcoming Sessions */}
            <TabsContent value="upcoming">
              <Card className="bg-card/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-500" />
                    Prihajajoče ure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">Nimaš nobenih prihajajočih ur</p>
                      <Button onClick={() => navigate('/tutors')}>
                        Najdi tutorja
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-border gap-4"
                        >
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
                            {booking.status === 'confirmed' && !booking.paid && (
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
                                    Plačaj
                                  </>
                                )}
                              </Button>
                            )}
                            {booking.meeting_url && booking.paid && (
                              <Button
                                variant="hero"
                                onClick={() => navigate(booking.meeting_url!)}
                              >
                                <Video className="w-4 h-4 mr-2" />
                                Pridruži se klicu
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pending Requests */}
            <TabsContent value="pending">
              <Card className="bg-card/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    Na čakanju
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingBookings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Ni rezervacij na čakanju
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {pendingBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex flex-col md:flex-row md:items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 gap-4"
                        >
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
                            <p className="text-sm text-muted-foreground mt-2">
                              Čaka potrditev tutorja...
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleCancel(booking.id)}
                            className="border-red-500 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Prekliči
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Past Sessions */}
            <TabsContent value="past">
              <Card className="bg-card/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    Pretekle ure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pastBookings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Ni preteklih ur
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pastBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                        >
                          <div>
                            <p className="font-semibold">{booking.tutor_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.start_time), "d. MMM yyyy, HH:mm", { locale: sl })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(booking)}
                            <span className="font-semibold text-primary">{booking.price_eur}€</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyTutorBookings;
