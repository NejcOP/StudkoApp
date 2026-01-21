import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, List, BookOpen, Bookmark, Paperclip, Copy, Save, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AiFileAttachment from "../AiFileAttachment";
import DocumentPreview from "../DocumentPreview";
import { extractTextFromFile, ExtractedContent } from "@/lib/fileTextExtractor";
import { SummaryHistory } from "@/components/SummaryHistory";

interface SummaryResult {
  short_summary: string;
  long_summary: string;
  bullet_points: string[];
  key_definitions: { term: string; definition: string }[];
  glossary: { term: string; meaning: string }[];
}

interface AttachedFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploadProgress?: number;
  storagePath?: string;
}

interface SummaryModeProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const SummaryMode = ({ isLoading, setIsLoading }: SummaryModeProps) => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleFileAttach = async (file: AttachedFile) => {
    setAttachedFile(file);
    setIsExtracting(true);
    
    try {
      const content = await extractTextFromFile(file.file);
      setExtractedContent(content);
      // Append extracted text to input
      setInputText(prev => prev ? `${prev}\n\n${content.text}` : content.text);
      toast.success("Dokument obdelan!");
    } catch (error) {
      console.error("Error extracting text:", error);
      toast.error("Napaka pri branju dokumenta.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileRemove = () => {
    setAttachedFile(null);
    setExtractedContent(null);
  };

  const handleGenerateSummary = async () => {
    if (!inputText.trim()) {
      toast.error("Prosim, vnesi besedilo za povzetek.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: { text: inputText }
      });

      if (error) throw error;

      if (data) {
        setResult(data);
        toast.success("Povzetek ustvarjen!");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Napaka pri generiranju povzetka.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = async () => {
    if (!result) return;
    
    try {
      // Create formatted text for copying
      let copyText = "POVZETEK\n\n";
      
      copyText += "📝 KRATKI POVZETEK:\n";
      copyText += result.short_summary + "\n\n";
      
      copyText += "📚 KLJUČNE TOČKE:\n";
      result.bullet_points.forEach((point, i) => {
        copyText += `${i + 1}. ${point}\n`;
      });
      copyText += "\n";
      
      if (result.key_definitions.length > 0) {
        copyText += "🔑 KLJUČNI POJMI:\n";
        result.key_definitions.forEach(def => {
          copyText += `• ${def.term}: ${def.definition}\n`;
        });
      }
      
      // Try multiple clipboard methods
      let copied = false;
      
      // Method 1: Modern Clipboard API (secure context only)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(copyText);
          copied = true;
        } catch (clipboardError) {
          console.warn("Clipboard API failed:", clipboardError);
        }
      }
      
      // Method 2: Fallback for older browsers or non-HTTPS
      if (!copied) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = copyText;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            copied = true;
          }
        } catch (execError) {
          console.warn("execCommand failed:", execError);
        }
      }
      
      if (copied) {
        toast.success("Povzetek kopiran v odložišče!");
      } else {
        toast.error("Kopiranje ni uspelo. Prosim kopiraj ročno.");
      }
    } catch (error) {
      console.error("Error copying summary:", error);
      toast.error("Napaka pri kopiranju povzetka.");
    }
  };

  const handleSaveSummary = async () => {
    if (!result || !user) {
      toast.error("Prijavi se, da shraniš povzetek.");
      return;
    }
    
    try {
      const { error } = await supabase.from("summaries").insert({
        user_id: user.id,
        input_text: inputText.substring(0, 500), // Store first 500 chars as preview
        short_summary: result.short_summary,
        long_summary: result.long_summary,
        bullet_points: result.bullet_points,
        key_definitions: result.key_definitions,
        glossary: result.glossary || []
      });

      if (error) throw error;
      
      toast.success("Povzetek shranjen v zgodovino!");
    } catch (error) {
      console.error("Error saving summary:", error);
      toast.error("Napaka pri shranjevanju povzetka.");
    }
  };

  const handleViewSummary = (summary: any) => {
    setResult({
      short_summary: summary.short_summary,
      long_summary: summary.long_summary,
      bullet_points: summary.bullet_points,
      key_definitions: summary.key_definitions,
      glossary: summary.glossary || []
    });
    setInputText(summary.input_text);
    setShowHistory(false);
  };

  // Show history view
  if (showHistory) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Zgodovina povzetkov</h2>
          <Button
            variant="outline"
            onClick={() => setShowHistory(false)}
          >
            Nazaj
          </Button>
        </div>
        <SummaryHistory onViewSummary={handleViewSummary} />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Ustvari Povzetek</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              Zgodovina
            </Button>
            <AiFileAttachment
              attachedFile={attachedFile}
              onFileAttach={handleFileAttach}
              onFileRemove={handleFileRemove}
              disabled={isLoading || isExtracting}
            />
          </div>
        </div>

        {/* Document Preview */}
        {extractedContent && (
          <DocumentPreview
            fileName={extractedContent.fileName}
            fileType={extractedContent.fileType}
            extractedText={extractedContent.text}
            pageCount={extractedContent.pageCount}
            imagePreview={attachedFile?.preview}
          />
        )}
        
        <div className="mb-4">
          <Label className="text-foreground">Vstavi besedilo *</Label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Kopiraj vsebino zapiskov ali vpiši snov, iz katere želiš ustvariti povzetek..."
            className="mt-2 min-h-[200px] bg-background text-foreground border-border"
          />
        </div>

        <Button
          onClick={handleGenerateSummary}
          disabled={!inputText.trim() || isLoading || isExtracting}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-glow-primary"
          size="lg"
        >
          {isExtracting ? (
            <>Branje dokumenta...</>
          ) : isLoading ? (
            <>Generiranje povzetka...</>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generiraj Povzetek
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Povzetek</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="gap-2"
          >
            <Copy className="w-4 h-4" />
            Kopiraj
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveSummary}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Shrani
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResult(null);
              setInputText("");
              setAttachedFile(null);
              setExtractedContent(null);
            }}
          >
            Nov povzetek
          </Button>
        </div>
      </div>

      <Tabs defaultValue="short" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="short" className="flex-1 gap-2">
            <FileText className="w-4 h-4" />
            Kratek
          </TabsTrigger>
          <TabsTrigger value="long" className="flex-1 gap-2">
            <BookOpen className="w-4 h-4" />
            Dolg
          </TabsTrigger>
          <TabsTrigger value="bullets" className="flex-1 gap-2">
            <List className="w-4 h-4" />
            Točke
          </TabsTrigger>
          <TabsTrigger value="definitions" className="flex-1 gap-2">
            <Bookmark className="w-4 h-4" />
            Definicije
          </TabsTrigger>
        </TabsList>

        <TabsContent value="short" className="mt-0">
          <div className="bg-muted rounded-xl p-4">
            <p className="text-foreground whitespace-pre-wrap">{result.short_summary}</p>
          </div>
        </TabsContent>

        <TabsContent value="long" className="mt-0">
          <div className="bg-muted rounded-xl p-4">
            <p className="text-foreground whitespace-pre-wrap">{result.long_summary}</p>
          </div>
        </TabsContent>

        <TabsContent value="bullets" className="mt-0">
          <div className="bg-muted rounded-xl p-4 space-y-2">
            {result.bullet_points.map((point, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-primary">•</span>
                <span className="text-foreground">{point}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="definitions" className="mt-0">
          <div className="space-y-3">
            {result.key_definitions.map((def, i) => (
              <div key={i} className="bg-muted rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-1">{def.term}</h4>
                <p className="text-muted-foreground text-sm">{def.definition}</p>
              </div>
            ))}
            {result.glossary.length > 0 && (
              <>
                <h4 className="font-semibold text-foreground mt-4 mb-2">Slovar</h4>
                {result.glossary.map((item, i) => (
                  <div key={i} className="bg-muted rounded-xl p-3">
                    <span className="font-medium text-foreground">{item.term}:</span>{" "}
                    <span className="text-muted-foreground">{item.meaning}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SummaryMode;
