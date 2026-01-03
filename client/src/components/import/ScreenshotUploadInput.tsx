import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Image, X, FileImage } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ExtractedContact } from "../../../../server/morpheus";

interface ScreenshotUploadInputProps {
  onExtracted: (contacts: ExtractedContact[], ocrText: string) => void;
  onCancel: () => void;
}

export function ScreenshotUploadInput({ onExtracted, onCancel }: ScreenshotUploadInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractMutation = trpc.contacts.extractFromScreenshot.useMutation({
    onSuccess: (data) => {
      toast.success(`Extracted ${data.contacts.length} contact(s) from screenshot`);
      onExtracted(data.contacts, data.ocrText);
    },
    onError: (error) => {
      toast.error(`Failed to extract contacts: ${error.message}`);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (.png, .jpg, or .jpeg)");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    if (!selectedFile || !previewUrl) {
      toast.error("Please select an image first");
      return;
    }

    // Extract base64 data and format
    const base64Data = previewUrl;
    const format = selectedFile.type.split("/")[1] as "png" | "jpg" | "jpeg";

    extractMutation.mutate({
      imageBase64: base64Data,
      imageFormat: format,
    });
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowOcrText(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Upload Screenshot</h2>
        <p className="text-muted-foreground mt-2">
          Upload a screenshot of a Telegram chat or conversation to extract contact information
        </p>
      </div>

      {/* File Input */}
      <div className="space-y-4">
        <Label htmlFor="screenshot-upload" className="text-base">
          Select Image <span className="text-destructive">*</span>
        </Label>

        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            id="screenshot-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={extractMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {selectedFile ? "Change Image" : "Choose Image"}
          </Button>
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileImage className="h-4 w-4" />
              <span>{selectedFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={extractMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Supported formats: PNG, JPG, JPEG (max 10MB)
        </p>
      </div>

      {/* Image Preview */}
      {previewUrl && (
        <div className="space-y-2">
          <Label className="text-base">Preview</Label>
          <div className="border rounded-lg p-4 bg-muted/50">
            <img
              src={previewUrl}
              alt="Screenshot preview"
              className="max-h-96 mx-auto rounded"
            />
          </div>
        </div>
      )}

      {/* OCR Text Preview (for debugging) */}
      {extractMutation.data?.ocrText && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowOcrText(!showOcrText)}
          >
            {showOcrText ? "Hide" : "Show"} Extracted Text
          </Button>
          {showOcrText && (
            <div className="border rounded-lg p-4 bg-muted/50 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {extractMutation.data.ocrText}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={extractMutation.isPending}>
          Back
        </Button>
        <Button
          type="button"
          onClick={handleExtract}
          disabled={!selectedFile || extractMutation.isPending}
        >
          {extractMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting Contacts...
            </>
          ) : (
            <>
              <Image className="mr-2 h-4 w-4" />
              Extract Contacts
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
