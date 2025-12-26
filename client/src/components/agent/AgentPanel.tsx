/**
 * Agent panel - slide-in container for agent chat
 */

import { cn } from "@/lib/utils";
import { X, MessageCircle, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AgentChat } from "./AgentChat";
import { useState } from "react";

interface AgentPanelProps {
  className?: string;
}

export function AgentPanel({ className }: AgentPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 bg-gradient-to-r from-indigo-500/10 to-violet-500/10",
            "hover:from-indigo-500/20 hover:to-violet-500/20",
            "border-indigo-500/20",
            className
          )}
        >
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span>Ask Agent</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-[440px] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Network Agent</SheetTitle>
              <p className="text-xs text-muted-foreground">
                Explore connections and find paths
              </p>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <AgentChat />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Floating agent button for pages without the panel in header
 */
export function AgentFloatingButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-14 h-14 rounded-full",
            "bg-gradient-to-br from-indigo-500 to-violet-500",
            "shadow-lg hover:shadow-xl",
            "flex items-center justify-center",
            "transition-all hover:scale-105",
            className
          )}
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-[440px] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Network Agent</SheetTitle>
              <p className="text-xs text-muted-foreground">
                Explore connections and find paths
              </p>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <AgentChat />
        </div>
      </SheetContent>
    </Sheet>
  );
}
