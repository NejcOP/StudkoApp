import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sendBookingNotification } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import { 
  Loader2, 
  Clock, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  User,
  TrendingUp,
  AlertTriangle,
  Video
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
  student_id: string;
  student_name?: string;
}

const TutorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutor, setTutor] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [hasPayoutSetup, setHasPayoutSetup] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!dataLoadedRef.current) {
      loadData();
      dataLoadedRef.current = true;
    }
  }, [user?.id]);

  // Reload data when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !loading) {
        console.log('🔄 App visible - reloading tutor dashboard');
        refreshBookings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loading]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load tutor profile - first check if user is tutor with service role workaround
      // We need to check tutor status including non-approved to give proper feedback
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_instructor')
        .eq('id', user.id)
        .single();

      if (!profileData?.is_instructor) {
        toast.error('Nimaš profila inštruktorja');
        navigate('/tutors/apply');
        return;
      }

      // Load tutor profile - RLS only allows viewing approved tutors
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tutorError) {
        console.error('Error loading tutor:', tutorError);
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (!tutorData) {
        // User is tutor but status not approved (RLS blocks it)
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (tutorData.status !== 'approved') {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setTutor(tutorData);

      // Check payout status
      const { data: payoutProfile } = await supabase
        .from('profiles')
        .select('stripe_connect_account_id')
        .eq('id', user.id)
        .single();

      setHasPayoutSetup(!!payoutProfile?.stripe_connect_account_id);

      // Load bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_id', tutorData.id)
        .order('start_time', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch student names
      const studentIds = [...new Set(bookingsData?.map(b => b.student_id) || [])];
      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const studentsMap = new Map(students?.map(s => [s.id, s.full_name]) || []);
      
      const enrichedBookings = bookingsData?.map(b => ({
        ...b,
        student_name: studentsMap.get(b.student_id) || 'Neznano'
      })) || [];

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Napaka pri nalaganju podatkov');
    } finally {
      setLoading(false);
    }
  };

  const refreshBookings = async () => {
    if (!tutor) return;
    
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_id', tutor.id)
        .order('start_time', { ascending: false });

      if (bookingsError) throw bookingsError;

      const studentIds = [...new Set(bookingsData?.map(b => b.student_id) || [])];
      if (studentIds.length === 0) {
        setBookings([]);
        return;
      }

      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const studentsMap = new Map(students?.map(s => [s.id, s.full_name]) || []);
      
      const enrichedBookings = bookingsData?.map(b => ({
        ...b,
        student_name: studentsMap.get(b.student_id) || 'Neznano'
      })) || [];

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error refreshing bookings:', error);
    }
  };

  const handleConfirm = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking && booking.price_eur > 0 && !hasPayoutSetup) {
      toast.error('Nastavi podatke za izplačila v profilu');
      return;
    }

    setUpdating(bookingId);
    try {
      const meetingUrl = `/call/${bookingId}`;
      
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ 
          status: 'confirmed',
          meeting_url: meetingUrl
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Get instructor name for notification
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
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
      }

      toast.success('Rezervacija potrjena! Študent lahko zdaj plača.');
      refreshBookings();
    } catch (error) {
      console.error('Error confirming:', error);
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

      // Get instructor name for notification
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
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
      }

      toast.success('Rezervacija zavrnjena');
      refreshBookings();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Napaka pri zavračanju');
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkComplete = async (bookingId: string) => {
    setUpdating(bookingId);
    try {
      const { error } = await supabase.rpc('complete_tutor_booking', {
        booking_id: bookingId
      });

      if (error) throw error;
      toast.success('Ura označena kot zaključena');
      refreshBookings();
    } catch (error) {
      console.error('Error completing:', error);
      toast.error('Napaka pri zaključevanju');
    } finally {
      setUpdating(null);
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

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto">
            <Card className="bg-card/95 backdrop-blur-sm border-orange-500/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Dostop zavrnjen</h2>
                <p className="text-muted-foreground">
                  Tvoja prijava za inštruktorja še ni bila odobrena. Ko bo odobrena, boš lahko dostopal do nadzorne plošče.
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="outline" onClick={() => navigate('/tutors')}>
                    Nazaj na inštruktorje
                  </Button>
                  <Button variant="hero" onClick={() => navigate('/profile')}>
                    Moj profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tutor) return null;

  // Calculate stats
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const upcomingBookings = confirmedBookings.filter(b => new Date(b.start_time) > new Date());
  const completedBookings = bookings.filter(b => b.status === 'completed');
  
  const totalEarnings = completedBookings
    .filter(b => b.paid)
    .reduce((sum, b) => sum + (b.price_eur || 0), 0);
  
  const platformFee = totalEarnings * 0.20;
  const netEarnings = totalEarnings - platformFee;
  
  const totalHours = completedBookings.reduce((sum, b) => {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="absolute top-32 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-96 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Nadzorna plošča inštruktorja
            </h1>
            <p className="text-muted-foreground">
              Upravljaj rezervacije in spremljaj zaslužek
            </p>
          </div>

          {/* Payout Warning */}
          {!hasPayoutSetup && (
            <Card className="mb-6 border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
              <CardContent className="flex items-center gap-4 py-4">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900 dark:text-orange-200">Nastavi podatke za izplačila</p>
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    Za prejemanje plačil moraš najprej povezati svoj Stripe račun.
                  </p>
                </div>
                <Button onClick={() => navigate('/profile')} variant="outline">
                  Nastavi v profilu
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/95 backdrop-blur-sm border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Na čakanju</p>
                    <p className="text-2xl font-bold">{pendingBookings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/95 backdrop-blur-sm border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prihajajoče</p>
                    <p className="text-2xl font-bold">{upcomingBookings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/95 backdrop-blur-sm border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Opravljene ure</p>
                    <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/95 backdrop-blur-sm border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Neto zaslužek</p>
                    <p className="text-2xl font-bold">{netEarnings.toFixed(2)}€</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Na čakanju {pendingBookings.length > 0 && `(${pendingBookings.length})`}
              </TabsTrigger>
              <TabsTrigger value="upcoming">Prihajajoče</TabsTrigger>
              <TabsTrigger value="past">Pretekle</TabsTrigger>
              <TabsTrigger value="earnings">Zaslužek</TabsTrigger>
            </TabsList>

            {/* Pending Requests */}
            <TabsContent value="pending">
              <Card className="bg-card/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Čakajoča povpraševanja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingBookings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Ni novih povpraševanj
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {pendingBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{booking.student_name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                            </p>
                            {booking.notes && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                "{booking.notes}"
                              </p>
                            )}
                            <Badge className="mt-2">{booking.price_eur}€</Badge>
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
                              className="border-red-500 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Zavrni
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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
                    <p className="text-center text-muted-foreground py-8">
                      Ni prihajajočih ur
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {upcomingBookings.map((booking) => {
                        const isPast = new Date(booking.end_time) < new Date();
                        return (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold">{booking.student_name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={booking.paid ? "default" : "secondary"}>
                                  {booking.paid ? "Plačano" : "Čaka plačilo"}
                                </Badge>
                                <Badge variant="outline">{booking.price_eur}€</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {booking.meeting_url && (
                                <Button
                                  size="sm"
                                  variant="hero"
                                  onClick={() => navigate(booking.meeting_url!)}
                                >
                                  <Video className="w-4 h-4 mr-1" />
                                  Klic
                                </Button>
                              )}
                              {isPast && booking.paid && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkComplete(booking.id)}
                                  disabled={updating === booking.id}
                                >
                                  {updating === booking.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Zaključi"
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                  {completedBookings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Ni preteklih ur
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {completedBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                        >
                          <div>
                            <p className="font-semibold">{booking.student_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.start_time), "d. MMM yyyy, HH:mm", { locale: sl })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={booking.paid ? "default" : "secondary"}>
                              {booking.paid ? "Plačano" : "Neplačano"}
                            </Badge>
                            <span className="font-semibold text-primary">{booking.price_eur}€</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Earnings Summary */}
            <TabsContent value="earnings">
              <Card className="bg-card/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    Povzetek zaslužka
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl text-center">
                        <p className="text-sm text-muted-foreground mb-2">Skupni prihodki</p>
                        <p className="text-3xl font-bold">{totalEarnings.toFixed(2)}€</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl text-center">
                        <p className="text-sm text-muted-foreground mb-2">Provizija platforme (15%)</p>
                        <p className="text-3xl font-bold text-red-500">-{platformFee.toFixed(2)}€</p>
                      </div>
                      <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-6 rounded-xl text-center border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-2">Neto zaslužek</p>
                        <p className="text-3xl font-bold text-primary">{netEarnings.toFixed(2)}€</p>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h4 className="font-semibold mb-4">Statistika</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{completedBookings.length}</p>
                          <p className="text-sm text-muted-foreground">Zaključenih ur</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                          <p className="text-sm text-muted-foreground">Skupnih ur</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{tutor.price_per_hour}€</p>
                          <p className="text-sm text-muted-foreground">Cena na uro</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {completedBookings.length > 0 
                              ? (netEarnings / completedBookings.length).toFixed(2) 
                              : '0'}€
                          </p>
                          <p className="text-sm text-muted-foreground">Povprečje na uro</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        <strong>Opomba:</strong> Študko zaračuna 15% provizijo na vsako plačano uro. 
                        Izplačila so avtomatska na vaš povezan Stripe račun.
                      </p>
                    </div>
                  </div>
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

export default TutorDashboard;
