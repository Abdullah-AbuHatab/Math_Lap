import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn, generateId } from '../../../utils/helpers';
import { ManipulativeItem, Position } from '../../../types';
import Workspace from '../../workspace/Workspace';
import { Square, Box, Layers, Scissors, Combine, Trash2, Copy, RotateCw } from 'lucide-react';

const BLOCK_SIZES = {
  unit: { w: 22, h: 22 },
  rod:  { w: 22, h: 220 },
  flat: { w: 220, h: 220 },
} as const;

const BLOCK_COLORS = {
  unit: 'bg-yellow-400 border-yellow-500',
  rod:  'bg-green-500  border-green-600',
  flat: 'bg-blue-400   border-blue-500',
} as const;

function BaseTenBlock({ type, rotation = 0 }: { type: 'unit' | 'rod' | 'flat'; rotation?: number }) {
  const { w, h } = BLOCK_SIZES[type];
  return (
    <div
      className={cn('relative rounded-sm border-2', BLOCK_COLORS[type])}
      style={{ width: w, height: h, transform: `rotate(${rotation}deg)` }}
    >
      {type === 'rod' && (
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex-1 border-b border-black/10 last:border-b-0" />
          ))}
        </div>
      )}
      {type === 'flat' && (
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(10,1fr)', gridTemplateRows: 'repeat(10,1fr)' }}>
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="border border-black/10" />
          ))}
        </div>
      )}
    </div>
  );
}

function getEffectiveSize(item: ManipulativeItem) {
  const { w, h } = BLOCK_SIZES[item.type as keyof typeof BLOCK_SIZES];
  return (item.rotation || 0) % 180 === 0 ? { w, h } : { w: h, h: w };
}

// ── Draggable wrapper (pointer-based, no framer-motion drag) ──────────────────
function DraggableBlock({
  item, isSelected, showMenu, zoom, canDrag,
  onDragStart, onDrag, onDragEnd, onClick,
  onRotate, onBreak, onDuplicate, onDelete,
}: {
  item: ManipulativeItem; isSelected: boolean; showMenu: boolean; zoom: number; canDrag: boolean;
  onDragStart: () => void; onDrag: (dx: number, dy: number) => void; onDragEnd: () => void;
  onClick: (multi: boolean) => void;
  onRotate: () => void; onBreak?: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const dragging = useRef(false);
  const start    = useRef({ x: 0, y: 0 });
  const moved    = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canDrag) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    dragging.current = true; moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    onDragStart();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
    onDrag(dx, dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false; onDragEnd();
    if (!moved.current) onClick(e.shiftKey || e.ctrlKey || e.metaKey);
  };

  const { w, h } = BLOCK_SIZES[item.type as keyof typeof BLOCK_SIZES];
  const rot = item.rotation || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.15 } }}
      className={cn('absolute z-10 manipulative-item', canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default', isSelected && 'z-20')}
      style={{ left: item.position.x, top: item.position.y, width: w, height: h,
        outline: isSelected ? '2px solid #08b8fb' : 'none', outlineOffset: 2, borderRadius: 3 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div style={{ transform: `rotate(${rot}deg)`, width: '100%', height: '100%', transformOrigin: 'center' }}>
        <BaseTenBlock type={item.type as any} rotation={0} />
      </div>
      {showMenu && (
        <div
          className="absolute flex items-center gap-1 bg-white shadow-lg border border-slate-200 p-1 rounded-lg z-[9999]"
          style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onRotate}    className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><RotateCw size={14} /></button>
          {onBreak && <button onClick={onBreak} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="Break"><Scissors size={14} /></button>}
          <button onClick={onDuplicate} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Copy size={14} /></button>
          <button onClick={onDelete}    className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
        </div>
      )}
    </motion.div>
  );
}

export default function BaseTenBlocks({ interactionMode, clearTrigger, resetTrigger, zoom }:
  { interactionMode: 'select' | 'pen' | 'eraser'; clearTrigger: number; resetTrigger: number; zoom: number }) {

  const [items, setItems] = useState<ManipulativeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dragOrigins = useRef<Record<string, Position>>({});

  useEffect(() => { setItems([]); setSelectedIds([]); }, [resetTrigger]);

  const addItem = (type: string) => {
    setItems(prev => {
      const { w, h } = BLOCK_SIZES[type as keyof typeof BLOCK_SIZES];
      let pos: Position = { x: 80, y: 80 };
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const ls = getEffectiveSize(last);
        pos = { x: last.position.x + ls.w + 4, y: last.position.y };
        if (pos.x > 620) pos = { x: 80, y: last.position.y + ls.h + 8 };
      }
      return [...prev, { id: generateId(), type, position: pos, rotation: 0, color: '', width: w, height: h }];
    });
  };

  const snapItem = (id: string, currentItems: ManipulativeItem[]): ManipulativeItem[] => {
    const item = currentItems.find(i => i.id === id);
    if (!item) return currentItems;
    const is = getEffectiveSize(item);
    let best = { ...item.position }, minD = 24;
    currentItems.forEach(other => {
      if (other.id === id) return;
      const os = getEffectiveSize(other);
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
    return currentItems.map(i => i.id === id ? { ...i, position: best } : i);
  };

  const handleDragStart = (id: string) => {
    const ids = selectedIds.includes(id) ? selectedIds : [id];
    const o: Record<string, Position> = {};
    items.forEach(item => { if (ids.includes(item.id)) o[item.id] = { ...item.position }; });
    dragOrigins.current = o;
    if (!selectedIds.includes(id)) setSelectedIds([id]);
  };
  const handleDrag = (id: string, dx: number, dy: number) => {
    const sdx = dx / zoom, sdy = dy / zoom;
    setItems(prev => prev.map(i => {
      const o = dragOrigins.current[i.id];
      return o ? { ...i, position: { x: o.x + sdx, y: o.y + sdy } } : i;
    }));
  };
  const handleDragEnd = (id: string) => {
    const ids = Object.keys(dragOrigins.current);
    setItems(prev => { let n = [...prev]; ids.forEach(sid => { n = snapItem(sid, n); }); return n; });
    dragOrigins.current = {};
  };

  const updateItem  = (id: string, u: Partial<ManipulativeItem>) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...u } : i));
  const deleteItems = (ids: string[]) => { setItems(prev => prev.filter(i => !ids.includes(i.id))); setSelectedIds([]); };
  const duplicateItems = (ids: string[]) => {
    const copies = items.filter(i => ids.includes(i.id)).map(i => ({ ...i, id: generateId(), position: { x: i.position.x + 8, y: i.position.y + 8 } }));
    setItems(prev => [...prev, ...copies]);
    setSelectedIds(copies.map(c => c.id));
  };

  const breakBlock = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    let pieces: ManipulativeItem[] = [];
    if (item.type === 'flat') {
      for (let i = 0; i < 10; i++) pieces.push({ id: generateId(), type: 'rod', position: { x: item.position.x + i * 24, y: item.position.y }, rotation: 0, color: '' });
    } else if (item.type === 'rod') {
      for (let i = 0; i < 10; i++) pieces.push({ id: generateId(), type: 'unit', position: { x: item.position.x, y: item.position.y + i * 24 }, rotation: 0, color: '' });
    }
    if (pieces.length) { setItems([...items.filter(i => i.id !== id), ...pieces]); setSelectedIds([]); }
  };

  const groupUnits = () => {
    const units = items.filter(i => i.type === 'unit');
    if (units.length < 10) return;
    const ten = units.slice(0, 10);
    const avgX = ten.reduce((a, i) => a + i.position.x, 0) / 10;
    const avgY = ten.reduce((a, i) => a + i.position.y, 0) / 10;
    setItems([...items.filter(i => !ten.find(u => u.id === i.id)),
      { id: generateId(), type: 'rod', position: { x: avgX, y: avgY }, rotation: 0, color: '' }]);
  };

  return (
    <div className="w-full h-full flex">
      <div className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 z-20">
        <button onClick={() => addItem('unit')} className="w-8 h-8 bg-yellow-400 border-2 border-yellow-500 rounded-sm shadow-sm hover:scale-110 transition-transform" title="Unit" />
        <div className="h-px w-10 bg-slate-200" />
        <button onClick={() => addItem('rod')}  className="w-6 h-20 bg-green-500 border-2 border-green-600 rounded-sm shadow-sm hover:scale-110 transition-transform" title="Rod" />
        <div className="h-px w-10 bg-slate-200" />
        <button onClick={() => addItem('flat')} className="w-14 h-14 bg-blue-400 border-2 border-blue-500 rounded-sm shadow-sm hover:scale-110 transition-transform" title="Flat" />
        <div className="h-px w-10 bg-slate-200" />
        <button onClick={groupUnits} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-all" title="Group 10 units → rod"><Combine size={20} /></button>
      </div>

      <div className="flex-1 relative">
        {/* Place value columns */}
        <div className="absolute inset-0 flex pointer-events-none z-0">
          {['Hundreds', 'Tens', 'Ones'].map((label, i) => (
            <div key={label} className={cn('flex-1 flex flex-col items-center pt-3', i < 2 && 'border-r border-slate-200')}>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">{label}</span>
            </div>
          ))}
        </div>

        <Workspace items={items} onItemUpdate={updateItem} onItemDelete={id => deleteItems([id])}
          onItemAdd={item => setItems(p => [...p, item])} onSelectionChange={setSelectedIds}
          selectedIds={selectedIds} isDrawing={interactionMode === 'pen'} clearTrigger={clearTrigger} zoom={zoom}>
          <AnimatePresence>
            {items.map(item => (
              <DraggableBlock
                key={item.id} item={item} isSelected={selectedIds.includes(item.id)}
                showMenu={selectedIds[0] === item.id && selectedIds.length > 0}
                zoom={zoom} canDrag={interactionMode === 'select'}
                onDragStart={() => handleDragStart(item.id)}
                onDrag={(dx, dy) => handleDrag(item.id, dx, dy)}
                onDragEnd={() => handleDragEnd(item.id)}
                onClick={multi => {
                  if (multi) setSelectedIds(p => p.includes(item.id) ? p.filter(i => i !== item.id) : [...p, item.id]);
                  else setSelectedIds([item.id]);
                }}
                onRotate={() => updateItem(item.id, { rotation: ((item.rotation || 0) + 90) % 360 })}
                onBreak={(item.type === 'flat' || item.type === 'rod') ? () => breakBlock(item.id) : undefined}
                onDuplicate={() => duplicateItems(selectedIds.includes(item.id) && selectedIds.length > 1 ? selectedIds : [item.id])}
                onDelete={() => deleteItems(selectedIds.includes(item.id) && selectedIds.length > 1 ? selectedIds : [item.id])}
              />
            ))}
          </AnimatePresence>
        </Workspace>
      </div>
    </div>
  );
}