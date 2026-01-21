import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  Check, 
  Trash2, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  FileText,
  MessageCircle,
  Award,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data: any;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    loadNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      // Rezervacije
      case 'booking_request': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'booking_confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'booking_rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'booking_cancelled': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'booking_rescheduled': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'booking_reminder': return <Bell className="w-4 h-4 text-purple-500" />;
      
      // Nakupi in prodaja
      case 'note_purchased': return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'note_bought': return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case 'note_published': return <FileText className="w-4 h-4 text-green-500" />;
      
      // PRO subscription
      case 'pro_trial_started': return <Award className="w-4 h-4 text-purple-500" />;
      case 'pro_subscription_active': return <Award className="w-4 h-4 text-yellow-500" />;
      
      // Ocene in reviews
      case 'new_review': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'rating_received': return <Award className="w-4 h-4 text-purple-500" />;
      
      // Referral sistem
      case 'referral_reward': return <Award className="w-4 h-4 text-pink-500" />;
      
      // TikTok challenge
      case 'tiktok_claim_submitted': return <Award className="w-4 h-4 text-cyan-500" />;
      
      // Sporočila
      case 'new_message': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      
      // Zapiski
      case 'note_updated': return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'note_approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 hover:bg-red-600 text-white border-2 border-background animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Obvestila</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2"
              onClick={markAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              Označi vse
            </Button>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Ni novih obvestil
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer",
                !notification.is_read && "bg-primary/5"
              )}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{notification.title}</span>
                  {!notification.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {notification.message}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(notification.created_at), "d. MMM 'ob' HH:mm", { locale: sl })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => deleteNotification(notification.id, e)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
