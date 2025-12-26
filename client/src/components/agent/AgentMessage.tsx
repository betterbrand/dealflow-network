/**
 * Agent message component with tone-based styling
 */

import { cn } from "@/lib/utils";
import type { AgentMessage as AgentMessageType, AgentTone } from "@shared/_core/agent-types";
import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";

interface AgentMessageProps {
  message: AgentMessageType;
  className?: string;
}

/**
 * Get tone-based styling
 */
function getToneStyles(tone?: AgentTone): string {
  switch (tone) {
    case "empathetic":
      return "bg-amber-50 border-l-2 border-amber-400";
    case "excited":
      return "bg-green-50 border-l-2 border-green-400";
    case "curious":
      return "bg-blue-50 border-l-2 border-blue-400";
    case "cautious":
      return "bg-slate-100 border-l-2 border-slate-400";
    case "neutral":
    default:
      return "bg-muted";
  }
}

/**
 * Confidence dots indicator
 */
function ConfidenceDots({ value }: { value: number }) {
  const filled = Math.round((value / 100) * 5);

  return (
    <div className="flex gap-0.5 items-center" title={`${value}% confidence`}>
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            i < filled ? "bg-emerald-500" : "bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

export function AgentMessage({ message, className }: AgentMessageProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const isAgent = message.role === "agent";

  return (
    <div
      className={cn(
        "flex gap-2 px-4 py-2",
        isAgent ? "justify-start" : "justify-end",
        className
      )}
    >
      {/* Agent avatar */}
      {isAgent && (
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
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isAgent
            ? cn(getToneStyles(message.tone), "rounded-tl-sm")
            : "bg-primary text-primary-foreground rounded-tr-sm"
        )}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Agent-specific extras */}
        {isAgent && (
          <div className="mt-2 space-y-2">
            {/* Confidence indicator */}
            {message.confidence !== undefined && message.confidence > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ConfidenceDots value={message.confidence} />
                <span>{message.confidence}% confident</span>
              </div>
            )}

            {/* Reasoning toggle */}
            {message.reasoningSummary && (
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Lightbulb className="h-3 w-3" />
                <span>How I found this</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    showReasoning && "rotate-180"
                  )}
                />
              </button>
            )}

            {/* Reasoning panel */}
            {showReasoning && message.reasoningSummary && (
              <div className="mt-2 p-2 bg-background/50 rounded-lg text-xs text-muted-foreground">
                {message.reasoningSummary}
              </div>
            )}

            {/* Suggested followups */}
            {message.suggestedFollowups && message.suggestedFollowups.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.suggestedFollowups.map((followup, i) => (
                  <button
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-background/50 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {followup}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User avatar placeholder */}
      {!isAgent && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-primary-foreground font-medium">You</span>
        </div>
      )}
    </div>
  );
}
