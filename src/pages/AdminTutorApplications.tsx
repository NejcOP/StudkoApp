import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, XCircle, Clock, Mail, Phone, MapPin, GraduationCap, Euro } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TutorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  age: number | null;
  location: string | null;
  education_level: string;
  school_type: string;
  subjects: string[];
  price_per_hour: number;
  mode: string;
  bio: string;
  experience: string | null;
  status: string;
  created_at: string;
  languages?: string[];
  methodology?: string;
  video_url?: string;
  discount_info?: string;
}

export default function AdminTutorApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("tutor_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
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

  const handleApprove = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      // Get application details for email
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error("Application not found");

      const { error } = await supabase.rpc("approve_tutor_application", {
        application_id: applicationId,
      });

      if (error) throw error;

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
            to: application.email,
            title: '🎉 Tvoja prijava za inštruktorja je bila odobrena!',
            message: `
              <h2>Čestitamo, ${application.full_name}!</h2>
              <p>Tvoja prijava za inštruktorja je bila odobrena.</p>
              <p>Zdaj si viden na seznamu inštruktorjev na Študko platformi in študenti te lahko kontaktirajo za inštrukcije.</p>
              <h3>Tvoji podatki:</h3>
              <ul>
                <li><strong>Predmeti:</strong> ${application.subjects.join(', ')}</li>
                <li><strong>Cena:</strong> ${application.price_per_hour}€/uro</li>
                <li><strong>Način poučevanja:</strong> ${application.mode}</li>
              </ul>
              <p>Prijavi se na platformo in začni prejemati povpraševanja za inštrukcije!</p>
              <p><strong>Priporočilo:</strong> Nastavi svojo razpoložljivost v nastavitvah profila, da študenti vedo kdaj si na voljo.</p>
            `,
            actionLink: 'https://studko.si/tutor/dashboard',
            actionText: 'Pojdi na nadzorno ploščo',
          }),
        });
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
        // Don't fail if email fails
      }

      toast({
        title: "Uspešno!",
        description: "Prijava je bila odobrena. Inštruktor je zdaj viden na seznamu.",
      });

      // Refresh list
      fetchApplications();
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
    if (!selectedApplication) return;

    setProcessingId(selectedApplication);
    try {
      // Get application details for email
      const application = applications.find(app => app.id === selectedApplication);
      if (!application) throw new Error("Application not found");

      const { error } = await supabase.rpc("reject_tutor_application", {
        application_id: selectedApplication,
        rejection_reason: rejectionReason || "Ni podanega razloga",
      });

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
            to: application.email,
            title: 'Glede tvoje prijave za inštruktorja',
            message: `
              <h2>Pozdravljeni, ${application.full_name}</h2>
              <p>Žal ti moramo sporočiti, da tvoja prijava za inštruktorja na Študko platformi tokrat ni bila odobrena.</p>
              ${rejectionReason ? `
                <h3>Razlog:</h3>
                <p>${rejectionReason}</p>
              ` : ''}
              <p>Zahvaljujemo se ti za zanimanje in tvoj čas. Če imaš kakršna koli vprašanja, nas lahko kontaktiraš na info@studko.si.</p>
              <p>Želimo ti veliko uspeha pri prihodnjih projektih!</p>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
        // Don't fail if email fails
      }

      toast({
        title: "Prijava zavrnjena",
        description: "Prijava je bila zavrnjena.",
      });

      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedApplication(null);
      fetchApplications();
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

  const openRejectDialog = (applicationId: string) => {
    setSelectedApplication(applicationId);
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
          <h1 className="text-4xl font-bold mb-2">Prijave za inštruktorje</h1>
          <p className="text-muted-foreground">
            Preglej in odobri prijave kandidatov za inštruktorje
          </p>
        </div>

        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {app.full_name}
                      {getStatusBadge(app.status)}
                    </CardTitle>
                    <CardDescription>
                      Prijavljeno: {new Date(app.created_at).toLocaleDateString("sl-SI", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </div>
                  {app.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(app.id)}
                        disabled={processingId === app.id}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Odobri
                      </Button>
                      <Button
                        onClick={() => openRejectDialog(app.id)}
                        disabled={processingId === app.id}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{app.email}</span>
                    </div>
                    {app.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{app.phone}</span>
                      </div>
                    )}
                    {app.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{app.location}</span>
                      </div>
                    )}
                    {app.age && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Starost:</span>
                        <span>{app.age} let</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>{app.education_level} - {app.school_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span>{app.price_per_hour}€/uro</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Način:</span>
                      <span className="ml-2">{app.mode}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Predmeti:</h4>
                  <div className="flex flex-wrap gap-2">
                    {app.subjects.map((subject) => (
                      <Badge key={subject} variant="secondary">{subject}</Badge>
                    ))}
                  </div>
                </div>

                {app.bio && (
                  <div>
                    <h4 className="font-semibold mb-2">O meni:</h4>
                    <p className="text-sm text-muted-foreground">{app.bio}</p>
                  </div>
                )}

                {app.experience && (
                  <div>
                    <h4 className="font-semibold mb-2">Izkušnje:</h4>
                    <p className="text-sm text-muted-foreground">{app.experience}</p>
                  </div>
                )}

                {app.video_url && (
                  <div>
                    <h4 className="font-semibold mb-2">Video predstavitev:</h4>
                    <a 
                      href={app.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Poglej video →
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {applications.length === 0 && (
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
            <DialogTitle>Zavrni prijavo</DialogTitle>
            <DialogDescription>
              Prosim podaj razlog za zavrnitev (opcijsko):
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Razlog zavrnitve..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setSelectedApplication(null);
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
