import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Loader2 } from "lucide-react";

const VideoCall = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user || !bookingId) {
      navigate('/tutors');
      return;
    }

    initializeCall();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [bookingId, user]);

  const initializeCall = async () => {
    try {
      // Get booking details
      const { data: booking, error } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      if (booking.status !== 'confirmed') {
        toast.error('Ta rezervacija ni potrjena');
        navigate('/tutors');
        return;
      }

      // Initialize media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // TODO: Implement WebRTC peer connection for actual video calling
      // This would require a signaling server or service like Twilio/Agora
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing call:', error);
      toast.error('Napaka pri zagonu videoklica');
      navigate('/tutors');
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const endCall = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    toast.success('Klic je bil zaključen');
    navigate('/tutors');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Local Video */}
          <Card className="relative aspect-video bg-slate-800 overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded-full text-white text-sm">
              Ti
            </div>
          </Card>

          {/* Remote Video */}
          <Card className="relative aspect-video bg-slate-800 overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin" />
                <p>Čakanje na drugega udeleženca...</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant={audioEnabled ? "secondary" : "destructive"}
            className="rounded-full w-16 h-16"
            onClick={toggleAudio}
          >
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          <Button
            size="lg"
            variant={videoEnabled ? "secondary" : "destructive"}
            className="rounded-full w-16 h-16"
            onClick={toggleVideo}
          >
            {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-16 h-16"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>

          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16"
            onClick={endCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            Opomba: WebRTC peer-to-peer povezava še ni implementirana. Za produkcijo uporabite storitev kot je Twilio, Agora ali Daily.co
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;