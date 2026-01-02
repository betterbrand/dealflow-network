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
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Filter, Maximize2, Minimize2, X, Search, Network, Users, Sparkles } from "lucide-react";
import { AgentPanel } from "@/components/agent";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import contextMenus from "cytoscape-context-menus";
import "cytoscape-context-menus/cytoscape-context-menus.css";

// Register Cytoscape extensions
cytoscape.use(fcose);
cytoscape.use(contextMenus);

type GraphMode = "user-centric" | "relationships";

// Colors for different degrees
const DEGREE_COLORS = {
  0: "#6366f1", // User - Indigo
  1: "#3b82f6", // Direct contacts - Blue
  2: "#10b981", // 2nd degree - Emerald
  3: "#f59e0b", // 3rd degree - Amber
};

// Edge type colors
const EDGE_TYPE_COLORS = {
  direct_contact: "#6366f1",
  people_also_viewed: "#10b981",
  same_company: "#f59e0b",
  same_school: "#8b5cf6",
  shared_skills: "#ec4899",
};

export default function Graph() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedRelationType, setSelectedRelationType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [graphMode, setGraphMode] = useState<GraphMode>("user-centric");

  // Query highlight state from URL params
  const [queryHighlight, setQueryHighlight] = useState<{
    nodeIds: string[];
    query: string;
    mode: string;
  } | null>(null);

  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Original graph query (relationships mode)
  const { data: relationshipsData, isLoading: isLoadingRelationships } = trpc.contacts.getGraph.useQuery(
    undefined,
    { enabled: !!user && graphMode === "relationships" }
  );

  // New user-centric graph query
  const { data: userCentricData, isLoading: isLoadingUserCentric } = trpc.contacts.getUserCentricGraph.useQuery(
    { maxDepth: 3, maxNodesPerDegree: 25 },
    { enabled: !!user && graphMode === "user-centric" }
  );

  const isLoading = graphMode === "user-centric" ? isLoadingUserCentric : isLoadingRelationships;

  const { data: companiesList } = trpc.companies.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Parse URL query parameters for query highlighting
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const highlightParam = params.get('highlight');
    const queryParam = params.get('query');
    const modeParam = params.get('mode');

    if (highlightParam) {
      const nodeIds = highlightParam.split(',').filter(Boolean);
      setQueryHighlight({
        nodeIds,
        query: queryParam || '',
        mode: modeParam || 'filter',
      });
    } else {
      setQueryHighlight(null);
    }
  }, [searchParams]);

  // Generate company colors for relationships mode
  const companyColors = useRef<Map<string, string>>(new Map());
  const getCompanyColor = useCallback((company: string) => {
    if (!companyColors.current.has(company)) {
      const hue = (companyColors.current.size * 137.5) % 360;
      companyColors.current.set(company, `hsl(${hue}, 70%, 60%)`);
    }
    return companyColors.current.get(company)!;
  }, []);

  // Transform user-centric data for Cytoscape
  const userCentricElements = useCallback(() => {
    if (!userCentricData) return [];

    const nodes = userCentricData.nodes.map((node) => {
      const degree = node.degree;
      const color = DEGREE_COLORS[degree as keyof typeof DEGREE_COLORS] || DEGREE_COLORS[3];

      // Size based on followers (log scale) or fixed for user
      const size = node.isUser
        ? 80
        : Math.max(35, Math.min(65, 35 + Math.log10((node.followers || 1) + 1) * 10));

      return {
        data: {
          id: String(node.id),
          label: node.name,
          name: node.name,
          company: node.company,
          role: node.role,
          degree,
          isUser: node.isUser || false,
          followers: node.followers || 0,
          connections: node.connections || 0,
          profilePictureUrl: node.profilePictureUrl,
          color,
          size,
        },
      };
    });

    const edges = userCentricData.edges.map((edge, idx) => ({
      data: {
        id: `edge-${idx}`,
        source: String(edge.source),
        target: String(edge.target),
        edgeType: edge.edgeType,
        strength: edge.strength,
        color: EDGE_TYPE_COLORS[edge.edgeType as keyof typeof EDGE_TYPE_COLORS] || "#94a3b8",
      },
    }));

    return [...nodes, ...edges];
  }, [userCentricData]);

  // Transform relationships data for Cytoscape (original mode)
  const relationshipsElements = useCallback(() => {
    if (!relationshipsData) return [];

    const nodes = relationshipsData.nodes.map((node) => {
      const company = node.company || "Unknown";
      const connections = relationshipsData.links.filter(
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
          degree: 1,
          isUser: false,
        },
      };
    });

    const edges = relationshipsData.links.map((link: any, idx: number) => ({
      data: {
        id: `edge-${idx}`,
        source: link.source.toString(),
        target: link.target.toString(),
        label: link.relationshipType || "",
        relationshipType: link.relationshipType,
        edgeType: "relationship",
        color: "#6366f1",
      },
    }));

    return [...nodes, ...edges];
  }, [relationshipsData, getCompanyColor]);

  const cytoscapeElements = graphMode === "user-centric" ? userCentricElements : relationshipsElements;

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (!cyRef.current || !query.trim()) {
      setSearchResults([]);
      if (cyRef.current) {
        cyRef.current.nodes().removeClass("highlighted dimmed");
        cyRef.current.edges().removeClass("highlighted dimmed");
      }
      return;
    }

    const cy = cyRef.current;
    const lowerQuery = query.toLowerCase();
    const matchingNodes: string[] = [];

    cy.nodes().forEach((node) => {
      const name = (node.data("name") || "").toLowerCase();
      const company = (node.data("company") || "").toLowerCase();
      const role = (node.data("role") || "").toLowerCase();

      if (name.includes(lowerQuery) || company.includes(lowerQuery) || role.includes(lowerQuery)) {
        matchingNodes.push(node.id());
      }
    });

    setSearchResults(matchingNodes);

    if (matchingNodes.length > 0) {
      cy.nodes().addClass("dimmed");
      cy.edges().addClass("dimmed");

      matchingNodes.forEach((nodeId) => {
        const node = cy.getElementById(nodeId);
        node.removeClass("dimmed").addClass("highlighted");
        node.connectedEdges().removeClass("dimmed").addClass("highlighted");
      });

      const highlightedNodes = cy.nodes(".highlighted");
      if (highlightedNodes.length > 0) {
        cy.fit(highlightedNodes, 100);
      }
    }
  }, []);

  const applyFilters = useCallback(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    cy.elements().style("display", "element");

    if (searchResults.length > 0) {
      cy.nodes().forEach((node) => {
        if (!searchResults.includes(node.id())) {
          node.style("display", "none");
          node.connectedEdges().style("display", "none");
        }
      });
      return;
    }

    if (selectedCompany !== "all") {
      cy.nodes().forEach((node) => {
        if (node.data("company") !== selectedCompany) {
          node.style("display", "none");
          node.connectedEdges().style("display", "none");
        }
      });
    }

    if (selectedRelationType !== "all") {
      cy.edges().forEach((edge) => {
        const edgeType = edge.data("edgeType") || edge.data("relationshipType");
        if (edgeType !== selectedRelationType) {
          edge.style("display", "none");
        }
      });
    }
  }, [selectedCompany, selectedRelationType, searchResults]);

  const relationshipTypes = useCallback(() => {
    if (graphMode === "user-centric" && userCentricData) {
      return Object.keys(userCentricData.stats.edgesByType);
    }
    if (graphMode === "relationships" && relationshipsData) {
      const types = new Set<string>();
      relationshipsData.links.forEach((link: any) => {
        if (link.relationshipType) types.add(link.relationshipType);
      });
      return Array.from(types);
    }
    return [];
  }, [graphMode, userCentricData, relationshipsData]);

  const clearFilters = () => {
    setSelectedCompany("all");
    setSelectedRelationType("all");
  };

  const activeFilterCount =
    (selectedCompany !== "all" ? 1 : 0) + (selectedRelationType !== "all" ? 1 : 0);

  // Cytoscape stylesheet
  const stylesheet: any[] = [
    {
      selector: "node",
      style: {
        "background-color": "data(color)",
        "background-opacity": 0.9,
        width: "data(size)",
        height: "data(size)",
        label: "data(label)",
        "text-valign": "bottom",
        "text-halign": "center",
        "text-margin-y": 8,
        "font-size": "11px",
        "font-weight": "500",
        color: "#1e293b",
        "text-background-color": "rgba(255, 255, 255, 0.9)",
        "text-background-opacity": 1,
        "text-background-padding": "4px",
        "text-background-shape": "roundrectangle",
        "border-width": 2,
        "border-color": "data(color)",
        "border-opacity": 0.3,
        "overlay-padding": "6px",
        "z-index": 10,
        "transition-property": "background-opacity, border-width, width, height",
        "transition-duration": "0.15s",
      },
    },
    {
      selector: "node[isUser]",
      style: {
        "border-width": 4,
        "border-opacity": 1,
        "font-weight": "700",
        "font-size": "13px",
      },
    },
    {
      selector: "node:active",
      style: {
        "border-width": 3,
        "background-opacity": 1,
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 4,
        "border-color": "#6366f1",
        "border-opacity": 1,
        "overlay-opacity": 0,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.5,
        "line-color": "data(color)",
        "line-opacity": 0.6,
        "target-arrow-color": "data(color)",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.8,
        "curve-style": "bezier",
        "font-size": "9px",
        color: "#64748b",
        "text-rotation": "autorotate",
        "text-margin-y": -8,
        "transition-property": "width, line-opacity",
        "transition-duration": "0.15s",
      },
    },
    {
      selector: "edge[edgeType = 'people_also_viewed']",
      style: {
        "line-style": "dashed",
      },
    },
    {
      selector: "edge[edgeType = 'same_company']",
      style: {
        "line-style": "dotted",
      },
    },
    {
      selector: "edge:hover",
      style: {
        width: 2.5,
        "line-opacity": 1,
      },
    },
    {
      selector: "edge:selected",
      style: {
        width: 3,
        "line-color": "#4f46e5",
        "line-opacity": 1,
        "target-arrow-color": "#4f46e5",
      },
    },
    {
      selector: "node.highlighted",
      style: {
        "border-width": 4,
        "border-color": "#6366f1",
        "border-opacity": 1,
        "background-opacity": 1,
      },
    },
    {
      selector: "node.dimmed",
      style: {
        opacity: 0.25,
      },
    },
    {
      selector: "edge.highlighted",
      style: {
        width: 3,
        "line-opacity": 1,
      },
    },
    {
      selector: "edge.dimmed",
      style: {
        opacity: 0.15,
      },
    },
  ];

  // Layout configuration based on mode
  const getLayout = useCallback(() => {
    if (graphMode === "user-centric") {
      return {
        name: "concentric",
        concentric: (node: any) => {
          if (node.data("isUser")) return 1000;
          return 1000 - (node.data("degree") || 1) * 100;
        },
        levelWidth: () => 2,
        minNodeSpacing: 60,
        animate: true,
        animationDuration: 800,
        fit: true,
        padding: 50,
      };
    }
    return {
      name: "fcose",
      quality: "default",
      randomize: true,
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 30,
      nodeDimensionsIncludeLabels: true,
      nodeRepulsion: 4500,
      idealEdgeLength: 50,
      edgeElasticity: 0.45,
      nestingFactor: 0.1,
      gravity: 0.25,
      numIter: 2500,
      tile: true,
    };
  }, [graphMode]);

  // Initialize Cytoscape instance
  const handleCyInit = useCallback(
    (cy: cytoscape.Core) => {
      cyRef.current = cy;

      (cy as any).contextMenus({
        menuItems: [
          {
            id: "view-profile",
            content: "View Profile",
            selector: "node[!isUser]",
            onClickFunction: (event: any) => {
              const nodeId = event.target.id();
              if (nodeId !== "user") {
                setLocation(`/contacts/${nodeId}`);
              }
            },
          },
          {
            id: "add-relationship",
            content: "Add Relationship",
            selector: "node[!isUser]",
            onClickFunction: (event: any) => {
              console.log("Add relationship for", event.target.data("name"));
            },
          },
          {
            id: "separator1",
            content: "---",
            selector: "node",
            disabled: true,
            onClickFunction: () => {},
          },
          {
            id: "hide-node",
            content: "Hide Contact",
            selector: "node[!isUser]",
            onClickFunction: (event: any) => {
              event.target.style("display", "none");
            },
          },
        ],
      });

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
          "absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm pointer-events-none";

        if (data.isUser) {
          tooltip.innerHTML = `
            <div class="font-semibold text-gray-900 dark:text-white">You</div>
            <div class="text-gray-500 dark:text-gray-500 text-xs mt-1">Center of your network</div>
          `;
        } else {
          tooltip.innerHTML = `
            <div class="font-semibold text-gray-900 dark:text-white">${data.name}</div>
            ${data.company ? `<div class="text-gray-600 dark:text-gray-400">${data.company}</div>` : ""}
            ${data.role ? `<div class="text-gray-500 dark:text-gray-500 text-xs">${data.role}</div>` : ""}
            <div class="text-gray-500 dark:text-gray-500 text-xs mt-1">
              ${data.followers ? `${data.followers.toLocaleString()} followers` : ""}
              ${data.followers && data.connections ? " · " : ""}
              ${data.connections ? `${data.connections} connections` : ""}
            </div>
            ${data.degree ? `<div class="text-xs mt-1 text-indigo-600">Degree ${data.degree}</div>` : ""}
          `;
        }

        const container = cy.container();
        if (container) {
          container.appendChild(tooltip);
          tooltipRef.current = tooltip;

          const updateTooltipPosition = () => {
            const renderedPosition = node.renderedPosition();
            const x = renderedPosition.x;
            const y = renderedPosition.y - (data.size / 2) * cy.zoom() - 10;

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

      cy.ready(() => {
        applyFilters();
      });
    },
    [setLocation, applyFilters]
  );

  useEffect(() => {
    applyFilters();
  }, [selectedCompany, selectedRelationType, applyFilters]);

  // Apply query highlighting with staggered animation
  useEffect(() => {
    if (!cyRef.current || !queryHighlight) return;

    const cy = cyRef.current;

    // Dim all nodes first
    cy.nodes().animate({
      style: { opacity: 0.3 }
    }, { duration: 300, easing: 'ease-out' });

    // Highlight matched nodes with stagger animation
    queryHighlight.nodeIds.forEach((nodeId, index) => {
      const node = cy.getElementById(nodeId);

      if (node.length > 0) {
        setTimeout(() => {
          node.animate({
            style: {
              opacity: 1,
              'border-width': 4,
              'border-color': '#F97316', // orange-500
              'box-shadow': '0 0 30px rgba(249, 115, 22, 0.6)'
            }
          }, {
            duration: 400,
            easing: 'ease-out'
          });
        }, index * 50); // 50ms stagger
      }
    });

    // Fit viewport to highlighted nodes
    const highlightedCollection = cy.collection();
    queryHighlight.nodeIds.forEach(id => {
      const node = cy.getElementById(id);
      if (node.length > 0) {
        highlightedCollection.merge(node);
      }
    });

    if (highlightedCollection.length > 0) {
      setTimeout(() => {
        cy.animate({
          fit: { eles: highlightedCollection, padding: 100 }
        }, {
          duration: 600,
          easing: 'ease-in-out'
        });
      }, queryHighlight.nodeIds.length * 50 + 400); // After all nodes are highlighted
    }
  }, [queryHighlight]);

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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
              Please sign in to view your network.
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
            <h1 className="text-3xl font-bold">Your network</h1>
            <p className="text-muted-foreground">
              {graphMode === "user-centric"
                ? "You at the center, expanding outward"
                : "Visualize connections and discover paths"}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Mode Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={graphMode === "user-centric" ? "default" : "ghost"}
                size="sm"
                onClick={() => setGraphMode("user-centric")}
                className="rounded-none"
              >
                <Users className="h-4 w-4 mr-2" />
                My Network
              </Button>
              <Button
                variant={graphMode === "relationships" ? "default" : "ghost"}
                size="sm"
                onClick={() => setGraphMode("relationships")}
                className="rounded-none"
              >
                <Network className="h-4 w-4 mr-2" />
                Relationships
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => handleSearch("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {searchResults.length > 0 && (
              <Badge variant="secondary">
                {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
              </Badge>
            )}

            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {/* Agent Panel */}
            <AgentPanel />

            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Company</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
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
                  <label className="text-sm font-medium mb-2 block">Edge Type</label>
                  <Select value={selectedRelationType} onValueChange={setSelectedRelationType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {relationshipTypes().map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Graph */}
        <Card className="relative">
          <CardContent className="p-0">
            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                  <span className="text-sm text-muted-foreground">Building your network graph...</span>
                </div>
              </div>
            )}

            {/* Legend */}
            {graphMode === "user-centric" && !isLoading && elements.length > 0 && (
              <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-40 text-xs">
                <h4 className="font-medium text-sm mb-2">Legend</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: DEGREE_COLORS[0] }} />
                    <span>You</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEGREE_COLORS[1] }} />
                    <span>Direct Contacts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEGREE_COLORS[2] }} />
                    <span>2nd Degree</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEGREE_COLORS[3] }} />
                    <span>3rd Degree</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-0.5" style={{ backgroundColor: EDGE_TYPE_COLORS.direct_contact }} />
                      <span>Direct</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-0.5"
                        style={{
                          backgroundColor: EDGE_TYPE_COLORS.people_also_viewed,
                          backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 2px, #10b981 2px, #10b981 4px)",
                        }}
                      />
                      <span>LinkedIn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-0.5"
                        style={{ backgroundColor: EDGE_TYPE_COLORS.same_company }}
                      />
                      <span>Same Company</span>
                    </div>
                  </div>
                </div>
                {userCentricData?.stats && (
                  <div className="border-t pt-2 mt-2 text-muted-foreground">
                    <div>{userCentricData.stats.totalNodes} nodes</div>
                    <div>{userCentricData.edges.length} connections</div>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                height: isFullscreen ? "100vh" : "calc(100vh - 300px)",
                minHeight: "600px",
              }}
            >
              {elements.length > 0 ? (
                <CytoscapeComponent
                  key={graphMode} // Force re-render on mode change
                  elements={elements}
                  stylesheet={stylesheet}
                  layout={getLayout()}
                  cy={handleCyInit}
                  style={{ width: "100%", height: "100%" }}
                  wheelSensitivity={0.2}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading your network...</p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground mb-4">
                          {graphMode === "user-centric"
                            ? "Add contacts with LinkedIn data to build your network"
                            : "No connections in your network yet"}
                        </p>
                        <Button onClick={() => setLocation("/contacts")}>Add Contacts</Button>
                      </>
                    )}
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
