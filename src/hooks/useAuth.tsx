import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only clear session on explicit sign out, not on errors
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        // Refresh session on sign in to ensure fresh tokens
        if (event === 'SIGNED_IN' && session) {
          try {
            await supabase.auth.refreshSession();
          } catch (err) {
            console.warn('Failed to refresh on sign in:', err);
            // Keep user logged in anyway
          }
        }
      }
    );

    // Check for existing session and refresh it
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          // Try to refresh tokens for fresh access
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
          
          if (refreshedSession && !error) {
            // Success - use refreshed session
            setSession(refreshedSession);
            setUser(refreshedSession?.user ?? null);
          } else {
            // Refresh failed - keep existing session instead of logging out
            console.warn('Session refresh failed, keeping existing session:', error);
            setSession(session);
            setUser(session?.user ?? null);
          }
        } catch (err) {
          // Exception during refresh - keep existing session
          console.error('Exception during session refresh, keeping existing session:', err);
          setSession(session);
          setUser(session?.user ?? null);
        }
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    initSession();

    // Add visibility change listener to refresh session when app comes back
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session?.user ?? null);
        } else {
          setSession(null);
          setUser(null);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe = false) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/notes`,
      },
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear all cached data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('profile_') || key.startsWith('supabase.'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Force immediate state clear
      setSession(null);
      setUser(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force clear even if error
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
