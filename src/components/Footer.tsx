import { Link } from "react-router-dom";
import { BookOpen, Mail, FileText, Info } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-secondary to-muted border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4 group">
              <img 
                src="/logo.svg" 
                alt="Študko Logo" 
                className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-muted-foreground max-w-md">
              Tvoja nova alternativa za zapiske, AI pomoč in učenje. 
              Enostavno, hitro in prilagojeno študentom.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Povezave</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/notes"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Zapiski
                </Link>
              </li>
              <li>
                <Link
                  to="/ai"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  AI Pomoč
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Info className="w-4 h-4" />
                  Profil
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Kontakt</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:info@studko.si"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  info@studko.si
                </a>
              </li>
              <li>
                <Link
                  to="/payment-setup-guide"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Navodila za plačila
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Pogoji uporabe
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  O nas
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Študko. Vse pravice pridržane.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
