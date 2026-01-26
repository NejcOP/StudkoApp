import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArrowLeft, Download, ShoppingCart, Sparkles, Brain, Zap, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FlashcardViewer, type Flashcard } from "@/components/FlashcardViewer";

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
  const [improving, setImproving] = useState(false);
  const [improvedSuccess, setImprovedSuccess] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);

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

  useEffect(() => {
    fetchNote();
    checkPurchaseStatus();
  }, [fetchNote, checkPurchaseStatus]);

  const handleDownload = (url?: string) => {
    const filePath = url || note?.file_url;
    if (!filePath) {
      toast.error("URL datoteke ni najden!");
      return;
    }
    const { data } = supabase.storage.from('notes').getPublicUrl(filePath);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
      toast.success('Datoteka se prenaša!');
    } else {
      toast.error('Napaka pri pridobivanju povezave.');
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

  const handleImproveNotes = async () => {
    if (!user || !note || !note.file_url) return;
    
    // Optimistic update
    setImproving(true);
    setImprovedSuccess(true);
    toast.success("Zapisek se izboljšuje...");
    
    try {
      const { error } = await supabase.functions.invoke('improve-notes', {
        body: { noteId: note.id, content: note.file_url }
      });
      if (error) throw error;
      
      // Silent refresh in background
      fetchNote();
      toast.success("Zapisek uspešno izboljšan!");
    } catch {
      // Rollback on error
      setImprovedSuccess(false);
      toast.error("Napaka pri izboljšavi");
    } finally {
      setImproving(false);
      // Keep success state for a moment
      setTimeout(() => setImprovedSuccess(false), 3000);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!user || !note || !note.file_url) return;
    
    // Optimistic: Show generating state immediately
    setGeneratingFlashcards(true);
    toast.info("Generiram flashcards...");
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { noteId: note.id, content: note.file_url, userId: user.id }
      });
      if (error) throw error;
      
      const formattedFlashcards = (data.flashcards || []).map((card: { front?: string; back?: string; question?: string; answer?: string }, index: number) => ({
        id: `${note.id}-${index}`,
        question: card.front || card.question || '',
        answer: card.back || card.answer || ''
      }));
      
      setFlashcards(formattedFlashcards);
      setShowFlashcards(true);
      toast.success("Flashcards ustvarjeni!");
    } catch {
      toast.error("Napaka pri generiranju flashcards");
    } finally {
      setGeneratingFlashcards(false);
    }
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
      <div className="container mx-auto max-w-2xl py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Nazaj
        </button>
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{note.title}</h1>
          <div className="mb-2 text-muted-foreground">{note.subject} • {note.level} • {note.type}</div>
          <div className="mb-2">Vrsta šole: <b>{note.school_type}</b></div>
          <div className="mb-2">Cena: <b>{note.price === 0 ? "BREZPLAČNO" : `${note.price.toFixed(2)} €`}</b></div>
          {note.description && <div className="mb-4">{note.description}</div>}
          {isOwner && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <span className="text-green-700 font-semibold">Ta zapisek je v tvoji lasti</span>
            </div>
          )}
          {showDownloadButton && (
            <Button onClick={() => handleDownload()} className="w-full mb-2" variant="outline">
              <Download className="w-5 h-5 mr-2" /> Prenesi zapisek
            </Button>
          )}
          {!isOwner && note.price > 0 && !hasPurchased && (
            <Button
              onClick={handlePurchase}
              className="w-full mb-2"
              variant="default"
              disabled={purchasing || !note.profiles?.stripe_connect_id}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {purchasing ? "Kupujem..." : !note.profiles?.stripe_connect_id ? "Ni na voljo" : "Kupi zapisek"}
            </Button>
          )}
          {(isOwner || hasPurchased) && note.file_url && (
            <div className="flex flex-col gap-2 mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleImproveNotes}
                disabled={improving}
              >
                {improving ? <Sparkles className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {improving ? "Izboljšujem..." : "AI izboljšaj zapiske"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateFlashcards}
                disabled={generatingFlashcards}
              >
                {generatingFlashcards ? <Brain className="w-5 h-5 mr-2 animate-spin" /> : <Brain className="w-5 h-5 mr-2" />}
                {generatingFlashcards ? "Generiram..." : "Ustvari flashcards"}
              </Button>
              {flashcards.length > 0 && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowFlashcards(true)}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Ponovi flashcards ({flashcards.length})
                </Button>
              )}
            </div>
          )}
        </div>
        {showFlashcards && flashcards.length > 0 && (
          <FlashcardViewer
            flashcards={flashcards}
            onClose={() => setShowFlashcards(false)}
          />
        )}
      </div>
      <Footer />
    </div>
  );
};

export default NoteDetail;