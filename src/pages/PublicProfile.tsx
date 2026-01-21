import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { User, BookOpen, Calendar, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProfileReviews } from "@/components/ProfileReviews";
import { ReviewForm } from "@/components/ReviewForm";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Profile {
  id: string;
  full_name: string;
  created_at: string;
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

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshReviews, setRefreshReviews] = useState(0);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }

    // If viewing own profile, redirect to /profile
    if (isOwnProfile) {
      navigate("/profile");
      return;
    }

    loadProfileData();
  }, [userId, isOwnProfile]);

  const loadProfileData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user's public notes
      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    setRefreshReviews(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full rounded-2xl mb-8" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Uporabnik ne obstaja
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Ta uporabniški profil ni bil najden.
            </p>
            <Link to="/notes">
              <Button variant="hero">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Nazaj na zapiske
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Nazaj
        </Button>

        {/* Profile Header */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <User className="w-12 h-12 text-white" />
            </div>
            
            <div className="flex-grow">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {profile.full_name}
              </h1>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  Pridružen {format(new Date(profile.created_at), "MMMM yyyy")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - User's Notes */}
          <div className="lg:col-span-2 space-y-8">
            {/* Notes Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Objavljeni zapiski ({notes.length})
                </h2>
              </div>

              {notes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notes.map((note) => (
                    <Link
                      key={note.id}
                      to={`/notes/${note.id}`}
                      className="bg-white/90 dark:bg-slate-800/90 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group"
                    >
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {note.title}
                      </h3>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                          {note.subject}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-md">
                          {note.school_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {note.type}
                        </span>
                        <span className="font-bold text-primary">
                          {note.price === 0 ? "BREZPLAČNO" : `${note.price}€`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white/90 dark:bg-slate-800/90 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700">
                  <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Ta uporabnik še ni objavil nobenega zapiska.
                  </p>
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div key={refreshReviews}>
              <ProfileReviews targetProfileId={profile.id} />
            </div>
          </div>

          {/* Right Column - Review Form */}
          <div className="lg:col-span-1">
            {user ? (
              <div className="sticky top-24">
                <ReviewForm
                  targetProfileId={profile.id}
                  onReviewSubmitted={handleReviewSubmitted}
                />
              </div>
            ) : (
              <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
                  Oceni uporabnika
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Prijavi se, da lahko oceniš tega uporabnika.
                </p>
                <Link to="/login">
                  <Button variant="hero" className="w-full">
                    Prijava
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PublicProfile;
