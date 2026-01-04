import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import { Check, X, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery({
    unreadOnly: false,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const approveMutation = trpc.accessRequests.approve.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      utils.accessRequests.getPending.invalidate();
      utils.contacts.list.invalidate();
    },
  });

  const denyMutation = trpc.accessRequests.deny.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      utils.accessRequests.getPending.invalidate();
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleApprove = async (requestId: number, notificationId: number) => {
    await approveMutation.mutateAsync({ requestId });
    handleMarkAsRead(notificationId);
  };

  const handleDeny = async (requestId: number, notificationId: number) => {
    await denyMutation.mutateAsync({ requestId });
    handleMarkAsRead(notificationId);
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 max-h-[500px] overflow-hidden bg-popover border rounded-lg shadow-lg z-50"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Notifications</h3>
        {notifications.some(n => !n.isRead) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="h-7 text-xs"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto max-h-[400px]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "p-4 border-b last:border-b-0 hover:bg-sidebar-accent/50 transition-colors",
                !notification.isRead && "bg-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Unread indicator */}
                {!notification.isRead && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
                )}
                {notification.isRead && (
                  <div className="mt-1.5 h-2 w-2 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {notification.message && (
                    <p className="text-sm text-muted-foreground mb-2" dangerouslySetInnerHTML={{ __html: notification.message }} />
                  )}

                  {/* Action buttons for access requests */}
                  {notification.type === "contact_access_request" && notification.accessRequestId && !notification.isRead && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(notification.accessRequestId!, notification.id)}
                        disabled={approveMutation.isPending || denyMutation.isPending}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeny(notification.accessRequestId!, notification.id)}
                        disabled={approveMutation.isPending || denyMutation.isPending}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}

                  {/* Mark as read for non-request notifications */}
                  {notification.type !== "contact_access_request" && !notification.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={markAsReadMutation.isPending}
                      className="h-7 text-xs mt-2"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
