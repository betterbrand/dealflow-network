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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import contextMenus from "cytoscape-context-menus";
import "cytoscape-context-menus/cytoscape-context-menus.css";
import { GraphMinimap } from "@/components/graph/GraphMinimap";

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
  const [graphMode, setGraphMode] = useState<GraphMode>("relationships");

  // Reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  // Query highlight state from URL params
  const [queryHighlight, setQueryHighlight] = useState<{
    nodeIds: string[];
    query: string;
    mode: string;
  } | null>(null);

  // Path highlighting state
  const [activePath, setActivePath] = useState<{
    sourceId: string;
    targetId: string;
    pathNodes: string[];
    pathEdges: string[];
  } | null>(null);
  const pathFlowIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Multi-select state
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  // Expand/collapse state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [collapsedNeighbors, setCollapsedNeighbors] = useState<Map<string, string[]>>(new Map());

  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // AI Query mutation for context menu
  const aiQueryMutation = trpc.contacts.aiQuery.useMutation();

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

  // Animation budget based on node count and accessibility preferences
  const animationBudget = useMemo(() => {
    // Reduced motion takes precedence
    if (prefersReducedMotion) return 'none';

    const elements = cytoscapeElements();
    const nodeCount = elements.filter((el: any) => !el.data.source).length;

    if (nodeCount > 200) return 'none';
    if (nodeCount > 100) return 'reduced';
    return 'full';
  }, [cytoscapeElements, prefersReducedMotion]);

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
        "transition-property": "background-opacity, border-width, width, height, box-shadow",
        "transition-duration": "200ms",
        "transition-timing-function": "cubic-bezier(0.4, 0.0, 0.2, 1)",
      },
    },
    {
      selector: "node:hover",
      style: {
        width: (ele: any) => ele.data('size') * 1.15,
        height: (ele: any) => ele.data('size') * 1.15,
        "box-shadow": (ele: any) => `0 0 20px ${ele.data('color')}99`,
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
    {
      selector: "node.selected",
      style: {
        "border-width": 5,
        "border-color": "#10b981", // emerald-500
        "border-opacity": 1,
        "background-opacity": 1,
        "box-shadow": "0 0 15px rgba(16, 185, 129, 0.6)",
      },
    },
  ];

  // Layout configuration based on mode
  const getLayout = useCallback(() => {
    const baseLayout = graphMode === "user-centric" ? {
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
    } : {
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

    // Apply animation budget
    if (animationBudget === 'none') {
      return { ...baseLayout, animate: false, animationDuration: 0 };
    } else if (animationBudget === 'reduced') {
      return { ...baseLayout, animationDuration: 300 };
    }

    return baseLayout;
  }, [graphMode, animationBudget]);

  // Path Finding Functions
  const findShortestPath = useCallback((sourceId: string, targetId: string) => {
    if (!cyRef.current) return null;

    const cy = cyRef.current;
    const sourceNode = cy.getElementById(sourceId);
    const targetNode = cy.getElementById(targetId);

    if (sourceNode.length === 0 || targetNode.length === 0) {
      console.warn('Source or target node not found');
      return null;
    }

    // Use Dijkstra's algorithm with edge type weighting
    const dijkstra = cy.elements().dijkstra({
      root: sourceNode,
      weight: (edge: any) => {
        const type = edge.data('edgeType');
        // Prefer direct contacts, then same company, then inferred
        if (type === 'direct_contact') return 1;
        if (type === 'same_company') return 2;
        return 3;
      },
      directed: false,
    });

    const path = dijkstra.pathTo(targetNode);

    if (!path || path.length === 0) {
      console.warn('No path found between nodes');
      return null;
    }

    return path;
  }, []);

  const animateEdgeFlow = useCallback((edge: any, edgeId: string) => {
    // Clear existing interval if any
    const existingInterval = pathFlowIntervals.current.get(edgeId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    let offset = 0;
    const interval = setInterval(() => {
      offset += 1;
      if (edge.removed()) {
        clearInterval(interval);
        pathFlowIntervals.current.delete(edgeId);
        return;
      }
      edge.style('line-dash-offset', offset);
      if (offset > 15) offset = 0;
    }, 50);

    pathFlowIntervals.current.set(edgeId, interval);
  }, []);

  const highlightPath = useCallback((path: any) => {
    if (!cyRef.current || !path) return;

    const cy = cyRef.current;

    // Clear any existing path intervals
    pathFlowIntervals.current.forEach(interval => clearInterval(interval));
    pathFlowIntervals.current.clear();

    // Dim all elements
    cy.elements().animate({
      style: { opacity: 0.2 }
    }, { duration: 200, easing: 'ease-out' });

    const pathNodes: string[] = [];
    const pathEdges: string[] = [];

    // Sequential node highlighting (tells connection story)
    const nodes = path.nodes();
    nodes.forEach((node: any, index: number) => {
      pathNodes.push(node.id());

      setTimeout(() => {
        node.animate({
          style: {
            opacity: 1,
            'border-width': 4,
            'border-color': '#3B82F6', // blue-500
            'box-shadow': '0 0 20px rgba(59, 130, 246, 0.7)',
          }
        }, {
          duration: 300,
          easing: 'ease-out'
        });
      }, index * 150); // 150ms stagger
    });

    // Flowing dashed edges
    const edges = path.edges();
    edges.forEach((edge: any, index: number) => {
      pathEdges.push(edge.id());

      setTimeout(() => {
        edge.animate({
          style: {
            opacity: 1,
            width: 3,
            'line-color': '#3B82F6', // blue-500
            'line-style': 'dashed',
          }
        }, {
          duration: 300,
          easing: 'ease-out'
        });

        // Start flowing animation
        animateEdgeFlow(edge, edge.id());
      }, index * 150);
    });

    // Store path state
    const sourceId = nodes[0].id();
    const targetId = nodes[nodes.length - 1].id();
    setActivePath({
      sourceId,
      targetId,
      pathNodes,
      pathEdges,
    });

    // Fit viewport to path
    setTimeout(() => {
      cy.animate({
        fit: { eles: path, padding: 100 }
      }, {
        duration: 600,
        easing: 'ease-in-out'
      });
    }, nodes.length * 150 + 300);
  }, [animateEdgeFlow]);

  const clearPathHighlight = useCallback(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Clear flow intervals
    pathFlowIntervals.current.forEach(interval => clearInterval(interval));
    pathFlowIntervals.current.clear();

    // Reset all elements
    cy.elements().animate({
      style: {
        opacity: 1,
        'border-width': 2,
        'border-color': 'data(color)',
        'box-shadow': 'none',
        width: 1.5,
        'line-color': 'data(color)',
        'line-style': 'solid',
        'line-dash-offset': 0,
      }
    }, {
      duration: 300,
      easing: 'ease-out'
    });

    // Reset user node border
    cy.nodes('[isUser]').animate({
      style: { 'border-width': 4 }
    }, {
      duration: 300,
      easing: 'ease-out'
    });

    setActivePath(null);
  }, []);

  const getUserNodeId = useCallback(() => {
    if (!cyRef.current) return null;
    const cy = cyRef.current;
    const userNode = cy.nodes('[isUser]').first();
    return userNode.length > 0 ? userNode.id() : null;
  }, []);

  // Expand/Collapse neighborhood functions
  const collapseNeighborhood = useCallback((nodeId: string) => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const node = cy.getElementById(nodeId);

    if (node.length === 0) return;

    // Get direct neighbors (not including the node itself)
    const neighbors = node.neighborhood('node');
    const neighborIds = neighbors.map(n => n.id());

    // Hide neighbors with animation
    neighbors.forEach((neighbor: any, index: number) => {
      setTimeout(() => {
        neighbor.animate({
          style: { opacity: 0 }
        }, {
          duration: 200,
          complete: () => {
            neighbor.style('display', 'none');
          }
        });
      }, index * 20);
    });

    // Hide connecting edges
    node.connectedEdges().style('display', 'none');

    // Track collapsed neighbors
    setCollapsedNeighbors(prev => {
      const next = new Map(prev);
      next.set(nodeId, neighborIds);
      return next;
    });

    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const expandNeighborhood = useCallback((nodeId: string) => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const node = cy.getElementById(nodeId);

    if (node.length === 0) return;

    // Get collapsed neighbors for this node
    const neighborIds = collapsedNeighbors.get(nodeId) || [];

    if (neighborIds.length === 0) return;

    // Show neighbors with radial animation
    const nodePos = node.position();
    const angleStep = (2 * Math.PI) / neighborIds.length;

    neighborIds.forEach((neighborId, index) => {
      const neighbor = cy.getElementById(neighborId);
      if (neighbor.length === 0) return;

      // Calculate radial position
      const angle = index * angleStep;
      const distance = 150;

      // Show node
      neighbor.style('display', 'element');
      neighbor.style('opacity', 0);

      setTimeout(() => {
        neighbor.animate({
          style: { opacity: 1 }
        }, {
          duration: 400,
          easing: 'ease-out'
        });
      }, index * 30); // 30ms stagger
    });

    // Show connecting edges
    node.connectedEdges().style('display', 'element');

    // Update state
    setCollapsedNeighbors(prev => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });

    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, [collapsedNeighbors]);

  const toggleNeighborhood = useCallback((nodeId: string) => {
    if (collapsedNeighbors.has(nodeId)) {
      expandNeighborhood(nodeId);
    } else {
      collapseNeighborhood(nodeId);
    }
  }, [collapsedNeighbors, expandNeighborhood, collapseNeighborhood]);

  // Execute natural language query on current graph
  const executeGraphQuery = useCallback(async (query: string, targetContactId?: number) => {
    if (!cyRef.current) return;

    try {
      // Parse the query using AI
      const result = await aiQueryMutation.mutateAsync({ query });

      console.log('Query parsed:', result);

      // Handle different intents
      if (result.parsed.intent === 'introduction_path') {
        // Find path to the target contact
        const userNodeId = getUserNodeId();
        const targetNodeIdStr = String(targetContactId || result.parsed.introductionPath?.to);

        if (userNodeId && targetNodeIdStr) {
          clearPathHighlight();
          const path = findShortestPath(userNodeId, targetNodeIdStr);
          if (path) {
            highlightPath(path);
          }
        }
      } else if (result.parsed.intent === 'filter' || result.parsed.intent === 'find') {
        // Highlight matching contacts
        const matchedNodeIds = result.results.map((contact: any) => String(contact.id));

        if (matchedNodeIds.length > 0) {
          setQueryHighlight({
            nodeIds: matchedNodeIds,
            query: query,
            mode: result.parsed.intent,
          });

          // Update URL for shareability
          const params = new URLSearchParams({
            query: query,
            mode: result.parsed.intent,
            highlight: matchedNodeIds.join(','),
          });
          window.history.pushState({}, '', `/graph?${params.toString()}`);
        }
      }
    } catch (error) {
      console.error('Failed to execute graph query:', error);
    }
  }, [aiQueryMutation, getUserNodeId, clearPathHighlight, findShortestPath, highlightPath]);

  // Initialize Cytoscape instance
  const handleCyInit = useCallback(
    (cy: cytoscape.Core) => {
      cyRef.current = cy;

      (cy as any).contextMenus({
        menuItems: [
          {
            id: "find-path",
            content: "Find path to this person",
            selector: "node[!isUser]",
            onClickFunction: (event: any) => {
              const userNodeId = getUserNodeId();
              const targetNodeId = event.target.id();

              if (!userNodeId) {
                console.warn('User node not found');
                return;
              }

              clearPathHighlight();
              const path = findShortestPath(userNodeId, targetNodeId);

              if (path) {
                highlightPath(path);

                // Show degree of separation
                const hops = path.nodes().length - 1;
                console.log(`${hops} degree${hops !== 1 ? 's' : ''} of separation to ${event.target.data('name')}`);
              } else {
                console.log(`No path found to ${event.target.data('name')}`);
              }
            },
          },
          {
            id: "who-can-introduce",
            content: "Who can introduce me?",
            selector: "node[!isUser]",
            onClickFunction: (event: any) => {
              const name = event.target.data('name');
              const contactId = parseInt(event.target.id());
              const query = `Who can introduce me to ${name}?`;
              console.log(`Executing query: ${query}`);
              executeGraphQuery(query, contactId);
            },
          },
          {
            id: "show-connections",
            content: "Show their connections",
            selector: "node",
            onClickFunction: (event: any) => {
              const name = event.target.data('name');
              const query = `Show everyone connected to ${name}`;
              console.log(`Executing query: ${query}`);
              executeGraphQuery(query);
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
            id: "collapse-neighborhood",
            content: "Collapse neighborhood",
            selector: "node",
            onClickFunction: (event: any) => {
              const nodeId = event.target.id();
              collapseNeighborhood(nodeId);
            },
          },
          {
            id: "expand-neighborhood",
            content: "Expand neighborhood",
            selector: "node",
            onClickFunction: (event: any) => {
              const nodeId = event.target.id();
              expandNeighborhood(nodeId);
            },
          },
          {
            id: "separator2",
            content: "---",
            selector: "node",
            disabled: true,
            onClickFunction: () => {},
          },
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
            id: "clear-highlights",
            content: "Clear all highlighting",
            selector: "node",
            onClickFunction: () => {
              clearPathHighlight();
              setQueryHighlight(null);

              // Reset URL
              window.history.pushState({}, '', '/graph');

              // Reset all node styles
              if (cyRef.current) {
                cyRef.current.nodes().animate({
                  style: { opacity: 1 }
                }, { duration: 300 });
              }
            },
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

      // Multi-select click handlers
      cy.on("click", "node", (event) => {
        const nodeId = event.target.id();
        const originalEvent = event.originalEvent as MouseEvent;
        const isMeta = originalEvent?.metaKey || originalEvent?.ctrlKey;
        const isShift = originalEvent?.shiftKey;

        if (isMeta) {
          // Cmd/Ctrl+Click: Toggle selection
          setSelectedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
              next.delete(nodeId);
              event.target.removeClass('selected');
            } else {
              next.add(nodeId);
              event.target.addClass('selected');
            }
            return next;
          });
        } else if (isShift && selectedNodes.size > 0) {
          // Shift+Click: Range selection (path between last selected and clicked)
          const lastSelected = Array.from(selectedNodes)[selectedNodes.size - 1];
          const path = findShortestPath(lastSelected, nodeId);

          if (path) {
            const pathNodeIds = path.nodes().map((n: any) => n.id());
            setSelectedNodes(prev => {
              const next = new Set(prev);
              pathNodeIds.forEach(id => next.add(id));
              return next;
            });

            // Apply selected class to path nodes
            path.nodes().forEach((n: any) => n.addClass('selected'));
          }
        } else if (!isMeta && !isShift) {
          // Regular click: Clear selection and select only this node
          setSelectedNodes(prev => {
            // Clear previous selection classes
            cy.nodes('.selected').removeClass('selected');

            const next = new Set<string>();
            next.add(nodeId);
            event.target.addClass('selected');
            return next;
          });
        }
      });

      // Click on background: Clear selection
      cy.on("click", (event) => {
        if (event.target === cy) {
          setSelectedNodes(new Set());
          cy.nodes('.selected').removeClass('selected');
        }
      });

      // Enhanced hover effects for connected elements
      cy.on("mouseover", "node", (event) => {
        const node = event.target;

        // Highlight connected edges
        node.connectedEdges().animate({
          style: { width: 3, 'line-opacity': 1 }
        }, { duration: 150, easing: 'ease-out' });

        // Highlight connected nodes with subtle border
        node.neighborhood('node').animate({
          style: { 'border-width': 3, 'border-opacity': 1 }
        }, { duration: 150, easing: 'ease-out' });
      });

      cy.on("mouseout", "node", (event) => {
        const node = event.target;

        // Reset connected edges
        node.connectedEdges().animate({
          style: { width: 1.5, 'line-opacity': 0.6 }
        }, { duration: 150, easing: 'ease-out' });

        // Reset connected nodes (unless they're the user or selected)
        node.neighborhood('node').forEach((neighbor: any) => {
          if (!neighbor.data('isUser') && !neighbor.hasClass('selected')) {
            neighbor.animate({
              style: { 'border-width': 2 }
            }, { duration: 150, easing: 'ease-out' });
          }
        });
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
            <div class="text-muted-foreground text-xs mt-1">Center of your network</div>
          `;
        } else {
          tooltip.innerHTML = `
            <div class="font-semibold text-gray-900 dark:text-white">${data.name}</div>
            ${data.company ? `<div class="text-muted-foreground">${data.company}</div>` : ""}
            ${data.role ? `<div class="text-muted-foreground text-xs">${data.role}</div>` : ""}
            <div class="text-muted-foreground text-xs mt-1">
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

      // Level of Detail (LOD) system
      const updateLOD = () => {
        const zoom = cy.zoom();

        if (zoom < 0.5) {
          // Very zoomed out: dots only, no labels
          cy.nodes().forEach((node: any) => {
            node.style({
              label: '',
              width: node.data('size') * 0.5,
              height: node.data('size') * 0.5,
            });
          });
          cy.edges().style({ width: 0.5, label: '' });
        } else if (zoom < 1.0) {
          // Medium zoom: labels for important nodes only (large size or user)
          cy.nodes().forEach((node: any) => {
            const isImportant = node.data('size') > 50 || node.data('isUser');
            node.style({
              label: isImportant ? node.data('label') : '',
              width: node.data('size') * 0.75,
              height: node.data('size') * 0.75,
            });
          });
          cy.edges().style({ width: 1, label: '' });
        } else {
          // Zoomed in: full details
          cy.nodes().style({
            label: 'data(label)',
            width: 'data(size)',
            height: 'data(size)',
          });
          cy.edges().style({ width: 1.5, label: 'data(label)' });
        }
      };

      cy.on('zoom', updateLOD);
      updateLOD(); // Initial LOD state

      cy.ready(() => {
        applyFilters();

        // Staggered entrance animation (only if animation budget allows)
        if (graphMode === "user-centric" && animationBudget !== 'none') {
          const nodes = cy.nodes();
          const edges = cy.edges();

          // Hide all initially
          nodes.style({ opacity: 0, 'border-width': 0 });
          edges.style({ opacity: 0 });

          // Sort by degree (user → degree 1 → degree 2 → degree 3)
          const sorted = nodes.sort((a: any, b: any) => {
            const degreeA = a.data('degree') || 0;
            const degreeB = b.data('degree') || 0;
            return degreeA - degreeB;
          });

          // Adjust timing based on budget
          const staggerDelay = animationBudget === 'reduced' ? 15 : 30;
          const animDuration = animationBudget === 'reduced' ? 200 : 400;

          // Stagger appearance
          sorted.forEach((node: any, index: number) => {
            setTimeout(() => {
              const isUser = node.data('isUser');
              node.animate({
                style: {
                  opacity: 1,
                  'border-width': isUser ? 4 : 2,
                }
              }, {
                duration: animDuration,
                easing: 'ease-out'
              });
            }, index * staggerDelay);
          });

          // Edges appear after nodes (with fade in)
          setTimeout(() => {
            edges.animate({
              style: { opacity: 0.6 }
            }, {
              duration: animationBudget === 'reduced' ? 300 : 600,
              easing: 'ease-out'
            });
          }, sorted.length * staggerDelay + 200);
        } else if (animationBudget === 'none') {
          // No animation: show everything immediately
          const nodes = cy.nodes();
          const edges = cy.edges();
          nodes.style({ opacity: 1, 'border-width': (ele: any) => ele.data('isUser') ? 4 : 2 });
          edges.style({ opacity: 0.6 });
        }
      });
    },
    [setLocation, applyFilters, findShortestPath, highlightPath, clearPathHighlight, getUserNodeId, executeGraphQuery, collapseNeighborhood, expandNeighborhood, graphMode, animationBudget]
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
              'border-color': '#1E6FD9', // sapphire blue-600
              'box-shadow': '0 0 30px rgba(30, 111, 217, 0.7)'
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

  // Cleanup path flow intervals on unmount
  useEffect(() => {
    return () => {
      pathFlowIntervals.current.forEach(interval => clearInterval(interval));
      pathFlowIntervals.current.clear();
    };
  }, []);

  // Keyboard shortcuts for multi-select
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+A / Ctrl+A: Select all visible nodes
      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        event.preventDefault();

        if (!cyRef.current) return;

        const cy = cyRef.current;
        const visibleNodes = cy.nodes(':visible');
        const nodeIds = visibleNodes.map(n => n.id());

        setSelectedNodes(new Set(nodeIds));
        visibleNodes.addClass('selected');
      }

      // Escape: Clear selection
      if (event.key === 'Escape') {
        if (!cyRef.current) return;

        setSelectedNodes(new Set());
        cyRef.current.nodes('.selected').removeClass('selected');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

            {selectedNodes.size > 0 && (
              <Badge variant="default" className="bg-emerald-500">
                {selectedNodes.size} selected
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
            {/* Premium loading state */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    {/* Center node with pulse */}
                    <div
                      className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full bg-indigo-500"
                      style={{
                        animation: 'pulse-ring 1.5s ease-out infinite'
                      }}
                    />

                    {/* Orbiting nodes */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full bg-blue-400"
                        style={{
                          transformOrigin: '12px 12px',
                          transform: `rotate(${i * 72}deg) translateX(30px)`,
                          animation: `orbit 3s linear infinite ${i * 0.2}s`
                        }}
                      />
                    ))}
                  </div>

                  <p className="text-sm text-muted-foreground animate-fade-in">
                    Building your network graph...
                  </p>
                </div>

                <style>{`
                  @keyframes pulse-ring {
                    0% {
                      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
                    }
                    100% {
                      box-shadow: 0 0 0 20px rgba(99, 102, 241, 0);
                    }
                  }

                  @keyframes orbit {
                    from {
                      transform: rotate(0deg) translateX(30px);
                    }
                    to {
                      transform: rotate(360deg) translateX(30px);
                    }
                  }

                  @keyframes fade-in {
                    from {
                      opacity: 0;
                    }
                    to {
                      opacity: 1;
                    }
                  }

                  .animate-fade-in {
                    animation: fade-in 0.3s ease-out 0.2s both;
                  }
                `}</style>
              </div>
            )}

            {/* Minimap */}
            {!isLoading && elements.length > 0 && (
              <GraphMinimap cy={cyRef.current} />
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
