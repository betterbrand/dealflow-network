import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Network, RefreshCw } from "lucide-react";

export default function Graph() {
  const { data: graphData, isLoading, refetch } = trpc.graph.getData.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-muted-foreground mt-2">
            Visualize your network connections
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Visualization</CardTitle>
          <CardDescription>
            {graphData ? `${graphData.nodes.length} contacts, ${graphData.links.length} connections` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              <div className="text-center">
                <Network className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                <p>Loading network graph...</p>
              </div>
            </div>
          ) : graphData && graphData.nodes.length === 0 ? (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              <div className="text-center">
                <Network className="h-12 w-12 mx-auto mb-4" />
                <p>No contacts yet. Start networking to build your graph!</p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-8 h-[600px] bg-muted/20">
              <div className="text-center text-muted-foreground">
                <Network className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">3D Graph Visualization Coming Soon</p>
                <p className="text-sm">
                  Interactive knowledge graph with force-directed layout will be implemented here.
                </p>
                <div className="mt-6 text-sm text-left max-w-md mx-auto space-y-2">
                  <p><strong>Current Data:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{graphData?.nodes.length || 0} contact nodes</li>
                    <li>{graphData?.links.length || 0} relationship edges</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
