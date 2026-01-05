import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// Import wizard components
import { MethodSelectionStep, type ImportMethod } from "./import/MethodSelectionStep";
import { ScreenshotUploadInput } from "./import/ScreenshotUploadInput";
import { MultipleUrlsInput } from "./import/MultipleUrlsInput";
import { FileUploadInput } from "./import/FileUploadInput";
import { CsvUploadInput } from "./import/CsvUploadInput";
import { ManualEntryInput } from "./import/ManualEntryInput";
import { BulkContactReview } from "./import/BulkContactReview";
import type { ExtractedContact } from "../../../server/morpheus";

type WizardStep = "method-selection" | "input" | "review" | "complete";

export function CreateContactDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("method-selection");
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod | null>(null);
  const [extractedContacts, setExtractedContacts] = useState<ExtractedContact[]>([]);
  const [ocrText, setOcrText] = useState<string>("");

  const utils = trpc.useUtils();

  const resetDialog = () => {
    setStep("method-selection");
    setSelectedMethod(null);
    setExtractedContacts([]);
    setOcrText("");
  };

  const handleMethodSelect = (method: ImportMethod) => {
    setSelectedMethod(method);
    setStep("input");
  };

  const handleContactsExtracted = (contacts: ExtractedContact[], ocr?: string) => {
    setExtractedContacts(contacts);
    if (ocr) setOcrText(ocr);
    setStep("review");
  };

  const handleBulkComplete = (results: any) => {
    toast.success("Import complete!", {
      description: `${results.successful} contact(s) created successfully`,
    });

    // Invalidate queries to refresh data
    utils.contacts.list.invalidate();
    utils.graph.getData.invalidate();

    // Close dialog
    setOpen(false);
    resetDialog();
  };

  const handleCancel = () => {
    if (step === "method-selection") {
      setOpen(false);
      resetDialog();
    } else if (step === "input") {
      setStep("method-selection");
      setSelectedMethod(null);
    } else if (step === "review") {
      setStep("input");
      setExtractedContacts([]);
    }
  };

  const getDialogMetadata = () => {
    switch (step) {
      case "method-selection":
        return {
          title: "Add Contact",
          description: "Choose how you'd like to import contacts to your network",
        };
      case "input":
        switch (selectedMethod) {
          case "screenshot":
            return {
              title: "Screenshot Upload",
              description: "Upload a screenshot to extract contact information",
            };
          case "multiple-urls":
            return {
              title: "Multiple URLs",
              description: "Paste a list of social profile URLs to import",
            };
          case "file-upload":
            return {
              title: "File Upload",
              description: "Upload a text file containing social profile URLs",
            };
          case "csv":
            return {
              title: "CSV Import",
              description: "Upload a CSV file with contact details",
            };
          case "manual":
            return {
              title: "Manual Entry",
              description: "Manually enter contact details",
            };
          default:
            return {
              title: "Import Contacts",
              description: "Add contacts to your network",
            };
        }
      case "review":
        return {
          title: "Review Contacts",
          description: `Review and confirm ${extractedContacts.length} contact(s) before importing`,
        };
      default:
        return {
          title: "Add Contact",
          description: "Import contacts to your network",
        };
    }
  };

  const renderStep = () => {
    switch (step) {
      case "method-selection":
        return <MethodSelectionStep onSelect={handleMethodSelect} />;

      case "input":
        switch (selectedMethod) {
          case "screenshot":
            return (
              <ScreenshotUploadInput
                onExtracted={handleContactsExtracted}
                onCancel={handleCancel}
              />
            );
          case "multiple-urls":
            return (
              <MultipleUrlsInput
                onEnriched={handleContactsExtracted}
                onCancel={handleCancel}
              />
            );
          case "file-upload":
            return (
              <FileUploadInput
                onEnriched={handleContactsExtracted}
                onCancel={handleCancel}
              />
            );
          case "csv":
            return (
              <CsvUploadInput
                onParsed={handleContactsExtracted}
                onCancel={handleCancel}
              />
            );
          case "manual":
            return (
              <ManualEntryInput
                onSubmit={handleContactsExtracted}
                onCancel={handleCancel}
              />
            );
          case "single-url":
            // TODO: Implement single URL input (can reuse existing enrichFromLinkedIn flow)
            toast.info("Single URL: Using existing flow for now");
            resetDialog();
            setOpen(false);
            return null;
          default:
            return null;
        }

      case "review":
        return (
          <BulkContactReview
            contacts={extractedContacts}
            onComplete={handleBulkComplete}
            onCancel={handleCancel}
          />
        );

      default:
        return null;
    }
  };

  const metadata = getDialogMetadata();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{metadata.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {metadata.description}
        </DialogDescription>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
