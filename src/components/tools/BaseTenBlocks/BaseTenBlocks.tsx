import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn, generateId } from "../../../utils/helpers";
import { ManipulativeItem, Position } from "../../../types";
import Workspace from "../../workspace/Workspace";
import {
  Scissors,
  Combine,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Tag,
  ChevronRight,
} from "lucide-react";
import type { BaseTenMode } from "../../layout/Shell";

// ─── Block sizes & visuals ────────────────────────────────────────────────────
const BLOCK_SIZES = {
  unit: { w: 28, h: 28 },
  rod: { w: 28, h: 140 },
  flat: { w: 140, h: 140 },
  cube: { w: 160, h: 160 },
} as const;

const BLOCK_COLORS: Record<
  string,
  { bg: string; border: string; grid: string }
> = {
  unit: { bg: "#eab308", border: "#ca8a04", grid: "rgba(0,0,0,0.12)" },
  rod: { bg: "#3b82f6", border: "#2563eb", grid: "rgba(0,0,0,0.10)" },
  flat: { bg: "#f97316", border: "#ea580c", grid: "rgba(0,0,0,0.10)" },
  cube: { bg: "#22c55e", border: "#16a34a", grid: "rgba(0,0,0,0.10)" },
};

// ─── Block Visual Component ───────────────────────────────────────────────────
function BaseTenBlock({
  type,
  size,
}: {
  type: string;
  size?: "normal" | "tray";
}) {
  const isTray = size === "tray";
  const colors = BLOCK_COLORS[type] || BLOCK_COLORS.unit;
  const dims =
    BLOCK_SIZES[type as keyof typeof BLOCK_SIZES] || BLOCK_SIZES.unit;
  const w = isTray ? Math.min(dims.w, 52) : dims.w;
  const h = isTray ? Math.min(dims.h, 52) : dims.h;

  if (type === "unit") {
    return (
      <div
        style={{
          width: w,
          height: h,
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: 3,
          boxShadow:
            "inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.15)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle diagonal pattern to indicate individual unit */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)`,
          }}
        />
      </div>
    );
  }

  if (type === "rod") {
    const segments = isTray ? 10 : 10;
    const segH = (h - 4) / segments;
    return (
      <div
        style={{
          width: w,
          height: h,
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: 3,
          position: "relative",
          overflow: "hidden",
          boxShadow:
            "inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        {Array.from({ length: segments - 1 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: (i + 1) * segH,
              height: 0.75,
              background: colors.grid,
            }}
          />
        ))}
        {/* Alternating segment shading */}
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={`shade-${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: i * segH,
              height: segH,
              background:
                i % 2 === 0 ? "rgba(255,255,255,0.08)" : "transparent",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>
    );
  }

  if (type === "flat") {
    // 3D flat like cube but shorter depth
    const faceW = isTray ? w * 0.85 : w * 0.8;
    const faceH = isTray ? h * 0.85 : h * 0.8;
    const depth = isTray ? 6 : 12;

    return (
      <div style={{ width: w, height: h, position: "relative" }}>
        {/* Top face (3D depth) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: faceW,
            height: depth,
            background: `linear-gradient(180deg, ${colors.bg}ee, ${colors.bg}bb)`,
            border: `1.5px solid ${colors.border}`,
            borderRadius: "2px 2px 0 0",
            transform: `skewX(-25deg) translateX(${depth * 0.5}px)`,
          }}
        />
        {/* Right face (3D depth) */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: depth,
            height: faceH,
            background: `linear-gradient(90deg, ${colors.bg}dd, ${colors.bg}99)`,
            border: `1.5px solid ${colors.border}`,
            borderRadius: "0 2px 2px 0",
            transform: `skewY(-25deg) translateY(${depth * 0.5}px)`,
          }}
        />
        {/* Front face with 10x10 grid */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: depth,
            width: faceW,
            height: faceH,
            background: colors.bg,
            border: `2px solid ${colors.border}`,
            borderRadius: 2,
            overflow: "hidden",
            boxShadow:
              "inset 0 1px 3px rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {/* 10x10 grid pattern */}
          <div
            style={{
              position: "absolute",
              inset: 1,
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gridTemplateRows: "repeat(10, 1fr)",
            }}
          >
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                style={{
                  border: `0.75px solid ${colors.grid}`,
                  background:
                    (i + Math.floor(i / 10)) % 2 === 0
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.05)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // cube — 3D isometric look
  const faceW = isTray ? w * 0.8 : w * 0.75;
  const faceH = isTray ? h * 0.8 : h * 0.75;
  const depth = isTray ? 8 : 20;
  return (
    <div style={{ width: w, height: h, position: "relative" }}>
      {/* Top face */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: faceW,
          height: depth,
          background: `linear-gradient(180deg, ${colors.bg}dd, ${colors.bg}aa)`,
          border: `1.5px solid ${colors.border}`,
          borderRadius: "3px 3px 0 0",
          transform: `skewX(-30deg) translateX(${depth * 0.6}px)`,
        }}
      />
      {/* Right face */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: depth,
          height: faceH,
          background: `linear-gradient(90deg, ${colors.bg}cc, ${colors.bg}88)`,
          border: `1.5px solid ${colors.border}`,
          borderRadius: "0 3px 3px 0",
          transform: `skewY(-30deg) translateY(${depth * 0.6}px)`,
        }}
      />
      {/* Front face */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: depth,
          width: faceW,
          height: faceH,
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow:
            "inset 0 1px 3px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.15)",
        }}
      >
        {!isTray && (
          <div
            style={{
              position: "absolute",
              inset: 2,
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gridTemplateRows: "repeat(10, 1fr)",
            }}
          >
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                style={{
                  border: `0.5px solid ${colors.grid}`,
                  background:
                    (i + Math.floor(i / 10)) % 2 === 0
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Place Value Mat types ────────────────────────────────────────────────────
interface PVMat {
  id: string;
  position: Position;
  width: number;
  height: number;
  showLabels: boolean;
}

const DEFAULT_MAT_W = 800;
const DEFAULT_MAT_H = 440;
const HEADER_H = 56;
const ZONE_NAMES = ["Thousands", "Hundreds", "Tens", "Ones"] as const;
const ZONE_KEYS = ["thousands", "hundreds", "tens", "ones"] as const;
type ZoneKey = (typeof ZONE_KEYS)[number];

const ZONE_VALUES: Record<ZoneKey, number> = {
  thousands: 1000,
  hundreds: 100,
  tens: 10,
  ones: 1,
};
const ZONE_BLOCK_TYPE: Record<ZoneKey, string> = {
  thousands: "cube",
  hundreds: "flat",
  tens: "rod",
  ones: "unit",
};

function getBlockValue(type: string): number {
  return (
    { unit: 1, rod: 10, flat: 100, cube: 1000 }[
      type as "unit" | "rod" | "flat" | "cube"
    ] || 0
  );
}
function getZoneForBlockType(type: string): ZoneKey {
  const map: Record<string, ZoneKey> = {
    cube: "thousands",
    flat: "hundreds",
    rod: "tens",
    unit: "ones",
  };
  return map[type] || "ones";
}
function getBlockTypeForValue(v: number): string {
  if (v >= 1000) return "cube";
  if (v >= 100) return "flat";
  if (v >= 10) return "rod";
  return "unit";
}

function getEffectiveSize(item: ManipulativeItem) {
  const dims =
    BLOCK_SIZES[item.type as keyof typeof BLOCK_SIZES] || BLOCK_SIZES.unit;
  return (item.rotation || 0) % 180 === 0
    ? { w: dims.w, h: dims.h }
    : { w: dims.h, h: dims.w };
}

// ─── Context Menu for blocks ──────────────────────────────────────────────────
function BlockContextMenu({
  item,
  onBreak,
  onRegroup,
  onCopy,
  onLock,
  onUnlock,
  onDelete,
}: {
  item: ManipulativeItem;
  onBreak?: () => void;
  onRegroup?: () => void;
  onCopy: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="absolute flex flex-col bg-white shadow-lg border border-slate-200 rounded-lg overflow-hidden z-[9999]"
      style={{
        bottom: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginBottom: 8,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {onBreak && (
        <button
          onClick={onBreak}
          className="px-3 py-2 flex items-center gap-2 hover:bg-slate-100 text-slate-700 text-sm font-medium border-b border-slate-200"
        >
          <Scissors size={16} />
          <span>Break</span>
        </button>
      )}
      {onRegroup && (
        <button
          onClick={onRegroup}
          className="px-3 py-2 flex items-center gap-2 hover:bg-slate-100 text-slate-700 text-sm font-medium border-b border-slate-200"
        >
          <Combine size={16} />
          <span>Regroup</span>
        </button>
      )}
      <div className="flex h-full">
        <button
          onClick={onCopy}
          className="px-3 py-2 flex items-center justify-center hover:bg-slate-100 text-slate-700 border-r border-slate-200"
          title="Copy"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={item.isLocked ? onUnlock : onLock}
          className="px-3 py-2 flex items-center justify-center hover:bg-slate-100 text-slate-700 border-r border-slate-200"
          title={item.isLocked ? "Unlock" : "Lock"}
        >
          {item.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 flex items-center justify-center hover:bg-red-50 text-red-500"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Mat Context Menu ─────────────────────────────────────────────────────────
function MatContextMenu({
  mat,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  mat: PVMat;
  onUpdate: (u: Partial<PVMat>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const stop = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  return (
    <div
      onPointerDown={stop}
      style={{
        position: "absolute",
        top: -8,
        left: -170,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.11)",
        zIndex: 999999,
        padding: 8,
        minWidth: 160,
        userSelect: "none",
      }}
    >
      <button
        onPointerDown={stop}
        onClick={(e) => {
          stop(e);
          onUpdate({ showLabels: !mat.showLabels });
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "7px 12px",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          background: "transparent",
          color: "#334155",
          fontSize: 13,
          fontWeight: 500,
          textAlign: "left",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Tag size={14} color="#64748b" />
        <span>Labels On/Off</span>
      </button>
      <div style={{ height: 1, background: "#f1f5f9", margin: "2px 0 6px" }} />
      <div style={{ display: "flex", gap: 2, paddingLeft: 2 }}>
        <button
          title="Duplicate"
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            onDuplicate();
          }}
          style={{
            width: 32,
            height: 32,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            background: "transparent",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Copy size={15} />
        </button>
        <button
          title="Delete"
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            onDelete();
          }}
          style={{
            width: 32,
            height: 32,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            background: "rgba(239,68,68,0.08)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(239,68,68,0.16)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
          }
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Place Value Mat Visual ───────────────────────────────────────────────────
function PlaceValueMatVisual({
  mat,
  items,
  isSelected,
}: {
  mat: PVMat;
  items: ManipulativeItem[];
  isSelected: boolean;
}) {
  const W = mat.width;
  const H = mat.height;
  const colW = (W - 4) / 4;

  // Calculate total value of all items
  const total = items.reduce((sum, item) => sum + getBlockValue(item.type), 0);

  return (
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `2.5px solid ${isSelected ? "#08b8fb" : "#cbd5e1"}`,
          borderRadius: 10,
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Purple header */}
      <div
        style={{
          height: HEADER_H,
          display: "flex",
          background: "linear-gradient(180deg, #9333ea, #7e22ce)",
          borderRadius: "8px 8px 0 0",
        }}
      >
        {ZONE_NAMES.map((label, i) => (
          <div
            key={label}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.2)" : "none",
            }}
          >
            {mat.showLabels && (
              <div
                style={{
                  background: "rgba(255,255,255,0.95)",
                  padding: "5px 14px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#7e22ce",
                }}
              >
                {label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Zone columns */}
      <div
        style={{
          position: "absolute",
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          background: "#fff",
        }}
      >
        {ZONE_KEYS.map((zone, i) => (
          <div
            key={zone}
            style={{
              flex: 1,
              borderRight: i < 3 ? "1px solid #e2e8f0" : "none",
              position: "relative",
            }}
          />
        ))}
      </div>

      {/* Total value */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          border: "2px solid #e2e8f0",
          borderRadius: 10,
          padding: "6px 20px",
          fontWeight: 700,
          fontSize: 18,
          color: "#334155",
          zIndex: 3,
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        }}
      >
        {total.toLocaleString()}
      </div>

      {/* Resize handles — only when selected */}
      {isSelected && (
        <>
          {["n", "s", "e", "w", "nw", "ne", "sw", "se"].map((dir) => {
            const style: React.CSSProperties = {
              position: "absolute",
              width: 10,
              height: 10,
              background: "#08b8fb",
              borderRadius: 2,
              zIndex: 5,
              pointerEvents: "auto",
            };
            if (dir.includes("n")) {
              style.top = -5;
            }
            if (dir.includes("s")) {
              style.bottom = -5;
            }
            if (dir.includes("e")) {
              style.right = -5;
            }
            if (dir.includes("w")) {
              style.left = -5;
            }
            if (dir === "n" || dir === "s") {
              style.left = "50%";
              style.transform = "translateX(-50%)";
              style.cursor = "ns-resize";
            }
            if (dir === "e" || dir === "w") {
              style.top = "50%";
              style.transform = "translateY(-50%)";
              style.cursor = "ew-resize";
            }
            if (dir === "nw" || dir === "se") style.cursor = "nwse-resize";
            if (dir === "ne" || dir === "sw") style.cursor = "nesw-resize";
            return <div key={dir} data-resize-handle={dir} style={style} />;
          })}
        </>
      )}
    </div>
  );
}

// ─── Draggable Mat (move + resize) ────────────────────────────────────────────
function DraggableMat({
  mat,
  isSelected,
  zoom,
  onSelect,
  onDragEnd,
  onResize,
  children,
}: {
  mat: PVMat;
  isSelected: boolean;
  zoom: number;
  onSelect: () => void;
  onDragEnd: (pos: Position) => void;
  onResize: (w: number, h: number) => void;
  children: React.ReactNode;
}) {
  const start = useRef({ x: 0, y: 0 });
  const origin = useRef<Position>({ x: 0, y: 0 });
  const originSize = useRef({ w: 0, h: 0 });
  const dragging = useRef(false);
  const resizing = useRef<string | null>(null);
  const moved = useRef(false);
  const selfRef = useRef<HTMLDivElement>(null);
  const resizePos = useRef<Position>({ x: 0, y: 0 });

  const onPD = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".manipulative-item")) return;
    const handle = (e.target as HTMLElement).closest("[data-resize-handle]");
    if (handle) {
      e.preventDefault();
      e.stopPropagation();
      if (selfRef.current) selfRef.current.setPointerCapture(e.pointerId);
      resizing.current = handle.getAttribute("data-resize-handle");
      start.current = { x: e.clientX, y: e.clientY };
      origin.current = { ...mat.position };
      originSize.current = { w: mat.width, h: mat.height };
      onSelect();
      return;
    }
    e.stopPropagation();
    if (selfRef.current) selfRef.current.setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    origin.current = { ...mat.position };
    onSelect();
  };
  const onPM = (e: React.PointerEvent) => {
    if (resizing.current) {
      e.preventDefault();
      const dx = (e.clientX - start.current.x) / zoom;
      const dy = (e.clientY - start.current.y) / zoom;
      let nw = originSize.current.w,
        nh = originSize.current.h;
      let posX = mat.position.x,
        posY = mat.position.y;
      const h = resizing.current;
      if (h.includes("e")) nw = Math.max(400, originSize.current.w + dx);
      if (h.includes("w")) {
        nw = Math.max(400, originSize.current.w - dx);
        posX = origin.current.x + dx;
      }
      if (h.includes("s")) nh = Math.max(200, originSize.current.h + dy);
      if (h.includes("n")) {
        nh = Math.max(200, originSize.current.h - dy);
        posY = origin.current.y + dy;
      }
      resizePos.current = { x: posX, y: posY };
      onResize(nw, nh);
      if ((h.includes("w") || h.includes("n")) && selfRef.current) {
        selfRef.current.style.left = `${posX}px`;
        selfRef.current.style.top = `${posY}px`;
      }
      return;
    }
    if (!dragging.current) return;
    const dx = (e.clientX - start.current.x) / zoom;
    const dy = (e.clientY - start.current.y) / zoom;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
    if (selfRef.current) {
      selfRef.current.style.left = `${origin.current.x + dx}px`;
      selfRef.current.style.top = `${origin.current.y + dy}px`;
    }
  };
  const onPU = (e: React.PointerEvent) => {
    if (resizing.current) {
      const h = resizing.current;
      resizing.current = null;
      if (selfRef.current) selfRef.current.releasePointerCapture(e.pointerId);
      if (
        (h.includes("w") || h.includes("n")) &&
        (resizePos.current.x !== mat.position.x ||
          resizePos.current.y !== mat.position.y)
      ) {
        onDragEnd(resizePos.current);
      }
      return;
    }
    if (!dragging.current) return;
    dragging.current = false;
    if (moved.current) {
      const dx = (e.clientX - start.current.x) / zoom;
      const dy = (e.clientY - start.current.y) / zoom;
      onDragEnd({ x: origin.current.x + dx, y: origin.current.y + dy });
    }
  };

  return (
    <div
      ref={selfRef}
      data-mat-id={mat.id}
      style={{
        position: "absolute",
        left: mat.position.x,
        top: mat.position.y,
        zIndex: isSelected ? 5 : 3,
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={onPD}
      onPointerMove={onPM}
      onPointerUp={onPU}
    >
      {children}
    </div>
  );
}

// ─── Draggable Block ──────────────────────────────────────────────────────────
interface DraggableBlockProps {
  item: ManipulativeItem;
  isSelected: boolean;
  showMenu: boolean;
  zoom: number;
  canDrag: boolean;
  onDragStart: () => void;
  onDrag: (dx: number, dy: number) => void;
  onDragEnd: () => void;
  onClick: (multi: boolean) => void;
  onBreak?: () => void;
  onRegroup?: () => void;
  onCopy: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onDelete: () => void;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({
  item,
  isSelected,
  showMenu,
  zoom,
  canDrag,
  onDragStart,
  onDrag,
  onDragEnd,
  onClick,
  onBreak,
  onRegroup,
  onCopy,
  onLock,
  onUnlock,
  onDelete,
}) => {
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canDrag || item.isLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    onDragStart();
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    e.stopPropagation();
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
    onDrag(dx, dy);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    e.stopPropagation();
    dragging.current = false;
    onDragEnd();
    if (!moved.current) onClick(e.shiftKey || e.ctrlKey || e.metaKey);
  };

  const { w, h } =
    BLOCK_SIZES[item.type as keyof typeof BLOCK_SIZES] || BLOCK_SIZES.unit;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.15 } }}
      className={cn(
        "absolute z-10 manipulative-item",
        canDrag && !item.isLocked
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-default",
        isSelected && "z-20",
      )}
      style={{
        left: item.position?.x ?? 0,
        top: item.position?.y ?? 0,
        width: w,
        height: h,
        outline: isSelected ? "2px solid #08b8fb" : "none",
        outlineOffset: 2,
        borderRadius: 3,
        opacity: item.isLocked ? 0.6 : 1,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <BaseTenBlock type={item.type} />
      {item.isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded">
          <Lock size={12} className="text-slate-600" />
        </div>
      )}
      {showMenu && (
        <BlockContextMenu
          item={item}
          onBreak={onBreak}
          onRegroup={onRegroup}
          onCopy={onCopy}
          onLock={onLock}
          onUnlock={onUnlock}
          onDelete={onDelete}
        />
      )}
    </motion.div>
  );
};

// ─── Tray ghost for drag-from-tray ────────────────────────────────────────────
function TrayDragGhost({ type, pos }: { type: string; pos: Position }) {
  return (
    <div
      style={{
        position: "fixed",
        left: pos.x - 20,
        top: pos.y - 20,
        zIndex: 100000,
        pointerEvents: "none",
        opacity: 0.85,
        transform: "scale(0.9)",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
      }}
    >
      <BaseTenBlock type={type} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BaseTenBlocks({
  interactionMode,
  clearTrigger,
  resetTrigger,
  zoom,
  mode = "basic",
}: {
  interactionMode: "select" | "pen" | "eraser" | "highlighter";
  clearTrigger: number;
  resetTrigger: number;
  zoom: number;
  mode?: BaseTenMode;
}) {
  const [items, setItems] = useState<ManipulativeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mats, setMats] = useState<PVMat[]>([]);
  const [selectedMatId, setSelectedMatId] = useState<string | null>(null);
  const dragOrigins = useRef<Record<string, Position>>({});

  // Drag-from-tray state
  const [trayDrag, setTrayDrag] = useState<{
    type: string;
    pos: Position;
  } | null>(null);
  const trayDragRef = useRef<{ type: string; startPos: Position } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // ── Reset ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setItems([]);
    setSelectedIds([]);
    setMats([]);
    setSelectedMatId(null);
  }, [resetTrigger]);

  // ── Auto-create mat when entering place-value mode ──────────────────────────
  useEffect(() => {
    if (mode === "place-value") {
      setMats((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            id: generateId(),
            position: { x: 30, y: 20 },
            width: DEFAULT_MAT_W,
            height: DEFAULT_MAT_H,
            showLabels: true,
          },
        ];
      });
    }
  }, [mode]);

  // ── Zone helpers ────────────────────────────────────────────────────────────
  const getZoneAtPositionInMat = useCallback(
    (mat: PVMat, worldX: number, worldY: number): ZoneKey | null => {
      const relX = worldX - mat.position.x;
      const relY = worldY - mat.position.y;
      if (relY < HEADER_H || relY > mat.height || relX < 0 || relX > mat.width)
        return null;
      const colW = mat.width / 4;
      const colIdx = Math.floor(relX / colW);
      if (colIdx < 0 || colIdx > 3) return null;
      return ZONE_KEYS[colIdx];
    },
    [],
  );

  const getMatAndZoneAtPosition = useCallback(
    (worldX: number, worldY: number): { mat: PVMat; zone: ZoneKey } | null => {
      for (const mat of mats) {
        const zone = getZoneAtPositionInMat(mat, worldX, worldY);
        if (zone) return { mat, zone };
      }
      return null;
    },
    [mats, getZoneAtPositionInMat],
  );

  // ── Arrange blocks neatly inside a zone ─────────────────────────────────────
  const arrangeBlocksInZone = useCallback(
    (
      allItems: ManipulativeItem[],
      mat: PVMat,
      zone: ZoneKey,
    ): ManipulativeItem[] => {
      const colW = mat.width / 4;
      const colIdx = ZONE_KEYS.indexOf(zone);
      const zoneX = mat.position.x + colIdx * colW;
      const zoneY = mat.position.y + HEADER_H + 12;
      const zoneW = colW;
      const zoneH = mat.height - HEADER_H - 60;

      // Find blocks in this zone
      const inZone = allItems.filter((item) => {
        if (!item.position) return false;
        const mz = getZoneAtPositionInMat(
          mat,
          item.position.x + 14,
          item.position.y + 14,
        );
        return mz === zone;
      });
      const notInZone = allItems.filter((item) => !inZone.includes(item));

      // Sort by type
      inZone.sort((a, b) => {
        const typeOrder = { cube: 0, flat: 1, rod: 2, unit: 3 };
        return (
          (typeOrder[a.type as keyof typeof typeOrder] ?? 99) -
          (typeOrder[b.type as keyof typeof typeOrder] ?? 99)
        );
      });

      // Arrange with tight spacing and boundary enforcement
      const GRID_SPACING = 2; // Very tight spacing
      const ZONE_PADDING = 4;

      const arranged = inZone
        .map((item, idx) => {
          const dims =
            BLOCK_SIZES[item.type as keyof typeof BLOCK_SIZES] ||
            BLOCK_SIZES.unit;
          const usableW = zoneW - 2 * ZONE_PADDING;
          const usableH = zoneH - 2 * ZONE_PADDING;

          // Calculate items per row
          const itemWidth = dims.w + GRID_SPACING;
          const itemsPerRow = Math.max(1, Math.floor(usableW / itemWidth));

          const row = Math.floor(idx / itemsPerRow);
          const col = idx % itemsPerRow;

          // Check vertical boundary
          const proposedY =
            zoneY + ZONE_PADDING + row * (dims.h + GRID_SPACING);
          if (proposedY + dims.h > zoneY + zoneH - ZONE_PADDING) {
            return null; // Skip if doesn't fit
          }

          // Calculate position
          const totalRowWidth = itemsPerRow * itemWidth - GRID_SPACING;
          const offsetX = Math.max(0, (usableW - totalRowWidth) / 2);

          const proposedX = zoneX + ZONE_PADDING + offsetX + col * itemWidth;
          const maxX = zoneX + zoneW - dims.w - ZONE_PADDING;
          const finalX = Math.min(proposedX, maxX);

          return {
            ...item,
            position: { x: finalX, y: proposedY },
          };
        })
        .filter((item) => item !== null) as ManipulativeItem[];

      return [...notInZone, ...arranged];
    },
    [getZoneAtPositionInMat],
  );

  // ── Add item (click from tray) ──────────────────────────────────────────────
  const addItem = useCallback(
    (type: string) => {
      setItems((prev) => {
        const dims =
          BLOCK_SIZES[type as keyof typeof BLOCK_SIZES] || BLOCK_SIZES.unit;

        if (mode === "place-value" && mats.length > 0) {
          const mat = mats[0];
          const zone = getZoneForBlockType(type);
          const colIdx = ZONE_KEYS.indexOf(zone);
          const colW = mat.width / 4;
          const zoneX = mat.position.x + colIdx * colW;
          const zoneY = mat.position.y + HEADER_H + 12;
          const zoneInnerW = colW - 8;

          // Count existing blocks in this zone
          const inZone = prev.filter((item) => {
            if (!item.position) return false;
            const mz = getZoneAtPositionInMat(
              mat,
              item.position.x + 14,
              item.position.y + 14,
            );
            return mz === zone;
          });

          const itemsPerRow = Math.max(
            1,
            Math.floor(zoneInnerW / (dims.w + 4)),
          );
          const row = Math.floor(inZone.length / itemsPerRow);
          const col = inZone.length % itemsPerRow;

          return [
            ...prev,
            {
              id: generateId(),
              type,
              position: {
                x: zoneX + 6 + col * (dims.w + 4),
                y: zoneY + row * (dims.h + 4),
              },
              rotation: 0,
              color: "",
              width: dims.w,
              height: dims.h,
              isLocked: false,
            },
          ];
        }

        // Basic mode — default positioning
        let pos: Position = { x: 80, y: 80 };
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.position) {
            const ls = getEffectiveSize(last);
            pos = { x: last.position.x + ls.w + 4, y: last.position.y };
            if (pos.x > 620) pos = { x: 80, y: last.position.y + ls.h + 8 };
          }
        }
        return [
          ...prev,
          {
            id: generateId(),
            type,
            position: pos,
            rotation: 0,
            color: "",
            width: dims.w,
            height: dims.h,
            isLocked: false,
          },
        ];
      });
    },
    [mode, mats, getZoneAtPositionInMat],
  );

  // ── Snap (basic mode) ───────────────────────────────────────────────────────
  const snapItem = (
    id: string,
    currentItems: ManipulativeItem[],
  ): ManipulativeItem[] => {
    const item = currentItems.find((i) => i.id === id);
    if (!item || !item.position) return currentItems;
    const is = getEffectiveSize(item);
    let best = { ...item.position },
      minD = 24;
    currentItems.forEach((other) => {
      if (other.id === id || !other.position) return;
      const os = getEffectiveSize(other);
      [
        { x: other.position.x + os.w, y: other.position.y },
        { x: other.position.x - is.w, y: other.position.y },
        { x: other.position.x, y: other.position.y + os.h },
        { x: other.position.x, y: other.position.y - is.h },
      ].forEach((c) => {
        const d = Math.hypot(c.x - item.position.x, c.y - item.position.y);
        if (d < minD) {
          minD = d;
          best = c;
        }
      });
    });
    return currentItems.map((i) =>
      i.id === id ? { ...i, position: best } : i,
    );
  };

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const handleDragStart = (id: string) => {
    const ids = selectedIds.includes(id) ? selectedIds : [id];
    const o: Record<string, Position> = {};
    items.forEach((item) => {
      if (ids.includes(item.id) && item.position)
        o[item.id] = { ...item.position };
    });
    dragOrigins.current = o;
    if (!selectedIds.includes(id)) setSelectedIds([id]);
    setSelectedMatId(null);
  };

  const handleDrag = (id: string, dx: number, dy: number) => {
    const sdx = dx / zoom,
      sdy = dy / zoom;
    setItems((prev) =>
      prev.map((i) => {
        const o = dragOrigins.current[i.id];
        return o && i.position
          ? { ...i, position: { x: o.x + sdx, y: o.y + sdy } }
          : i;
      }),
    );
  };

  const handleDragEnd = (id: string) => {
    const movedIds = Object.keys(dragOrigins.current);
    setItems((prev) => {
      let n = [...prev];

      if (mode === "place-value" && mats.length > 0) {
        const mat = mats[0];
        const zonesToArrange = new Set<ZoneKey>();

        movedIds.forEach((sid) => {
          const item = n.find((i) => i.id === sid);
          if (!item || !item.position) return;

          const result = getMatAndZoneAtPosition(
            item.position.x + 14,
            item.position.y + 14,
          );
          if (!result) {
            // Outside mat — return to origin
            const origin = dragOrigins.current[sid];
            if (origin)
              n = n.map((i) => (i.id === sid ? { ...i, position: origin } : i));
            return;
          }

          const { zone } = result;
          const blockValue = getBlockValue(item.type);
          const zoneValue = ZONE_VALUES[zone];

          if (blockValue <= zoneValue) {
            // Block fits (same or smaller value) — keep in zone
            zonesToArrange.add(zone);
          } else {
            // Block is too big — BREAK it into zone-sized pieces
            const targetType = getBlockTypeForValue(zoneValue);
            const count = Math.min(blockValue / zoneValue, 100);
            const dims =
              BLOCK_SIZES[targetType as keyof typeof BLOCK_SIZES] ||
              BLOCK_SIZES.unit;

            const colIdx = ZONE_KEYS.indexOf(zone);
            const colW = mat.width / 4;
            const zoneX = mat.position.x + colIdx * colW;
            const zoneY = mat.position.y + HEADER_H + 12;
            const ZONE_PADDING = 4; // Updated
            const GRID_SPACING = 2; // Updated
            const zoneW = colW;
            const usableW = zoneW - 2 * ZONE_PADDING;

            // Count existing blocks in this zone
            const existingInZone = n.filter((it) => {
              if (it.id === sid || !it.position) return false;
              const mz = getZoneAtPositionInMat(
                mat,
                it.position.x + 14,
                it.position.y + 14,
              );
              return mz === zone;
            });
            const startIdx = existingInZone.length;

            // Calculate grid layout
            const itemWidth = dims.w + GRID_SPACING;
            const itemsPerRow = Math.max(1, Math.floor(usableW / itemWidth));

            const newBlocks: ManipulativeItem[] = [];
            for (let idx = 0; idx < count; idx++) {
              const totalIdx = startIdx + idx;
              const row = Math.floor(totalIdx / itemsPerRow);
              const col = totalIdx % itemsPerRow;

              // Check if block fits in height
              const proposedY =
                zoneY + ZONE_PADDING + row * (dims.h + GRID_SPACING);
              if (
                proposedY + dims.h >
                zoneY + mat.height - HEADER_H - 60 - ZONE_PADDING
              ) {
                break; // Stop adding if exceeds height
              }

              // Center calculation
              const totalRowWidth = itemsPerRow * itemWidth - GRID_SPACING;
              const offsetX = Math.max(0, (usableW - totalRowWidth) / 2);

              const proposedX =
                zoneX + ZONE_PADDING + offsetX + col * itemWidth;
              const maxX = zoneX + zoneW - dims.w - ZONE_PADDING;
              const finalX = Math.min(proposedX, maxX);

              newBlocks.push({
                id: generateId(),
                type: targetType,
                position: {
                  x: finalX,
                  y: proposedY,
                },
                rotation: 0,
                color: "",
                width: dims.w,
                height: dims.h,
                isLocked: false,
              });
            }

            n = n.filter((i) => i.id !== sid);
            n = [...n, ...newBlocks];
            zonesToArrange.add(zone);
          }
        });

        // Re-arrange blocks in affected zones
        zonesToArrange.forEach((zone) => {
          n = arrangeBlocksInZone(n, mat, zone);
        });
      } else {
        // Basic mode — snap
        movedIds.forEach((sid) => {
          n = snapItem(sid, n);
        });
      }

      return n;
    });
    dragOrigins.current = {};
  };

  // ── Item operations ─────────────────────────────────────────────────────────
  const updateItem = (id: string, u: Partial<ManipulativeItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...u } : i)));

  const deleteItems = (ids: string[]) => {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setSelectedIds([]);
  };

  const copyItems = (ids: string[]) => {
    const copies = items
      .filter((i) => ids.includes(i.id) && i.position)
      .map((i) => ({
        ...i,
        id: generateId(),
        position: {
          x: (i.position?.x ?? 0) + 12,
          y: (i.position?.y ?? 0) + 12,
        },
      }));
    setItems((prev) => [...prev, ...copies]);
    setSelectedIds(copies.map((c) => c.id));
  };

  const breakBlock = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !item.position) return;
    const nextType = { cube: "flat", flat: "rod", rod: "unit" }[
      item.type as "cube" | "flat" | "rod"
    ];
    if (!nextType) return;
    const dims = BLOCK_SIZES[nextType as keyof typeof BLOCK_SIZES];
    const pieces: ManipulativeItem[] = [];
    for (let i = 0; i < 10; i++) {
      pieces.push({
        id: generateId(),
        type: nextType,
        position: {
          x: item.position.x + (i % 5) * (dims.w + 4),
          y: item.position.y + Math.floor(i / 5) * (dims.h + 4),
        },
        rotation: 0,
        color: "",
        width: dims.w,
        height: dims.h,
        isLocked: false,
      });
    }
    setItems((prev) => [...prev.filter((i) => i.id !== id), ...pieces]);
    setSelectedIds([]);
  };

  const regroupItems = () => {
    const selected = items.filter((i) => selectedIds.includes(i.id));
    if (selected.length < 10) return;
    if (!selected.every((i) => i.type === selected[0].type)) return;
    const type = selected[0].type;
    const nextType = { unit: "rod", rod: "flat", flat: "cube" }[
      type as "unit" | "rod" | "flat"
    ];
    if (!nextType) return;
    const withPos = selected.filter((i) => i.position);
    if (withPos.length === 0) return;
    const avgX =
      withPos.reduce((a, i) => a + (i.position?.x ?? 0), 0) / withPos.length;
    const avgY =
      withPos.reduce((a, i) => a + (i.position?.y ?? 0), 0) / withPos.length;
    const dims = BLOCK_SIZES[nextType as keyof typeof BLOCK_SIZES];
    setItems((prev) => [
      ...prev.filter((i) => !selectedIds.includes(i.id)),
      {
        id: generateId(),
        type: nextType,
        position: { x: avgX, y: avgY },
        rotation: 0,
        color: "",
        width: dims.w,
        height: dims.h,
        isLocked: false,
      },
    ]);
    setSelectedIds([]);
  };

  // ── Mat operations ──────────────────────────────────────────────────────────
  const updateMat = (id: string, u: Partial<PVMat>) =>
    setMats((prev) => prev.map((m) => (m.id === id ? { ...m, ...u } : m)));
  const deleteMat = (id: string) => {
    setMats((prev) => prev.filter((m) => m.id !== id));
    if (selectedMatId === id) setSelectedMatId(null);
  };
  const duplicateMat = (id: string) => {
    const m = mats.find((mat) => mat.id === id);
    if (!m) return;
    setMats((prev) => [
      ...prev,
      {
        ...m,
        id: generateId(),
        position: { x: m.position.x + 30, y: m.position.y + 30 },
      },
    ]);
  };

  // ── Tray drag handlers ─────────────────────────────────────────────────────
  const handleTrayPointerDown = (type: string, e: React.PointerEvent) => {
    e.preventDefault();
    trayDragRef.current = { type, startPos: { x: e.clientX, y: e.clientY } };

    const onMove = (ev: PointerEvent) => {
      if (!trayDragRef.current) return;
      const dx = ev.clientX - trayDragRef.current.startPos.x;
      const dy = ev.clientY - trayDragRef.current.startPos.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setTrayDrag({
          type: trayDragRef.current.type,
          pos: { x: ev.clientX, y: ev.clientY },
        });
      }
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      if (
        trayDrag ||
        (trayDragRef.current &&
          (Math.abs(ev.clientX - trayDragRef.current.startPos.x) > 5 ||
            Math.abs(ev.clientY - trayDragRef.current.startPos.y) > 5))
      ) {
        // Was dragging — drop at position
        if (workspaceRef.current && trayDragRef.current) {
          const wsRect = workspaceRef.current.getBoundingClientRect();
          const worldX = (ev.clientX - wsRect.left) / zoom;
          const worldY = (ev.clientY - wsRect.top) / zoom;
          const dropType = trayDragRef.current.type;

          // Check if dropping into a mat zone
          if (mode === "place-value" && mats.length > 0) {
            const result = getMatAndZoneAtPosition(worldX, worldY);
            if (result) {
              const { mat, zone } = result;
              const blockValue = getBlockValue(dropType);
              const zoneValue = ZONE_VALUES[zone];

              if (blockValue <= zoneValue) {
                // Fits — add directly
                addItem(dropType);
              } else {
                // Too big — break
                const targetType = getBlockTypeForValue(zoneValue);
                const count = Math.min(blockValue / zoneValue, 100);
                const dims =
                  BLOCK_SIZES[targetType as keyof typeof BLOCK_SIZES] ||
                  BLOCK_SIZES.unit;
                const colIdx = ZONE_KEYS.indexOf(zone);
                const colW = mat.width / 4;
                const zoneX = mat.position.x + colIdx * colW;
                const zoneY = mat.position.y + HEADER_H + 12;
                const ZONE_PADDING = 4; // Updated
                const GRID_SPACING = 2; // Updated
                const zoneW = colW;
                const usableW = zoneW - 2 * ZONE_PADDING;
                const itemWidth = dims.w + GRID_SPACING;
                const itemsPerRow = Math.max(
                  1,
                  Math.floor(usableW / itemWidth),
                );

                setItems((prev) => {
                  const existingInZone = prev.filter((it) => {
                    if (!it.position) return false;
                    const mz = getZoneAtPositionInMat(
                      mat,
                      it.position.x + 14,
                      it.position.y + 14,
                    );
                    return mz === zone;
                  });
                  const startIdx = existingInZone.length;
                  const newBlocks: ManipulativeItem[] = [];
                  for (let idx = 0; idx < count; idx++) {
                    const totalIdx = startIdx + idx;
                    const row = Math.floor(totalIdx / itemsPerRow);
                    const col = totalIdx % itemsPerRow;

                    // Check bounds
                    const proposedY =
                      zoneY + ZONE_PADDING + row * (dims.h + GRID_SPACING);
                    if (
                      proposedY + dims.h >
                      zoneY + mat.height - HEADER_H - 60 - ZONE_PADDING
                    ) {
                      break;
                    }

                    // Center calculation
                    const totalRowWidth =
                      itemsPerRow * itemWidth - GRID_SPACING;
                    const offsetX = Math.max(0, (usableW - totalRowWidth) / 2);

                    const proposedX =
                      zoneX + ZONE_PADDING + offsetX + col * itemWidth;
                    const maxX = zoneX + zoneW - dims.w - ZONE_PADDING;
                    const finalX = Math.min(proposedX, maxX);

                    newBlocks.push({
                      id: generateId(),
                      type: targetType,
                      position: {
                        x: finalX,
                        y: proposedY,
                      },
                      rotation: 0,
                      color: "",
                      width: dims.w,
                      height: dims.h,
                      isLocked: false,
                    });
                  }
                  let updated = [...prev, ...newBlocks];
                  updated = arrangeBlocksInZone(updated, mat, zone);
                  return updated;
                });
              }
            } else {
              // Outside mat — place freely
              const dims =
                BLOCK_SIZES[dropType as keyof typeof BLOCK_SIZES] ||
                BLOCK_SIZES.unit;
              setItems((prev) => [
                ...prev,
                {
                  id: generateId(),
                  type: dropType,
                  position: { x: worldX - dims.w / 2, y: worldY - dims.h / 2 },
                  rotation: 0,
                  color: "",
                  width: dims.w,
                  height: dims.h,
                  isLocked: false,
                },
              ]);
            }
          } else {
            // Basic mode — place at cursor
            const dims =
              BLOCK_SIZES[dropType as keyof typeof BLOCK_SIZES] ||
              BLOCK_SIZES.unit;
            setItems((prev) => [
              ...prev,
              {
                id: generateId(),
                type: dropType,
                position: { x: worldX - dims.w / 2, y: worldY - dims.h / 2 },
                rotation: 0,
                color: "",
                width: dims.w,
                height: dims.h,
                isLocked: false,
              },
            ]);
          }
        }
      } else {
        // Was click — add normally
        if (trayDragRef.current) addItem(trayDragRef.current.type);
      }

      setTrayDrag(null);
      trayDragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Items belonging to the first mat (for value calculation)
  const matItems =
    mode === "place-value" && mats.length > 0
      ? items.filter((item) => {
          if (!item.position) return false;
          const mat = mats[0];
          return (
            item.position.x >= mat.position.x &&
            item.position.x <= mat.position.x + mat.width &&
            item.position.y >= mat.position.y &&
            item.position.y <= mat.position.y + mat.height
          );
        })
      : items;

  const selectedMat = mats.find((m) => m.id === selectedMatId);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex" style={{ userSelect: "none" }}>
      {/* ── Tray ── */}
      <div className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-5 gap-5 z-20">
        {/* Unit */}
        <button
          onPointerDown={(e) => handleTrayPointerDown("unit", e)}
          className="hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
          title="Unit (1)"
          style={{ touchAction: "none" }}
        >
          <BaseTenBlock type="unit" size="tray" />
        </button>
        <div className="h-px w-10 bg-slate-200" />
        {/* Rod */}
        <button
          onPointerDown={(e) => handleTrayPointerDown("rod", e)}
          className="hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
          title="Rod (10)"
          style={{ touchAction: "none" }}
        >
          <BaseTenBlock type="rod" size="tray" />
        </button>
        <div className="h-px w-10 bg-slate-200" />
        {/* Flat */}
        <button
          onPointerDown={(e) => handleTrayPointerDown("flat", e)}
          className="hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
          title="Flat (100)"
          style={{ touchAction: "none" }}
        >
          <BaseTenBlock type="flat" size="tray" />
        </button>
        <div className="h-px w-10 bg-slate-200" />
        {/* Cube */}
        <button
          onPointerDown={(e) => handleTrayPointerDown("cube", e)}
          className="hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
          title="Cube (1000)"
          style={{ touchAction: "none" }}
        >
          <BaseTenBlock type="cube" size="tray" />
        </button>
        <div className="flex-1" />
      </div>

      {/* ── Workspace ── */}
      <div
        ref={workspaceRef}
        className="flex-1 relative overflow-hidden bg-white"
      >
        <Workspace
          items={items}
          onItemUpdate={updateItem}
          onItemDelete={(id) => deleteItems([id])}
          onItemAdd={(item) => setItems((p) => [...p, item])}
          onSelectionChange={(ids) => {
            setSelectedIds(ids);
            setSelectedMatId(null);
          }}
          selectedIds={selectedIds}
          isDrawing={interactionMode === "pen"}
          clearTrigger={clearTrigger}
          zoom={zoom}
        >
          {/* ── Mats ── */}
          {mode === "place-value" &&
            mats.map((mat) => (
              <DraggableMat
                key={mat.id}
                mat={mat}
                isSelected={selectedMatId === mat.id}
                zoom={zoom}
                onSelect={() => {
                  setSelectedMatId(mat.id);
                  setSelectedIds([]);
                }}
                onDragEnd={(pos) => updateMat(mat.id, { position: pos })}
                onResize={(w, h) => updateMat(mat.id, { width: w, height: h })}
              >
                <PlaceValueMatVisual
                  mat={mat}
                  items={matItems}
                  isSelected={selectedMatId === mat.id}
                />
              </DraggableMat>
            ))}

          {/* ── Blocks ── */}
          <AnimatePresence>
            {items.map((item) => (
              <DraggableBlock
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                showMenu={selectedIds[0] === item.id && selectedIds.length > 0}
                zoom={zoom}
                canDrag={interactionMode === "select"}
                onDragStart={() => handleDragStart(item.id)}
                onDrag={(dx, dy) => handleDrag(item.id, dx, dy)}
                onDragEnd={() => handleDragEnd(item.id)}
                onClick={(multi) => {
                  if (multi)
                    setSelectedIds((p) =>
                      p.includes(item.id)
                        ? p.filter((i) => i !== item.id)
                        : [...p, item.id],
                    );
                  else setSelectedIds([item.id]);
                }}
                onBreak={
                  item.type === "cube" ||
                  item.type === "flat" ||
                  item.type === "rod"
                    ? () => breakBlock(item.id)
                    : undefined
                }
                onRegroup={
                  selectedIds.includes(item.id) && selectedIds.length >= 10
                    ? regroupItems
                    : undefined
                }
                onCopy={() =>
                  copyItems(
                    selectedIds.includes(item.id) ? selectedIds : [item.id],
                  )
                }
                onLock={() => updateItem(item.id, { isLocked: true })}
                onUnlock={() => updateItem(item.id, { isLocked: false })}
                onDelete={() =>
                  deleteItems(
                    selectedIds.includes(item.id) ? selectedIds : [item.id],
                  )
                }
              />
            ))}
          </AnimatePresence>
        </Workspace>
      </div>

      {/* ── Mat context menu ── */}
      {selectedMat &&
        (() => {
          const el = document.querySelector(
            `[data-mat-id="${selectedMat.id}"]`,
          ) as HTMLDivElement | null;
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return (
            <div
              style={{
                position: "fixed",
                top: r.top + 10,
                left: r.left - 5,
                zIndex: 999999,
              }}
            >
              <MatContextMenu
                mat={selectedMat}
                onUpdate={(u) => updateMat(selectedMat.id, u)}
                onDuplicate={() => duplicateMat(selectedMat.id)}
                onDelete={() => deleteMat(selectedMat.id)}
              />
            </div>
          );
        })()}

      {/* ── Drag ghost ── */}
      {trayDrag && <TrayDragGhost type={trayDrag.type} pos={trayDrag.pos} />}
    </div>
  );
}
