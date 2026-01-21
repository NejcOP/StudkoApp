import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SellerBadge } from "@/components/SellerBadge";
import {
  Search,
  Sparkles,
  Plus,
  FileText,
  Loader2,
  User,
  Calendar,
  Lock,
  Award,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useProAccess } from "@/hooks/useProAccess";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  improved_file_url: string | null;
  subject: string;
  level: string;
  type: string;
  school_type: string;
  school_id: string | null;
  price: number;
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string;
  };
  seller_stats?: {
    total_sales: number;
    average_rating: number;
    total_notes: number;
    is_verified: boolean;
  } | null;
}

const Notes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasProAccess, checkingAccess } = useProAccess();
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [noteType, setNoteType] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schools, setSchools] = useState<{ id: string; name: string; type: string }[]>([]);
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("");
  const [fileType, setFileType] = useState("all");
  const [language, setLanguage] = useState("all");
  const [noteLength, setNoteLength] = useState("all");
  const [noteRating, setNoteRating] = useState("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [notes, setNotes] = useState<Note[]>(() => {
    // Try to load cached notes
    try {
      const cached = sessionStorage.getItem('notes_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (err) {
      console.error('Error reading cached notes:', err);
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [purchasedNoteIds, setPurchasedNoteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load notes immediately on mount, don't wait for user
    fetchNotes();
    if (user) {
      fetchPurchasedNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchPurchasedNotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('note_purchases')
        .select('note_id')
        .eq('buyer_id', user.id);
      
      if (!error && data) {
        setPurchasedNoteIds(new Set(data.map(p => p.note_id)));
      }
    } catch (error) {
      console.error('Error fetching purchased notes:', error);
    }
  };

  useEffect(() => {
    if (schoolType) {
      supabase
        .from("schools")
        .select("id, name, type")
        .eq("type", schoolType)
        .then(({ data }) => setSchools(data || []));
    } else {
      setSchools([]);
    }
    setSchoolId(null);
    setSubject("");
  }, [schoolType]);

  useEffect(() => {
    if (schoolType) {
      setSubjectsLoading(true);
      supabase
        .from('subjects')
        .select('name')
        .eq('school_type', schoolType.toLowerCase())
        .order('name', { ascending: true })
        .then(({ data }) => {
          setSubjectsList((data || []).map(s => s.name));
          setSubjectsLoading(false);
        });
    } else {
      setSubjectsList([]);
    }
    setSubject("");
  }, [schoolType]);



  const fetchNotes = async () => {
    // Check if we have valid cached data
    try {
      const cached = sessionStorage.getItem('notes_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          // We have valid cache, no need to fetch
          console.log('Using cached notes data');
          return;
        }
      }
    } catch (err) {
      console.error('Error checking cache:', err);
    }
    
    // No valid cache, fetch from API
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("notes")
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log(`Fetched ${data?.length || 0} notes from database`);

      // Load notes immediately without seller stats for faster rendering
      setNotes(data || []);
      
      // Cache the notes data
      try {
        sessionStorage.setItem('notes_cache', JSON.stringify({
          data: data || [],
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('Error caching notes:', err);
      }
      
      setLoading(false);
      
      // Load seller stats in background (non-blocking)
      if (data && data.length > 0) {
        const sellerIds = [...new Set(data.map(note => note.author_id))];
        
        // Fetch stats in parallel but don't block UI
        Promise.all(
          sellerIds.map(id => 
            Promise.resolve({ data: null, error: null })
              .then(({ data: statsData }) => ({ id, stats: statsData?.[0] || null }))
              .catch(() => ({ id, stats: null }))
          )
        ).then(statsResults => {
          const statsMap = new Map(statsResults.map(item => [item.id, item.stats]));
          
          // Update notes with seller stats
          setNotes(prevNotes => {
            const updatedNotes = prevNotes.map(note => ({
              ...note,
              seller_stats: statsMap.get(note.author_id) || null
            }));
            
            // Update cache with stats
            try {
              sessionStorage.setItem('notes_cache', JSON.stringify({
                data: updatedNotes,
                timestamp: Date.now()
              }));
            } catch (err) {
              console.error('Error updating cache:', err);
            }
            
            return updatedNotes;
          });
        });
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      setLoading(false);
    }
  };

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) {
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        navigate('/login');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration missing!');
        toast.error('Napaka konfiguracije - manjkajoči podatki');
        setLoading(false);
        return;
      }

      const functionUrl = `${supabaseUrl}/functions/v1/ai-chat`;
      console.log('AI Search request to:', functionUrl);

      // Call AI to get recommendations
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Uporabnik išče zapiske z naslednjim opisom: "${aiSearchQuery}". Na voljo so naslednji zapisi:\n\n${notes.map(n => `- ${n.title} (${n.subject}, ${n.level}, ${n.school_type}): ${n.description || 'Brez opisa'}`).join('\n')}\n\nPreporoči najbolj ustrezne zapise in razloži zakaj. Vrni samo naslove zapiskov v JSON formatu: {"recommendations": ["naslov1", "naslov2", ...]}`
          }]
        })
      });

      console.log('AI Search response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.error('AI API 404 Error - Function not found:', functionUrl);
          toast.error('AI funkcija ni na voljo. Preverite namestitev.');
          setLoading(false);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('AI Search error:', errorData);
        throw new Error(errorData.error || 'Napaka pri AI iskanju');
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                aiResponse += content;
              }
            } catch (err) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Parse AI response
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const recommended = parsed.recommendations || [];
            
            // Filter notes based on AI recommendations
            const filteredByAI = notes.filter(note => 
              recommended.some((rec: string) => 
                note.title.toLowerCase().includes(rec.toLowerCase()) || 
                rec.toLowerCase().includes(note.title.toLowerCase())
              )
            );
            
            if (filteredByAI.length > 0) {
              setNotes(filteredByAI);
              toast.success(`AI je našel ${filteredByAI.length} ustreznih zapiskov`);
            } else {
              toast.info('AI ni našel ustreznih zapiskov. Poskusi razširiti iskanje.');
            }
          }
        } catch (e) {
          console.error('Error parsing AI response:', e);
          toast.error('Napaka pri razčlenjevanju AI odgovora');
        }
      }
    } catch (error) {
      console.error('AI Search error:', error);
      toast.error(error instanceof Error ? error.message : 'Napaka pri AI iskanju');
    } finally {
      setLoading(false);
    }
  };

  // Filter notes based on selected filters
  const filteredNotes = notes.filter((note) => {
    if (subject && note.subject !== subject) return false;
    if (noteType && note.type !== noteType) return false;
    if (schoolType && note.school_type !== schoolType) return false;
    if (schoolId && note.school_id !== schoolId) return false;
    if (priceFilter === "free" && note.price > 0) return false;
    if (priceFilter === "paid" && note.price === 0) return false;
    if (sellerFilter === "verified" && !note.seller_stats?.is_verified) return false;
    if (sellerFilter === "top" && (note.seller_stats?.total_sales || 0) < 5) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Zapiski
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Najdi zapiske, ki ti ustrezajo, ali uporabi AI pomoč za najboljše rezultate
          </p>
        </div>

        {/* AI Search Bar - PRO Feature */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border-2 border-primary/20 shadow-glow-primary mb-4 sm:mb-6 lg:mb-8 relative">
          <div className="flex items-start gap-2 sm:gap-3 mb-3">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold mb-1 text-slate-800 dark:text-slate-100">AI Iskanje</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 sm:mb-4">
                Študko AI ti predlaga najboljše zapiske zate.
              </p>
            </div>
            {hasProAccess && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-yellow-500 text-white text-xs font-bold shadow-md">
                PRO
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Napiši, kakšne zapiske iščeš… (npr. 'zapiske za maturo iz matematike 2025')"
                    value={aiSearchQuery}
                    onChange={(e) => setAiSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                    className="h-14 text-lg rounded-xl border-2 border-primary/30 focus:border-primary bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <Button 
                    onClick={handleAiSearch}
                    variant="hero" 
                    size="lg" 
                    className="h-14 px-8 shadow-glow-primary whitespace-nowrap"
                    disabled={loading || !aiSearchQuery.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Iščem...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        AI iskanje
                      </>
                    )}
                  </Button>
                </div>
                {hasProAccess && aiSearchQuery && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAiSearchQuery('');
                        fetchNotes();
                      }}
                      className="text-xs"
                    >
                      Ponastavi iskanje
                    </Button>
                  </div>
                )}
          </div>
          
          {/* Upgrade prompt - only for non-PRO */}
          {!hasProAccess && (
            <div className="mt-4 bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-purple-950/30 dark:to-yellow-950/30 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3 mb-4">
                <Award className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">Študko PRO prednosti:</h4>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Pametno AI iskanje po vseh zapiskih</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Personalizirane priporočila zapiskov</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Napredne analitike za inštruktorje</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>AI Mentor za inštruktorje</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate("/profile")}
                  variant="hero" 
                  size="lg" 
                  className="flex-1 shadow-glow-primary transition-all duration-300 hover:scale-105 min-h-[48px] text-sm sm:text-base"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Nadgradi na PRO
                </Button>
                <Button 
                  onClick={() => navigate("/ai")}
                  variant="outline" 
                  size="lg" 
                  className="transition-all duration-300 min-h-[48px] text-sm sm:text-base"
                >
                  Več informacij
                </Button>
              </div>
              <p className="text-center mt-3 text-sm text-slate-600 dark:text-slate-400">
                Samo 3,49 €/mesec • <span className="font-semibold text-purple-600 dark:text-purple-400">7 dni brezplačno</span>
              </p>
            </div>
          )}
        </div>

        {/* Standard Filters */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-lg mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-slate-800 dark:text-slate-100">Filtri</h3>
          

          {/* First row of filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* School Type */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Vrsta šole</Label>
              <Select value={schoolType} onValueChange={setSchoolType}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Vse šole" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {/* Osnovna šola removed */}
                  <SelectItem value="Gimnazija">Gimnazija</SelectItem>
                  <SelectItem value="srednja strokovna">Srednja strokovna</SelectItem>
                  <SelectItem value="poklicna">Srednja poklicna</SelectItem>
                  <SelectItem value="fakulteta">Fakulteta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* School Name */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Ime šole</Label>
              <Select
                value={schoolId ?? ""}
                onValueChange={val => setSchoolId(val || null)}
                disabled={!schoolType}
              >
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder={schoolType ? "Vse šole" : "Najprej izberi vrsto šole"} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Predmet</Label>
              <Select
                value={subject}
                onValueChange={setSubject}
                disabled={!schoolType || subjectsLoading}
              >
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder={
                    !schoolType
                      ? "Najprej izberi vrsto šole"
                      : subjectsLoading
                        ? "Nalaganje predmetov..."
                        : subjectsList.length
                          ? "Vsi predmeti"
                          : "Ni predmetov za to vrsto šole"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {subjectsList.map((subj) => (
                    <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Tip zapiskov</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Vsi tipi" />
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

            <div>
              <Label className="text-sm font-medium mb-2 block">Tip datoteke</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Vsi tipi" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Vsi tipi</SelectItem>
                  <SelectItem value="pdf">Samo PDF</SelectItem>
                  <SelectItem value="images">Samo slike</SelectItem>
                  <SelectItem value="both">PDF + slike</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second row of filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Jezik</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Vsi jeziki" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Vsi jeziki</SelectItem>
                  <SelectItem value="slovenian">Slovenščina</SelectItem>
                  <SelectItem value="english">Angleščina</SelectItem>
                  <SelectItem value="other">Drugi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Dolžina zapiskov</Label>
              <Select value={noteLength} onValueChange={setNoteLength}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Vse dolžine" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Vse dolžine</SelectItem>
                  <SelectItem value="short">Kratki povzetki</SelectItem>
                  <SelectItem value="medium">Srednje dolgi zapiski</SelectItem>
                  <SelectItem value="long">Obširni zapiski</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Ocena zapiskov</Label>
              <Select value={noteRating} onValueChange={setNoteRating}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Vse" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Vse</SelectItem>
                  <SelectItem value="3+">3+ ⭐</SelectItem>
                  <SelectItem value="4+">4+ ⭐</SelectItem>
                  <SelectItem value="4.5+">4.5+ ⭐</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Sortiraj po</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Sortiraj" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="popular">Najbolj priljubljeni</SelectItem>
                  <SelectItem value="rating">Najbolje ocenjeni</SelectItem>
                  <SelectItem value="downloads">Največ prenesenih</SelectItem>
                  <SelectItem value="newest">Najnovejši</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                <Award className="w-4 h-4" />
                Prodajalec
              </Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Vsi" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Vsi prodajalci</SelectItem>
                  <SelectItem value="verified">Preverjeni</SelectItem>
                  <SelectItem value="top">Top prodajalci (5+ prodaj)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Cena</Label>
            <RadioGroup value={priceFilter} onValueChange={setPriceFilter}>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="price-all" />
                  <Label htmlFor="price-all" className="cursor-pointer">Vsi</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free" id="price-free" />
                  <Label htmlFor="price-free" className="cursor-pointer">Samo brezplačni</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paid" id="price-paid" />
                  <Label htmlFor="price-paid" className="cursor-pointer">Plačljivi</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Notes Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600 dark:text-slate-400">
                Najdenih {filteredNotes.length} zapiskov
              </p>
            </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {filteredNotes.map((note) => {
                  const isPurchased = purchasedNoteIds.has(note.id);
                  const isOwner = user && note.author_id === user.id;
                  
                  return (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="bg-white/90 dark:bg-slate-800/90 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-primary/50 transition-all duration-300 cursor-pointer group active:scale-[1.02]"
                  >
                    <div className="flex items-start gap-3 mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-lg sm:rounded-xl flex items-center justify-center shadow-glow-primary flex-shrink-0 group-hover:shadow-glow-accent transition-shadow">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2 text-base sm:text-lg">
                          {note.title}
                        </h3>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
                            {note.subject}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-md font-medium">
                            {note.school_type}
                          </span>
                          {isPurchased && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Kupljeno
                            </span>
                          )}
                          {isOwner && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md font-medium">
                              Tvoj zapisek
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                        {note.type}
                      </span>
                    </div>
                    
                    {note.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {note.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 mb-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <User className="w-3 h-3" />
                        <span>Objavil: {note.profiles?.full_name || "Neznan avtor"}</span>
                      </div>
                      {note.seller_stats && (note.seller_stats.is_verified || note.seller_stats.total_sales > 0) && (
                        <div className="pt-1">
                          <SellerBadge
                            isVerified={note.seller_stats.is_verified}
                            totalSales={note.seller_stats.total_sales}
                            averageRating={note.seller_stats.average_rating}
                            size="sm"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>Dodano: {format(new Date(note.created_at), "dd.MM.yyyy")}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-lg text-primary">
                        {note.price === 0 ? (
                          <span className="text-accent">BREZPLAČNO</span>
                        ) : (
                          `${note.price.toFixed(2)} €`
                        )}
                      </span>
                      {isPurchased && (
                        <span className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          V lasti
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>

              {filteredNotes.length === 0 && !loading && (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Ni najdenih zapiskov
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Poskusi spremeniti filtre ali dodaj prvi zapisek
                  </p>
                  <Button
                    variant="hero"
                    onClick={() => navigate("/notes/new")}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Dodaj zapisek
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Add Button */}
        <Button
          variant="hero"
          size="lg"
          className="fixed bottom-8 right-8 shadow-glow-primary rounded-full h-16 w-16 p-0 hover:scale-110 transition-transform z-50"
          onClick={() => navigate("/notes/new")}
        >
          <Plus className="w-8 h-8" />
        </Button>
      </div>

      <Footer />
    </div>
  );
};

export default Notes;
