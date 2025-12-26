/**
 * Agent chat input with suggested prompts
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, Loader2 } from "lucide-react";

interface AgentInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  suggestedPrompts?: string[];
  className?: string;
}

export function AgentInput({
  onSend,
  isLoading,
  placeholder = "Ask about your network...",
  suggestedPrompts,
  className,
}: AgentInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      setValue("");
    }
  };

  const handleSuggestedClick = (prompt: string) => {
    if (!isLoading) {
      onSend(prompt);
    }
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Suggested prompts */}
      {suggestedPrompts && suggestedPrompts.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSuggestedClick(prompt)}
              disabled={isLoading}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border",
                "bg-background hover:bg-muted transition-colors",
                "text-muted-foreground hover:text-foreground",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            "flex-1 px-4 py-2 rounded-full border bg-background",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            isLoading && "opacity-50"
          )}
        />
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
