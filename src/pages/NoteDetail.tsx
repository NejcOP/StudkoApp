import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArrowLeft, Download, ShoppingCart, Sparkles, Brain, Zap } from "lucide-react";
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

const NoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);

  const fetchNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*, profiles(full_name, stripe_connect_id)")
        .eq("id", id)
        .single();
      if (error) throw error;
      setNote(data);
    } catch (err) {
      setNote(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    setImproving(true);
    try {
      const { error } = await supabase.functions.invoke('improve-notes', {
        body: { noteId: note.id, content: note.file_url }
      });
      if (error) throw error;
      toast.success("Zapisek izboljšan!");
      fetchNote();
    } catch {
      toast.error("Napaka pri izboljšavi");
    } finally {
      setImproving(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!user || !note || !note.file_url) return;
    setGeneratingFlashcards(true);
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

  const isOwner = user && note && note.author_id === user.id;
  const showDownloadButton = note && hasPurchased && note.file_url;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
          <span>Nalaganje...</span>
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