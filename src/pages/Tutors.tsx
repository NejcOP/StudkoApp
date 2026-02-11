import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useProAccess } from "@/hooks/useProAccess";
import { useToast } from "@/hooks/use-toast";
import { Star, MapPin, Video, GraduationCap, Sparkles, Loader2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface PublicTutor {
  id: string;
  user_id: string;
  full_name: string;
  subjects: string[];
  bio: string | null;
  experience: string | null;
  price_per_hour: number;
  mode: string;
  education_level: string | null;
  school_type: string | null;
  status: string;
  created_at: string;
  profile_image_url?: string | null;
}

export default function Tutors() {
  const navigate = useNavigate();
  const { hasProAccess } = useProAccess();
  const { toast } = useToast();
  const [tutors, setTutors] = useState<PublicTutor[]>(() => {
    // Try to load cached tutors
    try {
      const cached = sessionStorage.getItem('tutors_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (err) {
      console.error('Error reading cached tutors:', err);
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [selectedPrice, setSelectedPrice] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [aiSearchResults, setAiSearchResults] = useState<PublicTutor[] | null>(null);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);

  // Handler for AI search results
  const handleAISearchResults = (results: PublicTutor[]) => {
    setAiSearchResults(results);
    // Reset filters when AI search is used
    setSelectedSubject("all");
    setSelectedLevel("all");
    setSelectedMode("all");
    setSelectedPrice("all");
    setSelectedRating("all");
  };
  
  // Handler to clear AI search
  const clearAISearch = () => {
    setAiSearchResults(null);
    setAiSearchQuery("");
  };

  // AI Search handler
  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim() || !hasProAccess) return;

    setAiSearching(true);
    try {
      const { data: allTutors, error: tutorsError } = await supabase
        .rpc('get_public_tutors');

      if (tutorsError) {
        console.error('Error fetching tutors:', tutorsError);
        sonnerToast.error('Napaka pri iskanju inštruktorjev');
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI tutor matching assistant that helps students find the BEST tutors for their specific needs.

MATCHING CRITERIA (in order of importance):
1. SUBJECT EXPERTISE (40%) - Does tutor teach what student needs?
2. EXPERIENCE & QUALITY (25%) - Teaching experience, student success rate
3. TEACHING STYLE FIT (20%) - Does tutor's approach match student's needs?
4. PRACTICAL FACTORS (15%) - Location, price, availability, mode (online/in-person)

SCORING GUIDELINES:
90-100: PERFECT MATCH - All criteria met exceptionally
75-89: EXCELLENT MATCH - Strong fit across most criteria
60-74: GOOD MATCH - Meets main requirements with minor gaps
40-59: MODERATE MATCH - Some alignment but significant gaps
0-39: POOR MATCH - Minimal alignment with student needs

ANALYSIS APPROACH:
✓ Parse student query for: subject, level, learning goals, preferences, constraints
✓ Evaluate each tutor against parsed requirements
✓ Consider implicit needs (e.g., "matura prep" = advanced level + exam techniques)
✓ Account for student level (osnovna šola, gimnazija, fakulteta)
✓ Weight experience and teaching approach heavily
✓ Don't over-penalize price unless student mentions budget
✓ Favor tutors with detailed, thoughtful bios

SPECIAL CONSIDERATIONS:
• "Začetnik" queries: Favor patient, foundational approach tutors
• "Matura/izpit" queries: Prioritize exam-prep experience
• "Hitra pomoč" queries: Consider availability and responsiveness
• Online preference: Only show online-capable tutors
• Multiple subjects: Tutors teaching multiple relevant subjects score higher

Return ONLY valid JSON array: [{"tutor_id": "uuid", "score": 85, "reason": "Short explanation why"}]`
            },
            {
              role: 'user',
              content: `Student query: "${aiSearchQuery}"

Available tutors:
${JSON.stringify(allTutors?.map((t: PublicTutor) => ({
  id: t.id,
  subjects: t.subjects,
  bio: t.bio,
  experience: t.experience,
  mode: t.mode,
  price_per_hour: t.price_per_hour,
  school_type: t.school_type,
  rating: t.average_rating,
  total_bookings: t.total_bookings,
})) || [], null, 2)}`
            }
          ],
          temperature: 0.4, // Lower for consistent scoring
          max_tokens: 2000,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        throw new Error('AI search failed');
      }

      const data = await response.json();
      const scoresText = data.choices[0].message.content.trim();
      
      // Parse the scores
      let scores: Array<{ tutor_id: string; score: number; reason?: string }> = [];
      try {
        // Try to extract JSON if wrapped in markdown
        const jsonMatch = scoresText.match(/\[[\s\S]*\]/);
        const jsonText = jsonMatch ? jsonMatch[0] : scoresText;
        scores = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse AI response:', scoresText);
        sonnerToast.error('Napaka pri obdelavi AI odgovora');
        return;
      }

      // Filter and sort tutors by AI scores (threshold: 45 for quality)
      const scoredTutors = (allTutors as PublicTutor[])
        .map(tutor => {
          const scoreObj = scores.find(s => s.tutor_id === tutor.id);
          return { ...tutor, aiScore: scoreObj?.score || 0, aiReason: scoreObj?.reason };
        })
        .filter(tutor => tutor.aiScore >= 45)
        .sort((a, b) => b.aiScore - a.aiScore);

      handleAISearchResults(scoredTutors);
      
      if (scoredTutors.length === 0) {
        sonnerToast.info('Ni najdenih ustreznih inštruktorjev za tvojo poizvedbo. Poskusi bolj splošno iskanje.');
      } else {
        sonnerToast.success(`Najdenih ${scoredTutors.length} primernih inštruktorjev`);
      }
    } catch (error) {
      console.error('AI search error:', error);
      sonnerToast.error('Napaka pri AI iskanju');
    } finally {
      setAiSearching(false);
    }
  };

  // Fetch tutors using secure RPC function (excludes PII)
  useEffect(() => {
    const fetchTutors = async () => {
      // Check if we have valid cached data
      try {
        const cached = sessionStorage.getItem('tutors_cache');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Cache valid for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            // We have valid cache, no need to fetch
            console.log('Using cached tutors data');
            return;
          }
        }
      } catch (err) {
        console.error('Error checking cache:', err);
      }
      
      // No valid cache, fetch from API
      setLoading(true);
      
      try {
        const { data, error } = await supabase.rpc('get_public_tutors');

        if (error) throw error;
        
        const tutorData = (data as PublicTutor[]) || [];
        
        // Set tutors immediately
        setTutors(tutorData);
        
        // Cache the data
        try {
          sessionStorage.setItem('tutors_cache', JSON.stringify({
            data: tutorData,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Error caching tutors:', err);
        }
      } catch (error) {
        console.error('Error fetching tutors:', error);
        // Keep cached data on error if available
      } finally {
        setLoading(false);
      }
    };

    fetchTutors();
  }, []);

  const filteredTutors = (aiSearchResults || tutors).filter((tutor) => {
    // If AI search is active, don't apply manual filters
    if (aiSearchResults) return true;
    
    // Subject filter - tutor.subjects is an array
    if (selectedSubject !== "all" && !tutor.subjects?.includes(selectedSubject)) return false;
    // Level filter
    if (selectedLevel !== "all" && tutor.school_type !== selectedLevel) return false;
    
    // Mode filter
    if (selectedMode !== "all") {
      const modes = tutor.mode.toLowerCase();
      if (selectedMode === "Online" && !modes.includes("online")) return false;
      if (selectedMode === "V živo" && !modes.includes("živo")) return false;
    }
    // Price filter
    if (selectedPrice !== "all") {
      const price = Number(tutor.price_per_hour);
      if (selectedPrice === "0-10" && price > 10) return false;
      if (selectedPrice === "10-20" && (price < 10 || price > 20)) return false;
      if (selectedPrice === "20+" && price < 20) return false;
    }
    
    // Rating filter - will be enhanced when we add ratings
    // For now, skip rating filter
    

    return true;
  });

  const resetFilters = () => {
    setSelectedSubject("all");
    setSelectedLevel("all");
    setSelectedMode("all");
    setSelectedPrice("all");
    clearAISearch();
    setSelectedRating("all");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-primary py-20 px-4">
        {/* Decorative blur shapes */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-6 shadow-glow-primary">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6">
            Najdi svojega inštruktorja
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Izberi predmet, način in ceno – inštrukcije po tvoji meri.
          </p>
          <Link to="/tutors/apply">
            <Button size="lg" variant="secondary" className="shadow-glow-primary">
              Postani inštruktor
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8 lg:py-12 relative">
        {/* AI Search Bar - PRO Feature */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 xl:p-8 border-2 border-primary/20 shadow-glow-primary mb-4 sm:mb-6 lg:mb-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
            <div className="flex items-start gap-2 sm:gap-3 flex-1">
              <Sparkles className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-1 text-slate-800 dark:text-slate-100">AI Iskanje</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 hidden sm:block">
                  Študko AI ti predlaga najboljše inštruktorje zate.
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-md self-start ${
              hasProAccess 
                ? 'bg-gradient-to-r from-purple-600 to-yellow-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {hasProAccess ? 'PRO' : '🔒 PRO'}
            </span>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Input
                type="text"
                placeholder={hasProAccess ? (window.innerWidth < 640 ? "Kakšnega inštruktorja iščeš?" : "Napiši, kakšnega inštruktorja iščeš… (npr. 'inštruktor za matematiko za maturo online')") : "🔒 Samo za PRO uporabnike"}
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && hasProAccess && handleAiSearch()}
                disabled={!hasProAccess}
                className={`h-12 sm:h-14 text-base sm:text-lg rounded-lg sm:rounded-xl border-2 border-primary/30 focus:border-primary bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${!hasProAccess ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              <Button 
                onClick={hasProAccess ? handleAiSearch : () => navigate('/ai')}
                variant="hero" 
                size="lg" 
                className="h-12 sm:h-14 px-6 sm:px-8 shadow-glow-primary w-full sm:w-auto whitespace-nowrap"
                disabled={hasProAccess && (aiSearching || !aiSearchQuery.trim())}
              >
                {!hasProAccess ? (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Nadgradi
                  </>
                ) : aiSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    Iščem...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    AI iskanje
                  </>
                )}
              </Button>
            </div>
            {hasProAccess && aiSearchResults && aiSearchResults.length > 0 && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAISearch}
                  className="text-xs"
                >
                  Počisti AI iskanje • Prikazanih {aiSearchResults.length} rezultatov
                </Button>
              </div>
            )}
          </div>
          
          {/* Overlay for non-PRO users */}
          {!hasProAccess && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center">
              <div className="text-center p-6">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nadgradi na PRO</h3>
                <p className="text-slate-300 mb-4">
                  AI iskanje je na voljo samo PRO uporabnikom
                </p>
                <Button 
                  onClick={() => navigate('/ai')}
                  variant="hero"
                  size="lg"
                  className="shadow-glow-primary"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Nadgradi
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Background decoration */}
        <div className="absolute top-20 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

        {/* Filters */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-7 border border-slate-200 dark:border-slate-700 shadow-xl mb-4 sm:mb-6 lg:mb-8 backdrop-blur-sm">
          <h3 className="text-base sm:text-xl font-bold mb-4 sm:mb-6 text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtri
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-5">
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold block text-slate-700 dark:text-slate-200">Predmet</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-11 sm:h-12 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500 transition-colors bg-white dark:bg-slate-800 shadow-sm text-sm sm:text-base">
                    <SelectValue placeholder="Vsi predmeti" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-[300px]">
                    <SelectItem value="all">Vsi predmeti</SelectItem>
                    <SelectItem value="Matematika">Matematika</SelectItem>
                    <SelectItem value="Fizika">Fizika</SelectItem>
                    <SelectItem value="Kemija">Kemija</SelectItem>
                    <SelectItem value="Biologija">Biologija</SelectItem>
                    <SelectItem value="Slovenščina">Slovenščina</SelectItem>
                    <SelectItem value="Angleščina">Angleščina</SelectItem>
                    <SelectItem value="Nemščina">Nemščina</SelectItem>
                    <SelectItem value="Francoščina">Francoščina</SelectItem>
                    <SelectItem value="Italijanščina">Italijanščina</SelectItem>
                    <SelectItem value="Računalništvo">Računalništvo</SelectItem>
                    <SelectItem value="Programiranje">Programiranje</SelectItem>
                    <SelectItem value="Statistika">Statistika</SelectItem>
                    <SelectItem value="Ekonomija">Ekonomija</SelectItem>
                    <SelectItem value="Računovodstvo">Računovodstvo</SelectItem>
                    <SelectItem value="Zgodovina">Zgodovina</SelectItem>
                    <SelectItem value="Geografija">Geografija</SelectItem>
                    <SelectItem value="Psihologija">Psihologija</SelectItem>
                    <SelectItem value="Pravo">Pravo</SelectItem>
                    <SelectItem value="Ostalo">Ostalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Level */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold block text-slate-700 dark:text-slate-200">Stopnja</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="h-11 sm:h-12 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500 transition-colors bg-white dark:bg-slate-800 shadow-sm text-sm sm:text-base">
                    <SelectValue placeholder="Vse stopnje" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vse stopnje</SelectItem>
                    {/* Osnovna šola removed */}
                    <SelectItem value="Srednja šola">Srednja šola</SelectItem>
                    <SelectItem value="Fakulteta">Fakulteta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mode */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold block text-slate-700 dark:text-slate-200">Način</label>
                <Select value={selectedMode} onValueChange={setSelectedMode}>
                  <SelectTrigger className="h-11 sm:h-12 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500 transition-colors bg-white dark:bg-slate-800 shadow-sm text-sm sm:text-base">
                    <SelectValue placeholder="Vsi načini" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vsi</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="V živo">V živo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold block text-slate-700 dark:text-slate-200">Cena na uro</label>
                <Select value={selectedPrice} onValueChange={setSelectedPrice}>
                  <SelectTrigger className="h-11 sm:h-12 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500 transition-colors bg-white dark:bg-slate-800 shadow-sm text-sm sm:text-base">
                    <SelectValue placeholder="Vse cene" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vse cene</SelectItem>
                    <SelectItem value="0-10">Do 10 €</SelectItem>
                    <SelectItem value="10-20">10–20 €</SelectItem>
                    <SelectItem value="20+">20+ €</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rating */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold block text-slate-700 dark:text-slate-200">Ocena</label>
                <Select value={selectedRating} onValueChange={setSelectedRating}>
                  <SelectTrigger className="h-11 sm:h-12 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500 transition-colors bg-white dark:bg-slate-800 shadow-sm text-sm sm:text-base">
                    <SelectValue placeholder="Vse ocene" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vse ocene</SelectItem>
                    <SelectItem value="4+">4+ ⭐</SelectItem>
                    <SelectItem value="4.5+">4.5+ ⭐</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset */}
              <div className="flex items-end space-y-1.5">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="w-full h-11 sm:h-12 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500 transition-colors text-sm sm:text-base font-semibold"
                >
                  Ponastavi filtre
                </Button>
              </div>
            </div>
          </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            Najdenih <span className="font-semibold text-foreground">{filteredTutors.length}</span> inštruktorjev
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="text-muted-foreground mt-4">Nalagam inštruktorje...</p>
          </div>
        )}

        {/* Tutor Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {filteredTutors.map((tutor) => {
              const initials = tutor.full_name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              
              const modeArray = tutor.mode.toLowerCase().includes('online') && tutor.mode.toLowerCase().includes('živo')
                ? ['Online', 'V živo']
                : tutor.mode.toLowerCase().includes('online')
                ? ['Online']
                : ['V živo'];

              return (
              <Card 
                key={tutor.id}
                className="group hover:shadow-glow-primary hover:scale-[1.02] transition-all duration-300 border-primary/20 hover:border-primary/50 bg-card/95 backdrop-blur-sm hover:ring-2 hover:ring-primary/20"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {tutor.profile_image_url ? (
                      <img
                        src={tutor.profile_image_url}
                        alt={tutor.full_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl mb-2">{tutor.full_name}</CardTitle>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {tutor.subjects?.slice(0, 3).map((subject: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {tutor.subjects?.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{tutor.subjects.length - 3}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{tutor.school_type}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                      <CardDescription className="mb-4 line-clamp-2">
                    {tutor.bio || tutor.experience || "Izkušen inštruktor z večletnimi izkušnjami poučevanja."}
                  </CardDescription>

                  <div className="space-y-3">
                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {Number(tutor.price_per_hour).toFixed(0)} €/h
                      </span>
                    </div>

                    {/* Mode badges */}
                    <div className="flex gap-2">
                      {modeArray.map((mode: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="gap-1">
                          {mode === "Online" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          {mode}
                        </Badge>
                      ))}
                    </div>

                    {/* CTA */}
                    <Link to={`/tutors/${tutor.id}`} className="block">
                      <Button className="w-full mt-4" variant="hero">
                        Poglej inštruktorja
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        )}

        {!loading && filteredTutors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Ni inštruktorjev, ki ustrezajo izbranim filtrom.
            </p>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}