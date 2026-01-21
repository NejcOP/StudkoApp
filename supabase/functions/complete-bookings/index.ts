import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find all confirmed bookings where end_time has passed
    const now = new Date().toISOString();
    
    const { data: expiredBookings, error: fetchError } = await supabaseClient
      .from('tutor_bookings')
      .select('*')
      .eq('status', 'confirmed')
      .lt('end_time', now);

    if (fetchError) throw fetchError;

    console.log(`Found ${expiredBookings?.length || 0} bookings to complete`);

    if (expiredBookings && expiredBookings.length > 0) {
      // Update all expired bookings to completed
      const bookingIds = expiredBookings.map(b => b.id);
      
      const { error: updateError } = await supabaseClient
        .from('tutor_bookings')
        .update({ status: 'completed' })
        .in('id', bookingIds);

      if (updateError) throw updateError;

      console.log(`Completed ${bookingIds.length} bookings`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        completedCount: expiredBookings?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});