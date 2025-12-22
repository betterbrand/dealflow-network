import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Maximize2, Minimize2, RefreshCw, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import contextMenus from "cytoscape-context-menus";
import "cytoscape-context-menus/cytoscape-context-menus.css";

// Register Cytoscape extensions
cytoscape.use(fcose);
cytoscape.use(contextMenus);

interface GraphNode {
  data: {
    id: string;
    label: string;
    type: "Person" | "Organization" | "EducationalOrganization" | "Activity";
    color: string;
    size: number;
    details?: Record<string, any>;
  };
}

interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    type: string;
  };
}

export default function SemanticGraph() {
  const { user, loading: authLoading } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [showEnrichForm, setShowEnrichForm] = useState(false);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const { data: allEntities, isLoading, refetch } = trpc.semanticGraph.getAllEntities.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  // Log query results when data changes
  useEffect(() => {
    if (allEntities) {
      console.log('[SemanticGraph] Query result:', allEntities);
    }
  }, [allEntities]);

  const { data: stats } = trpc.semanticGraph.stats.useQuery(
    undefined,
    { enabled: !!user }
  );

  const enrichMutation = trpc.contacts.enrichFromLinkedIn.useMutation({
    onSuccess: (data) => {
      console.log('[SemanticGraph] Import success:', data);
      toast.success("Profile imported successfully!");
      setLinkedinUrl("");
      setShowEnrichForm(false);
      console.log('[SemanticGraph] Calling refetch...');
      refetch();
    },
    onError: (error) => {
      console.error('[SemanticGraph] Import error:', error);
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleEnrich = () => {
    if (!linkedinUrl.trim()) {
      toast.error("Please enter a LinkedIn URL");
      return;
    }
    enrichMutation.mutate({ linkedinUrl });
  };

  // Transform RDF entities to Cytoscape format
  const cytoscapeElements = useCallback(() => {
    if (!allEntities?.results) return [];

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const processedIds = new Set<string>();

    // Process each entity
    for (const entity of allEntities.results) {
      const entityId = entity.id;
      if (!entityId || processedIds.has(entityId)) continue;

      // Determine entity type
      const typeField = entity["22-rdf-syntax-ns#type"] || entity.type;
      let entityType: "Person" | "Organization" | "EducationalOrganization" | "Activity" = "Person";
      let color = "#3b82f6"; // Default blue

      if (typeof typeField === "string") {
        if (typeField.includes("Person")) {
          entityType = "Person";
          color = "#3b82f6"; // Blue
        } else if (typeField.includes("Organization")) {
          entityType = "Organization";
          color = "#10b981"; // Green
        } else if (typeField.includes("Activity")) {
          entityType = "Activity";
          color = "#f59e0b"; // Orange
        }
      }

      // Create node
      const label = entity.name || entity.id.split(':')[1] || entityId;
      nodes.push({
        data: {
          id: entityId,
          label,
          type: entityType,
          color,
          size: entityType === "Person" ? 60 : 45,
          details: entity,
        },
      });

      processedIds.add(entityId);

      // Create edges from relationships
      if (entity.worksFor) {
        const worksForArray = Array.isArray(entity.worksFor) ? entity.worksFor : [entity.worksFor];
        worksForArray.forEach((orgId: string) => {
          edges.push({
            data: {
              id: `${entityId}-worksFor-${orgId}`,
              source: entityId,
              target: orgId,
              label: "works for",
              type: "worksFor",
            },
          });
        });
      }

      if (entity.alumniOf) {
        const alumniOfArray = Array.isArray(entity.alumniOf) ? entity.alumniOf : [entity.alumniOf];
        alumniOfArray.forEach((schoolId: string) => {
          edges.push({
            data: {
              id: `${entityId}-alumniOf-${schoolId}`,
              source: entityId,
              target: schoolId,
              label: "alumni of",
              type: "alumniOf",
            },
          });
        });
      }

      // Provenance edges
      if (entity["prov#generated"]) {
        edges.push({
          data: {
            id: `${entityId}-generated-${entity["prov#generated"]}`,
            source: entityId,
            target: entity["prov#generated"],
            label: "generated",
            type: "provenance",
          },
        });
      }
    }

    return [...nodes, ...edges];
  }, [allEntities]);

  // Cytoscape stylesheet
  const stylesheet: any[] = [
    {
      selector: "node",
      style: {
        "background-color": "data(color)",
        width: "data(size)",
        height: "data(size)",
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "12px",
        "font-weight": "bold",
        color: "#fff",
        "text-outline-width": 2,
        "text-outline-color": "data(color)",
        "overlay-padding": "6px",
        "z-index": 10,
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": "#000",
        "overlay-opacity": 0,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#94a3b8",
        "target-arrow-color": "#94a3b8",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(label)",
        "font-size": "10px",
        color: "#64748b",
        "text-rotation": "autorotate",
        "text-margin-y": -10,
      },
    },
    {
      selector: "edge:selected",
      style: {
        width: 3,
        "line-color": "#3b82f6",
        "target-arrow-color": "#3b82f6",
      },
    },
  ];

  // Layout configuration
  const layout = {
    name: "fcose",
    quality: "default",
    randomize: true,
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 30,
    nodeDimensionsIncludeLabels: true,
    nodeRepulsion: 4500,
    idealEdgeLength: 100,
    edgeElasticity: 0.45,
    gravity: 0.25,
    numIter: 2500,
  };

  // Initialize Cytoscape
  const handleCyInit = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy;

    // Hover tooltips
    cy.on("mouseover", "node", (event) => {
      const node = event.target;
      const data = node.data();

      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }

      const tooltip = document.createElement("div");
      tooltip.className =
        "absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm pointer-events-none max-w-xs";

      let tooltipContent = `<div class="font-semibold text-gray-900 dark:text-white">${data.label}</div>`;
      tooltipContent += `<div class="text-gray-600 dark:text-gray-400 text-xs mt-1">Type: ${data.type}</div>`;

      if (data.details) {
        if (data.details.jobTitle) {
          tooltipContent += `<div class="text-gray-500 dark:text-gray-500 text-xs">${data.details.jobTitle}</div>`;
        }
        if (data.details.startDate || data.details.endDate) {
          tooltipContent += `<div class="text-gray-500 dark:text-gray-500 text-xs">${data.details.startDate || ''} - ${data.details.endDate || 'Present'}</div>`;
        }
      }

      tooltip.innerHTML = tooltipContent;

      const container = cy.container();
      if (container) {
        container.appendChild(tooltip);
        tooltipRef.current = tooltip;

        const updateTooltipPosition = () => {
          const renderedPosition = node.renderedPosition();
          const zoom = cy.zoom();
          const x = renderedPosition.x;
          const y = renderedPosition.y - (data.size / 2) * zoom - 10;

          tooltip.style.left = `${x}px`;
          tooltip.style.top = `${y}px`;
          tooltip.style.transform = "translate(-50%, -100%)";
        };

        updateTooltipPosition();
        cy.on("pan zoom resize", updateTooltipPosition);

        node.once("mouseout", () => {
          cy.off("pan zoom resize", updateTooltipPosition);
          if (tooltipRef.current) {
            tooltipRef.current.remove();
            tooltipRef.current = null;
          }
        });
      }
    });
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading semantic graph...</p>
        </div>
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
              Please sign in to view the semantic knowledge graph.
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const elements = cytoscapeElements();

  return (
    <div className="min-h-screen bg-background" ref={containerRef}>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Semantic Knowledge Graph</h1>
            <p className="text-muted-foreground">
              RDF triple store visualization with SPARQL queries
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {stats && (
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {stats.tripleCount} triples
                </Badge>
                <Badge variant="secondary">
                  {stats.entityCount} entities
                </Badge>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEnrichForm(!showEnrichForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Import from LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Import Form */}
        {showEnrichForm && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="https://www.linkedin.com/in/username"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEnrich()}
                  disabled={enrichMutation.isPending}
                />
                <Button
                  onClick={handleEnrich}
                  disabled={enrichMutation.isPending}
                >
                  {enrichMutation.isPending ? "Importing..." : "Import"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Paste a LinkedIn profile URL to import and add to the knowledge graph
              </p>
            </CardContent>
          </Card>
        )}

        {/* Graph */}
        <Card>
          <CardContent className="p-0">
            <div
              style={{
                height: isFullscreen ? "100vh" : "calc(100vh - 300px)",
                minHeight: "600px",
              }}
            >
              {elements.length > 0 ? (
                <CytoscapeComponent
                  elements={elements}
                  stylesheet={stylesheet}
                  layout={layout}
                  cy={handleCyInit}
                  style={{ width: "100%", height: "100%" }}
                  wheelSensitivity={0.2}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <h3 className="text-lg font-semibold mb-2">
                      No entities in the semantic graph yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Click "Import from LinkedIn" above to add profiles to the knowledge graph
                    </p>
                    <Button
                      onClick={() => setShowEnrichForm(true)}
                      variant="default"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Import Your First Profile
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
