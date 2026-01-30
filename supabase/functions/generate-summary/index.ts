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
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    
    console.log("GOOGLE_API_KEY exists:", !!GOOGLE_API_KEY);
    
    if (!GOOGLE_API_KEY) {
      console.error("Missing API Key");
      throw new Error('API ključ manjka! Dodaj GOOGLE_AI_API_KEY v Supabase Secrets.');
    }
    
    console.log("Using API: Direct Google Gemini");

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

    console.log("Using Direct Google Gemini API");
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a study assistant. IMPORTANT: Detect the language of the input text and create the summary in the SAME language.

If the text is in SLOVENIAN, generate all summaries in SLOVENIAN.
If the text is in ENGLISH, generate all summaries in ENGLISH.

Return a JSON object with this structure:
{
  "short_summary": "A brief 2-3 sentence summary IN THE SAME LANGUAGE as input",
  "long_summary": "A detailed paragraph summary IN THE SAME LANGUAGE as input",
  "bullet_points": ["Key point 1 IN THE SAME LANGUAGE", "Key point 2 IN THE SAME LANGUAGE", ...],
  "key_definitions": [{"term": "Term", "definition": "Definition IN THE SAME LANGUAGE"}, ...],
  "glossary": [{"term": "Term", "meaning": "Meaning IN THE SAME LANGUAGE"}, ...]
}

Text to summarize:
${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
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
      hasCandidates: !!aiData.candidates,
      candidatesLength: aiData.candidates?.length
    }));
    
    let summary;
    if (aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log("Parsing Gemini text response");
      const responseText = aiData.candidates[0].content.parts[0].text;
      
      // Extract JSON from text (might have markdown)
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '');
      cleanedText = cleanedText.replace(/\n?```\s*$/i, '');
      cleanedText = cleanedText.trim();
      
      // Find JSON object
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }
      
      summary = JSON.parse(cleanedText);
    } else {
      console.error("Invalid Gemini response format:", JSON.stringify(aiData, null, 2));
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
