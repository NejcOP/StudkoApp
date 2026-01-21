import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    
    // Validate auth header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    let user;
    let userId;
    
    try {
      const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError || !authUser) {
        console.error('Auth error:', userError);
        return new Response(
          JSON.stringify({ error: "Authentication failed. Please sign in again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      user = authUser;
      userId = user.id;
    } catch (authException) {
      console.error('Auth exception:', authException);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, conversationId, quickAction, lastResponse } = await req.json();

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

    // Convert messages to Gemini format
    const geminiMessages = userMessages.map((msg: any) => {
      const parts: any[] = [];
      
      // Add text content
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      
      // Add image if present
      if (msg.attachment?.imageData) {
        parts.push({
          inline_data: {
            mime_type: msg.attachment.mimeType || "image/jpeg",
            data: msg.attachment.imageData
          }
        });
      }
      
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts
      };
    });

    const requestBody = {
      contents: geminiMessages,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      }
    };
    
    console.log('Calling Gemini API with:', JSON.stringify({ messageCount: geminiMessages.length }));
    
    // Try gemini-2.0-flash-exp first (newest model), fallback to gemini-1.5-flash
    const modelName = "gemini-2.0-flash-exp";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${GOOGLE_AI_API_KEY}`;
    
    console.log('Gemini API URL (without key):', geminiUrl.replace(/key=.*$/, 'key=***'));
    
    const aiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Gemini API response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', { status: aiResponse.status, error: errorText });
      
      let errorMessage = `AI API napaka: ${aiResponse.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
        console.error('Parsed Gemini error:', errorJson);
      } catch {
        // Not JSON, use text as is
        errorMessage = errorText.substring(0, 200) || errorMessage;
      }
      
      if (aiResponse.status === 429) {
        // Check if there's a Retry-After header
        const retryAfter = aiResponse.headers.get('Retry-After');
        const waitTime = retryAfter ? `${retryAfter} sekund` : 'nekaj časa';
        
        return new Response(JSON.stringify({ 
          error: `Google AI API rate limit dosežen. Poskusi čez ${waitTime}.`,
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
      if (aiResponse.status === 403) {
        return new Response(JSON.stringify({ error: "API ključ ni pravilen ali nima dostopa." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: aiResponse.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Transform Gemini streaming response to SSE format
    const reader = aiResponse.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          let totalChunks = 0;
          let totalCharsSent = 0;
          
          while (reader) {
            const { done, value } = await reader.read();
            if (done) {
              console.log(`Stream complete. Total chunks: ${totalChunks}, chars sent: ${totalCharsSent}`);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            totalChunks++;
            buffer += chunk;
            
            // Gemini streams JSON objects separated by newlines
            // Try to extract complete JSON objects from buffer
            let braceCount = 0;
            let jsonStart = -1;
            
            for (let i = 0; i < buffer.length; i++) {
              if (buffer[i] === '{') {
                if (braceCount === 0) jsonStart = i;
                braceCount++;
              } else if (buffer[i] === '}') {
                braceCount--;
                if (braceCount === 0 && jsonStart >= 0) {
                  // Found complete JSON object
                  const jsonStr = buffer.substring(jsonStart, i + 1);
                  try {
                    const data = JSON.parse(jsonStr);
                    
                    // Extract text from Gemini response
                    if (data.candidates && data.candidates[0]) {
                      const candidate = data.candidates[0];
                      if (candidate.content && candidate.content.parts) {
                        for (const part of candidate.content.parts) {
                          if (part.text) {
                            console.log(`Sending ${part.text.length} chars`);
                            totalCharsSent += part.text.length;
                            const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: part.text } }] })}\n\n`;
                            controller.enqueue(encoder.encode(sseData));
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.error('Failed to parse JSON:', e);
                  }
                  
                  // Remove processed JSON from buffer
                  buffer = buffer.substring(i + 1);
                  i = -1; // Reset search
                  jsonStart = -1;
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
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
