import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";

interface CompletedBooking {
  id: string;
  tutor_id: string;
  tutors: {
    user_id: string;
    full_name: string;
  };
}

export const RatingPrompt = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [booking, setBooking] = useState<CompletedBooking | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    checkForCompletedBookings();

    // Check every minute for newly completed bookings
    const interval = setInterval(checkForCompletedBookings, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const checkForCompletedBookings = async () => {
    if (!user) return;

    try {
      // Find recently completed bookings (within last hour) that haven't been rated
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: completedBookings, error } = await supabase
        .from('tutor_bookings')
        .select(`
          id,
          tutor_id,
          tutors (user_id, full_name)
        `)
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .gte('end_time', oneHourAgo)
        .order('end_time', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (completedBookings && completedBookings.length > 0) {
        const booking = completedBookings[0];
        
        // Check if user has already reviewed this tutor
        const { data: existingReview } = await supabase
          .from('profile_reviews')
          .select('id')
          .eq('reviewer_id', user.id)
          .eq('target_profile_id', booking.tutors.user_id)
          .single();

        // Only show prompt if no review exists
        if (!existingReview) {
          setBooking(booking as any);
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('Error checking completed bookings:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user || !booking || rating === 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profile_reviews')
        .insert({
          reviewer_id: user.id,
          target_profile_id: booking.tutors.user_id,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      toast.success('Hvala za oceno!');
      setOpen(false);
      setRating(0);
      setComment("");
      setBooking(null);
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      if (error.code === '23505') {
        toast.error('Tega tutorja si že ocenil');
        setOpen(false);
      } else {
        toast.error('Napaka pri oddaji ocene');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oceni tutorja</DialogTitle>
          <DialogDescription>
            Kako bi ocenil svojo izkušnjo z {booking.tutors.full_name}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Comment */}
          <div>
            <Textarea
              placeholder="Tvoje mnenje (opcijsko)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Zapri
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="flex-1"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Oddaj oceno"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};