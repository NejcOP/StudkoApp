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
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    
    if (!GOOGLE_API_KEY) {
      throw new Error('API ključ manjka! Dodaj GOOGLE_AI_API_KEY v Supabase Secrets.');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { tutorId, bookings } = await req.json();

    // Fetch tutor data
    const { data: tutorData, error: tutorError } = await supabaseClient
      .from('tutors')
      .select('*')
      .eq('id', tutorId)
      .single();

    if (tutorError) throw tutorError;

    // Calculate statistics
    const completedBookings = bookings.filter((b: any) => b.status === 'completed');
    const totalHours = completedBookings.length;
    const netEarnings = completedBookings.reduce((sum: number, b: any) => sum + (b.price_eur * 0.80), 0);
    
    // Fetch reviews for average rating
    const { data: reviews } = await supabaseClient
      .from('profile_reviews')
      .select('rating')
      .eq('reviewed_user_id', user.id);
    
    const avgRating = reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 'Ni ocen';

    const subjects = Array.isArray(tutorData?.subjects) ? tutorData.subjects.join(', ') : (tutorData?.subjects || 'Ni podatkov');
    const hourlyRate = tutorData?.price_per_hour || 20;

    // Create AI prompt
    const prompt = `Analiziraj profil inštruktorja in podaj konkretne nasvete za izboljšave.

**Podatki:**
- Opravljene ure: ${totalHours}
- Povprečna ocena: ${avgRating}
- Predmeti: ${subjects}
- Cena na uro: ${hourlyRate}€
- Skupni zaslužek: ${netEarnings.toFixed(2)}€

Ustvari **kratko in jedrnato analizo** v slovenščini z naslednjimi elementi:
1. **Močne točke** (2-3 točke)
2. **Priložnosti za rast** (3-4 konkretne točke)
3. **Napovedana rast** (ocena potencialnega dodatnega zaslužka)

Odgovor mora biti formatiran z Markdown (**bold**, bullet points). Bodi kratek, konkreten in uporaben.`;

    // Call AI API
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Napaka pri generiranju analize";

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
