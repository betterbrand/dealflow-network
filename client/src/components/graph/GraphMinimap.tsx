import { useEffect, useRef } from "react";
import type cytoscape from "cytoscape";

interface GraphMinimapProps {
  cy: cytoscape.Core | null;
  width?: number;
  height?: number;
}

export function GraphMinimap({ cy, width = 200, height = 150 }: GraphMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!cy || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Get graph bounds
      const elements = cy.elements();
      if (elements.length === 0) return;

      const bb = elements.boundingBox();
      const scale = Math.min(width / bb.w, height / bb.h) * 0.9;
      const offsetX = (width - bb.w * scale) / 2;
      const offsetY = (height - bb.h * scale) / 2;

      // Draw nodes as dots
      cy.nodes(":visible").forEach((node) => {
        const pos = node.position();
        const x = (pos.x - bb.x1) * scale + offsetX;
        const y = (pos.y - bb.y1) * scale + offsetY;
        const color = node.data("color") || "#6366F1";

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw viewport rectangle
      const ext = cy.extent();
      const vpX = (ext.x1 - bb.x1) * scale + offsetX;
      const vpY = (ext.y1 - bb.y1) * scale + offsetY;
      const vpW = (ext.x2 - ext.x1) * scale;
      const vpH = (ext.y2 - ext.y1) * scale;

      ctx.strokeStyle = "#F97316"; // orange-500
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      ctx.strokeRect(vpX, vpY, vpW, vpH);

      // Semi-transparent fill for viewport
      ctx.fillStyle = "#F97316";
      ctx.globalAlpha = 0.1;
      ctx.fillRect(vpX, vpY, vpW, vpH);
    };

    // Render on pan/zoom
    cy.on("pan zoom viewport", render);
    render();

    return () => {
      cy.off("pan zoom viewport", render);
    };
  }, [cy, width, height]);

  // Click/drag to pan
  useEffect(() => {
    if (!cy || !canvasRef.current) return;

    const canvas = canvasRef.current;
    let isDragging = false;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      panToPosition(e);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      panToPosition(e);
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const panToPosition = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert minimap coords to graph coords
      const bb = cy.elements().boundingBox();
      const scale = Math.min(width / bb.w, height / bb.h) * 0.9;
      const offsetX = (width - bb.w * scale) / 2;
      const offsetY = (height - bb.h * scale) / 2;

      const graphX = (x - offsetX) / scale + bb.x1;
      const graphY = (y - offsetY) / scale + bb.y1;

      // Pan to the clicked position
      const currentPan = cy.pan();
      const currentZoom = cy.zoom();
      const dx = (graphX - (currentPan.x + cy.width() / 2 / currentZoom));
      const dy = (graphY - (currentPan.y + cy.height() / 2 / currentZoom));

      cy.animate({
        pan: {
          x: currentPan.x - dx * currentZoom,
          y: currentPan.y - dy * currentZoom,
        },
      }, {
        duration: 200,
      });
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [cy, width, height]);

  if (!cy) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-700 z-40">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="cursor-pointer"
        style={{ display: "block" }}
      />
    </div>
  );
}
