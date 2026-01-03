import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Send, Sparkles, User, Building2, MapPin, Briefcase, History, X, Clock, Lightbulb } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";

export default function AIQuery() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(-1);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + K: Focus search input
      if (modKey && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + Enter: Submit query
      if (modKey && e.key === 'Enter' && document.activeElement === inputRef.current) {
        e.preventDefault();
        handleSubmit(e as any);
        return;
      }

      // Escape: Clear input
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery("");
        setResults(null);
        setSelectedHistoryIndex(-1);
        setSelectedResultIndex(-1);
        return;
      }

      // Cmd/Ctrl + Shift + H: Toggle history modal
      if (modKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setShowHistoryModal(!showHistoryModal);
        return;
      }

      // Cmd/Ctrl + /: Show shortcuts modal
      if (modKey && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // ?: Show shortcuts modal
      if (e.key === '?' && !modKey && document.activeElement !== inputRef.current) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // 1-5: Select example queries
      if (['1', '2', '3', '4', '5'].includes(e.key) && document.activeElement !== inputRef.current) {
        const index = parseInt(e.key) - 1;
        if (index < exampleQueries.length) {
          setQuery(exampleQueries[index]);
          inputRef.current?.focus();
        }
        return;
      }

      // Arrow Up/Down: Navigate history
      if (queryHistory && queryHistory.length > 0 && showHistoryModal) {
        if (e.key === 'ArrowUp' && document.activeElement !== inputRef.current) {
          e.preventDefault();
          setSelectedHistoryIndex(prev => 
            prev <= 0 ? queryHistory.length - 1 : prev - 1
          );
          return;
        }
        if (e.key === 'ArrowDown' && document.activeElement !== inputRef.current) {
          e.preventDefault();
          setSelectedHistoryIndex(prev => 
            prev >= queryHistory.length - 1 ? 0 : prev + 1
          );
          return;
        }
        // Enter on history item
        if (e.key === 'Enter' && selectedHistoryIndex >= 0 && document.activeElement !== inputRef.current) {
          e.preventDefault();
          handleHistoryClick(queryHistory[selectedHistoryIndex].query);
          inputRef.current?.focus();
          setSelectedHistoryIndex(-1);
          return;
        }
        // Delete history item
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedHistoryIndex >= 0 && document.activeElement !== inputRef.current) {
          e.preventDefault();
          handleDeleteHistory(queryHistory[selectedHistoryIndex].id, e as any);
          setSelectedHistoryIndex(-1);
          return;
        }
      }

      // J/K: Navigate results
      if (results && results.results && results.results.length > 0) {
        if (e.key === 'j' && document.activeElement !== inputRef.current) {
          e.preventDefault();
          setSelectedResultIndex(prev => 
            prev >= results.results.length - 1 ? 0 : prev + 1
          );
          return;
        }
        if (e.key === 'k' && document.activeElement !== inputRef.current) {
          e.preventDefault();
          setSelectedResultIndex(prev => 
            prev <= 0 ? results.results.length - 1 : prev - 1
          );
          return;
        }
        // Enter on result
        if (e.key === 'Enter' && selectedResultIndex >= 0 && document.activeElement !== inputRef.current) {
          e.preventDefault();
          setLocation(`/contacts/${results.results[selectedResultIndex].id}`);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, showHistoryModal, queryHistory, selectedHistoryIndex, results, selectedResultIndex]);

  return (
    <>
      <div className="flex-1 h-full">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-purple-500" />
                AI Network Query
              </h1>
              <p className="text-muted-foreground">
                Ask questions about your network in natural language
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowHistoryModal(true)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
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
                ref={inputRef}
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
                    {results.results.map((contact: any, idx: number) => (
                      <div
                        key={contact.id}
                        className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                          idx === selectedResultIndex ? 'bg-accent ring-2 ring-primary' : ''
                        }`}
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

            {/* Follow-up Questions */}
            {results.followUpQuestions && results.followUpQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Explore Further
                  </CardTitle>
                  <CardDescription>
                    Try these follow-up questions to dive deeper
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {results.followUpQuestions.map((question: string, idx: number) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuery(question);
                          inputRef.current?.focus();
                        }}
                        className="text-left justify-start h-auto py-2 px-3"
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Query History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Query History
            </DialogTitle>
            <DialogDescription>Recent searches</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {queryHistory && queryHistory.length > 0 ? (
              <div className="space-y-2">
                {queryHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`group p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                      queryHistory.indexOf(item) === selectedHistoryIndex ? 'bg-accent ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      handleHistoryClick(item.query);
                      setShowHistoryModal(false);
                    }}
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
              <p className="text-sm text-muted-foreground text-center py-8">
                No query history yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </>
  );
}
