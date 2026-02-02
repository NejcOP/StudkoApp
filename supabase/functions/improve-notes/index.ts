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
    const { noteId, content } = await req.json();
    
    if (!content || typeof content !== 'string') {
      throw new Error('Content is required');
    }
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Call OpenAI to improve notes
    const systemPrompt = `You are an expert at improving study notes in Slovenian. Rewrite notes with: 1) Clean formatting with headers and sections 2) Fixed grammar and spelling 3) Bullet points for key concepts 4) A clear summary at the top 5) Study-friendly structure. IMPORTANT: Respond in Slovenian language. Keep all important content but make it clearer and more organized.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please improve these study notes:\n\n${content}` }
        ],
        temperature: 0.7,
        max_tokens: 2048
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI processing failed');
    }

    const data = await response.json();
    const improvedContent = data.choices[0].message.content;

    // If noteId is provided, update the note (backward compatibility)
    if (noteId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseClient
        .from('notes')
        .update({ improved_file_url: improvedContent })
        .eq('id', noteId);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, improved: improvedContent }),
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