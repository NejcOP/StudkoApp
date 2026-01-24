import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArrowLeft, Download, BookOpen, User, Loader2, Calendar, Trash2, ExternalLink, ShoppingCart, Sparkles, Zap, Brain, CheckCircle2 } from "lucide-react";
// Duplicate import removed
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";
import { NotePreview } from "@/components/NotePreview";
import { SellerBadge } from "@/components/SellerBadge";
import { FlashcardViewer } from "@/components/FlashcardViewer";
import type { Flashcard } from "@/components/FlashcardViewer";

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
  profiles: {
    full_name: string;
    stripe_connect_id?: string;
  };
}

const NoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [sellerStats, setSellerStats] = useState<{
    total_sales: number;
    average_rating: number;
    total_notes: number;
    is_verified: boolean;
  } | null>(null);
  const [improving, setImproving] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<unknown[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);

  // Unified handleDownload for all file downloads (owner and file list)
   const handleDownload = (url?: string, index?: number) => {
     // If called from owner button, use note.file_url
     const filePath = url || note?.file_url;
     if (!filePath) {
       console.error("URL datoteke ni najden!");
       toast.error("URL datoteke ni najden!");
       return;
     }
     // Pridobimo javni URL iz bucket-a 'notes'
     const { data } = supabase.storage.from('notes').getPublicUrl(filePath);
     if (data?.publicUrl) {
       window.open(data.publicUrl, '_blank');
       toast.success('Datoteka se prenaša!');
     } else {
       console.error("Napaka pri pridobivanju URL-ja");
       toast.error('Napaka pri pridobivanju povezave do datoteke.');
     }
   };

  const handleDownloadAll = () => {
    toast.info(`Prenašam ${fileUrls.length} datotek...`);
    fileUrls.forEach((url, i) => {
      handleDownload(url, i);
    });
  };

  const fetchNote = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select(`
          *,
          profiles (
            full_name,
            stripe_connect_id
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setNote(data);
      
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

      // (Odstranjeno: fetch seller stats / get_seller_stats RPC)
    } catch (error) {
      console.error("Error fetching note:", error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  const checkPurchaseStatus = useCallback(async () => {
    if (!user || !id) return;
    try {
      const { data, error } = await supabase
        .from("note_purchases")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("note_id", id)
        .maybeSingle();
      setHasPurchased(!!data);
    } catch (error) {
      console.error("Error checking purchase status:", error);
    }
  }, [id, user]);

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Prijavi se za nakup zapiska");
      navigate("/login");
      return;
    }

    if (!note) return;

    setPurchasing(true);
try {
  // Create Stripe Checkout session for note purchase
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: {
      noteId: note.id,
      noteTitle: note.title,
      price: note.price,
      // TUKAJ JE POPRAVEK: Ime mora biti 'sellerStripeAccountId'
      sellerStripeAccountId: note.profiles.stripe_connect_id,
      userId: (await supabase.auth.getUser()).data.user?.id // Dodaj še to, da funkcija ve, kdo kupuje
    }
  });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error purchasing note:", error);
      const errorMessage = error instanceof Error ? error.message : "Napaka pri nakupu zapiska";
      toast.error(errorMessage);
      setPurchasing(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!user || !note) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", note.id)
        .eq("author_id", user.id);

      if (error) throw error;

      toast.success("Zapisek je bil izbrisan");
      navigate("/profile");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Pri brisanju zapiska je prišlo do napake");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const isOwner = user && note && note.author_id === user.id;
  // Only show purchase button if not purchased (owner can't buy their own note)
  const showPurchaseButton = note && note.price > 0 && !hasPurchased && !isOwner;
  // Only show download button if purchased
  const showDownloadButton = note && hasPurchased && note.file_url;
  // Show preview for ALL paid notes unless user has purchased them (even for owner)
  const showPreview = note && note.file_url && note.price > 0 && !hasPurchased;
  
  // Debug logging
  const handleImproveNotes = async () => {
    if (!user || !note || !note.file_url) return;

    setImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-notes', {
        body: { 
          noteId: note.id, 
          content: note.file_url 
        }
      });

      if (error) throw error;

      toast.success("Zapiski uspešno izboljšani!");
      fetchNote(); // Reload note to show improved version
    } catch (error) {
      console.error('Error improving notes:', error);
      toast.error("Napaka pri izboljševanju zapiskov");
    } finally {
      setImproving(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!user || !note || !note.file_url) return;

    setGeneratingFlashcards(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { 
          noteId: note.id, 
          content: note.file_url,
          userId: user.id
        }
      });

      if (error) throw error;

      setFlashcards(data.flashcards);
      setShowFlashcards(true);
      
      // Save flashcard set to database
      if (data.flashcards && data.flashcards.length > 0) {
        try {
          await supabase.from('flashcard_sets').insert({
            user_id: user.id,
            title: note.title,
            content: data.flashcards
          });
        } catch (saveError) {
          console.error("Error saving flashcard set:", saveError);
        }
      }
      
      toast.success(`${data.flashcards.length} flashcards ustvarjenih!`);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast.error("Napaka pri generiranju flashcards");
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const loadFlashcards = async () => {
    if (!user || !note) return;

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('note_id', note.id)
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setFlashcards(data);
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
    }
  };

  useEffect(() => {
    if (note && user) {
      loadFlashcards();
    }
  }, [note, user, loadFlashcards]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
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
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-foreground mb-4">Zapisek ni bil najden</h2>
            <Button onClick={() => navigate("/notes")}>Nazaj na seznam</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Debug: izpiši URL datoteke
  if (note) {
    console.log('URL datoteke:', note.file_url);
  }

  // ...existing code...

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazaj
        </button>
        <div className="max-w-5xl mx-auto">
          {/* Owner Actions */}
          {isOwner && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500 rounded-lg">
              <p className="text-green-500 font-bold">Ta zapisek je v tvoji lasti</p>
              <button
                onClick={e => { e.preventDefault(); if (note.file_url) handleDownload(); }}
                className={`mt-2 w-full py-2 rounded-md transition ${note.file_url ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-400 text-gray-100 cursor-not-allowed'}`}
                disabled={!note.file_url}
              >
                {note.file_url ? 'Prenesi PDF zapisek' : 'Datoteka se pripravlja'}
              </button>
            </div>
          )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
              {/* Note Header */}
              <div className="bg-gradient-card rounded-2xl p-8 border border-border shadow-lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-glow-accent flex-shrink-0">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-grow">
                    <h1 className="text-3xl font-bold mb-2 text-foreground">
                      {note.title}
                    </h1>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                        {note.subject}
                      </span>
                      <span className="px-3 py-1 bg-accent/10 text-accent rounded-lg text-sm font-medium">
                        {note.level}
                      </span>
                      <span className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-sm font-medium">
                        {note.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-card rounded-2xl p-8 border border-border shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-foreground">Informacije</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vrsta šole:</span>
                    <span className="font-medium text-foreground">{note.school_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cena:</span>
                    <span className="font-bold text-primary">
                      {note.price === 0 ? "BREZPLAČNO" : `${note.price.toFixed(2)} €`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Dodano: {format(new Date(note.created_at), "dd. MMMM yyyy")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {note.description && (
                <div className="bg-gradient-card rounded-2xl p-8 border border-border shadow-lg">
                  <h2 className="text-xl font-bold mb-4 text-foreground">Opis</h2>
                  <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {note.description}
                  </div>
                </div>
              )}

              {/* Preview Section - Show for paid notes not yet purchased (including owner) */}
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

              {/* Full Content Section - Show only for purchasers or free notes (NOT for owner of paid notes) */}
              {!showPreview && fileUrls.length > 0 && (
                <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          Polna vsebina
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Dostop do celotnega zapiska ({fileUrls.length} {fileUrls.length === 1 ? 'datoteka' : fileUrls.length === 2 ? 'datoteki' : 'datoteke'})
                        </p>
                      </div>
                    </div>
                    
                    {/* Download all button - only show if multiple files */}
                    {fileUrls.length > 1 && (
                      <Button
                        onClick={handleDownloadAll}
                        variant="default"
                        size="sm"
                        className="gap-2 shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Prenesi vse
                      </Button>
                    )}
                  </div>
                  
                  {/* Display all files */}
                  {fileUrls.map((url, index) => (
                    <div key={index} className="space-y-3">
                      {index > 0 && <div className="border-t border-border my-6"></div>}
                      
                      {/* File header with download button */}
                      {fileUrls.length > 1 && (
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-muted-foreground">
                            Datoteka {index + 1} od {fileUrls.length}
                          </p>
                          <Button
                            onClick={e => { e.preventDefault(); handleDownload(url, index); }}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Prenesi
                          </Button>
                        </div>
                      )}
                      
                      {url.toLowerCase().includes('.pdf') || url.startsWith('blob:') ? (
                        <div className="space-y-3">
                          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted">
                            <iframe
                              src={url}
                              className="w-full h-full"
                              title={`Note preview ${index + 1}`}
                            />
                          </div>
                          {fileUrls.length === 1 && (
                            <Button
                              onClick={e => { e.preventDefault(); handleDownload(url, index); }}
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Prenesi PDF
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-xl overflow-hidden border border-border">
                            <img
                              src={url}
                              alt={`${note.title} - stran ${index + 1}`}
                              className="w-full h-auto"
                            />
                          </div>
                          {fileUrls.length === 1 && (
                            <Button
                              onClick={e => { e.preventDefault(); handleDownload(url, index); }}
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Prenesi sliko
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Purchase Card */}
              <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg sticky top-24">
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold text-primary mb-2">
                    {note.price === 0 ? (
                      <span className="text-accent">BREZPLAČNO</span>
                    ) : (
                      `${note.price.toFixed(2)} €`
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Enkratna cena
                  </p>
                </div>


                {/* Stripe purchase/download logic */}
                {hasPurchased ? (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 mb-3">
                      <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-base">Ta zapisek je v tvoji lasti</p>
                          <p className="text-sm text-green-600 dark:text-green-500">Dostop do polne vsebine</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : showPurchaseButton ? (
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full shadow-glow-primary mb-4"
                    onClick={handlePurchase}
                    disabled={purchasing || !note?.profiles?.stripe_connect_id}
                    title={!note?.profiles?.stripe_connect_id ? 'Prodajalec še ni nastavil plačilnega računa.' : undefined}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {purchasing ? "Kupujem..." : !note?.profiles?.stripe_connect_id ? "Ni na voljo" : "Kupi zapisek"}
                  </Button>
                ) : null}

                {showDownloadButton && (
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full shadow-glow-primary mb-4"
                    asChild
                  >
                    <a href={note.file_url!} download target="_blank" rel="noopener noreferrer">
                      <Download className="w-5 h-5 mr-2" />
                      Prenesi zapisek
                    </a>
                  </Button>
                )}

                {/* AI Features for owners and purchasers */}
                {(isOwner || hasPurchased) && note.file_url && (
                  <div className="space-y-3 mb-6">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={handleImproveNotes}
                      disabled={improving}
                    >
                      {improving ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 mr-2" />
                      )}
                      {improving ? "Izboljšujem..." : "AI izboljšaj zapiske"}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={handleGenerateFlashcards}
                      disabled={generatingFlashcards}
                    >
                      {generatingFlashcards ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Brain className="w-5 h-5 mr-2" />
                      )}
                      {generatingFlashcards ? "Generiram..." : "Ustvari flashcards"}
                    </Button>

                    {flashcards.length > 0 && (
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full"
                        onClick={() => setShowFlashcards(true)}
                      >
                        <Zap className="w-5 h-5 mr-2" />
                        Ponovi flashcards ({flashcards.length})
                      </Button>
                    )}
                  </div>
                )}

                {/* AI Features for owners and purchasers */}
                {(isOwner || hasPurchased) && note.file_url && (
                  <div className="space-y-3 mb-6">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={handleImproveNotes}
                      disabled={improving}
                    >
                      {improving ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 mr-2" />
                      )}
                      {improving ? "Izboljšujem..." : "AI izboljšaj zapiske"}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={handleGenerateFlashcards}
                      disabled={generatingFlashcards}
                    >
                      {generatingFlashcards ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Brain className="w-5 h-5 mr-2" />
                      )}
                      {generatingFlashcards ? "Generiram..." : "Ustvari flashcards"}
                    </Button>

                    {flashcards.length > 0 && (
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full"
                        onClick={() => setShowFlashcards(true)}
                      >
                        <Zap className="w-5 h-5 mr-2" />
                        Ponovi flashcards ({flashcards.length})
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-muted-foreground">
                      Takojšen dostop
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-muted-foreground">
                      PDF format
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-muted-foreground">
                      Neomejeno prenosov
                    </span>
                  </div>
                </div>
              </div>

              {/* Author Card */}
              <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
                <h3 className="text-lg font-bold mb-4 text-foreground">
                  Avtor
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {note.profiles?.full_name || "Neznan avtor"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Študent
                    </p>
                  </div>
                </div>
                
                {sellerStats && (sellerStats.is_verified || sellerStats.total_sales > 0) && (
                  <div className="mb-4">
                    <SellerBadge
                      isVerified={sellerStats.is_verified}
                      totalSales={sellerStats.total_sales}
                      averageRating={sellerStats.average_rating}
                      size="sm"
                    />
                  </div>
                )}
                
                {!isOwner && (
                  <Link to={`/users/${note.author_id}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <User className="w-4 h-4" />
                      Poglej profil
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbrišem zapisek?</AlertDialogTitle>
            <AlertDialogDescription>
              Si prepričan, da želiš izbrisati te zapiske? Tega ni mogoče razveljaviti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Prekliči</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Brišem..." : "Izbriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Flashcard Viewer */}
      {showFlashcards && flashcards.length > 0 && (
        <FlashcardViewer
          flashcards={flashcards as Flashcard[]}
          onClose={() => setShowFlashcards(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default NoteDetail;
