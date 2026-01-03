import { Link, Image, FileText, Upload, Table, PenTool } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type ImportMethod =
  | "single-url"
  | "screenshot"
  | "multiple-urls"
  | "file-upload"
  | "csv"
  | "manual";

interface MethodSelectionStepProps {
  onSelect: (method: ImportMethod) => void;
}

const IMPORT_METHODS = [
  {
    id: "single-url" as const,
    icon: Link,
    title: "Single Social URL",
    description: "Import from a LinkedIn or Twitter profile",
    status: "ready" as const,
  },
  {
    id: "screenshot" as const,
    icon: Image,
    title: "Screenshot Upload",
    description: "Extract contacts from Telegram chat screenshots",
    status: "ready" as const,
  },
  {
    id: "multiple-urls" as const,
    icon: FileText,
    title: "Multiple URLs",
    description: "Paste a list of LinkedIn/Twitter URLs",
    status: "ready" as const,
  },
  {
    id: "file-upload" as const,
    icon: Upload,
    title: "File Upload",
    description: "Upload a text file containing URLs",
    status: "ready" as const,
  },
  {
    id: "csv" as const,
    icon: Table,
    title: "CSV Import",
    description: "Upload a CSV file with contact details",
    status: "ready" as const,
  },
  {
    id: "manual" as const,
    icon: PenTool,
    title: "Manual Entry",
    description: "Enter contact information directly",
    status: "ready" as const,
  },
];

export function MethodSelectionStep({ onSelect }: MethodSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Choose Import Method</h2>
        <p className="text-muted-foreground mt-2">
          Select how you'd like to add contacts to your network
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {IMPORT_METHODS.map((method) => {
          const Icon = method.icon;

          return (
            <Card
              key={method.id}
              className="relative cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => onSelect(method.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  {method.status === "ready" ? (
                    <Badge variant="default" className="text-xs">
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-4">{method.title}</CardTitle>
                <CardDescription className="text-sm">
                  {method.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(method.id);
                  }}
                >
                  Select
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Tip:</strong> All import methods allow you to review and edit contacts before
          creating them.
        </p>
      </div>
    </div>
  );
}
