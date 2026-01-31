import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProAccess } from "@/hooks/useProAccess";
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
  Video,
  Settings,
  Sparkles,
  Lock,
  BarChart3
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { StripeConnectButton } from "@/components/StripeConnectButton";
import { Link } from "react-router-dom";
import { InstructorAvailabilityManager } from "@/components/InstructorAvailabilityManager";
import { sendBookingNotification } from "@/hooks/useNotifications";

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

interface InstructorDashboardTabProps {
  tutorId: string;
  hasPayoutSetup: boolean;
}

export const InstructorDashboardTab = ({ tutorId, hasPayoutSetup }: InstructorDashboardTabProps) => {
  const { user } = useAuth();
  const { hasProAccess, checkingAccess } = useProAccess();
  
  // Check if we have cached bookings
  const getCachedBookings = () => {
    try {
      const cached = sessionStorage.getItem(`instructor_bookings_${tutorId}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (err) {
      console.error('Error reading cached bookings:', err);
    }
    return null;
  };

  const [bookings, setBookings] = useState<Booking[]>(() => getCachedBookings() || []);
  const [loading, setLoading] = useState(!getCachedBookings());
  const [updating, setUpdating] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | '1y' | 'all'>('30d');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [dailyTip, setDailyTip] = useState<string>("");

  useEffect(() => {
    const cached = getCachedBookings();
    if (cached) {
      setBookings(cached);
      setLoading(false);
    } else if (tutorId && user) {
      loadBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorId]);

  useEffect(() => {
    if (hasProAccess) {
      generateDailyTip();
    }
  }, [hasProAccess]);

  const generateDailyTip = async () => {
    // Simulate AI-generated tip based on instructor profile
    const tips = [
      "Tvoj opis matematike bi lahko bil bolj specifičen za maturante. Poudari uspehe preteklih študentov!",
      "Dodaj fotografijo z učenci - profili s fotografijami dobijo do 40% več rezervacij.",
      "Razmisli o specialnih paketih za maturo - to je najbolj iskana storitev marca in aprila.",
      "Tvoja povprečna ocena 4.8 je odlična! Deli jo aktivno v opisu profila.",
      "Ponudi brezplačno 15-minutno konzultacijo za nove študente - to poveča konverzijo za 60%."
    ];
    
    // Get tip based on day of year to have consistent daily tip
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setDailyTip(tips[dayOfYear % tips.length]);
  };

  const analyzeProfile = async () => {
    if (!hasProAccess) {
      toast.error('Za AI analizo profila potrebuješ PRO naročnino');
      return;
    }
    
    setAiAnalysisLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('analyze-instructor-profile', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        body: { tutorId, bookings }
      });

      if (error) throw error;
      
      if (data?.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        throw new Error('Ni prejel analize od AI');
      }
    } catch (error) {
      console.error('Error analyzing profile:', error);
      toast.error('Napaka pri analizi profila');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const filterBookingsByTime = (bookings: Booking[]) => {
    const now = new Date();
    const filtered = bookings.filter(b => {
      const bookingDate = new Date(b.start_time);
      const diffMs = now.getTime() - bookingDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      switch (timeFilter) {
        case '24h':
          return diffHours <= 24 && diffHours >= 0;
        case '7d':
          return diffDays <= 7 && diffDays >= 0;
        case '30d':
          return diffDays <= 30 && diffDays >= 0;
        case '1y':
          return diffDays <= 365 && diffDays >= 0;
        case 'all':
        default:
          return true;
      }
    });
    return filtered;
  };

  const prepareChartData = () => {
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    const filtered = filterBookingsByTime(confirmedBookings);
    
    // Group by date
    const dataByDate = new Map<string, { date: string; earnings: number; bookings: number }>();
    
    filtered.forEach(booking => {
      const date = format(new Date(booking.start_time), 'dd.MM', { locale: sl });
      const existing = dataByDate.get(date) || { date, earnings: 0, bookings: 0 };
      
      dataByDate.set(date, {
        date,
        earnings: existing.earnings + (booking.price_eur * 0.80),
        bookings: existing.bookings + 1
      });
    });

    return Array.from(dataByDate.values()).sort((a, b) => {
      const [dayA, monthA] = a.date.split('.').map(Number);
      const [dayB, monthB] = b.date.split('.').map(Number);
      return (monthA * 100 + dayA) - (monthB * 100 + dayB);
    });
  };

  const loadBookings = async (silent = false) => {
    if (!tutorId) return;
    
    if (!silent) setLoading(true);

    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('start_time', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch student names
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
      
      // Cache the bookings
      try {
        sessionStorage.setItem(`instructor_bookings_${tutorId}`, JSON.stringify({
          data: enrichedBookings,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('Error caching bookings:', err);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      if (!silent) toast.error('Napaka pri nalaganju rezervacij');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking && booking.price_eur > 0 && !hasPayoutSetup) {
      toast.error('Nastavi podatke za izplačila');
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

        // Send email notification
        try {
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.student_id)
            .single();
          
          console.log('Pošiljam potrditveni email študentu:', studentProfile?.email);
          
          if (studentProfile?.email) {
            const emailResponse = await supabase.functions.invoke('send-booking-email', {
              body: {
                to: studentProfile.email,
                type: 'booking_confirmed_payment',
                studentName: studentProfile.full_name || 'Študent',
                instructorName: profileData?.full_name || 'Inštruktor',
                bookingDate: format(new Date(booking.start_time), 'd. MMMM yyyy', { locale: sl }),
                bookingTime: format(new Date(booking.start_time), 'HH:mm', { locale: sl }),
                bookingId: booking.id,
                priceEur: booking.price_eur
              }
            });
            
            console.log('Email response:', emailResponse);
            
            if (emailResponse.error) {
              console.error('Email send error:', emailResponse.error);
            } else {
              console.log('Potrditveni email z plačilom uspešno poslan!');
            }
          } else {
            console.warn('Študent nima emaila v profilu!');
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      toast.success('Rezervacija potrjena!');
      loadBookings(true);
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

        // Send email notification
        try {
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', booking.student_id)
            .single();
          
          console.log('Pošiljam email o zavrnitvi študentu:', studentProfile?.email);
          
          if (studentProfile?.email) {
            const emailResponse = await supabase.functions.invoke('send-booking-email', {
              body: {
                to: studentProfile.email,
                type: 'booking_rejected',
                studentName: studentProfile.full_name || 'Študent',
                instructorName: profileData?.full_name || 'Inštruktor',
                bookingDate: format(new Date(booking.start_time), 'd. MMMM yyyy', { locale: sl }),
                bookingTime: format(new Date(booking.start_time), 'HH:mm', { locale: sl })
              }
            });
            
            console.log('Email response:', emailResponse);
            
            if (emailResponse.error) {
              console.error('Email send error:', emailResponse.error);
            } else {
              console.log('Email o zavrnitvi uspešno poslan!');
            }
          } else {
            console.warn('Študent nima emaila v profilu!');
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      toast.success('Rezervacija zavrnjena');
      loadBookings(true);
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
      loadBookings(true);
    } catch (error) {
      console.error('Error completing:', error);
      toast.error('Napaka pri zaključevanju');
    } finally {
      setUpdating(null);
    }
  };

  // Calculate stats with memoization for performance - MUST be before any conditional returns
  const stats = useMemo(() => {
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const upcomingBookings = confirmedBookings.filter(b => new Date(b.start_time) > new Date());
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    // Calculate earnings from ALL paid bookings (not just completed) - ALL TIME
    const allPaidBookings = bookings.filter(b => b.paid);
    const allTimeTotalEarnings = allPaidBookings
      .reduce((sum, b) => sum + (b.price_eur || 0), 0);
    
    const allTimePlatformFee = allTimeTotalEarnings * 0.20;
    const allTimeNetEarnings = allTimeTotalEarnings - allTimePlatformFee;
    
    // Calculate filtered earnings based on timeFilter
    const now = new Date();
    const filteredPaidBookings = allPaidBookings.filter(b => {
      const bookingDate = new Date(b.start_time);
      const diffMs = now.getTime() - bookingDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      switch (timeFilter) {
        case '24h':
          return diffHours <= 24 && diffHours >= 0;
        case '7d':
          return diffDays <= 7 && diffDays >= 0;
        case '30d':
          return diffDays <= 30 && diffDays >= 0;
        case '1y':
          return diffDays <= 365 && diffDays >= 0;
        case 'all':
        default:
          return true;
      }
    });
    
    const totalEarnings = filteredPaidBookings
      .reduce((sum, b) => sum + (b.price_eur || 0), 0);
    
    const platformFee = totalEarnings * 0.20;
    const netEarnings = totalEarnings - platformFee;
    
    const totalHours = completedBookings.reduce((sum, b) => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    return {
      pendingBookings,
      confirmedBookings,
      upcomingBookings,
      completedBookings,
      totalEarnings,
      platformFee,
      netEarnings,
      totalHours,
      // All time stats
      allTimeTotalEarnings,
      allTimePlatformFee,
      allTimeNetEarnings
    };
  }, [bookings, timeFilter]);

  const chartData = useMemo(() => {
    const now = new Date();
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    const filtered = confirmedBookings.filter(b => {
      const bookingDate = new Date(b.start_time);
      const diffMs = now.getTime() - bookingDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      switch (timeFilter) {
        case '24h':
          return diffHours <= 24 && diffHours >= 0;
        case '7d':
          return diffDays <= 7 && diffDays >= 0;
        case '30d':
          return diffDays <= 30 && diffDays >= 0;
        case '1y':
          return diffDays <= 365 && diffDays >= 0;
        case 'all':
        default:
          return true;
      }
    });
    
    // Group by date
    const dataByDate = new Map<string, { date: string; earnings: number; bookings: number }>();
    
    filtered.forEach(booking => {
      const date = format(new Date(booking.start_time), 'dd.MM', { locale: sl });
      const existing = dataByDate.get(date) || { date, earnings: 0, bookings: 0 };
      
      dataByDate.set(date, {
        date,
        earnings: existing.earnings + (booking.price_eur * 0.80),
        bookings: existing.bookings + 1
      });
    });

    return Array.from(dataByDate.values()).sort((a, b) => {
      const [dayA, monthA] = a.date.split('.').map(Number);
      const [dayB, monthB] = b.date.split('.').map(Number);
      return (monthA * 100 + dayA) - (monthB * 100 + dayB);
    });
  }, [bookings, timeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // AI Mentor Component
  const AIMentorCard = () => {
    if (!hasProAccess) {
      return (
        <Card className="relative overflow-hidden border-2 border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-yellow-500/10" />
          <CardContent className="relative pt-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-yellow-500 mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Odkleni AI Mentorja</h3>
            <p className="text-muted-foreground mb-4">
              Pridobi personalizirane nasvete in analize za povečanje števila strank
            </p>
            <Link to="/profile">
              <Button variant="hero" className="bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Nadgradi na PRO
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-2 border-transparent bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-yellow-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-yellow-600/10 animate-pulse" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-yellow-600">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Študko AI Mentor
            <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-yellow-600 text-white border-0">PRO</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {/* Daily Tip */}
          <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-primary/20">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Dnevni Nasvet
            </h4>
            <p className="text-sm text-muted-foreground">{dailyTip}</p>
          </div>

          {/* Profile Analysis */}
          <div>
            <Button
              onClick={analyzeProfile}
              disabled={aiAnalysisLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700 text-white"
            >
              {aiAnalysisLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analiziram...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analiziraj Moj Profil
                </>
              )}
            </Button>

            {aiAnalysis && (
              <div className="mt-4 bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-primary/20">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                  {aiAnalysis}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Payout Warning */}
      {!hasPayoutSetup && (
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div className="flex-1">
              <p className="font-semibold text-orange-900 dark:text-orange-200">Nastavi podatke za izplačila</p>
              <p className="text-sm text-orange-800 dark:text-orange-300">
                Za prejemanje plačil moraš najprej povezati svoj Stripe račun.
              </p>
            </div>
            <StripeConnectButton hasConnectAccount={false} />
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card dark:bg-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Na čakanju</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prihajajoče</p>
                <p className="text-2xl font-bold text-foreground">{stats.upcomingBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opravljene ure</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Neto zaslužek</p>
                <p className="text-2xl font-bold text-foreground">{stats.netEarnings.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PRO Analytics & Graphs */}
      {hasProAccess && (
        <div className="space-y-6">
          {/* Time Filter Buttons */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              Napredna Analitika
              <Badge className="bg-gradient-to-r from-purple-600 to-yellow-600 text-white border-0">PRO</Badge>
            </h3>
            <div className="flex gap-2">
              {(['24h', '7d', '30d', '1y', 'all'] as const).map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={timeFilter === filter ? "default" : "outline"}
                  onClick={() => setTimeFilter(filter)}
                  className="text-xs"
                >
                  {filter === '24h' ? '24h' : filter === '7d' ? '7 dni' : filter === '30d' ? '30 dni' : filter === '1y' ? '1 leto' : 'Vse'}
                </Button>
              ))}
            </div>
          </div>

          {/* Charts Grid */}
          {chartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Earnings Chart */}
              <Card className="bg-card dark:bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    Zaslužek preko časa
                  </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      stroke="currentColor"
                    />
                    <YAxis 
                      className="text-xs"
                      stroke="currentColor"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}€`, 'Zaslužek']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Zaslužek (€)"
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bookings Chart */}
            <Card className="bg-card dark:bg-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Število rezervacij
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      stroke="currentColor"
                    />
                    <YAxis 
                      className="text-xs"
                      stroke="currentColor"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [value, 'Rezervacije']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="bookings" 
                      fill="#3b82f6" 
                      name="Rezervacije"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          ) : (
            <Card className="bg-card dark:bg-card shadow-lg border-primary/10">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-muted">
                    <BarChart3 className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Ni podatkov za izbrano obdobje</h3>
                    <p className="text-sm text-muted-foreground">
                      V {timeFilter === '24h' ? 'zadnjih 24 urah' : timeFilter === '7d' ? 'zadnjih 7 dneh' : timeFilter === '30d' ? 'zadnjih 30 dneh' : timeFilter === '1y' ? 'zadnjem letu' : 'tem obdobju'} nimaš potrjenih ali opravljenih rezervacij.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Locked Charts for Non-PRO Users */}
      {!hasProAccess && chartData.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              Napredna Analitika
              <Badge className="bg-gradient-to-r from-purple-600 to-yellow-600 text-white border-0">PRO</Badge>
            </h3>
          </div>

          <div className="relative">
            {/* Blurred Charts Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 blur-md select-none pointer-events-none">
              <Card className="bg-card dark:bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    Zaslužek preko časa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card dark:bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Število rezervacij
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Bar dataKey="bookings" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Unlock Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl shadow-2xl border-2 border-primary/30">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-yellow-600 rounded-2xl flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-foreground">Odkleni napredne grafe</h3>
                    <p className="text-muted-foreground mb-6">
                      Poglej podrobne statistike svojega zaslužka in rezervacij preko časa.
                    </p>
                  </div>
                  <Button 
                    onClick={() => window.location.href = '/profile'}
                    className="w-full bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700 text-white font-semibold py-6 text-lg shadow-lg"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Nadgradi na Študko PRO
                  </Button>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Samo 3,49 €/mesec • 7 dni brezplačno
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* AI Mentor - Full Width */}
      {hasProAccess && (
        <AIMentorCard />
      )}

      {!hasProAccess && (
        <AIMentorCard />
      )}

      <Tabs defaultValue="availability" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-muted dark:bg-muted">
          <TabsTrigger value="availability" className="text-foreground data-[state=active]:text-foreground">
            <Calendar className="w-4 h-4 mr-1 hidden sm:inline" />
            Razpoložljivost
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-foreground data-[state=active]:text-foreground">
            Na čakanju {stats.pendingBookings.length > 0 && `(${stats.pendingBookings.length})`}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-foreground data-[state=active]:text-foreground">Prihajajoče</TabsTrigger>
          <TabsTrigger value="past" className="text-foreground data-[state=active]:text-foreground">Pretekle</TabsTrigger>
          <TabsTrigger value="earnings" className="text-foreground data-[state=active]:text-foreground">Zaslužek</TabsTrigger>
        </TabsList>

        {/* Availability Management */}
        <TabsContent value="availability">
          <InstructorAvailabilityManager tutorId={tutorId} />
        </TabsContent>

        {/* Pending Requests */}
        <TabsContent value="pending">
          <Card className="bg-card dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="w-5 h-5 text-orange-500" />
                Čakajoča povpraševanja
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.pendingBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Ni novih povpraševanj
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.pendingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{booking.student_name}</span>
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
                          className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
          <Card className="bg-card dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calendar className="w-5 h-5 text-green-500" />
                Prihajajoče ure
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.upcomingBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Ni prihajajočih ur
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.upcomingBookings.map((booking) => {
                    const isPast = new Date(booking.end_time) < new Date();
                    return (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{booking.student_name}</span>
                            {booking.paid && (
                              <Badge className="bg-green-600 text-white">Plačano</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.start_time), "EEEE, d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                          </p>
                          <Badge className="mt-2">{booking.price_eur}€</Badge>
                        </div>
                        <div className="flex gap-2">
                          {booking.meeting_url && booking.paid && (
                            <Link to={booking.meeting_url}>
                              <Button size="sm" variant="hero">
                                <Video className="w-4 h-4 mr-1" />
                                Pridruži se
                              </Button>
                            </Link>
                          )}
                          {isPast && booking.status === 'confirmed' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkComplete(booking.id)}
                              disabled={updating === booking.id}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {updating === booking.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Zaključi
                                </>
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
          <Card className="bg-card dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                Opravljene ure
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.completedBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Še ni opravljenih ur
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.completedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{booking.student_name}</span>
                          <Badge className="bg-blue-600 text-white">Zaključeno</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.start_time), "d. MMMM yyyy 'ob' HH:mm", { locale: sl })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{(booking.price_eur * 0.80).toFixed(2)}€</p>
                        <p className="text-xs text-muted-foreground">neto</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings */}
        <TabsContent value="earnings">
          <Card className="bg-card dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Zaslužek
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted dark:bg-muted rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Bruto zaslužek</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalEarnings.toFixed(2)}€</p>
                </div>
                <div className="bg-muted dark:bg-muted rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Provizija (20%)</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{stats.platformFee.toFixed(2)}€</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6">
                <p className="text-sm text-muted-foreground mb-1">Neto zaslužek</p>
                <p className="text-4xl font-bold text-primary">{stats.netEarnings.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Izplačila prejmete preko Stripe na vaš povezan bančni račun.
                </p>
              </div>

              {/* All Time Earnings Section */}
              <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Celotni zaslužek (vse obdobje)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 dark:bg-muted/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Bruto zaslužek</p>
                    <p className="text-2xl font-bold text-foreground">{stats.allTimeTotalEarnings.toFixed(2)}€</p>
                  </div>
                  <div className="bg-muted/50 dark:bg-muted/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Provizija (20%)</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{stats.allTimePlatformFee.toFixed(2)}€</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-6 mt-4">
                  <p className="text-sm text-muted-foreground mb-1">Neto zaslužek</p>
                  <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{stats.allTimeNetEarnings.toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Skupni zaslužek od začetka uporabe platforme
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
