import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AISearchBannerProps {
  isPro: boolean;
  onUpgradeClick?: () => void;
  onSearchResults?: (tutors: any[]) => void;
}

export const AISearchBanner: React.FC<AISearchBannerProps> = ({ isPro, onUpgradeClick, onSearchResults }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Handler for AI search
  const handleAISearch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isPro) {
      if (onUpgradeClick) onUpgradeClick();
      return;
    }
    
    if (!searchQuery.trim()) {
      toast.error("Vpiši, kaj iščeš");
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Fetch all tutors
      const { data: tutors, error } = await supabase
        .from("tutors")
        .select("*")
        .eq("status", "approved");
      
      if (error) throw error;
      
      if (!tutors || tutors.length === 0) {
        toast.info("Ni najdenih inštruktorjev");
        setIsSearching(false);
        return;
      }
      
      // Simple AI-like search - match query with subjects, bio, experience
      const query = searchQuery.toLowerCase();
      const scoredTutors = tutors.map(tutor => {
        let score = 0;
        
        // Match name (very high priority)
        if (tutor.full_name && tutor.full_name.toLowerCase().includes(query)) score += 15;
        
        // Match subjects (high priority)
        if (tutor.subjects) {
          const subjects = Array.isArray(tutor.subjects) ? tutor.subjects : [tutor.subjects];
          subjects.forEach((subject: string) => {
            if (subject.toLowerCase().includes(query)) score += 10;
          });
        }
        
        // Match bio
        if (tutor.bio && tutor.bio.toLowerCase().includes(query)) score += 5;
        
        // Match experience
        if (tutor.experience && tutor.experience.toLowerCase().includes(query)) score += 3;
        
        // Match education level
        if (tutor.education_level && tutor.education_level.toLowerCase().includes(query)) score += 2;
        
        // Match school type
        if (tutor.school_type && tutor.school_type.toLowerCase().includes(query)) score += 2;
        
        return { ...tutor, score };
      });
      
      // Filter and sort by score
      const results = scoredTutors
        .filter(t => t.score > 0)
        .sort((a, b) => b.score - a.score);
      
      if (results.length === 0) {
        toast.info("Ni najdenih inštruktorjev za ta iskalni niz");
      } else {
        toast.success(`Najdenih ${results.length} inštruktorjev`);
        if (onSearchResults) {
          onSearchResults(results);
        }
      }
    } catch (error) {
      console.error("AI search error:", error);
      toast.error("Napaka pri iskanju");
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handler for all clicks if not PRO
  const handleNonProClick = (e: React.MouseEvent) => {
    if (!isPro) {
      e.stopPropagation();
      if (onUpgradeClick) onUpgradeClick();
      navigate("/ai");
    }
  };
  return (
    <div
      className={`relative flex flex-col gap-4 md:flex-row md:items-center justify-between bg-white dark:bg-[#0f111a] border border-gray-200 dark:border-white/10 rounded-2xl p-6 md:p-8 shadow-sm transition-all ${!isPro ? "backdrop-blur-sm cursor-pointer" : ""}`}
      onClick={handleNonProClick}
      style={!isPro ? { cursor: "pointer" } : {}}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
        <span className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          ✨ AI Iskanje
        </span>
        {!isPro && (
          <span className="ml-0 md:ml-4 px-3 py-1 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white text-xs font-semibold flex items-center gap-1">
            🔒 PRO
          </span>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center mt-4 md:mt-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isPro) {
              handleAISearch(e as any);
            }
          }}
          className="w-full md:w-[400px] px-5 py-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 text-lg focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Napiši, kakšnega inštruktorja iščeš..."
          disabled={!isPro || isSearching}
          onClick={handleNonProClick}
        />
        <button
          className="mt-2 md:mt-0 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white font-semibold text-base md:text-lg shadow-md hover:opacity-90 transition whitespace-nowrap disabled:opacity-60"
          onClick={handleAISearch}
          disabled={isSearching}
        >
          {isSearching ? "Iščem..." : "✨ Poišči inštruktorja z AI"}
        </button>
      </div>
      {!isPro && (
        <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center pointer-events-none select-none">
          <span className="text-white/70 text-base font-medium hidden md:block">Ta funkcija je na voljo samo PRO uporabnikom.</span>
        </div>
      )}
    </div>
  );
};

export default AISearchBanner;
