import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Link, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ExtractedContact } from "../../../../server/morpheus";

interface MultipleUrlsInputProps {
  onEnriched: (contacts: ExtractedContact[]) => void;
  onCancel: () => void;
}

export function MultipleUrlsInput({ onEnriched, onCancel }: MultipleUrlsInputProps) {
  const [urlText, setUrlText] = useState("");
  const [validUrls, setValidUrls] = useState<string[]>([]);
  const [invalidLines, setInvalidLines] = useState<number[]>([]);

  const enrichMutation = trpc.contacts.enrichMultipleUrls.useMutation({
    onSuccess: (data) => {
      const contacts: ExtractedContact[] = data.results.map((r: any) => {
        const enriched = r.data;
        const latestExp = enriched.experience?.[0];

        return {
          name: enriched.name,
          company: latestExp?.company,
          role: latestExp?.title || enriched.headline,
          location: enriched.location,
          linkedinUrl: r.url,
          conversationSummary: enriched.summary,
        };
      });

      toast.success(`Enriched ${contacts.length} profile(s)`, {
        description: data.errors.length > 0
          ? `${data.errors.length} failed to enrich`
          : undefined,
      });

      onEnriched(contacts);
    },
    onError: (error) => {
      toast.error(`Failed to enrich profiles: ${error.message}`);
    },
  });

  const handleValidate = () => {
    const lines = urlText.split("\n").filter((line) => line.trim());
    const urls: string[] = [];
    const invalid: number[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check if it's a valid URL
      try {
        const url = new URL(trimmed);
        if (url.hostname.includes("linkedin.com") || url.hostname.includes("twitter.com") || url.hostname.includes("x.com")) {
          urls.push(trimmed);
        } else {
          invalid.push(index + 1);
        }
      } catch {
        invalid.push(index + 1);
      }
    });

    setValidUrls(urls);
    setInvalidLines(invalid);

    if (invalid.length > 0) {
      toast.error(`Invalid URLs found on lines: ${invalid.join(", ")}`);
    } else if (urls.length === 0) {
      toast.error("No valid URLs found");
    } else {
      toast.success(`Found ${urls.length} valid URL(s)`);
    }
  };

  const handleEnrich = () => {
    if (validUrls.length === 0) {
      toast.error("Please add and validate URLs first");
      return;
    }

    // Determine platform from first URL
    const isLinkedIn = validUrls[0].includes("linkedin.com");
    const platform = isLinkedIn ? "linkedin" : "twitter";

    // Check if all URLs are from the same platform
    const allSamePlatform = validUrls.every((url) =>
      platform === "linkedin" ? url.includes("linkedin.com") : (url.includes("twitter.com") || url.includes("x.com"))
    );

    if (!allSamePlatform) {
      toast.error("All URLs must be from the same platform (either all LinkedIn or all Twitter/X)");
      return;
    }

    enrichMutation.mutate({
      urls: validUrls,
      platform,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Multiple URLs</h2>
        <p className="text-muted-foreground mt-2">
          Paste LinkedIn or Twitter/X profile URLs (one per line) to import multiple contacts
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-4">
        <Label htmlFor="urls-textarea" className="text-base">
          Profile URLs <span className="text-destructive">*</span>
        </Label>

        <Textarea
          id="urls-textarea"
          value={urlText}
          onChange={(e) => {
            setUrlText(e.target.value);
            setValidUrls([]);
            setInvalidLines([]);
          }}
          placeholder={`https://linkedin.com/in/username1
https://linkedin.com/in/username2
https://linkedin.com/in/username3`}
          rows={8}
          className="font-mono text-sm"
          disabled={enrichMutation.isPending}
        />

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p>Enter one URL per line. All URLs must be from the same platform.</p>
            <p className="mt-1">
              Supported: LinkedIn (linkedin.com/in/...) and Twitter/X (twitter.com/... or x.com/...)
            </p>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {(validUrls.length > 0 || invalidLines.length > 0) && (
        <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
          {validUrls.length > 0 && (
            <p className="text-sm text-green-600 font-medium">
              ✓ {validUrls.length} valid URL(s) found
            </p>
          )}
          {invalidLines.length > 0 && (
            <p className="text-sm text-destructive font-medium">
              ✗ Invalid URLs on lines: {invalidLines.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Enrichment Progress */}
      {enrichMutation.isPending && (
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Enriching profiles...
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Processing {validUrls.length} profile(s) • This may take several minutes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={enrichMutation.isPending}
        >
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleValidate}
            disabled={!urlText.trim() || enrichMutation.isPending}
          >
            Validate URLs
          </Button>
          <Button
            type="button"
            onClick={handleEnrich}
            disabled={validUrls.length === 0 || enrichMutation.isPending}
          >
            {enrichMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Enrich {validUrls.length} Profile(s)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
