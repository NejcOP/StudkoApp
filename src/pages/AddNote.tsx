import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArrowLeft, Upload, FileText, Camera, X, Sparkles, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AddNote = () => {
  const navigate = useNavigate();
  // --- STATE: must be at the top ---
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    noteType: "",
    schoolType: "",
    schoolName: "",
    price: "",
  });
  const [fetchedSchools, setFetchedSchools] = useState<any[]>([]);
  const [fetchedSubjects, setFetchedSubjects] = useState<any[]>([]);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasPayoutSetup, setHasPayoutSetup] = useState<boolean | null>(null);
  const [checkingPayout, setCheckingPayout] = useState(true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Safe fetching of schools and subjects when schoolType changes
  useEffect(() => {
    if (!formData?.schoolType) {
      setFetchedSchools([]);
      setFetchedSubjects([]);
      return;
    }
    const fetchData = async () => {
      try {
        const { data: schools, error: schoolsError } = await supabase
          .from('schools')
          .select('name')
          .eq('type', formData.schoolType.toLowerCase())
          .order('name');
        if (schoolsError) {
          console.error('Supabase schools error:', schoolsError);
          setFetchedSchools([]);
        } else {
          setFetchedSchools(schools || []);
        }
        const { data: subjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('name')
          .eq('school_type', formData.schoolType.toLowerCase())
          .order('name');
        if (subjectsError) {
          console.error('Supabase subjects error:', subjectsError);
          setFetchedSubjects([]);
        } else {
          setFetchedSubjects(subjects || []);
        }
      } catch (err) {
        console.error('Supabase fetch error:', err);
        setFetchedSchools([]);
        setFetchedSubjects([]);
      }
    };
    fetchData();
  }, [formData.schoolType]);

  // Subject options based on school type
  const getSubjectOptions = (schoolType: string) => {
    switch (schoolType) {
      // removed Osnovna šola
      case "Gimnazija":
        return ["Slovenščina", "Matematika", "Angleščina", "Nemščina", "Francoščina", "Italijanščina", "Fizika", "Kemija", "Biologija", "Zgodovina", "Geografija", "Sociologija", "Psihologija", "Filozofija", "Informatika", "Šport", "Ostalo"];
      case "Srednja strokovna":
        return ["Slovenščina", "Matematika", "Angleščina", "Fizika", "Kemija", "Biologija", "Zgodovina", "Geografija", "Informatika", "Strokovni predmet 1", "Strokovni predmet 2", "Praksa", "Ostalo"];
      case "Poklicna":
        return ["Slovenščina", "Matematika", "Angleščina", "Informatika", "Strokovni predmet 1", "Strokovni predmet 2", "Praksa", "Ostalo"];
      case "Fakulteta":
        return ["Matematika", "Programiranje", "Računalništvo", "Ekonomija", "Pravo", "Medicina", "Strojništvo", "Elektrotehnika", "Psihologija", "Pedagogika", "Statistika", "Ostalo"];
      default:
        return [];
    }
  };

  const subjectOptions = getSubjectOptions(formData.schoolType);

  // Check payout setup on mount - requires completed Stripe onboarding
  useEffect(() => {
    const checkPayoutSetup = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_onboarding_complete")
          .eq("id", user.id)
          .single();

        // User can publish if they have completed Stripe onboarding
        setHasPayoutSetup(!!profile?.stripe_onboarding_complete);
      } catch (error) {
        console.error("Error checking payout setup:", error);
      } finally {
        setCheckingPayout(false);
      }
    };

    checkPayoutSetup();
  }, [navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImageFiles([...imageFiles, ...newFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title || !formData.subject || !formData.noteType || !formData.schoolType) {
      toast({
        title: "Napaka",
        description: "Prosim izpolni vsa obvezna polja.",
        variant: "destructive",
      });
      return;
    }

    // Block paid notes if payout not set up
    const isPaidNote = parseFloat(formData.price) > 0;
    if (isPaidNote && !hasPayoutSetup) {
      toast({
        title: "Nastavi podatke za izplačila",
        description: "Za prodajo zapiskov moraš najprej nastaviti podatke za izplačila v profilu.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Napaka",
          description: "Moraš biti prijavljen za dodajanje zapiskov.",
          variant: "destructive",
        });
        navigate("/auth/login");
        return;
      }

      // Ensure profile exists (create if doesn't exist)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || "Študent"
          });
      }

      // Insert note into database
      let fileUrls: string[] = [];
      console.log('📂 Starting file upload - PDF:', !!pdfFile, 'Images:', imageFiles.length);
      
      // Upload PDF if exists
      if (pdfFile) {
        console.log('📄 Uploading PDF:', pdfFile.name);
        const pdfPath = `notes/${user.id}/${Date.now()}_${pdfFile.name}`;
        const { data: pdfData, error: pdfUploadError } = await supabase.storage
          .from('notes')
          .upload(pdfPath, pdfFile);
        
        if (pdfUploadError) {
          console.error('❌ PDF upload error:', pdfUploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('notes')
            .getPublicUrl(pdfPath);
          console.log('✅ PDF uploaded:', publicUrl);
          fileUrls.push(publicUrl);
        }
      }
      
      // Upload all images
      if (imageFiles.length > 0) {
        console.log(`🖼️ Uploading ${imageFiles.length} images...`);
        for (const imageFile of imageFiles) {
          const imagePath = `notes/${user.id}/${Date.now()}_${imageFile.name}`;
          const { data: imageData, error: imageUploadError } = await supabase.storage
            .from('notes')
            .upload(imagePath, imageFile);
          
          if (imageUploadError) {
            console.error('Image upload error:', imageUploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('notes')
              .getPublicUrl(imagePath);
            fileUrls.push(publicUrl);
          }
          
          // Small delay to avoid timestamp collisions
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      console.log('💾 Total file URLs to save:', fileUrls);

      const { error: insertError, data: insertedNote } = await supabase
        .from("notes")
        .insert({
          author_id: user.id,
          title: formData.title,
          description: formData.description || null,
          subject: formData.subject,
          level: formData.schoolType,
          type: formData.noteType,
          school_type: formData.schoolType,
          price: formData.price ? parseFloat(formData.price) : 0,
          file_url: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        })
        .select();

      console.log('💾 Insert result - Error:', insertError, 'Data:', insertedNote);

      if (insertError) {
        console.error("Insert error details:", {
          error: insertError,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        throw insertError;
      }

      if (!insertedNote || insertedNote.length === 0) {
        console.error("Note inserted but no data returned");
        throw new Error("Zapisek ni bil ustvarjen");
      }

      console.log("Note successfully inserted:", insertedNote);

      // Only create notification if insert was successful
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'note_published',
            title: '✅ Zapisek uspešno objavljen!',
            message: `Tvoj zapisek "${formData.title}" je sedaj viden vsem uporabnikom. ${isPaidNote ? `Cena: €${formData.price}` : 'Brezplačen zapisek'}`,
            data: {
              note_title: formData.title,
              price: formData.price ? parseFloat(formData.price) : 0,
              subject: formData.subject,
              school_type: formData.schoolType
            }
          });
      } catch (notifError) {
        // Don't fail the whole operation if notification fails
        console.error("Notification error:", notifError);
      }

      toast({
        title: "Uspešno!",
        description: "Tvoj zapisek je bil objavljen.",
      });

      // Clear cached notes so profile refreshes
      try {
        sessionStorage.removeItem(`my_notes_${user.id}`);
        sessionStorage.removeItem(`profile_${user.id}`);
        sessionStorage.removeItem('notes_cache'); // Clear all notes cache too
        console.log("Cache cleared after note publish");
      } catch (err) {
        console.error("Error clearing cache:", err);
      }

      navigate("/notes");
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Napaka",
        description: "Pri shranjevanju je prišlo do napake. Poskusi ponovno.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Nazaj
        </button>

        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-hero rounded-3xl p-12 mb-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white mb-3">
                Dodaj nove zapiske
              </h1>
              <p className="text-white/90 text-lg max-w-2xl mx-auto">
                Naloži svoje zapiske v PDF-ju ali fotografije iz zvezka in začni zaslužiti
              </p>
            </div>
          </div>

          {/* Payout Warning for Paid Notes */}
          {!checkingPayout && !hasPayoutSetup && parseFloat(formData.price) > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-2">
                    Za prodajo zapiskov dokončaj Stripe onboarding
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                    Pojdi na profil in klikni "Nastavi Stripe izplačila" za dokončanje nastavitve.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/profile")}
                    className="border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                  >
                    Odpri profil
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LEFT SIDE - Note Information */}
              <div className="bg-gradient-card rounded-2xl p-8 border border-border shadow-xl space-y-6">
                <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  Informacije o zapiskah
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Naslov *
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="npr. Matematika - zapiski za maturo 2025"
                    value={formData.title}
                    onChange={handleChange}
                    className="h-12 rounded-xl border-2 focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Kratek opis *
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Opiši, kaj vsebujejo tvoji zapiski in komu so namenjeni..."
                    value={formData.description}
                    onChange={handleChange}
                    className="min-h-32 rounded-xl border-2 resize-none focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolType" className="text-sm font-medium">
                    Vrsta šole *
                  </Label>
                  <Select
                    value={formData.schoolType}
                    onValueChange={(value) => {
                      setFormData({ ...formData, schoolType: value, subject: "" });
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-2">
                      <SelectValue placeholder="Izberi vrsto šole" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {/* Osnovna šola removed */}
                      <SelectItem value="Gimnazija">Gimnazija</SelectItem>
                      <SelectItem value="Srednja strokovna">Srednja strokovna</SelectItem>
                      <SelectItem value="Poklicna">Poklicna</SelectItem>
                      <SelectItem value="Fakulteta">Fakulteta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolName" className="text-sm font-medium">
                    Ime šole *
                  </Label>
                  <Select
                    value={formData.schoolName}
                    onValueChange={(value) => setFormData({ ...formData, schoolName: value })}
                    disabled={!formData.schoolType || fetchedSchools.length === 0}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-2">
                      <SelectValue placeholder={formData.schoolType ? (fetchedSchools.length ? "Izberi šolo" : "Ni šol za to vrsto") : "Najprej izberi vrsto šole"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {fetchedSchools.map((school) => (
                        <SelectItem key={school.name} value={school.name}>{school.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm font-medium">
                    Predmet *
                  </Label>
                  <Select
                    value={fetchedSubjects.map(s => s.name).includes(formData.subject) ? formData.subject : "__custom"}
                    onValueChange={(value) => {
                      if (value === "__custom") return;
                      setFormData({ ...formData, subject: value });
                    }}
                    disabled={!formData.schoolType || fetchedSubjects.length === 0}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-2">
                      <SelectValue placeholder={formData.schoolType ? (fetchedSubjects.length ? "Izberi predmet ali vpiši svojega spodaj" : "Ni predmetov za to vrsto") : "Najprej izberi vrsto šole"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {fetchedSubjects.map((subject) => (
                        <SelectItem key={subject.name} value={subject.name}>{subject.name}</SelectItem>
                      ))}
                      <SelectItem value="__custom" disabled>—</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Custom input for subject if not in list */}
                  {formData.schoolType && !fetchedSubjects.map(s => s.name).includes(formData.subject) && (
                    <input
                      type="text"
                      className="w-full p-3 mt-2 bg-[#1a1b23] border border-gray-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Vpiši predmet"
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="noteType" className="text-sm font-medium">
                    Tip zapiskov *
                  </Label>
                  <Select
                    value={formData.noteType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, noteType: value })
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl border-2">
                      <SelectValue placeholder="Izberi tip zapiskov" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="Matura">Matura</SelectItem>
                      <SelectItem value="Test">Test</SelectItem>
                      <SelectItem value="Spraševanje">Spraševanje</SelectItem>
                      <SelectItem value="Kolokvij">Kolokvij</SelectItem>
                      <SelectItem value="Izpit">Izpit</SelectItem>
                      <SelectItem value="Povzetek">Povzetek</SelectItem>
                      <SelectItem value="Rešene naloge">Rešene naloge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-medium">
                    Cena (€) *
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={handleChange}
                    className="h-12 rounded-xl border-2 focus:border-primary"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    0 = brezplačno
                  </p>
                </div>
              </div>

              {/* RIGHT SIDE - Upload Section */}
              <div className="space-y-6">
                <div className="bg-gradient-card rounded-2xl p-8 border-2 border-primary/20 shadow-xl space-y-6">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Upload className="w-6 h-6 text-primary" />
                    Naloži svoje zapiske
                  </h2>

                  {/* PDF Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      PDF zapiskov
                    </Label>
                    <input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="flex items-center justify-center gap-3 h-40 border-3 border-dashed border-primary/30 rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity"></div>
                      {pdfFile ? (
                        <div className="text-center relative z-10">
                          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow-primary">
                            <FileText className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-sm font-semibold text-foreground mb-1">
                            {pdfFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Klikni za spremembo
                          </p>
                        </div>
                      ) : (
                        <div className="text-center relative z-10">
                          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-sm font-semibold text-foreground mb-1">
                            Naloži PDF zapiskov
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Povleci datoteko ali klikni za izbiro
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Camera className="w-4 h-4 text-accent" />
                      Fotografije zapiskov (iz zvezka)
                    </Label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center justify-center gap-3 h-40 border-3 border-dashed border-accent/30 rounded-2xl cursor-pointer hover:border-accent hover:bg-accent/5 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-accent to-primary opacity-0 group-hover:opacity-5 transition-opacity"></div>
                      <div className="text-center relative z-10">
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/10 transition-colors">
                          <Camera className="w-8 h-8 text-muted-foreground group-hover:text-accent transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">
                          Naloži fotografije svojih zapiskov
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG - lahko dodaš več slik
                        </p>
                      </div>
                    </label>

                    {/* Image Preview Grid */}
                    {imageFiles.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 p-4 bg-secondary/30 rounded-xl">
                        {imageFiles.map((file, index) => (
                          <div
                            key={index}
                            className="relative group aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-accent transition-colors"
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 w-6 h-6 bg-destructive/90 hover:bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-white text-xs truncate">
                                {file.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      💡 <strong>Nasvet:</strong> Lahko naložiš samo PDF, samo slike, ali oboje skupaj. Slike se bodo samodejno pretvorile v PDF format.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex gap-4">
              <Button
                type="button"
                variant="outline"
                size="xl"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Prekliči
              </Button>
              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="flex-1 shadow-glow-primary"
                disabled={loading || (!hasPayoutSetup && parseFloat(formData.price) > 0)}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Shranjujem...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Objavi zapiske
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AddNote;