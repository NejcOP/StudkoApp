import React from "react";
import { useNavigate } from "react-router-dom";

interface AISearchBannerProps {
  isPro: boolean;
  onUpgradeClick?: () => void;
}

export const AISearchBanner: React.FC<AISearchBannerProps> = ({ isPro, onUpgradeClick }) => {
  const navigate = useNavigate();
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
          className="w-full md:w-[400px] px-5 py-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 text-lg focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Napiši, kakšnega inštruktorja iščeš..."
          disabled={!isPro}
          onClick={handleNonProClick}
        />
        <button
          className="mt-2 md:mt-0 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white font-semibold text-lg shadow-md hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={!isPro}
          onClick={handleNonProClick}
        >
          ✨ Poglej več
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
