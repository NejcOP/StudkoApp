import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'booking_request' | 'booking_confirmed' | 'booking_rejected' | 'booking_cancelled' | 'booking_rescheduled' | 'booking_reminder';
  recipientUserId: string;
  senderName: string;
  bookingDate: string;
  bookingTime: string;
  bookingId?: string;
  message?: string;
}

const getEmailContent = (data: NotificationRequest) => {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f8fafc;
    padding: 40px 20px;
  `;

  const cardStyles = `
    background: white;
    border-radius: 12px;
    padding: 32px;
    max-width: 500px;
    margin: 0 auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;

  switch (data.type) {
    case 'booking_request':
      return {
        subject: `Nova rezervacija od ${data.senderName}`,
        html: `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h1 style="color: #1e293b; margin-bottom: 24px;">🔔 Nova rezervacija</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${data.senderName}</strong> želi rezervirati termin pri tebi.
              </p>
              <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #334155;">
                  📅 <strong>Datum:</strong> ${data.bookingDate}<br>
                  🕐 <strong>Čas:</strong> ${data.bookingTime}
                </p>
              </div>
              ${data.message ? `<p style="color: #64748b; font-style: italic;">"${data.message}"</p>` : ''}
              <p style="color: #475569; margin-top: 24px;">
                Prosim potrdi ali zavrni rezervacijo v aplikaciji.
              </p>
            </div>
          </div>
        `
      };

    case 'booking_confirmed':
      return {
        subject: `Rezervacija potrjena - ${data.senderName}`,
        html: `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h1 style="color: #16a34a; margin-bottom: 24px;">✅ Rezervacija potrjena!</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${data.senderName}</strong> je potrdil/a tvojo rezervacijo.
              </p>
              <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #166534;">
                  📅 <strong>Datum:</strong> ${data.bookingDate}<br>
                  🕐 <strong>Čas:</strong> ${data.bookingTime}
                </p>
              </div>
              <p style="color: #475569;">
                Vidimo se! 🎉
              </p>
            </div>
          </div>
        `
      };

    case 'booking_rejected':
      return {
        subject: `Rezervacija zavrnjena - ${data.senderName}`,
        html: `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h1 style="color: #dc2626; margin-bottom: 24px;">❌ Rezervacija zavrnjena</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Žal je <strong>${data.senderName}</strong> zavrnil/a tvojo rezervacijo za:
              </p>
              <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b;">
                  📅 <strong>Datum:</strong> ${data.bookingDate}<br>
                  🕐 <strong>Čas:</strong> ${data.bookingTime}
                </p>
              </div>
              <p style="color: #475569;">
                Prosimo, poiščite drug termin ali drugega inštruktorja.
              </p>
            </div>
          </div>
        `
      };

    case 'booking_cancelled':
      return {
        subject: `Rezervacija preklicana - ${data.senderName}`,
        html: `
          <div style="${baseStyles}">
            <div style="${cardStyles}">
              <h1 style="color: #f59e0b; margin-bottom: 24px;">⚠️ Rezervacija preklicana</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${data.senderName}</strong> je preklical/a rezervacijo:
              </p>
              <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  📅 <strong>Datum:</strong> ${data.bookingDate}<br>
                  🕐 <strong>Čas:</strong> ${data.bookingTime}
                </p>
              </div>
            </div>
          </div>
        `
      };

    default:
      return { subject: 'Obvestilo', html: '<p>Imate novo obvestilo.</p>' };
  }
};

const getNotificationContent = (data: NotificationRequest) => {
  switch (data.type) {
    case 'booking_request':
      return {
        title: 'Nova rezervacija',
        message: `${data.senderName} želi rezervirati termin za ${data.bookingDate} ob ${data.bookingTime}`
      };
    case 'booking_confirmed':
      return {
        title: 'Rezervacija potrjena!',
        message: `${data.senderName} je potrdil/a tvojo rezervacijo za ${data.bookingDate} ob ${data.bookingTime}`
      };
    case 'booking_rejected':
      return {
        title: 'Rezervacija zavrnjena',
        message: `${data.senderName} je zavrnil/a tvojo rezervacijo za ${data.bookingDate}`
      };
    case 'booking_cancelled':
      return {
        title: 'Rezervacija preklicana',
        message: `${data.senderName} je preklical/a rezervacijo za ${data.bookingDate}`
      };
    case 'booking_rescheduled':
      return {
        title: 'Sprememba termina',
        message: `${data.senderName} je prestavil/a termin. Nov čas: ${data.bookingDate} ob ${data.bookingTime}`
      };
    case 'booking_reminder':
      return {
        title: 'Opomnik: Rezervacija kmalu!',
        message: `Rezervacija pri ${data.senderName} je čez eno uro (${data.bookingDate} ob ${data.bookingTime})`
      };
    default:
      return { title: 'Obvestilo', message: 'Imate novo obvestilo' };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data: NotificationRequest = await req.json();
    console.log("Notification request:", data);

    // Get recipient's email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.recipientUserId);
    
    if (userError) {
      console.error("Error fetching user:", userError);
      throw new Error("Could not fetch user");
    }

    const recipientEmail = userData.user?.email;

    // Create in-app notification
    const notificationContent = getNotificationContent(data);
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: data.recipientUserId,
        type: data.type,
        title: notificationContent.title,
        message: notificationContent.message,
        data: { 
          booking_id: data.bookingId,
          sender_name: data.senderName 
        }
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    // Send email if we have an address
    if (recipientEmail && RESEND_API_KEY) {
      const emailContent = getEmailContent(data);
      
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Študko <onboarding@resend.dev>",
            to: [recipientEmail],
            subject: emailContent.subject,
            html: emailContent.html,
          })
        });

        const result = await emailResponse.json();
        console.log("Email sent:", result);
      } catch (emailError) {
        console.error("Email send error:", emailError);
        // Don't fail the whole request if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-booking-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
