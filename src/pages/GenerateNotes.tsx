import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Sparkles, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const subjects = [
  "Matematika", "Fizika", "Kemija", "Biologija", "Slovenščina", 
  "Angleščina", "Informatika", "Zgodovina", "Geografija", "Ekonomija", "Ostalo"
];

const grades = [
  "6. razred", "7. razred", "8. razred", "9. razred",
  "1. letnik", "2. letnik", "3. letnik", "4. letnik",
  "1. leto (Fakulteta)", "2. leto (Fakulteta)", "3. leto (Fakulteta)", "4. leto (Fakulteta)"
];

const GenerateNotes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!subject || !grade || !topic) {
      toast.error("Prosim izpolni vsa polja");
      return;
    }

    if (!user) {
      toast.error("Prijaviti se moraš za generiranje zapiskov");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-notes', {
        body: { subject, grade, topic }
      });

      if (error) throw error;

      setGeneratedNotes(data.notes);
      toast.success("Zapiski uspešno generirani!");
    } catch (error) {
      console.error('Error generating notes:', error);
      toast.error("Napaka pri generiranju zapiskov");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !generatedNotes) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('notes').insert({
        author_id: user.id,
        title: `${subject} - ${topic}`,
        description: `AI generirani zapiski za ${grade}`,
        subject,
        level: grade,
        type: 'Povzetek',
        school_type: grade.includes('Fakulteta') ? 'Fakulteta' : grade.includes('letnik') ? 'Gimnazija' : '',
        price: 0,
        file_url: generatedNotes, // Store as text content
      });

      if (error) throw error;

      toast.success("Zapiski shranjeni!");
      navigate('/notes');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error("Napaka pri shranjevanju zapiskov");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-primary text-white px-6 py-2 rounded-full mb-6">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">AI Generiranje Zapiskov</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              Ustvari zapiske z AI
            </h1>
            <p className="text-lg text-muted-foreground">
              Vpiši temo in AI bo ustvaril popolne zapiske za učenje
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Input Form */}
            <Card className="p-8 bg-white/90 dark:bg-slate-800/90 shadow-2xl rounded-2xl">
              <h2 className="text-2xl font-bold mb-6">Vnesi podatke</h2>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="subject">Predmet</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izberi predmet" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grade">Stopnja/Letnik</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izberi stopnjo" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="topic">Tema</Label>
                  <Input
                    id="topic"
                    placeholder="Npr: Trigonometrija, Fotosinteza, Napoleonovo obdobje..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generating || !subject || !grade || !topic}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generiram...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generiraj zapiske
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Generated Notes Preview */}
            <Card className="p-8 bg-white/90 dark:bg-slate-800/90 shadow-2xl rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Generirani zapiski</h2>
                {generatedNotes && (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    variant="outline"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Shrani
                      </>
                    )}
                  </Button>
                )}
              </div>

              {generatedNotes ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Textarea
                    value={generatedNotes}
                    onChange={(e) => setGeneratedNotes(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Tukaj se bodo pojavili generirani zapiski</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GenerateNotes;