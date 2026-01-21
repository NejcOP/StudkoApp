import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FileText, Trash2, Calendar, Copy, Loader2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sl } from "date-fns/locale";

interface Summary {
  id: string;
  input_text: string;
  short_summary: string;
  long_summary: string;
  bullet_points: string[];
  key_definitions: Array<{ term: string; definition: string }>;
  glossary: Array<{ term: string; meaning: string }>;
  created_at: string;
}

interface SummaryHistoryProps {
  onViewSummary?: (summary: Summary) => void;
}

export const SummaryHistory = ({ onViewSummary }: SummaryHistoryProps) => {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSummaries = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSummaries((data || []) as unknown as Summary[]);
    } catch (error) {
      console.error("Error loading summaries:", error);
      toast.error("Napaka pri nalaganju zgodovine");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSummaries();
    }
  }, [user, loadSummaries]);

  const handleDelete = async (id: string) => {
    if (!confirm("Ali res želiš izbrisati ta povzetek?")) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('summaries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSummaries(summaries.filter(summary => summary.id !== id));
      toast.success("Povzetek izbrisan");
    } catch (error) {
      console.error("Error deleting summary:", error);
      toast.error("Napaka pri brisanju");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (summary: Summary) => {
    try {
      let copyText = "POVZETEK\n\n";
      
      copyText += "📝 KRATKI POVZETEK:\n";
      copyText += summary.short_summary + "\n\n";
      
      copyText += "📚 KLJUČNE TOČKE:\n";
      summary.bullet_points.forEach((point, i) => {
        copyText += `${i + 1}. ${point}\n`;
      });
      copyText += "\n";
      
      if (summary.key_definitions.length > 0) {
        copyText += "🔑 KLJUČNI POJMI:\n";
        summary.key_definitions.forEach(def => {
          copyText += `• ${def.term}: ${def.definition}\n`;
        });
      }
      
      // Try multiple clipboard methods
      let copied = false;
      
      // Method 1: Modern Clipboard API (secure context only)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(copyText);
          copied = true;
        } catch (clipboardError) {
          console.warn("Clipboard API failed:", clipboardError);
        }
      }
      
      // Method 2: Fallback for older browsers or non-HTTPS
      if (!copied) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = copyText;
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
        } catch (execError) {
          console.warn("execCommand failed:", execError);
        }
      }
      
      if (copied) {
        toast.success("Povzetek kopiran v odložišče!");
      } else {
        toast.error("Kopiranje ni uspelo. Prosim kopiraj ročno.");
      }
    } catch (error) {
      console.error("Error copying summary:", error);
      toast.error("Napaka pri kopiranju povzetka.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-12 text-center">
        <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Še nimaš shranjenih povzetkov
        </h3>
        <p className="text-muted-foreground">
          Ustvari svoje prve povzetke in jih shrani za kasnejšo uporabo!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
        <FileText className="w-6 h-6 text-primary" />
        Zgodovina povzetkov ({summaries.length})
      </h2>

      <div className="grid gap-4">
        {summaries.map((summary) => (
          <div
            key={summary.id}
            className="bg-card rounded-xl border border-border p-5 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(summary.created_at), {
                      addSuffix: true,
                      locale: sl,
                    })}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {summary.input_text}
                </p>

                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-foreground line-clamp-3">
                    {summary.short_summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                    {summary.bullet_points.length} točk
                  </span>
                  <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                    {summary.key_definitions.length} definicij
                  </span>
                  {summary.glossary.length > 0 && (
                    <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">
                      {summary.glossary.length} slovar
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {onViewSummary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewSummary(summary)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Poglej
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(summary)}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Kopiraj
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(summary.id)}
                  disabled={deletingId === summary.id}
                  className="gap-2 text-red-500 hover:text-red-600 hover:border-red-500"
                >
                  {deletingId === summary.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Izbriši
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryHistory;
