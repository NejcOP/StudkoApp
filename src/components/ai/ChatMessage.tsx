import { Brain, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  attachment?: {
    preview?: string;
    storagePath?: string;
    fileName?: string;
  };
  isStreaming?: boolean;
}

const formatContent = (text: string) => {
  // Split by lines
  const lines = text.split('\n');
  
  return lines.map((line, idx) => {
    // Process each line for bold text (uppercase words)
    const parts = [];
    const words = line.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // If word is all caps and longer than 2 chars (not abbreviations like OK, NO)
      if (word.length > 2 && word === word.toUpperCase() && /[A-ZČĆŽŠĐ]/.test(word)) {
        parts.push(
          <strong key={`${idx}-${i}`} className="font-bold">
            {word}
          </strong>
        );
      } else {
        parts.push(word);
      }
      
      // Add space between words (except last word)
      if (i < words.length - 1) {
        parts.push(' ');
      }
    }
    
    return (
      <span key={idx}>
        {parts}
        {idx < lines.length - 1 && <br />}
      </span>
    );
  });
};

export const ChatMessage = ({ role, content, attachment, isStreaming = false }: ChatMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const currentIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If user message or not streaming, show immediately
    if (role === "user" || !isStreaming) {
      setDisplayedContent(content);
      setIsTyping(false);
      return;
    }

    // For assistant messages with streaming
    if (content.length > displayedContent.length) {
      setIsTyping(true);
      
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start typing animation
      currentIndexRef.current = displayedContent.length;
      
      intervalRef.current = setInterval(() => {
        if (currentIndexRef.current < content.length) {
          // Type 4-5 characters at a time for smooth yet fast display
          const charsToAdd = Math.min(5, content.length - currentIndexRef.current);
          setDisplayedContent(content.substring(0, currentIndexRef.current + charsToAdd));
          currentIndexRef.current += charsToAdd;
        } else {
          setIsTyping(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 15); // Update every 15ms for smooth and fast typing effect
    } else if (content.length < displayedContent.length) {
      // Content was reduced (shouldn't happen in streaming, but handle it)
      setDisplayedContent(content);
      setIsTyping(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [content, role, isStreaming, displayedContent.length]);

  return (
    <div className={`flex gap-3 ${role === "user" ? "justify-end" : "justify-start"}`}>
      {role === "assistant" && (
        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow-primary">
          <Brain className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl p-4 ${
          role === "user"
            ? "bg-gradient-primary text-white shadow-glow-primary"
            : "bg-muted text-foreground"
        }`}
      >
        {attachment?.preview && (
          <div className="mb-3">
            <img 
              src={attachment.preview} 
              alt={attachment.fileName || "Attached image"}
              className="rounded-lg max-w-full max-h-60 object-contain"
            />
            {attachment.fileName && (
              <p className="text-xs mt-1 opacity-80">{attachment.fileName}</p>
            )}
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {formatContent(displayedContent)}
          {isTyping && role === "assistant" && (
            <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse" />
          )}
        </div>
      </div>
      {role === "user" && (
        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export const TypingIndicator = () => {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow-primary">
        <Brain className="w-5 h-5 text-white" />
      </div>
      <div className="bg-muted rounded-2xl p-4">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
