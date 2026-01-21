import { supabase } from "@/integrations/supabase/client";

interface UploadResult {
  path: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage for AI processing
 */
export async function uploadAiFile(
  userId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `${userId}/${timestamp}-${sanitizedName}`;

    // Start upload - Supabase doesn't have native progress, simulate it
    onProgress?.(10);

    const { data, error } = await supabase.storage
      .from("ai-uploads")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    onProgress?.(90);

    if (error) {
      console.error("Upload error:", error);
      return { path: "", error: error.message };
    }

    onProgress?.(100);

    // Get public URL (if bucket is public)
    const { data: urlData } = supabase.storage
      .from("ai-uploads")
      .getPublicUrl(data.path);

    return {
      path: data.path,
      publicUrl: urlData?.publicUrl,
    };
  } catch (err) {
    console.error("Upload exception:", err);
    return {
      path: "",
      error: err instanceof Error ? err.message : "Napaka pri nalaganju",
    };
  }
}

/**
 * Get a signed URL for a private file
 */
export async function getAiFileSignedUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from("ai-uploads")
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error("Signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("Signed URL exception:", err);
    return null;
  }
}

/**
 * Delete an uploaded AI file
 */
export async function deleteAiFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from("ai-uploads")
      .remove([path]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Delete exception:", err);
    return false;
  }
}
