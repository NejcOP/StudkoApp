import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, FileUp, Loader2, Download, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface ImproveModeProps {
  onClose?: () => void;
}

export const ImproveMode = ({ onClose }: ImproveModeProps) => {
  const [originalText, setOriginalText] = useState("");
  const [improvedText, setImprovedText] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImprove = async () => {
    if (!originalText.trim()) {
      toast.error("Prosim vnesi besedilo za izboljšanje");
      return;
    }

    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-notes', {
        body: { content: originalText }
      });

      if (error) throw error;

      if (data?.improved) {
        setImprovedText(data.improved);
        toast.success("Besedilo uspešno izboljšano!");
      } else {
        throw new Error("Ni prejeto izboljšano besedilo");
      }
    } catch (error: any) {
      console.error('Error improving text:', error);
      toast.error(error.message || "Napaka pri izboljšavi besedila");
    } finally {
      setIsImproving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(improvedText);
      setCopied(true);
      toast.success("Kopirano v odložišče!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Napaka pri kopiranju");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([improvedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'izboljsano-besedilo.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Datoteka prenesena!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Izboljšaj zapisek
          </h2>
          <p className="text-muted-foreground mt-1">
            AI bo izboljšal strukturo, jasnost in slovnico tvojega besedila
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Text */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Originalno besedilo
              </h3>
              <span className="text-sm text-muted-foreground">
                {originalText.length} znakov
              </span>
            </div>
            <Textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Prilepi ali vpiši besedilo, ki ga želiš izboljšati..."
              className="min-h-[400px] resize-none font-mono text-sm"
              disabled={isImproving}
            />
            <Button
              onClick={handleImprove}
              disabled={!originalText.trim() || isImproving}
              className="w-full gap-2"
            >
              {isImproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Izboljšujem...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Izboljšaj besedilo
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Improved Text */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Izboljšano besedilo
              </h3>
              {improvedText && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Kopirano
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Kopiraj
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Prenesi
                  </Button>
                </div>
              )}
            </div>
            {improvedText ? (
              <div className="min-h-[400px] p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap">
                {improvedText}
              </div>
            ) : (
              <div className="min-h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Izboljšano besedilo se bo prikazalo tukaj</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tips */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Nasveti za najboljše rezultate
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Vključi čim več konteksta in podrobnosti</li>
          <li>AI bo izboljšal strukturo, dodal naslove in oštevilčil točke</li>
          <li>Slovnične napake in tipkarske napake bodo avtomatsko popravljene</li>
          <li>Besedilo bo postalo bolj jasno in razumljivo</li>
        </ul>
      </Card>
    </div>
  );
};

export default ImproveMode;
