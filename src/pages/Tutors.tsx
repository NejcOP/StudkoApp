import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AISearchBanner from "@/components/ui/AISearchBanner";
import { useProAccess } from "@/hooks/useProAccess";
import { useToast } from "@/hooks/use-toast";
import { Star, MapPin, Video, GraduationCap } from "lucide-react";

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
}

export default function Tutors() {
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
        {/* AI Search Banner */}
        <div className="mb-8">
          <AISearchBanner
            isPro={hasProAccess}
            onSearchResults={handleAISearchResults}
            onUpgradeClick={() =>
              toast({
                title: "PRO funkcija",
                description: "AI iskanje je na voljo samo PRO uporabnikom.",
                variant: "destructive",
              })
            }
          />
          {aiSearchResults && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                AI rezultati: {aiSearchResults.length} inštruktorjev
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAISearch}
                className="text-xs"
              >
                Počisti AI iskanje
              </Button>
            </div>
          )}
        </div>
        {/* Background decoration */}
        <div className="absolute top-20 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

        {/* Filters */}
        <Card className="mb-6 sm:mb-8 shadow-2xl border-primary/30 bg-card/95 backdrop-blur-sm">
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-3 sm:mb-4">
              {/* Subject */}
              <div>
                <label className="text-sm font-medium mb-2 block">Predmet</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
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
              <div>
                <label className="text-sm font-medium mb-2 block">Stopnja</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
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
              <div>
                <label className="text-sm font-medium mb-2 block">Način</label>
                <Select value={selectedMode} onValueChange={setSelectedMode}>
                  <SelectTrigger>
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
              <div>
                <label className="text-sm font-medium mb-2 block">Cena na uro</label>
                <Select value={selectedPrice} onValueChange={setSelectedPrice}>
                  <SelectTrigger>
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
              <div>
                <label className="text-sm font-medium mb-2 block">Ocena</label>
                <Select value={selectedRating} onValueChange={setSelectedRating}>
                  <SelectTrigger>
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
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="w-full"
                >
                  Ponastavi filtre
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
                      {initials}
                    </div>
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