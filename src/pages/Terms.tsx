import { FileText, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow-primary">
            <FileText className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Pogoji uporabe
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Prosimo, pozorno preberi te pogoje pred uporabo platforme Študko
          </p>
          <div className="mt-6 h-1 w-24 mx-auto bg-gradient-primary rounded-full" />
        </div>

        <div className="space-y-8">
          {/* Section A */}
          <section className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <span className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center text-white font-bold">
                A
              </span>
              Uvod
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Z uporabo Študka se strinjaš s temi Pogoji uporabe. Če se ne strinjaš, prosimo,
              prenehaj uporabljati storitev.
            </p>
          </section>

          {/* Section B */}
          <section className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <span className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center text-white font-bold">
                B
              </span>
              Uporabniški računi
            </h2>
            <ul className="space-y-3 text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Uporabniki morajo zagotoviti točne informacije.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  Študko lahko začasno ali trajno ustavi račune zaradi zlorabe ali kršitev.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Uporabniki so odgovorni za varnost svojega računa.</span>
              </li>
            </ul>
          </section>

          {/* Remaining sections C through H */}
          {[
            {
              letter: "C",
              title: "Nalaganje vsebine",
              content: [
                "Uporabniki lahko naložijo samo originalne zapiske, ki so jih sami ustvarili.",
                "Nalaganje avtorsko zaščitenih učbenikov, delovnih zvezkov, materialov učiteljev ali kupljenih/licenciranih vsebin je strogo prepovedano.",
                "Uporabniki so v celoti odgovorni za vsebino, ki jo naložijo.",
              ],
            },
            {
              letter: "D",
              title: "Kupovanje, prodaja in provizija",
              content: [
                "Prodajalci so odgovorni za kakovost in točnost svojih zapiskov.",
                "Študko lahko zaračuna provizijo platforme od transakcij.",
                "V primeru sporov Študko deluje kot nevtralen posrednik.",
              ],
            },
            {
              letter: "E",
              title: "Tutorji",
              content: [
                "Informacije tutorjev morajo biti resnične.",
                "Uporabniki lahko ocenjujejo in pregledujejo tutorje.",
                "Študko ni odgovoren za rezultate inštrukcij.",
              ],
            },
            {
              letter: "F",
              title: "AI funkcije",
              content: [
                "AI pomoč je samo informativne narave.",
                "Študko ne jamči 100% točnosti odgovorov, ki jih generira AI.",
              ],
            },
            {
              letter: "G",
              title: "Zasebnost",
              content: [
                "Za podrobnosti o tem, kako varujemo tvoje podatke, si oglej našo Politiko zasebnosti.",
                "(Opomba: ločena stran Politike zasebnosti bo dodana pozneje.)",
              ],
            },
            {
              letter: "H",
              title: "Končne določbe",
              content: [
                "Študko lahko te Pogoje kadarkoli posodobi.",
                "Nadaljnja uporaba platforme pomeni sprejem posodobljenih Pogojev.",
              ],
            },
          ].map((section, index) => (
            <section
              key={index}
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700"
            >
              <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center text-white font-bold">
                  {section.letter}
                </span>
                {section.title}
              </h2>
              <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                {section.content.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;
