import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Extract JSON from text using RegEx - finds content between first { and last }
function extractJSON(text: string): string {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error('No valid JSON structure found in response');
  }
  
  return text.substring(firstBrace, lastBrace + 1);
}

// Safe JSON parsing - removes markdown and extracts pure JSON
function safeJsonParse(text: string): any {
  let cleanedText = text.trim();
  
  // Remove markdown code blocks if present
  cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '');
  cleanedText = cleanedText.replace(/\n?```\s*$/i, '');
  cleanedText = cleanedText.trim();
  
  // Extract JSON between first { and last }
  cleanedText = extractJSON(cleanedText);
  
  return JSON.parse(cleanedText);
}

serve(async (req) => {
  console.log("=== FUNCTION INVOKED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log("=== START generate-quiz function ===");
    
    // Validate API Keys
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    console.log("OPENAI_API_KEY exists:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error("Missing API Key");
      throw new Error('API ključ manjka! Dodaj OPENAI_API_KEY v Supabase Secrets.');
    }
    
    console.log("Using API: OpenAI GPT-4o-mini");

    // Parse request body
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

    console.log("Generating quiz for text length:", text.length);
    console.log("Text preview:", text.substring(0, 100));

    // Retry logic - try up to 2 times
    let quizData = null;
    let lastError = null;
    const maxAttempts = 2;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxAttempts}: Calling OpenAI API...`);
        
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
                content: `You are an expert quiz creator specializing in educational assessments that test true understanding, not just memorization.

QUIZ DESIGN PRINCIPLES:
✓ Test understanding at multiple cognitive levels (Bloom's Taxonomy)
✓ Include questions that require application and analysis
✓ Avoid trick questions - clarity is key
✓ Mix difficulty levels progressively
✓ Ensure distractors (wrong answers) are plausible
✓ Include explanations that teach, not just confirm

QUESTION TYPES & DISTRIBUTION (12 questions total):
- 8 multiple_choice (with 4 options each)
- 4 true_false

MULTIPLE CHOICE GUIDELINES:
1. STEM (question): Clear, complete, tests ONE concept
2. OPTIONS: Label A), B), C), D)
   - One clearly correct answer
   - Three plausible distractors (common misconceptions)
   - Similar length and structure
   - No "all of the above" or "none of the above"
3. DIFFICULTY MIX:
   - 3 basic (remember/understand)
   - 3 intermediate (apply/analyze)
   - 2 advanced (evaluate/create)

TRUE/FALSE GUIDELINES:
1. Clear, unambiguous statements
2. Avoid absolute words (always, never) unless factually accurate
3. Test important concepts, not trivial details
4. Balance between true and false (mix it up)

EXPLANATION REQUIREMENTS:
- WHY the correct answer is right
- WHY common wrong answers are incorrect
- Additional insight or connection to broader concept
- 2-3 sentences in Slovenian

SLOVENIAN LANGUAGE:
- Use proper academic Slovenian
- Clear, professional terminology
- Natural phrasing

RETURN FORMAT:
{"questions": [{"id": 1, "type": "multiple_choice", "question": "Question text?", "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"], "correct_answer": "A) Option 1", "explanation": "Explanation in Slovenian"}]}

Return ONLY valid JSON, no markdown blocks or extra text.`
              },
              {
                role: "user",
                content: `Generate 12 quiz questions (8 multiple choice, 4 true/false) that progressively test understanding of this material. 

Mix difficulty levels:
- Basic: Test fundamental concepts and definitions
- Intermediate: Test application and connections
- Advanced: Test analysis and synthesis

Ensure multiple choice distractors reflect common student misconceptions.

Material to create quiz from:

${text.substring(0, 10000)}`
              }
            ],
            temperature: 0.85, // Slightly higher for creative distractors
            max_tokens: 3500, // More tokens for detailed explanations
            response_format: { type: "json_object" },
            top_p: 0.92,
            frequency_penalty: 0.3,
          }),
        });

        console.log("OpenAI API response status:", aiResponse.status);
        console.log("OpenAI API response ok:", aiResponse.ok);

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`OpenAI API error: ${aiResponse.status}`, errorText);
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Preveč zahtev. Poskusi čez nekaj sekund." }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          throw new Error(`OpenAI API napaka: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        console.log("=== AI Response ===");
        console.log("Full OpenAI Response:", JSON.stringify(aiData, null, 2));

        // Extract questions from OpenAI response
        let content;
        if (aiData.choices?.[0]?.message?.content) {
          content = aiData.choices[0].message.content;
        } else {
          console.error("Missing content. Response structure:", JSON.stringify(aiData, null, 2));
          throw new Error("Missing choices[0].message.content in OpenAI response");
        }
        
        console.log("=== Extracted Content ===");
        console.log("Full content:", content);
        console.log("Content length:", content.length);
        
        // Use safe JSON parsing to handle markdown blocks and extract pure JSON
        console.log("Attempting to parse JSON...");
        quizData = safeJsonParse(content);
        console.log("Successfully parsed quiz data with", quizData.questions?.length || 0, "questions");
        
        // Validate questions array
        if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
          throw new Error("Invalid questions array in response");
        }
        
        // Success - break out of retry loop
        console.log(`Attempt ${attempt} succeeded!`);
        break;
      } catch (attemptError) {
        lastError = attemptError;
        console.error(`Attempt ${attempt} failed:`, attemptError);
        
        if (attempt < maxAttempts) {
          console.log(`Retrying... (${attempt + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }
    
    // Check if we got valid quiz data after all attempts
    if (!quizData || !quizData.questions) {
      console.error("Failed after all retry attempts. Last error:", lastError);
      return new Response(
        JSON.stringify({ 
          error: "AI se je malce zmedel, prosim poskusi še enkrat.",
          details: lastError instanceof Error ? lastError.message : String(lastError)
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } } // Return 200 for friendly error
      );
    }

    console.log(`Successfully generated ${quizData.questions.length} questions`);

    return new Response(JSON.stringify({ questions: quizData.questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    console.error("=== CRITICAL ERROR ===");
    console.error("Error name:", errorName);
    console.error("Error message:", errorMessage);
    console.error("Error stack:", errorStack);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    console.error("Error type:", typeof error);
    
    // Return detailed error for debugging
    return new Response(
      JSON.stringify({ 
        error: "Napaka pri generiranju kviza",
        details: errorMessage,
        errorType: errorName,
        timestamp: new Date().toISOString(),
        // Include stack trace in development
        stack: errorStack?.split('\n').slice(0, 5).join('\n')
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
