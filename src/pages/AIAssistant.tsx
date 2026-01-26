// Example: How to submit a tutor application with all new fields
// (Copy this logic to your form's handleSubmit if needed)
/*
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;
  setIsLoading(true);
  try {
    // Example formData structure:
    // const formData = { ... };
    const methodologyArray = formData.methodology
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    const { error } = await supabase.from("tutor_applications").insert({
      user_id: user.id,
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone || null,
      age: formData.age ? parseInt(formData.age) : null,
      location: formData.location || null,
      education_level: formData.education_level,
      school_type: formData.school_type,
      subjects: formData.subjects,
      price_per_hour: parseFloat(formData.price_per_hour),
      mode: formData.mode,
      bio: formData.bio,
      experience: formData.experience || null,
      languages: formData.languages,
      methodology: methodologyArray,
      video_url: videoTab === 'url' ? formData.video_url : '',
      video_file_url: videoTab === 'file' ? formData.video_file_url : '',
      discount_info: formData.discount_info,
    });
    if (error) throw error;
    // Success toast or redirect
  } catch (error) {
    // Error toast
  } finally {
    setIsLoading(false);
  }
};
*/
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SubscriptionUpgrade from "@/components/SubscriptionUpgrade";
import { Brain, Send, Sparkles, Upload, FileText, Image as ImageIcon, X, Zap, CheckCircle2, Layers, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProAccess } from "@/hooks/useProAccess";
import { toast } from "sonner";

import AIModeSelector, { AIMode } from "@/components/ai/AIModeSelector";
import ConversationSidebar, { Conversation } from "@/components/ai/ConversationSidebar";
import ChatMessage, { TypingIndicator } from "@/components/ai/ChatMessage";
import QuickActions from "@/components/ai/QuickActions";
import QuizMode from "@/components/ai/modes/QuizMode";
import SummaryMode from "@/components/ai/modes/SummaryMode";
import AiFileAttachment from "@/components/ai/AiFileAttachment";
import { uploadAiFile } from "@/lib/aiFileUpload";
import { FlashcardCarousel } from "@/components/FlashcardCarousel";
import { FlashcardHistory } from "@/components/FlashcardHistory";
import { QuizHistory } from "@/components/QuizHistory";
import { extractTextFromImage } from "@/lib/ocrHelpers";

type Flashcard = { question: string; answer: string };
type Message = { 
  role: "user" | "assistant"; 
  content: string;
  attachment?: { 
    preview?: string; 
    storagePath?: string;
    fileName?: string;
    imageData?: string;
    mimeType?: string;
  };
};

const AIAssistant = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasProAccess, checkingAccess } = useProAccess();
  const [mode, setMode] = useState<AIMode>("chat");
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  // Per-card file attachment state
  const [chatAttachment, setChatAttachment] = useState<{ file: File; preview?: string; uploading?: boolean; uploadProgress?: number; storagePath?: string } | null>(null);
  const [flashcardsAttachment, setFlashcardsAttachment] = useState<{ file: File; preview?: string; uploading?: boolean; uploadProgress?: number; storagePath?: string } | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accessCheckError, setAccessCheckError] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  
  // Flashcard mode states
  const [flashcardText, setFlashcardText] = useState("");
  const [flashcardTitle, setFlashcardTitle] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [showQuizHistory, setShowQuizHistory] = useState(false);
  const [retakeQuizQuestions, setRetakeQuizQuestions] = useState<Array<{ question: string; options: string[]; correct_answer: string }> | null>(null);
  const [retakeQuizTitle, setRetakeQuizTitle] = useState<string>("");
  
  const handleLoadFlashcardSet = (cards: Array<{ question: string; answer: string }>, title: string) => {
    setFlashcards(cards);
    setFlashcardTitle(title);
    setShowHistory(false);
  };

  const handleRetakeQuiz = (questions: Array<{ question: string; options: string[]; correct_answer: string }>, title: string) => {
    setRetakeQuizQuestions(questions);
    setRetakeQuizTitle(title);
    setShowQuizHistory(false);
  };

  const [userNotes, setUserNotes] = useState<{ id: string; title: string; subject: string }[]>([]);

  // Conversation history states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load conversations - defined before useEffect that uses it
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoadingConversations(true);
    
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingConversations(false);
    }
  }, [user?.id]);

  // Load user notes - defined before useEffect that uses it
  const loadUserNotes = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, subject")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setUserNotes(data || []);
    } catch (error) {
      // Error handled silently
    }
  }, [user?.id]);

  // Retry function for access check
  const retryAccessCheck = useCallback(() => {
    setAccessCheckError(false);
    if (user?.id) {
      loadUserNotes();
      loadConversations();
    }
  }, [user?.id, loadUserNotes, loadConversations]);

  // Auto-activate tab and auto-generate flashcards from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');
    const noteId = searchParams.get('noteId');

    // Activate tab if specified
    if (tab && ['chat', 'flashcards', 'quiz', 'summary'].includes(tab)) {
      setMode(tab as AIMode);
    }

    // Auto-generate flashcards if action=generate and noteId present
    if (action === 'generate' && noteId && tab === 'flashcards' && !autoGenerating && user?.id) {
      setAutoGenerating(true);
      
      // Load note content and auto-generate
      const autoGenerate = async () => {
        try {
          // Fetch note content (notes table has: title, description, subject, file_url)
          const { data: noteData, error: noteError } = await supabase
            .from('notes')
            .select('title, description, file_url, subject')
            .eq('id', noteId)
            .single();

          if (noteError) throw noteError;

          // Set form fields
          setFlashcardTitle(noteData.title);
          if (noteData.subject) setSubject(noteData.subject);
          
          // Extract text from note
          let textContent = '';
          if (noteData.description) {
            textContent = noteData.description;
          } else if (noteData.file_url) {
            // If only file URL exists, show message
            textContent = 'Vsebina iz naloženih datotek';
          }
          
          setFlashcardText(textContent);
          
          // Show loading state immediately
          setIsLoading(true);
          setFlashcards([]);
          setRevealedCards(new Set());
          
          // Trigger generation if we have content
          if (textContent && textContent.length > 10) {
            const { data, error } = await supabase.functions.invoke("generate-flashcards-ai", {
              body: {
                text: textContent,
                subject: noteData.subject || null,
                title: noteData.title
              }
            });

            if (error) throw error;

            if (data?.flashcards) {
              setFlashcards(data.flashcards);
              
              // Save flashcard set
              await supabase.from('flashcard_sets').insert({
                user_id: user.id,
                title: noteData.title,
                content: data.flashcards
              });
              
              toast.success("Flashcards so ustvarjeni!");
            }
          } else {
            toast.error("Zapisek nima dovolj vsebine za generiranje flashcards.");
          }
        } catch (error) {
          console.error('Auto-generate error:', error);
          toast.error("Napaka pri avtomatskem generiranju flashcards.");
        } finally {
          setIsLoading(false);
          // Clear action and noteId params after processing
          searchParams.delete('action');
          searchParams.delete('noteId');
          setSearchParams(searchParams, { replace: true });
        }
      };

      autoGenerate();
    }
  }, [searchParams, setSearchParams, user?.id, autoGenerating]);

  useEffect(() => {
    if (user?.id) {
      loadUserNotes();
      loadConversations();
      
      // Load trial days left (only once, cached)
      const checkTrialDays = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('subscription_status, trial_ends_at')
            .eq('id', user.id)
            .single();
          
          if (data?.subscription_status === 'trialing' && data.trial_ends_at) {
            const daysLeft = Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0);
          }
        } catch (err) {
          // Silently fail
        }
      };
      checkTrialDays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (conversation.length > 0 && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      setConversation(data?.map(m => ({
        role: m.sender as "user" | "assistant",
        content: m.content
      })) || []);
      setCurrentConversationId(conversationId);
    } catch (error) {
      toast.error("Napaka pri nalaganju pogovora.");
    }
  };

  const createNewConversation = async (firstMessage: string) => {
    if (!user) return null;
    
    try {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      
      if (error) throw error;
      
      setConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      return data.id;
    } catch (error) {
      return null;
    }
  };

  const saveMessage = async (conversationId: string, sender: "user" | "ai", content: string) => {
    try {
      await supabase
        .from("ai_messages")
        .insert({ conversation_id: conversationId, sender, content });
    } catch (error) {
      // Error handled silently
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setConversation([]);
      }
      toast.success("Pogovor izbrisan.");
    } catch (error) {
      toast.error("Napaka pri brisanju pogovora.");
    }
  };

  const handleDeleteAllConversations = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      setConversations([]);
      setCurrentConversationId(null);
      setConversation([]);
      toast.success("Vsi pogovori izbrisani.");
    } catch (error) {
      toast.error("Napaka pri brisanju pogovorov.");
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setConversation([]);
  };

  // Modal open state for closing on PRO activation
  const [proModalOpen, setProModalOpen] = useState(true);

  // Check PRO status when component mounts or when returning from payment
  useEffect(() => {
    // Listen for when user returns from successful payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pro') === 'activated') {
      toast.success('Dobrodošli v Študko PRO! 🎉');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      setProModalOpen(false);
    }
  }, []);

  // Real-time subscription to profile changes - managed by useProAccess hook
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile-pro-status-ai')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // Show success toast if is_pro becomes true
          if (payload.new?.is_pro && !payload.old?.is_pro) {
            toast.success('PRO funkcije so sedaj aktivne! 🚀');
            setProModalOpen(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const [isRedirecting, setIsRedirecting] = useState(false);
  const handleStartTrial = async () => {
    if (isRedirecting || !user) return;
    setIsRedirecting(true);
    try {
      // Check if trial was already used
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_used, trial_ends_at')
        .eq('id', user.id)
        .single();

      const hasUsedTrial = profile?.trial_used || 
        (profile?.trial_ends_at && new Date(profile.trial_ends_at) < new Date());

      // Use new subscription checkout function
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { 
          userId: user.id,
          trialUsed: hasUsedTrial
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error("Napaka pri preusmeritvi na Stripe.");
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage = `${subject ? `[${subject}] ` : ""}${question}`;
    const newUserMessage: Message = { role: "user", content: userMessage };

    setConversation(prev => [...prev, newUserMessage]);
    setQuestion("");
    setFiles([]);
    setImages([]);
    setIsLoading(true);

    let convId = currentConversationId;
    if (!convId) {
      convId = await createNewConversation(userMessage);
    }

    if (convId) {
      await saveMessage(convId, "user", userMessage);
    }

    // Refresh session before AI call to ensure fresh authentication
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.warn("Session check warning:", sessionError);
        await supabase.auth.refreshSession();
      }
    } catch (err) {
      console.error('Session refresh failed:', err);
    }

    // Retry logic - try up to 2 times
    let retryCount = 0;
    const maxRetries = 2;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        // Get fresh access token
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const accessToken = currentSession?.access_token;
        
        if (!accessToken) {
          throw new Error('No access token available');
        }
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('Supabase configuration missing!', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
          toast.error('Napaka konfiguracije - manjkajoči podatki');
          setIsLoading(false);
          return;
        }
        
        const functionUrl = `${supabaseUrl}/functions/v1/ai-chat`;
        console.log('=== AI Chat Request Debug ===');
        console.log('URL:', functionUrl);
        console.log('Access Token (first 20 chars):', accessToken?.substring(0, 20) + '...');
        console.log('API Key (first 20 chars):', supabaseKey?.substring(0, 20) + '...');
        console.log('Message count:', [...conversation, newUserMessage].length);
        
        const requestHeaders = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": supabaseKey,
        };
        
        console.log('Headers being sent:', Object.keys(requestHeaders));
        
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            messages: [...conversation, newUserMessage],
            conversationId: convId,
          }),
        });

        console.log('=== AI Chat Response ===');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          // Try to read response body for more details
          const responseText = await response.text();
          console.log('Error Response Body:', responseText);
          
          if (response.status === 404) {
            console.error('AI API 404 Error - Function not found or not deployed:', functionUrl);
            toast.error('AI funkcija ni na voljo. Preverite namestitev.');
            setIsLoading(false);
            return;
          }
          if (response.status === 429) {
            // Get detailed rate limit error
            try {
              const errorData = await response.json();
              console.error('AI Rate Limit Error:', errorData);
              toast.error(errorData.error || "Preveč zahtev. Poskusi kasneje.");
            } catch {
              toast.error("Preveč zahtev. Poskusi kasneje.");
            }
            setIsLoading(false);
            return;
          }
          if (response.status === 401) {
            // Try to get detailed error message
            try {
              const errorData = await response.json();
              console.error('AI Auth Error:', errorData);
              toast.error(errorData.error || 'Avtentikacija ni uspela. Prosimo prijavite se ponovno.');
            } catch {
              toast.error('Avtentikacija ni uspela. Prosimo prijavite se ponovno.');
            }
            setIsLoading(false);
            return;
          }
          
          // For other errors, try to get error message
          try {
            const errorData = await response.json();
            console.error('AI API Error:', { status: response.status, data: errorData });
            const errorMsg = errorData.error || `Napaka ${response.status}`;
            toast.error(`Napaka pri komunikaciji z AI: ${errorMsg}`);
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('AI API Error (no json):', response.status);
            toast.error(`Napaka pri komunikaciji z AI. Koda: ${response.status}`);
            setIsLoading(false);
            return;
          }
        }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      console.log('Starting to read streaming response...');
      setConversation(prev => [...prev, { role: "assistant", content: "" }]);

      if (!reader) {
        console.error('No reader available from response body');
        toast.error('Napaka pri branju odgovora');
        setIsLoading(false);
        return;
      }

      let chunkCount = 0;
      while (reader) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`Stream done. Total chunks: ${chunkCount}, Response length: ${aiResponse.length}`);
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value, { stream: true });
        console.log(`Chunk ${chunkCount}:`, chunk.substring(0, 100));
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                aiResponse += content;
                setConversation(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: aiResponse };
                  return updated;
                });
              }
            } catch (err) {
              console.warn('Failed to parse SSE line:', line, err);
            }
          }
        }
      }

      console.log('Final AI response length:', aiResponse.length);

      if (convId && aiResponse) {
        await saveMessage(convId, "ai", aiResponse);
      }
      // Success - exit retry loop
      break;
    } catch (error) {
      lastError = error as Error;
      retryCount++;
      console.error(`AI call attempt ${retryCount} failed:`, error);
      
      if (retryCount < maxRetries) {
        toast.info(`Poskušam znova (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      } else {
        toast.error(`Napaka pri komunikaciji z AI. ${lastError?.message || ''}`);
        setConversation(prev => prev.slice(0, -1));
      }
    }
    } // End while retry loop
  
    setIsLoading(false);
  };

  const handleQuickAction = async (action: string) => {
    const lastAiMessage = [...conversation].reverse().find(m => m.role === "assistant");
    if (!lastAiMessage) return;

    setIsLoading(true);

    try {
      // Get fresh access token
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        toast.error('Seja je potekla. Prosimo prijavite se ponovno.');
        setIsLoading(false);
        return;
      }
      
      const accessToken = currentSession?.access_token;
      
      if (!accessToken) {
        toast.error('Seja je potekla. Osvežujem...');
        await supabase.auth.refreshSession();
        setIsLoading(false);
        return;
      }
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration missing!');
        toast.error('Napaka konfiguracije - manjkajoči podatki');
        setIsLoading(false);
        return;
      }
      
      const functionUrl = `${supabaseUrl}/functions/v1/ai-chat`;
      console.log('Quick Action AI request to:', functionUrl);
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          messages: conversation,
          quickAction: action,
          lastResponse: lastAiMessage.content,
        }),
      });

      console.log('Quick Action AI response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.error('AI API 404 Error - Function not found:', functionUrl);
          toast.error('AI funkcija ni na voljo. Preverite namestitev.');
          setIsLoading(false);
          return;
        }
        if (response.status === 401) {
          toast.error('Avtentikacija ni uspela. Prosimo prijavite se ponovno.');
          setIsLoading(false);
          return;
        }
        throw new Error("API error");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      setConversation(prev => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                aiResponse += content;
                setConversation(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: aiResponse };
                  return updated;
                });
              }
            } catch (err) {
              // Optionally log error
            }
          }
        }
      }

      if (currentConversationId && aiResponse) {
        await saveMessage(currentConversationId, "ai", aiResponse);
      }
    } catch (error) {
      toast.error("Napaka pri komunikaciji z AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!flashcardText.trim() || !flashcardTitle.trim()) {
      toast.error("Prosim, vnesi naslov in besedilo za flashcards.");
      return;
    }

    setIsLoading(true);
    setFlashcards([]);
    setRevealedCards(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcards-ai", {
        body: {
          text: flashcardText,
          subject: subject || null,
          title: flashcardTitle
        }
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Preveč zahtev. Poskusi kasneje.");
        } else {
          toast.error("Napaka pri generiranju flashcards.");
        }
        return;
      }

      if (data?.flashcards) {
        setFlashcards(data.flashcards);
        
        // Save flashcard set to database
        if (user) {
          try {
            await supabase.from('flashcard_sets').insert({
              user_id: user.id,
              title: flashcardTitle,
              content: data.flashcards
            });
          } catch (saveError) {
            console.error("Error saving flashcard set:", saveError);
            // Don't show error to user, just log it
          }
        }
        
        toast.success(data.message || "Flashcards so ustvarjeni!");
      }
    } catch (error) {
      toast.error("Napaka pri generiranju flashcards.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast.error("Prosim, naloži sliko (JPG, PNG, etc.)");
      return;
    }

    setIsLoading(true);
    try {
      const result = await extractTextFromImage(file);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.text) {
        setFlashcardText(result.text);
        toast.success("Besedilo izvlečeno iz slike!");
      } else {
        toast.error("Ni bilo mogoče izvleči besedila iz slike");
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Napaka pri branju slike");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCardReveal = (index: number) => {
    const newRevealed = new Set(revealedCards);
    if (newRevealed.has(index)) {
      newRevealed.delete(index);
    } else {
      newRevealed.add(index);
    }
    setRevealedCards(newRevealed);
  };

  const handleNoteSelect = async (noteId: string) => {
    setSelectedNoteId(noteId);
    if (!noteId) return;

    const note = userNotes.find(n => n.id === noteId);
    if (note) {
      setFlashcardTitle(`${note.subject} - ${note.title}`);
      setSubject(note.subject);
      setFlashcardText("");
    }
  };

  // Removed handleUploadAction as upload mode is removed

  // Handle chat attachment upload before sending
  const handleChatWithAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    let uploadedAttachment: { preview?: string; storagePath?: string; fileName?: string; imageData?: string; mimeType?: string } | undefined;

    // If there's an attachment, upload it first
    if (chatAttachment && !chatAttachment.storagePath && user) {
      setChatAttachment(prev => prev ? { ...prev, uploading: true } : null);
      
      const result = await uploadAiFile(user.id, chatAttachment.file, (progress) => {
        setChatAttachment(prev => prev ? { ...prev, uploadProgress: progress } : null);
      });
      
      if (result.error) {
        toast.error("Napaka pri nalaganju datoteke.");
        setChatAttachment(prev => prev ? { ...prev, uploading: false } : null);
        return;
      }
      
      // Convert image to base64 for AI if it's an image
      let imageData: string | undefined;
      let mimeType: string | undefined;
      
      if (chatAttachment.file.type.startsWith('image/')) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1]; // Remove data:image/xxx;base64, prefix
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(chatAttachment.file);
          });
          imageData = await base64Promise;
          mimeType = chatAttachment.file.type;
        } catch (err) {
          console.error('Failed to convert image to base64:', err);
        }
      }
      
      uploadedAttachment = {
        preview: chatAttachment.preview,
        storagePath: result.path,
        fileName: chatAttachment.file.name,
        imageData,
        mimeType
      };
      
      setChatAttachment(prev => prev ? { ...prev, uploading: false, storagePath: result.path } : null);
    } else if (chatAttachment?.storagePath) {
      uploadedAttachment = {
        preview: chatAttachment.preview,
        storagePath: chatAttachment.storagePath,
        fileName: chatAttachment.file.name
      };
    }

    const userMessage = `${subject ? `[${subject}] ` : ""}${question}`;
    const newUserMessage: Message = { 
      role: "user", 
      content: userMessage,
      attachment: uploadedAttachment
    };

    setConversation(prev => [...prev, newUserMessage]);
    setQuestion("");
    setChatAttachment(null);
    setIsLoading(true);

    let convId = currentConversationId;
    if (!convId) {
      convId = await createNewConversation(userMessage);
    }

    if (convId) {
      await saveMessage(convId, "user", userMessage);
    }

    // Continue with AI call (same as handleSubmit)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        await supabase.auth.refreshSession();
      }
    } catch (err) {
      console.error('Session refresh failed:', err);
    }

    let retryCount = 0;
    const maxRetries = 2;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const accessToken = currentSession?.access_token;
        
        if (!accessToken) {
          throw new Error('No access token available');
        }
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          toast.error('Napaka konfiguracije');
          setIsLoading(false);
          return;
        }
        
        const functionUrl = `${supabaseUrl}/functions/v1/ai-chat`;
        
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            messages: [...conversation, newUserMessage],
            conversationId: convId,
          }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          
          if (response.status === 404) {
            toast.error('AI funkcija ni na voljo.');
            setIsLoading(false);
            return;
          }
          if (response.status === 429) {
            toast.error("Preveč zahtev. Poskusi kasneje.");
            setIsLoading(false);
            return;
          }
          
          toast.error(`Napaka pri komunikaciji z AI. Koda: ${response.status}`);
          setIsLoading(false);
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let aiResponse = "";

        setConversation(prev => [...prev, { role: "assistant", content: "" }]);

        if (!reader) {
          toast.error('Napaka pri branju odgovora');
          setIsLoading(false);
          return;
        }

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  aiResponse += content;
                  setConversation(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: aiResponse };
                    return updated;
                  });
                }
              } catch (err) {
                // Ignore parse errors
              }
            }
          }
        }

        if (convId && aiResponse) {
          await saveMessage(convId, "ai", aiResponse);
        }
        break;
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        
        if (retryCount < maxRetries) {
          toast.info(`Poskušam znova (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          toast.error(`Napaka pri komunikaciji z AI. ${lastError?.message || ''}`);
          setConversation(prev => prev.slice(0, -1));
        }
      }
    }
  
    setIsLoading(false);
  };

  const lastAiResponse = [...conversation].reverse().find(m => m.role === "assistant")?.content;

  // Don't show loading spinner - use cached data immediately
  // Error handling removed to prevent forced logout

  // Show subscription upgrade for non-PRO users
  if (!hasProAccess && !checkingAccess) {
    return <SubscriptionUpgrade />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <div className="flex-grow container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 text-center relative overflow-hidden">
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl">
                <Brain className="w-6 h-6 sm:w-7 sm:h-7 lg:w-9 lg:h-9 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
              Študko AI Asistent
            </h1>
            <p className="text-white/90 text-lg">
              {hasProAccess 
                ? "Izberi način AI pomoči in začni z učenjem"
                : "Odkleni neomejeno AI pomoč in napredne funkcije za učenje"}
            </p>
            {hasProAccess && trialDaysLeft !== null && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">
                  PRO preizkus – še {trialDaysLeft} dni
                </span>
              </div>
            )}
            {hasProAccess && trialDaysLeft === null && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">
                  Študko PRO
                </span>
              </div>
            )}
          </div>

          {!hasProAccess ? (
            // PRO Paywall
            <div className="bg-card rounded-2xl border border-border shadow-2xl p-8 text-center max-w-xl mx-auto">
              <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-primary">
                <Zap className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Odkleni Študko PRO AI
              </h2>
              
              <p className="text-muted-foreground mb-6 text-lg">
                AI asistent in napredna pomoč za učenje sta na voljo samo z Študko PRO naročnino.
              </p>

              <div className="space-y-3 text-left mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Neomejene AI razlage po predmetih</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">AI Quiz, Flashcards in Povzetki</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Preverjanje domačih nalog</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Nalaganje in analiza dokumentov</span>
                </div>
              </div>

              <div className="bg-muted rounded-xl p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">Samo</p>
                <p className="text-4xl font-bold text-foreground">
                  3,49 €<span className="text-lg font-normal text-muted-foreground">/mesec</span>
                </p>
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                className="w-full shadow-glow-primary mb-3"
                onClick={handleStartTrial}
                disabled={isRedirecting}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {isRedirecting ? "Preusmerjanje..." : "Začni 7-dnevni brezplačni preizkus"}
                {isRedirecting && (
                  <svg className="animate-spin ml-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
              </Button>
              
              <button 
                onClick={async () => {
                  setIsLoading(true);
                  // Refresh page to check PRO status
                  window.location.reload();
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Že naročen? Osveži status
              </button>
            </div>
          ) : (
            // AI Interface
            <>
              {/* Mode Selector */}
              <div className="mb-6">
                <AIModeSelector mode={mode} onModeChange={setMode} />
              </div>

              <div className="flex gap-6">
                {/* Sidebar - only show for chat mode */}
                {mode === "chat" && (
                  <div className="hidden lg:block">
                    <ConversationSidebar
                      conversations={conversations}
                      currentConversationId={currentConversationId}
                      onSelectConversation={loadConversationMessages}
                      onNewConversation={handleNewConversation}
                      onDeleteConversation={handleDeleteConversation}
                      onDeleteAllConversations={handleDeleteAllConversations}
                      isLoading={loadingConversations}
                    />
                  </div>
                )}

                {/* Main Content */}
                <div className="flex-1">
                  {mode === "chat" && (
                    <>
                      {/* Chat Area */}
                      <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-lg mb-4 sm:mb-6">
                        <div 
                          ref={chatContainerRef}
                          className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 min-h-[400px] sm:min-h-[350px] max-h-[calc(100vh-28rem)] sm:max-h-[450px] overflow-y-auto"
                        >
                          {conversation.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                              <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-glow-primary">
                                <Sparkles className="w-10 h-10 text-white" />
                              </div>
                              <h3 className="text-xl font-bold text-foreground mb-2">
                                Pozdravljeni! 👋
                              </h3>
                              <p className="text-muted-foreground max-w-md">
                                Izberi predmet, postavi vprašanje ali naloži datoteke. Pomagal ti bom z razlago snovi.
                              </p>
                            </div>
                          ) : (
                            <>
                              {conversation.map((message, index) => (
                                <ChatMessage 
                                  key={index} 
                                  role={message.role} 
                                  content={message.content}
                                  attachment={message.attachment}
                                />
                              ))}
                              {isLoading && <TypingIndicator />}
                              <div ref={chatEndRef} />
                            </>
                          )}
                        </div>
                        
                        {/* Quick Actions */}
                        {conversation.length > 0 && (
                          <div className="px-6 pb-4">
                            <QuickActions 
                              onAction={handleQuickAction} 
                              disabled={isLoading}
                              lastAiResponse={lastAiResponse}
                            />
                          </div>
                        )}
                      </div>

                      {/* Chat Input Form */}
                      <form onSubmit={handleChatWithAttachment} className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-2xl p-3 sm:p-4 lg:p-6">
                        {/* File attachment section */}
                        <div className="mb-3 sm:mb-4 flex items-start gap-2 sm:gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <Label htmlFor="subject" className="text-foreground">Predmet</Label>
                              <AiFileAttachment
                                attachedFile={chatAttachment}
                                onFileAttach={setChatAttachment}
                                onFileRemove={() => setChatAttachment(null)}
                                disabled={isLoading}
                              />
                            </div>
                            <Select value={subject} onValueChange={setSubject}>
                              <SelectTrigger id="subject" className="bg-background text-foreground border-border">
                                <SelectValue placeholder="Izberi predmet (neobvezno)" />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="Matematika">Matematika</SelectItem>
                                <SelectItem value="Fizika">Fizika</SelectItem>
                                <SelectItem value="Kemija">Kemija</SelectItem>
                                <SelectItem value="Biologija">Biologija</SelectItem>
                                <SelectItem value="Slovenščina">Slovenščina</SelectItem>
                                <SelectItem value="Angleščina">Angleščina</SelectItem>
                                <SelectItem value="Računalništvo">Računalništvo / Programiranje</SelectItem>
                                <SelectItem value="Zgodovina">Zgodovina</SelectItem>
                                <SelectItem value="Geografija">Geografija</SelectItem>
                                <SelectItem value="Ekonomija">Ekonomija</SelectItem>
                                <SelectItem value="Ostalo">Ostalo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Show attached file preview */}
                        {chatAttachment && (
                          <div className="mb-4">
                            <AiFileAttachment
                              attachedFile={chatAttachment}
                              onFileAttach={setChatAttachment}
                              onFileRemove={() => setChatAttachment(null)}
                              disabled={isLoading}
                            />
                          </div>
                        )}

                        <div className="mb-3 sm:mb-4">
                          <Label htmlFor="question" className="text-foreground text-sm sm:text-base">Kakšna je tvoja težava ali vprašanje?</Label>
                          <Textarea
                            id="question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Opiši težavo, vprašanje ali snov, pri kateri potrebuješ pomoč..."
                            className="mt-2 min-h-[100px] sm:min-h-[120px] bg-background text-foreground border-border text-sm sm:text-base"
                          />
                        </div>

                        <Button
                          type="submit"
                          variant="hero"
                          size="lg"
                          disabled={!question.trim() || isLoading || chatAttachment?.uploading}
                          className="w-full shadow-glow-primary min-h-[48px] text-sm sm:text-base"
                        >
                          {isLoading || chatAttachment?.uploading ? (
                            <>{chatAttachment?.uploading ? "Nalagam datoteko..." : "Čakam na odgovor..."}</>
                          ) : (
                            <>
                              <Send className="w-5 h-5 mr-2" />
                              Pošlji
                            </>
                          )}
                        </Button>
                      </form>
                    </>
                  )}

                  {mode === "flashcards" && (
                    <>
                      {/* History toggle button */}
                      <div className="mb-6">
                        <Button
                          variant={showHistory ? "default" : "outline"}
                          onClick={() => setShowHistory(!showHistory)}
                          className="w-full"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {showHistory ? "Skrij zgodovino" : "Moja zbirka"}
                        </Button>
                      </div>

                      {/* Show history if toggled */}
                      {showHistory && (
                        <div className="mb-6">
                          <FlashcardHistory onLoadSet={handleLoadFlashcardSet} />
                        </div>
                      )}

                      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 mb-6">
                        <h2 className="text-2xl font-bold text-foreground mb-4">
                          Ustvari flashcards
                        </h2>

                        <div className="mb-4">
                          <Label className="text-foreground">Predmet (neobvezno)</Label>
                          <Select value={subject} onValueChange={setSubject}>
                            <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                              <SelectValue placeholder="Izberi predmet" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border z-50">
                              <SelectItem value="Matematika">Matematika</SelectItem>
                              <SelectItem value="Fizika">Fizika</SelectItem>
                              <SelectItem value="Kemija">Kemija</SelectItem>
                              <SelectItem value="Biologija">Biologija</SelectItem>
                              <SelectItem value="Slovenščina">Slovenščina</SelectItem>
                              <SelectItem value="Angleščina">Angleščina</SelectItem>
                              <SelectItem value="Računalništvo">Računalništvo</SelectItem>
                              <SelectItem value="Ostalo">Ostalo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="mb-4">
                          <Label className="text-foreground">Naslov flashcard seta *</Label>
                          <Input
                            value={flashcardTitle}
                            onChange={(e) => setFlashcardTitle(e.target.value)}
                            placeholder="npr. Matematika - Trigonometrija"
                            className="mt-2 bg-background text-foreground border-border"
                          />
                        </div>

                        {userNotes.length > 0 && (
                          <div className="mb-4">
                            <Label className="text-foreground">Ali izberi svoje zapiske</Label>
                            <Select value={selectedNoteId} onValueChange={handleNoteSelect}>
                              <SelectTrigger className="mt-2 bg-background text-foreground border-border">
                                <SelectValue placeholder="Izberi zapiske (neobvezno)" />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border z-50">
                                {userNotes.map((note) => (
                                  <SelectItem key={note.id} value={note.id}>
                                    {note.subject} - {note.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="mb-4">
                          <Label className="text-foreground">Vstavi zapiske ali besedilo *</Label>
                          <Textarea
                            value={flashcardText}
                            onChange={(e) => setFlashcardText(e.target.value)}
                            placeholder="Kopiraj vsebino zapiskov ali vpiši snov, iz katere želiš ustvariti flashcards..."
                            className="mt-2 min-h-[200px] bg-background text-foreground border-border"
                          />
                          <div className="mt-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageOCR}
                              className="hidden"
                              id="ocr-image-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('ocr-image-upload')?.click()}
                              disabled={isLoading}
                              className="w-full"
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              {isLoading && flashcardText === "" ? "Skeniranje slike..." : "Naloži sliko zapiskov (OCR)"}
                            </Button>
                          </div>
                        </div>

                        <Button
                          variant="hero"
                          size="lg"
                          onClick={handleGenerateFlashcards}
                          disabled={!flashcardText.trim() || !flashcardTitle.trim() || isLoading}
                          className="w-full shadow-glow-primary"
                        >
                          {isLoading ? (
                            <>Generiranje flashcards...</>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Generiraj flashcards
                            </>
                          )}
                        </Button>
                      </div>

                      {isLoading && flashcards.length === 0 && (
                        <div className="bg-card rounded-2xl border border-border shadow-lg p-6 mb-6">
                          <div className="flex items-center justify-center py-12">
                            <div className="text-center space-y-4">
                              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                              <p className="text-muted-foreground font-medium">AI generira flashcards...</p>
                              <p className="text-sm text-muted-foreground">To lahko traja nekaj sekund</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {flashcards.length > 0 && (
                        <FlashcardCarousel 
                          flashcards={flashcards}
                          title={flashcardTitle}
                          onReset={() => {
                            setFlashcards([]);
                            setFlashcardText("");
                            setFlashcardTitle("");
                          }}
                        />
                      )}
                    </>
                  )}

                  {mode === "quiz" && (
                    <>
                      {/* Quiz History toggle button */}
                      <div className="mb-6">
                        <Button
                          variant={showQuizHistory ? "default" : "outline"}
                          onClick={() => setShowQuizHistory(!showQuizHistory)}
                          className="w-full"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {showQuizHistory ? "Skrij zgodovino" : "Zgodovina kvizov"}
                        </Button>
                      </div>

                      {/* Show quiz history if toggled */}
                      {showQuizHistory ? (
                        <QuizHistory onRetakeQuiz={handleRetakeQuiz} />
                      ) : (
                        <QuizMode 
                          isLoading={isLoading} 
                          setIsLoading={setIsLoading}
                          initialQuestions={retakeQuizQuestions ? retakeQuizQuestions.map((q, idx) => ({
                            id: idx + 1,
                            type: 'multiple_choice' as const,
                            question: q.question,
                            options: q.options,
                            correct_answer: q.correct_answer,
                            explanation: ''
                          })) : undefined}
                          initialTitle={retakeQuizTitle || undefined}
                        />
                      )}
                    </>
                  )}

                  {mode === "summary" && (
                    <SummaryMode isLoading={isLoading} setIsLoading={setIsLoading} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AIAssistant;
