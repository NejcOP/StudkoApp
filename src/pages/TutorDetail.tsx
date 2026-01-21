import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Video, CheckCircle2, Calendar, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { ProfileReviews } from "@/components/ProfileReviews";
import { ReviewForm } from "@/components/ReviewForm";
import { BookingCalendar14Days } from "@/components/BookingCalendar14Days";

interface PublicTutor {
  id: string;
  user_id: string;
  full_name: string;
  subjects: string[];
  bio: string | null;
  experience: string | null;
  price_per_hour: number;
  mode: string;
  education_level: string | null;
  school_type: string | null;
  status: string;
  created_at: string;
  verified?: boolean;
  video_url?: string | null;
  video_file_url?: string | null;
  avatar_url?: string | null;
  methodology?: string[];
  languages?: string[];
  discount_info?: string | null;
}

interface TutorContactInfo {
  email: string;
  phone: string;
  location: string;
  age: number;
}

export default function TutorDetail() {
  // Zagotovi pravilen zajem id iz URL parametrov
  const params = useParams();
  const id = params.id;
  const { user } = useAuth();
  
  const [tutor, setTutor] = useState<PublicTutor | null>(null);
  const [contactInfo, setContactInfo] = useState<TutorContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [similarTutors, setSimilarTutors] = useState<PublicTutor[]>([]);

  const [reviewsKey, setReviewsKey] = useState(0);

  // Load tutor data
  useEffect(() => {
    if (!id) return;

    const loadTutor = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tutors')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setTutor(null);
          setLoading(false);
          return;
        }
        
        setTutor(data as PublicTutor);

        // Try to load contact info (only succeeds if user is tutor or has confirmed booking)
        if (user) {
          const { data: contact } = await supabase.rpc('get_tutor_contact_info', {
            tutor_id_param: id
          });
          if (contact && (contact as TutorContactInfo[]).length > 0) {
            setContactInfo((contact as TutorContactInfo[])[0]);
          }
        }

        // Load similar tutors using secure function
        const { data: similar } = await supabase.rpc('get_public_tutors');
        const filteredSimilar = ((similar as PublicTutor[]) || [])
          .filter(t => t.id !== id)
          .slice(0, 4);
        setSimilarTutors(filteredSimilar);
      } catch (error) {
        toast.error("Napaka pri nalaganju tutorja");
      } finally {
        setLoading(false);
      }
    };

    loadTutor();
  }, [id, user]);

  // Reload data when app becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && id && !loading) {
        console.log('🔄 App visible - reloading tutor data');
        const loadTutor = async () => {
          setLoading(true);
          try {
            const { data, error } = await supabase
              .from('tutors')
              .select('*')
              .eq('id', id)
              .maybeSingle();

            if (error) throw error;
            if (!data) {
              setTutor(null);
              setLoading(false);
              return;
            }
            
            setTutor(data as PublicTutor);

            if (user) {
              const { data: contact } = await supabase.rpc('get_tutor_contact_info', {
                tutor_id_param: id
              });
              if (contact && (contact as TutorContactInfo[]).length > 0) {
                setContactInfo((contact as TutorContactInfo[])[0]);
              }
            }
          } catch (error) {
            console.error('Error reloading tutor:', error);
          } finally {
            setLoading(false);
          }
        };
        loadTutor();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [id, user, loading]);

  const handleReviewSubmitted = () => {
    // Force re-render of ProfileReviews component
    setReviewsKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Nalagam podatke o inštruktorju...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Inštruktor ni bil najden.</p>
            <Link to="/tutors">
              <Button>Nazaj na seznam</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Prikaz inicialk, če ni slike ali videa
  const initials = tutor.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const modeArray = tutor.mode.toLowerCase().includes('online') && tutor.mode.toLowerCase().includes('živo')
    ? ['Online', 'V živo']
    : tutor.mode.toLowerCase().includes('online')
    ? ['Online']
    : ['V živo'];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Background decorations */}
      <div className="absolute top-32 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-96 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link 
          to="/tutors" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Nazaj na seznam inštruktorjev
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left side - Tutor Profile */}
          <div className="lg:col-span-2 space-y-8">
            {/* Main Profile Card */}
            <Card className="shadow-2xl border-primary/30 bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar */}
                  <div className="w-32 h-32 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-3xl shrink-0 overflow-hidden relative">
                    {tutor?.avatar_url ? (
                      <img src={tutor.avatar_url} alt={tutor.full_name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-3 flex items-center gap-2">
                      {tutor?.full_name}
                      {tutor?.verified === true && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold ml-2">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </span>
                      )}
                    </CardTitle>
                    
                    {/* Subjects */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {tutor.subjects?.map((subject: string, idx: number) => (
                        <Badge key={idx} className="text-sm">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                    {/* Level */}
                    <p className="text-muted-foreground mb-3">{tutor.school_type}</p>
                    {/* Mode badges */}
                    <div className="flex gap-2">
                      {modeArray.map((mode: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="gap-1">
                          {mode === "Online" ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                          {mode}
                          {mode === "V živo" && contactInfo?.location && ` v ${contactInfo.location}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Bio */}

                {tutor?.bio && (
                  <div>
                    <h3 className="text-xl font-semibold mb-3">O meni</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {tutor?.bio}
                    </p>
                  </div>
                )}
                {/* Metodologija dela */}
                {tutor?.methodology?.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Metodologija dela</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                      {tutor.methodology.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Experience */}
                {tutor.experience && (
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Izkušnje</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {tutor.experience}
                    </p>
                  </div>
                )}

                {/* Education & Details */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">Podrobnosti</h3>
                  <ul className="space-y-2">
                    {tutor.education_level && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Izobrazba: {tutor.education_level}</span>
                      </li>
                    )}
                    {contactInfo?.location ? (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Lokacija: {contactInfo.location}</span>
                      </li>
                    ) : (
                      <li className="flex items-start gap-2">
                        <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Lokacija: vidna po potrjeni rezervaciji</span>
                      </li>
                    )}
                    {tutor?.subjects && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Predmeti: {tutor.subjects.join(', ')}</span>
                      </li>
                    )}
                    {/* Jeziki */}
                    {tutor?.languages?.length > 0 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Jeziki: {tutor.languages.join(', ')}</span>
                      </li>
                    )}
                    {/* Metodologija */}
                    {tutor?.methodology && tutor.methodology.length > 0 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Metodologija:
                          <ul className="list-disc pl-4 mt-1">
                            {tutor.methodology.map((item: string, idx: number) => (
                              <li key={idx} className="text-xs text-muted-foreground">{item}</li>
                            ))}
                          </ul>
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Contact Info Section - Only shown to authorized users */}
                {contactInfo && (
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Kontaktni podatki
                    </h3>
                    <div className="space-y-2 text-sm">
                      {contactInfo.email && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Email:</span> {contactInfo.email}
                        </p>
                      )}
                      {contactInfo.phone && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Telefon:</span> {contactInfo.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 14-Day Booking Calendar */}
            <div id="booking-calendar">
              {tutor.id && (
                <BookingCalendar14Days 
                  tutorId={tutor.id}
                  tutorName={tutor.full_name}
                  pricePerHour={Number(tutor.price_per_hour)}
                />
              )}
            </div>

            {/* Ratings & Reviews Section */}
            <Card className="shadow-2xl border-primary/30 bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Ocene in mnenja</CardTitle>
              </CardHeader>
              <CardContent>
                {tutor.user_id ? (
                  <>
                    <ProfileReviews key={reviewsKey} targetProfileId={tutor.user_id} />
                    
                    {user && user.id !== tutor.user_id && (
                      <div className="mt-6 pt-6 border-t">
                        <ReviewForm 
                          targetProfileId={tutor.user_id} 
                          onReviewSubmitted={handleReviewSubmitted}
                        />
                      </div>
                    )}

                    {!user && (
                      <div className="py-8 text-center border-t mt-6">
                        <p className="text-muted-foreground mb-4">Prijavi se, da lahko oceniš tega inštruktorja.</p>
                        <Link to="/auth/login">
                          <Button variant="outline">Prijava</Button>
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground py-4">Podatki o inštruktorju niso na voljo.</p>
                )}
              </CardContent>
            </Card>

            {/* Similar Tutors */}
            <div>
              <h2 className="text-2xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
                Podobni inštruktorji
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {similarTutors.slice(0, 4).map((similarTutor) => {
                  const similarInitials = similarTutor.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  
                  return (
                    <Card key={similarTutor.id} className="hover:shadow-glow-primary hover:scale-[1.02] transition-all duration-300 border-primary/20 hover:border-primary/50 bg-card/95 backdrop-blur-sm">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                            {similarInitials}
                          </div>
                          <div>
                            <p className="font-semibold">{similarTutor.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {similarTutor.subjects?.slice(0, 2).join(", ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">{Number(similarTutor.price_per_hour).toFixed(0)} €/h</span>
                        </div>
                        <Link to={`/tutors/${similarTutor.id}`}>
                          <Button variant="outline" className="w-full mt-3" size="sm">
                            Poglej profil
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right side - Sticky Price Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Price Card */}
              <Card className="shadow-2xl border-2 border-primary/40 bg-card/95 backdrop-blur-sm ring-1 ring-primary/10 overflow-hidden">
                <div className="bg-gradient-to-br from-primary via-accent to-primary p-6 text-center">
                  <p className="text-primary-foreground/80 text-sm mb-1">Cena na uro</p>
                  <p className="text-5xl font-bold text-white">
                    {Number(tutor?.price_per_hour ?? 0).toFixed(0)} €
                  </p>
                  {/* Popust */}
                  {tutor?.discount_info && (
                    <p className="text-purple-400 text-sm mt-1">{tutor.discount_info}</p>
                  )}
                </div>
                
                <CardContent className="pt-6 space-y-4">
                  {/* Mode badges */}
                  <div className="flex justify-center gap-2 flex-wrap">
                    {modeArray.map((mode: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="gap-1 px-3 py-1">
                        {mode === "Online" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {mode}
                      </Badge>
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-foreground">{tutor.subjects?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Predmetov</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-foreground">{tutor.education_level?.split(' ')[0] || '-'}</p>
                      <p className="text-xs text-muted-foreground">Izobrazba</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button 
                    className="w-full" 
                    variant="hero" 
                    size="lg"
                    onClick={() => {
                      const calendarEl = document.getElementById('booking-calendar');
                      calendarEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Izberi termin
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Izberi prosti termin v koledarju spodaj
                  </p>
                </CardContent>
              </Card>

              {/* Video Player - YouTube or uploaded video */}
              {(tutor?.video_url || tutor?.video_file_url) && (
                <Card className="shadow-2xl border-primary/30 bg-card/95 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="w-full aspect-video">
                      {tutor?.video_file_url ? (
                        <video 
                          src={tutor.video_file_url} 
                          controls 
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : tutor?.video_url ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={(() => {
                            const url = tutor.video_url;
                            if (url.includes('youtube.com')) {
                              const v = url.split('v=')[1]?.split('&')[0];
                              return `https://www.youtube.com/embed/${v}`;
                            } else if (url.includes('youtu.be')) {
                              const v = url.split('youtu.be/')[1]?.split('?')[0];
                              return `https://www.youtube.com/embed/${v}`;
                            }
                            return url;
                          })()}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="rounded-xl"
                        />
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Info Card - Only shown to authorized users */}
              {contactInfo && (
                <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm text-green-700 dark:text-green-400">Kontakt odklenjen</span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {contactInfo.email && <p>📧 {contactInfo.email}</p>}
                      {contactInfo.phone && <p>📱 {contactInfo.phone}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}