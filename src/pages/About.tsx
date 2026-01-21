import { BookOpen, Users, Sparkles, TrendingUp, Brain, Zap, GraduationCap, Shield } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow-primary">
            <BookOpen className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            O platformi Študko
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Moderna platforma za učenje študentov, kreatorjev in tutorjev
          </p>
          <div className="mt-6 h-1 w-24 mx-auto bg-gradient-primary rounded-full" />
        </div>

        {/* Mission Section */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 mb-8">
          <h2 className="text-3xl font-bold mb-4 text-slate-800 dark:text-slate-100">Naša misija</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Študko povezuje študente, kreatorje zapiskov in tutorje v en sodoben učni ekosistem.
            Naša misija je poenostaviti učenje, izboljšati dostop do kakovostnih zapiskov in
            omogočiti kreatorjem, da zaslužijo s svojim znanjem.
          </p>
        </div>

        {/* What We Offer */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 mb-8">
          <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100">Kaj ponujamo</h2>
          <div className="space-y-4">
            {[
              { icon: BookOpen, text: "Kupovanje in prodaja študijskih zapiskov" },
              { icon: Brain, text: "AI asistent za pomoč pri učenju" },
              { icon: Users, text: "Preverjeni tutorji za vse predmete" },
              { icon: Shield, text: "Varna in preprosta platforma" },
              { icon: Sparkles, text: "Moderna in intuitivna uporabniška izkušnja" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow-primary flex-shrink-0">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg text-slate-700 dark:text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why Študko */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[
            {
              icon: Zap,
              title: "Hiter dostop",
              description: "Hitro najdi visokokakovostne zapiske za svoj predmet",
            },
            {
              icon: TrendingUp,
              title: "Zasluži z znanjem",
              description: "Deli svoje zapiske in zaslužuj s svojo težko pridobljeno vsebino",
            },
            {
              icon: GraduationCap,
              title: "Tutorska podpora",
              description: "Dobi pomoč izkušenih tutorjev za izpite, teste in kolokvije",
            },
            {
              icon: Brain,
              title: "AI asistent",
              description: "Uporabi AI, ki ti pomaga pri razlagi, povzetkih in usmerjanju učenja",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:scale-105 transition-all"
            >
              <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow-primary mb-4">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Vision Section */}
        <div className="bg-gradient-hero rounded-2xl p-8 text-center shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">Naša vizija</h2>
          <p className="text-white text-lg max-w-2xl mx-auto">
            Naš cilj je postati največja digitalna učna skupnost v Sloveniji in se razširiti
            po Balkanu ter Evropi.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
