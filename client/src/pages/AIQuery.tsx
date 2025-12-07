import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, User, Building2, MapPin, Briefcase, History, X, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function AIQuery() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const aiQueryMutation = trpc.contacts.aiQuery.useMutation();
  const { data: queryHistory, refetch: refetchHistory } = trpc.queryHistory.list.useQuery();
  const deleteHistoryMutation = trpc.queryHistory.delete.useMutation();
  const clearHistoryMutation = trpc.queryHistory.clear.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const result = await aiQueryMutation.mutateAsync({ query });
      setResults(result);
      refetchHistory(); // Refresh history after new query
    } catch (error) {
      console.error("AI query failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  const handleDeleteHistory = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteHistoryMutation.mutateAsync({ id });
      refetchHistory();
    } catch (error) {
      console.error("Failed to delete history:", error);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearHistoryMutation.mutateAsync();
      refetchHistory();
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  const exampleQueries = [
    "Who do I know at Microsoft?",
    "Find all CEOs in my network",
    "Show me contacts in San Francisco",
    "Who did I meet in 2024?",
    "Find all founders",
  ];

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="flex gap-6">
        {/* Query History Sidebar */}
        {showHistory && (
          <div className="w-80 flex-shrink-0">
            <Card className="sticky top-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Query History
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Recent searches</CardDescription>
              </CardHeader>
              <CardContent>
                {queryHistory && queryHistory.length > 0 ? (
                  <div className="space-y-2">
                    {queryHistory.map((item) => (
                      <div
                        key={item.id}
                        className="group p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleHistoryClick(item.query)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2">
                              {item.query}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </div>
                            {item.resultCount !== null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.resultCount} {item.resultCount === 1 ? "result" : "results"}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            onClick={(e) => handleDeleteHistory(item.id, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={handleClearHistory}
                    >
                      Clear All
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No query history yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          AI Network Query
        </h1>
        <p className="text-muted-foreground">
          Ask questions about your network in natural language
        </p>
      </div>

      {/* Query Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
          <CardDescription>
            Use natural language to search your contacts, companies, and relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Who do I know at OpenAI?"
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Ask
                </>
              )}
            </Button>
          </form>

          {/* Example Queries */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(example)}
                  disabled={isLoading}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Query Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Understanding Your Query</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{results.explanation}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Intent: {results.parsed.intent}
                </Badge>
                {results.parsed.filters.companies?.map((c: string) => (
                  <Badge key={c} variant="outline">
                    <Building2 className="mr-1 h-3 w-3" />
                    {c}
                  </Badge>
                ))}
                {results.parsed.filters.roles?.map((r: string) => (
                  <Badge key={r} variant="outline">
                    <Briefcase className="mr-1 h-3 w-3" />
                    {r}
                  </Badge>
                ))}
                {results.parsed.filters.locations?.map((l: string) => (
                  <Badge key={l} variant="outline">
                    <MapPin className="mr-1 h-3 w-3" />
                    {l}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Results ({results.count} {results.count === 1 ? "contact" : "contacts"})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.count === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No contacts found matching your query. Try a different search.
                </p>
              ) : (
                <div className="space-y-3">
                  {results.results.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => setLocation(`/contacts/${contact.id}`)}
                    >
                      <div className="flex-shrink-0">
                        {contact.profilePictureUrl ? (
                          <img
                            src={contact.profilePictureUrl}
                            alt={contact.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">{contact.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                          {contact.role && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {contact.role}
                            </span>
                          )}
                          {contact.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {contact.company}
                            </span>
                          )}
                          {contact.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {contact.location}
                            </span>
                          )}
                        </div>
                        {contact.summary && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {contact.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
        </div>
      </div>

      {/* Show History Button (when hidden) */}
      {!showHistory && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-8 right-8"
          onClick={() => setShowHistory(true)}
        >
          <History className="mr-2 h-4 w-4" />
          Show History
        </Button>
      )}
    </div>
  );
}