import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArrowLeft, Download, ShoppingCart, Sparkles, Brain, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FlashcardViewer } from "@/components/FlashcardViewer";

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
  const urlParams = new URLSearchParams(window.location.search);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);

  import { useParams, useNavigate } from "react-router-dom";
  import { useEffect, useState } from "react";
  import { supabase } from "@/integrations/supabase/client";
  import { Button } from "@/components/ui/button";
  import Navigation from "@/components/Navigation";
  import Footer from "@/components/Footer";
  import { ArrowLeft, Download, ShoppingCart, Sparkles, Brain, Zap } from "lucide-react";
  import { useAuth } from "@/hooks/useAuth";
  import { toast } from "sonner";
  import { FlashcardViewer } from "@/components/FlashcardViewer";

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
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [showFlashcards, setShowFlashcards] = useState(false);

    async function fetchNote() {
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
    }

    async function checkPurchaseStatus() {
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
    }

    function handleDownload(url?: string) {
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
    }

    async function handlePurchase() {
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
      } catch (error: any) {
        toast.error(error.message || "Napaka pri nakupu");
      } finally {
        setPurchasing(false);
      }
    }

    async function handleImproveNotes() {
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
    }

    async function handleGenerateFlashcards() {
      if (!user || !note || !note.file_url) return;
      setGeneratingFlashcards(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-flashcards', {
          body: { noteId: note.id, content: note.file_url, userId: user.id }
        });
        if (error) throw error;
        setFlashcards(data.flashcards || []);
        setShowFlashcards(true);
        toast.success("Flashcards ustvarjeni!");
      } catch {
        toast.error("Napaka pri generiranju flashcards");
      } finally {
        setGeneratingFlashcards(false);
      }
    }

    useEffect(() => { fetchNote(); checkPurchaseStatus(); }, [id, user]);

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
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [showFlashcards, setShowFlashcards] = useState(false);

    // Pridobi zapisek
    async function fetchNote() {
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
    }

    // Preveri nakup
    async function checkPurchaseStatus() {
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
    }

    // Prenos datoteke
    function handleDownload(url?: string) {
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
    }

    // Stripe nakup
    async function handlePurchase() {
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
      } catch (error: any) {
        toast.error(error.message || "Napaka pri nakupu");
      } finally {
        setPurchasing(false);
      }
    }

    // AI izboljšava
    async function handleImproveNotes() {
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
    }

    // Flashcards
    async function handleGenerateFlashcards() {
      if (!user || !note || !note.file_url) return;
      setGeneratingFlashcards(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-flashcards', {
          body: { noteId: note.id, content: note.file_url, userId: user.id }
        });
        if (error) throw error;
        setFlashcards(data.flashcards || []);
        setShowFlashcards(true);
        toast.success("Flashcards ustvarjeni!");
      } catch {
        toast.error("Napaka pri generiranju flashcards");
      } finally {
        setGeneratingFlashcards(false);
      }
    }

    useEffect(() => { fetchNote(); checkPurchaseStatus(); }, [id, user]);

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
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Napaka pri nakupu");
    } finally {
      setPurchasing(false);
    }
  };

  const handleImproveNotes = async () => {
    if (!user || !note?.file_url) return;
    setImproving(true);
    try {
      const { error } = await supabase.functions.invoke('improve-notes', {
        body: { noteId: note.id, content: note.file_url }
      });
      if (error) throw error;
      toast.success("Zapiski izboljšani!");
      fetchNote();
    } catch {
      toast.error("Napaka pri AI izboljšavi");
    } finally {
      setImproving(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!user || !note?.file_url) return;
    setGeneratingFlashcards(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { noteId: note.id, content: note.file_url, userId: user.id }
      });
      if (error) throw error;
      setFlashcards(data.flashcards);
      setShowFlashcards(true);
      toast.success("Flashcards ustvarjeni!");
    } catch {
      toast.error("Napaka pri generiranju");
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const isOwner = user && note && note.author_id === user.id;
  const showPreview = note && note.price > 0 && !hasPurchased;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  if (!note) return <div className="text-center py-20">Zapisek ni bil najden.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Nazaj
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* LEVI DEL - VSEBINA */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{note.title}</h1>
                  <p className="text-muted-foreground">{note.subject} • {note.level}</p>
                </div>
              </div>
            </div>

            {note.description && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h2 className="font-bold mb-2">Opis</h2>
                <p className="text-muted-foreground">{note.description}</p>
              </div>
            )}

            {showPreview ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-amber-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Predogled omejen. Za celoten dostop opravi nakup.
                </p>
                {fileUrls.map((url, i) => (
                  <NotePreview key={i} fileUrl={url} onPurchase={handlePurchase} price={note.price} purchasing={purchasing} isOwner={isOwner} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h2 className="font-bold mb-4">Polna vsebina</h2>
                {fileUrls.map((url, i) => (
                  <div key={i} className="mb-4">
                     <iframe src={url} className="w-full aspect-[3/4] rounded-lg border" title="Full Note" />
                     <Button variant="outline" className="w-full mt-2" onClick={() => handleDownload(url)}>
                       <Download className="w-4 h-4 mr-2" /> Prenesi datoteko {i + 1}
                     </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DESNI DEL - STRANSKA VRSTICA */}
          <div className="space-y-6">
            <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg sticky top-24">
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-primary">{note.price === 0 ? "BREZPLAČNO" : `${note.price.toFixed(2)} €`}</p>
              </div>

              {hasPurchased || isOwner ? (
                <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-xl mb-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-green-600 font-bold">Dostop omogočen</p>
                </div>
              ) : (
                <Button variant="default" size="lg" className="w-full mb-4" onClick={handlePurchase} disabled={purchasing}>
                  <ShoppingCart className="w-5 h-5 mr-2" /> {purchasing ? "Procesiram..." : "Kupi zdaj"}
                </Button>
              )}

              {(isOwner || hasPurchased) && (
                <div className="space-y-2 border-t pt-4">
                  <Button variant="outline" className="w-full" onClick={handleImproveNotes} disabled={improving}>
                    <Sparkles className="w-4 h-4 mr-2" /> AI Izboljšaj
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleGenerateFlashcards} disabled={generatingFlashcards}>
                    <Brain className="w-4 h-4 mr-2" /> Ustvari Flashcards
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="font-bold mb-4 text-center">Avtor</h3>
              <div className="flex items-center gap-3">
                <User className="w-10 h-10 p-2 bg-muted rounded-full" />
                <p className="font-medium">{note.profiles.full_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFlashcards && flashcards.length > 0 && (
        <FlashcardViewer flashcards={flashcards as Flashcard[]} onClose={() => setShowFlashcards(false)} />
      )}
      <Footer />
    </div>
  );
};

export default NoteDetail;