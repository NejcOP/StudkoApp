import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AiFileAttachment from "../AiFileAttachment";
import DocumentPreview from "../DocumentPreview";
import { extractTextFromFile, ExtractedContent } from "@/lib/fileTextExtractor";

interface StepByStepResult {
  steps: { number: number; title: string; explanation: string }[];
  examples: string[];
  common_mistakes: string[];
}

interface AttachedFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploadProgress?: number;
  storagePath?: string;
}

interface StepByStepModeProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const StepByStepMode = ({ isLoading, setIsLoading }: StepByStepModeProps) => {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<StepByStepResult | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleFileAttach = async (file: AttachedFile) => {
    setAttachedFile(file);
    setIsExtracting(true);
    
    try {
      const content = await extractTextFromFile(file.file);
      setExtractedContent(content);
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

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      toast.error("Prosim, vnesi besedilo ali vprašanje.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-step-by-step", {
        body: { text: inputText }
      });

      if (error) throw error;

      if (data) {
        setResult(data);
        toast.success("Razlaga ustvarjena!");
      }
    } catch (error) {
      console.error("Error generating explanation:", error);
      toast.error("Napaka pri generiranju razlage.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Razlaga korak za korakom</h2>
          <AiFileAttachment
            attachedFile={attachedFile}
            onFileAttach={handleFileAttach}
            onFileRemove={handleFileRemove}
            disabled={isLoading || isExtracting}
          />
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
          <Label className="text-foreground">Vstavi snov ali vprašanje *</Label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Opiši koncept ali problem, ki ga želiš razložiti korak za korakom..."
            className="mt-2 min-h-[150px] bg-background text-foreground border-border"
          />
        </div>

        <Button
          variant="hero"
          size="lg"
          onClick={handleGenerate}
          disabled={!inputText.trim() || isLoading || isExtracting}
          className="w-full shadow-glow-primary"
        >
          {isExtracting ? (
            <>Branje dokumenta...</>
          ) : isLoading ? (
            <>Generiranje razlage...</>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Razloži korak za korakom
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Razlaga</h2>
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
            Nova razlaga
          </Button>
        </div>

        <div className="space-y-4">
          {result.steps.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                {step.number}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{step.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Examples */}
      {result.examples.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Primeri</h3>
          </div>
          <div className="space-y-3">
            {result.examples.map((example, i) => (
              <div key={i} className="bg-muted rounded-xl p-4">
                <p className="text-foreground text-sm whitespace-pre-wrap">{example}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Mistakes */}
      {result.common_mistakes.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-foreground">Pogoste napake</h3>
          </div>
          <div className="space-y-2">
            {result.common_mistakes.map((mistake, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-yellow-500">⚠</span>
                <span className="text-muted-foreground">{mistake}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepByStepMode;
