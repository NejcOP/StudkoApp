import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { BookOpen, ShoppingBag, Brain, Plus, TrendingUp, FileText } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const Dashboard = () => {
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    if (sessionId) {
      toast.success("Uspeh! Preverjamo tvojo naročnino...");
      // Remove session_id from URL after 3s
      setTimeout(() => {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete("session_id");
          return newParams;
        }, { replace: true });
      }, 3000);
    }
  }, [setSearchParams]);
  const dashboardCards = [
    {
      title: "Moji zapiski",
      description: "Oglej si zapiske, ki si jih objavil",
      icon: FileText,
      link: "/notes",
      count: 0,
      gradient: "from-primary to-primary-light",
    },
    {
      title: "Kupljeni zapiski",
      description: "Dostopaj do zapiskov, ki si jih kupil",
      icon: ShoppingBag,
      link: "/notes",
      count: 0,
      gradient: "from-accent to-primary",
    },
    {
      title: "AI pomoč",
      description: "Postavi vprašanje AI asistentu",
      icon: Brain,
      link: "/ai",
      gradient: "from-primary-light to-accent",
    },
    {
      title: "Dodaj zapisek",
      description: "Objavi nov zapisek in zasluži",
      icon: Plus,
      link: "/notes/new",
      gradient: "from-primary to-accent",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Welcome Header */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
            Dobrodošel nazaj! 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm lg:text-base xl:text-lg">
            Kako lahko danes pomagamo pri tvojem učenju?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-12">
          <div className="bg-white/90 dark:bg-slate-800/90 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1 truncate">Skupaj zapiskov</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100">0</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary to-primary-light rounded-lg sm:rounded-xl flex items-center justify-center shadow-glow-primary flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-slate-800/90 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1 truncate">Kupljenih</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100">0</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-accent to-primary rounded-lg sm:rounded-xl flex items-center justify-center shadow-glow-accent flex-shrink-0">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-slate-800/90 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1 truncate">Zasluženega</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100">0€</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary-light to-accent rounded-lg sm:rounded-xl flex items-center justify-center shadow-glow-primary flex-shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Link key={index} to={card.link}>
                <div className="bg-white/90 dark:bg-slate-800/90 rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-glow-primary transition-all duration-300 hover:-translate-y-1 group active:scale-[0.98]">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${card.gradient} rounded-lg sm:rounded-xl flex items-center justify-center shadow-glow-accent group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    {card.count !== undefined && (
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                        {card.count}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">{card.description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-gradient-hero rounded-3xl p-8 text-center shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-4">
            Potrebuješ pomoč pri učenju?
          </h2>
          <p className="text-white/90 mb-6">
            Naš AI asistent ti lahko pomaga z vprašanji in razlaga snov.
          </p>
          <Link to="/ai">
            <Button variant="hero" size="lg" className="bg-white text-primary hover:bg-white/90">
              Odpri AI pomoč
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
