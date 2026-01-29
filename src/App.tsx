import ConfirmEmail from "./pages/ConfirmEmail";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RatingPrompt } from "@/components/RatingPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import AddNote from "./pages/AddNote";
import NoteDetail from "./pages/NoteDetail";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import AIAssistant from "./pages/AIAssistant";
import AdminNotes from "./pages/AdminNotes";
import Tutors from "./pages/Tutors";
import TutorDetail from "./pages/TutorDetail";
import TutorApply from "./pages/TutorApply";
import GenerateNotes from "./pages/GenerateNotes";
import VideoCall from "./pages/VideoCall";
import TutorManagement from "./pages/TutorManagement";
import TutorDashboard from "./pages/TutorDashboard";
import TutorAvailability from "./pages/TutorAvailability";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import PaymentSetupGuide from "./pages/PaymentSetupGuide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RatingPrompt />
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
              <Route path="/notes/new" element={<ProtectedRoute><AddNote /></ProtectedRoute>} />
              <Route path="/notes/:id" element={<ProtectedRoute><NoteDetail /></ProtectedRoute>} />
              <Route path="/generate-notes" element={<ProtectedRoute><GenerateNotes /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/users/:userId" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
              <Route path="/ai" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
              <Route path="/tutors" element={<ProtectedRoute><Tutors /></ProtectedRoute>} />
              <Route path="/tutors/:id" element={<ProtectedRoute><TutorDetail /></ProtectedRoute>} />
              <Route path="/tutors/apply" element={<ProtectedRoute><TutorApply /></ProtectedRoute>} />
              <Route path="/tutors/manage" element={<ProtectedRoute><TutorManagement /></ProtectedRoute>} />
              <Route path="/tutor/dashboard" element={<ProtectedRoute><TutorDashboard /></ProtectedRoute>} />
              <Route path="/tutor/availability" element={<ProtectedRoute><TutorAvailability /></ProtectedRoute>} />
              <Route path="/call/:bookingId" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />
              <Route path="/admin/notes" element={<ProtectedRoute><AdminNotes /></ProtectedRoute>} />
              <Route path="/auth/confirm" element={<ConfirmEmail />} />
              <Route path="/confirm-email" element={<ConfirmEmail />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/payment-setup-guide" element={<PaymentSetupGuide />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
