import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocumentPreviewProps {
  fileName: string;
  fileType: string;
  extractedText: string;
  pageCount?: number;
  imagePreview?: string;
}

export const DocumentPreview = ({
  fileName,
  fileType,
  extractedText,
  pageCount,
  imagePreview
}: DocumentPreviewProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const previewLength = 400;
  const needsExpansion = extractedText.length > previewLength;
  const displayText = isExpanded ? extractedText : extractedText.slice(0, previewLength);

  const getIcon = () => {
    if (fileType === 'image') {
      return <ImageIcon className="w-5 h-5 text-primary" />;
    }
    return <FileText className="w-5 h-5 text-primary" />;
  };

  return (
    <div className="bg-muted/50 rounded-xl border border-border p-4 my-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {getIcon()}
        <span className="text-sm font-medium text-foreground">
          📄 Dokument obdelan: {fileName}
        </span>
        {pageCount && (
          <span className="text-xs text-muted-foreground">
            ({pageCount} {pageCount === 1 ? 'stran' : pageCount < 5 ? 'strani' : 'strani'})
          </span>
        )}
      </div>

      {/* Image Preview */}
      {imagePreview && fileType === 'image' && (
        <div className="mb-3">
          <img 
            src={imagePreview} 
            alt={fileName}
            className="max-w-full h-auto max-h-48 rounded-lg object-contain"
          />
        </div>
      )}

      {/* Extracted Text Preview */}
      <div className="bg-background rounded-lg border border-border">
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Ekstrahirana vsebina:
          </p>
          <ScrollArea className={isExpanded ? "h-64" : "max-h-32"}>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {displayText}
              {needsExpansion && !isExpanded && "..."}
            </p>
          </ScrollArea>
        </div>
        
        {/* Expand/Collapse Button */}
        {needsExpansion && (
          <div className="border-t border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full text-xs h-7"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Prikaži manj
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Prikaži več
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;
