import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow-primary">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Politika zasebnosti
          </h1>
          <p className="text-muted-foreground text-lg">
            Nazadnje posodobljeno: {new Date().toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" />
              Uvod
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Študko ("mi", "nas" ali "naša") je zavezan k zaščiti vaše zasebnosti. Ta politika zasebnosti razlaga, 
              kako zbiramo, uporabljamo, razkrivamo in varujemo vaše osebne podatke, ko uporabljate našo platformo.
            </p>
          </section>

          {/* Data Collection */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              Zbiranje podatkov
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Osebni podatki</h3>
                <p className="leading-relaxed">
                  Ko se registrirate na Študko, zbiramo naslednje osebne podatke:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Ime in priimek</li>
                  <li>E-poštni naslov</li>
                  <li>Šolski tip (osnovna šola, srednja šola, fakulteta)</li>
                  <li>Geslo (shranjeno z varno enkripcijo)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Podatki o uporabi</h3>
                <p className="leading-relaxed">
                  Avtomatično zbiramo podatke o vaši uporabi platforme:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>IP naslov in podatki o napravi</li>
                  <li>Brskalnik in operacijski sistem</li>
                  <li>Zgodovina iskanj in interakcij</li>
                  <li>Čas in trajanje obiskov</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Vsebina</h3>
                <p className="leading-relaxed">
                  Ko uporabljate našo platformo, shranjujemo:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Naložene zapiske in gradiva</li>
                  <li>Ustvarjene povzetke in kvize</li>
                  <li>Komunikacijo z AI asistentom</li>
                  <li>Ocene in mnenja</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Usage */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Uporaba podatkov
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">Vaše podatke uporabljamo za:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Zagotavljanje in izboljševanje naših storitev</li>
                <li>Personalizacijo vaše izkušnje</li>
                <li>Obdelavo plačil in transakcij</li>
                <li>Komuniciranje o posodobitvah in novostih</li>
                <li>Analizo uporabe in izboljšave funkcionalnosti</li>
                <li>Zaščito pred goljufijami in zlorabo</li>
                <li>Izpolnjevanje zakonskih obveznosti</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-primary" />
              Varnost podatkov
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                Varnost vaših podatkov je naša prioriteta. Uporabljamo industrijske standarde za zaščito:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>SSL/TLS enkripcija za prenos podatkov</li>
                <li>Varne podatkovne baze s šifriranjem</li>
                <li>Redne varnostne revizije</li>
                <li>Omejen dostop do osebnih podatkov</li>
                <li>Dvofaktorska avtentikacija (opcijsko)</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Kljub našim prizadevanjem pa je treba opozoriti, da noben prenos podatkov po internetu ali 
                elektronsko shranjeni podatki niso 100% varni.
              </p>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              Deljenje podatkov
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                Vaših osebnih podatkov ne prodajamo tretjim osebam. Podatke lahko delimo le v naslednjih primerih:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Ponudniki storitev:</strong> Stripe za plačila, Supabase za shranjevanje, Resend za e-pošto</li>
                <li><strong>Zakonske zahteve:</strong> Če nas k temu zavezuje zakon ali sodna odločba</li>
                <li><strong>Zaščita pravic:</strong> Za zaščito naših pravic, lastnine ali varnosti</li>
                <li><strong>S privolitvijo:</strong> Ko nam date izrecno dovoljenje</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Piškotki</h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                Uporabljamo piškotke za izboljšanje vaše izkušnje. Piškotki so majhne datoteke, 
                shranjene v vašem brskalniku. Uporabljamo:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Nujni piškotki:</strong> Za delovanje platforme (prijava, nakupi)</li>
                <li><strong>Analitični piškotki:</strong> Za razumevanje uporabe platforme</li>
                <li><strong>Funkcionalni piškotki:</strong> Za shranjevanje vaših nastavitev</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Piškotke lahko upravljate v nastavitvah brskalnika.
              </p>
            </div>
          </section>

          {/* User Rights */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Vaše pravice</h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">V skladu z GDPR in slovensko zakonodajo imate pravico do:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Dostop:</strong> Zahtevati kopijo vaših osebnih podatkov</li>
                <li><strong>Popravek:</strong> Popraviti netočne ali nepopolne podatke</li>
                <li><strong>Izbris:</strong> Zahtevati izbris vaših podatkov ("pravica do pozabe")</li>
                <li><strong>Omejitev:</strong> Omejiti obdelavo vaših podatkov</li>
                <li><strong>Prenosljivost:</strong> Prejeti vaše podatke v strojno berljivi obliki</li>
                <li><strong>Ugovor:</strong> Ugovarjati obdelavi vaših podatkov</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Za uveljavljanje teh pravic nas kontaktirajte na{" "}
                <a href="mailto:info@studko.si" className="text-primary hover:underline">
                  info@studko.si
                </a>
              </p>
            </div>
          </section>

          {/* Children Privacy */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Mladoletniki</h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                Naša storitev je namenjena uporabnikom, starim 13 let in več. Zavestno ne zbiramo 
                osebnih podatkov od otrok, mlajših od 13 let. Če ste starš ali skrbnik in ugotovite, 
                da nam je vaš otrok posredoval osebne podatke, nas prosimo kontaktirajte.
              </p>
            </div>
          </section>

          {/* Changes */}
          <section className="bg-gradient-card p-6 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Spremembe politike</h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                Pridržujemo si pravico do posodobitve te politike zasebnosti. O pomembnih spremembah 
                vas bomo obvestili po e-pošti ali z obvestilom na platformi. Priporočamo, da redno 
                pregledate to stran za morebitne spremembe.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 rounded-2xl border border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">Kontakt</h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                Če imate vprašanja o tej politiki zasebnosti ali želite uveljavljati svoje pravice, 
                nas kontaktirajte:
              </p>
              <div className="space-y-2">
                <p>
                  <strong className="text-foreground">E-pošta:</strong>{" "}
                  <a href="mailto:info@studko.si" className="text-primary hover:underline">
                    info@studko.si
                  </a>
                </p>
                <p>
                  <strong className="text-foreground">Podjetje:</strong> Študko d.o.o.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Privacy;
