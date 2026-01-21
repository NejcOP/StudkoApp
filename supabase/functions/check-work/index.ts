import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { problem, solution } = await req.json();
    if (!problem || !solution) {
      throw new Error("Problem and solution are required");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a study assistant that checks student work. Evaluate the solution, explain if it's correct or wrong, provide the correct solution if wrong, and suggest a practice exercise. Return ONLY valid JSON."
          },
          {
            role: "user",
            content: `Problem:\n${problem}\n\nStudent's solution:\n${solution}\n\nCheck if the solution is correct.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "check_solution",
              description: "Check a student's solution",
              parameters: {
                type: "object",
                properties: {
                  is_correct: { type: "boolean" },
                  feedback: { type: "string", description: "Brief feedback on the solution" },
                  correct_solution: { type: "string", description: "The correct step-by-step solution" },
                  explanation: { type: "string", description: "Explanation of why the answer is correct or wrong" },
                  practice_exercise: { type: "string", description: "A similar exercise for practice" }
                },
                required: ["is_correct", "feedback", "correct_solution", "explanation", "practice_exercise"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "check_solution" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let result;
    
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      result = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
    } else {
      throw new Error("Invalid AI response format");
    }

    return new Response(JSON.stringify(result), {
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
