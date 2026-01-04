import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface RequestAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contactName: string;
}

export function RequestAccessDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
}: RequestAccessDialogProps) {
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();

  const requestMutation = trpc.accessRequests.request.useMutation({
    onSuccess: () => {
      toast.success("Access request sent", {
        description: "The contact owner will be notified of your request.",
      });
      setMessage("");
      onOpenChange(false);
      utils.accessRequests.getStatus.invalidate({ contactId });
    },
    onError: (error) => {
      toast.error("Failed to request access", {
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    requestMutation.mutate({
      contactId,
      message: message.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>Request Access</DialogTitle>
          </div>
          <DialogDescription>
            Request access to view <span className="font-medium text-foreground">{contactName}</span>'s contact details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">
              Message to owner <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Why do you need access to this contact?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 characters
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <p>The contact owner will receive a notification and can approve or deny your request.</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={requestMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={requestMutation.isPending}
          >
            {requestMutation.isPending ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
