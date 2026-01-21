import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Sparkles, CheckCircle, CheckCircle2, XCircle, ArrowRight, Trophy, Clock, Target, RotateCcw, Timer, Share2, Flame, Zap, BookOpen, Brain } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AiFileAttachment from "../AiFileAttachment";
import DocumentPreview from "../DocumentPreview";
import { extractTextFromFile, ExtractedContent } from "@/lib/fileTextExtractor";
import confetti from "canvas-confetti";
import { Switch } from "@/components/ui/switch";
import { getUserStats, updateStatsAfterQuiz, getLevelInfo, UserQuizStats } from "@/lib/quizHelpers";

interface QuizQuestion {
  id: number;
  type: "multiple_choice" | "true_false" | "open_ended";
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  user_answer?: string;
  is_correct?: boolean;
}

interface AttachedFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploadProgress?: number;
  storagePath?: string;
}

interface QuizModeProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  initialQuestions?: QuizQuestion[];
  initialTitle?: string;
}

export const QuizMode = ({ isLoading, setIsLoading, initialQuestions, initialTitle }: QuizModeProps) => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const [quizTitle, setQuizTitle] = useState(initialTitle || "");
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState<number | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [startTime, setStartTime] = useState<number>(initialQuestions ? Date.now() : 0);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [questionTimer, setQuestionTimer] = useState<number>(20);
  const [timerEnabled, setTimerEnabled] = useState<boolean>(false);
  const [quizResultId, setQuizResultId] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  
  // New gamification states
  const [userStats, setUserStats] = useState<UserQuizStats | null>(null);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<QuizQuestion[]>([]);
  
  // Ref for smooth scroll to review section
  const reviewModeRef = useRef<HTMLDivElement>(null);

  // Load user stats on mount
  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  // Smooth scroll to review mode when opened
  useEffect(() => {
    if (showReviewMode && reviewModeRef.current) {
      reviewModeRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [showReviewMode]);

  const loadUserStats = async () => {
    if (!user) return;
    const stats = await getUserStats(user.id);
    setUserStats(stats);
  };

  // Timer effect
  useEffect(() => {
    if (questions.length > 0 && showResult === null && timerEnabled && questionTimer > 0) {
      const interval = setInterval(() => {
        setQuestionTimer(prev => {
          if (prev <= 1) {
            // Time's up - auto-submit wrong answer
            checkAnswer();
            return 20;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [questions.length, showResult, currentIndex, timerEnabled, questionTimer]);

  const handleFileAttach = async (file: AttachedFile) => {
    setAttachedFile(file);
    setIsExtracting(true);
    
    try {
      const content = await extractTextFromFile(file.file);
      setExtractedContent(content);
      setInputText(prev => prev ? `${prev}\n\n${content.text}` : content.text);
      toast.success("Dokument obdelan!");
    } catch (error) {
      console.error("Error extracting text:", error);
      toast.error("Napaka pri branju dokumenta.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileRemove = () => {
    setAttachedFile(null);
    setExtractedContent(null);
  };

  const handleGenerateQuiz = async () => {
    if (!inputText.trim()) {
      toast.error("Prosim, vnesi besedilo za quiz.");
      return;
    }

    setIsLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers({});
    setShowResult(null);
    setQuizComplete(false);
    setStartTime(Date.now());

    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { text: inputText }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("API error:", data.error);
        console.error("Error details:", data.details);
        console.error("Full data:", data);
        toast.error(data.error);
        return;
      }

      if (data?.questions) {
        setQuestions(data.questions);
        toast.success(`Generiranih ${data.questions.length} vprašanj!`);
      } else {
        toast.error("Ni bilo mogoče generirati vprašanj.");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Napaka pri generiranju kviza. Poskusi ponovno.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    setUserAnswers({ ...userAnswers, [currentIndex]: answer });
  };

  const checkAnswer = () => {
    setShowResult(currentIndex);
  };

  const nextQuestion = () => {
    // Store answer correctness
    const correct = isCorrect;
    const updatedQuestions = [...questions];
    updatedQuestions[currentIndex] = {
      ...updatedQuestions[currentIndex],
      user_answer: userAnswers[currentIndex],
      is_correct: correct,
    };
    setQuestions(updatedQuestions);
    
    setShowResult(null);
    setQuestionTimer(20); // Reset timer
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeTaken(timeElapsed);
      
      // Calculate wrong questions for review mode
      const wrong = updatedQuestions.filter(q => !q.is_correct);
      setWrongQuestions(wrong);
      
      setQuizComplete(true);
      saveQuizResult(timeElapsed);
    }
  };

  const saveQuizResult = async (time: number) => {
    if (!user) return;

    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);

    // Update user stats and check for level up
    const { stats, leveledUp, oldLevel } = await updateStatsAfterQuiz(
      user.id,
      score,
      questions.length
    );

    if (stats) {
      setUserStats(stats);
    }

    // Confetti for level up
    if (leveledUp) {
      confetti({
        particleCount: 200,
        spread: 160,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#8B5CF6', '#EC4899'],
        shapes: ['star'],
        scalar: 1.2,
      });
      
      toast.success(`🎉 Level Up! Postal si ${getLevelInfo(stats?.total_xp || 0).title}!`, {
        duration: 5000,
      });
    }

    // Confetti for excellent results
    if (percentage >= 80 && !leveledUp) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981'],
      });
    }

    try {
      const { data, error } = await supabase.from('quiz_results').insert({
        user_id: user.id,
        title: quizTitle || 'Quiz',
        score: score,
        total_questions: questions.length,
        time_taken: time,
        quiz_data: {
          questions: questions,
          userAnswers: userAnswers,
        }
      }).select().single();

      if (data && !error) {
        setQuizResultId(data.id);
      }
    } catch (error) {
      console.error("Error saving quiz result:", error);
    }
  };

  const handleShareQuiz = async () => {
    if (!user) return;

    setShareLoading(true);
    try {
      // Generate unique share code
      const shareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase.from('shared_quizzes').insert({
        quiz_id: quizResultId,
        share_code: shareCode,
        created_by: user.id,
        quiz_data: {
          questions: questions,
        },
        title: quizTitle || 'Quiz',
        total_questions: questions.length,
      });

      if (error) throw error;

      // Create share URL
      const shareUrl = `${window.location.origin}/quiz/${shareCode}`;
      
      // Try Web Share API first (for mobile devices)
      if (navigator.share) {
        try {
          await navigator.share({
            title: quizTitle || 'Quiz Izziv',
            text: 'Izzivam te na kviz! Lahko me premagaš? 🎯',
            url: shareUrl,
          });
          toast.success("Delitev uspešna! 🎉");
          return; // Exit if share was successful
        } catch (shareError) {
          // User cancelled - don't show error
          const err = shareError as Error;
          if (err.name === 'AbortError') {
            return;
          }
          // If share failed for other reasons, continue to clipboard
        }
      }
      
      // Fallback to clipboard
      let copied = false;
      
      // Modern clipboard API (secure context only)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          copied = true;
        } catch (clipboardError) {
          console.warn("Clipboard API failed:", clipboardError);
        }
      }
      
      // Fallback for older browsers or non-HTTPS
      if (!copied) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            copied = true;
          }
        } catch (fallbackError) {
          console.error("Fallback copy failed:", fallbackError);
        }
      }
      
      if (copied) {
        toast.success("Povezava skopirana! Pošlji jo sošolcu. 📋");
      } else {
        // If all methods failed, show the URL
        toast.info(`Povezava: ${shareUrl}`, { duration: 10000 });
      }
    } catch (error) {
      console.error("Error sharing quiz:", error);
      toast.error("Napaka pri deljenju kviza");
    } finally {
      setShareLoading(false);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (userAnswers[i]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
        correct++;
      }
    });
    return correct;
  };

  const currentQuestion = questions[currentIndex];
  const isCorrect = showResult !== null && 
    userAnswers[currentIndex]?.toLowerCase().trim() === currentQuestion?.correct_answer.toLowerCase().trim();

  // Render Level Progress Bar Component
  const renderLevelProgressBar = () => {
    if (!userStats) return null;
    
    const levelInfo = getLevelInfo(userStats.total_xp);
    const progressPercentage = (levelInfo.xpProgress / levelInfo.xpNeeded) * 100;

    return (
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{levelInfo.title}</h3>
              <p className="text-xs text-muted-foreground">Level {levelInfo.level}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {userStats.current_streak > 0 && (
              <div className="flex items-center gap-1 bg-orange-500/20 px-3 py-1.5 rounded-full">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-bold text-orange-500">{userStats.current_streak} 🔥</span>
              </div>
            )}
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">
                {levelInfo.currentXP} XP
              </div>
              <div className="text-xs text-muted-foreground">
                {levelInfo.level < 5 ? `${levelInfo.xpForNextLevel - levelInfo.currentXP} do naslednjega` : "Max level!"}
              </div>
            </div>
          </div>
        </div>
        
        {levelInfo.level < 5 && (
          <div className="relative w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow-lg">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (questions.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
        {/* Level Progress Bar */}
        {renderLevelProgressBar()}
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Generiraj Quiz</h2>
          <AiFileAttachment
            attachedFile={attachedFile}
            onFileAttach={handleFileAttach}
            onFileRemove={handleFileRemove}
            disabled={isLoading || isExtracting}
          />
        </div>

        {/* Document Preview */}
        {extractedContent && (
          <DocumentPreview
            fileName={extractedContent.fileName}
            fileType={extractedContent.fileType}
            extractedText={extractedContent.text}
            pageCount={extractedContent.pageCount}
            imagePreview={attachedFile?.preview}
          />
        )}
        
        <div className="mb-4">
          <Label className="text-foreground">Naslov kviza</Label>
          <Input
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="npr. Matura Matematika"
            className="mt-2 bg-background text-foreground border-border"
          />
        </div>

        <div className="mb-4">
          <Label className="text-foreground">Vstavi besedilo za quiz *</Label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Kopiraj vsebino zapiskov ali vpiši snov, iz katere želiš ustvariti quiz..."
            className="mt-2 min-h-[200px] bg-background text-foreground border-border"
          />
        </div>

        <div className="mb-4 flex items-center justify-between bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            <div>
              <Label className="text-foreground font-semibold">Izziv z odštevalnikom</Label>
              <p className="text-xs text-muted-foreground">20 sekund na vprašanje</p>
            </div>
          </div>
          <Switch
            checked={timerEnabled}
            onCheckedChange={setTimerEnabled}
          />
        </div>

        <Button
          variant="hero"
          size="lg"
          onClick={handleGenerateQuiz}
          disabled={!inputText.trim() || isLoading || isExtracting}
          className="w-full shadow-glow-primary"
        >
          {isExtracting ? (
            <>Branje dokumenta...</>
          ) : isLoading ? (
            <>Generiranje quiza...</>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generiraj Quiz
            </>
          )}
        </Button>
      </div>
    );
  }

  // Review Mode Screen - check this FIRST before Results screen
  if (showReviewMode && wrongQuestions.length > 0) {
    return (
      <div ref={reviewModeRef} className="bg-card rounded-2xl border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-7 h-7 text-blue-500" />
            Pregled napak
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReviewMode(false)}
          >
            Nazaj na rezultate
          </Button>
        </div>

        <div className="space-y-6">
          {wrongQuestions.map((question, idx) => (
            <div key={idx} className="bg-red-500/5 border-2 border-red-500/20 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <XCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Vprašanje {questions.indexOf(question) + 1}
                  </h3>
                  <p className="text-foreground mb-4">{question.question}</p>
                  
                  {/* Display all options with visual feedback */}
                  {question.options && question.options.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optionIdx) => {
                        const isCorrect = option === question.correct_answer;
                        const isUserAnswer = option === question.user_answer;
                        
                        return (
                          <div
                            key={optionIdx}
                            className={`p-3 rounded-lg border ${
                              isCorrect
                                ? 'bg-green-500/10 border-green-500/30'
                                : isUserAnswer
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-background/50 border-border/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isCorrect && (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              )}
                              {isUserAnswer && !isCorrect && (
                                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                              )}
                              <span
                                className={`flex-1 ${
                                  isUserAnswer && !isCorrect
                                    ? 'line-through text-muted-foreground'
                                    : isCorrect
                                    ? 'font-semibold text-green-600 dark:text-green-400'
                                    : 'text-foreground'
                                }`}
                              >
                                {option}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-background/50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-500 mb-1">
                        <strong>Tvoj odgovor:</strong> {question.user_answer}
                      </p>
                      <p className="text-sm text-green-500">
                        <strong>Pravilen odgovor:</strong> {question.correct_answer}
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Razlaga
                    </p>
                    <p className="text-sm text-foreground italic">
                      {question.explanation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            variant="hero"
            size="lg"
            onClick={() => setShowReviewMode(false)}
            className="shadow-glow-primary"
          >
            Nazaj na rezultate
          </Button>
        </div>
      </div>
    );
  }

  if (quizComplete) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;

    return (
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-8 text-center">
        {/* Trophy Icon */}
        <div className="mb-6">
          <Trophy className={`w-20 h-20 mx-auto ${
            percentage >= 80 ? "text-yellow-500" : 
            percentage >= 60 ? "text-blue-500" : 
            "text-muted-foreground"
          }`} />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-2">
          {percentage >= 80 ? "Odlično! 🎉" : 
           percentage >= 60 ? "Dobro delo! 👏" : 
           "Poskusi še enkrat! 💪"}
        </h2>
        
        {/* Score Card */}
        <div className="grid grid-cols-3 gap-4 my-8">
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
            <Target className="w-6 h-6 mx-auto text-purple-500 mb-2" />
            <div className={`text-4xl font-bold mb-1 ${
              percentage >= 70 ? "text-green-500" : 
              percentage >= 50 ? "text-yellow-500" : 
              "text-red-500"
            }`}>
              {percentage}%
            </div>
            <p className="text-xs text-muted-foreground">Uspešnost</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
            <CheckCircle2 className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <div className="text-4xl font-bold text-foreground mb-1">
              {score}/{questions.length}
            </div>
            <p className="text-xs text-muted-foreground">Pravilni odgovori</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
            <Clock className="w-6 h-6 mx-auto text-green-500 mb-2" />
            <div className="text-4xl font-bold text-foreground mb-1">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <p className="text-xs text-muted-foreground">Čas</p>
          </div>
        </div>

        {/* Motivational Message */}
        <p className="text-muted-foreground mb-6">
          {percentage >= 80 ? "Izjemno! Snov obvladaš odlično." :
           percentage >= 60 ? "Še malo vadbe in boš na vrhu!" :
           "Ne obupaj! Ponovi snov in poskusi znova."}
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          {wrongQuestions.length > 0 && (
            <Button
              variant="default"
              onClick={() => setShowReviewMode(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
            >
              <Brain className="w-4 h-4 mr-2" />
              Preglej napake ({wrongQuestions.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleShareQuiz}
            disabled={shareLoading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {shareLoading ? "Delim..." : "Izzovi sošolca"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setQuestions([]);
              setInputText("");
              setQuizTitle("");
              setAttachedFile(null);
              setExtractedContent(null);
              setCurrentIndex(0);
              setUserAnswers({});
              setShowResult(null);
              setQuizComplete(false);
              setQuizResultId(null);
              setShowReviewMode(false);
              setWrongQuestions([]);
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Nov Quiz
          </Button>
        </div>
      </div>
    );
  }

  if (quizComplete) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;

    return (
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-8 text-center">
        {/* Trophy Icon */}
        <div className="mb-6">
          <Trophy className={`w-20 h-20 mx-auto ${
            percentage >= 80 ? "text-yellow-500" : 
            percentage >= 60 ? "text-blue-500" : 
            "text-muted-foreground"
          }`} />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-2">
          {percentage >= 80 ? "Odlično! 🎉" : 
           percentage >= 60 ? "Dobro delo! 👏" : 
           "Poskusi še enkrat! 💪"}
        </h2>
        
        {/* Score Card */}
        <div className="grid grid-cols-3 gap-4 my-8">
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
            <Target className="w-6 h-6 mx-auto text-purple-500 mb-2" />
            <div className={`text-4xl font-bold mb-1 ${
              percentage >= 70 ? "text-green-500" : 
              percentage >= 50 ? "text-yellow-500" : 
              "text-red-500"
            }`}>
              {percentage}%
            </div>
            <p className="text-xs text-muted-foreground">Uspešnost</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
            <CheckCircle2 className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <div className="text-4xl font-bold text-foreground mb-1">
              {score}/{questions.length}
            </div>
            <p className="text-xs text-muted-foreground">Pravilni odgovori</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
            <Clock className="w-6 h-6 mx-auto text-green-500 mb-2" />
            <div className="text-4xl font-bold text-foreground mb-1">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <p className="text-xs text-muted-foreground">Čas</p>
          </div>
        </div>

        {/* Motivational Message */}
        <p className="text-muted-foreground mb-6">
          {percentage >= 80 ? "Izjemno! Snov obvladaš odlično." :
           percentage >= 60 ? "Še malo vadbe in boš na vrhu!" :
           "Ne obupaj! Ponovi snov in poskusi znova."}
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          {wrongQuestions.length > 0 && (
            <Button
              variant="default"
              onClick={() => setShowReviewMode(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
            >
              <Brain className="w-4 h-4 mr-2" />
              Preglej napake ({wrongQuestions.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleShareQuiz}
            disabled={shareLoading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {shareLoading ? "Delim..." : "Izzovi sošolca"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setQuestions([]);
              setInputText("");
              setQuizTitle("");
              setAttachedFile(null);
              setExtractedContent(null);
              setCurrentIndex(0);
              setUserAnswers({});
              setShowResult(null);
              setQuizComplete(false);
              setQuizResultId(null);
              setShowReviewMode(false);
              setWrongQuestions([]);
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Nov Quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-2xl p-6">
      {/* Level Progress Bar */}
      {renderLevelProgressBar()}
      
      {/* Progress Bar and Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span className="font-semibold">Vprašanje {currentIndex + 1} od {questions.length}</span>
          <div className="flex items-center gap-3">
            {timerEnabled && showResult === null && (
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                questionTimer <= 5 ? "bg-red-500/20 text-red-500" : "bg-primary/20 text-primary"
              }`}>
                <Timer className="w-4 h-4" />
                <span className="font-bold">{questionTimer}s</span>
              </div>
            )}
            <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl border-2 border-purple-500/20 p-6 mb-6">
        <h3 className="text-xl font-bold text-foreground mb-6">
          {currentQuestion.question}
        </h3>

        {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => {
              const isSelected = userAnswers[currentIndex] === option;
              const isAnswered = showResult !== null;
              const isCorrectOption = option.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();
              
              return (
                <button
                  key={i}
                  onClick={() => !isAnswered && handleAnswer(option)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isAnswered 
                      ? isCorrectOption
                        ? "bg-green-500/20 border-green-500 scale-105"
                        : isSelected
                        ? "bg-red-500/20 border-red-500"
                        : "bg-muted/50 border-border opacity-50"
                      : isSelected
                      ? "bg-primary/20 border-primary scale-105"
                      : "bg-background border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isAnswered
                        ? isCorrectOption
                          ? "border-green-500 bg-green-500"
                          : isSelected
                          ? "border-red-500 bg-red-500"
                          : "border-border"
                        : isSelected
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}>
                      {(isAnswered && isCorrectOption) || (isSelected && !isAnswered) ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : isAnswered && isSelected ? (
                        <XCircle className="w-4 h-4 text-white" />
                      ) : null}
                    </div>
                    <span className="font-medium text-foreground">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {currentQuestion.type === "true_false" && (
          <div className="space-y-3">
            {["Drži", "Ne drži"].map((option, i) => {
              const value = option === "Drži" ? "true" : "false";
              const isSelected = userAnswers[currentIndex] === value;
              const isAnswered = showResult !== null;
              const isCorrectOption = value === currentQuestion.correct_answer.toLowerCase();
              
              return (
                <button
                  key={i}
                  onClick={() => !isAnswered && handleAnswer(value)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isAnswered 
                      ? isCorrectOption
                        ? "bg-green-500/20 border-green-500 scale-105"
                        : isSelected
                        ? "bg-red-500/20 border-red-500"
                        : "bg-muted/50 border-border opacity-50"
                      : isSelected
                      ? "bg-primary/20 border-primary scale-105"
                      : "bg-background border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isAnswered
                        ? isCorrectOption
                          ? "border-green-500 bg-green-500"
                          : isSelected
                          ? "border-red-500 bg-red-500"
                          : "border-border"
                        : isSelected
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}>
                      {(isAnswered && isCorrectOption) || (isSelected && !isAnswered) ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : isAnswered && isSelected ? (
                        <XCircle className="w-4 h-4 text-white" />
                      ) : null}
                    </div>
                    <span className="font-medium text-foreground">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {currentQuestion.type === "open_ended" && (
          <Input
            value={userAnswers[currentIndex] || ""}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Vpiši svoj odgovor..."
            disabled={showResult !== null}
            className="bg-background text-lg p-4"
          />
        )}
      </div>

      {/* AI Explanation */}
      {showResult !== null && (
        <div className={`p-5 rounded-xl mb-6 border-2 ${
          isCorrect 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-start gap-3 mb-3">
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className={`font-bold text-lg ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                {isCorrect ? "Odlično! Pravilno!" : "Ups, napačno!"}
              </span>
              {!isCorrect && (
                <p className="text-sm text-foreground mt-2">
                  <strong>Pravilen odgovor:</strong> {currentQuestion.correct_answer}
                </p>
              )}
            </div>
          </div>
          <div className="bg-background/50 rounded-lg p-3 ml-9">
            <p className="text-sm text-foreground italic">💡 {currentQuestion.explanation}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {showResult === null ? (
          <Button
            variant="hero"
            size="lg"
            className="flex-1 shadow-glow-primary"
            onClick={checkAnswer}
            disabled={!userAnswers[currentIndex]}
          >
            Preveri odgovor
          </Button>
        ) : (
          <Button
            variant="hero"
            size="lg"
            className="flex-1 shadow-glow-primary"
            onClick={nextQuestion}
          >
            {currentIndex < questions.length - 1 ? (
              <>
                Naprej
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5 mr-2" />
                Zaključi quiz
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizMode;
