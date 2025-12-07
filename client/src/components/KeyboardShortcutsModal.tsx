import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, Search, History, FileText, Zap } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  // Detect platform for correct modifier key display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';
  const shiftKey = isMac ? '⇧' : 'Shift';

  const sections: ShortcutSection[] = [
    {
      title: "Search & Input",
      icon: <Search className="h-4 w-4 text-purple-500" />,
      shortcuts: [
        { keys: [modKey, 'K'], description: 'Focus search input' },
        { keys: [modKey, '↵'], description: 'Submit query' },
        { keys: ['Esc'], description: 'Clear input' },
      ],
    },
    {
      title: "History Navigation",
      icon: <History className="h-4 w-4 text-blue-500" />,
      shortcuts: [
        { keys: ['↑', '↓'], description: 'Navigate history items' },
        { keys: ['↵'], description: 'Execute selected query' },
        { keys: [modKey, shiftKey, 'H'], description: 'Toggle history sidebar' },
        { keys: ['Del'], description: 'Delete history item' },
      ],
    },
    {
      title: "Results",
      icon: <FileText className="h-4 w-4 text-green-500" />,
      shortcuts: [
        { keys: ['J', 'K'], description: 'Navigate results down/up' },
        { keys: ['↵'], description: 'Open selected contact' },
      ],
    },
    {
      title: "Quick Actions",
      icon: <Zap className="h-4 w-4 text-amber-500" />,
      shortcuts: [
        { keys: ['1', '-', '5'], description: 'Select example query' },
        { keys: [modKey, '/'], description: 'Show this help' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with these shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {sections.map((section, idx) => (
            <div key={idx}>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                {section.icon}
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map((shortcut, shortcutIdx) => (
                  <div
                    key={shortcutIdx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm font-mono"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
            <Keyboard className="h-4 w-4" />
            <span>
              Press <kbd className="px-2 py-0.5 text-xs font-semibold bg-muted border border-border rounded">?</kbd> or{' '}
              <kbd className="px-2 py-0.5 text-xs font-semibold bg-muted border border-border rounded">{modKey}/</kbd>{' '}
              to toggle this modal
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
