import React, { useRef, useState, useEffect } from "react";
import { cn } from "../../utils/helpers";
import { ManipulativeItem, Position } from "../../types";

interface WorkspaceProps {
  items: ManipulativeItem[];
  onItemUpdate: (id: string, updates: Partial<ManipulativeItem>) => void;
  onItemDelete: (id: string) => void;
  onItemAdd: (item: ManipulativeItem) => void;
  onSelectionChange?: (ids: string[]) => void;
  selectedIds?: string[];
  isDrawing?: boolean;
  clearTrigger?: number;
  zoom?: number;
  pan?: Position;
  contentBounds?: { maxX: number; maxY: number };
  children?: React.ReactNode;
}

export default function Workspace({
  items,
  onItemUpdate,
  onItemDelete,
  onItemAdd,
  onSelectionChange,
  selectedIds = [],
  isDrawing,
  clearTrigger,
  zoom = 1,
  pan = { x: 0, y: 0 },
  contentBounds,
  children,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scrollbars
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const [contentSize, setContentSize] = useState({ w: 0, h: 0 });

  // Drawing
  const isPainting = useRef(false);

  // Marquee
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const marqueeStart = useRef<Position | null>(null);
  const isMarquee = useRef(false);

  // ── clear canvas ──
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current)
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [clearTrigger]);

  // ── resize canvas ──
  useEffect(() => {
    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const c = canvasRef.current;
      if (rect && c) {
        c.width = rect.width;
        c.height = rect.height;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Calculate content size from items + mats ──
  useEffect(() => {
    if (!contentBounds) {
      setContentSize({ w: 2000, h: 2000 });
      return;
    }
    const padding = 200;
    setContentSize({
      w: (contentBounds.maxX + padding) * zoom,
      h: (contentBounds.maxY + padding) * zoom,
    });
  }, [contentBounds, zoom]);

  // Workspace coordinates (accounting for zoom/pan)
  const toWorkspace = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleHorizontalScroll = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.offsetWidth - 16; // Subtract space for vertical scrollbar
    const trackRect = (
      e.currentTarget as HTMLDivElement
    ).getBoundingClientRect();
    const clickX = e.clientX - trackRect.left;
    const ratio = Math.max(0, Math.min(1, clickX / trackRect.width));
    const maxScrollX = Math.max(
      1,
      contentSize.w - containerRef.current.offsetWidth,
    );
    setScrollPos((prev) => ({ ...prev, x: ratio * maxScrollX }));
  };

  const handleVerticalScroll = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const containerH = containerRef.current.offsetHeight - 12; // Subtract space for horizontal scrollbar
    const trackRect = (
      e.currentTarget as HTMLDivElement
    ).getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;
    const ratio = Math.max(0, Math.min(1, clickY / trackRect.height));
    const maxScrollY = Math.max(
      1,
      contentSize.h - containerRef.current.offsetHeight,
    );
    setScrollPos((prev) => ({ ...prev, y: ratio * maxScrollY }));
  };

  const containerW = containerRef.current?.offsetWidth || 1000;
  const containerH = containerRef.current?.offsetHeight || 1000;

  // Make sure we don't divide by zero
  const maxScrollX = Math.max(1, contentSize.w - containerW);
  const maxScrollY = Math.max(1, contentSize.h - containerH);

  // Clamp scroll position
  const clampedScrollX = Math.max(0, Math.min(scrollPos.x, maxScrollX));
  const clampedScrollY = Math.max(0, Math.min(scrollPos.y, maxScrollY));

  // Scrollbar thumb sizes and positions
  const hScrollRatio = Math.max(
    0.05,
    containerW / (contentSize.w || containerW),
  );
  const vScrollRatio = Math.max(
    0.05,
    containerH / (contentSize.h || containerH),
  );
  const hScrollThumbW = Math.max(30, containerW * hScrollRatio - 4);
  const vScrollThumbH = Math.max(30, containerH * vScrollRatio - 4);
  const hScrollX =
    (clampedScrollX / maxScrollX) * (containerW - hScrollThumbW - 4);
  const vScrollY =
    (clampedScrollY / maxScrollY) * (containerH - vScrollThumbH - 4);

  const onPointerDown = (e: React.PointerEvent) => {
    // If the user clicked on a tile, let the tile handle it
    if ((e.target as HTMLElement).closest(".manipulative-item")) return;

    if (isDrawing) {
      isPainting.current = true;
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      return;
    }

    // Start marquee
    isMarquee.current = true;
    const coords = toWorkspace(e.clientX, e.clientY);
    marqueeStart.current = coords;
    setMarquee({ x: coords.x, y: coords.y, w: 0, h: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isPainting.current && isDrawing) {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      return;
    }
    if (isMarquee.current && marqueeStart.current) {
      const cur = toWorkspace(e.clientX, e.clientY);
      const s = marqueeStart.current;
      setMarquee({
        x: Math.min(s.x, cur.x),
        y: Math.min(s.y, cur.y),
        w: Math.abs(cur.x - s.x),
        h: Math.abs(cur.y - s.y),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (isPainting.current) {
      isPainting.current = false;
      return;
    }

    if (isMarquee.current) {
      isMarquee.current = false;
      const m = marquee;

      if (m && (m.w > 6 || m.h > 6)) {
        // Select items inside the marquee
        const hit = items.filter((item) => {
          const iw = item.width || 40;
          const ih = item.height || 40;
          return !(
            item.position.x + iw < m.x ||
            item.position.x > m.x + m.w ||
            item.position.y + ih < m.y ||
            item.position.y > m.y + m.h
          );
        });
        onSelectionChange?.(hit.map((i) => i.id));
      } else {
        // Click on background → clear selection only if no modifier
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          onSelectionChange?.([]);
        }
      }
      setMarquee(null);
      marqueeStart.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden workspace-grid"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ touchAction: "none" }}
    >
      {/* Zoomed layer */}
      <div
        ref={contentRef}
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${pan.x - scrollPos.x}px, ${pan.y - scrollPos.y}px) scale(${zoom})`,
        }}
      >
        {children}

        {/* Marquee rectangle */}
        {marquee && (marquee.w > 4 || marquee.h > 4) && (
          <div
            style={{
              position: "absolute",
              pointerEvents: "none",
              left: marquee.x,
              top: marquee.y,
              width: marquee.w,
              height: marquee.h,
              border: "2px solid #08b8fb",
              background: "rgba(8,184,251,0.08)",
              borderRadius: 3,
              zIndex: 9999,
            }}
          />
        )}
      </div>

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: isDrawing ? 30 : 0,
          pointerEvents: isDrawing ? "none" : "none",
          cursor: isDrawing ? "crosshair" : "default",
        }}
      />

      {/* Horizontal scrollbar */}
      {contentSize.w > containerW && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 16,
            height: 12,
            background: "#f1f5f9",
            borderTop: "1px solid #e2e8f0",
          }}
          onClick={handleHorizontalScroll}
        >
          <div
            style={{
              position: "absolute",
              height: 12,
              background: "#cbd5e1",
              borderRadius: 6,
              left: hScrollX,
              width: hScrollThumbW,
              cursor: "grab",
              top: 0,
            }}
          />
        </div>
      )}

      {/* Vertical scrollbar */}
      {contentSize.h > containerH && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 12,
            width: 12,
            background: "#f1f5f9",
            borderLeft: "1px solid #e2e8f0",
          }}
          onClick={handleVerticalScroll}
        >
          <div
            style={{
              position: "absolute",
              width: 12,
              background: "#cbd5e1",
              borderRadius: 6,
              top: vScrollY,
              height: vScrollThumbH,
              cursor: "grab",
              left: 0,
            }}
          />
        </div>
      )}
    </div>
  );
}
