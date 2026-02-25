import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  console.log('===========================================');
  console.log('🚀 AI-CHAT FUNCTION INVOKED');
  console.log('===========================================');
  console.log('📍 Method:', req.method);
  console.log('📍 URL:', req.url);
  console.log('📍 Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log('✅ CORS Preflight - Returning 200');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log('🔍 Checking OPENAI_API_KEY...');
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is NOT configured!');
      throw new Error("OPENAI_API_KEY is not configured");
    }
    console.log('✅ OPENAI_API_KEY exists');

    console.log('🔍 Checking Authorization header...');
    const authHeader = req.headers.get("Authorization");
    console.log('📋 Auth Header exists:', !!authHeader);
    console.log('📋 Auth Header starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    // Validate auth header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log('🔍 Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    console.log('🔍 Verifying user authentication...');
    let user;
    let userId;
    
    try {
      const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError || !authUser) {
        console.error('❌ Auth error:', userError);
        return new Response(
          JSON.stringify({ error: "Authentication failed. Please sign in again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      user = authUser;
      userId = user.id;
      console.log('✅ User authenticated:', userId);
    } catch (authException) {
      console.error('❌ Auth exception:', authException);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('🔍 Reading request body...');
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('✅ Request body parsed successfully');
      console.log('📦 Body keys:', Object.keys(requestBody));
      console.log('📦 Messages count:', requestBody.messages?.length);
      console.log('📦 Conversation ID:', requestBody.conversationId);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, conversationId, quickAction, lastResponse } = requestBody;

    // Optimized system prompt - more concise yet comprehensive
    let systemPrompt = `Ti si Študko AI – vrhunski slovenski študijski mentor, ki daje KAKOVOSTNE in NATANČNE razlage.

🎯 NAČIN RAZLAGANJA:

1. STRUKTURIRANO razloži koncept z jasno logiko
2. Uporabi teorijo, primere in praktično uporabo
3. Pojasni "zakaj" in "kako", ne samo "kaj"
4. Povežeš z drugimi koncepti kjer je relevantno
5. Prilagodi globino glede na kompleksnost vprašanja

📝 STIL:

- KAKOVOSTNI odgovori (300-800 besed za kompleksne teme)
- Jasna struktura z logičnim tokom
- SPECIFIČNI primeri in razlage
- Celostni odgovor, ne samo bullet points
- Kot dober profesor - razumljivo a natančno

🎨 OBLIKOVANJE:

- NIKOLI NE UPORABLJAJ markdown (#, ##, *, **, _)
- Za strukturo uporablji emojije in besedilo
- Alineje z vejajem (-)
- Poudarjene besede Z VELIKIMI ČRKAMI
- Čisto besedilo brez posebnega formatiranja

💡 STRUKTURA ODGOVORA:

UVOD & INTUICIJA 🎯
Hitro pojasni koncept z analogijo iz resničnega življenja

JEDRO RAZLAGE 📐
Teoretična osnova s ključnimi točkami in definicijami

PRAKTIČNI PRIMERI 🔢
1-2 konkretna primera s podrobnimi koraki

UPORABA 🚀
Kje se to uporablja v praksi

Če je vprašanje preprosto: Odgovori jedrnato (100-200 besed)
Če je vprašanje kompleksno: Razloži podrobno (300-800 besed)

🗣️ TON: Profesionalen, prijazen, motivacijski, slovenski jezik

⚡ HITROST & KAKOVOST:
- Osredotoči se na jedro vprašanja
- Odstrani odvečno besedilo
- Jasna in jedrnata razlaga
- Ne ponavljaj enakih stvari večkrat`;

    
    let userMessages = messages;
    
    if (quickAction && lastResponse) {
      const actionPrompts: Record<string, string> = {
        simplify: `Razloži to enostavneje:\n\n${lastResponse}`,
        detailed: `Razloži to podrobneje z več detajli:\n\n${lastResponse}`,
        examples: `Podaj konkretne primere:\n\n${lastResponse}`,
        flashcards: `Ustvari 5 flashcards iz tega:\n\n${lastResponse}`,
        quiz: `Ustvari 3 kviz vprašanja:\n\n${lastResponse}`,
        translate: `Prevedi v angleščino:\n\n${lastResponse}`,
      };
      
      userMessages = [{ role: "user", content: actionPrompts[quickAction] || lastResponse }];
    }

    // Optimize context window - keep only last 10 messages for better performance
    const contextLimit = 10;
    if (userMessages.length > contextLimit) {
      userMessages = userMessages.slice(-contextLimit);
    }

    // Convert messages to OpenAI format
    const openaiMessages = userMessages.map((msg: any) => {
      const message: any = {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: []
      };
      
      // Add text content
      if (msg.content) {
        message.content.push({
          type: 'text',
          text: msg.content
        });
      }
      
      // Add image if present
      if (msg.attachment?.imageData) {
        message.content.push({
          type: 'image_url',
          image_url: {
            url: `data:${msg.attachment.mimeType || 'image/jpeg'};base64,${msg.attachment.imageData}`
          }
        });
      }
      
      // If no content array items, just use text string
      if (message.content.length === 1 && message.content[0].type === 'text') {
        message.content = message.content[0].text;
      }
      
      return message;
    });

    // Add system prompt as first message
    const messagesWithSystem = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...openaiMessages
    ];

    const openaiRequestBody = {
      model: "gpt-4o-mini",
      messages: messagesWithSystem,
      stream: true, // Enable real streaming for faster response
      temperature: 0.7, // Balanced for quality and focus
      max_tokens: 2500, // Optimized for faster responses
      top_p: 0.9, // More focused sampling
      frequency_penalty: 0.4, // Stronger reduction of repetitive phrases
      presence_penalty: 0.2, // Encourage topic variety
    };
    
    console.log('===========================================');
    console.log('📤 SENDING TO OPENAI');
    console.log('===========================================');
    console.log('Message count:', openaiMessages.length);
    console.log('Messages structure:', JSON.stringify(messagesWithSystem.map(m => ({ 
      role: m.role, 
      contentPreview: typeof m.content === 'string' ? m.content.substring(0, 50) + '...' : 'array'
    })), null, 2));
    console.log('Full payload:', JSON.stringify(openaiRequestBody, null, 2));
    
    const openaiUrl = 'https://api.openai.com/v1/chat/completions';
    
    console.log('🌐 OpenAI API URL:', openaiUrl);
    console.log('📦 Request body keys:', Object.keys(openaiRequestBody));
    console.log('===========================================');
    
    const aiResponse = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(openaiRequestBody),
    });

    console.log('===========================================');
    console.log('📥 OPENAI API RESPONSE');
    console.log('===========================================');
    console.log('Status:', aiResponse.status);
    console.log('Status Text:', aiResponse.statusText);
    console.log('OK:', aiResponse.ok);
    console.log('===========================================');

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('===========================================');
      console.error('❌ OPENAI API ERROR');
      console.error('===========================================');
      console.error('Status:', aiResponse.status);
      console.error('Status Text:', aiResponse.statusText);
      console.error('Response Headers:', Object.fromEntries(aiResponse.headers.entries()));
      console.error('Full Error Body:', errorText);
      console.error('Error Body Length:', errorText.length);
      console.error('===========================================');
      
      let errorMessage = `AI API napaka: ${aiResponse.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed Error JSON:', JSON.stringify(errorJson, null, 2));
        errorMessage = errorJson.error?.message || errorJson[0]?.error?.message || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse error as JSON:', parseError);
        errorMessage = errorText.substring(0, 200) || errorMessage;
      }
      
      if (aiResponse.status === 429) {
        // Check if there's a Retry-After header
        const retryAfter = aiResponse.headers.get('Retry-After');
        const waitTime = retryAfter ? `${retryAfter} sekund` : 'nekaj časa';
        
        return new Response(JSON.stringify({ 
          error: `OpenAI API rate limit dosežen. Poskusi čez ${waitTime}.`,
          retryAfter: retryAfter ? parseInt(retryAfter) : 60
        }), {
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 400) {
        return new Response(JSON.stringify({ error: `Neveljavna zahteva: ${errorMessage}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 401 || aiResponse.status === 403) {
        return new Response(JSON.stringify({ error: "API ključ ni pravilen ali nima dostopa." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: aiResponse.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Real streaming response for faster perceived performance
    console.log('✅ Success! Setting up real-time stream...');
    
    const encoder = new TextEncoder();
    let fullResponse = '';  // Accumulate for database storage
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = aiResponse.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) {
            controller.enqueue(encoder.encode('data: {"error": "No stream available"}\n\n'));
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('Stream complete. Total length:', fullResponse.length);
              
              // Save to database after stream completes
              if (conversationId && fullResponse) {
                try {
                  await supabaseClient
                    .from("ai_conversations")
                    .insert({
                      session_id: conversationId,
                      message: fullResponse,
                      message_type: "assistant",
                    });
                  console.log('✅ Response saved to database');
                } catch (dbError) {
                  console.error('❌ Database save error:', dbError);
                }
              }
              
              controller.close();
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                
                if (data) {
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    
                    if (content) {
                      fullResponse += content;
                      // Forward the exact streaming format to frontend
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
                    }
                  } catch (e) {
                    // Skip invalid JSON chunks
                  }
                }
              }
            }
          }
        } catch (streamError) {
          console.error('❌ Streaming error:', streamError);
          controller.enqueue(encoder.encode(`data: {"error": "Stream failed"}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("===========================================");
    console.error("❌ FUNCTION ERROR");
    console.error("===========================================");
    console.error("Error:", errorMessage);
    console.error("Stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("===========================================");
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
