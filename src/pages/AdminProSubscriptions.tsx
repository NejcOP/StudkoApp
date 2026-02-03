import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Calendar, User, Mail } from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";

interface ProSubscriber {
  id: string;
  full_name: string;
  email: string;
  is_pro: boolean;
  subscription_status: string;
  pro_since: string | null;
  trial_used: boolean;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

export default function AdminProSubscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<ProSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trialing: 0,
    canceled: 0,
  });

  useEffect(() => {
    checkAdminStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((data as any)?.is_admin) {
        setIsAdmin(true);
        fetchSubscribers();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_pro, subscription_status, pro_since, trial_used, trial_ends_at, stripe_subscription_id, stripe_customer_id, created_at")
        .eq("is_pro", true)
        .order("pro_since", { ascending: false });

      if (error) throw error;
      
      const subscribersData = data || [];
      setSubscribers(subscribersData);

      // Calculate stats
      const active = subscribersData.filter(s => s.subscription_status === 'active').length;
      const trialing = subscribersData.filter(s => s.subscription_status === 'trialing').length;
      const canceled = subscribersData.filter(s => s.subscription_status === 'canceled').length;

      setStats({
        total: subscribersData.length,
        active,
        trialing,
        canceled,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Napaka pri nalaganju';
      toast({
        title: "Napaka",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Aktivna</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Preizkus</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Preklicana</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Nalaganje...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Nimate dostopa do te strani.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">PRO Naročniki</h1>
          <p className="text-muted-foreground">Pregled vseh PRO naročnin</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Skupaj PRO</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Aktivne</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Na preizkusu</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.trialing}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Preklicane</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.canceled}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Subscribers List */}
        <div className="space-y-4">
          {subscribers.map((subscriber) => (
            <Card key={subscriber.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-yellow-500" />
                    <div>
                      <CardTitle className="text-xl">{subscriber.full_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4" />
                        {subscriber.email}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(subscriber.subscription_status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">PRO od:</span>
                    <span className="font-medium">
                      {subscriber.pro_since 
                        ? format(new Date(subscriber.pro_since), "d. MMMM yyyy", { locale: sl })
                        : "Neznano"}
                    </span>
                  </div>
                  
                  {subscriber.trial_ends_at && subscriber.subscription_status === 'trialing' && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Preizkus do:</span>
                      <span className="font-medium">
                        {format(new Date(subscriber.trial_ends_at), "d. MMMM yyyy", { locale: sl })}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Preizkus uporabljen:</span>
                    <span className="font-medium">{subscriber.trial_used ? "Da" : "Ne"}</span>
                  </div>
                </div>
                
                {subscriber.stripe_subscription_id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Stripe ID: {subscriber.stripe_subscription_id}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {subscribers.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Ni PRO naročnikov</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
