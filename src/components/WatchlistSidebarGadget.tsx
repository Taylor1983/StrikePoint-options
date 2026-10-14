import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Filter,
  Globe,
  SlidersHorizontal,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Maximize2,
  Minimize2,
  Move,
  GripHorizontal,
  GripVertical,
  PanelLeft,
  ArrowLeftToLine,
  X,
  RotateCcw,
  Folder,
  FolderPlus,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  Sparkles,
} from 'lucide-react';
import { Ticker } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';

export type WatchlistMarketTab = 'us' | 'cad' | 'folders' | 'split' | 'all';
export type WatchlistSubFilter = 'all' | 'stocks' | 'futures';

export interface WatchlistFolder {
  id: string;
  name: string;
  color: string;
  symbols: string[];
  isCollapsed?: boolean;
}

export const CANADIAN_FUTURES = ['/SXF', '/SXM', '/CGB', '/CRA', '/SCF', '/CGF', '/6C'];

export function getTickerCategory(symbol: string): 'us_stock' | 'us_future' | 'cad_stock' | 'cad_future' {
  if (CANADIAN_FUTURES.includes(symbol)) return 'cad_future';
  if (symbol.startsWith('/')) return 'us_future';
  if (symbol.endsWith('.TO') || symbol === 'DLR.TO') return 'cad_stock';
  return 'us_stock';
}

export const FOLDER_COLOR_PALETTE = [
  { name: 'Cyan', hex: '#38bdf8', bg: 'bg-[#38bdf8]', text: 'text-[#38bdf8]', border: 'border-[#38bdf8]' },
  { name: 'Amber', hex: '#f59e0b', bg: 'bg-[#f59e0b]', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]' },
  { name: 'Emerald', hex: '#10b981', bg: 'bg-[#10b981]', text: 'text-[#10b981]', border: 'border-[#10b981]' },
  { name: 'Purple', hex: '#a855f7', bg: 'bg-[#a855f7]', text: 'text-[#a855f7]', border: 'border-[#a855f7]' },
  { name: 'Rose', hex: '#f43f5e', bg: 'bg-[#f43f5e]', text: 'text-[#f43f5e]', border: 'border-[#f43f5e]' },
  { name: 'Orange', hex: '#ff9900', bg: 'bg-[#ff9900]', text: 'text-[#ff9900]', border: 'border-[#ff9900]' },
];

export const DEFAULT_WATCHLIST_FOLDERS: WatchlistFolder[] = [
  {
    id: 'folder-tech',
    name: 'Tech Giants',
    color: '#38bdf8',
    symbols: ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMD'],
    isCollapsed: false,
  },
  {
    id: 'folder-energy',
    name: 'Energy & Commodities',
    color: '#f59e0b',
    symbols: ['XOM', '/CL', '/NG', 'SU.TO', 'CNQ.TO'],
    isCollapsed: false,
  },
  {
    id: 'folder-swing',
    name: 'Swing Trades',
    color: '#10b981',
    symbols: ['SPY', 'QQQ', 'META', 'AMZN', 'BABA'],
    isCollapsed: false,
  },
  {
    id: 'folder-defense',
    name: 'Defense & Vol',
    color: '#a855f7',
    symbols: ['VIX', 'LMT', 'GLD', '/GC'],
    isCollapsed: false,
  },
];

interface WatchlistSidebarGadgetProps {
  tickers: Record<string, Ticker>;
  selectedSymbol: string;
  onSelectTicker: (symbol: string) => void;
  onOpenFullBlotter?: () => void;
  onOpenTSXFuturesHub?: () => void;
}

export const WatchlistSidebarGadget: React.FC<WatchlistSidebarGadgetProps> = ({
  tickers,
  selectedSymbol,
  onSelectTicker,
  onOpenFullBlotter,
  onOpenTSXFuturesHub,
}) => {
  // Navigation tabs and filters
  const [marketTab, setMarketTab] = useState<WatchlistMarketTab>('us');
  const [subFilter, setSubFilter] = useState<WatchlistSubFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Custom Folders State
  const [folders, setFolders] = useState<WatchlistFolder[]>(() => {
    try {
      const saved = localStorage.getItem('sp_watchlist_custom_folders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_WATCHLIST_FOLDERS;
  });

  // Drag and drop state
  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; color: string } | null>(null);

  // Folder creation and inline editing state
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderColor, setNewFolderColor] = useState<string>('#38bdf8');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');

  // Quick Add Symbol to specific folder
  const [quickAddFolderId, setQuickAddFolderId] = useState<string | null>(null);
  const [quickAddSearch, setQuickAddSearch] = useState<string>('');

  // Available Ticker Drawer in Folders Tab
  const [isAvailablePoolOpen, setIsAvailablePoolOpen] = useState<boolean>(false);
  const [availablePoolSearch, setAvailablePoolSearch] = useState<string>('');

  // Window roll up / down state
  const [isRolledUp, setIsRolledUp] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sp_watchlist_rolledup') === 'true';
    } catch {
      return false;
    }
  });

  // Docked gadget height (drag up/down to roll up / resize)
  const [gadgetHeight, setGadgetHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sp_watchlist_gadget_height');
      return saved ? Math.max(160, Math.min(800, parseInt(saved, 10))) : 420;
    } catch {
      return 420;
    }
  });

  // Vertical resize dragging state
  const [isResizingVertical, setIsResizingVertical] = useState<boolean>(false);
  const resizeVerticalStartYRef = useRef<{ startY: number; startHeight: number }>({ startY: 0, startHeight: 420 });
  const currentHeightRef = useRef<number>(gadgetHeight);

  useEffect(() => {
    currentHeightRef.current = gadgetHeight;
  }, [gadgetHeight]);

  // Persist folders to localStorage
  const saveFolders = (updated: WatchlistFolder[]) => {
    setFolders(updated);
    try {
      localStorage.setItem('sp_watchlist_custom_folders', JSON.stringify(updated));
    } catch {}
  };

  const showToast = (message: string, color: string = '#38bdf8') => {
    setFeedbackToast({ message, color });
    setTimeout(() => {
      setFeedbackToast((prev) => (prev?.message === message ? null : prev));
    }, 2400);
  };

  // Drag up/down resizer event listeners
  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (isResizingVertical) {
        const deltaY = clientY - resizeVerticalStartYRef.current.startY;
        const newHeight = resizeVerticalStartYRef.current.startHeight + deltaY;
        const clamped = Math.max(160, Math.min(800, newHeight));
        setGadgetHeight(clamped);
        setIsRolledUp(false);
        try {
          localStorage.setItem('sp_watchlist_gadget_height', String(clamped));
          localStorage.setItem('sp_watchlist_rolledup', 'false');
        } catch {}
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientY);
    };

    const handleEnd = () => {
      if (isResizingVertical) {
        setIsResizingVertical(false);
      }
    };

    if (isResizingVertical) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isResizingVertical]);

  // Section toggle for default categories
  const toggleSection = (id: string) => {
    playKeyClick();
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle folder collapse
  const toggleFolderCollapse = (folderId: string) => {
    playKeyClick();
    const updated = folders.map((f) =>
      f.id === folderId ? { ...f, isCollapsed: !f.isCollapsed } : f
    );
    saveFolders(updated);
  };

  // Create new folder
  const handleCreateFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    playExecutionChime();
    const newFolder: WatchlistFolder = {
      id: `folder-${Date.now()}`,
      name: trimmed,
      color: newFolderColor,
      symbols: [],
      isCollapsed: false,
    };

    saveFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);
    showToast(`Created folder "${trimmed}"`, newFolderColor);
  };

  // Delete folder
  const handleDeleteFolder = (folderId: string, folderName: string) => {
    playKeyClick();
    const updated = folders.filter((f) => f.id !== folderId);
    saveFolders(updated);
    showToast(`Removed folder "${folderName}"`, '#ff334b');
  };

  // Rename folder
  const handleSaveRename = (folderId: string) => {
    const trimmed = editingFolderName.trim();
    if (!trimmed) {
      setEditingFolderId(null);
      return;
    }
    playKeyClick();
    const updated = folders.map((f) =>
      f.id === folderId ? { ...f, name: trimmed } : f
    );
    saveFolders(updated);
    setEditingFolderId(null);
    setEditingFolderName('');
    showToast(`Renamed to "${trimmed}"`);
  };

  // Add symbol to folder
  const handleAddSymbolToFolder = (folderId: string, symbol: string) => {
    const targetFolder = folders.find((f) => f.id === folderId);
    if (!targetFolder) return;

    const upperSym = symbol.toUpperCase().trim();
    if (targetFolder.symbols.includes(upperSym)) {
      showToast(`${upperSym} already in "${targetFolder.name}"`, '#f59e0b');
      return;
    }

    playExecutionChime();
    const updated = folders.map((f) =>
      f.id === folderId ? { ...f, symbols: [...f.symbols, upperSym] } : f
    );
    saveFolders(updated);
    showToast(`Added ${upperSym} to "${targetFolder.name}"`, targetFolder.color);
  };

  // Remove symbol from folder
  const handleRemoveSymbolFromFolder = (folderId: string, symbol: string) => {
    playKeyClick();
    const targetFolder = folders.find((f) => f.id === folderId);
    const updated = folders.map((f) =>
      f.id === folderId ? { ...f, symbols: f.symbols.filter((s) => s !== symbol) } : f
    );
    saveFolders(updated);
    if (targetFolder) {
      showToast(`Removed ${symbol} from "${targetFolder.name}"`, '#94a3b8');
    }
  };

  // Reset to default folders
  const handleResetDefaultFolders = () => {
    playKeyClick();
    saveFolders(DEFAULT_WATCHLIST_FOLDERS);
    showToast('Reset to default custom folders', '#38bdf8');
  };

  // Group tickers by market and asset type
  const categorizedTickers = useMemo(() => {
    const usStocks: string[] = [];
    const usFutures: string[] = [];
    const cadStocks: string[] = [];
    const cadFutures: string[] = [];

    Object.keys(tickers).forEach((sym) => {
      const cat = getTickerCategory(sym);
      if (cat === 'us_stock') usStocks.push(sym);
      else if (cat === 'us_future') usFutures.push(sym);
      else if (cat === 'cad_stock') cadStocks.push(sym);
      else if (cat === 'cad_future') cadFutures.push(sym);
    });

    return { usStocks, usFutures, cadStocks, cadFutures };
  }, [tickers]);

  // Filter tickers based on search query
  const matchesSearch = (sym: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const t = tickers[sym];
    return (
      sym.toLowerCase().includes(q) ||
      (t?.name && t.name.toLowerCase().includes(q))
    );
  };

  const usStocksFiltered = categorizedTickers.usStocks.filter(matchesSearch);
  const usFuturesFiltered = categorizedTickers.usFutures.filter(matchesSearch);
  const cadStocksFiltered = categorizedTickers.cadStocks.filter(matchesSearch);
  const cadFuturesFiltered = categorizedTickers.cadFutures.filter(matchesSearch);

  // Market totals
  const usTotal = categorizedTickers.usStocks.length + categorizedTickers.usFutures.length;
  const cadTotal = categorizedTickers.cadStocks.length + categorizedTickers.cadFutures.length;
  const selectedTicker = tickers[selectedSymbol];

  // All unique symbols across the entire app
  const allAvailableSymbols = useMemo(() => {
    return Object.keys(tickers).sort();
  }, [tickers]);

  // Roll up / down toggles
  const handleToggleRollUp = () => {
    playKeyClick();
    setIsRolledUp((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sp_watchlist_rolledup', String(next));
      } catch {}
      return next;
    });
  };

  const handleSetHeight = (height: number) => {
    playKeyClick();
    const clamped = Math.max(160, Math.min(800, height));
    currentHeightRef.current = clamped;
    setGadgetHeight(clamped);
    setIsRolledUp(false);
    try {
      localStorage.setItem('sp_watchlist_gadget_height', String(clamped));
      localStorage.setItem('sp_watchlist_rolledup', 'false');
    } catch {}
  };

  // Render a standard draggable Ticker Row
  const renderTickerRow = (
    sym: string,
    isCanadian: boolean,
    isFuture: boolean,
    folderId?: string,
    showDragHandle: boolean = true
  ) => {
    const t = tickers[sym];
    if (!t) return null;
    const isSelected = sym === selectedSymbol;
    const isPositive = t.change >= 0;
    const isBeingDragged = draggedSymbol === sym;

    return (
      <tr
        key={`${folderId || 'row'}-${sym}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/plain', sym);
          e.dataTransfer.effectAllowed = 'copyMove';
          setDraggedSymbol(sym);
        }}
        onDragEnd={() => {
          setDraggedSymbol(null);
          setDragOverFolderId(null);
        }}
        onClick={() => {
          playKeyClick();
          onSelectTicker(sym);
        }}
        title={`Drag to categorize or Click to load ${sym} Option Chain <OMON>`}
        className={`group transition-colors cursor-pointer border-b border-[#1c2438] ${
          isSelected
            ? 'bg-[#1e2a44] border-l-2 border-l-[#ff9900]'
            : 'hover:bg-[#121a2c]'
        } ${isBeingDragged ? 'opacity-40 bg-[#1e293b]' : ''}`}
      >
        <td className="py-1.5 px-2 text-left">
          <div className="flex items-center gap-1.5">
            {/* Drag Handle */}
            {showDragHandle && (
              <span
                className="cursor-grab active:cursor-grabbing text-[#475569] group-hover:text-[#94a3b8] transition-colors -ml-0.5"
                title="Drag and drop into custom folders"
              >
                <GripVertical className="w-3 h-3" />
              </span>
            )}
            <span className="text-[10px]">
              {isCanadian ? '🇨🇦' : '🇺🇸'}
            </span>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1">
                <span
                  className={`font-mono font-bold text-[11px] ${
                    isSelected
                      ? 'text-[#ffaa22]'
                      : isFuture
                      ? 'text-[#ffd600]'
                      : isCanadian
                      ? 'text-[#38bdf8]'
                      : 'text-white'
                  }`}
                >
                  {sym}
                </span>
                {isFuture && (
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-[#ffd600]/15 text-[#ffd600] font-bold">
                    FUT
                  </span>
                )}
                {isCanadian && !isFuture && (
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-[#38bdf8]/15 text-[#38bdf8] font-bold">
                    TSX
                  </span>
                )}
                {t.ivRank !== undefined && t.ivRank > 50 && (
                  <span className="text-[8px] font-mono px-0.5 rounded bg-[#ff334b]/20 text-[#ff334b] font-bold" title={`High IV Rank: ${t.ivRank}%`}>
                    🔥{t.ivRank}%
                  </span>
                )}
              </div>
              <span className="text-[9px] text-[#64748b] truncate max-w-[105px] font-mono">
                {t.name}
              </span>
            </div>
          </div>
        </td>
        <td className="py-1.5 px-2 text-right font-mono">
          <div className="flex items-center justify-end gap-1.5">
            <div className="flex flex-col items-end leading-tight">
              <span className="font-bold text-[11px] text-[#e2e8f0]">
                {isCanadian ? 'CA$' : '$'}
                {t.price < 5
                  ? t.price.toFixed(3)
                  : t.price >= 1000
                  ? t.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
                  : t.price.toFixed(2)}
              </span>
              <div
                className={`flex items-center gap-0.5 text-[9.5px] font-bold ${
                  isPositive ? 'text-[#00e676]' : 'text-[#ff334b]'
                }`}
              >
                {isPositive ? <ArrowUpRight className="w-2.5 h-2.5 inline" /> : <ArrowDownRight className="w-2.5 h-2.5 inline" />}
                <span>{isPositive ? '+' : ''}{t.changePercent.toFixed(1)}%</span>
              </div>
            </div>

            {/* Remove from folder button */}
            {folderId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSymbolFromFolder(folderId, sym);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#64748b] hover:text-[#ff334b] hover:bg-[#ff334b]/15 transition-all cursor-pointer ml-1"
                title={`Remove ${sym} from this folder`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderSection = (
    title: string,
    badgeText: string,
    badgeColor: string,
    symbols: string[],
    sectionKey: string,
    isCanadian: boolean,
    isFuture: boolean
  ) => {
    const isCollapsed = !!collapsedSections[sectionKey];
    if (symbols.length === 0) return null;

    return (
      <div key={sectionKey} className="border-b border-[#1c2438] last:border-b-0">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#0e1422] hover:bg-[#141d30] text-[#94a3b8] hover:text-white transition-colors cursor-pointer select-none text-left"
        >
          <div className="flex items-center gap-1.5">
            {isCollapsed ? <ChevronRight className="w-3 h-3 text-[#64748b]" /> : <ChevronDown className="w-3 h-3 text-[#ff9900]" />}
            <span className="font-bold text-[10px] text-white tracking-wider font-mono">
              {title}
            </span>
            <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-mono font-bold ${badgeColor}`}>
              {badgeText} ({symbols.length})
            </span>
          </div>
        </button>
        {!isCollapsed && (
          <table className="w-full border-collapse">
            <tbody>
              {symbols.map((sym) => renderTickerRow(sym, isCanadian, isFuture))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Reusable Watchlist Body (tabs, filters, search, table)
  const renderWatchlistBody = (tableMaxHeight: number) => (
    <div className="flex flex-col relative">
      {/* Feedback Toast */}
      {feedbackToast && (
        <div
          className="absolute top-2 left-2 right-2 z-50 px-2 py-1.5 rounded shadow-lg flex items-center justify-between text-[10px] font-mono font-bold border transition-all animate-in fade-in slide-in-from-top-1 bg-[#090d16]/95 border-[#1e2a44]"
          style={{ borderColor: `${feedbackToast.color}66` }}
        >
          <div className="flex items-center gap-1.5" style={{ color: feedbackToast.color }}>
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>{feedbackToast.message}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-[#64748b] hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Primary Market & Folder Switcher Tabs */}
      <div className="grid grid-cols-5 p-1 gap-1 bg-[#090d16] border-b border-[#182236] text-[9px] font-mono font-bold">
        <button
          onClick={() => {
            playKeyClick();
            setMarketTab('us');
          }}
          className={`py-1 px-1 text-center rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            marketTab === 'us'
              ? 'bg-[#ff9900] text-black shadow-sm font-black'
              : 'text-[#94a3b8] hover:text-white bg-[#0e1422] hover:bg-[#141e33]'
          }`}
          title="US Market Watchlist (Stocks & CME Futures)"
        >
          <span>🇺🇸</span>
          <span className="hidden min-[340px]:inline">US</span>
          <span>({usTotal})</span>
        </button>
        <button
          onClick={() => {
            playKeyClick();
            setMarketTab('cad');
          }}
          className={`py-1 px-1 text-center rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            marketTab === 'cad'
              ? 'bg-[#ff334b] text-white shadow-sm font-black'
              : 'text-[#94a3b8] hover:text-white bg-[#0e1422] hover:bg-[#141e33]'
          }`}
          title="Canadian Market Watchlist (TSX & MX Futures)"
        >
          <span>🇨🇦</span>
          <span className="hidden min-[340px]:inline">CA</span>
          <span>({cadTotal})</span>
        </button>
        <button
          onClick={() => {
            playKeyClick();
            setMarketTab('folders');
          }}
          className={`py-1 px-1 text-center rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            marketTab === 'folders'
              ? 'bg-[#00e5ff] text-black shadow-[0_0_10px_rgba(0,229,255,0.4)] font-black'
              : 'text-[#00e5ff] hover:text-white bg-[#0e1422] hover:bg-[#141e33] border border-[#00e5ff]/20'
          }`}
          title="Custom Folders & Categories with Drag-and-Drop (Tech, Energy, Swing Trades)"
        >
          <Folder className="w-2.5 h-2.5 shrink-0" />
          <span className="hidden min-[340px]:inline">FOLDERS</span>
          <span className="text-[8px] px-1 py-0.2 rounded bg-black/30 font-mono">
            {folders.length}
          </span>
        </button>
        <button
          onClick={() => {
            playKeyClick();
            setMarketTab('split');
          }}
          className={`py-1 px-1 text-center rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            marketTab === 'split'
              ? 'bg-[#38bdf8] text-black shadow-sm font-black'
              : 'text-[#94a3b8] hover:text-white bg-[#0e1422] hover:bg-[#141e33]'
          }`}
          title="Side-by-Side Dual View: US and Canadian Watchlists"
        >
          <Layers className="w-2.5 h-2.5" />
          <span>DUAL</span>
        </button>
        <button
          onClick={() => {
            playKeyClick();
            setMarketTab('all');
          }}
          className={`py-1 px-1 text-center rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            marketTab === 'all'
              ? 'bg-[#a855f7] text-white shadow-sm font-black'
              : 'text-[#94a3b8] hover:text-white bg-[#0e1422] hover:bg-[#141e33]'
          }`}
          title="All Instruments Grouped by Market"
        >
          <span>ALL</span>
        </button>
      </div>

      {/* Sub-Category Filters (Only when on single market) */}
      {(marketTab === 'us' || marketTab === 'cad') && (
        <div className="flex items-center justify-between px-2 py-1 bg-[#0b101c] border-b border-[#182236] text-[9px] font-mono">
          <div className="flex items-center gap-1 text-[#64748b]">
            <Filter className="w-2.5 h-2.5" />
            <span>FILTER:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                playKeyClick();
                setSubFilter('all');
              }}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                subFilter === 'all'
                  ? 'bg-[#1e2a44] text-[#38bdf8] border border-[#38bdf8]/40'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSubFilter('stocks');
              }}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                subFilter === 'stocks'
                  ? 'bg-[#1e2a44] text-[#38bdf8] border border-[#38bdf8]/40'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              STOCKS ({marketTab === 'us' ? categorizedTickers.usStocks.length : categorizedTickers.cadStocks.length})
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSubFilter('futures');
              }}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                subFilter === 'futures'
                  ? 'bg-[#1e2a44] text-[#ffd600] border border-[#ffd600]/40'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              /FUTURES ({marketTab === 'us' ? categorizedTickers.usFutures.length : categorizedTickers.cadFutures.length})
            </button>
          </div>
        </div>
      )}

      {/* Search Input Filter */}
      <div className="px-2 py-1 bg-[#0a0e18] border-b border-[#182236]">
        <div className="flex items-center gap-1.5 bg-[#05070c] border border-[#1e293b] rounded px-1.5 py-0.5">
          <Search className="w-3 h-3 text-[#64748b] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              marketTab === 'folders'
                ? 'Filter symbols inside folders...'
                : `Filter ${marketTab === 'us' ? 'US' : marketTab === 'cad' ? 'Canadian' : 'all'} tickers...`
            }
            className="w-full bg-transparent border-none text-[10px] text-white font-mono placeholder-[#475569] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#64748b] hover:text-white text-[9px] font-mono px-1 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Watchlist Table Contents with adjustable scroll height */}
      <div
        className="gadget-content p-0 overflow-y-auto scrollbar-thin transition-all"
        style={{ maxHeight: `${tableMaxHeight}px` }}
      >
        {/* VIEW 1: CUSTOM FOLDERS VIEW (DRAG AND DROP) */}
        {marketTab === 'folders' && (
          <div className="p-1 space-y-2">
            {/* Folder Header Toolbar */}
            <div className="p-1.5 bg-[#0e1424] border border-[#1c2742] rounded flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span className="text-[10px] font-mono font-bold text-white tracking-wider">
                  CUSTOM FOLDERS
                </span>
                <span className="text-[8.5px] font-mono text-[#64748b]">
                  ({folders.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    setIsCreatingFolder((prev) => !prev);
                  }}
                  className="px-2 py-0.5 rounded bg-[#00e5ff]/20 hover:bg-[#00e5ff]/35 border border-[#00e5ff]/50 text-[#00e5ff] text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Create a new custom folder / category"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>NEW FOLDER</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaultFolders}
                  className="p-1 rounded text-[#64748b] hover:text-[#94a3b8] hover:bg-[#161f32] transition-colors cursor-pointer"
                  title="Reset to default folder presets"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Folder Creation Card */}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolder}
                className="p-2 bg-[#0c1220] border-2 border-[#00e5ff]/40 rounded flex flex-col gap-2 shadow-lg animate-in fade-in"
              >
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#00e5ff]">
                  <span className="flex items-center gap-1">
                    <FolderPlus className="w-3 h-3" />
                    CREATE CUSTOM CATEGORY
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="text-[#64748b] hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[8.5px] font-mono text-[#8b9bb4]">FOLDER NAME</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. AI & Semis, Energy, Swing Trades..."
                    className="bg-[#05070d] border border-[#1e2a44] rounded px-2 py-1 text-[10px] text-white font-mono focus:border-[#00e5ff] focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1">
                  {['Tech Giants', 'Energy', 'Swing Trades', 'Dividends', 'Crypto & FX', 'High IV'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewFolderName(preset)}
                      className="px-1.5 py-0.5 rounded bg-[#161f32] hover:bg-[#1e2a44] text-[#8b9bb4] hover:text-white text-[8px] font-mono cursor-pointer transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Color Swatches */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[8.5px] font-mono text-[#8b9bb4]">COLOR:</span>
                  <div className="flex items-center gap-1.5">
                    {FOLDER_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewFolderColor(c.hex)}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                          newFolderColor === c.hex ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {newFolderColor === c.hex && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit & Cancel */}
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-2 py-0.5 rounded text-[9px] font-mono text-[#8b9bb4] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="px-2.5 py-1 rounded bg-[#00e5ff] hover:bg-[#38bdf8] text-black font-bold text-[9px] font-mono cursor-pointer transition-colors disabled:opacity-40"
                  >
                    Create Folder
                  </button>
                </div>
              </form>
            )}

            {/* List of Custom Folders */}
            <div className="space-y-2">
              {folders.map((folder) => {
                const isDragOver = dragOverFolderId === folder.id;
                const isCollapsed = !!folder.isCollapsed;
                const isQuickAddOpen = quickAddFolderId === folder.id;

                // Filter symbols matching search query
                const displayedSymbols = folder.symbols.filter(matchesSearch);

                // Compute folder's aggregate 24h change %
                const validPrices = folder.symbols
                  .map((s) => tickers[s])
                  .filter((t): t is Ticker => !!t);
                const avgChange =
                  validPrices.length > 0
                    ? validPrices.reduce((acc, t) => acc + t.changePercent, 0) / validPrices.length
                    : 0;

                return (
                  <div
                    key={folder.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      if (dragOverFolderId !== folder.id) {
                        setDragOverFolderId(folder.id);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverFolderId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sym = e.dataTransfer.getData('text/plain') || draggedSymbol;
                      if (sym) {
                        handleAddSymbolToFolder(folder.id, sym);
                      }
                      setDraggedSymbol(null);
                      setDragOverFolderId(null);
                    }}
                    className={`border rounded overflow-hidden transition-all ${
                      isDragOver
                        ? 'border-dashed border-2 border-[#00e5ff] bg-[#00e5ff]/10 shadow-[0_0_12px_rgba(0,229,255,0.35)]'
                        : 'border-[#1b253b] bg-[#090d16]'
                    }`}
                  >
                    {/* Folder Card Header */}
                    <div
                      onClick={() => toggleFolderCollapse(folder.id)}
                      className="px-2 py-1.5 bg-[#0e1424] hover:bg-[#131c30] flex items-center justify-between cursor-pointer select-none transition-colors"
                      style={{ borderLeft: `3px solid ${folder.color}` }}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-[#64748b] shrink-0" />
                        ) : (
                          <ChevronDown className="w-3 h-3 shrink-0" style={{ color: folder.color }} />
                        )}

                        <Folder
                          className="w-3 h-3 shrink-0"
                          style={{ color: folder.color }}
                        />

                        {/* Title or Inline Edit */}
                        {editingFolderId === folder.id ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1"
                          >
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(folder.id);
                                if (e.key === 'Escape') setEditingFolderId(null);
                              }}
                              className="bg-[#05070c] border border-[#00e5ff] rounded px-1.5 py-0.2 text-[10px] text-white font-mono focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(folder.id)}
                              className="p-0.5 text-[#00e5ff] hover:text-white"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="font-bold text-[10.5px] text-white font-mono truncate tracking-wider"
                            title={folder.name}
                          >
                            {folder.name}
                          </span>
                        )}

                        {/* Count Badge */}
                        <span
                          className="text-[8px] font-mono font-bold px-1 py-0.2 rounded shrink-0"
                          style={{
                            backgroundColor: `${folder.color}25`,
                            color: folder.color,
                          }}
                        >
                          {folder.symbols.length}
                        </span>

                        {/* Avg Change */}
                        {validPrices.length > 0 && (
                          <span
                            className={`text-[8.5px] font-mono font-bold hidden min-[320px]:inline shrink-0 ${
                              avgChange >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                            }`}
                          >
                            {avgChange >= 0 ? '+' : ''}
                            {avgChange.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      {/* Header Actions */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 ml-1"
                      >
                        {/* Quick Add Symbol Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            playKeyClick();
                            setQuickAddFolderId(isQuickAddOpen ? null : folder.id);
                            setQuickAddSearch('');
                          }}
                          className={`p-1 rounded text-[9px] font-mono font-bold flex items-center gap-0.5 transition-colors cursor-pointer ${
                            isQuickAddOpen
                              ? 'bg-[#00e5ff] text-black'
                              : 'text-[#8b9bb4] hover:text-white hover:bg-[#1a2336]'
                          }`}
                          title={`Add symbol to ${folder.name}`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span className="hidden min-[340px]:inline">TICKER</span>
                        </button>

                        {/* Rename */}
                        <button
                          type="button"
                          onClick={() => {
                            playKeyClick();
                            setEditingFolderId(folder.id);
                            setEditingFolderName(folder.name);
                          }}
                          className="p-1 rounded text-[#64748b] hover:text-white hover:bg-[#1a2336] transition-colors cursor-pointer"
                          title="Rename category"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(folder.id, folder.name)}
                          className="p-1 rounded text-[#64748b] hover:text-[#ff334b] hover:bg-[#ff334b]/20 transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Add Ticker Input Bar */}
                    {isQuickAddOpen && (
                      <div className="p-2 bg-[#0a0f1d] border-b border-[#1c2740] flex flex-col gap-1.5 animate-in fade-in">
                        <div className="flex items-center justify-between text-[8.5px] font-mono text-[#00e5ff]">
                          <span>ADD TICKER TO {folder.name.toUpperCase()}:</span>
                          <button
                            onClick={() => setQuickAddFolderId(null)}
                            className="text-[#64748b] hover:text-white"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={quickAddSearch}
                            onChange={(e) => setQuickAddSearch(e.target.value)}
                            placeholder="Type symbol e.g. NVDA, /CL, SU.TO..."
                            className="flex-1 bg-[#05070d] border border-[#1e2a44] rounded px-2 py-0.5 text-[10px] text-white font-mono uppercase focus:border-[#00e5ff] focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && quickAddSearch.trim()) {
                                handleAddSymbolToFolder(folder.id, quickAddSearch.trim());
                                setQuickAddSearch('');
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (quickAddSearch.trim()) {
                                handleAddSymbolToFolder(folder.id, quickAddSearch.trim());
                                setQuickAddSearch('');
                              }
                            }}
                            disabled={!quickAddSearch.trim()}
                            className="px-2 py-0.5 rounded bg-[#00e5ff] hover:bg-[#38bdf8] text-black font-bold text-[9px] font-mono disabled:opacity-40 cursor-pointer"
                          >
                            ADD
                          </button>
                        </div>

                        {/* Autocomplete suggestion pills */}
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto scrollbar-thin pt-0.5">
                          {allAvailableSymbols
                            .filter(
                              (s) =>
                                !folder.symbols.includes(s) &&
                                (!quickAddSearch.trim() ||
                                  s.toLowerCase().includes(quickAddSearch.toLowerCase()))
                            )
                            .slice(0, 8)
                            .map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleAddSymbolToFolder(folder.id, s)}
                                className="px-1.5 py-0.2 rounded bg-[#131b2e] hover:bg-[#00e5ff]/20 hover:text-[#00e5ff] border border-[#1e2a44] text-[8.5px] font-mono text-[#cbd5e1] cursor-pointer"
                              >
                                + {s}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Folder Content (When expanded) */}
                    {!isCollapsed && (
                      <div>
                        {displayedSymbols.length > 0 ? (
                          <table className="w-full border-collapse">
                            <tbody>
                              {displayedSymbols.map((sym) => {
                                const cat = getTickerCategory(sym);
                                const isCanadian = cat.startsWith('cad');
                                const isFuture = cat.endsWith('future');
                                return renderTickerRow(sym, isCanadian, isFuture, folder.id, true);
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="py-4 px-2 text-center flex flex-col items-center justify-center gap-1 text-[#64748b] font-mono text-[9.5px]">
                            <Folder className="w-5 h-5 opacity-40 text-[#00e5ff]" />
                            <span>
                              {folder.symbols.length === 0
                                ? 'Folder is empty'
                                : 'No symbols match search filter'}
                            </span>
                            <span className="text-[8px] text-[#475569]">
                              Drag & drop any ticker here, or click + TICKER above
                            </span>
                          </div>
                        )}

                        {/* Interactive Drop Target Zone */}
                        <div
                          className={`py-1.5 px-2 text-center text-[8.5px] font-mono transition-colors border-t border-dashed ${
                            isDragOver
                              ? 'border-[#00e5ff] text-[#00e5ff] font-bold bg-[#00e5ff]/15'
                              : 'border-[#1b253b] text-[#475569] hover:text-[#8b9bb4]'
                          }`}
                        >
                          {isDragOver
                            ? `⚡ Drop ${draggedSymbol || 'ticker'} here to add to ${folder.name}`
                            : `⇣ Drag & drop tickers into ${folder.name}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Drawer: Available Symbols Pool to Drag From */}
            <div className="mt-2 border border-[#1b253b] rounded bg-[#0a0e1a] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setIsAvailablePoolOpen((prev) => !prev);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#0e1424] hover:bg-[#141e34] text-[#94a3b8] hover:text-white transition-colors cursor-pointer text-left font-mono"
              >
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-[#ff9900]" />
                  <span className="font-bold text-[9.5px] text-white">
                    AVAILABLE TICKER POOL ({allAvailableSymbols.length})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-[#ff9900] font-bold">
                  <span>{isAvailablePoolOpen ? 'COLLAPSE' : 'DRAG FROM HERE'}</span>
                  {isAvailablePoolOpen ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </button>

              {isAvailablePoolOpen && (
                <div className="p-2 space-y-2 border-t border-[#182236] animate-in fade-in">
                  <div className="flex items-center gap-1 bg-[#05070d] border border-[#1e2a44] rounded px-1.5 py-0.5">
                    <Search className="w-2.5 h-2.5 text-[#64748b]" />
                    <input
                      type="text"
                      value={availablePoolSearch}
                      onChange={(e) => setAvailablePoolSearch(e.target.value)}
                      placeholder="Search pool to drag..."
                      className="w-full bg-transparent text-[9.5px] text-white font-mono placeholder-[#475569] focus:outline-none"
                    />
                  </div>

                  <div className="text-[8px] font-mono text-[#64748b]">
                    TIP: Grab any ticker chip below and drag it directly into any folder above!
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto scrollbar-thin">
                    {allAvailableSymbols
                      .filter(
                        (s) =>
                          !availablePoolSearch.trim() ||
                          s.toLowerCase().includes(availablePoolSearch.toLowerCase()) ||
                          (tickers[s]?.name &&
                            tickers[s].name.toLowerCase().includes(availablePoolSearch.toLowerCase()))
                      )
                      .map((sym) => {
                        const t = tickers[sym];
                        const cat = getTickerCategory(sym);
                        const isCan = cat.startsWith('cad');
                        const isFut = cat.endsWith('future');
                        const isBeingDragged = draggedSymbol === sym;

                        return (
                          <div
                            key={sym}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', sym);
                              e.dataTransfer.effectAllowed = 'copyMove';
                              setDraggedSymbol(sym);
                            }}
                            onDragEnd={() => {
                              setDraggedSymbol(null);
                              setDragOverFolderId(null);
                            }}
                            onClick={() => {
                              playKeyClick();
                              onSelectTicker(sym);
                            }}
                            className={`px-1.5 py-0.5 rounded border border-[#1e293b] bg-[#111728] hover:bg-[#1a233a] cursor-grab active:cursor-grabbing flex items-center gap-1 text-[9px] font-mono select-none transition-all ${
                              isBeingDragged ? 'opacity-40 border-[#00e5ff]' : ''
                            }`}
                            title={`Drag ${sym} to any folder or click to inspect`}
                          >
                            <GripVertical className="w-2.5 h-2.5 text-[#64748b]" />
                            <span className="text-[8px]">{isCan ? '🇨🇦' : '🇺🇸'}</span>
                            <span
                              className={`font-bold ${
                                isFut
                                  ? 'text-[#ffd600]'
                                  : isCan
                                  ? 'text-[#38bdf8]'
                                  : 'text-white'
                              }`}
                            >
                              {sym}
                            </span>
                            {t && (
                              <span
                                className={`text-[8px] font-bold ${
                                  t.change >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                                }`}
                              >
                                {t.change >= 0 ? '+' : ''}
                                {t.changePercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: US MARKET WATCHLIST */}
        {marketTab === 'us' && (
          <div>
            {(subFilter === 'all' || subFilter === 'stocks') &&
              renderSection(
                '🇺🇸 US EQUITIES & ETFS',
                'NYSE/NASDAQ',
                'bg-[#ff9900]/20 text-[#ffaa22]',
                usStocksFiltered,
                'us_stocks',
                false,
                false
              )}
            {(subFilter === 'all' || subFilter === 'futures') &&
              renderSection(
                '🇺🇸 US CME & NYMEX FUTURES',
                'CME/CBOT',
                'bg-[#ffd600]/20 text-[#ffd600]',
                usFuturesFiltered,
                'us_futures',
                false,
                true
              )}
          </div>
        )}

        {/* VIEW 3: CANADIAN MARKET WATCHLIST */}
        {marketTab === 'cad' && (
          <div>
            {(subFilter === 'all' || subFilter === 'stocks') &&
              renderSection(
                '🇨🇦 CANADIAN TSX EQUITIES',
                'TSX CAD$',
                'bg-[#ff334b]/20 text-[#ff4d6d]',
                cadStocksFiltered,
                'cad_stocks',
                true,
                false
              )}
            {(subFilter === 'all' || subFilter === 'futures') &&
              renderSection(
                '🇨🇦 CANADIAN MX DERIVATIVES',
                'Bourse Montréal',
                'bg-[#34d399]/20 text-[#34d399]',
                cadFuturesFiltered,
                'cad_futures',
                true,
                true
              )}
          </div>
        )}

        {/* VIEW 4: ALL INSTRUMENTS */}
        {marketTab === 'all' && (
          <div>
            {renderSection(
              '🇺🇸 US EQUITIES',
              'NYSE/NASDAQ',
              'bg-[#ff9900]/20 text-[#ffaa22]',
              usStocksFiltered,
              'us_stocks_all',
              false,
              false
            )}
            {renderSection(
              '🇺🇸 US CME/NYMEX FUTURES',
              'CME/CBOT',
              'bg-[#ffd600]/20 text-[#ffd600]',
              usFuturesFiltered,
              'us_futures_all',
              false,
              true
            )}
            {renderSection(
              '🇨🇦 CANADIAN TSX EQUITIES',
              'TSX CAD$',
              'bg-[#ff334b]/20 text-[#ff4d6d]',
              cadStocksFiltered,
              'cad_stocks_all',
              true,
              false
            )}
            {renderSection(
              '🇨🇦 CANADIAN MX DERIVATIVES',
              'Bourse Montréal',
              'bg-[#34d399]/20 text-[#34d399]',
              cadFuturesFiltered,
              'cad_futures_all',
              true,
              true
            )}
          </div>
        )}

        {/* VIEW 5: SIDE-BY-SIDE SPLIT DUAL VIEW */}
        {marketTab === 'split' && (
          <div className="space-y-2 p-1">
            {/* US Card */}
            <div className="border border-[#ff9900]/30 rounded bg-[#0b101c] overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 bg-[#131b2e] border-b border-[#ff9900]/20">
                <span className="font-bold text-[10px] text-[#ffaa22] font-mono flex items-center gap-1">
                  <span>🇺🇸</span>
                  <span>US MARKETS ({usStocksFiltered.length + usFuturesFiltered.length})</span>
                </span>
                <span className="text-[8.5px] text-[#8b9bb4] font-mono">NYSE · CME</span>
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  {usStocksFiltered.slice(0, 5).map((sym) => renderTickerRow(sym, false, false))}
                  {usFuturesFiltered.slice(0, 4).map((sym) => renderTickerRow(sym, false, true))}
                </tbody>
              </table>
            </div>

            {/* Canadian Card */}
            <div className="border border-[#ff334b]/30 rounded bg-[#0b101c] overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 bg-[#1a121d] border-b border-[#ff334b]/20">
                <span className="font-bold text-[10px] text-[#ff4d6d] font-mono flex items-center gap-1">
                  <span>🇨🇦</span>
                  <span>CANADIAN MARKETS ({cadStocksFiltered.length + cadFuturesFiltered.length})</span>
                </span>
                <span className="text-[8.5px] text-[#8b9bb4] font-mono">TSX · MX CAD$</span>
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  {cadStocksFiltered.slice(0, 5).map((sym) => renderTickerRow(sym, true, false))}
                  {cadFuturesFiltered.slice(0, 4).map((sym) => renderTickerRow(sym, true, true))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Floating Category Quick Drop Dock (Appears when user drags ANY ticker anywhere) */}
      {draggedSymbol && (
        <div className="p-1.5 bg-[#070b14] border-t-2 border-[#00e5ff] shadow-[0_-4px_16px_rgba(0,229,255,0.25)] flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 z-40">
          <div className="flex items-center justify-between text-[9px] font-mono font-bold text-[#00e5ff]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-spin" />
              DROP "{draggedSymbol}" INTO CATEGORY:
            </span>
            <span className="text-[8px] text-[#94a3b8]">Drag onto folder pill</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {folders.map((folder) => {
              const isOver = dragOverFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    setDragOverFolderId(folder.id);
                  }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleAddSymbolToFolder(folder.id, draggedSymbol);
                    setDraggedSymbol(null);
                    setDragOverFolderId(null);
                  }}
                  className={`px-2 py-1 rounded text-[9px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    isOver
                      ? 'scale-105 border-white bg-white text-black shadow-md'
                      : 'border-[#1e2a44] bg-[#0f172a] text-white hover:border-[#00e5ff]'
                  }`}
                  style={{ borderLeftColor: folder.color, borderLeftWidth: '3px' }}
                >
                  <Folder className="w-2.5 h-2.5" style={{ color: folder.color }} />
                  <span>{folder.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Info / MX Hub Trigger */}
      <div className="px-2 py-1.5 bg-[#0a0e18] border-t border-[#182236] flex items-center justify-between text-[9px] font-mono text-[#64748b]">
        <span>46 Real-Time Contracts</span>
        {onOpenTSXFuturesHub && (
          <button
            onClick={() => {
              playKeyClick();
              onOpenTSXFuturesHub();
            }}
            className="text-[#38bdf8] hover:text-white hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
            title="Open Montreal Exchange MX TSX Futures Hub & Basis Arb"
          >
            <span>🇨🇦 MX Hub</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. PRIMARY DOCKED WINDOW ON THE LEFT SIDEBAR */}
      <div className="gadget flex flex-col bg-[#090d16] border border-[#1b253b] rounded overflow-hidden shadow-lg select-none">
        {/* Window Title Bar with Drag & Roll Up / Down Click */}
        <div
          onClick={handleToggleRollUp}
          className="gadget-header flex items-center justify-between px-2.5 py-1.5 bg-[#0e1424] border-b border-[#1c2740] cursor-pointer hover:bg-[#121a2e] transition-colors"
          title="Click header to roll up or roll down window"
        >
          {/* Left Title with Drag Grip & Active Status Indicator */}
          <div className="flex items-center gap-2">
            <span
              className="p-0.5 text-[#64748b] hover:text-[#ff9900] cursor-ns-resize transition-colors"
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsResizingVertical(true);
                resizeVerticalStartYRef.current = {
                  startY: e.clientY,
                  startHeight: isRolledUp ? 160 : gadgetHeight,
                };
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches.length > 0) {
                  setIsResizingVertical(true);
                  resizeVerticalStartYRef.current = {
                    startY: e.touches[0].clientY,
                    startHeight: isRolledUp ? 160 : gadgetHeight,
                  };
                }
              }}
              title="Click & drag to resize or roll up/down"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
            <span className="font-bold text-[11px] text-white font-mono tracking-wider flex items-center gap-1.5">
              <span>WATCHLISTS</span>
              <span className="text-[8.5px] px-1 py-0.2 rounded bg-[#ff9900]/15 text-[#ffaa22] font-bold">
                US · CAD · FOLDERS
              </span>
            </span>
          </div>

          {/* Right Window Action Controls */}
          <div className="flex items-center gap-1">
            {/* Quick Height Pill */}
            {!isRolledUp && (
              <span className="text-[8px] font-mono text-[#64748b] hidden sm:inline mr-0.5">
                {gadgetHeight}px
              </span>
            )}

            {/* Roll Up / Roll Down Click Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleRollUp();
              }}
              className="p-1 rounded text-[#8b9bb4] hover:text-white hover:bg-[#1a2336] transition-colors cursor-pointer flex items-center gap-1"
              title={isRolledUp ? 'Roll down watchlist window' : 'Roll up watchlist window'}
            >
              {isRolledUp ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-[#ff9900]" />
                  <span className="text-[8.5px] font-bold text-[#ff9900] font-mono">ROLL DOWN</span>
                </>
              ) : (
                <>
                  <Minus className="w-3.5 h-3.5 text-[#8b9bb4]" />
                  <span className="text-[8.5px] text-[#8b9bb4] font-mono hover:text-white">ROLL UP</span>
                </>
              )}
            </button>

            {/* Expand Full 4-Quadrant Blotter */}
            {onOpenFullBlotter && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playKeyClick();
                  onOpenFullBlotter();
                }}
                className="p-1 rounded text-[#ff9900] hover:text-white hover:bg-[#ff9900]/20 transition-colors cursor-pointer"
                title="Open Institutional 4-Quadrant Watchlist Blotter <WLST>"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Rolled-Up Banner State */}
        {isRolledUp ? (
          <div
            onClick={handleToggleRollUp}
            className="p-2 bg-[#090d16] hover:bg-[#0f1626] transition-colors cursor-pointer flex items-center justify-between text-xs font-mono border-b border-[#1c2438]"
            title="Click to roll down watchlist window"
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] font-bold">
                ROLLED UP
              </span>
              {selectedTicker && (
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="font-bold text-[#ffaa22]">{selectedSymbol}</span>
                  <span className="text-[#e2e8f0]">${selectedTicker.price.toFixed(2)}</span>
                  <span
                    className={`font-bold ${
                      selectedTicker.change >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                    }`}
                  >
                    {selectedTicker.change >= 0 ? '+' : ''}
                    {selectedTicker.changePercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-[#ff9900] font-bold">
              <span>EXPAND</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          /* Rolled-Down Window Body */
          <>
            {renderWatchlistBody(gadgetHeight)}

            {/* Bottom Drag & Roll Up/Down Resizer Bar */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsResizingVertical(true);
                resizeVerticalStartYRef.current = {
                  startY: e.clientY,
                  startHeight: gadgetHeight,
                };
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches.length > 0) {
                  setIsResizingVertical(true);
                  resizeVerticalStartYRef.current = {
                    startY: e.touches[0].clientY,
                    startHeight: gadgetHeight,
                  };
                }
              }}
              className="py-1 px-2 bg-[#0a0e1c] hover:bg-[#141e34] border-t border-[#1c2740] cursor-ns-resize flex items-center justify-between text-[#64748b] hover:text-[#ff9900] transition-colors group select-none"
              title="Click and drag up/down to roll up or resize watchlist height"
            >
              <div className="flex items-center gap-1 text-[8px] font-mono">
                <GripHorizontal className="w-3.5 h-3.5 text-[#64748b] group-hover:text-[#ff9900]" />
                <span className="uppercase tracking-wider font-bold">Drag to roll up / down</span>
              </div>
              {/* Quick Preset Roll Heights */}
              <div className="flex items-center gap-1 text-[7.5px] font-mono font-bold">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleRollUp();
                  }}
                  className="px-1 py-0.2 rounded bg-[#161f32] hover:bg-[#ff9900]/20 hover:text-[#ff9900] text-[#8b9bb4]"
                  title="Roll up to compact bar"
                >
                  ROLL UP
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetHeight(280);
                  }}
                  className={`px-1 py-0.2 rounded ${gadgetHeight === 280 ? 'bg-[#ff9900] text-black' : 'bg-[#161f32] text-[#8b9bb4] hover:text-white'}`}
                >
                  280px
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetHeight(420);
                  }}
                  className={`px-1 py-0.2 rounded ${gadgetHeight === 420 ? 'bg-[#ff9900] text-black' : 'bg-[#161f32] text-[#8b9bb4] hover:text-white'}`}
                >
                  420px
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetHeight(560);
                  }}
                  className={`px-1 py-0.2 rounded ${gadgetHeight === 560 ? 'bg-[#ff9900] text-black' : 'bg-[#161f32] text-[#8b9bb4] hover:text-white'}`}
                >
                  560px
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
