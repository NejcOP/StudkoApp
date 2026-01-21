import jsPDF from "jspdf";
import confetti from "canvas-confetti";

// Text-to-Speech function
export const speakText = (text: string, lang: string = "sl-SI") => {
  if ("speechSynthesis" in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Text-to-speech not supported in this browser");
  }
};

// Space Repetition intervals (in milliseconds)
export const SRS_INTERVALS = {
  hard: 60 * 1000, // 1 minute
  good: 10 * 60 * 1000, // 10 minutes
  easy: 24 * 60 * 60 * 1000, // 1 day
};

// Confetti celebration
export const celebrateProgress = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#8B5CF6', '#EC4899', '#3B82F6'],
  });
};

// Export to PDF
export const exportToPDF = (flashcards: Array<{ question: string; answer: string }>, title: string) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(139, 92, 246); // Purple
  doc.text(title, 20, 20);
  
  let yPosition = 40;
  
  flashcards.forEach((card, index) => {
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Card number
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Kartica ${index + 1}`, 20, yPosition);
    yPosition += 10;
    
    // Question
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Q:', 20, yPosition);
    const questionLines = doc.splitTextToSize(card.question, 160);
    doc.text(questionLines, 30, yPosition);
    yPosition += (questionLines.length * 7) + 5;
    
    // Answer
    doc.setTextColor(139, 92, 246);
    doc.text('A:', 20, yPosition);
    doc.setTextColor(0, 0, 0);
    const answerLines = doc.splitTextToSize(card.answer, 160);
    doc.text(answerLines, 30, yPosition);
    yPosition += (answerLines.length * 7) + 15;
    
    // Separator line
    if (index < flashcards.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition - 5, 190, yPosition - 5);
    }
  });
  
  doc.save(`${title}.pdf`);
};

// Calculate streak
export const calculateStreak = (lastStudyDate: string | null): number => {
  if (!lastStudyDate) return 0;
  
  const last = new Date(lastStudyDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - last.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // If last study was today or yesterday, streak continues
  return diffDays <= 1 ? 1 : 0;
};
