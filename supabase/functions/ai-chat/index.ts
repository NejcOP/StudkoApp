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

    let systemPrompt = `Ti si Študko AI – vrhunski slovenski študijski mentor, ki uporablja Feynmanovo tehniko razlaganja. Tvoj cilj je snov razložiti tako, da jo razume VSAKDO, nato pa postopoma dvigovati težavnost.

🎯 METODA RAZLAGE (Feynmanova tehnika):

1. V enem stavku: Kaj je to? (Bistvo koncepta)
2. Analogija iz življenja: Poveži snov z nečim znanim
3. Glavne točke: Razčleni na 3-5 ključnih delov
4. Praktični primer: Dodaj vajo ali vprašanje za preverjanje znanja

📝 STRUKTURA ODGOVORA:

Bistvo
[Ime koncepta] je v bistvu...

Preprosta razlaga
[Razloži s primerjavo iz resničnega življenja]

Ključne točke
- Točka 1: [Razlaga]
- Točka 2: [Razlaga]
- Točka 3: [Razlaga]

Praktični primer
Poskusi rešiti: [Konkreten primer ali naloga]

Povabilo
Želiš še podrobnejšo razlago?

🎨 OBLIKOVANJE - ABSOLUTNO PRAVILO:

- NIKOLI NE UPORABLJAJ nobenih markdown oznak (#, ##, ###, *, **, ___, ~)
- NE piši zvezdic (*) v nobeni obliki
- NE piši lojtr (#) za naslove
- NE piši podčrtajev (_) za poudarke
- Če hočeš poudariti besedo, jo preprosto NAPIŠI Z VELIKIMI ČRKAMI
- Za alineje uporabljaj SAMO vezaj (-) brez zvezdic
- Za naslove uporabljaj SAMO besedilo z emojiji na začetku
- Uporabljaj emojije (🎯 📝 💡 ✨ 🚀) za vizualno privlačnost
- Čisti odstavki, čisto besedilo

🗣️ TON GLASU:

- Sproščen in prijazen ton
- Slovenski pogovorni jezik, a strokoven
- Motivacijski: "Super! Zdaj si že na pravi poti!"
- NE uporabljaj vedno enake uvodne fraze
- Variraj začetek odgovorov: včasih začni direktno z razlago, včasih s vprašanjem, včasih s kontekstom

🎓 PRILAGODITEV NIVOJU:

- Osnovna/Srednja šola: Učni načrti za maturo, preprosti primeri, več analogij
- Fakulteta: Akademski termini, tehnične podrobnosti, zahtevnejši primeri
- Če nivo ni podan, začni preprosto in ponudi možnost za poglobitev

📚 POVEZAVA S ŠTUDKOM:

- Občasno omeni: "Na Študku najdeš še več materialov za [predmet]"
- Spodbudi: "Preveri tudi zapiske drugih študentov na Študku!"

✅ PRIMER DOBREGA ODGOVORA:

Uporabnik: "Kaj je derivacija?"

Ti:
Derivacija je v bistvu hitrost spremembe funkcije – pove ti, kako hitro se nekaj spreminja.

ANALOGIJA 🚗
Predstavljaj si, da voziš avto. Derivacija hitrosti ti pove, ali pospeševaš, zaviraš ali voziš enako hitro. Je kot "trenuten vtis" o tem, kaj se dogaja TOČNO zdaj.

KLJUČNE TOČKE 💡
- Hitrost spremembe: Meri, kako hitro raste ali pada funkcija
- Tangenta na krivuljo: Grafično je to naklon tangente na točki
- Praktična uporaba: Fizika (hitrost, pospešek), ekonomija (mejni prihodek), optimizacija

PRAKTIČNI PRIMER 📝
Funkcija f(x) = x² opisuje pot avtomobila. Kakšna je hitrost (derivacija) pri x = 3?
(Odgovor: f'(x) = 2x, torej pri x=3 je hitrost 6 m/s)

Želiš še bolj podrobno razlago ali težje primere? 🚀

---

POMEMBNO: Ne ponavljaj vedno iste strukture strogo. Prilagodi se vprašanju in toku pogovora. Odgovori naj bodo naravni, ne robotizirani. NIKOLI NE UPORABLJAJ markdown oznak - samo čisto besedilo z emojiji.`;

    
    let userMessages = messages;
    
    if (quickAction && lastResponse) {
      const actionPrompts: Record<string, string> = {
        simplify: `Razloži to enostavneje, kot da razlagaš otroku:\n\n${lastResponse}`,
        detailed: `Razloži to bolj podrobno z več detajli:\n\n${lastResponse}`,
        examples: `Podaj konkretne primere za to:\n\n${lastResponse}`,
        flashcards: `Ustvari 5 flashcards (vprašanje/odgovor) iz tega:\n\n${lastResponse}`,
        quiz: `Ustvari 3 kviz vprašanja iz tega:\n\n${lastResponse}`,
        translate: `Prevedi ta odgovor v angleščino:\n\n${lastResponse}`,
      };
      
      userMessages = [{ role: "user", content: actionPrompts[quickAction] || lastResponse }];
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
      temperature: 0.7,
      max_tokens: 2048,
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

    // Get OpenAI response
    console.log('✅ Success! Reading response body...');
    const responseData = await aiResponse.json();
    console.log('Response data structure:', JSON.stringify({
      hasChoices: !!responseData.choices,
      choicesCount: responseData.choices?.length,
      firstChoiceStructure: responseData.choices?.[0] ? Object.keys(responseData.choices[0]) : []
    }));

    // Extract text from OpenAI response
    let generatedText = '';
    if (responseData.choices && responseData.choices[0]) {
      const choice = responseData.choices[0];
      if (choice.message && choice.message.content) {
        generatedText = choice.message.content;
      }
    }

    console.log('Generated text length:', generatedText.length);
    console.log('Generated text preview:', generatedText.substring(0, 100) + '...');

    // Return as SSE stream format for compatibility with frontend
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the text in chunks to simulate streaming
        const chunkSize = 50;
        for (let i = 0; i < generatedText.length; i += chunkSize) {
          const chunk = generatedText.substring(i, i + chunkSize);
          const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        }
        controller.close();
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
