import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, User, Menu, X, LogOut, GraduationCap, Zap } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";
import { useProAccess } from "@/hooks/useProAccess";
import { ReferralDropdown } from "@/components/ReferralDropdown";

const Navigation = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { hasProAccess } = useProAccess();
  const [userName, setUserName] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const lastProfileCheckRef = useRef<number>(0);
  
  const isActive = (path: string) => location.pathname === path;

  // Get cached profile data
  const getCachedProfile = () => {
    if (!user?.id) return null;
    try {
      const cached = localStorage.getItem(`profile_${user.id}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 10 minutes
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          return data;
        }
      }
    } catch (err) {
      console.error('Error reading cached profile:', err);
    }
    return null;
  };

  useEffect(() => {
    if (user) {
      // First try to get name from user metadata (immediate)
      const metadataName = user.user_metadata?.full_name;
      if (metadataName) {
        setUserName(metadataName);
      }
      
      // Load from cache
      const cached = getCachedProfile();
      if (cached && cached.full_name) {
        setUserName(cached.full_name);
      }
      
      // Only fetch if no cache or cache is old
      const now = Date.now();
      if (!cached || now - lastProfileCheckRef.current > 30000) {
        checkProAccess();
      }
    } else {
      setUserName("");
    }
  }, [user?.id]);

  const checkProAccess = async () => {
    if (!user) return;

    const now = Date.now();
    lastProfileCheckRef.current = now;
    setLoadingProfile(true);
    
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("subscription_status, trial_ends_at, full_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error checking PRO access:", error);
        // Fallback to user metadata or cached values
        const metadataName = user.user_metadata?.full_name;
        if (metadataName) {
          setUserName(metadataName);
        } else {
          const cached = getCachedProfile();
          if (cached) {
            setUserName(cached.full_name || "");
          }
        }
      } else {
        // Use profile name or fallback to metadata
        const displayName = profile?.full_name || user.user_metadata?.full_name || "Uživatelj";
        setUserName(displayName);
        
        // Cache the profile data
        try {
          localStorage.setItem(`profile_${user.id}`, JSON.stringify({
            data: { full_name: displayName },
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Error caching profile:', err);
        }
      }
    } catch (error) {
      console.error("Error checking PRO access:", error);
      // Keep cached values on error
      const cached = getCachedProfile();
      if (cached) {
        setUserName(cached.full_name || "");
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSignOut = async () => {
    // Immediately clear UI state
    setUserName("");
    setMobileMenuOpen(false);
    
    // Show toast
    toast({
      title: "Odjavljanje...",
      description: "Počakaj trenutek",
    });
    
    // Sign out in background
    await signOut();
    
    toast({
      title: "Odjava uspešna",
      description: "Nasvidenje!",
    });
  };
  
  // Removed Instructor Dashboard from nav - now inside Profile page
  const navLinks = [
    { path: "/notes", label: "Zapiski", icon: BookOpen },
    { path: "/tutors", label: "Inštruktorji", icon: GraduationCap },
    { path: "/ai", label: "AI", icon: Brain },
    { path: "/profile", label: "Profil", icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group -ml-1">
            <img 
              src="/logo.svg" 
              alt="Študko Logo" 
              className="h-12 sm:h-16 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                      isActive(link.path)
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                    {isActive(link.path) && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <ReferralDropdown userName={userName || "Uporabnik"} hasProAccess={hasProAccess} />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Odjava
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Prijava</Button>
                </Link>
                <Link to="/register">
                  <Button variant="hero" size="sm">
                    Registracija
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationBell />}
            <button
              className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-border animate-in slide-in-from-top-5 duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {user && (
              <>
                {/* User info with referral system */}
                <div className="px-4 py-2 mb-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                      {userName ? userName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{userName || "Uporabnik"}</p>
                      {hasProAccess && (
                        <span className="text-xs text-primary font-medium">PRO član</span>
                      )}
                    </div>
                  </div>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full gap-2 mb-3 justify-start">
                      <User className="w-4 h-4" />
                      Poglej profil
                    </Button>
                  </Link>
                  <ReferralDropdown userName={userName || "Uporabnik"} hasProAccess={hasProAccess} isMobile={true} />
                </div>
                
                <div className="border-t border-border my-2"></div>
                
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all min-h-[48px] ${
                        isActive(link.path)
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted active:bg-muted/80"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-base">{link.label}</span>
                    </Link>
                  );
                })}
                
                <div className="border-t border-border mt-2 pt-2">
                  <Button 
                    variant="ghost" 
                    className="w-full gap-2 min-h-[48px] text-base justify-start px-4" 
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-5 h-5" />
                    Odjava
                  </Button>
                </div>
              </>
            )}
            {!user && (
              <div className="flex flex-col gap-3 pt-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full min-h-[48px] text-base">
                      Prijava
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="hero" className="w-full min-h-[48px] text-base">
                      Registracija
                    </Button>
                  </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
