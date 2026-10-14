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
  RotateCcw
} from 'lucide-react';
import { Ticker } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';

export type WatchlistMarketTab = 'us' | 'cad' | 'all' | 'split';
export type WatchlistSubFilter = 'all' | 'stocks' | 'futures';

export const CANADIAN_FUTURES = ['/SXF', '/SXM', '/CGB', '/CRA', '/SCF', '/CGF', '/6C'];

export function getTickerCategory(symbol: string): 'us_stock' | 'us_future' | 'cad_stock' | 'cad_future' {
  if (CANADIAN_FUTURES.includes(symbol)) return 'cad_future';
  if (symbol.startsWith('/')) return 'us_future';
  if (symbol.endsWith('.TO') || symbol === 'DLR.TO') return 'cad_stock';
  return 'us_stock';
}

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
      return saved ? Math.max(140, Math.min(750, parseInt(saved, 10))) : 380;
    } catch {
      return 380;
    }
  });

  // Vertical resize dragging state
  const [isResizingVertical, setIsResizingVertical] = useState<boolean>(false);
  const resizeVerticalStartYRef = useRef<{ startY: number; startHeight: number }>({ startY: 0, startHeight: 380 });
  const currentHeightRef = useRef<number>(gadgetHeight);

  useEffect(() => {
    currentHeightRef.current = gadgetHeight;
  }, [gadgetHeight]);

  // Save roll-up and height state
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
    const clamped = Math.max(140, Math.min(750, height));
    currentHeightRef.current = clamped;
    setGadgetHeight(clamped);
    setIsRolledUp(false);
    try {
      localStorage.setItem('sp_watchlist_gadget_height', String(clamped));
      localStorage.setItem('sp_watchlist_rolledup', 'false');
    } catch {}
  };

  // Drag up/down resizer event listeners (supports mouse and touch)
  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (isResizingVertical) {
        const deltaY = clientY - resizeVerticalStartYRef.current.startY;
        const newHeight = resizeVerticalStartYRef.current.startHeight + deltaY;
        if (newHeight < 90) {
          // Dragged all the way up: roll up!
          setIsRolledUp(true);
        } else {
          setIsRolledUp(false);
          const clamped = Math.max(140, Math.min(750, Math.round(newHeight)));
          currentHeightRef.current = clamped;
          setGadgetHeight(clamped);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      if (isResizingVertical) {
        setIsResizingVertical(false);
        try {
          localStorage.setItem('sp_watchlist_gadget_height', String(currentHeightRef.current));
        } catch {}
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

  // Section toggle
  const toggleSection = (id: string) => {
    playKeyClick();
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const renderTickerRow = (sym: string, isCanadian: boolean, isFuture: boolean) => {
    const t = tickers[sym];
    if (!t) return null;
    const isSelected = sym === selectedSymbol;
    const isPositive = t.change >= 0;

    return (
      <tr
        key={sym}
        onClick={() => {
          playKeyClick();
          onSelectTicker(sym);
        }}
        title={`Click to load ${sym} Option Chain <OMON>`}
        className={`group transition-colors cursor-pointer border-b border-[#1c2438] ${
          isSelected
            ? 'bg-[#1e2a44] border-l-2 border-l-[#ff9900]'
            : 'hover:bg-[#121a2c]'
        }`}
      >
        <td className="py-1.5 px-2 text-left">
          <div className="flex items-center gap-1.5">
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
              <span className="text-[9px] text-[#64748b] truncate max-w-[110px] font-mono">
                {t.name}
              </span>
            </div>
          </div>
        </td>
        <td className="py-1.5 px-2 text-right font-mono">
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
    <div className="flex flex-col">
      {/* Primary Market Switcher Tabs */}
      <div className="grid grid-cols-4 p-1 gap-1 bg-[#090d16] border-b border-[#182236] text-[9.5px] font-mono font-bold">
        <button
          onClick={() => {
            playKeyClick();
            setMarketTab('us');
          }}
          className={`py-1 px-1 text-center rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            marketTab === 'us'
              ? 'bg-[#ff9900] text-black shadow-sm'
              : 'text-[#94a3b8] hover:text-white bg-[#0e1422] hover:bg-[#141e33]'
          }`}
          title="US Market Watchlist (Stocks & CME/NYMEX Futures)"
        >
          <span>🇺🇸</span>
          <span>US ({usTotal})</span>
        </button>
        <button
          onClick={() => {
            playKeyClick();
            setMarketTab('cad');
          }}
          className={`py-1 px-1 text-center rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            marketTab === 'cad'
              ? 'bg-[#ff334b] text-white shadow-sm'
              : 'text-[#94a3b8] hover:text-white bg-[#0e1422] hover:bg-[#141e33]'
          }`}
          title="Canadian Market Watchlist (TSX Equities & Montreal Exchange MX Futures)"
        >
          <span>🇨🇦</span>
          <span>CA ({cadTotal})</span>
        </button>
        <button
          onClick={() => {
            playKeyClick();
            setMarketTab('split');
          }}
          className={`py-1 px-1 text-center rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            marketTab === 'split'
              ? 'bg-[#38bdf8] text-black shadow-sm'
              : 'text-[#94a3b8] hover:text-white bg-[#0e1422] hover:bg-[#141e33]'
          }`}
          title="Side-by-Side Dual View: US and Canadian Watchlists simultaneously"
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
              ? 'bg-[#a855f7] text-white shadow-sm'
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
            placeholder={`Filter ${marketTab === 'us' ? 'US' : marketTab === 'cad' ? 'Canadian' : 'all'} tickers...`}
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
                  startHeight: isRolledUp ? 140 : gadgetHeight,
                };
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches.length > 0) {
                  setIsResizingVertical(true);
                  resizeVerticalStartYRef.current = {
                    startY: e.touches[0].clientY,
                    startHeight: isRolledUp ? 140 : gadgetHeight,
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
                US · CAD
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
                    handleSetHeight(380);
                  }}
                  className={`px-1 py-0.2 rounded ${gadgetHeight === 380 ? 'bg-[#ff9900] text-black' : 'bg-[#161f32] text-[#8b9bb4] hover:text-white'}`}
                >
                  380px
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetHeight(520);
                  }}
                  className={`px-1 py-0.2 rounded ${gadgetHeight === 520 ? 'bg-[#ff9900] text-black' : 'bg-[#161f32] text-[#8b9bb4] hover:text-white'}`}
                >
                  520px
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </>
  );
};
