import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Filter, Maximize2, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
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
    name: string;
    company?: string;
    role?: string;
    connections: number;
    color: string;
    size: number;
  };
}

interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    relationshipType?: string;
  };
}

export default function Graph() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedRelationType, setSelectedRelationType] = useState<string>("all");
  
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const { data: graphData, isLoading } = trpc.contacts.getGraph.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: companiesList } = trpc.companies.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Generate company colors
  const companyColors = useRef<Map<string, string>>(new Map());
  const getCompanyColor = useCallback((company: string) => {
    if (!companyColors.current.has(company)) {
      const hue = (companyColors.current.size * 137.5) % 360;
      companyColors.current.set(company, `hsl(${hue}, 70%, 60%)`);
    }
    return companyColors.current.get(company)!;
  }, []);

  // Transform data for Cytoscape
  const cytoscapeElements = useCallback(() => {
    if (!graphData) return [];

    const nodes: GraphNode[] = graphData.nodes.map((node) => {
      const company = node.company || "Unknown";
      const connections = graphData.links.filter(
        (link: any) => link.source === node.id || link.target === node.id
      ).length;

      return {
        data: {
          id: node.id.toString(),
          label: node.name,
          name: node.name,
          company,
          role: node.role,
          connections,
          color: getCompanyColor(company),
          size: Math.max(30, Math.min(80, 30 + connections * 5)),
        },
      };
    });

    const edges: GraphEdge[] = graphData.links.map((link: any, idx: number) => ({
      data: {
        id: `edge-${idx}`,
        source: link.source.toString(),
        target: link.target.toString(),
        label: link.relationshipType || "",
        relationshipType: link.relationshipType,
      },
    }));

    return [...nodes, ...edges];
  }, [graphData, getCompanyColor]);

  // Apply filters
  const applyFilters = useCallback(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    
    // Show all elements first
    cy.elements().style('display', 'element');

    // Apply company filter
    if (selectedCompany !== "all") {
      cy.nodes().forEach((node) => {
        if (node.data('company') !== selectedCompany) {
          node.style('display', 'none');
          // Hide connected edges
          node.connectedEdges().style('display', 'none');
        }
      });
    }

    // Apply relationship type filter
    if (selectedRelationType !== "all") {
      cy.edges().forEach((edge) => {
        if (edge.data('relationshipType') !== selectedRelationType) {
          edge.style('display', 'none');
        }
      });
    }
  }, [selectedCompany, selectedRelationType]);

  // Get unique relationship types
  const relationshipTypes = useCallback(() => {
    if (!graphData) return [];
    const types = new Set<string>();
    graphData.links.forEach((link: any) => {
      if (link.relationshipType) types.add(link.relationshipType);
    });
    return Array.from(types);
  }, [graphData]);

  // Clear filters
  const clearFilters = () => {
    setSelectedCompany("all");
    setSelectedRelationType("all");
  };

  const activeFilterCount =
    (selectedCompany !== "all" ? 1 : 0) +
    (selectedRelationType !== "all" ? 1 : 0);

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

  // Layout configuration - fCoSE (fast Compound Spring Embedder)
  const layout = {
    name: "fcose",
    // Quality vs Speed
    quality: "default", // 'draft', 'default' or 'proof'
    // Use random initial positions for nodes
    randomize: true,
    // Whether to animate the layout
    animate: true,
    // Duration of animation in ms
    animationDuration: 1000,
    // Easing of animation
    animationEasing: undefined,
    // Fit the viewport to the repositioned nodes
    fit: true,
    // Padding around the simulation
    padding: 30,
    // Whether to include labels in node dimensions
    nodeDimensionsIncludeLabels: true,
    // Whether to prevent node overlap
    nodeRepulsion: 4500,
    // Ideal edge length
    idealEdgeLength: 50,
    // Divisor to compute edge forces
    edgeElasticity: 0.45,
    // Nesting factor (multiplier) to compute ideal edge length for nested edges
    nestingFactor: 0.1,
    // Gravity force (constant)
    gravity: 0.25,
    // Maximum number of iterations
    numIter: 2500,
    // For enabling tiling
    tile: true,
    // Represents the amount of the vertical space to put between the zero degree members during the tiling operation
    tilingPaddingVertical: 10,
    // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation
    tilingPaddingHorizontal: 10,
    // Gravity range (constant) for compounds
    gravityRangeCompound: 1.5,
    // Gravity force (constant) for compounds
    gravityCompound: 1.0,
    // Gravity range (constant)
    gravityRange: 3.8,
  };

  // Initialize Cytoscape instance
  const handleCyInit = useCallback(
    (cy: cytoscape.Core) => {
      cyRef.current = cy;

      // Context menus
      (cy as any).contextMenus({
        menuItems: [
          {
            id: "view-profile",
            content: "View Profile",
            selector: "node",
            onClickFunction: (event: any) => {
              const nodeId = event.target.id();
              setLocation(`/contacts/${nodeId}`);
            },
          },
          {
            id: "add-relationship",
            content: "Add Relationship",
            selector: "node",
            onClickFunction: (event: any) => {
              // TODO: Open relationship dialog
              console.log("Add relationship for", event.target.data("name"));
            },
          },
          {
            id: "separator1",
            content: "---",
            selector: "node",
            disabled: true,
            onClickFunction: () => {}, // Required even for disabled items
          },
          {
            id: "hide-node",
            content: "Hide Contact",
            selector: "node",
            onClickFunction: (event: any) => {
              event.target.style("display", "none");
            },
          },
        ],
      });

         // Hover tooltips (native implementation)
      cy.on("mouseover", "node", (event) => {
        const node = event.target;
        const data = node.data();

        // Remove existing tooltip
        if (tooltipRef.current) {
          tooltipRef.current.remove();
          tooltipRef.current = null;
        }

        // Create tooltip
        const tooltip = document.createElement("div");
        tooltip.className =
          "absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm pointer-events-none";
        tooltip.innerHTML = `
          <div class="font-semibold text-gray-900 dark:text-white">${data.name}</div>
          ${data.company ? `<div class="text-gray-600 dark:text-gray-400">${data.company}</div>` : ""}
          ${data.role ? `<div class="text-gray-500 dark:text-gray-500 text-xs">${data.role}</div>` : ""}
          <div class="text-gray-500 dark:text-gray-500 text-xs mt-1">${data.connections} connections</div>
        `;

        // Add to container
        const container = cy.container();
        if (container) {
          container.appendChild(tooltip);
          tooltipRef.current = tooltip;

          // Position tooltip function
          const updateTooltipPosition = () => {
            const renderedPosition = node.renderedPosition();
            const zoom = cy.zoom();
            const pan = cy.pan();
            
            // Calculate position (above the node)
            const x = renderedPosition.x;
            const y = renderedPosition.y - (data.size / 2) * zoom - 10;
            
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
            tooltip.style.transform = "translate(-50%, -100%)";
          };

          // Initial position
          updateTooltipPosition();

          // Update position on viewport changes
          cy.on("pan zoom resize", updateTooltipPosition);

          // Cleanup on mouseout
          node.once("mouseout", () => {
            cy.off("pan zoom resize", updateTooltipPosition);
            if (tooltipRef.current) {
              tooltipRef.current.remove();
              tooltipRef.current = null;
            }
          });
        }
      });

      // Apply filters after layout
      cy.ready(() => {
        applyFilters();
      });
    },
    [setLocation, applyFilters]
  );

  // Reapply filters when they change
  useEffect(() => {
    applyFilters();
  }, [selectedCompany, selectedRelationType, applyFilters]);

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
          <p className="text-muted-foreground">Loading your network...</p>
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
              Please sign in to view your knowledge graph.
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
          <div>
            <h1 className="text-3xl font-bold">Knowledge Graph</h1>
            <p className="text-muted-foreground">
              Visualize your network connections
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
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

        {/* Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">
                    Company
                  </label>
                  <Select
                    value={selectedCompany}
                    onValueChange={setSelectedCompany}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {companiesList?.map((company) => (
                        <SelectItem key={company.id} value={company.name}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">
                    Relationship Type
                  </label>
                  <Select
                    value={selectedRelationType}
                    onValueChange={setSelectedRelationType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {relationshipTypes().map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Active filters */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedCompany !== "all" && (
                    <Badge variant="secondary">
                      Company: {selectedCompany}
                      <button
                        className="ml-2"
                        onClick={() => setSelectedCompany("all")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {selectedRelationType !== "all" && (
                    <Badge variant="secondary">
                      Type: {selectedRelationType}
                      <button
                        className="ml-2"
                        onClick={() => setSelectedRelationType("all")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
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
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      No connections in your network yet
                    </p>
                    <Button onClick={() => setLocation("/contacts")}>
                      Add Contacts
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
