import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Calendar, Trash2, BookOpen, Loader2, Clock, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sl } from "date-fns/locale";

interface FlashcardSet {
  id: string;
  title: string;
  content: Array<{ question: string; answer: string }>;
  created_at: string;
}

interface FlashcardHistoryProps {
  onLoadSet: (flashcards: Array<{ question: string; answer: string }>, title: string) => void;
}

export const FlashcardHistory = ({ onLoadSet }: FlashcardHistoryProps) => {
  const { user } = useAuth();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const loadFlashcardSets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSets((data as unknown as FlashcardSet[]) || []);
    } catch (error) {
      console.error("Error loading flashcard sets:", error);
      toast.error("Napaka pri nalaganju zgodovine");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFlashcardSets();
    }
  }, [user, loadFlashcardSets]);

  const handleDelete = async (id: string) => {
    if (!confirm("Ali res želiš izbrisati ta komplet kartic?")) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('flashcard_sets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSets(sets.filter(set => set.id !== id));
      toast.success("Komplet izbrisan");
    } catch (error) {
      console.error("Error deleting flashcard set:", error);
      toast.error("Napaka pri brisanju");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoad = (set: FlashcardSet) => {
    onLoadSet(set.content, set.title);
    toast.success(`Naloženo: ${set.title}`);
  };

  const handleShare = async (set: FlashcardSet) => {
    if (!user) return;

    setSharingId(set.id);
    try {
      // Generate unique share code
      const shareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Save to shared_quizzes table with flashcards data
      const { error } = await supabase.from('shared_quizzes').insert({
        quiz_id: set.id, // Use set ID as quiz_id
        share_code: shareCode,
        created_by: user.id,
        quiz_data: {
          flashcards: set.content,
        },
        title: set.title,
        total_questions: set.content.length,
      });

      if (error) throw error;

      // Create share URL
      const shareUrl = `${window.location.origin}/flashcards/${shareCode}`;
      
      // Try Web Share API first (for mobile devices)
      if (navigator.share) {
        try {
          await navigator.share({
            title: set.title || 'Flashcards',
            text: 'Poglej si te flashcards! 📚',
            url: shareUrl,
          });
          toast.success("Delitev uspešna! 🎉");
          return; // Exit if share was successful
        } catch (shareError) {
          // User cancelled - don't show error
          const err = shareError as Error;
          if (err.name === 'AbortError') {
            return;
          }
          // If share failed for other reasons, continue to clipboard
        }
      }
      
      // Fallback to clipboard
      let copied = false;
      
      // Modern clipboard API (secure context only)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          copied = true;
        } catch (clipboardError) {
          console.warn("Clipboard API failed:", clipboardError);
        }
      }
      
      // Fallback for older browsers or non-HTTPS
      if (!copied) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            copied = true;
          }
        } catch (fallbackError) {
          console.error("Fallback copy failed:", fallbackError);
        }
      }
      
      if (copied) {
        toast.success("Povezava skopirana! Pošlji jo sošolcu. 📋");
      } else {
        // If all methods failed, show the URL
        toast.info(`Povezava: ${shareUrl}`, { duration: 10000 });
      }
    } catch (error) {
      console.error("Error sharing flashcards:", error);
      toast.error("Napaka pri deljenju");
    } finally {
      setSharingId(null);
    }
  };

  if (!user) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <p className="text-muted-foreground">Prijavi se za ogled zgodovine</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-2">Nalagam zgodovino...</p>
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Še ni shranjenih kartic</h3>
        <p className="text-muted-foreground text-sm">
          Tvoji generirani flashcards se bodo prikazali tukaj
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground">Moja zbirka ({sets.length})</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sets.map((set) => (
          <div
            key={set.id}
            className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate mb-1">
                  {set.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(set.created_at), {
                      addSuffix: true,
                      locale: sl,
                    })}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(set.id)}
                disabled={deletingId === set.id}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {deletingId === set.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {set.content.length} kartic
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(set)}
                  disabled={sharingId === set.id}
                  className="hover:bg-primary hover:text-primary-foreground"
                >
                  {sharingId === set.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Share2 className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoad(set)}
                  className="hover:bg-primary hover:text-primary-foreground"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Naloži
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
