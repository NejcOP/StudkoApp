import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { User, BookOpen, ShoppingBag, Edit, ExternalLink, Settings, Trash2, Sun, Moon, CheckCircle2, MessageSquare, LayoutDashboard, GraduationCap, Wallet, Euro, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { ProfileReviews } from "@/components/ProfileReviews";
import { TutorAvailabilityDates } from "@/components/TutorAvailabilityDates";
import { TutorBookingRequests } from "@/components/TutorBookingRequests";
import { StripeConnectButton } from "@/components/StripeConnectButton";
import { InstructorDashboardTab } from "@/components/InstructorDashboardTab";
import { PayoutSettingsModal } from "@/components/PayoutSettingsModal";

interface PayoutInfo {
  method?: 'stripe' | 'iban' | 'paypal' | 'revolut';
  iban?: string;
  paypal_email?: string;
  revolut_tag?: string;
  [key: string]: string | undefined; // Allow JSON compatibility
}

interface Profile {
  id: string;
  full_name: string;
  school_type?: string;
  created_at?: string;
  is_pro?: boolean;
  subscription_status?: string;
  trial_ends_at?: string;
  pro_since?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
  is_instructor?: boolean;
  tutor_hours_completed?: number;
  stripe_connect_id?: string;
  stripe_onboarding_complete?: boolean;
  payout_info?: PayoutInfo;
  last_email_change_at?: string;
  last_password_change_at?: string;
  email?: string;
}

interface Note {
  id: string;
  title: string;
  subject: string;
  type: string;
  school_type: string;
  price: number;
  created_at: string;
}

interface Purchase {
  id: string;
  note_id: string;
  purchased_at: string;
  notes: Note;
}

const Profile = () => {
    // Inline loading states for tab content
    const [profileLoading, setProfileLoading] = useState(false);
    const [notesLoading, setNotesLoading] = useState(false);
    const [purchasesLoading, setPurchasesLoading] = useState(false);

    const { user, loading: authLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState<Profile | null>(() => {
      try {
        const cached = sessionStorage.getItem(`profile_${user?.id}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
          }
        }
      } catch (err) {
        console.error('Error reading cached profile:', err);
      }
      return null;
    });
    const [tutorId, setTutorId] = useState<string | null>(null);
    const [isApprovedTutor, setIsApprovedTutor] = useState(false);
    const [myNotes, setMyNotes] = useState<Note[]>(() => {
      try {
        const cached = sessionStorage.getItem(`my_notes_${user?.id}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
          }
        }
      } catch (err) {
        console.error('Error reading cached notes:', err);
      }
      return [];
    });
    const [purchasedNotes, setPurchasedNotes] = useState<Purchase[]>(() => {
      try {
        const cached = sessionStorage.getItem(`purchased_notes_${user?.id}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
          }
        }
      } catch (err) {
        console.error('Error reading cached purchases:', err);
      }
      return [];
    });
    const [loading, setLoading] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState("profile");
    const [mainTab, setMainTab] = useState<string>("my-notes");
    const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
      full_name: "",
    });
    const [emailForm, setEmailForm] = useState({
      newEmail: "",
    });
    const [passwordForm, setPasswordForm] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [reactivating, setReactivating] = useState(false);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [trialUsed, setTrialUsed] = useState(false);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [passwordResetEmailSent, setPasswordResetEmailSent] = useState(false);

    // Move loadProfileData above useEffect hooks
    const loadProfileData = useCallback(async (resetForm: boolean = true) => {
      if (!user) return;
      
      // Check if we have valid cached data
      try {
        const cachedProfile = sessionStorage.getItem(`profile_${user.id}`);
        const cachedNotes = sessionStorage.getItem(`my_notes_${user.id}`);
        const cachedPurchases = sessionStorage.getItem(`purchased_notes_${user.id}`);
        
        if (cachedProfile && cachedNotes && cachedPurchases) {
          const profileCache = JSON.parse(cachedProfile);
          const notesCache = JSON.parse(cachedNotes);
          const purchasesCache = JSON.parse(cachedPurchases);
          
          // Cache valid for 5 minutes
          if (Date.now() - profileCache.timestamp < 5 * 60 * 1000 &&
              Date.now() - notesCache.timestamp < 5 * 60 * 1000 &&
              Date.now() - purchasesCache.timestamp < 5 * 60 * 1000) {
            // Cache is valid, no need to load
            setProfileLoading(false);
            setNotesLoading(false);
            setPurchasesLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking profile cache:', err);
      }
      
      // Start loading for all sections
      setProfileLoading(true);
      setNotesLoading(true);
      setPurchasesLoading(true);
      
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {

          throw profileError;
        }
        // Cast payout_info from JSON to PayoutInfo type
        const profileWithTypedPayout = {
          ...profileData,
          payout_info: profileData?.payout_info as PayoutInfo | undefined,
        };
        
        setProfile(profileWithTypedPayout as Profile);
        
        // Cache profile data
        try {
          sessionStorage.setItem(`profile_${user.id}`, JSON.stringify({
            data: profileWithTypedPayout,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Error caching profile:', err);
        }
        
        // Only reset form when explicitly requested (not during real-time updates)
        if (resetForm) {
          setEditForm({
            full_name: profileData?.full_name || "",
          });
        }

        // Check trial status
        const hasUsedTrial = profileData?.trial_used || 
          (profileData?.trial_ends_at && new Date(profileData.trial_ends_at) < new Date());
        setTrialUsed(hasUsedTrial || false);

        // If user is an instructor, get their tutor status and set tutorId to user.id
        if (profileData?.is_instructor) {
          const { data: tutorData } = await supabase
            .from("tutors")
            .select("id, status")
            .eq("user_id", user.id)
            .limit(1);
          
          
          if (tutorData && tutorData.length > 0) {
            // Use user.id for tutor_availability_dates table (references profiles.id)
            setTutorId(user.id);
            setIsApprovedTutor(tutorData[0].status === 'approved');
          }
        } else {
          setIsApprovedTutor(false);
        }

        // Fetch user's notes
        const { data: notesData, error: notesError } = await supabase
          .from("notes")
          .select("*")
          .eq("author_id", user.id)
          .order("created_at", { ascending: false });

        if (notesError) {
          console.error("Error fetching notes:", notesError);
          throw notesError;
        }

        setMyNotes(notesData || []);
        setNotesLoading(false);
        
        // Cache notes data
        try {
          sessionStorage.setItem(`my_notes_${user.id}`, JSON.stringify({
            data: notesData || [],
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Error caching notes:', err);
        }

        // Fetch purchased notes from 'note_purchases' table (joined with notes)
        const { data: purchasesData, error: purchasesError } = await supabase
          .from("note_purchases")
          .select("*, notes(*)")
          .eq("buyer_id", user.id)
          .order("purchased_at", { ascending: false });

        if (!purchasesError && purchasesData) {
          setPurchasedNotes(purchasesData);
          setPurchasesLoading(false);
          
          // Cache purchased notes data
          try {
            sessionStorage.setItem(`purchased_notes_${user.id}`, JSON.stringify({
              data: purchasesData,
              timestamp: Date.now()
            }));
          } catch (err) {
            console.error('Error caching purchases:', err);
          }
        }

        // Fetch earnings from note sales (where user is the author)
        const { data: salesData } = await supabase
          .from("note_purchases")
          .select(`
            price,
            notes!inner (
              author_id
            )
          `)
          .eq("notes.author_id", user.id);
        
        if (salesData) {
          const grossEarnings = salesData.reduce((sum: number, sale: { price: number }) => sum + Number(sale.price || 0), 0);
          // Calculate net earnings after 20% platform fee
          setTotalEarnings(grossEarnings * 0.80);
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
        toast.error("Napaka pri nalaganju podatkov");
      } finally {
        // Always reset all loading states
        setProfileLoading(false);
        setNotesLoading(false);
        setPurchasesLoading(false);
      }
    }, [user]);

    useEffect(() => {
      if (!authLoading && !user) {
        navigate("/login");
      }
    }, [user, authLoading, navigate]);

    useEffect(() => {
      if (user) {
        loadProfileData();
      }
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('tab') === 'purchased') {
        setMainTab('purchases');
      }

      // Polling for payment success
      let pollingInterval: NodeJS.Timeout | null = null;
      if (urlParams.get('payment') === 'success' && user) {
        setLoading(true);
        toast.info('Preverjam nakup...');
        let pollCount = 0;
        pollingInterval = setInterval(async () => {
          pollCount++;
          const { data: purchasesData, error: purchasesError } = await supabase
            .from('note_purchases')
            .select('*, notes(*)')
            .eq('buyer_id', user.id)
            .order('purchased_at', { ascending: false });
          if (!purchasesError && purchasesData && purchasesData.length > 0) {
            setPurchasedNotes(purchasesData);
            setLoading(false);
            toast.success('Nakup uspešen! Zapisek je na voljo med kupljenimi.');
            urlParams.delete('payment');
            window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
            if (pollingInterval) clearInterval(pollingInterval);
          } else if (pollCount >= 5) { // 10 sekund polling (5 x 2s)
            setLoading(false);
            toast.info('Nakup se procesira. Zapisek bo kmalu na voljo.');
            urlParams.delete('payment');
            window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
            if (pollingInterval) clearInterval(pollingInterval);
          }
        }, 2000);
      }

      // Email update is now handled via ConfirmEmail page

      return () => {
        if (pollingInterval) clearInterval(pollingInterval);
      };

      // Handle password reset from email link
      if (urlParams.get('type') === 'recovery' || urlParams.get('tab') === 'password') {
        // Open settings dialog and show password tab
        setIsSettingsOpen(true);
        setSettingsTab('password');

        // Če je confirmed=true, uporabnik se vrača po kliku na povezavo v e-pošti
        if (urlParams.get('confirmed') === 'true' && urlParams.get('type') === 'recovery') {
          const pendingPassword = localStorage.getItem('pendingPassword');

          if (pendingPassword) {
            // Zdaj dejansko posodobi geslo
            toast.info('Potrjujem spremembo...');

            supabase.auth.updateUser({
              password: pendingPassword,
            }).then(({ error }) => {
              if (error) {
                toast.error('Napaka pri posodobitvi gesla: ' + error.message);
              } else {
                toast.success('Geslo uspešno posodobljeno!', {
                  description: 'Tvoje novo geslo je zdaj aktivno.',
                  duration: 5000,
                });
                localStorage.removeItem('pendingPassword');
              }
            });
          } else {
            toast.success('Povezava potrjena!', {
              description: 'Spodaj vnesi svoje novo geslo.',
            });
          }
          
          // Očisti URL parametre
          window.history.replaceState({}, '', '/profile');
        } else if (urlParams.get('type') === 'recovery') {
          toast.success('Povezava potrjena!', {
            description: 'Spodaj vnesi svoje novo geslo.',
            duration: 6000,
          });
          // Remove query parameter from URL
          window.history.replaceState({}, '', '/profile');
        }
      }
      
      // Handle PRO activation success
      if (urlParams.get('pro') === 'activated') {
        const handleProActivation = async () => {
          // Refresh session to get latest PRO status
          await supabase.auth.refreshSession();
          // Reload profile data
          await loadProfileData();
          // Show success message
          toast.success('🎉 Dobrodošli v Študko PRO!', {
            description: 'Vaše PRO funkcije so zdaj aktivne.',
            duration: 5000,
          });
          // Remove query parameter from URL
          window.history.replaceState({}, '', '/profile');
        };
        handleProActivation();
      }
    }, [user, loadProfileData]);

    // Recheck tutor status when instructor tab is accessed
    useEffect(() => {
      if (mainTab === 'instructor' && user && user.email) {
        const recheckTutorStatus = async () => {
          try {
            const { data: tutorData } = await supabase
              .from('tutors')
              .select('id, status')
              .eq('email', user.email)
              .limit(1);
            
            if (tutorData && tutorData.length > 0) {
              const tutor = tutorData[0];
              if (tutor.status === 'approved') {

                // Use user.id for tutor_availability_dates table
                setTutorId(user.id);
                setIsApprovedTutor(true);
                // Also update the profile to mark as instructor
                await supabase
                  .from('profiles')
                  .update({ is_instructor: true })
                  .eq('id', user.id);
                // Reload profile data to refresh the UI
                await loadProfileData();
              }
            }
          } catch (error) {
            console.error('Error rechecking tutor status:', error);
          }
        };
        
        recheckTutorStatus();
      }
    }, [mainTab, user, loadProfileData]);

    // Check for Stripe onboarding success
    useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const stripe = urlParams.get('stripe');
      const accountId = urlParams.get('account_id');
      const proActivated = urlParams.get('pro');

      if (stripe === 'success' && accountId && user) {
        // Update profile with Stripe Connect account ID
        supabase
          .from('profiles')
          .update({
            stripe_connect_id: accountId,
            stripe_onboarding_complete: true
          })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) {
              console.error('Error updating profile:', error);
              toast.error('Napaka pri posodabljanju profila');
            } else {
              toast.success('Stripe račun uspešno povezan!');
              loadProfileData(); // Reload profile data
              // Clean up URL
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          });
      }

      // Check for PRO activation
      if (proActivated === 'activated') {
        setTimeout(() => {
          loadProfileData();
          toast.success('Dobrodošli v Študko PRO! 🎉');
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 1500);
      }
    }, [user, loadProfileData]);

    // Check for subscription expiry and show notification
    useEffect(() => {
      if (!profile || !user) return;

      const checkSubscriptionExpiry = () => {
        const expiryDateStr = profile.current_period_end || profile.trial_ends_at;
        if (!expiryDateStr) return;

        const expiryDate = new Date(expiryDateStr);
        const now = new Date();
        const msUntilExpiry = expiryDate.getTime() - now.getTime();
        const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

        // Check if subscription expired today
        const lastNotifiedKey = `subscription_expired_notified_${user.id}`;
        const lastNotified = localStorage.getItem(lastNotifiedKey);
        const todayStr = now.toDateString();

        if (daysUntilExpiry <= 0 && lastNotified !== todayStr && profile.cancel_at_period_end) {
          toast.error(
            "Tvoja PRO naročnina je potekla",
            {
              description: "Za nadaljevanje uporabe PRO funkcij prosim obnovi naročnino.",
              duration: 10000,
            }
          );
          localStorage.setItem(lastNotifiedKey, todayStr);
        }

        // Show warning 3 days before expiry
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 3 && profile.cancel_at_period_end) {
          const warningKey = `subscription_expiry_warning_${user.id}_${daysUntilExpiry}`;
          const warningShown = sessionStorage.getItem(warningKey);
          
          if (!warningShown) {
            toast.warning(
              `Tvoja PRO naročnina poteče čez ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dan' : daysUntilExpiry === 2 ? 'dneva' : 'dni'}`,
              {
                description: "Če želiš ohraniti PRO dostop, obnovi naročnino v nastavitvah.",
                duration: 8000,
              }
            );
            sessionStorage.setItem(warningKey, 'true');
          }
        }
      };

      checkSubscriptionExpiry();

      // Check again every hour
      const interval = setInterval(checkSubscriptionExpiry, 60 * 60 * 1000);

      return () => clearInterval(interval);
    }, [profile, user]);

    // Real-time subscription to profile changes for PRO status
    useEffect(() => {
      if (!user?.id) return;

      const channel = supabase
        .channel('profile-subscription-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            // Reload profile when updated but don't reset the edit form
            loadProfileData(false);
            
            // Show success toast if is_pro becomes true
            if (payload.new?.is_pro && !payload.old?.is_pro) {
              toast.success('PRO naročnina je aktivna! 🚀');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [user?.id, loadProfileData]);

    const handleStripeOnboarding = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding', {
          body: {
            user_id: user.id,
            email: user.email
          }
        });

        if (error) {
          console.error('Error invoking Stripe function:', error);
          toast.error('Napaka pri povezovanju s Stripe');
          return;
        }

        if (data?.url) {
          window.location.href = data.url;
        } else {
          toast.error('Napaka: ni prejet URL za Stripe');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Napaka pri povezovanju s Stripe');
      }
    };

    const handleSaveProfile = async () => {
      // Name cannot be changed after registration
      // This function is kept for potential future profile updates
      setIsSettingsOpen(false);
    };

    const handleUpdateEmail = async () => {
      if (!user || !emailForm.newEmail) return;
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailForm.newEmail)) {
        toast.error("Vnesi veljaven email naslov");
        return;
      }

      // Check if 30 days have passed since last email change
      if (profile?.last_email_change_at) {
        const lastChange = new Date(profile.last_email_change_at);
        const daysSinceLastChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastChange < 30) {
          const daysRemaining = 30 - daysSinceLastChange;
          toast.error(`Email lahko spremeniš samo enkrat na 30 dni`, {
            description: `Poizkusi znova čez ${daysRemaining} ${daysRemaining === 1 ? 'dan' : daysRemaining < 5 ? 'dni' : 'dni'}.`,
            duration: 6000,
          });
          return;
        }
      }
      
      setSaving(true);
      console.log("Starting email update to:", emailForm.newEmail);
      console.log("Current user email:", user.email);
      
      // Optimistic: Show immediate feedback
      toast.info("Pošiljam verifikacijski email...");
      
      try {
        // Use production URL for email redirect (not localhost)
        const isProduction = import.meta.env.PROD;
        const redirectUrl = isProduction 
          ? 'https://studko.vercel.app/confirm-email'
          : `${window.location.origin}/confirm-email`;
        
        console.log("Calling supabase.auth.updateUser...");
        
        const updatePromise = supabase.auth.updateUser(
          { email: emailForm.newEmail },
          { emailRedirectTo: redirectUrl }
        );
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout - email update se ni odzval v 30s")), 30000)
        );
        
        const result = await Promise.race([updatePromise, timeoutPromise]);
        const { error, data } = result as { error: Error | null; data: any };
        
        console.log("Email update response:", { error, data });

        if (error) throw error;

        toast.success(
          "Zahteva za spremembo emaila poslana! 📧", 
          {
            description: `Preveri svoj novi email (${emailForm.newEmail}) in potrdi spremembo s klikom na povezavo.`,
            duration: 8000,
          }
        );
        setEmailForm({ newEmail: "" });
      } catch (error: unknown) {
        console.error("Error updating email:", error);
        let errorMessage = error instanceof Error ? error.message : "Napaka pri posodabljanju emaila";
        
        if (errorMessage.includes('rate limit') || errorMessage.includes('Email rate limit exceeded')) {
          errorMessage = "Preč pogosto pošiljanje emailov. Poskusi znova čez 10 minut.";
        }
        
        toast.error(errorMessage);
      } finally {
        console.log("Email update finished");
        setSaving(false);
      }
    };

    const handleUpdatePassword = async () => {
      if (!user?.email) {
        toast.error("Uporabnik ni prijavljen");
        return;
      }

      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        toast.error("Izpolni vsa polja");
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error("Gesli se ne ujemata");
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error("Geslo mora imeti vsaj 6 znakov");
        return;
      }

      // Check if 30 days have passed since last password change
      if (profile?.last_password_change_at) {
        const lastChange = new Date(profile.last_password_change_at);
        const daysSinceLastChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastChange < 30) {
          const daysRemaining = 30 - daysSinceLastChange;
          toast.error(`Geslo lahko spremeniš samo enkrat na 30 dni`, {
            description: `Poizkusi znova čez ${daysRemaining} ${daysRemaining === 1 ? 'dan' : daysRemaining < 5 ? 'dni' : 'dni'}.`,
            duration: 6000,
          });
          return;
        }
      }
      
      setSaving(true);
      try {
        // First verify current password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: passwordForm.currentPassword,
        });

        if (signInError) {
          toast.error("Trenutno geslo je napačno");
          setSaving(false);
          return;
        }

        // Directly update password (no email confirmation needed)
        const { error: updateError } = await supabase.auth.updateUser({
          password: passwordForm.newPassword,
        });

        if (updateError) throw updateError;

        // Update last password change timestamp
        await supabase
          .from('profiles')
          .update({ last_password_change_at: new Date().toISOString() })
          .eq('id', user.id);

        toast.success("Geslo uspešno posodobljeno! 🎉", {
          description: "Tvoje geslo je bilo uspešno spremenjeno.",
          duration: 6000,
        });
        
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        
      } catch (error: unknown) {
        console.error("Error updating password:", error);
        let errorMessage = error instanceof Error ? error.message : "Napaka pri posodobitvi gesla";
        toast.error(errorMessage);
      } finally {
        setSaving(false);
      }
    };

    const handleForgotPassword = async () => {
      if (!user?.email) {
        toast.error("Uporabnik ni prijavljen");
        return;
      }

      setSaving(true);
      try {
        const isProduction = import.meta.env.PROD;
        const redirectUrl = isProduction
          ? 'https://studko.vercel.app/confirm-email'
          : `${window.location.origin}/confirm-email`;
        
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: redirectUrl,
        });

        if (error) throw error;

        toast.success("Email poslan!", {
          description: "Preveri svoj email in klikni na povezavo za ponastavitev gesla.",
          duration: 8000,
        });
        
        setPasswordResetEmailSent(true);
        setTimeout(() => {
          setPasswordResetEmailSent(false);
        }, 300000);
        
      } catch (error: unknown) {
        console.error("Error sending forgot password email:", error);
        let errorMessage = error instanceof Error ? error.message : "Napaka pri pošiljanju e-pošte";
        
        if (errorMessage.includes('rate limit') || errorMessage.includes('Email rate limit exceeded')) {
          errorMessage = "Preč pogosto pošiljanje emailov. Poskusi znova čez 10 minut.";
        }
        
        toast.error(errorMessage);
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteNote = async () => {
      if (!user || !deleteNoteId) return;
      
      setDeleting(true);
      
      // Optimistic update - remove immediately from UI
      const originalNotes = [...myNotes];
      setMyNotes(myNotes.filter(note => note.id !== deleteNoteId));
      setDeleteNoteId(null);
      toast.success("Zapisek se briše...");
      
      try {
        const { error } = await supabase
          .from("notes")
          .delete()
          .eq("id", deleteNoteId)
          .eq("author_id", user.id);

        if (error) throw error;
        
        // Update cache
        sessionStorage.setItem(`my_notes_${user.id}`, JSON.stringify({
          data: myNotes.filter(note => note.id !== deleteNoteId),
          timestamp: Date.now()
        }));
        
        toast.success("Zapisek uspešno izbrisan!");
      } catch (error) {
        // Rollback on error
        setMyNotes(originalNotes);
        console.error("Error deleting note:", error);
        toast.error("Pri brisanju zapiska je prišlo do napake");
      } finally {
        setDeleting(false);
      }
    };

    const handleUpgradeToPro = async () => {
      // Redirect to AI page where subscription upgrade is available
      navigate('/ai-assistant');
    };

    const handleManageSubscription = async () => {
      setLoadingSubscription(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-portal-session");
        
        if (error) {
          console.error("Portal session error:", error);
          throw error;
        }
        
        if (data?.error) {
          console.error("Portal session error from function:", data.error);
          toast.error(data.error);
          return;
        }
        
        if (data?.url) {
          window.open(data.url, "_blank");
        } else {
          toast.error("Napaka: ni prejel URL za portal");
        }
      } catch (error) {
        console.error("Error creating portal session:", error);
        const errorMessage = error instanceof Error ? error.message : "Napaka pri odpiranju portala";
        toast.error(errorMessage);
      } finally {
        setLoadingSubscription(false);
      }
    };

    const handleCancelSubscription = async () => {
      setCancelling(true);
      try {
        const { data, error } = await supabase.functions.invoke("cancel-subscription");
        
        if (error) {
          console.error("Cancel subscription error:", error);
          throw error;
        }
        
        if (data?.error) {
          console.error("Cancel subscription error from function:", data.error);
          
          // Special handling for manually granted PRO access
          if (data.noSubscription) {
            toast.error("Naročnina ni najdena", {
              description: "Tvoj PRO dostop je bil dodeljen ročno in ga ni mogoče preklicati skozi to vmesniko. Prosimo, kontaktiraj podporo.",
              duration: 10000,
            });
          } else {
            toast.error(data.error);
          }
          return;
        }
        
        if (data?.success) {
          const expiryDate = profile?.current_period_end 
            ? formatDate(profile.current_period_end)
            : formatDate(profile?.trial_ends_at);
          
          toast.success(
            "Naročnina preklicana", 
            {
              description: `Tvoj PRO dostop ostaja aktiven do ${expiryDate}. Po tem datumu bodo PRO funkcije onemogočene.`,
              duration: 10000,
            }
          );
          
          setShowCancelDialog(false);
          await loadProfileData();
        }
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        const errorMessage = error instanceof Error ? error.message : "Napaka pri preklicu naročnine";
        toast.error(errorMessage);
      } finally {
        setCancelling(false);
      }
    };

    const handleReactivateSubscription = async () => {
      setReactivating(true);
      try {
        const { data, error } = await supabase.functions.invoke("reactivate-subscription");
        
        if (error) throw error;
        
        if (data?.success) {
          toast.success(
            "Naročnina ponovno aktivirana", 
            {
              description: "Tvoja Študko PRO naročnina se bo samodejno podaljševala ob koncu vsakega obračunskega obdobja.",
              duration: 10000,
            }
          );
          
          await loadProfileData();
        }
      } catch (error) {
        console.error("Error reactivating subscription:", error);
        const errorMessage = error instanceof Error ? error.message : "Napaka pri ponovni aktivaciji naročnine";
        toast.error(errorMessage);
      } finally {
        setReactivating(false);
      }
    };

    const getSubscriptionDisplay = () => {
      if (!profile?.is_pro && profile?.subscription_status === "none") {
        return { text: "Brezplačen", color: "text-muted-foreground" };
      }
      if (profile?.cancel_at_period_end && profile?.trial_ends_at) {
        return { 
          text: `Študko PRO (preklicano) – dostop do ${formatDate(profile.trial_ends_at)}`, 
          color: "text-orange-600 dark:text-orange-400" 
        };
      }
      if (profile?.subscription_status === "trialing" && profile?.trial_ends_at) {
        const daysLeft = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return { text: `Študko PRO (preizkus) – še ${daysLeft} dni`, color: "text-purple-600 dark:text-purple-400" };
      }
      if (profile?.subscription_status === "active" || profile?.is_pro) {
        return { text: "Študko PRO (aktiven)", color: "text-green-600 dark:text-green-400" };
      }
      return { text: "Brezplačen", color: "text-muted-foreground" };
    };

    const getInitials = (name: string) => {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    const formatDate = (dateString?: string | null) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("sl-SI");
    };

    // Check if user should see Instructor Dashboard tab
    const showInstructorTab = useMemo(() => 
      profile?.is_instructor || isApprovedTutor || !!profile?.stripe_connect_id,
      [profile?.is_instructor, isApprovedTutor, profile?.stripe_connect_id]
    );
    
    // Memoize computed Pro status
    const isPro = useMemo(() => 
      profile?.is_pro === true && 
      profile?.subscription_status === 'active',
      [profile?.is_pro, profile?.subscription_status]
    );
    
    // Memoize computed trial status
    const isInTrial = useMemo(() => 
      profile?.trial_ends_at && 
      new Date(profile.trial_ends_at) > new Date(),
      [profile?.trial_ends_at]
    );
    


    if (authLoading || loading) {
      return (
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="max-w-5xl mx-auto px-4 py-8">
            <Skeleton className="h-12 w-48 mb-2" />
            <Skeleton className="h-6 w-96 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Skeleton className="h-96 rounded-2xl" />
              </div>
              <div className="lg:col-span-2">
                <Skeleton className="h-96 rounded-2xl" />
              </div>
            </div>
          </div>
          <Footer />
        </div>
      );
    }

    if (!user || !profile) {
      return null;
    }

    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background gradient blurs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -z-10" />
        
        <Navigation />
        
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          {/* Page Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-500 bg-clip-text text-transparent mb-2">
              Moj profil
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Uredi svoje podatke in poglej svoje zapiske.
            </p>
          </div>

          <div className={mainTab === 'instructor' ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'}>
            {/* Profile Header Card - Hide when on instructor tab */}
            {mainTab !== 'instructor' && (
              <div className="lg:col-span-1">
                <div className="bg-card dark:bg-card backdrop-blur rounded-2xl p-6 shadow-xl border border-border">
                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4">
                      {getInitials(profile.full_name)}
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{profile.full_name}</h2>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 mb-6">
                    <Button variant="outline" className="w-full text-foreground" onClick={() => setIsSettingsOpen(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Nastavitve
                    </Button>
                  </div>

                  {/* Settings Dialog */}
                  <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-card">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Nastavitve računa</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Uredi svoje osebne podatke, email in geslo
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">
                        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                          <TabsList className="grid w-full grid-cols-5 bg-muted min-w-[500px] sm:min-w-0">
                            <TabsTrigger value="profile" className="text-foreground data-[state=active]:text-foreground text-xs sm:text-sm px-2">Osebni podatki</TabsTrigger>
                            <TabsTrigger value="email" className="text-foreground data-[state=active]:text-foreground text-xs sm:text-sm px-2">Email</TabsTrigger>
                            <TabsTrigger value="password" className="text-foreground data-[state=active]:text-foreground text-xs sm:text-sm px-2">Geslo</TabsTrigger>
                            <TabsTrigger value="subscription" className="text-foreground data-[state=active]:text-foreground text-xs sm:text-sm px-2">Naročnina</TabsTrigger>
                            <TabsTrigger value="theme" className="text-foreground data-[state=active]:text-foreground text-xs sm:text-sm px-2">Tema</TabsTrigger>
                          </TabsList>
                        </div>

                        {/* Profile Tab */}
                        <TabsContent value="profile" className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="settings_full_name" className="text-foreground">Ime in priimek</Label>
                            <Input
                              id="settings_full_name"
                              value={profile?.full_name || ""}
                              readOnly
                              disabled
                              className="bg-muted text-muted-foreground cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground italic">
                              Ime je trajno in ga ni mogoče spremeniti.
                            </p>
                          </div>
                        </TabsContent>

                        {/* Email Tab */}
                        <TabsContent value="email" className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="new_email" className="text-foreground">Email</Label>
                            <Input
                              id="new_email"
                              type="email"
                              value={emailForm.newEmail}
                              onChange={(e) => setEmailForm({ newEmail: e.target.value })}
                              placeholder={user?.email || "nov@email.com"}
                              className="bg-input text-foreground placeholder:text-muted-foreground"
                              disabled={saving}
                            />
                          </div>
                          <Button
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white"
                            onClick={handleUpdateEmail}
                            disabled={saving || !emailForm.newEmail}
                          >
                            {saving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Posodabljam...
                              </>
                            ) : (
                              "Zamenjaj email"
                            )}
                          </Button>
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Pomembno:</strong> Ko klikneš gumb za posodobitev, boš prejel potrditveno povezavo na svoj <strong>trenutni email naslov</strong>. 
                              Šele po potrditvi se bo email spremenil.
                            </p>
                          </div>
                        </TabsContent>

                        {/* Password Tab */}
                        <TabsContent value="password" className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="current_password" className="text-foreground">Trenutno geslo</Label>
                            <Input
                              id="current_password"
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                              placeholder="Vnesi trenutno geslo"
                              className="bg-input text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new_password" className="text-foreground">Novo geslo</Label>
                            <Input
                              id="new_password"
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                              placeholder="Najmanj 6 znakov"
                              className="bg-input text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirm_password" className="text-foreground">Potrdi novo geslo</Label>
                            <Input
                              id="confirm_password"
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                              placeholder="Ponovi geslo"
                              className="bg-input text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <Button
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white"
                            onClick={handleUpdatePassword}
                            disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordResetEmailSent}
                          >
                            {saving ? "Pošiljam e-pošto..." : passwordResetEmailSent ? "E-pošta poslana - preveri nabiralnik" : "Posodobi geslo"}
                          </Button>
                          {passwordResetEmailSent && (
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              E-pošto lahko ponovno pošlješ čez 5 minut.
                            </p>
                          )}
                          <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">Ali</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleForgotPassword}
                            disabled={saving || passwordResetEmailSent}
                          >
                            Pozabljeno geslo
                          </Button>
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Opomba:</strong> Geslo lahko spremeniš samo enkrat na 30 dni.
                            </p>
                          </div>
                        </TabsContent>

                        {/* Subscription Tab */}
                        <TabsContent value="subscription" className="space-y-4 py-4">
                          <div className="space-y-4">
                            <div className="bg-muted rounded-xl p-4 border border-border">
                              <p className="text-sm text-muted-foreground mb-1">Trenutni paket:</p>
                              <p className={`text-2xl font-bold ${getSubscriptionDisplay().color}`}>
                                {getSubscriptionDisplay().text}
                              </p>
                            </div>

                            {(!profile?.is_pro || profile?.subscription_status === "none") ? (
                              <div className="space-y-4">
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
                                  <h3 className="text-lg font-bold text-foreground mb-3">
                                    Nadgradi na Študko PRO
                                  </h3>
                                  <ul className="space-y-2 mb-4">
                                    <li className="flex items-start gap-2 text-sm text-foreground">
                                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                                      <span>Neomejene AI razlage</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-foreground">
                                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                                      <span>Nalaganje datotek in slik</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-foreground">
                                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                                      <span>Prednostna podpora</span>
                                    </li>
                                  </ul>
                                  <p className="text-2xl font-bold text-foreground mb-4">
                                    3,49 €<span className="text-sm font-normal text-muted-foreground">/mesec</span>
                                  </p>
                                  <Button
                                    onClick={handleUpgradeToPro}
                                    disabled={loadingSubscription}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white"
                                  >
                                    {loadingSubscription 
                                      ? "Nalagam..." 
                                      : trialUsed 
                                        ? "Postani član Študko PRO" 
                                        : "Nadgradi na PRO (7-dnevni preizkus)"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {profile?.cancel_at_period_end ? (
                                  <>
                                    <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                                      <p className="text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4" />
                                        Naročnina je preklicana
                                      </p>
                                      <p className="text-xs text-orange-600 dark:text-orange-400">
                                        Tvoj dostop do PRO funkcij ostaja aktiven do konca plačanega obdobja.
                                        {(profile?.current_period_end || profile?.trial_ends_at) && 
                                          ` Dostop do: ${formatDate(profile.current_period_end || profile.trial_ends_at)}`}
                                      </p>
                                    </div>
                                    <Button
                                      onClick={handleReactivateSubscription}
                                      disabled={reactivating}
                                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white"
                                    >
                                      {reactivating ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Ponovno aktiviram...
                                        </>
                                      ) : (
                                        "Ponovno aktiviraj naročnino"
                                      )}
                                    </Button>
                                    <div className="bg-muted rounded-xl p-4 border border-border">
                                      <p className="text-sm text-muted-foreground">
                                        S ponovnim aktiviranjem se bo tvoja naročnina normalno podaljševala vsak mesec.
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                      <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Hvala, ker si del Študko PRO! 
                                      </p>
                                    </div>
                                    <div className="space-y-3">
                                      <Button
                                        variant="outline"
                                        onClick={handleManageSubscription}
                                        disabled={loadingSubscription}
                                        className="w-full text-foreground"
                                      >
                                        {loadingSubscription ? "Nalagam..." : "Uredi plačilne podatke"}
                                      </Button>
                                      <div className="space-y-2">
                                        <Button
                                          variant="outline"
                                          onClick={() => setShowCancelDialog(true)}
                                          disabled={loadingSubscription}
                                          className="w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 dark:hover:border-red-700"
                                        >
                                          Prekliči naročnino
                                        </Button>
                                        {profile?.current_period_end && (
                                          <p className="text-xs text-center text-muted-foreground">
                                            Tvoja naročnina je veljavna do: <span className="font-semibold text-foreground">{formatDate(profile.current_period_end)}</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-muted rounded-xl p-3 border border-border">
                                      <p className="text-xs text-muted-foreground">
                                        <strong>Opomba:</strong> Preklic naročnine ne vrača denarja za že plačano obdobje. 
                                        Dostop imaš do konca plačanega meseca.
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        {/* Theme Tab */}
                        <TabsContent value="theme" className="space-y-4 py-4">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-base text-foreground">Izgled aplikacije</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Izberi svetlo ali temno temo za vso aplikacijo
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setTheme("light");
                                  toast.success("Svetla tema aktivirana");
                                }}
                                className={`relative p-4 h-auto flex-col gap-3 ${
                                  theme === "light"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                                  <Sun className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-foreground">Svetla</div>
                                  <div className="text-xs text-muted-foreground">Klasična svetla tema</div>
                                </div>
                                {theme === "light" && (
                                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setTheme("dark");
                                  toast.success("Temna tema aktivirana");
                                }}
                                className={`relative p-4 h-auto flex-col gap-3 ${
                                  theme === "dark"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                                  <Moon className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-foreground">Temna</div>
                                  <div className="text-xs text-muted-foreground">Prijazna očem ponoči</div>
                                </div>
                                {theme === "dark" && (
                                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Tvoja izbira teme se bo shranila in uporabila na vseh straneh.
                            </p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                    <div className="text-center">
                      <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {myNotes.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Zapiskov</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                        {purchasedNotes.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Kupljenih</p>
                    </div>
                  </div>

                  {/* Payout Settings Section - Stripe Connect Only */}
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-lg font-bold text-foreground mb-3">
                      Izplačila (Stripe Connect)
                    </h3>
                    
                    {/* Earnings Display */}
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Euro className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm text-muted-foreground">Tvoj zaslužek:</span>
                      </div>
                      <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        €{totalEarnings.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Od prodaje zapiskov (80% po proviziji)
                      </p>
                    </div>

                    {/* Stripe Connect Status - Only show green if stripe_connect_id is NOT null */}
                    {profile?.stripe_connect_id ? (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Stripe račun je povezan ✅
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full text-foreground"
                          onClick={async () => {
                            if (!profile?.stripe_connect_id) return;
                            try {
                              const { data, error } = await supabase.functions.invoke('stripe-connect-dashboard', {
                                body: { accountId: profile.stripe_connect_id }
                              });
                              if (error || !data?.url) {
                                toast.error('Napaka pri odpiranju Stripe dashboarda');
                                return;
                              }
                              window.open(data.url, '_blank');
                            } catch (err) {
                              toast.error('Napaka pri odpiranju Stripe dashboarda');
                            }
                          }}
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          Upravljaj Stripe račun
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-foreground mb-3">
                          Nastavi Stripe izplačila za avtomatska plačila od prodaje zapiskov.
                        </p>
                        <Button 
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white"
                          onClick={handleStripeOnboarding}
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          Nastavi Stripe izplačila
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Tabs Section */}
          <div className={mainTab === 'instructor' ? 'w-full' : 'lg:col-span-2'}>
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
              <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
                <TabsList className={`grid w-full ${showInstructorTab ? 'grid-cols-3' : 'grid-cols-2'} bg-muted rounded-xl p-1 h-12 min-w-[400px] sm:min-w-0`}>
                  <TabsTrigger
                    value="my-notes"
                    className="rounded-lg text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs sm:text-sm px-2"
                  >
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Moji zapiski</span>
                    <span className="xs:hidden">Zapiski</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="purchases"
                    className="rounded-lg text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs sm:text-sm px-2"
                  >
                    <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Kupljeni zapiski</span>
                    <span className="xs:hidden">Kupljeni</span>
                  </TabsTrigger>
                  {showInstructorTab && (
                    <TabsTrigger
                      value="instructor"
                      className="rounded-lg text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs sm:text-sm px-2"
                    >
                      <LayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Inštruktor</span>
                      <span className="xs:hidden">Inštruk.</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* My Notes Tab */}
              <TabsContent value="my-notes" className="space-y-4">
                {myNotes.length > 0 ? (
                  <div className="grid gap-4">
                    {myNotes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-card dark:bg-card backdrop-blur rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground mb-2">{note.title}</h3>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">
                                {note.subject}
                              </span>
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                                {note.type}
                              </span>
                              <span className="px-2 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-medium">
                                {note.school_type}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {note.price === 0 ? "BREZPLAČNO" : `${note.price}€`}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(note.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <Link to={`/notes/${note.id}`} className="flex-1">
                            <Button variant="outline" className="w-full text-foreground">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Odpri
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                            onClick={() => setDeleteNoteId(note.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card dark:bg-card backdrop-blur rounded-2xl border border-border">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground mb-2 font-medium">Nimaš še nobenih naloženih zapiskov.</p>
                    <p className="text-sm text-muted-foreground">
                      Začni z gumbom "Dodaj zapisek" na strani Zapiski.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Purchased Notes Tab */}
              <TabsContent value="purchases" className="space-y-4">
                {loading && mainTab === 'purchases' ? (
                  (() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('payment') === 'success') {
                      return (
                        <div className="flex flex-col items-center justify-center min-h-[30vh]">
                          <Loader2 className="animate-spin w-12 h-12 text-purple-500 mb-4" />
                          <p className="text-lg font-semibold mb-2">Obdelujemo tvoj nakup ...</p>
                          <p className="text-sm text-muted-foreground">Zapisek bo na voljo v nekaj sekundah po potrditvi plačila.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col items-center justify-center min-h-[30vh]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4" />
                        <p>Nalaganje kupljenih zapiskov ...</p>
                      </div>
                    );
                  })()
                ) : purchasedNotes.length > 0 ? (
                  <div className="grid gap-4">
                    {purchasedNotes.map((purchase) => {
                      // Defensive: handle missing or malformed notes relation
                      const note = purchase.notes;
                      if (!note || typeof note !== 'object') {
                        return (
                          <div key={purchase.id} className="bg-card dark:bg-card backdrop-blur rounded-2xl p-6 shadow-lg border border-border">
                            <div className="text-foreground font-bold mb-2">Neveljaven zapis (manjka povezava na zapisek)</div>
                            <div className="text-xs text-muted-foreground mb-2">ID nakupa: {purchase.id}</div>
                            <div className="text-xs text-muted-foreground mb-2">note_id: {purchase.note_id}</div>
                            <div className="text-xs text-muted-foreground mb-2">Kupljeno: {(() => { const d = purchase.purchased_at ? new Date(purchase.purchased_at) : null; return d && !isNaN(d.getTime()) ? d.toLocaleDateString('sl-SI') : 'Just now'; })()}</div>
                          </div>
                        );
                      }
                      return (
                        <Link
                          key={purchase.id}
                          to={`/notes/${purchase.note_id}`}
                          className="block bg-card dark:bg-card backdrop-blur rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-foreground mb-2">{note.title}</h3>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">
                                  {note.subject}
                                </span>
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                                  {note.type}
                                </span>
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium">
                                  Kupljeno: {(() => { const d = purchase.purchased_at ? new Date(purchase.purchased_at) : null; return d && !isNaN(d.getTime()) ? d.toLocaleDateString('sl-SI') : 'Just now'; })()}
                                </span>
                              </div>
                            </div>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 ml-4">
                              {note.price === 0 ? "BREZPLAČNO" : `${note.price}€`}
                            </p>
                          </div>
                          <div className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                            Odpri zapisek <ExternalLink className="w-4 h-4 ml-1" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card dark:bg-card backdrop-blur rounded-2xl border border-border">
                    <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground mb-2 font-medium">Še nisi kupil nobenega zapiska.</p>
                    <p className="text-sm text-muted-foreground">
                      Oglej si ponudbo na strani Zapiski.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Instructor Dashboard Tab */}
              {showInstructorTab && (
                <TabsContent value="instructor" className="space-y-4">
                  {loading && mainTab === 'instructor' ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-muted-foreground">Nalagam podatke o inštruktorstvu...</p>
                      </div>
                    </div>
                  ) : tutorId ? (
                    <InstructorDashboardTab 
                      tutorId={tutorId} 
                      hasPayoutSetup={!!profile.stripe_connect_id}
                    />
                  ) : (
                    <Card className="border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30">
                      <CardContent className="py-16 text-center">
                        <GraduationCap className="w-20 h-20 text-indigo-600 dark:text-indigo-400 mx-auto mb-6" />
                        <h3 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                          Postani inštruktor na Študku!
                        </h3>
                        <p className="text-lg text-muted-foreground mb-2 max-w-md mx-auto">
                          Deli svoje znanje s študenti in zasluži.
                        </p>
                        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                          Nastavi svoj urnik, določi ceno in začni poučevati že danes.
                        </p>
                        <Button 
                          size="lg"
                          onClick={async () => {
                            try {
                              // Refresh session before navigation to ensure latest data
                              await supabase.auth.refreshSession();
                              // Force reload profile data
                              await loadProfileData();
                              navigate('/tutors/apply');
                            } catch (error) {
                              console.error('Error refreshing before navigation:', error);
                              // Navigate anyway
                              navigate('/tutors/apply');
                            }
                          }}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-6 text-lg"
                        >
                          <GraduationCap className="w-5 h-5 mr-2" />
                          Prijavi se kot inštruktor
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Tutor Section - Full Width Below Grid (only if instructor but dashboard not already showing) */}
        {profile?.is_instructor && tutorId && !showInstructorTab && (
          <div className="space-y-6 mt-8">
            <Card className="p-6 bg-card dark:bg-card shadow-xl rounded-2xl border border-border">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Inštruktorstvo
              </h2>
              
              {/* Completed Hours */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Opravljene ure</p>
                <p className="text-3xl font-bold text-primary">
                  {profile.tutor_hours_completed?.toFixed(1) || 0} h
                </p>
              </div>

              {/* Stripe Connect Setup */}
              <div className="mb-6">
                <StripeConnectButton 
                  hasConnectAccount={!!profile?.stripe_connect_id} 
                />
                {!profile?.stripe_connect_id && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Nastavi izplačila, da lahko spreješ plačljive rezervacije
                  </p>
                )}
              </div>
            </Card>

            {/* Availability Management */}
            <div>
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Razpoložljivost za inštrukcije
              </h2>
              <TutorAvailabilityDates tutorId={tutorId} />
            </div>

            {/* Booking Requests */}
            <div>
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Povpraševanja za inštrukcije
              </h2>
              <TutorBookingRequests tutorId={tutorId} />
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Ocene in mnenja
            </h2>
          </div>
          
          {profile && (
            <ProfileReviews targetProfileId={profile.id} />
          )}
          
          <div className="mt-6 bg-gradient-to-br from-secondary to-muted rounded-2xl p-6 border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Opomba:</strong> To so ocene, ki so jih drugi uporabniki napisali o tebi. 
              Drugih uporabnikov lahko oceniš, ko jih obiščeš preko njihovih zapiskov ali oglasov.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Izbrišem zapisek?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Si prepričan, da želiš izbrisati te zapiske? Tega ni mogoče razveljaviti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="text-foreground">Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Brišem..." : "Izbriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Prekliči Študko PRO</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-muted-foreground">
              <p className="text-base font-medium text-foreground">Ali si prepričan?</p>
              <p className="text-red-600 dark:text-red-400 font-semibold">Izgubil boš dostop do neomejenih AI razlag.</p>
              <div className="space-y-1 text-sm">
                <p>• Tvoj dostop bo ostal aktiven do konca plačanega obdobja{profile?.current_period_end && `: ${formatDate(profile.current_period_end)}`}</p>
                <p>• Denarja za že plačano obdobje ne vračamo</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling} className="text-foreground">Ne, obdrži PRO</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
            >
              {cancelling ? "Preklic..." : "Da, prekliči naročnino"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      <Footer />
    </div>
  );
};

export default Profile;
