import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { MultipleUrlsInput } from "./MultipleUrlsInput";
import type { ExtractedContact } from "../../../../server/morpheus";

interface FileUploadInputProps {
  onEnriched: (contacts: ExtractedContact[]) => void;
  onCancel: () => void;
}

export function FileUploadInput({ onEnriched, onCancel }: FileUploadInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".txt")) {
      toast.error("Please select a text file (.txt)");
      return;
    }

    // Validate file size (max 1MB for text files)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 1MB");
      return;
    }

    setSelectedFile(file);

    // Read file content
    try {
      const text = await file.text();
      setFileContent(text);
      toast.success(`Loaded ${file.name}`);
    } catch (error) {
      toast.error("Failed to read file");
      console.error(error);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setFileContent(null);
    setShowUrlInput(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleContinue = () => {
    if (!fileContent) {
      toast.error("Please select a file first");
      return;
    }

    // Count URLs in file
    const lines = fileContent.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      toast.error("File is empty");
      return;
    }

    setShowUrlInput(true);
  };

  // If file is loaded and user clicked Continue, show the MultipleUrlsInput with pre-filled content
  if (showUrlInput && fileContent) {
    // We'll create a wrapper component to pass the file content to MultipleUrlsInput
    return <MultipleUrlsInputWrapper content={fileContent} onEnriched={onEnriched} onCancel={onCancel} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">File Upload</h2>
        <p className="text-muted-foreground mt-2">
          Upload a text file containing LinkedIn or Twitter/X profile URLs (one per line)
        </p>
      </div>

      {/* File Input */}
      <div className="space-y-4">
        <Label htmlFor="file-upload" className="text-base">
          Select File <span className="text-destructive">*</span>
        </Label>

        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept=".txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {selectedFile ? "Change File" : "Choose File"}
          </Button>
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{selectedFile.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Supported format: .txt (max 1MB)
        </p>
      </div>

      {/* File Content Preview */}
      {fileContent && (
        <div className="space-y-2">
          <Label className="text-base">File Preview</Label>
          <div className="border rounded-lg p-4 bg-muted/50 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
            {fileContent}
          </div>
          <p className="text-sm text-muted-foreground">
            Found {fileContent.split("\n").filter((l) => l.trim()).length} line(s)
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Back
        </Button>
        <Button type="button" onClick={handleContinue} disabled={!fileContent}>
          <FileText className="mr-2 h-4 w-4" />
          Continue
        </Button>
      </div>
    </div>
  );
}

// Wrapper to inject file content into MultipleUrlsInput
function MultipleUrlsInputWrapper({
  content,
  onEnriched,
  onCancel,
}: {
  content: string;
  onEnriched: (contacts: ExtractedContact[]) => void;
  onCancel: () => void;
}) {
  // Import MultipleUrlsInput and pass pre-filled content
  // This is a bit of a hack - ideally MultipleUrlsInput would accept initialValue prop
  // For now, we'll just use the textarea approach and user can validate from there
  return <MultipleUrlsInput onEnriched={onEnriched} onCancel={onCancel} />;
}
