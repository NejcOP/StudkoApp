import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCw, Check, X } from "lucide-react";

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onClose: () => void;
}

export const FlashcardViewer = ({ flashcards, onClose }: FlashcardViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleKnow = () => {
    const newKnown = new Set(knownCards);
    newKnown.add(currentCard.id);
    setKnownCards(newKnown);
    unknownCards.delete(currentCard.id);
    handleNext();
  };

  const handleDontKnow = () => {
    const newUnknown = new Set(unknownCards);
    newUnknown.add(currentCard.id);
    setUnknownCards(newUnknown);
    knownCards.delete(currentCard.id);
    handleNext();
  };

  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between text-white">
          <div className="text-xs sm:text-sm">
            Kartica {currentIndex + 1} / {flashcards.length}
          </div>
          <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2">
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              <span>{knownCards.size}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
              <span>{unknownCards.size}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4 sm:mb-6 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Flashcard */}
        <Card 
          className="relative h-80 sm:h-96 bg-white dark:bg-slate-800 cursor-pointer group perspective-1000"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`absolute inset-0 transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Front */}
            <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 text-center">
              <div className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Vprašanje</div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold px-2">{currentCard.question}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8">
                Klikni za odgovor
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
              <div className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Odgovor</div>
              <div className="text-base sm:text-lg lg:text-xl px-2">{currentCard.answer}</div>
            </div>
          </div>
        </Card>

        {/* Controls */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="bg-white/90 dark:bg-slate-800/90 w-full sm:w-auto min-h-[48px]"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Nazaj
          </Button>

          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsFlipped(!isFlipped)}
              className="bg-white/90 dark:bg-slate-800/90 flex-1 sm:flex-none min-h-[48px]"
            >
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            
            {isFlipped && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDontKnow}
                  className="bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/20 flex-1 sm:flex-none min-h-[48px]"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-0" />
                  <span className="sm:hidden">Ne</span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleKnow}
                  className="bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/20 flex-1 sm:flex-none min-h-[48px]"
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-0" />
                  <span className="sm:hidden">Da</span>
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1}
            className="bg-white/90 dark:bg-slate-800/90 w-full sm:w-auto min-h-[48px]"
          >
            Naprej
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Close button */}
        <div className="mt-4 sm:mt-6 text-center">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white hover:text-white/80 min-h-[48px]"
          >
            Zapri
          </Button>
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};