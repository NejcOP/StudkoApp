import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SUBJECTS = [
  "Matematika", "Fizika", "Kemija", "Biologija", "Slovenščina",
  "Angleščina", "Nemščina", "Programiranje", "Računalništvo",
  "Ekonomija", "Statistika", "Ostalo"
];

const TutorManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
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
    profile_image_url: "",
  });
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadTutorProfile();
  }, [user]);

  const loadTutorProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tutors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No tutor profile found
          toast.error('Nimaš profila tutorja. Prijavi se kot tutor.');
          navigate('/tutors/apply');
        } else {
          throw error;
        }
        return;
      }

      setTutor(data);
      
      // Pre-fill form data
      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
        age: data.age?.toString() || "",
        location: data.location || "",
        education_level: data.education_level || "",
        school_type: data.school_type || "",
        subjects: data.subjects || [],
        mode: data.mode || "",
        price_per_hour: data.price_per_hour?.toString() || "",
        bio: data.bio || "",
        experience: data.experience || "",
        languages: data.languages || [],
        methodology: data.methodology || "",
        video_url: data.video_url || "",
        profile_image_url: data.profile_image_url || "",
      });
    } catch (error) {
      console.error('Error loading tutor profile:', error);
      toast.error('Napaka pri nalaganju profila');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Prosim naloži sliko (JPG, PNG, itd.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Slika je prevelika. Maksimalna velikost je 5MB.');
      return;
    }

    setImageUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      // Delete old image if exists
      if (formData.profile_image_url) {
        const oldPath = formData.profile_image_url.split('/tutor-profiles/')[1];
        if (oldPath) {
          await supabase.storage.from('tutor-profiles').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('tutor-profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('tutor-profiles')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, profile_image_url: publicUrlData.publicUrl }));
      toast.success('Profilna slika uspešno naložena!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Napaka pri nalaganju slike');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('tutors')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          age: parseInt(formData.age),
          location: formData.location,
          education_level: formData.education_level,
          school_type: formData.school_type,
          subjects: formData.subjects,
          mode: formData.mode,
          price_per_hour: parseFloat(formData.price_per_hour),
          bio: formData.bio,
          experience: formData.experience,
          languages: formData.languages,
          methodology: formData.methodology,
          video_url: formData.video_url || null,
          profile_image_url: formData.profile_image_url || null,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Profil uspešno posodobljen!');
      loadTutorProfile(); // Reload to get fresh data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Napaka pri posodabljanju profila');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Navigation />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tutor) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Uredi profil
            </h1>
            <p className="text-muted-foreground">
              Posodobi svoje podatke in informacije
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Uredi svoj profil</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveChanges} className="space-y-6">
                    {/* Profilna slika */}
                    <div className="space-y-2">
                      <Label>Profilna slika</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="w-24 h-24">
                          <AvatarImage src={formData.profile_image_url} />
                          <AvatarFallback>
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Label htmlFor="profile-image-edit" className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors border border-input w-fit">
                              {imageUploading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Nalaganje...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  Naloži sliko
                                </>
                              )}
                            </div>
                          </Label>
                          <Input
                            id="profile-image-edit"
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImageChange}
                            disabled={imageUploading}
                            className="hidden"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG ali GIF. Maksimalno 5MB.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Osnovni podatki */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Osnovni podatki</h3>
                      
                      <div className="grid gap-4 md:grid-cols-2">
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

                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefon *</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="age">Starost *</Label>
                          <Input
                            id="age"
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location">Lokacija *</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Izobrazba */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Izobrazba</h3>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="education_level">Stopnja izobrazbe *</Label>
                          <Select
                            value={formData.education_level}
                            onValueChange={(value) => setFormData({ ...formData, education_level: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Izberi stopnjo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Srednja šola">Srednja šola</SelectItem>
                              <SelectItem value="Višja šola">Višja šola</SelectItem>
                              <SelectItem value="Dodiplomski študij">Dodiplomski študij</SelectItem>
                              <SelectItem value="Magistrski študij">Magistrski študij</SelectItem>
                              <SelectItem value="Doktorski študij">Doktorski študij</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="school_type">Tip šole *</Label>
                          <Select
                            value={formData.school_type}
                            onValueChange={(value) => setFormData({ ...formData, school_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Izberi tip" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Osnovna šola">Osnovna šola</SelectItem>
                              <SelectItem value="Gimnazija">Gimnazija</SelectItem>
                              <SelectItem value="Srednja strokovna šola">Srednja strokovna šola</SelectItem>
                              <SelectItem value="Univerza">Univerza</SelectItem>
                              <SelectItem value="Fakulteta">Fakulteta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Predmeti */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Predmeti ki jih poučujem *</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {SUBJECTS.map((subject) => (
                          <div key={subject} className="flex items-center space-x-2">
                            <Checkbox
                              id={subject}
                              checked={formData.subjects.includes(subject)}
                              onCheckedChange={() => handleSubjectToggle(subject)}
                            />
                            <Label htmlFor={subject} className="font-normal cursor-pointer">
                              {subject}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Način poučevanja */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Način poučevanja</h3>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="mode">Način *</Label>
                          <Select
                            value={formData.mode}
                            onValueChange={(value) => setFormData({ ...formData, mode: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Izberi način" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Online">Online</SelectItem>
                              <SelectItem value="V živo">V živo</SelectItem>
                              <SelectItem value="Oba">Oba</SelectItem>
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
                    </div>

                    {/* Biografija in izkušnje */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">O meni</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">Kratek opis *</Label>
                        <Textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          rows={4}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experience">Izkušnje *</Label>
                        <Textarea
                          id="experience"
                          value={formData.experience}
                          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                          rows={4}
                          required
                        />
                      </div>
                    </div>

                    {/* Jeziki */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Jeziki</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {["Slovenščina", "Angleščina", "Nemščina", "Hrvaščina", "Srbščina"].map((language) => (
                          <div key={language} className="flex items-center space-x-2">
                            <Checkbox
                              id={`lang-${language}`}
                              checked={formData.languages.includes(language)}
                              onCheckedChange={() => handleLanguageToggle(language)}
                            />
                            <Label htmlFor={`lang-${language}`} className="font-normal cursor-pointer">
                              {language}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metodologija */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Dodatne informacije</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="methodology">Metodologija poučevanja</Label>
                        <Textarea
                          id="methodology"
                          value={formData.methodology}
                          onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="video_url">Video predstavitev (URL)</Label>
                        <Input
                          id="video_url"
                          type="url"
                          value={formData.video_url}
                          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Shranjujem...
                        </>
                      ) : (
                        "Shrani spremembe"
                      )}
                    </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TutorManagement;