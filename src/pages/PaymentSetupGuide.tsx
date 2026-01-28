import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArrowLeft, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSetupGuide = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Nazaj
        </Link>

        <div className="bg-gradient-card rounded-2xl p-8 border border-border shadow-lg mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow-primary">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Nastavitev plačil</h1>
              <p className="text-muted-foreground mt-1">Korak za korakom navodila za Stripe Connect</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">Zakaj rabim Stripe račun?</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Stripe Connect omogoča avtomatska izplačila, ko študenti kupijo tvoje zapiske. 
                  80% od cene gre direktno na tvoj račun, 20% je provizija platforme.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Korak 1 */}
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-glow-primary">
                <span className="text-white font-bold">1</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-3">Pojdi na svoj profil</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>V navigacijski vrstici klikni na <strong>"Profil"</strong> v zgornjem desnem kotu</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Če nisi prijavljen, se najprej prijavi</span>
                  </li>
                </ul>
                <div className="mt-4">
                  <Link to="/profile">
                    <Button variant="outline" size="sm">
                      Pojdi na profil →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Korak 2 */}
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-glow-primary">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-3">Najdi sekcijo "Izplačila"</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Na strani profila se pomakni do sekcije <strong>"Izplačila (Stripe Connect)"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Videl boš modro škatlo z gumbom <strong>"Nastavi Stripe izplačila"</strong></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Korak 3 */}
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-glow-primary">
                <span className="text-white font-bold">3</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-3">Klikni "Nastavi Stripe izplačila"</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Preusmerjen boš na Stripe, kjer lahko ustvariš račun</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Če že imaš Stripe račun, se lahko prijaviš</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Korak 4 */}
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-glow-primary">
                <span className="text-white font-bold">4</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-3">Izpolni Stripe podatke</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Osebni podatki:</strong> Ime, priimek, datum rojstva</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Kontaktni podatki:</strong> Email in telefonska številka</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Tip računa:</strong> Izberi "Samostojni podjetnik" (tudi če nisi - to je za posameznike)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Izdelki/storitve:</strong> Izberi "Prodaja digitalnih izdelkov" ali "Digital products"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Spletna stran:</strong> Vpiši <code className="px-2 py-0.5 bg-muted rounded text-primary">studko.si</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Bančni račun:</strong> IBAN za prejemanje izplačil</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Dokument:</strong> Lahko bo potrebno naložiti osebno izkaznico ali potni list</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Korak 5 */}
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-glow-primary">
                <span className="text-white font-bold">5</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-3">Končaj postopek</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Ko izpolniš vse podatke, klikni na <strong>"Submit"</strong> ali <strong>"Pošlji"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Preusmerjen boš nazaj na Študko</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>V sekciji "Izplačila" boš videl zeleno obvestilo <strong>"Stripe račun je povezan ✅"</strong></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <h2 className="text-xl font-bold text-foreground mb-4">Pogosta vprašanja</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">💰 Koliko stane?</h3>
                <p className="text-muted-foreground text-sm">
                  Stripe Connect je brezplačen za nastavitev. Provizija (20%) se obračuna samo pri prodaji zapiskov.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">⏱️ Kako dolgo traja?</h3>
                <p className="text-muted-foreground text-sm">
                  Registracija na Stripe traja približno 5-10 minut. Verifikacija računa je običajno takojšnja.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">💳 Kdaj dobim denar?</h3>
                <p className="text-muted-foreground text-sm">
                  Ko študent kupi tvoj zapisek, se denar avtomatsko prenese na tvoj Stripe račun. 
                  Iz Stripe-a lahko nato dvigneš denar na svoj bančni račun.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">🔒 Ali je varno?</h3>
                <p className="text-muted-foreground text-sm">
                  Da! Stripe je eden največjih in najbolj zaupanja vrednih ponudnikov plačilnih storitev na svetu. 
                  Tvoji podatki so varno shranjeni in šifrirani.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">❓ Kaj če potrebujem pomoč?</h3>
                <p className="text-muted-foreground text-sm">
                  Kontaktiraj nas na <a href="mailto:info@studko.si" className="text-primary hover:underline">info@studko.si</a> in pomagali ti bomo čim prej!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentSetupGuide;
