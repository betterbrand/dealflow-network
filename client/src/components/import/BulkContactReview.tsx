import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ExtractedContact } from "../../../../server/morpheus";

interface BulkContactReviewProps {
  contacts: ExtractedContact[];
  onComplete: (results: any) => void;
  onCancel: () => void;
}

interface ContactRow extends ExtractedContact {
  id: string;
  selected: boolean;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

export function BulkContactReview({ contacts, onComplete, onCancel }: BulkContactReviewProps) {
  const [contactRows, setContactRows] = useState<ContactRow[]>(
    contacts.map((contact, index) => ({
      ...contact,
      id: `contact-${index}`,
      selected: true,
      isDuplicate: false,
    }))
  );

  const createBulkMutation = trpc.contacts.createBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`Created ${data.successful}/${data.total} contacts`, {
        description: data.successful < data.total
          ? `${data.total - data.successful} failed or were duplicates`
          : undefined,
      });
      onComplete(data);
    },
    onError: (error) => {
      toast.error(`Failed to create contacts: ${error.message}`);
    },
  });

  const selectedCount = contactRows.filter((c) => c.selected).length;
  const allSelected = selectedCount === contactRows.length;
  const someSelected = selectedCount > 0 && selectedCount < contactRows.length;

  const toggleAll = () => {
    const newValue = !allSelected;
    setContactRows(contactRows.map((c) => ({ ...c, selected: newValue })));
  };

  const toggleContact = (id: string) => {
    setContactRows(
      contactRows.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleCreate = () => {
    const selectedContacts = contactRows.filter((c) => c.selected);
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact to create");
      return;
    }

    createBulkMutation.mutate({
      contacts: selectedContacts.map((c) => ({
        name: c.name,
        ...(c.email && { email: c.email }),
        ...(c.company && { company: c.company }),
        ...(c.role && { role: c.role }),
        ...(c.phone && { phone: c.phone }),
        ...(c.location && { location: c.location }),
        ...(c.telegramUsername && { telegramUsername: c.telegramUsername }),
        ...(c.linkedinUrl && { linkedinUrl: c.linkedinUrl }),
        ...(c.twitterUrl && { twitterUrl: c.twitterUrl }),
        ...(c.conversationSummary && { notes: c.conversationSummary }),
        ...(c.conversationSummary && { conversationSummary: c.conversationSummary }),
        ...(c.sentiment && { sentiment: c.sentiment }),
        ...(c.interestLevel && { interestLevel: c.interestLevel }),
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Review Contacts</h2>
        <p className="text-muted-foreground mt-2">
          Review and select contacts to import ({selectedCount} of {contactRows.length} selected)
        </p>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
          />
          <span className="text-sm font-medium">
            {allSelected ? "Deselect All" : "Select All"}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedCount} contact{selectedCount !== 1 ? "s" : ""} will be created
        </div>
      </div>

      {/* Contacts Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactRows.map((contact) => (
              <TableRow
                key={contact.id}
                className={contact.selected ? "" : "opacity-50 bg-muted/30"}
              >
                <TableCell>
                  <Checkbox
                    checked={contact.selected}
                    onCheckedChange={() => toggleContact(contact.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {contact.email || "-"}
                </TableCell>
                <TableCell className="text-sm">{contact.company || "-"}</TableCell>
                <TableCell className="text-sm">{contact.role || "-"}</TableCell>
                <TableCell>
                  {contact.isDuplicate ? (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Duplicate
                    </Badge>
                  ) : (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      New
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      toast.info("Inline editing coming soon");
                      // TODO: Open edit modal
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Info */}
      {contactRows.some((c) => c.isDuplicate) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Some contacts appear to be duplicates. They will be linked to existing contacts instead
            of creating new ones.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={createBulkMutation.isPending}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleCreate}
          disabled={selectedCount === 0 || createBulkMutation.isPending}
        >
          {createBulkMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating {selectedCount} Contact{selectedCount !== 1 ? "s" : ""}...
            </>
          ) : (
            <>
              Create {selectedCount} Contact{selectedCount !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
