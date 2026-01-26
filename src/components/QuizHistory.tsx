import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trophy, Trash2, Calendar, Clock, Target, Loader2, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sl } from "date-fns/locale";

interface QuizResult {
  id: string;
  title: string;
  score: number;
  total_questions: number;
  time_taken: number | null;
  created_at: string;
  quiz_data: {
    questions: Array<{
      id: number;
      type: string;
      question: string;
      options?: string[];
      correct_answer: string;
      explanation: string;
    }>;
  };
}

interface QuizHistoryProps {
  onRetakeQuiz?: (questions: Array<{ question: string; options?: string[]; correct_answer: string }>, title: string) => void;
}

export const QuizHistory = ({ onRetakeQuiz }: QuizHistoryProps) => {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadQuizResults = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setResults((data as unknown as QuizResult[]) || []);
    } catch (error) {
      console.error("Error loading quiz results:", error);
      toast.error("Napaka pri nalaganju zgodovine");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadQuizResults();
    }
  }, [user, loadQuizResults]);

  const handleDelete = async (id: string) => {
    if (!confirm("Ali res želiš izbrisati ta rezultat?")) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('quiz_results')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResults(results.filter(result => result.id !== id));
      toast.success("Rezultat izbrisan");
    } catch (error) {
      console.error("Error deleting quiz result:", error);
      toast.error("Napaka pri brisanju");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetake = (result: QuizResult) => {
    if (onRetakeQuiz && result.quiz_data?.questions) {
      onRetakeQuiz(result.quiz_data.questions, result.title);
      toast.success(`Ponavljaš: ${result.title}`);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <p className="text-muted-foreground">Prijavi se za ogled zgodovine kvizov</p>
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

  if (results.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Še ni opravljenih kvizov</h3>
        <p className="text-muted-foreground text-sm">
          Tvoji kviz rezultati se bodo prikazali tukaj
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground">Zgodovina kvizov ({results.length})</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => {
          const percentage = Math.round((result.score / result.total_questions) * 100);
          
          return (
            <div
              key={result.id}
              className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-all group relative"
            >
              {/* Delete Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(result.id)}
                disabled={deletingId === result.id}
                className="absolute top-2 right-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {deletingId === result.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>

              {/* Header */}
              <div className="mb-3">
                <h4 className="font-semibold text-foreground truncate pr-8">
                  {result.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(result.created_at), {
                      addSuffix: true,
                      locale: sl,
                    })}
                  </span>
                </div>
              </div>

              {/* Score Badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 ${
                percentage >= 80 ? "bg-green-500/20 text-green-500" :
                percentage >= 60 ? "bg-blue-500/20 text-blue-500" :
                "bg-red-500/20 text-red-500"
              }`}>
                <Target className="w-4 h-4" />
                <span className="font-bold text-lg">{percentage}%</span>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-sm mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pravilno:</span>
                  <span className="font-semibold text-foreground">
                    {result.score}/{result.total_questions}
                  </span>
                </div>
                {result.time_taken && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Čas:</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {formatTime(result.time_taken)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Retake Button */}
              {onRetakeQuiz && result.quiz_data?.questions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetake(result)}
                  className="w-full hover:bg-primary hover:text-primary-foreground"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reši ponovno
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
