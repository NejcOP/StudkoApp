import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, CheckCircle2, XCircle, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AiFileAttachment from "../AiFileAttachment";
import DocumentPreview from "../DocumentPreview";
import { extractTextFromFile, ExtractedContent } from "@/lib/fileTextExtractor";

interface CheckResult {
  is_correct: boolean;
  feedback: string;
  correct_solution: string;
  explanation: string;
  practice_exercise: string;
}

interface AttachedFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploadProgress?: number;
  storagePath?: string;
}

interface CheckWorkModeProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const CheckWorkMode = ({ isLoading, setIsLoading }: CheckWorkModeProps) => {
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [problemAttachment, setProblemAttachment] = useState<AttachedFile | null>(null);
  const [solutionAttachment, setSolutionAttachment] = useState<AttachedFile | null>(null);
  const [problemExtracted, setProblemExtracted] = useState<ExtractedContent | null>(null);
  const [solutionExtracted, setSolutionExtracted] = useState<ExtractedContent | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleProblemFileAttach = async (file: AttachedFile) => {
    setProblemAttachment(file);
    setIsExtracting(true);
    
    try {
      const content = await extractTextFromFile(file.file);
      setProblemExtracted(content);
      setProblem(prev => prev ? `${prev}\n\n${content.text}` : content.text);
      toast.success("Dokument obdelan!");
    } catch (error) {
      console.error("Error extracting text:", error);
      toast.error("Napaka pri branju dokumenta.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSolutionFileAttach = async (file: AttachedFile) => {
    setSolutionAttachment(file);
    setIsExtracting(true);
    
    try {
      const content = await extractTextFromFile(file.file);
      setSolutionExtracted(content);
      setSolution(prev => prev ? `${prev}\n\n${content.text}` : content.text);
      toast.success("Dokument obdelan!");
    } catch (error) {
      console.error("Error extracting text:", error);
      toast.error("Napaka pri branju dokumenta.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCheck = async () => {
    if (!problem.trim() || !solution.trim()) {
      toast.error("Prosim, vnesi nalogo in svojo rešitev.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("check-work", {
        body: { problem, solution }
      });

      if (error) throw error;

      if (data) {
        setResult(data);
        toast.success("Preverjanje končano!");
      }
    } catch (error) {
      console.error("Error checking work:", error);
      toast.error("Napaka pri preverjanju.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Preveri moje delo</h2>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-foreground">Naloga *</Label>
            <AiFileAttachment
              attachedFile={problemAttachment}
              onFileAttach={handleProblemFileAttach}
              onFileRemove={() => {
                setProblemAttachment(null);
                setProblemExtracted(null);
              }}
              disabled={isLoading || isExtracting}
            />
          </div>
          
          {problemExtracted && (
            <DocumentPreview
              fileName={problemExtracted.fileName}
              fileType={problemExtracted.fileType}
              extractedText={problemExtracted.text}
              pageCount={problemExtracted.pageCount}
              imagePreview={problemAttachment?.preview}
            />
          )}
          
          <Textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Vpiši nalogo ali problem..."
            className="mt-2 min-h-[100px] bg-background text-foreground border-border"
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-foreground">Moja rešitev *</Label>
            <AiFileAttachment
              attachedFile={solutionAttachment}
              onFileAttach={handleSolutionFileAttach}
              onFileRemove={() => {
                setSolutionAttachment(null);
                setSolutionExtracted(null);
              }}
              disabled={isLoading || isExtracting}
            />
          </div>
          
          {solutionExtracted && (
            <DocumentPreview
              fileName={solutionExtracted.fileName}
              fileType={solutionExtracted.fileType}
              extractedText={solutionExtracted.text}
              pageCount={solutionExtracted.pageCount}
              imagePreview={solutionAttachment?.preview}
            />
          )}
          
          <Textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="Vpiši svojo rešitev..."
            className="mt-2 min-h-[100px] bg-background text-foreground border-border"
          />
        </div>

        <Button
          variant="hero"
          size="lg"
          onClick={handleCheck}
          disabled={!problem.trim() || !solution.trim() || isLoading || isExtracting}
          className="w-full shadow-glow-primary"
        >
          {isExtracting ? (
            <>Branje dokumenta...</>
          ) : isLoading ? (
            <>Preverjanje...</>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Preveri rešitev
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Result Header */}
      <div className={`rounded-2xl border p-6 ${
        result.is_correct 
          ? "bg-green-500/10 border-green-500/20" 
          : "bg-red-500/10 border-red-500/20"
      }`}>
        <div className="flex items-center gap-3 mb-3">
          {result.is_correct ? (
            <>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <h2 className="text-2xl font-bold text-green-500">Pravilno!</h2>
            </>
          ) : (
            <>
              <XCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-2xl font-bold text-red-500">Napačno</h2>
            </>
          )}
        </div>
        <p className="text-foreground">{result.feedback}</p>
      </div>

      {/* Correct Solution */}
      {!result.is_correct && (
        <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Pravilna rešitev</h3>
          </div>
          <div className="bg-muted rounded-xl p-4">
            <p className="text-foreground whitespace-pre-wrap">{result.correct_solution}</p>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-foreground">Razlaga</h3>
        </div>
        <p className="text-muted-foreground whitespace-pre-wrap">{result.explanation}</p>
      </div>

      {/* Practice Exercise */}
      <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Vaja za prakso</h3>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-foreground whitespace-pre-wrap">{result.practice_exercise}</p>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setResult(null);
          setProblem("");
          setSolution("");
          setProblemAttachment(null);
          setSolutionAttachment(null);
          setProblemExtracted(null);
          setSolutionExtracted(null);
        }}
      >
        Novo preverjanje
      </Button>
    </div>
  );
};

export default CheckWorkMode;
