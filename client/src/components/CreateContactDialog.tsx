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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Loader2, CheckCircle2, ArrowRight, Download, User, Building2, Briefcase, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type DialogStep =
  | "quick-create"      // Step 1: Name, Company, Role, Opportunity
  | "post-create"       // Step 2: What next? Add details / Import / Done
  | "add-details"       // Step 3: Email, Phone, Location, etc.
  | "import-provider"   // Step 4a: Choose provider
  | "import-loading"    // Step 4b: Fetching preview
  | "import-preview"    // Step 4c: Show preview card
  | "import-confirm";   // Step 5: Success summary

type LinkedInProvider = "brightdata" | "scrapingdog";

interface ImportPreview {
  name: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  profilePictureUrl?: string;
  currentCompany?: string;
  currentRole?: string;
  location?: string;
  followers?: number;
  connections?: number;
  provider: LinkedInProvider;
  _rawData: any;
}

export function CreateContactDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("quick-create");
  const [createdContactId, setCreatedContactId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<LinkedInProvider>("scrapingdog");
  const [importCompany, setImportCompany] = useState(true);
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Quick create form data
  const [quickFormData, setQuickFormData] = useState({
    name: "",
    company: "",
    role: "",
    opportunity: "",
  });

  // Extended form data (for add-details step)
  const [detailsFormData, setDetailsFormData] = useState({
    email: "",
    phone: "",
    location: "",
    telegramUsername: "",
    linkedinUrl: "",
    twitterUrl: "",
    notes: "",
  });

  const utils = trpc.useUtils();

  // Get available providers
  const { data: providers } = trpc.contacts.getAvailableProviders.useQuery();

  // Mutations
  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: (result) => {
      setCreatedContactId(result.id);
      utils.contacts.list.invalidate();
      utils.graph.getData.invalidate();
      toast.success("Contact created!");
      setStep("post-create");
    },
    onError: (error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      toast.success("Contact updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });

  const previewMutation = trpc.contacts.getImportPreview.useMutation({
    onSuccess: (data) => {
      setPreviewData(data as ImportPreview);
      setStep("import-preview");
    },
    onError: (error) => {
      toast.error(`Failed to fetch preview: ${error.message}`);
      setStep("import-provider");
    },
  });

  const confirmImportMutation = trpc.contacts.confirmImport.useMutation({
    onSuccess: (result) => {
      utils.contacts.list.invalidate();
      utils.contacts.get.invalidate({ id: createdContactId! });
      toast.success(
        `Imported ${result.experienceCount} experiences, ${result.educationCount} education, ${result.skillsCount} skills`
      );
      setStep("import-confirm");
    },
    onError: (error) => {
      toast.error(`Failed to import: ${error.message}`);
    },
  });

  const resetDialog = () => {
    setOpen(false);
    setStep("quick-create");
    setCreatedContactId(null);
    setPreviewData(null);
    setLinkedinUrl("");
    setQuickFormData({ name: "", company: "", role: "", opportunity: "" });
    setDetailsFormData({
      email: "",
      phone: "",
      location: "",
      telegramUsername: "",
      linkedinUrl: "",
      twitterUrl: "",
      notes: "",
    });
  };

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFormData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    createMutation.mutate({
      name: quickFormData.name,
      company: quickFormData.company || undefined,
      role: quickFormData.role || undefined,
      opportunity: quickFormData.opportunity || undefined,
    });
  };

  const handleAddDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdContactId) return;

    updateMutation.mutate({
      id: createdContactId,
      email: detailsFormData.email || undefined,
      phone: detailsFormData.phone || undefined,
      location: detailsFormData.location || undefined,
      telegramUsername: detailsFormData.telegramUsername || undefined,
      linkedinUrl: detailsFormData.linkedinUrl || undefined,
      twitterUrl: detailsFormData.twitterUrl || undefined,
      notes: detailsFormData.notes || undefined,
    });

    // If LinkedIn URL was added, offer to import
    if (detailsFormData.linkedinUrl) {
      setLinkedinUrl(detailsFormData.linkedinUrl);
      toast.success("Details saved! You can now import from LinkedIn.");
    } else {
      resetDialog();
    }
  };

  const handleStartImport = () => {
    if (!linkedinUrl.trim()) {
      setStep("import-provider");
      return;
    }
    // Already have URL, go to provider selection
    setStep("import-provider");
  };

  const handleFetchPreview = () => {
    if (!linkedinUrl.trim()) {
      toast.error("Please enter a LinkedIn URL");
      return;
    }
    setStep("import-loading");
    previewMutation.mutate({
      linkedinUrl,
      provider: selectedProvider,
    });
  };

  const handleConfirmImport = () => {
    if (!createdContactId || !previewData) return;
    confirmImportMutation.mutate({
      contactId: createdContactId,
      importData: previewData._rawData,
      importCompany,
      provider: previewData.provider,
      linkedinUrl: linkedinUrl.trim(),
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
      <DialogContent className="sm:max-w-[500px]">
        {/* Step 1: Quick Create */}
        {step === "quick-create" && (
          <form onSubmit={handleQuickCreate}>
            <DialogHeader>
              <DialogTitle>Quick Add Contact</DialogTitle>
              <DialogDescription>
                Capture the essentials now. Add more details later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={quickFormData.name}
                  onChange={(e) => setQuickFormData({ ...quickFormData, name: e.target.value })}
                  placeholder="Jane Smith"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={quickFormData.company}
                    onChange={(e) => setQuickFormData({ ...quickFormData, company: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Role
                  </Label>
                  <Input
                    id="role"
                    value={quickFormData.role}
                    onChange={(e) => setQuickFormData({ ...quickFormData, role: e.target.value })}
                    placeholder="VP Sales"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="opportunity" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Opportunity
                </Label>
                <Textarea
                  id="opportunity"
                  value={quickFormData.opportunity}
                  onChange={(e) => setQuickFormData({ ...quickFormData, opportunity: e.target.value })}
                  placeholder="Why does this contact matter? e.g., 'Potential partnership for API product'"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Capture the deal or opportunity while it's fresh in your mind
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Contact"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: Post-Create Options */}
        {step === "post-create" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Contact Created!
              </DialogTitle>
              <DialogDescription>
                What would you like to do next?
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-6">
              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => setStep("add-details")}
              >
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Add More Details</p>
                    <p className="text-sm text-muted-foreground">
                      Email, phone, LinkedIn, notes, etc.
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={handleStartImport}
              >
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Import from LinkedIn</p>
                    <p className="text-sm text-muted-foreground">
                      Auto-fill experience, education, skills
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                className="justify-start h-auto py-4"
                onClick={resetDialog}
              >
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Done</p>
                    <p className="text-sm text-muted-foreground">
                      I'll add more details later
                    </p>
                  </div>
                </div>
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Add Details */}
        {step === "add-details" && (
          <form onSubmit={handleAddDetails}>
            <DialogHeader>
              <DialogTitle>Add More Details</DialogTitle>
              <DialogDescription>
                Fill in additional contact information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={detailsFormData.email}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, email: e.target.value })}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={detailsFormData.phone}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={detailsFormData.location}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, location: e.target.value })}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telegram">Telegram</Label>
                  <Input
                    id="telegram"
                    value={detailsFormData.telegramUsername}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, telegramUsername: e.target.value })}
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={detailsFormData.linkedinUrl}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/janesmith"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="twitter">Twitter/X URL</Label>
                <Input
                  id="twitter"
                  type="url"
                  value={detailsFormData.twitterUrl}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, twitterUrl: e.target.value })}
                  placeholder="https://x.com/janesmith"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={detailsFormData.notes}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("post-create")}>
                Back
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Details"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 4a: Provider Selection */}
        {step === "import-provider" && (
          <>
            <DialogHeader>
              <DialogTitle>Import from LinkedIn</DialogTitle>
              <DialogDescription>
                Enter the LinkedIn profile URL and choose a data provider
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/janesmith"
                  autoFocus
                />
              </div>

              {providers && providers.length > 1 && (
                <div className="grid gap-2">
                  <Label>Data Provider</Label>
                  <RadioGroup
                    value={selectedProvider}
                    onValueChange={(value) => setSelectedProvider(value as LinkedInProvider)}
                  >
                    {providers.map((provider) => (
                      <div key={provider.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value={provider.id} id={provider.id} />
                        <Label htmlFor={provider.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{provider.name}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              provider.speed === 'fast'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {provider.speed === 'fast' ? '~5-10s' : '~30-60s'}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("post-create")}>
                Back
              </Button>
              <Button onClick={handleFetchPreview} disabled={!linkedinUrl.trim()}>
                Fetch Profile
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4b: Loading */}
        {step === "import-loading" && (
          <>
            <DialogHeader>
              <DialogTitle>Importing Profile...</DialogTitle>
            </DialogHeader>
            <div className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Fetching LinkedIn profile</p>
                <p className="text-sm text-muted-foreground">
                  Using {selectedProvider === 'scrapingdog' ? 'Scrapingdog' : 'Bright Data'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Step 4c: Preview */}
        {step === "import-preview" && previewData && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Import</DialogTitle>
              <DialogDescription>
                Review the profile data before importing
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={previewData.profilePictureUrl} />
                  <AvatarFallback>{getInitials(previewData.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{previewData.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {previewData.currentRole} at {previewData.currentCompany}
                  </p>
                  {previewData.location && (
                    <p className="text-sm text-muted-foreground">{previewData.location}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm">
                    {previewData.followers !== undefined && (
                      <span>{previewData.followers.toLocaleString()} followers</span>
                    )}
                    {previewData.connections !== undefined && (
                      <span>{previewData.connections.toLocaleString()} connections</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="importCompany"
                  checked={importCompany}
                  onCheckedChange={(checked) => setImportCompany(checked === true)}
                />
                <Label htmlFor="importCompany" className="cursor-pointer">
                  Also create company record for {previewData.currentCompany}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("import-provider")}>
                Back
              </Button>
              <Button onClick={handleConfirmImport} disabled={confirmImportMutation.isPending}>
                {confirmImportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Data"
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 5: Success */}
        {step === "import-confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Import Complete!
              </DialogTitle>
              <DialogDescription>
                LinkedIn data has been added to the contact
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">
              <p className="text-muted-foreground">
                Experience, education, skills, and other data have been imported successfully.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={resetDialog}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
