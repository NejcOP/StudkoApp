import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArrowLeft, Download, ShoppingCart, Brain, Zap, BookOpen, User, Calendar, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { NotePreview } from "@/components/NotePreview";
import { format } from "date-fns";
import { SellerBadge } from "@/components/SellerBadge";

interface Note {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  level: string;
  type: string;
  school_type: string;
  price: number;
  created_at: string;
  author_id: string;
  file_url?: string | null;
  improved_file_url?: string | null;
  profiles: {
    full_name: string;
    stripe_connect_id?: string;
  };
}

// Cache utilities
const CACHE_KEY_PREFIX = 'note_detail_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedNote = (noteId: string): Note | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${noteId}`);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${noteId}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const setCachedNote = (noteId: string, note: Note) => {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${noteId}`, JSON.stringify({
      data: note,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore storage errors
  }
};

const NoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Initialize with cached data for instant display
  const cachedData = id ? getCachedNote(id) : null;
  const [note, setNote] = useState<Note | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [hasExistingFlashcards, setHasExistingFlashcards] = useState(false);
  const [authorStats, setAuthorStats] = useState({ totalSales: 0, averageRating: 0, isVerified: false });

  const fetchNote = useCallback(async () => {
    if (!id) return;
    
    // Show loading on first load, refreshing on subsequent loads
    if (note) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*, profiles(full_name, stripe_connect_id)")
        .eq("id", id)
        .single();
      if (error) throw error;
      setNote(data);
      setCachedNote(id, data);
      
      // Parse file URLs (can be JSON array or single string)
      if (data?.file_url) {
        try {
          const parsed = JSON.parse(data.file_url);
          const urls = Array.isArray(parsed) ? parsed : [parsed];
          setFileUrls(urls);
        } catch {
          // If not JSON, treat as single URL
          setFileUrls([data.file_url]);
        }
      }
    } catch (err) {
      setNote(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id, note]);

  const checkPurchaseStatus = useCallback(async () => {
    if (!user || !id) return;
    try {
      const { data } = await supabase
        .from("note_purchases")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("note_id", id)
        .maybeSingle();
      setHasPurchased(!!data);
    } catch {
      setHasPurchased(false);
    }
  }, [id, user]);

  // Check if flashcards already exist for this note
  const checkExistingFlashcards = useCallback(async () => {
    if (!user || !note) return;
    
    try {
      const { data, error } = await supabase
        .from('flashcard_sets')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', note.title)
        .maybeSingle();
      
      setHasExistingFlashcards(!!data && !error);
    } catch {
      setHasExistingFlashcards(false);
    }
  }, [user, note]);

  // Fetch author stats for badge
  const fetchAuthorStats = useCallback(async () => {
    if (!note?.author_id) return;

    try {
      // Get total sales count
      const { count: salesCount } = await supabase
        .from('note_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', note.author_id);

      // Get average rating
      const { data: reviewsData } = await supabase
        .from('profile_reviews')
        .select('rating')
        .eq('target_profile_id', note.author_id)
        .eq('is_hidden', false);

      const totalSales = salesCount || 0;
      const averageRating = reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
        : 0;

      // Get note count
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', note.author_id);

      const isVerified = totalSales >= 10 && averageRating >= 4.5 && (notesCount || 0) >= 3;

      setAuthorStats({ totalSales, averageRating, isVerified });
    } catch (error) {
      console.error('Error fetching author stats:', error);
    }
  }, [note?.author_id]);

  useEffect(() => {
    fetchNote();
    checkPurchaseStatus();
    checkExistingFlashcards();
    fetchAuthorStats();
  }, [fetchNote, checkPurchaseStatus, checkExistingFlashcards, fetchAuthorStats]);

  const handleDownload = async () => {
    if (fileUrls.length === 0) {
      toast.error("Datoteke niso na voljo!");
      return;
    }

    if (fileUrls.length === 1) {
      // Single file - direct download
      const url = fileUrls[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `${note?.title || 'zapisek'}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Datoteka se prenaša!');
    } else {
      // Multiple files - download all
      toast.info(`Prenašam ${fileUrls.length} datotek...`);
      for (let i = 0; i < fileUrls.length; i++) {
        const url = fileUrls[i];
        const link = document.createElement('a');
        link.href = url;
        link.download = `${note?.title || 'zapisek'}_${i + 1}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay between downloads
        if (i < fileUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      toast.success('Vse datoteke so prenešene!');
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Prijava je obvezna.");
      navigate("/login");
      return;
    }
    if (!note) return;
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          noteId: note.id,
          noteTitle: note.title,
          price: note.price,
          sellerStripeAccountId: note.profiles.stripe_connect_id,
          userId: user.id
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Napaka pri nakupu";
      toast.error(errorMessage);
    } finally {
      setPurchasing(false);
    }
  };

  const handleGenerateFlashcards = () => {
    if (!note) return;
    
    // Redirect to AI page with tab, action, and noteId parameters
    navigate(`/ai?tab=flashcards&noteId=${note.id}&action=generate`);
  };

  // Memoize computed values
  const isOwner = useMemo(() => 
    user && note && note.author_id === user.id, 
    [user, note]
  );
  
  const showDownloadButton = useMemo(() => 
    note && hasPurchased && note.file_url, 
    [note, hasPurchased]
  );
  
  // Show preview for paid notes that haven't been purchased (including for owner to see what buyers see)
  const showPreview = useMemo(() => 
    note && note.file_url && note.price > 0 && !hasPurchased,
    [note, hasPurchased]
  );
  
  // Show skeleton only on initial load without cached data
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-3/4 mb-6" />
          <div className="bg-card rounded-lg shadow-lg p-8 space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-4 mt-8">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
          <span>Zapisek ni bil najden</span>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-6 lg:py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 sm:mb-6 transition-colors min-h-[44px] px-2"
        >
          <ArrowLeft className="w-5 h-5" /> Nazaj
        </button>

        <div className="max-w-5xl mx-auto">
          {/* Owner Banner */}
          {isOwner && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg border border-primary/20 mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-foreground">Ta zapisek je v tvoji lasti</p>
                  <p className="text-xs text-muted-foreground mt-1">Datoteka se pripravlja</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Note Header */}
              <div className="bg-gradient-card rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-border shadow-lg">
                <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-primary to-accent rounded-xl sm:rounded-2xl flex items-center justify-center shadow-glow-accent flex-shrink-0">
                    <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-foreground break-words">
                      {note.title}
                    </h1>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <span className="px-2 sm:px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs sm:text-sm font-medium">
                        {note.subject}
                      </span>
                      <span className="px-2 sm:px-3 py-1 bg-accent/10 text-accent rounded-lg text-xs sm:text-sm font-medium">
                        {note.level}
                      </span>
                      <span className="px-2 sm:px-3 py-1 bg-muted text-muted-foreground rounded-lg text-xs sm:text-sm font-medium">
                        {note.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-card rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-border shadow-lg">
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-foreground">Informacije</h2>
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm sm:text-base text-muted-foreground">Vrsta šole:</span>
                    <span className="text-sm sm:text-base font-medium text-foreground text-right">{note.school_type}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm sm:text-base text-muted-foreground">Cena:</span>
                    <span className="text-sm sm:text-base font-bold text-primary">
                      {note.price === 0 ? "BREZPLAČNO" : `${note.price.toFixed(2)} €`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Dodano: {format(new Date(note.created_at), "dd. MMMM yyyy")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {note.description && (
                <div className="bg-gradient-card rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-border shadow-lg">
                  <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-foreground">Opis</h2>
                  <div className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                    {note.description}
                  </div>
                </div>
              )}


              {/* Preview Section - Show 25% of content for paid notes not yet purchased */}
              {showPreview && fileUrls.length > 0 && (
                <div className="space-y-6">
                  {fileUrls.map((url, index) => (
                    <NotePreview
                      key={index}
                      fileUrl={url}
                      onPurchase={isOwner ? () => toast.info("Ne moreš kupiti svojih zapiskov") : handlePurchase}
                      price={note.price}
                      purchasing={purchasing}
                      pageNumber={index + 1}
                      totalPages={fileUrls.length}
                      isOwner={isOwner}
                    />
                  ))}
                </div>
              )}

              {/* Full Content Section - Show for purchased notes or free notes */}
              {!showPreview && fileUrls.length > 0 && (
                <div className="bg-gradient-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border shadow-lg">
                  <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-foreground">
                          Polna vsebina
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {fileUrls.length} {fileUrls.length === 1 ? 'datoteka' : fileUrls.length === 2 ? 'datoteki' : 'datoteke'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Display all files */}
                  <div className="space-y-6">
                    {fileUrls.map((url, index) => (
                      <div key={index} className="space-y-3">
                        {index > 0 && <div className="border-t border-border my-6"></div>}

                        {/* File header */}
                        {fileUrls.length > 1 && (
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-muted-foreground">
                              Datoteka {index + 1} od {fileUrls.length}
                            </p>
                          </div>
                        )}

                        {/* Display PDF or Image */}
                        {url.toLowerCase().includes('.pdf') || url.startsWith('blob:') ? (
                          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted">
                            <iframe
                              src={url}
                              className="w-full h-full"
                              title={`Note preview ${index + 1}`}
                            />
                          </div>
                        ) : (
                          <div className="rounded-xl overflow-hidden border border-border">
                            <img
                              src={url}
                              alt={`${note.title} - stran ${index + 1}`}
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Purchase Card */}
              <div className="bg-gradient-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border shadow-lg lg:sticky lg:top-24">
                <div className="text-center mb-4 sm:mb-6">
                  <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                    {note.price === 0 ? (
                      <span className="text-accent">BREZPLAČNO</span>
                    ) : (
                      `${note.price.toFixed(2)} €`
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Enkratna cena
                  </p>
                </div>

                {hasPurchased ? (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3">
                      <div className="flex items-center gap-2.5 sm:gap-3 text-green-700 dark:text-green-400">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm sm:text-base">Ta zapisek je v tvoji lasti</p>
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-500">Dostop do polne vsebine</p>
                        </div>
                      </div>
                    </div>
                    {showDownloadButton && (
                      <Button
                        onClick={() => handleDownload()}
                        className="w-full mb-2 h-11 sm:h-12 text-sm sm:text-base"
                        variant="default"
                      >
                        <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Prenesi zapisek
                      </Button>
                    )}
                  </div>
                ) : !isOwner && note.price > 0 ? (
                  <Button
                    onClick={handlePurchase}
                    className="w-full mb-4 h-11 sm:h-12 text-sm sm:text-base"
                    variant="default"
                    disabled={purchasing || !note.profiles?.stripe_connect_id}
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {purchasing ? "Kupujem..." : !note.profiles?.stripe_connect_id ? "Ni na voljo" : "Kupi zapisek"}
                  </Button>
                ) : null}

                {/* AI Features */}
                {(isOwner || hasPurchased) && (note.description || note.file_url) && (
                  <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
                    <Button
                      variant="outline"
                      className="w-full h-11 sm:h-12 text-sm sm:text-base"
                      onClick={handleGenerateFlashcards}
                    >
                      <Brain className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Generiraj kartice
                    </Button>

                    {hasExistingFlashcards && (
                      <Button
                        className="w-full h-11 sm:h-12 text-sm sm:text-base bg-primary hover:bg-primary/90 text-white shadow-glow-primary"
                        onClick={() => navigate(`/ai?tab=flashcards`)}
                      >
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        Odpri flashcards
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                    <span className="text-muted-foreground">Takojšen dostop</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                    <span className="text-muted-foreground">PDF format</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                    <span className="text-muted-foreground">Neomejeno prenosov</span>
                  </div>
                </div>
              </div>

              {/* Author Card */}
              <div className="bg-gradient-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border shadow-lg">
                <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-foreground">Avtor</h3>
                <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow-primary flex-shrink-0">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-foreground truncate">
                      {note.profiles?.full_name || "Neznan avtor"}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Študent</p>
                  </div>
                </div>
                
                {/* Seller Badge */}
                <div className="mb-3 sm:mb-4">
                  <SellerBadge 
                    isVerified={authorStats.isVerified}
                    totalSales={authorStats.totalSales}
                    averageRating={authorStats.averageRating}
                    size="sm"
                  />
                </div>

                {/* View Profile Button */}
                <Button
                  onClick={() => navigate(`/users/${note.author_id}`)}
                  variant="outline"
                  className="w-full h-10 sm:h-11 text-sm sm:text-base"
                >
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                  Poglej profil
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NoteDetail;