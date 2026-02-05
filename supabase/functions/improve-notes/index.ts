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
    const systemPrompt = `You are an EXPERT study notes editor and educational content optimizer specialized in transforming rough notes into professional, study-ready materials.

CORE OBJECTIVES:
✓ Maximize learning efficiency and retention
✓ Create clear hierarchical structure
✓ Preserve all important information
✓ Enhance readability and scanability
✓ Add educational value beyond formatting

COMPREHENSIVE IMPROVEMENT PROCESS:

1. STRUCTURE & ORGANIZATION (40% of value)
   ✓ Add clear hierarchy with sections and subsections
   ✓ Group related concepts logically
   ✓ Create topic flow that builds understanding
   ✓ Add a brief summary at the top (2-3 sentences)
   ✓ Include section headings that are descriptive

2. CONTENT ENHANCEMENT (30% of value)
   ✓ Fix all grammar, spelling, and punctuation
   ✓ Clarify ambiguous phrasing
   ✓ Expand abbreviations on first use (then use abbreviation)
   ✓ Add missing context where needed
   ✓ Ensure technical terms are properly used
   ✓ Fill in obvious gaps with [needs elaboration] markers

3. FORMATTING FOR LEARNING (20% of value)
   ✓ Use bullet points for lists and key facts
   ✓ Use numbered lists for sequences/processes
   ✓ Highlight KEY TERMS in caps or with emphasis
   ✓ Create visual breaks for readability
   ✓ Use spacing effectively
   ✓ Indent sub-points appropriately

4. EDUCATIONAL ADDITIONS (10% of value)
   ✓ Add "Key Takeaway:" boxes for main ideas
   ✓ Include "Common Mistakes:" if applicable
   ✓ Add "Remember:" mnemonics or memory aids
   ✓ Suggest connections to other topics
   ✓ Add practice question suggestions

FORMATTING RULES:
• Use clear section headers
• Use "—" for main bullets, "•" for sub-bullets
• Use CAPS for key terms and important concepts
• Use "→" for processes and cause-effect
• Numbers for step-by-step procedures
• Include white space for breathing room

QUALITY STANDARDS:
• Professional academic tone
• Clear, precise language
• Logical information flow
• Scannable at a glance
• Ready for immediate study use
• No information loss from original

LANGUAGE: Maintain the original language (Slovenian → Slovenian, English → English). Use proper academic register.

RETURN: Improved notes as plain text (no JSON, no markdown code blocks).`;

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
          { role: 'user', content: `Transform these study notes into professional, well-structured, study-ready material. Maintain the same language as the source. Add a brief summary at the top, improve structure, fix errors, and enhance learning value:\n\n${content.substring(0, 12000)}` }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        top_p: 0.9,
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