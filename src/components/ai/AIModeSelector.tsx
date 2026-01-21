import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Layers, 
  HelpCircle,
  FileText,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Essential AI modes for students
export type AIMode = "chat" | "flashcards" | "quiz" | "summary";

interface AIModeSelectorProps {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
}

const modes: { id: AIMode; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Klepet", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "flashcards", label: "Kartice", icon: <Layers className="w-4 h-4" /> },
  { id: "quiz", label: "Kviz", icon: <HelpCircle className="w-4 h-4" /> },
  { id: "summary", label: "Povzetek", icon: <FileText className="w-4 h-4" /> },
];

export const AIModeSelector = ({ mode, onModeChange }: AIModeSelectorProps) => {
  return (
    <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-border shadow-lg p-3">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {modes.map((m) => (
            <Button
              key={m.id}
              type="button"
              variant={mode === m.id ? "default" : "outline"}
              size="sm"
              onClick={() => onModeChange(m.id)}
              className={`flex-shrink-0 gap-2 transition-all ${
                mode === m.id 
                  ? "shadow-glow-primary" 
                  : "hover:border-primary/50"
              }`}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default AIModeSelector;
