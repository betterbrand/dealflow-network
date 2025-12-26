/**
 * Typing indicator with animated dots
 */

import { cn } from "@/lib/utils";

interface AgentTypingIndicatorProps {
  className?: string;
}

export function AgentTypingIndicator({ className }: AgentTypingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 max-w-[80%]",
        className
      )}
    >
      {/* Agent avatar placeholder */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>

      {/* Typing dots */}
      <div className="flex items-center gap-1 px-3 py-2 bg-muted rounded-2xl rounded-tl-sm">
        <span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
