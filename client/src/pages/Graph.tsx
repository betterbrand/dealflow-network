import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Network, RefreshCw, Plus, Maximize2, Minimize2, Filter, X } from "lucide-react";
import { useRef, useCallback, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useLocation } from "wouter";
import { AddRelationshipDialog } from "@/components/AddRelationshipDialog";

export default function Graph() {
  const [, setLocation] = useLocation();
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  const [filters, setFilters] = useState({
    company: "",
    relationshipType: "",
    showFilters: false,
  });

  const { data: rawGraphData, isLoading, refetch } = trpc.graph.getData.useQuery();
  const { data: companies } = trpc.companies.list.useQuery();

  // Apply filters to graph data
  const graphData = rawGraphData ? {
    nodes: rawGraphData.nodes.filter((node: any) => {
      if (filters.company && node.company !== filters.company) return false;
      return true;
    }),
    links: rawGraphData.links.filter((link: any) => {
      // Filter links based on filtered nodes
      const sourceNode = rawGraphData.nodes.find((n: any) => n.id === link.source);
      const targetNode = rawGraphData.nodes.find((n: any) => n.id === link.target);
      
      if (filters.company) {
        if (sourceNode?.company !== filters.company && targetNode?.company !== filters.company) {
          return false;
        }
      }
      
      if (filters.relationshipType && link.type !== filters.relationshipType) {
        return false;
      }
      
      return true;
    })
  } : undefined;

  // Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const width = container.clientWidth;
        // In fullscreen, use full viewport height minus some padding
        // Otherwise use a reasonable height based on viewport
        const height = isFullscreen 
          ? window.innerHeight - 100 
          : Math.min(Math.max(window.innerHeight * 0.6, 600), 800);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  // Auto-fit graph when data loads or dimensions change
  useEffect(() => {
    if (graphData && graphRef.current) {
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 50);
      }, 100);
    }
  }, [graphData, dimensions]);

  // Force canvas refresh when hover state changes
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.refresh();
    }
  }, [hoveredNode]);

  const handleNodeClick = useCallback((node: any) => {
    setLocation(`/contacts/${node.id}`);
  }, [setLocation]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const clearFilters = () => {
    setFilters({
      company: "",
      relationshipType: "",
      showFilters: filters.showFilters,
    });
  };

  const activeFilterCount = [filters.company, filters.relationshipType].filter(Boolean).length;

  // Get unique relationship types from graph data
  const relationshipTypes = rawGraphData ? Array.from(new Set(rawGraphData.links.map((link: any) => link.type))) : [];

  const graphContent = (
    <div 
      ref={containerRef} 
      className={`border rounded-lg overflow-hidden bg-background ${isFullscreen ? 'fixed inset-0 z-50 m-4' : ''}`}
    >
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={toggleFullscreen} variant="outline" size="sm">
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
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
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.company ? '#3b82f6' : '#a855f7';
          ctx.fill();
          
          // Draw label below node
          ctx.fillStyle = '#374151';
          ctx.fillText(label, node.x, node.y + nodeRadius + fontSize + 4);
        }}
        linkCanvasObject={(link: any, ctx, globalScale) => {
          const start = link.source;
          const end = link.target;
          
          // Determine if this link should be highlighted
          const isHighlighted = hoveredNode && (
            (typeof start === 'object' ? start.id : start) === hoveredNode.id ||
            (typeof end === 'object' ? end.id : end) === hoveredNode.id
          );
          
          // Draw the link line
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = isHighlighted ? '#3b82f6' : '#d1d5db';
          ctx.lineWidth = isHighlighted ? 3 : 2;
          ctx.stroke();
          
          // Only draw label if highlighted
          if (isHighlighted && link.label) {
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            
            // Calculate perpendicular offset for label
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const offsetDistance = 15;
            const offsetX = (-dy / length) * offsetDistance;
            const offsetY = (dx / length) * offsetDistance;
            
            const labelX = midX + offsetX;
            const labelY = midY + offsetY;
            
            // Draw label background
            const fontSize = 12 / globalScale;
            ctx.font = `bold ${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(link.label).width;
            const padding = 6;
            const bgWidth = textWidth + padding * 2;
            const bgHeight = fontSize + padding * 2;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            
            // Rounded rectangle for background
            const radius = 4;
            ctx.beginPath();
            ctx.moveTo(labelX - bgWidth/2 + radius, labelY - bgHeight/2);
            ctx.lineTo(labelX + bgWidth/2 - radius, labelY - bgHeight/2);
            ctx.quadraticCurveTo(labelX + bgWidth/2, labelY - bgHeight/2, labelX + bgWidth/2, labelY - bgHeight/2 + radius);
            ctx.lineTo(labelX + bgWidth/2, labelY + bgHeight/2 - radius);
            ctx.quadraticCurveTo(labelX + bgWidth/2, labelY + bgHeight/2, labelX + bgWidth/2 - radius, labelY + bgHeight/2);
            ctx.lineTo(labelX - bgWidth/2 + radius, labelY + bgHeight/2);
            ctx.quadraticCurveTo(labelX - bgWidth/2, labelY + bgHeight/2, labelX - bgWidth/2, labelY + bgHeight/2 - radius);
            ctx.lineTo(labelX - bgWidth/2, labelY - bgHeight/2 + radius);
            ctx.quadraticCurveTo(labelX - bgWidth/2, labelY - bgHeight/2, labelX - bgWidth/2 + radius, labelY - bgHeight/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Draw label text
            ctx.fillStyle = '#374151';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(link.label, labelX, labelY);
          }
        }}
        onNodeClick={handleNodeClick}
        onNodeHover={(node) => setHoveredNode(node)}
        cooldownTicks={100}
        d3VelocityDecay={0.3}
      />
      {graphData && graphData.links.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> Contacts are shown as nodes. Add relationships between contacts to see connections!
            </p>
          </div>
        </div>
      )}
    </div>
  );

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
          <Button 
            onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
            variant={filters.showFilters ? "default" : "outline"}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
          <Button onClick={() => setShowAddDialog(true)} variant="default">
            <Plus className="mr-2 h-4 w-4" />
            Add Relationship
          </Button>
          {!isFullscreen && (
            <>
              <Button onClick={toggleFullscreen} variant="outline">
                <Maximize2 className="mr-2 h-4 w-4" />
                Fullscreen
              </Button>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </>
          )}
        </div>
      </div>

      {filters.showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filter Network</CardTitle>
              {activeFilterCount > 0 && (
                <Button onClick={clearFilters} variant="ghost" size="sm">
                  <X className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
            <CardDescription>
              Focus on specific segments of your network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Company
                </label>
                <select
                  value={filters.company}
                  onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Companies</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Relationship Type
                </label>
                <select
                  value={filters.relationshipType}
                  onChange={(e) => setFilters(prev => ({ ...prev, relationshipType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Types</option>
                  {relationshipTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {filters.company && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    Company: {filters.company}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, company: "" }))}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.relationshipType && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    Type: {filters.relationshipType}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, relationshipType: "" }))}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isFullscreen && (
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
              graphContent
            )}
          </CardContent>
        </Card>
      )}

      {isFullscreen && graphContent}

      <AddRelationshipDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          refetch();
          setShowAddDialog(false);
        }}
      />
    </div>
  );
}
