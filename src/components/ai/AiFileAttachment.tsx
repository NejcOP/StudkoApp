import { useState, useRef, useCallback } from "react";
import { Paperclip, X, FileText, Image as ImageIcon, Loader2, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf", "txt"];

interface AttachedFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploadProgress?: number;
  storagePath?: string;
}

interface AiFileAttachmentProps {
  attachedFile: AttachedFile | null;
  onFileAttach: (file: AttachedFile) => void;
  onFileRemove: () => void;
  disabled?: boolean;
}

export const AiFileAttachment = ({
  attachedFile,
  onFileAttach,
  onFileRemove,
  disabled = false,
}: AiFileAttachmentProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Datoteka je prevelika (max 10MB).");
      return false;
    }

    // Check file type
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext || "")) {
      toast.error("Datoteka ni podprta (podprto: jpg, png, pdf, txt).");
      return false;
    }

    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) return;

    let preview: string | undefined;

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }

    onFileAttach({
      file,
      preview,
      uploading: false,
      uploadProgress: 0,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [disabled]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`relative ${isDragOver ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Pripni datoteko"
      />

      {/* Attachment button */}
      {!attachedFile && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="h-9 w-9 hover:bg-primary/10"
          aria-label="Pripni datoteko"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      )}

      {/* Attached file preview */}
      {attachedFile && (
        <div className="flex items-center gap-3 p-2 bg-muted rounded-lg border border-border">
          {/* Thumbnail */}
          <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-muted-foreground/10 flex items-center justify-center">
            {attachedFile.preview ? (
              <img
                src={attachedFile.preview}
                alt={attachedFile.file.name}
                className="w-full h-full object-cover"
              />
            ) : attachedFile.file.name.endsWith('.txt') ? (
              <FileType className="w-6 h-6 text-primary" />
            ) : (
              <FileText className="w-6 h-6 text-primary" />
            )}
            
            {/* Upload progress overlay */}
            {attachedFile.uploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {attachedFile.file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachedFile.file.size)}
              {attachedFile.uploading && attachedFile.uploadProgress !== undefined && (
                <span className="ml-2">• Nalaganje {attachedFile.uploadProgress}%</span>
              )}
            </p>
          </div>

          {/* Remove button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onFileRemove}
            disabled={attachedFile.uploading}
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
            aria-label="Odstrani datoteko"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Drag overlay indicator */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none z-10">
          <p className="text-primary font-medium text-sm">Spusti datoteko tukaj</p>
        </div>
      )}
    </div>
  );
};

export default AiFileAttachment;
