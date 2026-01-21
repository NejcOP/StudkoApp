import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    full_name: string;
  };
}

interface ProfileReviewsProps {
  targetProfileId: string;
}

export const ProfileReviews = ({ targetProfileId }: ProfileReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    loadReviews();
  }, [targetProfileId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profile_reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviewer_id (
            full_name
          )
        `)
        .eq("target_profile_id", targetProfileId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      // Calculate average rating
      if (data && data.length > 0) {
        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(sum / data.length);
        setReviewCount(data.length);
      } else {
        setAverageRating(0);
        setReviewCount(0);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: "sm" | "lg" = "sm") => {
    const starSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Average Rating Summary */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
          Ocene in mnenja
        </h3>
        
        {reviewCount > 0 ? (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-primary mb-1">
                {averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(averageRating), "lg")}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              <p className="text-lg font-semibold">
                {reviewCount} {reviewCount === 1 ? "ocena" : reviewCount === 2 ? "oceni" : "ocen"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">
            Še ni ocen.
          </p>
        )}
      </div>

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white/90 dark:bg-slate-800/90 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {review.reviewer.full_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(review.created_at), "d. MMMM yyyy", { locale: undefined })}
                  </p>
                </div>
                {renderStars(review.rating)}
              </div>
              {review.comment && (
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
