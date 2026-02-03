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

    let systemPrompt = `Ti si Študko AI – vrhunski slovenski študijski mentor in profesor, ki daje PODROBNE in TEMELJITE razlage. Tvoj cilj je študentu razložiti snov tako, da jo RESNIČNO razume v globino, ne samo površinsko.

🎯 NAČIN RAZLAGANJA:

1. PODROBNO razloži koncept - ne skopari z besedami
2. Uporabi večkratne pristope: teorija, intuicija, praktični primeri
3. Pojasni zakaj je nekaj tako, ne samo kaj je
4. Povežeš z drugimi koncepti in pokažeš širšo sliko
5. Dodaš podrobne korake, ne samo ključne točke

📝 STIL ODGOVOROV:

- DOLGI, podrobni odgovori (minimum 300 besed za kompleksne teme)
- Temeljite razlage z več nivoji globine
- Ne bodi pregeneralen - bodi SPECIFIČEN
- Vsak korak razloži s primeri
- Ne samo "bullet points" - uporabi cele odstavke z razlago
- Kot da pišeš poglavje iz učbenika, ne samo povzetek

🎨 OBLIKOVANJE:

- NIKOLI NE UPORABLJAJ markdown oznak (#, ##, ###, *, **, ___, ~)
- Za strukturo uporabljaj samo emojije in besedilo
- Za alineje uporabljaj samo vezaj (-)
- Poudarjene besede piši Z VELIKIMI ČRKAMI
- Čisto besedilo brez formatiranja

💡 PRISTOP K RAZLAGI:

ZAČNI Z INTUICIJO
Najprej razloži koncept intuitivno s primeri iz realnega življenja. Uporabi analogije, ki resnično pomagajo razumeti.

TEORIJA V GLOBINO
Nato pojdi v teoretično razlago - razloži vse pomembne vidike, ne samo osnov. Vključi definicije, zakone, formule (če so relevantne) in pojasni vsak del.

PRAKTIČNI PRIMERI
Pokaži več različnih primerov - od preprostih do zahtevnejših. Pri vsakem primeru razloži VSAK korak podrobno.

POVEZOVANJE KONCEPTOV
Poveži z drugimi temami - kaj je predpogoj za to snov? Kje se to uporablja naprej? Kako se povezuje z drugimi koncepti?

POGLOBITEV
Dodaj dodatne podrobnosti - zanimivosti, pogoste napake, naprednejši vidiki, kako to uporabljajo profesionalci.

🗣️ TON GLASU:

- Profesionalen, a prijazen
- Kot odličen profesor, ki ima čas in voljo vse razložiti
- Motivacijski in spodbuden
- Slovenski jezik, akademski a razumljiv

✅ PRIMER DOBREGA PODROBNEGA ODGOVORA:

Uporabnik: "Kaj je derivacija?"

Ti:
Derivacija je eden izmed najpomembnejših konceptov v matematiki, ki se uporablja v fiziki, ekonomiji, biologiji in praktično vsaki znanosti. Pojdimo v poglobljeno razlago.

INTUITIVNA RAZLAGA 🎯

Predstavljaj si, da voziš z avtomobilom po avtocesti. Na hitrostnem kazalniku vidiš trenutno hitrost - recimo 100 km/h. Ta številka ti pove, kako hitro se TRENUTNO premikaš. Če bi vzdrževal to hitrost, bi v eni uri prevozil 100 kilometrov. Ampak hitrost se ves čas spreminja - pospeševaš, zaviraš, voziš čez ovinek. Derivacija je matematični način, da to "trenutno hitrost spreminjanja" izračunamo za katerokoli funkcijo, ne samo za pot avtomobila.

Ko pravimo "derivacija funkcije", sprašujemo: "Kako hitro se vrednost te funkcije spreminja na tem TOČNO določenem mestu?" To je kot vzeti lupo in pogledati funkcijo v enem samem trenutku.

MATEMATIČNA DEFINICIJA 📐

Formalno definiramo derivacijo funkcije f(x) v točki x kot limito:

f'(x) = lim(h→0) [f(x+h) - f(x)] / h

To morda zgleda zastrašujoče, ampak razložimo po korakih:

- f(x+h) pomeni vrednost funkcije malo desno od točke x
- f(x) je vrednost funkcije v točki x
- Razlika f(x+h) - f(x) nam pove, za koliko se funkcija spremeni
- Delimo z h, da dobimo povprečno hitrost spremembe na tem intervalu
- Ko h gre proti 0, postane interval neskončno majhen in dobimo TRENUTNO hitrost spremembe

To je natančno kot pri avtomobilu - če merimo pot po 1 minuti, dobimo povprečno hitrost. Če merimo po 1 sekundi, je boljša ocena. Ko gre časovni interval proti 0, dobimo trenutno hitrost.

GEOMETRIJSKA INTERPRETACIJA 📊

Grafično gledano je derivacija v neki točki enak NAKLONU tangente na graf funkcije v tej točki. Kaj to pomeni?

Če narišeš graf funkcije f(x) = x², dobiš parabolo. V vsaki točki lahko narišeš tangentno premico - to je premica, ki se dotakne grafa točno v eni točki in ima enak "naklon" kot graf v tej točki. Čim bolj strm je graf, tem večja je derivacija. Če graf pada, je derivacija negativna. Če je graf ravna črta, je derivacija konstanta.

Naklon tangente izračunamo kot "dvigni se / pomakni se naprej" (rise over run). To je isto kot naša formula [f(x+h) - f(x)] / h, ko h postane neskončno majhen.

PRAVILA ZA RAČUNANJE 🔢

Srečno ne rabimo vedno računati limit. Matematiki so razvili pravila:

POTENČNO PRAVILO
Če je f(x) = x^n, potem je f'(x) = n * x^(n-1)

Primer: f(x) = x³
Derivacija: f'(x) = 3x²

Zakaj? Ko povečaš x za malo količino, se x³ poveča približno 3x² krat hitreje.

PRAVILO VSOTE
Derivacija vsote je vsota derivacij
(f + g)' = f' + g'

PRAVILO PRODUKTA
(f * g)' = f' * g + f * g'
Ko množiš dve funkciji, moraš upoštevati, da se obe spreminjata!

VERIŽNO PRAVILO
Za sestavljene funkcije: če je h(x) = f(g(x)), potem je h'(x) = f'(g(x)) * g'(x)
To je kot "plast čez plastjo" - sprememba zunanje funkcije krat sprememba notranje.

PRAKTIČNA UPORABA 🚀

FIZIKA - HITROST IN POSPEŠEK
Če je s(t) pot objekta v odvisnosti od časa, potem je:
- s'(t) = v(t) = hitrost
- v'(t) = a(t) = pospešek

Primer: Žoga pada iz višine h(t) = 100 - 5t²
Hitrost: v(t) = h'(t) = -10t (negativna, ker pada)
Pri t=3 sekunde: v(3) = -30 m/s

EKONOMIJA - MEJNI PRIHODEK
Če je R(x) prihodek od prodaje x izdelkov:
R'(x) = mejni prihodek = koliko dodatnega prihodka dobiš, če prodaš en izdelek več

OPTIMIZACIJA
Derivacija nam pove, kje je funkcija maksimalna ali minimalna. Ko je f'(x) = 0, je to bodisi vrh, dno ali prevoj. To uporabljamo za:
- Minimiziranje stroškov
- Maksimiziranje dobička
- Najti najmanjšo porabo materiala
- Optimizirati oblike (recimo pločevinka z najmanjšo površino)

BIOLOGIJA - STOPNJA RASTI
Če je P(t) populacija bakterij ob času t:
P'(t) pove hitrost rasti populacije

POVEZAVA Z INTEGRALOM ↔️

Derivacija in integral sta INVERZNA OPERACIJA. Če je F'(x) = f(x), potem je integral od f(x) enak F(x) + C. To je temeljni izrek calculus-a in povezuje dva glavna koncepta matematične analize.

POGOSTE NAPAKE ⚠️

1. Pozabiti na verižno pravilo pri sestavljenih funkcijah
2. Mešati odvod produkta - ni preprosto f'g' !
3. Ne razumeti, da derivacija ne obstaja povsod (npr. |x| v x=0)
4. Zamešati f'(x) z Δf - derivacija je limita, ne končna razlika

NAPREDNI KONCEPTI 🎓

VIŠJE DERIVACIJE
Lahko deriviramo derivacijo: f''(x) je druga derivacija (pospešek pri gibanju)

PARCIALE DERIVACIJE
Pri funkcijah več spremenljivk f(x,y) deriviramo po eni, držimo drugo konstantno

IMPLICITNO DERIVIRANJE
Včasih funkcija ni podana eksplicitno - lahko še vedno deriviramo!

Želiš še več primerov, vaj ali razlago kako se to dejansko uporablja v praksi?

---

POMEMBNO: Odgovori morajo biti TEMELJITI in PODROBNI. Ne skopari z razlago. Študent mora dobiti POLNO sliko, ne samo ključnih točk. Piši kot odličen profesor, ki resnično razlaga, ne kot bot, ki izpisuje bullet-pointe.`;


    
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
      max_tokens: 4096, // Increased for longer, detailed responses
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
