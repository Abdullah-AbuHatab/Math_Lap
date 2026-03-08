import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn, generateId } from '../../../utils/helpers';
import { ManipulativeItem, Position } from '../../../types';
import Workspace from '../../workspace/Workspace';
import { Clock as ClockIcon, Trash2 } from 'lucide-react';

// ── Clock Face ────────────────────────────────────────────────────────────────
export function ClockFace({
  hours, minutes, onTimeChange, size = 260,
}: {
  hours: number; minutes: number;
  onTimeChange: (h: number, m: number) => void;
  size?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<'hour' | 'minute' | null>(null);

  const getAngle = (e: MouseEvent | TouchEvent) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    return (angle + 360) % 360;
  };

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      const a = getAngle(e);
      if (draggingRef.current === 'minute') {
        onTimeChange(hours, Math.round(a / 6) % 60);
      } else {
        onTimeChange((Math.floor(a / 30) % 12) || 12, minutes);
      }
    };
    const up = () => { draggingRef.current = null; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [hours, minutes, onTimeChange]);

  const hourAngle   = (hours % 12) * 30 + (minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <div className="relative bg-white rounded-full shadow-lg border-8 border-slate-200 select-none" style={{ width: size, height: size }}>
      <svg ref={svgRef} viewBox="0 0 200 200" className="w-full h-full">
        <circle cx="100" cy="100" r="95" fill="white" stroke="#e2e8f0" strokeWidth="2" />
        {/* tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = i * 6 * (Math.PI / 180);
          const isMajor = i % 5 === 0;
          const inner = isMajor ? 82 : 88;
          return (
            <line key={i}
              x1={100 + inner * Math.sin(a)} y1={100 - inner * Math.cos(a)}
              x2={100 + 92  * Math.sin(a)} y2={100 - 92  * Math.cos(a)}
              stroke={isMajor ? '#475569' : '#cbd5e1'} strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}
        {/* Numbers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i + 1) * 30 * (Math.PI / 180);
          return (
            <text key={i} x={100 + 70 * Math.sin(a)} y={100 - 70 * Math.cos(a)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="14" fontWeight="700" fill="#1e293b">{i + 1}</text>
          );
        })}
        {/* Hour hand */}
        <g transform={`rotate(${hourAngle},100,100)`} onMouseDown={() => draggingRef.current = 'hour'} onTouchStart={() => draggingRef.current = 'hour'} style={{ cursor: 'pointer' }}>
          <line x1="100" y1="100" x2="100" y2="48" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
          <circle cx="100" cy="48" r="5" fill="#0f172a" />
        </g>
        {/* Minute hand */}
        <g transform={`rotate(${minuteAngle},100,100)`} onMouseDown={() => draggingRef.current = 'minute'} onTouchStart={() => draggingRef.current = 'minute'} style={{ cursor: 'pointer' }}>
          <line x1="100" y1="100" x2="100" y2="28" stroke="#08b8fb" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="28" r="4" fill="#08b8fb" />
        </g>
        <circle cx="100" cy="100" r="5" fill="#0f172a" />
      </svg>
      {/* Digital display */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-0.5 rounded-lg font-mono text-lg tracking-widest">
        {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
      </div>
    </div>
  );
}

// ── Draggable clock wrapper ───────────────────────────────────────────────────
function DraggableClock({
  item, isSelected, showMenu, zoom, canDrag,
  onDragStart, onDrag, onDragEnd, onClick,
  onTimeChange, onDelete,
}: {
  item: ManipulativeItem; isSelected: boolean; showMenu: boolean; zoom: number; canDrag: boolean;
  onDragStart: () => void; onDrag: (dx: number, dy: number) => void; onDragEnd: () => void;
  onClick: (multi: boolean) => void;
  onTimeChange: (h: number, m: number) => void; onDelete: () => void;
}) {
  const dragging = useRef(false);
  const start    = useRef({ x: 0, y: 0 });
  const moved    = useRef(false);
  const SIZE = 260;

  const onPointerDown = (e: React.PointerEvent) => {
    // If clicking on the SVG hands, let the clock handle it
    if ((e.target as Element).closest('svg')) return;
    if (!canDrag) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    dragging.current = true; moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    onDragStart();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - start.current.x, dy = e.clientY - start.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
    onDrag(dx, dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false; onDragEnd();
    if (!moved.current) onClick(e.shiftKey || e.ctrlKey || e.metaKey);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.15 } }}
      className={cn('absolute z-10 manipulative-item', canDrag ? 'cursor-grab' : 'cursor-default', isSelected && 'z-20')}
      style={{ left: item.position.x, top: item.position.y, width: SIZE, height: SIZE,
        outline: isSelected ? '3px solid #08b8fb' : 'none', outlineOffset: 4, borderRadius: '50%' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    >
      <ClockFace hours={item.value || 12} minutes={item.isNegative ? 30 : 0} onTimeChange={onTimeChange} size={SIZE} />
      {showMenu && (
        <div
          className="absolute flex items-center gap-1 bg-white shadow-lg border border-slate-200 p-1 rounded-lg z-[9999]"
          style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }}
          onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
        >
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Clock component ──────────────────────────────────────────────────────
export default function Clock({ interactionMode, clearTrigger, resetTrigger, zoom }:
  { interactionMode: 'select' | 'pen' | 'eraser'; clearTrigger: number; resetTrigger: number; zoom: number }) {

  const [items, setItems] = useState<ManipulativeItem[]>([
    { id: generateId(), type: 'clock', position: { x: 80, y: 60 }, rotation: 0, color: '', width: 260, height: 260, value: 12, isNegative: false },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dragOrigins = useRef<Record<string, Position>>({});

  useEffect(() => { setItems([]); setSelectedIds([]); }, [resetTrigger]);

  const addItem = () => {
    setItems(prev => {
      const last = prev[prev.length - 1];
      const pos = last ? { x: last.position.x + 280, y: last.position.y } : { x: 80, y: 60 };
      return [...prev, { id: generateId(), type: 'clock', position: pos, rotation: 0, color: '', width: 260, height: 260, value: 12, isNegative: false }];
    });
  };

  const handleDragStart = (id: string) => {
    const ids = selectedIds.includes(id) ? selectedIds : [id];
    const o: Record<string, Position> = {};
    items.forEach(i => { if (ids.includes(i.id)) o[i.id] = { ...i.position }; });
    dragOrigins.current = o;
    if (!selectedIds.includes(id)) setSelectedIds([id]);
  };
  const handleDrag = (_id: string, dx: number, dy: number) => {
    const sdx = dx / zoom, sdy = dy / zoom;
    setItems(prev => prev.map(i => {
      const o = dragOrigins.current[i.id];
      return o ? { ...i, position: { x: o.x + sdx, y: o.y + sdy } } : i;
    }));
  };
  const handleDragEnd = () => { dragOrigins.current = {}; };

  const updateItem = (id: string, u: Partial<ManipulativeItem>) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...u } : i));
  const deleteItems = (ids: string[]) => { setItems(prev => prev.filter(i => !ids.includes(i.id))); setSelectedIds([]); };

  return (
    <div className="w-full h-full flex">
      <div className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 z-20">
        <button onClick={addItem} className="w-12 h-12 bg-pink-500 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center text-white">
          <ClockIcon size={24} />
        </button>
      </div>

      <div className="flex-1 relative">
        <Workspace items={items} onItemUpdate={updateItem} onItemDelete={id => deleteItems([id])}
          onItemAdd={item => setItems(p => [...p, item])} onSelectionChange={setSelectedIds}
          selectedIds={selectedIds} isDrawing={interactionMode === 'pen'} clearTrigger={clearTrigger} zoom={zoom}>
          <AnimatePresence>
            {items.map(item => (
              <DraggableClock
                key={item.id} item={item} isSelected={selectedIds.includes(item.id)}
                showMenu={selectedIds[0] === item.id && selectedIds.length > 0}
                zoom={zoom} canDrag={interactionMode === 'select'}
                onDragStart={() => handleDragStart(item.id)}
                onDrag={(dx, dy) => handleDrag(item.id, dx, dy)}
                onDragEnd={() => handleDragEnd()}
                onClick={multi => {
                  if (multi) setSelectedIds(p => p.includes(item.id) ? p.filter(i => i !== item.id) : [...p, item.id]);
                  else setSelectedIds([item.id]);
                }}
                onTimeChange={(h, m) => updateItem(item.id, { value: h, isNegative: m >= 30 })}
                onDelete={() => deleteItems([item.id])}
              />
            ))}
          </AnimatePresence>
        </Workspace>
      </div>
    </div>
  );
}