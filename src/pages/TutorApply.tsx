import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap } from "lucide-react";

const SUBJECTS = [
  "Matematika", "Fizika", "Kemija", "Biologija", "Slovenščina",
  "Angleščina", "Nemščina", "Programiranje", "Računalništvo",
  "Ekonomija", "Statistika", "Ostalo"
];

export default function TutorApply() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    age: "",
    location: "",
    education_level: "",
    school_type: "",
    subjects: [] as string[],
    mode: "",
    price_per_hour: "",
    bio: "",
    experience: "",
    languages: [] as string[],
    methodology: "",
    video_url: "",
    video_file_url: "",
    discount_info: "",
  });
  const [videoTab, setVideoTab] = useState<'url' | 'file'>('url');
  const [videoUploading, setVideoUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));

      // Pre-fill name from profile
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) {
            setFormData(prev => ({ ...prev, full_name: data.full_name }));
          }
        });
    }
  }, [user]);

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleLanguageToggle = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }));
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setVideoUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `video_${user.id}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('tutor-videos').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) {
      toast({ title: 'Napaka pri nalaganju videa', description: uploadError.message, variant: 'destructive' });
      setVideoUploading(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('tutor-videos').getPublicUrl(filePath);
    setFormData(prev => ({ ...prev, video_file_url: publicUrlData.publicUrl }));
    setVideoUploading(false);
    toast({ title: 'Video uspešno naložen!', description: 'Video je bil naložen in bo dodan k tvojemu profilu.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validation
    if (!formData.full_name || !formData.email || !formData.education_level || 
        !formData.school_type || formData.subjects.length === 0 || 
        !formData.mode || !formData.price_per_hour || !formData.bio) {
      toast({
        title: "Napaka",
        description: "Prosim izpolni vsa obvezna polja.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const methodologyArray = formData.methodology
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
      const { error } = await supabase.from("tutor_applications").insert({
        user_id: user.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        age: formData.age ? parseInt(formData.age) : null,
        location: formData.location || null,
        education_level: formData.education_level,
        school_type: formData.school_type,
        subjects: formData.subjects,
        price_per_hour: parseFloat(formData.price_per_hour),
        mode: formData.mode,
        bio: formData.bio,
        experience: formData.experience || null,
        languages: formData.languages,
        methodology: methodologyArray,
        video_url: videoTab === 'url' ? formData.video_url : '',
        video_file_url: videoTab === 'file' ? formData.video_file_url : '',
        discount_info: formData.discount_info,
      });

      if (error) throw error;

      toast({
        title: "Uspešno poslano!",
        description: "Tvoja prijava je bila poslana. Kontaktirali te bomo po emailu.",
      });

      setTimeout(() => navigate("/tutors"), 2000);
    } catch (error: any) {
      toast({
        title: "Napaka",
        description: error.message || "Pri pošiljanju prijave je prišlo do napake.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Postani inštruktor na Študku</h1>
          <p className="text-muted-foreground text-lg">
            Izpolni podatke in prijavi se kot inštruktor. Pregledali bomo tvojo prijavo in te obvestili.
          </p>
        </div>

        {/* Form Card */}
        <Card className="rounded-2xl bg-card/95 backdrop-blur-sm shadow-2xl border-primary/20">
          <CardHeader>
            <CardTitle>Podatki o tebi</CardTitle>
            <CardDescription>Izpolni vse obvezne podatke</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Ime in priimek *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefonska številka</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Starost</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lokacija</Label>
                <Input
                  id="location"
                  placeholder="npr. Ljubljana"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              {/* Education */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="education_level">Izobrazba / status *</Label>
                  <Select value={formData.education_level} onValueChange={(val) => setFormData({ ...formData, education_level: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izberi..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dijak">Dijak</SelectItem>
                      <SelectItem value="Študent">Študent</SelectItem>
                      <SelectItem value="Diplomant">Diplomant</SelectItem>
                      <SelectItem value="Profesor">Profesor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school_type">Vrsta šole, pri kateri lahko pomagaš *</Label>
                  <Select value={formData.school_type} onValueChange={(val) => setFormData({ ...formData, school_type: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izberi..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Osnovna šola removed */}
                      <SelectItem value="Srednja šola">Srednja šola</SelectItem>
                      <SelectItem value="Faks">Faks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subjects */}
              <div className="space-y-2">
                <Label>Predmeti, ki jih poučuješ *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {SUBJECTS.map((subject) => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={subject}
                        checked={formData.subjects.includes(subject)}
                        onCheckedChange={() => handleSubjectToggle(subject)}
                      />
                      <label htmlFor={subject} className="text-sm cursor-pointer">
                        {subject}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jeziki */}
              <div className="space-y-2">
                <Label>Jeziki poučevanja</Label>
                <div className="flex gap-4 flex-wrap mt-2">
                  {["Slovenščina", "Angleščina", "Nemščina"].map((lang) => (
                    <div key={lang} className="flex items-center space-x-2">
                      <Checkbox
                        id={lang}
                        checked={formData.languages.includes(lang)}
                        onCheckedChange={() => handleLanguageToggle(lang)}
                      />
                      <label htmlFor={lang} className="text-sm cursor-pointer">{lang}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metodologija dela */}
              <div className="space-y-2">
                <Label htmlFor="methodology">Metodologija dela</Label>
                <Textarea
                  id="methodology"
                  placeholder="Na kratko opiši, kako poteka tvoja razlaga, pristop, priprava na uro ..."
                  value={formData.methodology}
                  onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                  rows={3}
                />
              </div>


              {/* Video sekcija z tabs/toggle */}
              <div className="space-y-2">
                <Label>Predstavitveni video</Label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setVideoTab('url')} className={`px-3 py-1 rounded-l-lg border border-primary/40 flex items-center gap-1 ${videoTab === 'url' ? 'bg-primary text-white' : 'bg-card text-primary'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2z" /></svg>
                    Prilepi YouTube URL
                  </button>
                  <button type="button" onClick={() => setVideoTab('file')} className={`px-3 py-1 rounded-r-lg border border-primary/40 flex items-center gap-1 ${videoTab === 'file' ? 'bg-primary text-white' : 'bg-card text-primary'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828L18 9.828M7 7h.01" /></svg>
                    Naloži video
                  </button>
                </div>
                {videoTab === 'url' && (
                  <div className="flex items-center gap-2">
                    <Input
                      id="video_url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2 2z" /></svg></span>
                  </div>
                )}
                {videoTab === 'file' && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="video_file" className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-primary/30 rounded-lg bg-card hover:bg-primary/10 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828L18 9.828M7 7h.01" /></svg>
                      <span>{formData.video_file_url ? 'Video naložen' : 'Izberi video datoteko'}</span>
                      <Input
                        id="video_file"
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleVideoFileChange}
                        disabled={videoUploading}
                      />
                    </label>
                    {videoUploading && <span className="text-xs text-primary animate-pulse">Nalagam...</span>}
                    {formData.video_file_url && <a href={formData.video_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 underline ml-2">Poglej video</a>}
                  </div>
                )}
              </div>

              {/* Popust */}
              <div className="space-y-2">
                <Label htmlFor="discount_info">Posebna ponudba/Popust</Label>
                <Input
                  id="discount_info"
                  placeholder="npr. Prva ura brezplačno"
                  value={formData.discount_info}
                  onChange={(e) => setFormData({ ...formData, discount_info: e.target.value })}
                />
              </div>

              {/* Mode & Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mode">Način *</Label>
                  <Select value={formData.mode} onValueChange={(val) => setFormData({ ...formData, mode: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izberi..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="V živo">V živo</SelectItem>
                      <SelectItem value="Online + v živo">Online + v živo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_per_hour">Cena na uro (€) *</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    step="0.01"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Bio & Experience */}
              <div className="space-y-2">
                <Label htmlFor="bio">Kratek opis o tebi *</Label>
                <Textarea
                  id="bio"
                  placeholder="Kdo si, kako razlagaš snov..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Izkušnje z inštruiranjem</Label>
                <Textarea
                  id="experience"
                  placeholder="Opiši svoje izkušnje..."
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitting}
              >
                {submitting ? "Pošiljam..." : "Pošlji prijavo"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
