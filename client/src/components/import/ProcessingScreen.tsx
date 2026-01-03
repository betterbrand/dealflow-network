import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProcessingOperation = "ocr" | "enrichment" | "csv-parsing" | "bulk-creation";

interface ProcessingScreenProps {
  operation: ProcessingOperation;
  progress?: {
    current: number;
    total: number;
  };
  onCancel?: () => void;
}

const OPERATION_LABELS: Record<ProcessingOperation, { title: string; description: string }> = {
  ocr: {
    title: "Extracting text from image...",
    description: "Using OCR to read the screenshot • Typically takes 10-20 seconds",
  },
  enrichment: {
    title: "Enriching profiles...",
    description: "Fetching LinkedIn/Twitter data • Avg 30-60 seconds per profile",
  },
  "csv-parsing": {
    title: "Parsing CSV file...",
    description: "Validating and mapping contact data",
  },
  "bulk-creation": {
    title: "Creating contacts...",
    description: "Checking for duplicates and saving to database",
  },
};

export function ProcessingScreen({ operation, progress, onCancel }: ProcessingScreenProps) {
  const { title, description } = OPERATION_LABELS[operation];
  const showProgress = progress && progress.total > 0;
  const progressPercent = showProgress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6 py-12">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Spinner */}
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-primary/20" />
          <Loader2 className="absolute inset-0 m-auto h-20 w-20 animate-spin text-primary" />
        </div>

        {/* Title and Description */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="w-full max-w-md space-y-2">
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {progress.current} of {progress.total}
              </span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        )}

        {/* Estimated Time (for enrichment) */}
        {operation === "enrichment" && showProgress && (
          <p className="text-sm text-muted-foreground">
            Estimated time remaining: ~{Math.ceil((progress.total - progress.current) * 0.75)} minutes
          </p>
        )}

        {/* Cancel Button */}
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="mt-4">
            Cancel
          </Button>
        )}

        {/* Tips */}
        <div className="text-center text-sm text-muted-foreground max-w-md pt-4">
          <p>
            {operation === "enrichment" && "Processing profiles in parallel batches to optimize speed"}
            {operation === "ocr" && "Tesseract.js is reading the text from your screenshot"}
            {operation === "csv-parsing" && "Auto-detecting column mappings and validating data"}
            {operation === "bulk-creation" && "Duplicate detection is running for each contact"}
          </p>
        </div>
      </div>
    </div>
  );
}
