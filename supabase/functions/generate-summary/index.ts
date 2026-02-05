import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("=== FUNCTION INVOKED ===");
  console.log("Request method:", req.method);
  
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log("=== START generate-summary function ===");
    
    // Validate API Keys
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    console.log("OPENAI_API_KEY exists:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error("Missing API Key");
      throw new Error('API ključ manjka! Dodaj OPENAI_API_KEY v Supabase Secrets.');
    }
    
    console.log("Using API: OpenAI GPT-4o-mini");

    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully");
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text } = requestBody;
    if (!text) {
      console.error("Missing text field in request");
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating summary for text length:", text.length);
    console.log("Text preview:", text.substring(0, 100));

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert study assistant specialized in creating HIGH-QUALITY, MULTI-LEVEL summaries that enhance learning and retention.

SUMMARY CREATION PRINCIPLES:
✓ Clarity over brevity - completeness is key
✓ Hierarchical structure - main ideas → supporting details
✓ Active voice and precise language
✓ Preserve critical information and context
✓ Maintain source language (Slovenian → Slovenian, English → English)

THREE-TIER SUMMARY APPROACH:

1. SHORT SUMMARY (2-3 sentences)
   - Core message/thesis in one sentence
   - 1-2 key supporting points
   - What a busy student needs to know RIGHT NOW
   - Length: 40-60 words

2. MEDIUM SUMMARY (1 paragraph, 100-150 words)
   - Main idea expanded with context
   - 3-5 key points with brief explanation
   - Important connections between concepts
   - Enough to understand the topic for discussion
   - Balance between detail and readability

3. DETAILED SUMMARY (2-3 paragraphs, 250-350 words)
   - Comprehensive overview with structure
   - All major points with explanations
   - Key examples, data, or evidence
   - Important terminology defined
   - Logical flow that aids understanding
   - Includes context and implications
   - Suitable for study guide or exam prep

KEY POINTS (bullet list, 5-8 items):
   - Critical concepts or facts
   - Essential definitions
   - Important processes or relationships
   - Key people, dates, events (if applicable)
   - Each point: one clear, complete idea
   - Use parallel structure

LANGUAGE REQUIREMENTS:
• MATCH INPUT LANGUAGE - If source is Slovenian, ALL summaries in Slovenian
• If English source, ALL summaries in English  
• Use appropriate academic register
• Clear, precise terminology
• Natural phrasing for target language

SPECIAL ADAPTATIONS:
• Technical content: Define jargon in first use
• Historical content: Include chronology and causation
• Scientific content: Emphasize processes and relationships
• Literary content: Theme, character, and plot structure

RETURN VALID JSON:
{
  "short_summary": "Brief 2-3 sentence summary",
  "long_summary": "Detailed paragraph with full context and main points",
  "detailed_summary": "Comprehensive 2-3 paragraph summary with examples and implications",
  "key_points": ["Point 1", "Point 2", ...]
}

NO markdown formatting, NO code blocks, ONLY JSON.`
          },
          {
            role: "user",
            content: `Create multi-level summaries that preserve the language of the source text. If text is in Slovenian, generate ALL summaries in Slovenian. If in English, generate in English.

Analyze this content and create three tiers of summaries plus key points:

${text.substring(0, 12000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        top_p: 0.9,
      }),
    });
  "bullet_points": ["Key point 1 IN THE SAME LANGUAGE", "Key point 2 IN THE SAME LANGUAGE", ...],
  "key_definitions": [{"term": "Term", "definition": "Definition IN THE SAME LANGUAGE"}, ...],
  "glossary": [{"term": "Term", "meaning": "Meaning IN THE SAME LANGUAGE"}, ...]
}

Text to summarize:
${text}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      }),
    });

    console.log("AI Response status:", aiResponse.status);
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error response:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");
    
    console.log("Response structure:", JSON.stringify({
      hasChoices: !!aiData.choices,
      choicesLength: aiData.choices?.length
    }));
    
    let summary;
    if (aiData.choices?.[0]?.message?.content) {
      console.log("Parsing OpenAI response");
      const responseText = aiData.choices[0].message.content;
      
      // Parse JSON (OpenAI with json_object mode should return valid JSON)
      summary = JSON.parse(responseText);
    } else {
      console.error("Invalid OpenAI response format:", JSON.stringify(aiData, null, 2));
      throw new Error("Invalid AI response format");
    }

    console.log("Summary generated successfully");
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
