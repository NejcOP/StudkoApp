import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, ExternalLink, Video } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SocialClaim {
  id: string;
  user_id: string;
  claim_type: string;
  video_link_1: string;
  video_link_2: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminTikTokChallenges() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<SocialClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const { data, error } = await supabase
        .from("social_claims")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("claim_type", "tiktok_challenge")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error: any) {
      toast({
        title: "Napaka",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claimId: string, userId: string) => {
    setProcessingId(claimId);
    try {
      const claim = claims.find(c => c.id === claimId);
      if (!claim) throw new Error("Claim not found");

      // Update claim status
      const { error: claimError } = await supabase
        .from("social_claims")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", claimId);

      if (claimError) throw claimError;

      // Grant PRO access
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          trial_ends_at: null,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Send approval email
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: claim.profiles?.email,
            title: '🎉 Tvoj TikTok izziv je bil odobren!',
            message: `
              <h2>Čestitamo! 🎊</h2>
              <p>Tvoja prijava za TikTok izziv je bila odobrena!</p>
              <p>Zdaj imaš <strong>brezplačen PRO dostop</strong> do vseh funkcij na Študko platformi!</p>
              <h3>Kaj to pomeni?</h3>
              <ul>
                <li>✨ Neomejeno generiranje zapiskov z AI</li>
                <li>📚 Dostop do vseh premium funkcij</li>
                <li>🎯 Prednostna podpora</li>
                <li>🚀 Vse nove funkcije brezplačno</li>
              </ul>
              <p>Hvala za podporo! 💜</p>
            `,
            actionLink: 'https://studko.si/ai',
            actionText: 'Preizkusi PRO funkcije',
          }),
        });
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
      }

      toast({
        title: "Uspešno!",
        description: "TikTok izziv je bil odobren in uporabnik je dobil PRO dostop.",
      });

      fetchClaims();
    } catch (error: any) {
      toast({
        title: "Napaka",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedClaim) return;

    setProcessingId(selectedClaim);
    try {
      const claim = claims.find(c => c.id === selectedClaim);
      if (!claim) throw new Error("Claim not found");

      const { error } = await supabase
        .from("social_claims")
        .update({
          status: "rejected",
          admin_notes: rejectionNotes || "Zavrnjeno",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedClaim);

      if (error) throw error;

      // Send rejection email
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: claim.profiles?.email,
            title: 'Glede tvojega TikTok izziva',
            message: `
              <h2>O tvojem TikTok izzivu</h2>
              <p>Tvoja prijava za TikTok izziv žal ni bila odobrena.</p>
              ${rejectionNotes ? `
                <h3>Razlog:</h3>
                <p>${rejectionNotes}</p>
              ` : ''}
              <p>Če imaš kakršna koli vprašanja, nas lahko kontaktiraš na info@studko.si.</p>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
      }

      toast({
        title: "Zavrnjeno",
        description: "TikTok izziv je bil zavrnjen.",
      });

      setRejectDialogOpen(false);
      setRejectionNotes("");
      setSelectedClaim(null);
      fetchClaims();
    } catch (error: any) {
      toast({
        title: "Napaka",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (claimId: string) => {
    setSelectedClaim(claimId);
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Na čakanju</Badge>;
      case "approved":
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" /> Odobreno</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Zavrnjeno</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p>Nalaganje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Video className="h-10 w-10" />
            TikTok Izziv - Prijave
          </h1>
          <p className="text-muted-foreground">
            Preglej in odobri prijave uporabnikov za TikTok izziv
          </p>
        </div>

        <div className="space-y-4">
          {claims.map((claim) => (
            <Card key={claim.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {claim.profiles?.full_name || "Neznani uporabnik"}
                      {getStatusBadge(claim.status)}
                    </CardTitle>
                    <CardDescription>
                      Oddano: {new Date(claim.created_at).toLocaleDateString("sl-SI", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                    {claim.profiles?.email && (
                      <CardDescription className="mt-1">
                        Email: {claim.profiles.email}
                      </CardDescription>
                    )}
                  </div>
                  {claim.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(claim.id, claim.user_id)}
                        disabled={processingId === claim.id}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Odobri
                      </Button>
                      <Button
                        onClick={() => openRejectDialog(claim.id)}
                        disabled={processingId === claim.id}
                        size="sm"
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Zavrni
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    TikTok Video linki:
                  </h4>
                  <div className="space-y-2">
                    <a
                      href={claim.video_link_1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Video className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Video 1</span>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                    {claim.video_link_2 && (
                      <a
                        href={claim.video_link_2}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Video className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Video 2</span>
                        <ExternalLink className="h-4 w-4 ml-auto" />
                      </a>
                    )}
                  </div>
                </div>

                {claim.admin_notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Admin opombe:</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {claim.admin_notes}
                    </p>
                  </div>
                )}

                {claim.reviewed_at && (
                  <div className="text-sm text-muted-foreground">
                    Pregledano: {new Date(claim.reviewed_at).toLocaleDateString("sl-SI", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {claims.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Ni prijav za pregled.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zavrni TikTok izziv</DialogTitle>
            <DialogDescription>
              Prosim podaj razlog za zavrnitev (opcijsko):
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Razlog zavrnitve..."
            value={rejectionNotes}
            onChange={(e) => setRejectionNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionNotes("");
                setSelectedClaim(null);
              }}
            >
              Prekliči
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingId !== null}
            >
              Zavrni prijavo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
