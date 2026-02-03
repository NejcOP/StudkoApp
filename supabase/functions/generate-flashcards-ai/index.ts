import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[GENERATE-FLASHCARDS] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id });

    const { text, subject, title } = await req.json();
    if (!text || !title) {
      throw new Error("Text and title are required");
    }
    logStep("Request validated", { subject, titleLength: title.length, textLength: text.length });

    // Use OpenAI API
    const systemPrompt = `You are an expert educational flashcard creator. Generate 10-15 high-quality flashcards from study materials.

RULES:
- Generate exactly 10-15 flashcards
- Questions must be clear, specific, and in Slovenian
- Answers must be concise (2-4 sentences) and in Slovenian
- Use Markdown: **bold** for key terms, lists for multiple points
- Adapt to subject: ${subject || "General"}

IMPORTANT: Return ONLY valid JSON in this EXACT format:
{"flashcards": [{"question": "Question text?", "answer": "Answer text with **bold** for key terms."}]}

Do NOT include any text before or after the JSON. Do NOT include markdown code blocks.`;

    const openaiUrl = 'https://api.openai.com/v1/chat/completions';
    
    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Subject: ${subject || "General"}\nTitle: ${title}\n\nCreate flashcards from:\n\n${text}` }
      ],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    };

    logStep("Calling OpenAI API");
    const aiResponse = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      logStep("AI API error", { status: aiResponse.status, error: errorText });
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    logStep("AI response received");

    // Extract flashcards from OpenAI response
    let flashcards;
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      logStep("No content in response", { response: JSON.stringify(aiData) });
      throw new Error("No content in AI response");
    }

    logStep("Content received", { contentPreview: content.substring(0, 200) });

    // Parse JSON from content
    try {
      const parsed = JSON.parse(content);
      flashcards = parsed.flashcards;
      logStep("Flashcards parsed successfully", { count: flashcards?.length });
    } catch (parseError) {
      logStep("Parse error", { error: parseError.message, content: content.substring(0, 500) });
      throw new Error("Failed to parse flashcards from AI response");
    }

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      throw new Error("No flashcards generated");
    }
    logStep("Flashcards extracted", { count: flashcards.length });

    // Return flashcards directly without saving to database
    // Database saving can be implemented later with proper schema
    return new Response(
      JSON.stringify({ 
        flashcards,
        message: `Ustvarjenih ${flashcards.length} kartic!`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { message: errorMessage, stack: errorStack });
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});