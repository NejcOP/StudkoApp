import { supabase } from "@/integrations/supabase/client";

export const extractTextFromImage = async (file: File): Promise<{ text: string; error?: string }> => {
  try {
    // Convert image to base64
    const fileReader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      fileReader.onload = () => {
        const base64 = (fileReader.result as string).split(',')[1];
        resolve(base64);
      };
      fileReader.onerror = reject;
      fileReader.readAsDataURL(file);
    });

    const base64Image = await base64Promise;
    const mimeType = file.type;

    // Get access token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No session");
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Call Gemini Vision via our edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: "Preberi celotno besedilo iz te slike. Vrni samo besedilo brez dodatnih komentarjev.",
          attachment: {
            imageData: base64Image,
            mimeType
          }
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Parse streaming response
    const streamReader = response.body?.getReader();
    const decoder = new TextDecoder();
    let extractedText = "";

    if (!streamReader) {
      throw new Error("No reader available");
    }

    while (true) {
      const { done, value } = await streamReader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              extractedText += content;
            }
          } catch (err) {
            // Ignore parse errors
          }
        }
      }
    }

    return { text: extractedText };
  } catch (error) {
    console.error("OCR error:", error);
    return { 
      text: "", 
      error: error instanceof Error ? error.message : "Failed to extract text from image" 
    };
  }
};
