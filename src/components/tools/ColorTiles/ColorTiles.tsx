import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn, generateId } from '../../../utils/helpers';
import { ManipulativeItem, Position } from '../../../types';
import Workspace from '../../workspace/Workspace';
import { Trash2, Copy, RotateCw } from 'lucide-react';

const COLORS = [
  { id: 'red',    class: 'bg-red-500    border-red-600'    },
  { id: 'blue',   class: 'bg-blue-500   border-blue-600'   },
  { id: 'yellow', class: 'bg-yellow-400 border-yellow-500' },
  { id: 'green',  class: 'bg-green-500  border-green-600'  },
  { id: 'orange', class: 'bg-orange-500 border-orange-600' },
  { id: 'purple', class: 'bg-purple-500 border-purple-600' },
];

const SNAP = 42; // tile size + gap

function DraggableTile({
  item, isSelected, showMenu, zoom, canDrag,
  onDragStart, onDrag, onDragEnd, onClick,
  onRotate, onDuplicate, onDelete,
}: {
  item: ManipulativeItem; isSelected: boolean; showMenu: boolean; zoom: number; canDrag: boolean;
  onDragStart: () => void; onDrag: (dx: number, dy: number) => void; onDragEnd: () => void;
  onClick: (multi: boolean) => void;
  onRotate: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const dragging = useRef(false);
  const start    = useRef({ x: 0, y: 0 });
  const moved    = useRef(false);

  const colorEntry = COLORS.find(c => c.id === item.color) || COLORS[0];

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
      className={cn('absolute z-10 manipulative-item', canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default', isSelected && 'z-20')}
      style={{ left: item.position.x, top: item.position.y, width: 40, height: 40,
        outline: isSelected ? '2px solid #08b8fb' : 'none', outlineOffset: 2, borderRadius: 3 }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    >
      <div style={{ transform: `rotate(${item.rotation || 0}deg)`, width: '100%', height: '100%', transformOrigin: 'center' }}>
        <div className={cn('w-10 h-10 rounded-sm border-2', colorEntry.class)} />
      </div>
      {showMenu && (
        <div
          className="absolute flex items-center gap-1 bg-white shadow-lg border border-slate-200 p-1 rounded-lg z-[9999]"
          style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, whiteSpace: 'nowrap' }}
          onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
        >
          <button onClick={onRotate}    className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><RotateCw size={14} /></button>
          <button onClick={onDuplicate} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Copy size={14} /></button>
          <button onClick={onDelete}    className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
        </div>
      )}
    </motion.div>
  );
}

export default function ColorTiles({ interactionMode, clearTrigger, resetTrigger, zoom }:
  { interactionMode: 'select' | 'pen' | 'eraser'; clearTrigger: number; resetTrigger: number; zoom: number }) {

  const [items, setItems]     = useState<ManipulativeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeColor, setActiveColor] = useState(COLORS[0].id);
  const dragOrigins = useRef<Record<string, Position>>({});

  useEffect(() => { setItems([]); setSelectedIds([]); }, [resetTrigger]);

  const addItem = (colorId: string) => {
    setItems(prev => {
      let pos: Position = { x: 80, y: 80 };
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        pos = { x: last.position.x + 44, y: last.position.y };
        if (pos.x > 620) pos = { x: 80, y: last.position.y + 44 };
      }
      return [...prev, { id: generateId(), type: 'tile', position: pos, rotation: 0, color: colorId, width: 40, height: 40 }];
    });
  };

  const snapItem = (id: string, current: ManipulativeItem[]): ManipulativeItem[] => {
    const item = current.find(i => i.id === id);
    if (!item) return current;
    let best = { ...item.position }, minD = 16;
    current.forEach(other => {
      if (other.id === id) return;
      [
        { x: other.position.x + 42, y: other.position.y },
        { x: other.position.x - 42, y: other.position.y },
        { x: other.position.x,      y: other.position.y + 42 },
        { x: other.position.x,      y: other.position.y - 42 },
      ].forEach(c => {
        const d = Math.hypot(c.x - item.position.x, c.y - item.position.y);
        if (d < minD) { minD = d; best = c; }
      });
    });
    return current.map(i => i.id === id ? { ...i, position: best } : i);
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

  return (
    <div className="w-full h-full flex">
      <div className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-3 z-20">
        {COLORS.map(c => (
          <button
            key={c.id}
            onClick={() => { setActiveColor(c.id); addItem(c.id); }}
            className={cn('w-10 h-10 rounded-lg border-2 shadow-sm hover:scale-110 transition-all', c.class,
              activeColor === c.id ? 'ring-2 ring-offset-1 ring-slate-900' : '')}
          />
        ))}
      </div>

      <div className="flex-1 relative">
        <Workspace items={items} onItemUpdate={updateItem} onItemDelete={id => deleteItems([id])}
          onItemAdd={item => setItems(p => [...p, item])} onSelectionChange={setSelectedIds}
          selectedIds={selectedIds} isDrawing={interactionMode === 'pen'} clearTrigger={clearTrigger} zoom={zoom}>
          <AnimatePresence>
            {items.map(item => (
              <DraggableTile
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