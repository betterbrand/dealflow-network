import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type ImportStep = "import" | "review";

export function CreateContactDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>("import");
  const [profileUrl, setProfileUrl] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
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
    notes: "",
  });

  const utils = trpc.useUtils();
  const enrichMutation = trpc.contacts.enrichFromLinkedIn.useMutation();
  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact created successfully!");
      utils.contacts.list.invalidate();
      utils.graph.getData.invalidate();
      resetDialog();
    },
    onError: (error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });

  const resetDialog = () => {
    setOpen(false);
    setStep("import");
    setProfileUrl("");
    setFormData({
      name: "",
      company: "",
      role: "",
      email: "",
      phone: "",
      location: "",
      telegramUsername: "",
      linkedinUrl: "",
      twitterUrl: "",
      notes: "",
    });
  };

  const handleImport = async () => {
    if (!profileUrl.trim()) {
      toast.error("Please enter a LinkedIn or X/Twitter profile URL");
      return;
    }

    // Validate URL format
    const isLinkedIn = profileUrl.includes("linkedin.com");
    const isTwitter = profileUrl.includes("twitter.com") || profileUrl.includes("x.com");

    if (!isLinkedIn && !isTwitter) {
      toast.error("Please enter a valid LinkedIn or X/Twitter URL");
      return;
    }

    setIsEnriching(true);

    try {
      if (isLinkedIn) {
        // Use existing LinkedIn enrichment
        const enriched = await enrichMutation.mutateAsync({ linkedinUrl: profileUrl });

        // Check if enrichment was cancelled (mutation was reset)
        if (!enrichMutation.isSuccess) {
          return;
        }

        // Extract company and role from most recent experience
        const latestExperience = enriched.experience?.[0];

        setFormData({
          name: enriched.name || "",
          company: latestExperience?.company || "",
          role: latestExperience?.title || enriched.headline || "",
          email: "",
          phone: "",
          location: enriched.location || "",
          telegramUsername: "",
          linkedinUrl: profileUrl,
          twitterUrl: "",
          notes: enriched.summary || "",
        });

        toast.success("Profile imported successfully!");
        setStep("review");
      } else {
        // Twitter/X enrichment - for now, just set the URL and let user fill in
        // TODO: Implement X/Twitter enrichment service
        setFormData({
          ...formData,
          twitterUrl: profileUrl,
        });
        toast.info("X/Twitter enrichment coming soon. Please fill in the details manually.");
        setStep("review");
      }
    } catch (error: any) {
      // Don't show error if it was cancelled
      if (error.message !== 'CANCELLED') {
        toast.error(`Failed to import profile: ${error.message}`);
      }
    } finally {
      setIsEnriching(false);
    }
  };

  const handleCancelEnrichment = () => {
    // Reset the mutation to cancel the ongoing request
    enrichMutation.reset();
    setIsEnriching(false);
    toast.info("Import cancelled");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
      notes: formData.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {step === "import" ? (
          <>
            <DialogHeader>
              <DialogTitle>Import Contact</DialogTitle>
              <DialogDescription>
                Start by importing a LinkedIn or X/Twitter profile. We'll automatically fill in the details.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="profileUrl" className="text-base">
                    Profile URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="profileUrl"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username or https://x.com/username"
                    className="text-base"
                    disabled={isEnriching}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleImport();
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Paste a LinkedIn or X/Twitter profile URL to automatically import contact details
                  </p>
                </div>

                {isEnriching && (
                  <div className="space-y-3 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 text-lg">Importing LinkedIn profile...</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Fetching professional data • Typically takes 30-60 seconds
                        </p>
                      </div>
                    </div>

                    {/* Progress bar animation */}
                    <div className="relative h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 animate-pulse" />
                      <div className="h-full w-3/5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" />
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-blue-600">
                        Please wait while we retrieve work history, education, and profile details...
                      </p>
                      <p className="text-xs text-blue-500 font-medium">
                        Click "Cancel Import" below to stop
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">LinkedIn Import</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically imports name, company, role, location, and bio
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium">X/Twitter Import</p>
                      <p className="text-sm text-muted-foreground">
                        Coming soon - manual entry required for now
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              {isEnriching ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleCancelEnrichment}
                  >
                    Cancel Import
                  </Button>
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={resetDialog}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!profileUrl.trim()}
                  >
                    Import Profile
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Review & Edit Contact</DialogTitle>
              <DialogDescription>
                Review the imported information and make any necessary edits.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="CEO"
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telegram">Telegram Username</Label>
                  <Input
                    id="telegram"
                    value={formData.telegramUsername}
                    onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value })}
                    placeholder="@johndoe"
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
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this contact..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep("import")}
              >
                Back
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Contact"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
