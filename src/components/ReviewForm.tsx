import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReviewFormProps {
  targetProfileId: string;
  onReviewSubmitted: () => void;
}

export const ReviewForm = ({ targetProfileId, onReviewSubmitted }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingReview();
  }, [user, targetProfileId]);

  const checkExistingReview = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profile_reviews")
        .select("*")
        .eq("reviewer_id", user.id)
        .eq("target_profile_id", targetProfileId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setExistingReview(data);
        setRating(data.rating);
        setComment(data.comment || "");
      }
    } catch (error) {
      console.error("Error checking existing review:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Prijaviti se morate, da lahko ocenite uporabnika.");
      return;
    }

    if (rating === 0) {
      toast.error("Prosimo izberite oceno (1-5 zvezdic).");
      return;
    }

    if (user.id === targetProfileId) {
      toast.error("Ne morete oceniti sebe.");
      return;
    }

    setSubmitting(true);
    try {
      const reviewData = {
        reviewer_id: user.id,
        target_profile_id: targetProfileId,
        rating,
        comment: comment.trim() || null,
      };

      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("profile_reviews")
          .update({
            rating,
            comment: comment.trim() || null,
          })
          .eq("id", existingReview.id);

        if (error) throw error;

        toast.success("Ocena uspešno posodobljena!");
      } else {
        // Insert new review
        const { error } = await supabase
          .from("profile_reviews")
          .insert(reviewData);

        if (error) throw error;

        toast.success("Ocena uspešno oddana!");
      }

      // Reset form and notify parent
      setRating(0);
      setComment("");
      onReviewSubmitted();
      checkExistingReview();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      
      if (error.code === "23505") {
        toast.error("Tega uporabnika ste že ocenili.");
      } else if (error.code === "23514") {
        toast.error("Ne morete oceniti sebe.");
      } else {
        toast.error("Pri oddaji ocene je prišlo do napake.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
        {existingReview ? "Posodobi svojo oceno" : "Oceni uporabnika"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Ocena *
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Mnenje (neobvezno)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Napiši kratko mnenje o sodelovanju…"
            className="min-h-[100px] rounded-xl border-2"
            maxLength={1000}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {comment.length}/1000 znakov
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="hero"
          className="w-full"
          disabled={submitting || rating === 0}
        >
          {submitting ? "Oddajam..." : existingReview ? "Posodobi oceno" : "Oddaj oceno"}
        </Button>

        {existingReview && (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Svojo oceno lahko posodobiš, vendar je ne moreš izbrisati.
          </p>
        )}
      </form>
    </div>
  );
};
