import React, { useState } from 'react';
import {
  LayoutGrid,
  Clock as ClockIcon,
  Box,
  Square,
  RotateCcw,
  Plus,
  Minus,
  Maximize,
  PenTool,
  Eraser,
  MousePointer2,
  Layers,
  Check,
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { ToolType } from '../../types';

export type AlgebraMode = 'basic' | 'solving' | 'factors';

interface ShellProps {
  children: React.ReactNode;
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  interactionMode: 'select' | 'pen' | 'eraser';
  onInteractionModeChange: (mode: 'select' | 'pen' | 'eraser') => void;
  onClearCanvas?: () => void;
  onReset?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  // algebra-tiles workspace mode
  algebraMode?: AlgebraMode;
  onAlgebraModeChange?: (m: AlgebraMode) => void;
}

const ALGEBRA_MODES: { id: AlgebraMode; label: string }[] = [
  { id: 'basic',   label: 'Basic'   },
  { id: 'solving', label: 'Solving' },
  { id: 'factors', label: 'Factors' },
];

export default function Shell({
  children,
  activeTool,
  onToolChange,
  interactionMode,
  onInteractionModeChange,
  onClearCanvas,
  onReset,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  algebraMode = 'basic',
  onAlgebraModeChange,
}: ShellProps) {
  const [isSidebarOpen] = useState(true);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const tools = [
    { id: 'algebra-tiles',  icon: LayoutGrid, label: 'Algebra Tiles'   },
    { id: 'base-ten-blocks',icon: Box,        label: 'Base Ten Blocks' },
    { id: 'clock',          icon: ClockIcon,  label: 'Clock'           },
    { id: 'color-tiles',    icon: Square,     label: 'Color Tiles'     },
  ] as const;

  const currentMode = ALGEBRA_MODES.find(m => m.id === algebraMode);

  return (
    <div className="flex h-screen w-full bg-string-bg-alt font-sans" style={{ userSelect: 'none' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={cn(
        'flex flex-col bg-white border-r border-string-border z-20',
        isSidebarOpen ? 'w-64' : 'w-20',
      )}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-string-border">
          <div className="w-10 h-10 rounded-xl bg-string-pink flex items-center justify-center text-white shadow-string-glow">
            <Layers size={24} />
          </div>
          {isSidebarOpen && (
            <span className="font-display font-bold text-xl tracking-tight text-string-navy">String</span>
          )}
        </div>

        {/* Tool nav */}
        <nav className="flex-1 px-3 py-4 space-y-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all group',
                activeTool === tool.id
                  ? 'bg-string-bg-alt text-string-blue shadow-string-sm'
                  : 'text-string-navy-muted hover:bg-string-bg-alt hover:text-string-navy',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110',
                activeTool === tool.id ? 'bg-string-blue text-white' : 'bg-string-bg-alt',
              )}>
                <tool.icon size={20} />
              </div>
              {isSidebarOpen && <span className="font-medium">{tool.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-string-border space-y-1">
          {/* Reset */}
          <button
            onClick={onReset}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
            title="Reset All"
          >
            <RotateCcw size={20} />
            {isSidebarOpen && <span className="font-medium">Reset All</span>}
          </button>

          {/* Workspace mode switcher — only shown for Algebra Tiles */}
          {activeTool === 'algebra-tiles' && onAlgebraModeChange && (
            <div className="relative">
              <button
                onClick={() => setModeMenuOpen(v => !v)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                  modeMenuOpen
                    ? 'bg-string-bg-alt text-string-blue'
                    : 'text-string-navy-muted hover:bg-string-bg-alt hover:text-string-navy',
                )}
                title="Workspace mode"
              >
                {/* 3-line icon */}
                <div className="w-10 h-10 rounded-lg bg-string-bg-alt flex flex-col items-center justify-center gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-4 h-0.5 bg-current rounded-full" />
                  ))}
                </div>
                {isSidebarOpen && (
                  <span className="font-medium">{currentMode?.label ?? 'Basic'}</span>
                )}
              </button>

              {/* Dropdown */}
              {modeMenuOpen && (
                <div
                  className="absolute bottom-full left-0 mb-1 w-full bg-white border border-string-border rounded-xl shadow-string-lg overflow-hidden z-50"
                  style={{ minWidth: 140 }}
                >
                  {ALGEBRA_MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onAlgebraModeChange(m.id); setModeMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-string-bg-alt transition-colors"
                      style={{
                        color: algebraMode === m.id ? '#08b8fb' : '#334155',
                        fontWeight: algebraMode === m.id ? 600 : 400,
                      }}
                    >
                      {m.label}
                      {algebraMode === m.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col relative overflow-hidden"
        onClick={() => { if (modeMenuOpen) setModeMenuOpen(false); }}
      >
        {/* Header */}
        <header className="h-16 bg-white border-b border-string-border flex items-center justify-between px-6 z-10 shrink-0">
          <h2 className="font-display font-bold text-lg text-string-navy">
            {tools.find(t => t.id === activeTool)?.label}
            {activeTool === 'algebra-tiles' && currentMode && (
              <span className="ml-2 text-sm font-normal text-string-navy-muted">
                — {currentMode.label}
              </span>
            )}
          </h2>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-string-bg-alt p-1 rounded-lg">
              {(
                [
                  { mode: 'select' as const, Icon: MousePointer2, title: 'Select' },
                  { mode: 'pen'    as const, Icon: PenTool,        title: 'Pen'    },
                  { mode: 'eraser' as const, Icon: Eraser,         title: 'Eraser' },
                ] as const
              ).map(({ mode, Icon, title }) => (
                <button
                  key={mode}
                  onClick={() => onInteractionModeChange(mode)}
                  title={title}
                  className={cn(
                    'p-1.5 rounded transition-all',
                    interactionMode === mode
                      ? 'bg-white shadow-string-sm text-string-blue'
                      : 'text-string-navy-muted hover:bg-white/50',
                  )}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-string-border" />

            <button
              onClick={onClearCanvas}
              className="p-2 rounded-lg bg-string-bg-alt text-string-navy-muted hover:bg-slate-200 transition-all"
              title="Clear Drawing"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative bg-white overflow-hidden">
          {children}
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
          <div className="flex flex-col bg-white rounded-xl shadow-string-lg border border-string-border p-1">
            <button onClick={onZoomIn}    className="p-2 rounded-lg hover:bg-string-bg-alt text-string-navy-muted" title="Zoom In"><Plus size={20} /></button>
            <div className="h-px bg-string-border mx-2" />
            <button onClick={onZoomOut}   className="p-2 rounded-lg hover:bg-string-bg-alt text-string-navy-muted" title="Zoom Out"><Minus size={20} /></button>
            <div className="h-px bg-string-border mx-2" />
            <button onClick={onZoomReset} className="p-2 rounded-lg hover:bg-string-bg-alt text-string-navy-muted" title="Reset Zoom"><Maximize size={20} /></button>
          </div>
        </div>
      </main>
    </div>
  );
}