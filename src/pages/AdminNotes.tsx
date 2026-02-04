import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Eye, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AdminNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      
      // Fetch all notes with author profile
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          profiles:author_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotes(data || []);

      // Count today's notes
      const today = new Date().toISOString().split('T')[0];
      const todayNotes = (data || []).filter(note => 
        note.created_at.startsWith(today)
      );
      setTodayCount(todayNotes.length);

    } catch (error: any) {
      console.error('Error loading notes:', error);
      toast.error('Napaka pri nalaganju zapiskov');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (noteId: string) => {
    setSelectedNoteId(noteId);
    setDeleteDialogOpen(true);
    setPassword("");
  };

  const handleDeleteNote = async () => {
    if (!password.trim()) {
      toast.error("Vpiši geslo za potrditev");
      return;
    }

    if (!selectedNoteId) return;

    setDeleting(true);
    try {
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Nisi prijavljen");
        return;
      }

      // Re-authenticate to verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        toast.error("Napačno geslo");
        return;
      }

      // Password is correct, proceed with deletion
      const { error: deleteError } = await supabase
        .from("notes")
        .delete()
        .eq("id", selectedNoteId);

      if (deleteError) throw deleteError;

      toast.success("Zapisek uspešno izbrisan!");
      setDeleteDialogOpen(false);
      setPassword("");
      setSelectedNoteId(null);
      
      // Reload notes
      loadNotes();
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast.error("Napaka pri brisanju zapiska");
    } finally {
      setDeleting(false);
    }
  };

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
            <p className="text-3xl font-bold text-primary">{notes.length}</p>
          </div>
          <div className="bg-gradient-card rounded-2xl p-6 border border-border shadow-lg">
            <p className="text-muted-foreground text-sm mb-1">Danes dodanih</p>
            <p className="text-3xl font-bold text-accent">{todayCount}</p>
          </div>
        </div>

        {/* Notes Table */}
        <div className="bg-gradient-card rounded-2xl border border-border shadow-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Nalaganje zapiskov...</p>
            </div>
          ) : (
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
                  {notes.map((note) => (
                    <tr key={note.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-foreground">{note.title}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-muted-foreground">{note.profiles?.full_name || 'Neznano'}</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                          {note.subject}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-accent/10 text-accent rounded-lg text-xs font-medium">
                          {note.school_type}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-foreground">{note.price}€</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString('sl-SI')}
                        </p>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(note.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && notes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Ni zapiskov za pregled
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Izbriši zapisek</DialogTitle>
            <DialogDescription>
              Za potrditev brisanja vnesi svoje geslo (isto kot za prijavo).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Geslo</Label>
              <Input
                id="password"
                type="password"
                placeholder="Vpiši svoje geslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDeleteNote()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setPassword("");
                setSelectedNoteId(null);
              }}
              disabled={deleting}
            >
              Prekliči
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteNote}
              disabled={deleting || !password.trim()}
            >
              {deleting ? "Brišem..." : "Izbriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AdminNotes;
