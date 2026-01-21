import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Image as ImageIcon, X, Sparkles, Brain, Layers, FileText as SummaryIcon, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface DetectedInfo {
  subject: string;
  grade: string;
  type: string;
  extracted_text: string;
}

interface UploadModeProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onAction: (action: string, text: string) => void;
}

export const UploadMode = ({ isLoading, setIsLoading, onAction }: UploadModeProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [detectedInfo, setDetectedInfo] = useState<DetectedInfo | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast.error("Prosim, naloži datoteko.");
      return;
    }

    setIsLoading(true);
    setDetectedInfo(null);

    // Simulate analysis - in real implementation, send files to API
    setTimeout(() => {
      setDetectedInfo({
        subject: "Matematika",
        grade: "Srednja šola",
        type: "Formule",
        extracted_text: "Tu bi bil ekstrairan tekst iz dokumenta. V pravi implementaciji bi AI analiziral naloženo datoteko in ekstrahiral vsebino za nadaljnjo obdelavo."
      });
      setIsLoading(false);
      toast.success("Analiza končana!");
    }, 2000);
  };

  const actions = [
    { id: "explain", label: "Razloži", icon: <Brain className="w-4 h-4" /> },
    { id: "flashcards", label: "Naredi Flashcards", icon: <Layers className="w-4 h-4" /> },
    { id: "summary", label: "Povzemi", icon: <SummaryIcon className="w-4 h-4" /> },
    { id: "quiz", label: "Generiraj Quiz", icon: <HelpCircle className="w-4 h-4" /> },
  ];

  if (detectedInfo) {
    return (
      <div className="space-y-4">
        {/* Detected Info */}
        <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Zaznano</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDetectedInfo(null);
                setFiles([]);
              }}
            >
              Nova datoteka
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Predmet</p>
              <p className="font-semibold text-foreground">{detectedInfo.subject}</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Stopnja</p>
              <p className="font-semibold text-foreground">{detectedInfo.grade}</p>
            </div>
            <div className="bg-muted rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Vrsta</p>
              <p className="font-semibold text-foreground">{detectedInfo.type}</p>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-4 mb-4">
            <Label className="text-muted-foreground text-xs mb-2 block">Ekstrahiran tekst</Label>
            <p className="text-foreground text-sm max-h-32 overflow-y-auto">
              {detectedInfo.extracted_text}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="gap-2"
                onClick={() => onAction(action.id, detectedInfo.extracted_text)}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
      <h2 className="text-2xl font-bold text-foreground mb-4">Naloži datoteko</h2>
      <p className="text-muted-foreground mb-6">
        Naloži sliko, PDF ali dokument. AI bo zaznal predmet, stopnjo in tip vsebine.
      </p>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/50 hover:border-primary/50 transition-colors mb-4">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="upload-file"
        />
        <label htmlFor="upload-file" className="cursor-pointer flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Izberi datoteke</p>
            <p className="text-sm text-muted-foreground">PDF, DOC, slike (max 10MB)</p>
          </div>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 mb-4">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {file.type.startsWith("image/") ? (
                <ImageIcon className="w-5 h-5 text-primary" />
              ) : (
                <FileText className="w-5 h-5 text-primary" />
              )}
              <span className="flex-1 truncate text-foreground text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="hero"
        size="lg"
        onClick={handleAnalyze}
        disabled={files.length === 0 || isLoading}
        className="w-full shadow-glow-primary"
      >
        {isLoading ? (
          <>Analiziram...</>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Analiziraj datoteko
          </>
        )}
      </Button>
    </div>
  );
};

export default UploadMode;
