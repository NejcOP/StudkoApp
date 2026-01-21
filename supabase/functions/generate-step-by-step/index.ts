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

    const { text } = await req.json();
    if (!text) {
      throw new Error("Text is required");
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
            content: "You are a study assistant that explains concepts step by step. Create numbered steps with clear explanations, practical examples, and common mistakes to avoid. Return ONLY valid JSON."
          },
          {
            role: "user",
            content: `Explain this step by step:\n\n${text}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_explanation",
              description: "Create a step-by-step explanation",
              parameters: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        number: { type: "number" },
                        title: { type: "string" },
                        explanation: { type: "string" }
                      },
                      required: ["number", "title", "explanation"]
                    }
                  },
                  examples: { type: "array", items: { type: "string" } },
                  common_mistakes: { type: "array", items: { type: "string" } }
                },
                required: ["steps", "examples", "common_mistakes"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_explanation" } }
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
