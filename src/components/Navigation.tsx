import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, User, Menu, LogOut, GraduationCap, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";
import { useProAccess } from "@/hooks/useProAccess";
import { ReferralDropdown } from "@/components/ReferralDropdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <img 
              src="/logo.svg" 
              alt="Študko Logo" 
              className="h-12 sm:h-14 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden lg:flex items-center space-x-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                      isActive(link.path)
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <ReferralDropdown userName={userName || "Uporabnik"} hasProAccess={hasProAccess} />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="gap-2 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  Odjava
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="rounded-xl">Prijava</Button>
                </Link>
                <Link to="/register">
                  <Button variant="hero" size="sm" className="rounded-xl">
                    Registracija
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-3">
            {user && <NotificationBell />}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  aria-label="Toggle menu"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0 overflow-y-auto">
                <SheetHeader className="px-6 py-6 border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
                  <SheetTitle className="text-left">
                    {user ? (
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
                          {userName ? userName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg text-foreground truncate">{userName || "Uporabnik"}</p>
                          {hasProAccess && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Zap className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs text-primary font-semibold">PRO član</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xl font-bold">Meni</span>
                    )}
                  </SheetTitle>
                </SheetHeader>

                <div className="px-6 py-6 space-y-3">
                  {user ? (
                    <>
                      {/* View Profile Button */}
                      <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full gap-3 py-6 rounded-2xl justify-start text-base font-medium hover:bg-primary/5 hover:border-primary/30 transition-all">
                          <User className="w-5 h-5" />
                          Poglej profil
                        </Button>
                      </Link>

                      {/* Referral Section */}
                      <div className="py-2">
                        <ReferralDropdown userName={userName || "Uporabnik"} hasProAccess={hasProAccess} isMobile={true} />
                      </div>

                      <div className="border-t border-border my-4"></div>

                      {/* Navigation Links */}
                      <div className="space-y-2">
                        {navLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <Link
                              key={link.path}
                              to={link.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all min-h-[60px] ${
                                isActive(link.path)
                                  ? "bg-gradient-to-r from-primary/15 to-accent/15 text-primary font-bold shadow-sm border border-primary/20"
                                  : "text-muted-foreground hover:bg-muted active:bg-muted/80 hover:text-foreground"
                              }`}
                            >
                              <div className={`p-2 rounded-xl ${isActive(link.path) ? "bg-primary/20" : "bg-muted"}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <span className="text-base font-medium">{link.label}</span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="border-t border-border my-4"></div>

                      {/* Logout Button */}
                      <Button 
                        variant="ghost" 
                        className="w-full gap-3 py-6 rounded-2xl justify-start text-base font-medium hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-all" 
                        onClick={handleSignOut}
                      >
                        <div className="p-2 rounded-xl bg-muted">
                          <LogOut className="w-6 h-6" />
                        </div>
                        Odjava
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full py-6 rounded-2xl text-base font-medium">
                          Prijava
                        </Button>
                      </Link>
                      <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="hero" className="w-full py-6 rounded-2xl text-base font-medium">
                          Registracija
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
