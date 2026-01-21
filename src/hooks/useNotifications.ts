import { supabase } from "@/integrations/supabase/client";

interface SendNotificationParams {
  type: 'booking_request' | 'booking_confirmed' | 'booking_rejected' | 'booking_cancelled' | 'booking_rescheduled' | 'booking_reminder';
  recipientUserId: string;
  senderName: string;
  bookingDate: string;
  bookingTime: string;
  bookingId?: string;
  message?: string;
}

export const sendBookingNotification = async (params: SendNotificationParams): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('send-booking-notification', {
      body: params
    });

    if (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to send booking notification:', error);
    // Don't throw - notifications are not critical
  }
};
