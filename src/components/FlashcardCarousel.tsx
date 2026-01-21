import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, RotateCcw, Grid3x3, Layers, Volume2, Download, Flame } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { speakText, celebrateProgress, exportToPDF } from "@/lib/flashcardHelpers";
import confetti from "canvas-confetti";

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardCarouselProps {
  flashcards: Flashcard[];
  onReset?: () => void;
  title?: string;
}

export const FlashcardCarousel = ({ flashcards, onReset, title = "Flashcards" }: FlashcardCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [streak, setStreak] = useState(0);

  const currentCard = flashcards[currentIndex];
  const progress = ((knownCards.size + unknownCards.size) / flashcards.length) * 100;

  // Load streak from localStorage
  useEffect(() => {
    const savedStreak = localStorage.getItem('flashcard_streak');
    const lastStudy = localStorage.getItem('last_study_date');
    
    if (savedStreak && lastStudy) {
      const last = new Date(lastStudy);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      last.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day
        setStreak(parseInt(savedStreak));
      } else if (diffDays === 1) {
        // Next day - increment
        const newStreak = parseInt(savedStreak) + 1;
        setStreak(newStreak);
        localStorage.setItem('flashcard_streak', newStreak.toString());
      } else {
        // Streak broken
        setStreak(1);
        localStorage.setItem('flashcard_streak', '1');
      }
    } else {
      setStreak(1);
      localStorage.setItem('flashcard_streak', '1');
    }
    
    localStorage.setItem('last_study_date', new Date().toISOString());
  }, []);

  // Celebrate every 10 cards
  useEffect(() => {
    if (cardsReviewed > 0 && cardsReviewed % 10 === 0) {
      celebrateProgress();
    }
  }, [cardsReviewed]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleKnow = () => {
    const newKnown = new Set(knownCards);
    newKnown.add(currentIndex);
    setKnownCards(newKnown);
    
    const newUnknown = new Set(unknownCards);
    newUnknown.delete(currentIndex);
    setUnknownCards(newUnknown);
    
    setCardsReviewed(prev => prev + 1);
    
    setTimeout(() => {
      if (currentIndex < flashcards.length - 1) {
        handleNext();
      }
    }, 300);
  };

  const handleDontKnow = () => {
    const newUnknown = new Set(unknownCards);
    newUnknown.add(currentIndex);
    setUnknownCards(newUnknown);
    
    const newKnown = new Set(knownCards);
    newKnown.delete(currentIndex);
    setKnownCards(newKnown);
    
    setCardsReviewed(prev => prev + 1);
    
    setTimeout(() => {
      if (currentIndex < flashcards.length - 1) {
        handleNext();
      }
    }, 300);
  };

  // SRS handlers
  const handleHard = () => {
    setCardsReviewed(prev => prev + 1);
    handleDontKnow();
  };

  const handleGood = () => {
    setCardsReviewed(prev => prev + 1);
    const newKnown = new Set(knownCards);
    newKnown.add(currentIndex);
    setKnownCards(newKnown);
    setTimeout(() => handleNext(), 300);
  };

  const handleEasy = () => {
    setCardsReviewed(prev => prev + 1);
    handleKnow();
  };

  // TTS handler
  const handleSpeak = (text: string) => {
    speakText(text, "sl-SI");
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
  };

  if (!currentCard) return null;

  // Grid view
  if (viewMode === "grid") {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">
              Vse kartice ({flashcards.length})
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-semibold text-orange-500">{streak} dni streak!</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF(flashcards, title)}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("carousel")}
            >
              <Layers className="w-4 h-4 mr-2" />
              Carousel
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flashcards.map((card, index) => (
            <FlashcardGridItem
              key={index}
              card={card}
              index={index}
              isKnown={knownCards.has(index)}
              isUnknown={unknownCards.has(index)}
              onKnow={() => {
                const newKnown = new Set(knownCards);
                newKnown.add(index);
                setKnownCards(newKnown);
                const newUnknown = new Set(unknownCards);
                newUnknown.delete(index);
                setUnknownCards(newUnknown);
              }}
              onDontKnow={() => {
                const newUnknown = new Set(unknownCards);
                newUnknown.add(index);
                setUnknownCards(newUnknown);
                const newKnown = new Set(knownCards);
                newKnown.delete(index);
                setKnownCards(newKnown);
              }}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="mt-6 bg-muted rounded-xl p-4">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{knownCards.size}</p>
              <p className="text-sm text-muted-foreground">Znam</p>
            </div>
            <div className="text-center">
              <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{unknownCards.size}</p>
              <p className="text-sm text-muted-foreground">Še ne znam</p>
            </div>
            <div className="text-center">
              <Layers className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">
                {flashcards.length - knownCards.size - unknownCards.size}
              </p>
              <p className="text-sm text-muted-foreground">Neocenjenih</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Carousel view
  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg p-6">
      {/* Header with progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl font-bold text-foreground">
              Kartica {currentIndex + 1} / {flashcards.length}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-semibold text-orange-500">{streak} dni streak! 🔥</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF(flashcards, title)}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Mreža
            </Button>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">{knownCards.size}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-muted-foreground">{unknownCards.size}</span>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-primary h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard with flip animation */}
      <div className="perspective-1000 mb-6">
        <div 
          className={`relative w-full min-h-[300px] transition-transform duration-500 transform-style-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={handleFlip}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front side */}
          <div 
            className={`absolute inset-0 backface-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border-2 border-purple-500/30 p-8 flex items-center justify-center ${
              knownCards.has(currentIndex) ? 'ring-4 ring-green-500/50' : ''
            } ${
              unknownCards.has(currentIndex) ? 'ring-4 ring-red-500/50' : ''
            }`}
            style={{
              backfaceVisibility: 'hidden',
            }}
          >
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(currentCard.question);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Vprašanje</p>
              <div className="text-2xl font-bold text-foreground">
                <ReactMarkdown>{currentCard.question}</ReactMarkdown>
              </div>
              <p className="text-sm text-muted-foreground mt-6">Klikni za odgovor</p>
            </div>
          </div>

          {/* Back side */}
          <div 
            className={`absolute inset-0 backface-hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl border-2 border-blue-500/30 p-8 flex items-center justify-center ${
              knownCards.has(currentIndex) ? 'ring-4 ring-green-500/50' : ''
            } ${
              unknownCards.has(currentIndex) ? 'ring-4 ring-red-500/50' : ''
            }`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-center w-full">
              <div className="flex justify-center mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(currentCard.answer);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Odgovor</p>
              <div className="text-lg text-foreground prose prose-invert max-w-none">
                <ReactMarkdown>{currentCard.answer}</ReactMarkdown>
              </div>
              <p className="text-sm text-muted-foreground mt-6">Klikni za vprašanje</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation and action buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex-1"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Prejšnja
        </Button>

        {isFlipped && (
          <div className="flex gap-2 flex-1 justify-center">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleHard}
              className="flex-1"
              title="Prikaži čez 1 min"
            >
              Težko
              <span className="text-xs ml-1">(1min)</span>
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={handleGood}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              title="Prikaži čez 10 min"
            >
              Dobro
              <span className="text-xs ml-1">(10min)</span>
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={handleEasy}
              className="flex-1 bg-green-600 hover:bg-green-700"
              title="Prikaži čez 1 dan"
            >
              Lahko
              <span className="text-xs ml-1">(1 dan)</span>
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          size="lg"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="flex-1"
        >
          Naslednja
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Restart button */}
      {(knownCards.size + unknownCards.size) === flashcards.length && (
        <div className="mt-6 text-center">
          <div className="bg-muted rounded-xl p-4 mb-4">
            <p className="text-lg font-bold text-foreground mb-2">
              Končano! 🎉
            </p>
            <p className="text-muted-foreground">
              Znane kartice: {knownCards.size} / {flashcards.length}
            </p>
          </div>
          <Button
            variant="hero"
            size="lg"
            onClick={handleRestart}
            className="shadow-glow-primary"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Ponovi
          </Button>
        </div>
      )}
    </div>
  );
};

// Grid item component
interface FlashcardGridItemProps {
  card: Flashcard;
  index: number;
  isKnown: boolean;
  isUnknown: boolean;
  onKnow: () => void;
  onDontKnow: () => void;
}

const FlashcardGridItem = ({ card, index, isKnown, isUnknown, onKnow, onDontKnow }: FlashcardGridItemProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000">
      <div
        className={`relative min-h-[250px] transition-transform duration-500 cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 backface-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border-2 p-4 ${
            isKnown ? 'border-green-500' : isUnknown ? 'border-red-500' : 'border-purple-500/30'
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex flex-col h-full">
            <div className="text-xs text-muted-foreground mb-2">Vprašanje {index + 1}</div>
            <div className="flex-1 flex items-center justify-center text-center">
              <div className="prose prose-sm">
                <ReactMarkdown>{card.question}</ReactMarkdown>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground mt-2">
              Klikni za odgovor
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 backface-hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border-2 p-4 ${
            isKnown ? 'border-green-500' : isUnknown ? 'border-red-500' : 'border-blue-500/30'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            <div className="text-xs text-muted-foreground mb-2">Odgovor</div>
            <div className="flex-1 overflow-auto prose prose-sm">
              <ReactMarkdown>{card.answer}</ReactMarkdown>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDontKnow();
                }}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Še ne
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onKnow();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Znam
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
