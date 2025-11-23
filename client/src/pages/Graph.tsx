// Knowledge Graph Visualization - Interactive force-directed network graph
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Network, RefreshCw, Plus } from "lucide-react";
import { useRef, useCallback, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useLocation } from "wouter";
import { AddRelationshipDialog } from "@/components/AddRelationshipDialog";

export default function Graph() {
  const { data: graphData, isLoading, refetch } = trpc.graph.getData.useQuery();
  const [, setLocation] = useLocation();
  const graphRef = useRef<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Auto-fit graph when data loads
  useEffect(() => {
    if (graphData && graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  }, [graphData]);

  const handleNodeClick = useCallback((node: any) => {
    setLocation(`/contacts/${node.id}`);
  }, [setLocation]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-muted-foreground mt-2">
            Visualize your network connections
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)} variant="default">
            <Plus className="mr-2 h-4 w-4" />
            Add Relationship
          </Button>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
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
            <div className="border rounded-lg overflow-hidden bg-background">
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={1000}
                height={600}
                backgroundColor="#ffffff"
                nodeLabel={(node: any) => `
                  <div style="background: white; padding: 8px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                    <strong>${node.label}</strong><br/>
                    ${node.company ? `<span style="color: #666;">${node.company}</span><br/>` : ''}
                    ${node.role ? `<span style="color: #999;">${node.role}</span>` : ''}
                  </div>
                `}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.label;
                  const fontSize = 14/globalScale;
                  const nodeRadius = 8;
                  
                  ctx.font = `${fontSize}px Sans-Serif`;
                  
                  // Draw node circle with larger size
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node.company ? '#3b82f6' : '#8b5cf6';
                  ctx.fill();
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  
                  // Draw label with background
                  const labelY = node.y + nodeRadius + 15;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  
                  // Measure text for background
                  const textWidth = ctx.measureText(label).width;
                  const padding = 4;
                  
                  // Draw label background
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                  ctx.fillRect(
                    node.x - textWidth/2 - padding,
                    labelY - fontSize/2 - padding,
                    textWidth + padding * 2,
                    fontSize + padding * 2
                  );
                  
                  // Draw label text
                  ctx.fillStyle = '#1f2937';
                  ctx.fillText(label, node.x, labelY);
                }}
                nodeCanvasObjectMode={() => 'replace'}
                onNodeClick={handleNodeClick}
                linkColor={() => '#9ca3af'}
                linkWidth={2}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                linkLabel={(link: any) => link.type?.replace(/_/g, ' ') || ''}
                linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
                  if (!link.source || !link.target) return;
                  
                  const start = link.source;
                  const end = link.target;
                  
                  // Draw the link line
                  ctx.beginPath();
                  ctx.moveTo(start.x, start.y);
                  ctx.lineTo(end.x, end.y);
                  ctx.strokeStyle = '#9ca3af';
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  
                  // Draw relationship label
                  if (link.type) {
                    const label = link.type.replace(/_/g, ' ');
                    const midX = (start.x + end.x) / 2;
                    const midY = (start.y + end.y) / 2;
                    
                    ctx.font = '10px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Draw label background
                    const textWidth = ctx.measureText(label).width;
                    const padding = 4;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    ctx.fillRect(
                      midX - textWidth/2 - padding,
                      midY - 6 - padding,
                      textWidth + padding * 2,
                      12 + padding * 2
                    );
                    
                    // Draw label text
                    ctx.fillStyle = '#6b7280';
                    ctx.fillText(label, midX, midY);
                  }
                }}
                linkCanvasObjectMode={() => 'replace'}
                cooldownTicks={100}
                onEngineStop={() => graphRef.current?.zoomToFit(400, 100)}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                warmupTicks={50}
              />
              {graphData && graphData.links.length === 0 && (
                <div className="absolute top-4 left-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 max-w-xs">
                  <strong>Tip:</strong> Contacts are shown as nodes. Add relationships between contacts to see connections!
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddRelationshipDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
