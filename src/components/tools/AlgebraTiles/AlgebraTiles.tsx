import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { generateId } from '../../../utils/helpers';
import { ManipulativeItem, Position } from '../../../types';
import Workspace from '../../workspace/Workspace';
import { RotateCw, Trash2, Copy, Lock, Unlock, RotateCcw, ChevronRight, Tag } from 'lucide-react';
import type { AlgebraMode } from '../../layout/Shell';

// ─── Tile constants ───────────────────────────────────────────────────────────
const TILE_SIZES = {
  unit: { w: 40,  h: 40  },
  x:    { w: 40,  h: 120 },
  x2:   { w: 120, h: 120 },
} as const;

const TILE_BG: Record<string, string> = {
  unit_pos: '#facc15', unit_neg: '#ef4444',
  x_pos:    '#22c55e', x_neg:    '#ef4444',
  x2_pos:   '#3b82f6', x2_neg:   '#ef4444',
};
const TILE_LABELS: Record<string, string> = { unit: '1', x: 'x', x2: 'x²' };
const CAN_ROTATE:  Record<string, boolean> = { unit: false, x: true, x2: true };

type EqSymbol = '=' | '<' | '>' | '≤' | '≥' | '≠';

// ─── Solving / Factors mat item stored in state ───────────────────────────────
interface MatItem {
  id: string;
  kind: 'solving' | 'factors';
  position: Position;
  width?: number;
  height?: number;
  // solving fields
  symbol: EqSymbol;
  rows: number;
  showLabels: boolean;
  // factors fields
  factorShowLabels: boolean;
}

// ─── Tile visual ──────────────────────────────────────────────────────────────
function TileVisual({ type, isNegative, isLocked, rotation, isSelected }: {
  type: string; isNegative?: boolean; isLocked?: boolean; rotation: number; isSelected: boolean;
}) {
  const base = TILE_SIZES[type as keyof typeof TILE_SIZES] ?? { w: 40, h: 40 };
  const rotated = rotation % 180 !== 0;
  const visW = rotated ? base.h : base.w, visH = rotated ? base.w : base.h;
  const bg = TILE_BG[`${type}_${isNegative ? 'neg' : 'pos'}`] ?? '#94a3b8';
  return (
    <div style={{ width: visW, height: visH, position: 'relative',
      outline: isSelected ? '2.5px solid #08b8fb' : 'none', outlineOffset: 3, borderRadius: 4,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: base.w, height: base.h, transform: `rotate(${rotation}deg)`, transformOrigin: 'center',
        background: bg, border: '2px solid rgba(0,0,0,0.18)', borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', userSelect: 'none', pointerEvents: 'none', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, userSelect: 'none' }}>
          {isNegative ? `-${TILE_LABELS[type] ?? '?'}` : (TILE_LABELS[type] ?? '?')}
        </span>
        {isLocked && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={14} color="#fff" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tile context menu ────────────────────────────────────────────────────────
function TileMenu({ selectedIds, itemRefs, items, isMulti,
  onRotate, onInvert, onDuplicate, onLock, onDelete, onZeroPair }: {
  selectedIds: string[];
  itemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  items: ManipulativeItem[];
  isMulti: boolean;
  onRotate: () => void; onInvert: () => void; onDuplicate: () => void;
  onLock: () => void; onDelete: () => void; onZeroPair: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const raf = useRef<number>(0);
  useEffect(() => {
    const tick = () => {
      let maxR = 0, minT = Infinity, maxB = -Infinity, found = false;
      selectedIds.forEach(id => {
        const el = itemRefs.current[id]; if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.right > maxR) maxR = r.right;
        if (r.top < minT) minT = r.top;
        if (r.bottom > maxB) maxB = r.bottom;
        found = true;
      });
      if (found) setPos({ top: (minT + maxB) / 2, left: maxR + 12 });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [selectedIds, itemRefs]);

  const stop = (e: React.MouseEvent | React.PointerEvent) => { e.stopPropagation(); e.preventDefault(); };
  const lblBtn = (fn: () => void, icon: React.ReactNode, label: string) => (
    <button key={label} onPointerDown={stop} onClick={e => { stop(e); fn(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px',
        border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent',
        color: '#334155', fontSize: 13, fontWeight: 500, textAlign: 'left', userSelect: 'none', whiteSpace: 'nowrap' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    ><span style={{ display: 'flex', alignItems: 'center', minWidth: 18 }}>{icon}</span><span>{label}</span></button>
  );
  const icoBtn = (fn: () => void, icon: React.ReactNode, title: string, danger = false) => (
    <button key={title} title={title} onPointerDown={stop} onClick={e => { stop(e); fn(); }}
      style={{ width: 32, height: 32, border: 'none', borderRadius: 8, cursor: 'pointer',
        background: danger ? 'rgba(239,68,68,0.08)' : 'transparent',
        color: danger ? '#ef4444' : '#64748b',
        display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.16)' : '#f1f5f9'}
      onMouseLeave={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'transparent'}
    >{icon}</button>
  );

  const first = items.find(i => i.id === selectedIds[0]);
  const allLocked = selectedIds.every(id => items.find(i => i.id === id)?.isLocked);
  const canRotate = !isMulti && CAN_ROTATE[first?.type ?? ''];

  return (
    <div onPointerDown={stop} style={{ position: 'fixed', top: pos.top, left: pos.left,
      transform: 'translateY(-50%)', background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.11), 0 2px 6px rgba(0,0,0,0.06)',
      zIndex: 999999, padding: 8, minWidth: 150, userSelect: 'none' }}>
      <div style={{ paddingBottom: 4 }}>
        {canRotate && lblBtn(onRotate, <RotateCw size={14} color="#64748b" />, 'Rotate')}
        {lblBtn(onInvert, <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', minWidth: 18 }}>+/-</span>, 'Invert')}
        {lblBtn(onZeroPair, <RotateCcw size={14} color="#64748b" />, 'Zero Pair')}
      </div>
      <div style={{ height: 1, background: '#f1f5f9', margin: '2px 0 6px' }} />
      <div style={{ display: 'flex', gap: 2, paddingLeft: 2 }}>
        {icoBtn(onDuplicate, <Copy size={15} />, 'Duplicate')}
        {icoBtn(onLock, allLocked ? <Unlock size={15} /> : <Lock size={15} />, allLocked ? 'Unlock' : 'Lock')}
        {icoBtn(onDelete, <Trash2 size={15} />, 'Delete', true)}
      </div>
    </div>
  );
}

// ─── Mat context menu ─────────────────────────────────────────────────────────
function MatMenu({ anchorEl, mat, onUpdate, onDuplicate, onDelete }: {
  anchorEl: HTMLDivElement | null;
  mat: MatItem;
  onUpdate: (u: Partial<MatItem>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [pos, setPos]     = useState({ top: 0, left: 0 });
  const [sub, setSub]     = useState<'symbol' | 'rows' | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      if (anchorEl) {
        const r = anchorEl.getBoundingClientRect();
        setPos({ top: r.top + r.height / 2, left: r.right + 12 });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [anchorEl]);

  const stop = (e: React.MouseEvent | React.PointerEvent) => { e.stopPropagation(); e.preventDefault(); };

  const lblBtn = (fn: () => void, icon: React.ReactNode, label: string, arrow = false) => (
    <button key={label} onPointerDown={stop} onClick={e => { stop(e); fn(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px',
        border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent',
        color: '#334155', fontSize: 13, fontWeight: 500, textAlign: 'left', userSelect: 'none', whiteSpace: 'nowrap' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ display: 'flex', alignItems: 'center', minWidth: 18 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {arrow && <ChevronRight size={13} color="#94a3b8" />}
    </button>
  );
  const icoBtn = (fn: () => void, icon: React.ReactNode, title: string, danger = false) => (
    <button key={title} title={title} onPointerDown={stop} onClick={e => { stop(e); fn(); }}
      style={{ width: 32, height: 32, border: 'none', borderRadius: 8, cursor: 'pointer',
        background: danger ? 'rgba(239,68,68,0.08)' : 'transparent',
        color: danger ? '#ef4444' : '#64748b',
        display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.16)' : '#f1f5f9'}
      onMouseLeave={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'transparent'}
    >{icon}</button>
  );

  const SYMBOLS: EqSymbol[] = ['=', '<', '>', '≤', '≥', '≠'];

  return (
    <div onPointerDown={stop} style={{ position: 'fixed', top: pos.top, left: pos.left,
      transform: 'translateY(-50%)', background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.11)', zIndex: 999999,
      padding: 8, minWidth: 160, userSelect: 'none' }}>

      <div style={{ paddingBottom: 4 }}>
        {mat.kind === 'solving' && lblBtn(() => onUpdate({ showLabels: !mat.showLabels }),
          <Tag size={14} color="#64748b" />, 'Labels On/Off')}
        {mat.kind === 'factors' && lblBtn(() => onUpdate({ factorShowLabels: !mat.factorShowLabels }),
          <Tag size={14} color="#64748b" />, 'Labels On/Off')}

        {mat.kind === 'solving' && (
          <>
            {lblBtn(() => setSub(sub === 'symbol' ? null : 'symbol'),
              <span style={{ fontSize: 15, fontWeight: 700, color: '#64748b' }}>{mat.symbol}</span>, 'Symbol', true)}
            {sub === 'symbol' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px 4px 28px' }}>
                {SYMBOLS.map(s => (
                  <button key={s} onPointerDown={stop}
                    onClick={e => { stop(e); onUpdate({ symbol: s }); setSub(null); }}
                    style={{ width: 34, height: 34, border: `2px solid ${s === mat.symbol ? '#08b8fb' : '#e2e8f0'}`,
                      borderRadius: 8, cursor: 'pointer', background: s === mat.symbol ? '#eff9ff' : '#fff',
                      color: '#334155', fontWeight: 700, fontSize: 16 }}>{s}</button>
                ))}
              </div>
            )}

            {lblBtn(() => setSub(sub === 'rows' ? null : 'rows'),
              <span style={{ fontSize: 11, color: '#64748b' }}>☰</span>, 'Rows', true)}
            {sub === 'rows' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 28px' }}>
                <button onPointerDown={stop}
                  onClick={e => { stop(e); onUpdate({ rows: Math.max(1, mat.rows - 1) }); }}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e2e8f0',
                    background: '#f8fafc', cursor: 'pointer', fontWeight: 700, fontSize: 18, color: '#475569',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#334155', minWidth: 20, textAlign: 'center' }}>{mat.rows}</span>
                <button onPointerDown={stop}
                  onClick={e => { stop(e); onUpdate({ rows: Math.min(6, mat.rows + 1) }); }}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e2e8f0',
                    background: '#f8fafc', cursor: 'pointer', fontWeight: 700, fontSize: 18, color: '#475569',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ height: 1, background: '#f1f5f9', margin: '2px 0 6px' }} />
      <div style={{ display: 'flex', gap: 2, paddingLeft: 2 }}>
        {icoBtn(onDuplicate, <Copy size={15} />, 'Duplicate')}
        {icoBtn(onDelete,    <Trash2 size={15} />, 'Delete', true)}
      </div>
    </div>
  );
}

// ─── Solving Mat visual ───────────────────────────────────────────────────────
function SolvingMatVisual({ mat, tiles, isSelected, onPointerDown }: {
  mat: MatItem; tiles: ManipulativeItem[]; isSelected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const COL = 240, SYM = 56, H_ROW = 120;
  const W = mat.width || (COL * 2 + SYM);
  const H = mat.height || (mat.rows * H_ROW);

  // Compute expressions — only from tiles INSIDE this mat
  const toExpr = (sideItems: ManipulativeItem[]) => {
    const c: Record<string, number> = {};
    sideItems.forEach(i => { c[i.type] = (c[i.type] || 0) + (i.isNegative ? -1 : 1); });
    const p: string[] = [];
    if (c.x2) p.push(Math.abs(c.x2) === 1 ? (c.x2 < 0 ? '-x²' : 'x²') : `${c.x2}x²`);
    if (c.x)  p.push(Math.abs(c.x)  === 1 ? (c.x  < 0 ? '-x'  : 'x')  : `${c.x}x`);
    if (c.unit) p.push(`${c.unit}`);
    return p.join(' + ').replace(/\+ -/g, '− ') || '0';
  };

  // Filter tiles: only those with x position inside mat's left/right bounds
  const tilesInMat = tiles.filter(t =>
    t.position.x >= mat.position.x && t.position.x <= mat.position.x + W &&
    t.position.y >= mat.position.y && t.position.y <= mat.position.y + H
  );

  const centerX = mat.position.x + (COL + SYM / 2);
  const leftExpr  = toExpr(tilesInMat.filter(t => t.position.x < centerX));
  const rightExpr = toExpr(tilesInMat.filter(t => t.position.x >= centerX));

  return (
    <div style={{ position: 'relative', cursor: 'grab', touchAction: 'none' }}
      onPointerDown={onPointerDown}>
      {/* Mat border */}
      <div style={{ width: W, height: H,
        border: `2px solid ${isSelected ? '#08b8fb' : '#cbd5e1'}`,
        borderRadius: 8, position: 'relative', background: '#fff', boxSizing: 'border-box' }}>

        {/* Row dividers */}
        {Array.from({ length: mat.rows - 1 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0,
            top: (i + 1) * H_ROW, height: 1, background: '#e2e8f0' }} />
        ))}

        {/* Center column */}
        <div style={{ position: 'absolute', left: COL, top: 0, bottom: 0,
          width: SYM, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%',
            width: 1, background: '#94a3b8', transform: 'translateX(-50%)' }} />
          <div style={{ width: 44, height: 44, borderRadius: '50%',
            border: '2px solid #94a3b8', background: '#fff', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#475569' }}>
            {mat.symbol}
          </div>
        </div>

        {/* Resize handles */}
        {isSelected && <>
          <div data-resize-handle="s" style={{ position: 'absolute', width: 10, height: 10,
            background: '#08b8fb', borderRadius: 2, bottom: -5, left: '50%', transform: 'translateX(-50%)',
            cursor: 'ns-resize', zIndex: 3, pointerEvents: 'auto' }} />
          <div data-resize-handle="e" style={{ position: 'absolute', width: 10, height: 10,
            background: '#08b8fb', borderRadius: 2, right: -5, top: '50%', transform: 'translateY(-50%)',
            cursor: 'ew-resize', zIndex: 3, pointerEvents: 'auto' }} />
          <div data-resize-handle="se" style={{ position: 'absolute', width: 10, height: 10,
            background: '#08b8fb', borderRadius: 2, bottom: -5, right: -5,
            cursor: 'se-resize', zIndex: 3, pointerEvents: 'auto' }} />
        </>}
      </div>

      {/* Expression label */}
      {mat.showLabels && (
        <div style={{
          position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)',
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8,
          padding: '4px 14px', fontSize: 13, fontWeight: 600, color: '#334155',
          whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', pointerEvents: 'none',
        }}>
          {leftExpr} {mat.symbol} {rightExpr}
        </div>
      )}
    </div>
  );
}

// ─── Factors Mat visual ───────────────────────────────────────────────────────
function FactorsMatVisual({ mat, tiles, isSelected, onPointerDown }: {
  mat: MatItem; tiles: ManipulativeItem[]; isSelected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const TRACK = 70, PRODUCT = 400;
  const W = mat.width || (TRACK + PRODUCT);
  const H = mat.height || (TRACK + PRODUCT);

  const toExpr = (list: ManipulativeItem[]) => {
    const c: Record<string, number> = {};
    list.forEach(i => { c[i.type] = (c[i.type] || 0) + (i.isNegative ? -1 : 1); });
    const p: string[] = [];
    if (c.x2) p.push(Math.abs(c.x2) === 1 ? (c.x2 < 0 ? '-x²' : 'x²') : `${c.x2}x²`);
    if (c.x)  p.push(Math.abs(c.x)  === 1 ? (c.x  < 0 ? '-x'  : 'x')  : `${c.x}x`);
    if (c.unit) p.push(`${c.unit}`);
    return p.join(' + ').replace(/\+ -/g, '− ') || '0';
  };

  // Filter tiles inside mat bounds
  const tilesInMat = tiles.filter(t =>
    t.position.x >= mat.position.x && t.position.x <= mat.position.x + W &&
    t.position.y >= mat.position.y && t.position.y <= mat.position.y + H
  );

  const relX = (t: ManipulativeItem) => t.position.x - mat.position.x;
  const relY = (t: ManipulativeItem) => t.position.y - mat.position.y;
  const topItems     = tilesInMat.filter(t => relY(t) < TRACK);
  const leftItems    = tilesInMat.filter(t => relX(t) < TRACK && relY(t) >= TRACK);
  const productItems = tilesInMat.filter(t => relX(t) >= TRACK && relY(t) >= TRACK);

  return (
    <div style={{ position: 'relative', cursor: 'grab', touchAction: 'none' }}
      onPointerDown={onPointerDown}>
      <div style={{ width: W, height: H, position: 'relative' }}>
        {/* Top factor track */}
        <div style={{ position: 'absolute', left: TRACK, top: 0, width: PRODUCT, height: TRACK,
          border: `1.5px solid ${isSelected ? '#08b8fb' : '#94a3b8'}`,
          background: '#fafafa', boxSizing: 'border-box' }} />
        {/* Left factor track */}
        <div style={{ position: 'absolute', left: 0, top: TRACK, width: TRACK, height: PRODUCT,
          border: `1.5px solid ${isSelected ? '#08b8fb' : '#94a3b8'}`,
          background: '#fafafa', boxSizing: 'border-box' }} />
        {/* Product area */}
        <div style={{ position: 'absolute', left: TRACK, top: TRACK, width: PRODUCT, height: PRODUCT,
          border: `1.5px solid ${isSelected ? '#08b8fb' : '#94a3b8'}`,
          background: '#fff', boxSizing: 'border-box' }} />

        {/* Resize handles */}
        {isSelected && <>
          <div data-resize-handle="s" style={{ position: 'absolute', width: 10, height: 10,
            background: '#08b8fb', borderRadius: 2, bottom: -5, left: '50%', transform: 'translateX(-50%)',
            cursor: 'ns-resize', zIndex: 3, pointerEvents: 'auto' }} />
          <div data-resize-handle="e" style={{ position: 'absolute', width: 10, height: 10,
            background: '#08b8fb', borderRadius: 2, right: -5, top: '50%', transform: 'translateY(-50%)',
            cursor: 'ew-resize', zIndex: 3, pointerEvents: 'auto' }} />
          <div data-resize-handle="se" style={{ position: 'absolute', width: 10, height: 10,
            background: '#08b8fb', borderRadius: 2, bottom: -5, right: -5,
            cursor: 'se-resize', zIndex: 3, pointerEvents: 'auto' }} />
        </>}

        {mat.factorShowLabels && <>
          {/* Top label */}
          <div style={{ position: 'absolute', top: -26, left: TRACK, width: PRODUCT, textAlign: 'center',
            fontSize: 13, fontWeight: 600, color: '#475569', pointerEvents: 'none' }}>
            {toExpr(topItems)}
          </div>
          {/* Left label */}
          <div style={{ position: 'absolute', left: -40, top: TRACK, height: PRODUCT,
            display: 'flex', alignItems: 'center',
            fontSize: 13, fontWeight: 600, color: '#475569', pointerEvents: 'none' }}>
            {toExpr(leftItems)}
          </div>
          {/* Product label */}
          <div style={{ position: 'absolute', bottom: -28, left: TRACK, width: PRODUCT, textAlign: 'center',
            fontSize: 13, fontWeight: 600, color: '#475569', pointerEvents: 'none' }}>
            {toExpr(productItems)}
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── Draggable Mat wrapper ────────────────────────────────────────────────────
function DraggableMat({ mat, tiles, isSelected, zoom, onSelect, onDragEnd, onResize, children }: {
  mat: MatItem; tiles: ManipulativeItem[]; isSelected: boolean; zoom: number;
  onSelect: () => void; onDragEnd: (pos: Position) => void; onResize: (w: number, h: number) => void; children: React.ReactNode;
}) {
  const start  = useRef({ x: 0, y: 0 });
  const origin = useRef<Position>({ x: 0, y: 0 });
  const originSize = useRef({ w: 0, h: 0 });
  const dragging = useRef(false);
  const resizing = useRef<string | null>(null);
  const moved    = useRef(false);
  const selfRef  = useRef<HTMLDivElement>(null);

  const onPD = (e: React.PointerEvent) => {
    // If clicked on a child manipulative-item, don't start mat drag
    if ((e.target as HTMLElement).closest('.manipulative-item')) return;
    // If clicked on a resize handle
    const handle = (e.target as HTMLElement).closest('[data-resize-handle]');
    if (handle) {
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      resizing.current = handle.getAttribute('data-resize-handle');
      start.current = { x: e.clientX, y: e.clientY };
      originSize.current = { w: mat.width || 0, h: mat.height || 0 };
      onSelect();
      return;
    }
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true; moved.current = false;
    start.current  = { x: e.clientX, y: e.clientY };
    origin.current = { ...mat.position };
    onSelect();
  };
  const onPM = (e: React.PointerEvent) => {
    if (resizing.current) {
      const dx = (e.clientX - start.current.x) / zoom;
      const dy = (e.clientY - start.current.y) / zoom;
      let nw = originSize.current.w, nh = originSize.current.h;
      const h = resizing.current;
      if (h.includes('e')) nw = Math.max(200, originSize.current.w + dx);
      if (h.includes('s')) nh = Math.max(120, originSize.current.h + dy);
      onResize(nw, nh);
      return;
    }
    if (!dragging.current) return;
    const dx = (e.clientX - start.current.x) / zoom;
    const dy = (e.clientY - start.current.y) / zoom;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
    if (selfRef.current) {
      selfRef.current.style.left = `${origin.current.x + dx}px`;
      selfRef.current.style.top  = `${origin.current.y + dy}px`;
    }
  };
  const onPU = (e: React.PointerEvent) => {
    if (resizing.current) { resizing.current = null; return; }
    if (!dragging.current) return;
    dragging.current = false;
    if (moved.current) {
      const dx = (e.clientX - start.current.x) / zoom;
      const dy = (e.clientY - start.current.y) / zoom;
      onDragEnd({ x: origin.current.x + dx, y: origin.current.y + dy });
    }
  };

  return (
    <div ref={selfRef}
      data-mat-id={mat.id}
      style={{ position: 'absolute', left: mat.position.x, top: mat.position.y,
        zIndex: isSelected ? 5 : 3, touchAction: 'none' }}
      onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU}>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AlgebraTiles({
  interactionMode, clearTrigger, resetTrigger, zoom, mode,
}: {
  interactionMode: 'select' | 'pen' | 'eraser';
  clearTrigger: number; resetTrigger: number; zoom: number; mode: AlgebraMode;
}) {
  const [items, setItems]             = useState<ManipulativeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mats, setMats]               = useState<MatItem[]>([]);
  const [selectedMatId, setSelectedMatId] = useState<string | null>(null);

  const dragOrigins  = useRef<Record<string, Position>>({});
  const pointerStart = useRef({ x: 0, y: 0 });
  const isDragging   = useRef(false);
  const didMove      = useRef(false);
  const itemRefs     = useRef<Record<string, HTMLDivElement | null>>({});
  const matRefs      = useRef<Record<string, HTMLDivElement | null>>({});

  // Reset on resetTrigger
  useEffect(() => { setItems([]); setSelectedIds([]); setMats([]); setSelectedMatId(null); }, [resetTrigger]);

  // Add default mat when entering solving/factors mode
  useEffect(() => {
    setItems([]); setSelectedIds([]); setMats([]); setSelectedMatId(null);
    if (mode === 'solving') {
      setMats([{
        id: generateId(), kind: 'solving', position: { x: 40, y: 30 },
        symbol: '=', rows: 1, showLabels: true, factorShowLabels: true,
      }]);
    } else if (mode === 'factors') {
      setMats([{
        id: generateId(), kind: 'factors', position: { x: 40, y: 30 },
        symbol: '=', rows: 1, showLabels: true, factorShowLabels: true,
      }]);
    }
  }, [mode]);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const effectiveSize = useCallback((item: ManipulativeItem) => {
    const { w, h } = TILE_SIZES[item.type as keyof typeof TILE_SIZES] ?? { w: 40, h: 40 };
    const rotated = (item.rotation || 0) % 180 !== 0;
    return { w: rotated ? h : w, h: rotated ? w : h };
  }, []);

  const snapOne = useCallback((id: string, list: ManipulativeItem[]): ManipulativeItem[] => {
    const item = list.find(i => i.id === id);
    if (!item) return list;
    const is = effectiveSize(item);
    let best = { ...item.position }, minD = 22;
    list.forEach(other => {
      if (other.id === id) return;
      const os = effectiveSize(other);
      [
        { x: other.position.x + os.w, y: other.position.y },
        { x: other.position.x - is.w, y: other.position.y },
        { x: other.position.x,        y: other.position.y + os.h },
        { x: other.position.x,        y: other.position.y - is.h },
      ].forEach(c => {
        const d = Math.hypot(c.x - item.position.x, c.y - item.position.y);
        if (d < minD) { minD = d; best = c; }
      });
    });
    return list.map(i => i.id === id ? { ...i, position: best } : i);
  }, [effectiveSize]);

  // ── add item ──────────────────────────────────────────────────────────────────
  const addItem = useCallback((type: string, isNegative = false) => {
    setItems(prev => {
      const { w, h } = TILE_SIZES[type as keyof typeof TILE_SIZES];
      let pos: Position = { x: 100, y: 80 };
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const ls = effectiveSize(last);
        pos = { x: last.position.x + ls.w, y: last.position.y };
        if (pos.x + w > 900) pos = { x: 100, y: last.position.y + ls.h };
      }
      const newItem: ManipulativeItem = {
        id: generateId(), type, position: pos, rotation: 0, color: '', width: w, height: h, isNegative,
      };
      return snapOne(newItem.id, [...prev, newItem]);
    });
  }, [effectiveSize, snapOne]);

  // ── add mat ───────────────────────────────────────────────────────────────────
  const addMat = () => {
    const lastMat = mats[mats.length - 1];
    const pos = lastMat
      ? { x: lastMat.position.x + (mode === 'solving' ? 580 : 530), y: lastMat.position.y }
      : { x: 40, y: 30 };
    setMats(prev => [...prev, {
      id: generateId(), kind: mode as 'solving' | 'factors',
      position: pos, symbol: '=', rows: 1, showLabels: true, factorShowLabels: true,
    }]);
  };

  // ── tile drag ─────────────────────────────────────────────────────────────────
  const onTilePointerDown = (e: React.PointerEvent, id: string) => {
    if (interactionMode !== 'select') return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDragging.current = true; didMove.current = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    const ids = selectedIds.includes(id) ? selectedIds : [id];
    const origins: Record<string, Position> = {};
    items.forEach(i => { if (ids.includes(i.id) && !i.isLocked) origins[i.id] = { ...i.position }; });
    dragOrigins.current = origins;
    if (!selectedIds.includes(id)) setSelectedIds([id]);
    setSelectedMatId(null);
  };
  const onTilePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - pointerStart.current.x) / zoom;
    const dy = (e.clientY - pointerStart.current.y) / zoom;
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) didMove.current = true;
    setItems(prev => prev.map(item => {
      const o = dragOrigins.current[item.id];
      return o ? { ...item, position: { x: o.x + dx, y: o.y + dy } } : item;
    }));
  };
  const onTilePointerUp = (e: React.PointerEvent, id: string) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!didMove.current) {
      const multi = e.shiftKey || e.ctrlKey || e.metaKey;
      setSelectedIds(prev => multi
        ? (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) : [id]);
      dragOrigins.current = {}; return;
    }
    const movedIds = Object.keys(dragOrigins.current);
    setItems(prev => { let n = [...prev]; movedIds.forEach(mid => { n = snapOne(mid, n); }); return n; });
    setTimeout(() => checkZeroPair(movedIds), 80);
    dragOrigins.current = {};
  };

  // ── zero pair ────────────────────────────────────────────────────────────────
  const checkZeroPair = (movedIds: string[]) => {
    setItems(cur => {
      for (const mid of movedIds) {
        const m = cur.find(i => i.id === mid); if (!m) continue;
        const opp = cur.find(o => o.id !== mid && o.type === m.type && o.isNegative !== m.isNegative &&
          Math.abs(o.position.x - m.position.x) < 8 && Math.abs(o.position.y - m.position.y) < 8);
        if (opp) { setTimeout(() => animateZP(mid, opp.id), 0); break; }
      }
      return cur;
    });
  };
  const animateZP = async (id1: string, id2: string) => {
    setItems(prev => {
      const a = prev.find(i => i.id === id1), b = prev.find(i => i.id === id2);
      if (!a || !b) return prev;
      const mx = (a.position.x + b.position.x) / 2, my = (a.position.y + b.position.y) / 2;
      return prev.map(i => (i.id === id1 || i.id === id2) ? { ...i, position: { x: mx, y: my } } : i);
    });
    await new Promise(r => setTimeout(r, 340));
    setItems(prev => prev.filter(i => i.id !== id1 && i.id !== id2));
    setSelectedIds(prev => prev.filter(id => id !== id1 && id !== id2));
  };
  const handleZPAction = async () => {
    const sel = items.filter(i => selectedIds.includes(i.id));
    const pos = sel.filter(i => !i.isNegative), neg = sel.filter(i => i.isNegative);
    const pairs: { a: ManipulativeItem; b: ManipulativeItem }[] = [];
    const rp = [...pos], rn = [...neg];
    for (let i = rp.length - 1; i >= 0; i--) {
      const ni = rn.findIndex(n => n.type === rp[i].type);
      if (ni !== -1) { pairs.push({ a: rp[i], b: rn[ni] }); rp.splice(i, 1); rn.splice(ni, 1); }
    }
    if (!pairs.length) return;
    const pairIds = pairs.flatMap(p => [p.a.id, p.b.id]);
    setItems(prev => prev.map(item => {
      const pair = pairs.find(p => p.a.id === item.id || p.b.id === item.id);
      if (!pair) return item;
      return { ...item, position: { x: (pair.a.position.x + pair.b.position.x) / 2, y: (pair.a.position.y + pair.b.position.y) / 2 } };
    }));
    await new Promise(r => setTimeout(r, 340));
    setItems(prev => prev.filter(i => !pairIds.includes(i.id)));
    setSelectedIds(prev => prev.filter(id => !pairIds.includes(id)));
  };

  // ── item ops ──────────────────────────────────────────────────────────────────
  const updateItem  = (id: string, u: Partial<ManipulativeItem>) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...u } : i));
  const deleteItems = (ids: string[]) => {
    const ok = ids.filter(id => !items.find(i => i.id === id)?.isLocked);
    setItems(prev => prev.filter(i => !ok.includes(i.id))); setSelectedIds([]);
  };
  const duplicateItems = (ids: string[]) => {
    const copies = items.filter(i => ids.includes(i.id) && !i.isLocked)
      .map(i => ({ ...i, id: generateId(), position: { x: i.position.x + 8, y: i.position.y + 8 } }));
    setItems(prev => [...prev, ...copies]); setSelectedIds(copies.map(c => c.id));
  };
  const invertItems = (ids: string[]) => setItems(prev => prev.map(i => ids.includes(i.id) && !i.isLocked ? { ...i, isNegative: !i.isNegative } : i));
  const toggleLock  = (ids: string[]) => { const al = ids.every(id => items.find(i => i.id === id)?.isLocked); setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, isLocked: !al } : i)); };

  // ── mat ops ───────────────────────────────────────────────────────────────────
  const updateMat    = (id: string, u: Partial<MatItem>) => setMats(prev => prev.map(m => m.id === id ? { ...m, ...u } : m));
  const deleteMat    = (id: string) => { setMats(prev => prev.filter(m => m.id !== id)); if (selectedMatId === id) setSelectedMatId(null); };
  const duplicateMat = (id: string) => {
    const m = mats.find(mat => mat.id === id); if (!m) return;
    setMats(prev => [...prev, { ...m, id: generateId(), position: { x: m.position.x + 20, y: m.position.y + 20 } }]);
  };
  const resizeMat = (id: string, w: number, h: number) => updateMat(id, { width: w, height: h });

  const menuItem    = items.find(i => i.id === selectedIds[0]);
  const selectedMat = mats.find(m => m.id === selectedMatId);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', userSelect: 'none' }}>

      {/* ── Tray ────────────────────────────────────────────────────────────── */}
      <div style={{ width: 80, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 20, gap: 8, zIndex: 20, overflowY: 'auto' }}>
        <TrayBtn label="1"    bg="#facc15" w={40} h={40} onClick={() => addItem('unit')} />
        <TrayBtn label="-1"   bg="#ef4444" w={40} h={40} onClick={() => addItem('unit', true)} />
        <Div />
        <TrayBtn label="x"    bg="#22c55e" w={40} h={64} onClick={() => addItem('x')} />
        <TrayBtn label="-x"   bg="#ef4444" w={40} h={64} onClick={() => addItem('x', true)} />
        <Div />
        <TrayBtn label="x²"   bg="#3b82f6" w={56} h={56} onClick={() => addItem('x2')} />
        <TrayBtn label="-x²"  bg="#ef4444" w={56} h={56} onClick={() => addItem('x2', true)} />
        {(mode === 'solving' || mode === 'factors') && (
          <>
            <Div />
            <TrayBtn label="+ Mat" bg="#08b8fb" w={56} h={32} onClick={addMat} />
          </>
        )}
      </div>

      {/* ── Workspace ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Workspace
          items={items} onItemUpdate={updateItem}
          onItemDelete={id => deleteItems([id])}
          onItemAdd={item => setItems(prev => [...prev, item])}
          onSelectionChange={ids => { setSelectedIds(ids); setSelectedMatId(null); }}
          selectedIds={selectedIds}
          isDrawing={interactionMode === 'pen'}
          clearTrigger={clearTrigger} zoom={zoom}
        >
          {/* ── Mats ── */}
          {mats.map(mat => (
            <DraggableMat key={mat.id} mat={mat} tiles={items}
              isSelected={selectedMatId === mat.id} zoom={zoom}
              onSelect={() => { setSelectedMatId(mat.id); setSelectedIds([]); }}
              onDragEnd={pos => updateMat(mat.id, { position: pos })}
              onResize={(w, h) => resizeMat(mat.id, w, h)}
            >
              {mat.kind === 'solving'
                ? <SolvingMatVisual mat={mat} tiles={items} isSelected={selectedMatId === mat.id}
                    onPointerDown={() => {}} />
                : <FactorsMatVisual mat={mat} tiles={items} isSelected={selectedMatId === mat.id}
                    onPointerDown={() => {}} />
              }
            </DraggableMat>
          ))}

          {/* ── Tiles ── */}
          <AnimatePresence>
            {items.map(item => {
              const isSelected = selectedIds.includes(item.id);
              const { w, h } = effectiveSize(item);
              return (
                <motion.div key={item.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.18 } }}
                  ref={(el: HTMLDivElement | null) => { itemRefs.current[item.id] = el; }}
                  className="manipulative-item"
                  style={{ position: 'absolute', left: item.position.x, top: item.position.y,
                    width: w, height: h, zIndex: isSelected ? 20 : 10,
                    cursor: interactionMode === 'select' ? 'grab' : 'default', touchAction: 'none' }}
                  onPointerDown={e => onTilePointerDown(e, item.id)}
                  onPointerMove={onTilePointerMove}
                  onPointerUp={e => onTilePointerUp(e, item.id)}
                >
                  <TileVisual type={item.type} isNegative={item.isNegative}
                    isLocked={item.isLocked} rotation={item.rotation || 0} isSelected={isSelected} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </Workspace>
      </div>

      {/* ── Tile menu ───────────────────────────────────────────────────────── */}
      {selectedIds.length > 0 && menuItem && (
        <TileMenu selectedIds={selectedIds} itemRefs={itemRefs} items={items}
          isMulti={selectedIds.length > 1}
          onRotate={() => updateItem(menuItem.id, { rotation: ((menuItem.rotation || 0) + 90) % 360 })}
          onInvert={() => invertItems(selectedIds.length > 1 ? selectedIds : [menuItem.id])}
          onDuplicate={() => duplicateItems(selectedIds.length > 1 ? selectedIds : [menuItem.id])}
          onLock={() => toggleLock(selectedIds.length > 1 ? selectedIds : [menuItem.id])}
          onDelete={() => deleteItems(selectedIds.length > 1 ? selectedIds : [menuItem.id])}
          onZeroPair={handleZPAction}
        />
      )}

      {/* ── Mat menu ────────────────────────────────────────────────────────── */}
      {selectedMat && (() => {
        // Build a ref pointing at the mat DOM element via DraggableMat's ref
        // We pass a fake anchorEl from the mat's bounding rect tracked differently
        // Use a hidden tracking div approach: find mat DOM by data attribute
        const el = document.querySelector(`[data-mat-id="${selectedMat.id}"]`) as HTMLDivElement | null;
        return (
          <MatMenu anchorEl={el} mat={selectedMat}
            onUpdate={u => updateMat(selectedMat.id, u)}
            onDuplicate={() => duplicateMat(selectedMat.id)}
            onDelete={() => deleteMat(selectedMat.id)}
          />
        );
      })()}
    </div>
  );
}

function TrayBtn({ label, bg, w, h, onClick }: { label: string; bg: string; w: number; h: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: w, height: h, background: bg,
      border: '2px solid rgba(0,0,0,0.15)', borderRadius: 4, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0, transition: 'transform 0.12s', userSelect: 'none' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >{label}</button>
  );
}
function Div() { return <div style={{ height: 1, width: 40, background: '#e2e8f0', margin: '4px 0' }} />; }