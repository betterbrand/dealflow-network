import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Check, X, Bell, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("unread");

  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery({
    unreadOnly: activeTab === "unread",
  });

  // Client-side filter for "read" tab since backend doesn't have read-only endpoint
  const filteredNotifications = activeTab === "read"
    ? notifications.filter(n => n.isRead)
    : notifications;

  // Calculate counts for tab badges
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;
  const allCount = notifications.length;

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
      toast.success("Access approved - The user now has access to this contact");
      setProcessingId(null);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "This request may have already been processed or removed");
      // If request not found, mark notification as read to hide it
      if (error.message?.includes("not found")) {
        utils.notifications.list.invalidate();
        utils.notifications.getUnreadCount.invalidate();
      }
      setProcessingId(null);
    },
  });

  const denyMutation = trpc.accessRequests.deny.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      utils.accessRequests.getPending.invalidate();
      toast.success("Access denied successfully");
      setProcessingId(null);
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "This request may have already been processed or removed");
      // If request not found, mark notification as read to hide it
      if (error.message?.includes("not found")) {
        utils.notifications.list.invalidate();
        utils.notifications.getUnreadCount.invalidate();
      }
      setProcessingId(null);
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
    setProcessingId(notificationId);
    try {
      await approveMutation.mutateAsync({ requestId });
      handleMarkAsRead(notificationId);
    } catch (error: any) {
      // If request not found, mark notification as read to clean up UI
      if (error?.message?.includes("not found")) {
        handleMarkAsRead(notificationId);
      }
    }
  };

  const handleDeny = async (requestId: number, notificationId: number) => {
    setProcessingId(notificationId);
    try {
      await denyMutation.mutateAsync({ requestId });
      handleMarkAsRead(notificationId);
    } catch (error: any) {
      // If request not found, mark notification as read to clean up UI
      if (error?.message?.includes("not found")) {
        handleMarkAsRead(notificationId);
      }
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="fixed left-4 top-16 w-96 max-w-[calc(100vw-2rem)] max-h-[500px] overflow-hidden bg-popover border rounded-lg shadow-lg z-50"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="border-b">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between px-4 pb-3 pt-2">
            <TabsList className="grid w-full max-w-sm grid-cols-3">
              <TabsTrigger value="all">All {allCount > 0 && `(${allCount})`}</TabsTrigger>
              <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
              <TabsTrigger value="read">Read {readCount > 0 && `(${readCount})`}</TabsTrigger>
            </TabsList>

            {activeTab === "unread" && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="h-7 text-xs ml-2"
              >
                Mark all read
              </Button>
            )}
          </div>
        </Tabs>
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto max-h-[400px]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            {activeTab === "unread" ? (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No unread notifications</p>
              </>
            ) : activeTab === "read" ? (
              <>
                <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No read notifications</p>
              </>
            ) : (
              <>
                <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </>
            )}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
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
                        disabled={processingId === notification.id}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {processingId === notification.id ? "Processing..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeny(notification.accessRequestId!, notification.id)}
                        disabled={processingId === notification.id}
                        className="h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        {processingId === notification.id ? "Processing..." : "Deny"}
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
