import { useState } from "react";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { NotificationDropdown } from "./NotificationDropdown";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  collapsed?: boolean;
}

export function NotificationBell({ collapsed = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative h-8 w-8",
          isOpen && "bg-sidebar-accent"
        )}
        title={collapsed ? "Notifications" : undefined}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 flex items-center justify-center text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <NotificationDropdown onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
}
