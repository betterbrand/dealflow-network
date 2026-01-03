import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, X, Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ExtractedContact } from "../../../../server/morpheus";

interface CsvUploadInputProps {
  onParsed: (contacts: ExtractedContact[]) => void;
  onCancel: () => void;
}

export function CsvUploadInput({ onParsed, onCancel }: CsvUploadInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseMutation = trpc.contacts.parseCsv.useMutation({
    onSuccess: (data) => {
      toast.success(`Parsed ${data.successfulRows}/${data.totalRows} contacts`, {
        description: data.errors.length > 0 ? `${data.errors.length} errors found` : undefined,
      });
      onParsed(data.contacts);
    },
    onError: (error) => {
      toast.error(`Failed to parse CSV: ${error.message}`);
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file (.csv)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);

    // Read file content
    try {
      const text = await file.text();
      setCsvText(text);

      // Generate preview (first 5 rows)
      const lines = text.split("\n");
      if (lines.length > 0) {
        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines
          .slice(1, 6)
          .filter((line) => line.trim())
          .map((line) => {
            const values = line.split(",").map((v) => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || "";
            });
            return row;
          });

        setPreviewData(rows);
      }

      toast.success(`Loaded ${file.name}`);
    } catch (error) {
      toast.error("Failed to read file");
      console.error(error);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setCsvText(null);
    setPreviewData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleParse = () => {
    if (!csvText) {
      toast.error("Please select a CSV file first");
      return;
    }

    parseMutation.mutate({ csvText });
  };

  const handleDownloadTemplate = () => {
    const template = `Name,Email,Company,Role,Phone,Location,LinkedIn URL,Twitter URL,Telegram Username,Notes
John Doe,john@example.com,Acme Corp,CEO,+1 234 567 8900,San Francisco CA,https://linkedin.com/in/johndoe,https://twitter.com/johndoe,@johndoe,Met at TechConf 2026`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-template.csv";
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Template downloaded");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">CSV Import</h2>
        <p className="text-muted-foreground mt-2">
          Upload a CSV file with contact information
        </p>
      </div>

      {/* File Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="csv-upload" className="text-base">
            Select CSV File <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownloadTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={parseMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {selectedFile ? "Change File" : "Choose File"}
          </Button>
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span>{selectedFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={parseMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Supported format: .csv (max 5MB)
        </p>
      </div>

      {/* CSV Preview */}
      {previewData && previewData.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base">Preview (first 5 rows)</Label>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(previewData[0]).map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value: any, cellIndex) => (
                      <TableCell key={cellIndex} className="text-sm">
                        {value || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing preview only. All rows will be imported.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={parseMutation.isPending}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleParse}
          disabled={!csvText || parseMutation.isPending}
        >
          {parseMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing CSV...
            </>
          ) : (
            <>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import Contacts
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
