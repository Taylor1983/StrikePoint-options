import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  Minimize2,
  Maximize2,
  Minus,
  X,
  Move,
  Layers,
  Sparkles,
  TrendingUp,
  LineChart,
  Table,
  Sliders,
  Globe,
  Plus,
} from 'lucide-react';
import { TerminalScreen } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';

export interface PopOutWindow {
  id: string;
  title: string;
  screen: TerminalScreen;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

interface PopOutWindowManagerProps {
  windows: PopOutWindow[];
  onCloseWindow: (id: string) => void;
  onUpdateWindow: (id: string, updates: Partial<PopOutWindow>) => void;
  onBringToFront: (id: string) => void;
  renderScreenContent: (screen: TerminalScreen, isPopOut?: boolean) => React.ReactNode;
}

export const PopOutWindowManager: React.FC<PopOutWindowManagerProps> = ({
  windows,
  onCloseWindow,
  onUpdateWindow,
  onBringToFront,
  renderScreenContent,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStartRef = useRef<{ w: number; h: number; mouseX: number; mouseY: number }>({
    w: 0,
    h: 0,
    mouseX: 0,
    mouseY: 0,
  });

  // Global mouse move and mouse up listeners for dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingId) {
        const newX = Math.max(10, Math.min(window.innerWidth - 150, e.clientX - dragOffsetRef.current.x));
        const newY = Math.max(30, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y));
        onUpdateWindow(draggingId, { x: newX, y: newY });
      } else if (resizingId) {
        const deltaW = e.clientX - resizeStartRef.current.mouseX;
        const deltaH = e.clientY - resizeStartRef.current.mouseY;
        const newW = Math.max(380, Math.min(window.innerWidth - 40, resizeStartRef.current.w + deltaW));
        const newH = Math.max(260, Math.min(window.innerHeight - 60, resizeStartRef.current.h + deltaH));
        onUpdateWindow(resizingId, { width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      if (draggingId || resizingId) {
        setDraggingId(null);
        setResizingId(null);
      }
    };

    if (draggingId || resizingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, resizingId, onUpdateWindow]);

  if (windows.length === 0) return null;

  return (
    <>
      {/* 1. Active Floating Pop-Out Windows */}
      {windows.map((win) => {
        if (win.isMinimized) return null;

        const isMax = win.isMaximized;
        const winStyle: React.CSSProperties = isMax
          ? {
              position: 'fixed',
              top: 36,
              left: 8,
              right: 8,
              bottom: 36,
              zIndex: win.zIndex,
            }
          : {
              position: 'fixed',
              left: `${win.x}px`,
              top: `${win.y}px`,
              width: `${win.width}px`,
              height: `${win.height}px`,
              zIndex: win.zIndex,
            };

        return (
          <div
            key={win.id}
            style={winStyle}
            onClick={() => onBringToFront(win.id)}
            className="flex flex-col bg-[#080d18] border-2 border-[#1e2a44] rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.85)] overflow-hidden font-mono text-xs select-none animate-in zoom-in-95 duration-150"
          >
            {/* Pop-Out Window Header Bar (Draggable) */}
            <div
              onMouseDown={(e) => {
                if (isMax) return;
                onBringToFront(win.id);
                setDraggingId(win.id);
                dragOffsetRef.current = {
                  x: e.clientX - win.x,
                  y: e.clientY - win.y,
                };
              }}
              className="bg-[#101726] border-b border-[#1e2a44] px-3 py-1.5 flex items-center justify-between cursor-move text-white shrink-0"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
                <span className="font-bold tracking-wide text-xs truncate">
                  [POP-OUT] {win.title}
                </span>
                <span className="text-[10px] text-[#8b9bb4] uppercase hidden sm:inline">
                  ({win.screen})
                </span>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Minimize Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playKeyClick();
                    onUpdateWindow(win.id, { isMinimized: true });
                  }}
                  className="p-1 rounded hover:bg-[#1e2638] text-[#8b9bb4] hover:text-white cursor-pointer"
                  title="Minimize window to bottom taskbar"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                {/* Maximize / Restore Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playKeyClick();
                    onUpdateWindow(win.id, { isMaximized: !win.isMaximized });
                  }}
                  className="p-1 rounded hover:bg-[#1e2638] text-[#8b9bb4] hover:text-white cursor-pointer"
                  title={isMax ? 'Restore window size' : 'Maximize window'}
                >
                  {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Close / Pop-In Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playKeyClick();
                    onCloseWindow(win.id);
                  }}
                  className="p-1 rounded hover:bg-[#ef4444] text-[#8b9bb4] hover:text-white cursor-pointer transition-colors"
                  title="Pop in / Close window"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Window Content Area */}
            <div className="flex-1 overflow-auto bg-black p-1">
              {renderScreenContent(win.screen, true)}
            </div>

            {/* Resizing Handle (Bottom-Right) */}
            {!isMax && (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onBringToFront(win.id);
                  setResizingId(win.id);
                  resizeStartRef.current = {
                    w: win.width,
                    h: win.height,
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                  };
                }}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 text-[#8b9bb4] hover:text-[#00e5ff]"
                title="Drag to resize window"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" className="fill-current">
                  <path d="M7 1L1 7M7 4L4 7M7 7L7 7" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {/* 2. Minimized Windows Dock / Taskbar Pills at Bottom Screen */}
      {windows.some((w) => w.isMinimized) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#0b101c]/95 backdrop-blur-md border border-[#1e2a44] p-1.5 rounded-full shadow-2xl animate-in slide-in-from-bottom-2 select-none">
          <span className="text-[10px] text-[#8b9bb4] px-2 font-bold uppercase">
            MINIMIZED ({windows.filter((w) => w.isMinimized).length}):
          </span>
          {windows
            .filter((w) => w.isMinimized)
            .map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  playKeyClick();
                  onUpdateWindow(w.id, { isMinimized: false });
                  onBringToFront(w.id);
                }}
                className="px-2.5 py-1 rounded-full bg-[#141b28] hover:bg-[#1e2638] text-white border border-[#222d44] hover:border-[#00e5ff] text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                <span>{w.title}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseWindow(w.id);
                  }}
                  className="text-[#8b9bb4] hover:text-[#ef4444] ml-1"
                >
                  &times;
                </span>
              </button>
            ))}
        </div>
      )}
    </>
  );
};
