import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get current date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Checking for trials expiring today:', today.toISOString());

    // Find users whose trial expires today
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, trial_ends_at')
      .eq('subscription_status', 'trialing')
      .gte('trial_ends_at', today.toISOString())
      .lt('trial_ends_at', tomorrow.toISOString());

    if (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }

    console.log(`Found ${profiles?.length || 0} users with trials expiring today`);

    if (profiles && profiles.length > 0) {
      // Create notifications for each user
      const notifications = profiles.map(profile => ({
        user_id: profile.id,
        type: 'trial_expiring_soon',
        title: 'Tvoj PRO preizkus se danes izteče! ⏰',
        message: 'Tvoj 7-dnevni brezplačni preizkus Študko PRO se konča danes. Če želiš nadaljevati z vsemi PRO funkcijami, bo tvoja naročnina avtomatsko aktivirana.',
        data: {
          trial_ends_at: profile.trial_ends_at,
          action: 'manage_subscription'
        }
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
        throw notifError;
      }

      console.log(`✅ Created ${notifications.length} trial expiry notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        usersNotified: profiles?.length || 0,
        message: `Notified ${profiles?.length || 0} users about trial expiry`
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-trial-expiry:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
