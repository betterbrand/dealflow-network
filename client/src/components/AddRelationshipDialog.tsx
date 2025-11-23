import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const RELATIONSHIP_TYPES = [
  { value: "introduced_by", label: "Introduced by" },
  { value: "works_with", label: "Works with" },
  { value: "investor_in", label: "Investor in" },
  { value: "mentor_of", label: "Mentor of" },
  { value: "mentored_by", label: "Mentored by" },
  { value: "colleague", label: "Colleague" },
  { value: "friend", label: "Friend" },
  { value: "business_partner", label: "Business partner" },
  { value: "client", label: "Client" },
  { value: "service_provider", label: "Service provider" },
  { value: "met_at_event", label: "Met at event" },
  { value: "other", label: "Other" },
];

export function AddRelationshipDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddRelationshipDialogProps) {
  const [fromContactId, setFromContactId] = useState<string>("");
  const [toContactId, setToContactId] = useState<string>("");
  const [relationshipType, setRelationshipType] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: contacts, isLoading: loadingContacts } = trpc.contacts.list.useQuery();
  const createMutation = trpc.relationships.create.useMutation({
    onSuccess: () => {
      toast.success("Relationship created successfully!");
      setFromContactId("");
      setToContactId("");
      setRelationshipType("");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to create relationship: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromContactId || !toContactId || !relationshipType) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (fromContactId === toContactId) {
      toast.error("Cannot create a relationship between the same contact");
      return;
    }

    createMutation.mutate({
      fromContactId: parseInt(fromContactId),
      toContactId: parseInt(toContactId),
      relationshipType,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Relationship</DialogTitle>
            <DialogDescription>
              Connect two contacts in your network by defining their relationship.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="from-contact">From Contact *</Label>
              <Select value={fromContactId} onValueChange={setFromContactId}>
                <SelectTrigger id="from-contact">
                  <SelectValue placeholder="Select first contact" />
                </SelectTrigger>
                <SelectContent>
                  {loadingContacts ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Loading contacts...
                    </div>
                  ) : (
                    contacts?.map((item) => (
                      <SelectItem key={item.contact.id} value={item.contact.id.toString()}>
                        {item.contact.name}
                        {item.contact.company && ` (${item.contact.company})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="relationship-type">Relationship Type *</Label>
              <Select value={relationshipType} onValueChange={setRelationshipType}>
                <SelectTrigger id="relationship-type">
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="to-contact">To Contact *</Label>
              <Select value={toContactId} onValueChange={setToContactId}>
                <SelectTrigger id="to-contact">
                  <SelectValue placeholder="Select second contact" />
                </SelectTrigger>
                <SelectContent>
                  {loadingContacts ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Loading contacts...
                    </div>
                  ) : (
                    contacts?.map((item) => (
                      <SelectItem 
                        key={item.contact.id} 
                        value={item.contact.id.toString()}
                        disabled={item.contact.id.toString() === fromContactId}
                      >
                        {item.contact.name}
                        {item.contact.company && ` (${item.contact.company})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional context about this relationship..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Relationship
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
