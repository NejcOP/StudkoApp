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
    
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    // Call Google AI to generate flashcards
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert at creating study flashcards. Generate 10-50 flashcards from the given notes. Each flashcard should have a clear question and a concise answer. Return ONLY a JSON array in this exact format: [{"question": "...", "answer": "..."}]. No additional text or explanation.

Create flashcards from these notes:

${content}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI processing failed');
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid AI response format');
    }
    
    let flashcardsText = data.candidates[0].content.parts[0].text;
    
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