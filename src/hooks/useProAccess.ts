import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Global cache to share between all instances
let globalProStatusCache: { [userId: string]: { status: boolean; timestamp: number } } = {};

export function useProAccess() {
  const { user } = useAuth();
  const lastCheckRef = useRef<number>(0);
  
  // Try to load cached PRO status from memory or localStorage
  const getCachedProStatus = () => {
    if (!user?.id) return false;
    
    // Check memory cache first (fastest)
    const memoryCache = globalProStatusCache[user.id];
    if (memoryCache && Date.now() - memoryCache.timestamp < 10 * 60 * 1000) {
      return memoryCache.status;
    }
    
    // Check localStorage as fallback
    try {
      const cached = localStorage.getItem(`pro_status_${user.id}`);
      if (cached) {
        const { status, timestamp } = JSON.parse(cached);
        // Cache valid for 10 minutes
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          // Update memory cache
          globalProStatusCache[user.id] = { status, timestamp };
          return status;
        }
      }
    } catch (err) {
      console.error('Error reading cached PRO status:', err);
    }
    return false;
  };
  
  const [hasProAccess, setHasProAccess] = useState(getCachedProStatus());
  const [checkingAccess, setCheckingAccess] = useState(false);

  const checkProAccess = async (force = false) => {
    if (!user) {
      setHasProAccess(false);
      setCheckingAccess(false);
      return;
    }
    
    // Don't check if we checked recently (within 30 seconds) unless forced
    const now = Date.now();
    if (!force && now - lastCheckRef.current < 30000) {
      setCheckingAccess(false);
      return;
    }
    
    // Check if we have valid cache
    const cached = getCachedProStatus();
    if (!force && cached !== false) {
      setCheckingAccess(false);
      return;
    }
    
    setCheckingAccess(true);
    lastCheckRef.current = now;
    
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_pro, subscription_status, trial_ends_at")
        .eq("id", user.id)
        .single();
        
      if (error) {
        console.error('Error checking PRO access:', error);
        // On error, keep cached value if available
        setHasProAccess(cached);
      } else {
        const isActive = profile?.subscription_status === "active";
        const isTrialing =
          profile?.subscription_status === "trialing" &&
          profile.trial_ends_at &&
          new Date(profile.trial_ends_at) > new Date();
        // Include is_pro in the check - this is the main PRO status
        const hasPro = profile?.is_pro || isActive || isTrialing;
        setHasProAccess(hasPro);
        
        // Cache the result in both memory and localStorage
        const cacheData = { status: hasPro, timestamp: Date.now() };
        globalProStatusCache[user.id] = cacheData;
        try {
          localStorage.setItem(`pro_status_${user.id}`, JSON.stringify(cacheData));
        } catch (err) {
          console.error('Error caching PRO status:', err);
        }
      }
    } catch (err) {
      console.error('Exception checking PRO access:', err);
      // On exception, keep cached value
      setHasProAccess(cached);
    } finally {
      setCheckingAccess(false);
    }
  };

  useEffect(() => {
    checkProAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Subscribe to profile changes for real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          // Re-check access when profile is updated
          checkProAccess();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { hasProAccess, checkingAccess, refreshAccess: checkProAccess };
}
