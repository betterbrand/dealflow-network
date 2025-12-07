import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Check, X, Users, Building2, MapPin, Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Suggestions() {
  const { user, loading: authLoading } = useAuth();
  const { data: suggestions, isLoading, refetch } = trpc.contacts.getSuggestions.useQuery();
  const createRelationship = trpc.relationships.create.useMutation();
  
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleApprove = async (
    contact1Id: number,
    contact2Id: number,
    contact1Name: string,
    contact2Name: string
  ) => {
    try {
      await createRelationship.mutateAsync({
        fromContactId: contact1Id,
        toContactId: contact2Id,
        relationshipType: "colleague",
        notes: "Auto-suggested based on shared attributes",
      });
      
      toast.success(`Added relationship between ${contact1Name} and ${contact2Name}`);
      
      // Add to dismissed to hide from UI
      const pairKey = [contact1Id, contact2Id].sort().join("-");
      setDismissedIds(prev => new Set(Array.from(prev).concat(pairKey)));
      
      // Refetch suggestions
      refetch();
    } catch (error) {
      toast.error("Failed to create relationship");
      console.error(error);
    }
  };

  const handleDismiss = (contact1Id: number, contact2Id: number) => {
    const pairKey = [contact1Id, contact2Id].sort().join("-");
    setDismissedIds(prev => new Set(Array.from(prev).concat(pairKey)));
    toast.info("Suggestion dismissed");
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Sign in Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to view relationship suggestions.
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleSuggestions = suggestions?.filter(s => {
    const pairKey = [s.contact1.id, s.contact2.id].sort().join("-");
    return !dismissedIds.has(pairKey);
  }) || [];

  const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
    const variants = {
      high: "default" as const,
      medium: "secondary" as const,
      low: "outline" as const,
    };
    const labels = {
      high: "High Confidence",
      medium: "Medium Confidence",
      low: "Low Confidence",
    };
    return (
      <Badge variant={variants[confidence]}>
        {labels[confidence]}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Relationship Suggestions</h1>
          <p className="text-muted-foreground">
            Smart suggestions based on shared companies, roles, and locations
          </p>
        </div>

        {/* Suggestions List */}
        {visibleSuggestions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Suggestions Available</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {suggestions?.length === 0
                  ? "We couldn't find any potential connections based on shared attributes. Add more contacts to get suggestions."
                  : "You've reviewed all suggestions! Check back later as you add more contacts."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {visibleSuggestions.map((suggestion, index) => {
              const pairKey = [suggestion.contact1.id, suggestion.contact2.id].sort().join("-");
              
              return (
                <Card key={pairKey}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          <div className="flex items-center gap-3">
                            <span>{suggestion.contact1.name}</span>
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <span>{suggestion.contact2.name}</span>
                          </div>
                        </CardTitle>
                        <CardDescription className="text-base">
                          {suggestion.reason}
                        </CardDescription>
                      </div>
                      {getConfidenceBadge(suggestion.confidence)}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Contact 1 */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground">
                          {suggestion.contact1.name}
                        </h4>
                        <div className="space-y-1">
                          {suggestion.contact1.company && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{suggestion.contact1.company}</span>
                            </div>
                          )}
                          {suggestion.contact1.role && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span>{suggestion.contact1.role}</span>
                            </div>
                          )}
                          {suggestion.contact1.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{suggestion.contact1.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact 2 */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground">
                          {suggestion.contact2.name}
                        </h4>
                        <div className="space-y-1">
                          {suggestion.contact2.company && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{suggestion.contact2.company}</span>
                            </div>
                          )}
                          {suggestion.contact2.role && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span>{suggestion.contact2.role}</span>
                            </div>
                          )}
                          {suggestion.contact2.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{suggestion.contact2.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismiss(suggestion.contact1.id, suggestion.contact2.id)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleApprove(
                            suggestion.contact1.id,
                            suggestion.contact2.id,
                            suggestion.contact1.name,
                            suggestion.contact2.name
                          )
                        }
                        disabled={createRelationship.isPending}
                      >
                        {createRelationship.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Add Relationship
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
