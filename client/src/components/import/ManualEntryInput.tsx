import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ExtractedContact } from "../../../../server/morpheus";

interface ManualEntryInputProps {
  onSubmit: (contacts: ExtractedContact[]) => void;
  onCancel: () => void;
}

export function ManualEntryInput({ onSubmit, onCancel }: ManualEntryInputProps) {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    role: "",
    email: "",
    phone: "",
    location: "",
    telegramUsername: "",
    linkedinUrl: "",
    twitterUrl: "",
    conversationSummary: "",
    isPrivate: false,
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact created successfully");
      utils.contacts.list.invalidate();
      utils.graph.getData.invalidate();
      onCancel(); // Close dialog
    },
    onError: (error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });

  const handleReviewContact = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Convert form data to ExtractedContact format
    const contact: ExtractedContact = {
      name: formData.name,
      company: formData.company || undefined,
      role: formData.role || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      location: formData.location || undefined,
      telegramUsername: formData.telegramUsername || undefined,
      linkedinUrl: formData.linkedinUrl || undefined,
      twitterUrl: formData.twitterUrl || undefined,
      conversationSummary: formData.conversationSummary || undefined,
    };

    onSubmit([contact]);
  };

  const handleCreateDirectly = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      company: formData.company || undefined,
      role: formData.role || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      location: formData.location || undefined,
      telegramUsername: formData.telegramUsername || undefined,
      linkedinUrl: formData.linkedinUrl || undefined,
      twitterUrl: formData.twitterUrl || undefined,
      notes: formData.conversationSummary || undefined,
      isPrivate: formData.isPrivate,
    });
  };

  const isLoading = createMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            required
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Acme Corp"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="CEO"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 234 567 8900"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="San Francisco, CA"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="telegram">Telegram Username</Label>
            <Input
              id="telegram"
              value={formData.telegramUsername}
              onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value })}
              placeholder="@johndoe"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
          <Input
            id="linkedin"
            type="url"
            value={formData.linkedinUrl}
            onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
            placeholder="https://linkedin.com/in/johndoe"
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="twitter">Twitter/X Profile URL</Label>
          <Input
            id="twitter"
            type="url"
            value={formData.twitterUrl}
            onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
            placeholder="https://twitter.com/johndoe"
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.conversationSummary}
            onChange={(e) => setFormData({ ...formData, conversationSummary: e.target.value })}
            placeholder="Additional notes about this contact..."
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="isPrivate" className="text-sm font-medium cursor-pointer">
                Private Contact
              </Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Require approval before others can view this contact
              </p>
            </div>
          </div>
          <Switch
            id="isPrivate"
            checked={formData.isPrivate}
            onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
            aria-label="Make contact private"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReviewContact}
          disabled={isLoading}
        >
          Review Contact
        </Button>
        <Button
          type="button"
          onClick={handleCreateDirectly}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Directly
        </Button>
      </div>
    </div>
  );
}
