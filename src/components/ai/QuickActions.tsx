import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  BookOpen, 
  ListChecks, 
  Layers, 
  HelpCircle, 
  Languages 
} from "lucide-react";

interface QuickActionsProps {
  onAction: (action: string) => void;
  disabled?: boolean;
  lastAiResponse?: string;
}

const actions = [
  { id: "simplify", label: "Razloži enostavneje", icon: <Lightbulb className="w-3 h-3" /> },
  { id: "detailed", label: "Razloži bolj podrobno", icon: <BookOpen className="w-3 h-3" /> },
  { id: "examples", label: "Naredi primere", icon: <ListChecks className="w-3 h-3" /> },
  { id: "flashcards", label: "Naredi flashcards", icon: <Layers className="w-3 h-3" /> },
  { id: "quiz", label: "Naredi quiz", icon: <HelpCircle className="w-3 h-3" /> },
  { id: "translate", label: "Prevedi odgovor", icon: <Languages className="w-3 h-3" /> },
];

export const QuickActions = ({ onAction, disabled, lastAiResponse }: QuickActionsProps) => {
  if (!lastAiResponse) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
      {actions.map((action) => (
        <Button
          key={action.id}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAction(action.id)}
          disabled={disabled}
          className="gap-1.5 text-xs h-7 px-2 hover:border-primary/50 hover:bg-primary/5"
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default QuickActions;
