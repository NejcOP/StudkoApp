import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('[AI] Function started');
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      console.error('[AI] Missing API key');
      throw new Error('OpenAI API ključ manjka! Dodaj OPENAI_API_KEY v Supabase Secrets.');
    }
    console.log('[AI] OpenAI API key found');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[AI] Auth error:', userError);
      throw new Error("Unauthorized");
    }
    console.log('[AI] User authenticated:', user.id);

    const { tutorId, bookings } = await req.json();
    console.log('[AI] tutorId:', tutorId, 'bookings count:', bookings?.length);

    if (!tutorId) {
      throw new Error('tutorId is required');
    }

    // Ensure bookings is an array
    const bookingsArray = Array.isArray(bookings) ? bookings : [];
    console.log('[AI] Bookings array length:', bookingsArray.length);

    // Fetch tutor data
    const { data: tutorData, error: tutorError } = await supabaseClient
      .from('tutors')
      .select('*')
      .eq('id', tutorId)
      .single();

    if (tutorError) {
      console.error('[AI] Tutor fetch error:', tutorError);
      throw tutorError;
    }
    console.log('[AI] Tutor data fetched');

    // Calculate statistics - safely handle bookings array
    const completedBookings = bookingsArray.filter((b: any) => b.status === 'completed');
    const totalHours = completedBookings.length;
    const netEarnings = completedBookings.reduce((sum: number, b: any) => sum + (b.price_eur * 0.80), 0);
    
    // Fetch reviews for average rating
    const { data: reviews } = await supabaseClient
      .from('profile_reviews')
      .select('rating')
      .eq('target_profile_id', user.id)
      .eq('is_hidden', false);
    
    const avgRating = reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 'Ni ocen';

    const subjects = Array.isArray(tutorData?.subjects) ? tutorData.subjects.join(', ') : (tutorData?.subjects || 'Ni podatkov');
    const hourlyRate = tutorData?.price_per_hour || 20;

    // Create AI prompt
    const prompt = `Ti si strokovnjak za optimizacijo profilov inštruktorjev in svetovanje za povečanje prodaje inštrukcijskih storitev.

Analiziraj profil inštruktorja in mu daj KONKRETNE IN UPORABNE nasvete:

**PODATKI O INŠTRUKTORJU:**
- Ime: ${tutorData?.full_name || 'Neznano'}
- Predmeti: ${subjects}
- Cena: ${hourlyRate}€/uro
- Način poučevanja: ${tutorData?.mode || 'Ni podatkov'}
- Izobrazbeni nivo: ${tutorData?.education_level || 'Ni podatkov'}
- Biografija: ${tutorData?.bio || 'Ni dodane biografije'}
- Izkušnje: ${tutorData?.experience || 'Ni dodanih izkušenj'}

**STATISTIKA:**
- Opravljene ure: ${totalHours}
- Povprečna ocena: ${avgRating}
- Skupni zaslužek: ${netEarnings.toFixed(2)}€

**NAVODILA ZA ANALIZO:**
1. Analiziraj MOČNE točke profila (kaj dela dobro)
2. Identificiraj ŠIBKE točke in priložnosti za izboljšave
3. Daj 3-5 KONKRETNIH nasvetov za izboljšanje profila
4. Predlagaj cenovno strategijo (ali je cena primerna za trg)
5. Če je premalo podatkov, svetuj kaj naj doda za boljšo predstavitev
6. Poudari kaj lahko naredi DANES za več rezervacij

Odgovor naj bo STRUKTURIRAN, JASEN in MOTIVIRAJOČ. Uporabi emojije za boljšo berljivost.
Dolžina: 300-400 besed. Piši v slovenščini.`;

    // Call OpenAI API
    console.log('[AI] Calling OpenAI API...');
    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Ti si strokovni svetovalec za inštruktorje. Tvoj cilj je pomagati inštruktorjem izboljšati njihove profile in povečati število rezervacij. Vedno podaj konkretne, izvedljive nasvete v slovenščini."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI] OpenAI API error:', aiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }
    console.log('[AI] OpenAI API response received');

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Napaka pri generiranju analize";

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-instructor-profile:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error details:", errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
