/**
 * Agent chat conversation view
 */

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAgentChat } from "./useAgentChat";
import { AgentMessage } from "./AgentMessage";
import { AgentTypingIndicator } from "./AgentTypingIndicator";
import { AgentInput } from "./AgentInput";

interface AgentChatProps {
  className?: string;
}

const DEFAULT_PROMPTS = [
  "Who can introduce me to someone at [company]?",
  "Do I know anyone at Sequoia?",
  "Show me my strongest connections",
];

export function AgentChat({ className }: AgentChatProps) {
  const { messages, isTyping, isLoading, sendMessage } = useAgentChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Get suggested prompts (from last agent message or defaults)
  const lastAgentMessage = [...messages].reverse().find((m) => m.role === "agent");
  const suggestedPrompts =
    messages.length === 0
      ? DEFAULT_PROMPTS
      : lastAgentMessage?.suggestedFollowups;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            {/* Agent icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white"
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
            <h3 className="text-lg font-medium mb-2">Network Agent</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              I can help you explore your network, find connections, and discover
              introduction paths.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <AgentMessage key={message.id} message={message} />
            ))}
            {isTyping && <AgentTypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t py-3">
        <AgentInput
          onSend={sendMessage}
          isLoading={isLoading}
          suggestedPrompts={suggestedPrompts}
        />
      </div>
    </div>
  );
}
