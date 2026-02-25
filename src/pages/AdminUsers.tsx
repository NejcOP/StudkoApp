import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Users, Calendar, Mail, User, Crown } from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  is_pro: boolean;
  subscription_status: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pro: 0,
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
        fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_pro, subscription_status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(data || []);

      // Calculate stats
      const pro = (data || []).filter(u => u.is_pro).length;

      setStats({
        total: (data || []).length,
        pro,
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

  const getUserBadges = (user: UserProfile) => {
    const badges = [];
    
    if (user.is_pro) {
      badges.push(
        <Badge key="pro" className="bg-yellow-500">
          <Crown className="w-3 h-3 mr-1" />
          PRO
        </Badge>
      );
    } else {
      badges.push(
        <Badge key="regular" variant="outline">
          <User className="w-3 h-3 mr-1" />
          Uporabnik
        </Badge>
      );
    }
    
    return badges;
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Registrirani uporabniki</h1>
          <p className="text-muted-foreground">Pregled vseh uporabnikov aplikacije</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <CardDescription>Skupaj uporabnikov</CardDescription>
              </div>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                <CardDescription>PRO uporabnikov</CardDescription>
              </div>
              <CardTitle className="text-3xl text-yellow-600">{stats.pro}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {users.map((userProfile) => (
            <Card key={userProfile.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-xl">{userProfile.full_name || 'Brez imena'}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4" />
                        {userProfile.email}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {getUserBadges(userProfile)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Registracija:</span>
                    <span className="font-medium">
                      {format(new Date(userProfile.created_at), "d. MMMM yyyy, HH:mm", { locale: sl })}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    User ID: {userProfile.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Ni registriranih uporabnikov</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
