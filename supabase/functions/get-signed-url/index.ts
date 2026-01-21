import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[GET-SIGNED-URL] Processing request");

    // Get params from URL or body
    const url = new URL(req.url);
    let path = url.searchParams.get("path");
    let noteId = url.searchParams.get("noteId");

    // Also support POST body
    if (req.method === "POST") {
      const body = await req.json();
      path = body.path || path;
      noteId = body.noteId || noteId;
    }

    if (!path || !noteId) {
      throw new Error("path and noteId are required");
    }

    console.log("[GET-SIGNED-URL] Path:", path, "NoteId:", noteId);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Invalid authentication");
    }

    const userId = userData.user.id;
    console.log("[GET-SIGNED-URL] User authenticated:", userId);

    // Use service role to check authorization and create signed URL
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if user is the note owner
    const { data: note, error: noteError } = await supabaseAdmin
      .from("notes")
      .select("author_id, price, file_url")
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      throw new Error("Note not found");
    }

    const isOwner = note.author_id === userId;
    const isFree = note.price === 0;

    // If not owner and not free, check purchase
    if (!isOwner && !isFree) {
      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from("note_purchases")
        .select("id")
        .eq("buyer_id", userId)
        .eq("note_id", noteId)
        .maybeSingle();

      if (!purchase) {
        console.log("[GET-SIGNED-URL] Access denied - not purchased");
        return new Response(JSON.stringify({ error: "Access denied. Please purchase this note first." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    console.log("[GET-SIGNED-URL] Access granted");

    // Create signed URL (valid for 60 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from("notes")
      .createSignedUrl(path, 60);

    if (signedUrlError) {
      console.error("[GET-SIGNED-URL] Error creating signed URL:", signedUrlError);
      throw new Error("Failed to create signed URL");
    }

    console.log("[GET-SIGNED-URL] Signed URL created successfully");

    return new Response(JSON.stringify({ signedUrl: signedUrlData.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GET-SIGNED-URL] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
