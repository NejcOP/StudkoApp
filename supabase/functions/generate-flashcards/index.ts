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
    const { noteId, content, userId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call AI to generate flashcards
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating study flashcards. Generate 10-50 flashcards from the given notes. Each flashcard should have a clear question and a concise answer. Return ONLY a JSON array in this exact format: [{"question": "...", "answer": "..."}]. No additional text or explanation.'
          },
          {
            role: 'user',
            content: `Create flashcards from these notes:\n\n${content}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI processing failed');
    }

    const data = await response.json();
    let flashcardsText = data.choices[0].message.content;
    
    // Clean up the response - remove markdown code blocks if present
    flashcardsText = flashcardsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const flashcards = JSON.parse(flashcardsText);

    // Store flashcards
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const flashcardRecords = flashcards.map((fc: { question: string; answer: string }) => ({
      user_id: userId,
      note_id: noteId,
      question: fc.question,
      answer: fc.answer,
    }));

    const { data: insertedData, error: insertError } = await supabaseClient
      .from('flashcards')
      .insert(flashcardRecords)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, flashcards: insertedData }),
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