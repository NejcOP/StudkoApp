import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Eye } from "lucide-react";
import { Link } from "react-router-dom";

const AdminNotes = () => {
  // Mock data - will be replaced with real data later
  const pendingNotes = [
    {
      id: 1,
      title: "Matematika 1 - Limita in odvod",
      author: "Ana Kovač",
      subject: "Matematika",
      level: "Fakulteta",
      createdAt: "2024-01-20",
      price: 3.49,
    },
    {
      id: 2,
      title: "Programiranje v Pythonu",
      author: "Marko Horvat",
      subject: "Računalništvo",
      level: "Fakulteta",
      createdAt: "2024-01-21",
      price: 7.99,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Pregled zapiskov
          </h1>
          <p className="text-muted-foreground">
            Pregled vseh objavljenih zapiskov na platformi
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <p className="text-muted-foreground text-sm mb-1">Skupaj zapiskov</p>
            <p className="text-3xl font-bold text-primary">{pendingNotes.length}</p>
          </div>
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <p className="text-muted-foreground text-sm mb-1">Danes dodanih</p>
            <p className="text-3xl font-bold text-accent">0</p>
          </div>
        </div>

        {/* Notes Table */}
        <div className="bg-gradient-card rounded-2xl border border-border shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-4 font-semibold text-foreground">Naslov</th>
                  <th className="text-left p-4 font-semibold text-foreground">Avtor</th>
                  <th className="text-left p-4 font-semibold text-foreground">Predmet</th>
                  <th className="text-left p-4 font-semibold text-foreground">Stopnja</th>
                  <th className="text-left p-4 font-semibold text-foreground">Cena</th>
                  <th className="text-left p-4 font-semibold text-foreground">Datum</th>
                  <th className="text-right p-4 font-semibold text-foreground">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{note.title}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-muted-foreground">{note.author}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                        {note.subject}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-accent/10 text-accent rounded-lg text-xs font-medium">
                        {note.level}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-foreground">{note.price}€</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-muted-foreground">{note.createdAt}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Link to={`/notes/${note.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary/10"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pendingNotes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Ni zapiskov za pregled
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AdminNotes;
