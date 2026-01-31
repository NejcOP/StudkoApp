import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, DollarSign, Zap, Upload, ShieldCheck } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-study-illustration.jpg";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/notes');
    }
  }, [user, loading, navigate]);
  const features = [
    {
      icon: BookOpen,
      title: "Zapiski",
      description: "Dostopaj do kakovostnih zapiskov iz različnih predmetov in stopenj izobraževanja.",
      color: "from-primary to-primary-light",
    },
    {
      icon: Brain,
      title: "AI pomoč",
      description: "Postavi vprašanja AI asistentu in dobi hitre, točne odgovore za učenje.",
      color: "from-accent to-primary",
    },
    {
      icon: Zap,
      title: "Enostavna uporaba",
      description: "Intuitiven vmesnik, ki ti omogoča hitro iskanje in organizacijo gradiva.",
      color: "from-primary-light to-accent",
    },
    {
      icon: DollarSign,
      title: "Zasluži z zapiski",
      description: "Objavi svoje zapiske in zasluži, medtem ko pomagaš drugim študentom.",
      color: "from-primary to-accent",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-transparent z-10" />
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-20 container mx-auto px-3 sm:px-4 py-16 sm:py-20 md:py-28 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-2xl px-2">
              Študko – tvoja nova alternativa za zapiske, AI pomoč in učenje
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 drop-shadow-lg max-w-2xl mx-auto px-4">
              Platforma, kjer študenti delijo znanje, kupujejo zapiske in uporabljajo AI za hitrejše učenje.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                variant="hero" 
                size="xl" 
                className="w-full sm:w-auto text-lg transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-xl hover:brightness-110 cursor-pointer"
              >
                <Link to="/register">
                  Registriraj se
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="xl" 
                className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white hover:text-primary text-lg transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-xl hover:brightness-110 cursor-pointer"
              >
                <Link to="/notes">
                  Oglej si zapiske
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-3 sm:px-4 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent px-2">
            Zakaj Študko?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Vse, kar potrebuješ za uspešen študij, na enem mestu
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-gradient-card p-6 rounded-2xl shadow-lg hover:shadow-glow-primary transition-all duration-300 hover:-translate-y-1 border border-border"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-glow-accent`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gradient-to-br from-secondary to-muted py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent px-2">
              Kako deluje?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <div className="text-center px-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-glow-primary">
                <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">1. Registriraj se</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Ustvari brezplačen račun v nekaj sekundah
              </p>
            </div>
            
            <div className="text-center px-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-glow-primary">
                <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">2. Prebrskaj zapiske</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Najdi zapiske, ki ti ustrezajo in jih kupi
              </p>
            </div>
            
            <div className="text-center px-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-glow-primary">
                <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">3. Začni učiti</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Prenesi zapiske in uporabi AI za pomoč
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-3 sm:px-4 py-12 sm:py-16 lg:py-20">
        <div className="bg-gradient-hero rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 text-center shadow-2xl">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 px-2">
            Pripravljeni začeti?
          </h2>
          <p className="text-white/90 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Pridruži se skupnosti študentov in začni učiti pametneje že danes.
          </p>
          <Button 
            asChild
            variant="hero" 
            size="xl" 
            className="bg-white text-primary hover:bg-white/90 shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <Link to="/register">
              Začni brezplačno
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
