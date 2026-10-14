import React, { useState } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Layers,
  TrendingUp,
  BarChart3,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  Compass,
  Zap,
  Globe
} from 'lucide-react';
import { Ticker } from '../types/options';
import { playKeyClick } from '../utils/terminalSound';
import { CANADIAN_FUTURES, getTickerCategory } from './WatchlistSidebarGadget';

interface WatchlistBlotterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickers: Record<string, Ticker>;
  selectedSymbol: string;
  onSelectTicker: (sym: string) => void;
  onNavigateToChain: (sym: string) => void;
  onNavigateToBuilder: (sym: string) => void;
  onOpenTSXFuturesHub: () => void;
}

export const WatchlistBlotterModal: React.FC<WatchlistBlotterModalProps> = ({
  isOpen,
  onClose,
  tickers,
  selectedSymbol,
  onSelectTicker,
  onNavigateToChain,
  onNavigateToBuilder,
  onOpenTSXFuturesHub,
}) => {
  const [activeTab, setActiveTab] = useState<'quad' | 'us_stocks' | 'us_futures' | 'cad_stocks' | 'cad_futures'>('quad');
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const matchesSearch = (sym: string) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    const t = tickers[sym];
    return sym.toLowerCase().includes(q) || (t?.name && t.name.toLowerCase().includes(q));
  };

  const usStocks = Object.keys(tickers).filter((sym) => getTickerCategory(sym) === 'us_stock' && matchesSearch(sym));
  const usFutures = Object.keys(tickers).filter((sym) => getTickerCategory(sym) === 'us_future' && matchesSearch(sym));
  const cadStocks = Object.keys(tickers).filter((sym) => getTickerCategory(sym) === 'cad_stock' && matchesSearch(sym));
  const cadFutures = Object.keys(tickers).filter((sym) => getTickerCategory(sym) === 'cad_future' && matchesSearch(sym));

  const renderTable = (symbols: string[], isCanadian: boolean, isFuture: boolean, exchangeTag: string) => {
    return (
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-[#0b101c] text-[#8b9bb4] border-b border-[#1f293d] select-none text-[10px]">
              <th className="py-2 px-2.5 font-bold">SYMBOL</th>
              <th className="py-2 px-2 font-bold">NAME / SPECS</th>
              <th className="py-2 px-2 text-right font-bold">LAST</th>
              <th className="py-2 px-2 text-right font-bold">NET CHG</th>
              <th className="py-2 px-2 text-right font-bold">% CHG</th>
              <th className="py-2 px-2 text-right font-bold">IV RANK</th>
              <th className="py-2 px-2 text-right font-bold">30D HV</th>
              <th className="py-2 px-2.5 text-center font-bold">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#172236]">
            {symbols.map((sym) => {
              const t = tickers[sym];
              if (!t) return null;
              const isSelected = sym === selectedSymbol;
              const isPositive = t.change >= 0;

              return (
                <tr
                  key={sym}
                  className={`transition-colors hover:bg-[#121c2e] cursor-pointer ${
                    isSelected ? 'bg-[#1b263b] border-l-4 border-l-[#ff9900]' : ''
                  }`}
                  onClick={() => {
                    playKeyClick();
                    onSelectTicker(sym);
                    onNavigateToChain(sym);
                    onClose();
                  }}
                >
                  <td className="py-2 px-2.5 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span>{isCanadian ? '🇨🇦' : '🇺🇸'}</span>
                      <span
                        className={`${
                          isFuture
                            ? 'text-[#ffd600]'
                            : isCanadian
                            ? 'text-[#38bdf8]'
                            : 'text-white'
                        }`}
                      >
                        {sym}
                      </span>
                      <span className="text-[8.5px] px-1 py-0.2 rounded bg-[#1e293b] text-[#94a3b8]">
                        {exchangeTag}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-[#94a3b8] max-w-[180px] truncate">
                    {t.name}
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-white">
                    {isCanadian ? 'CA$' : '$'}
                    {t.price < 5
                      ? t.price.toFixed(3)
                      : t.price >= 1000
                      ? t.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
                      : t.price.toFixed(2)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-bold ${
                      isPositive ? 'text-[#00e676]' : 'text-[#ff334b]'
                    }`}
                  >
                    {isPositive ? '+' : ''}{t.change.toFixed(2)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-bold ${
                      isPositive ? 'text-[#00e676]' : 'text-[#ff334b]'
                    }`}
                  >
                    <span className="flex items-center justify-end gap-0.5">
                      {isPositive ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
                      {isPositive ? '+' : ''}{t.changePercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                        (t.ivRank ?? 0) >= 60
                          ? 'bg-[#ff334b]/20 text-[#ff4d6d]'
                          : (t.ivRank ?? 0) >= 35
                          ? 'bg-[#ffd600]/20 text-[#ffd600]'
                          : 'bg-[#38bdf8]/20 text-[#38bdf8]'
                      }`}
                    >
                      {t.ivRank !== undefined ? `${t.ivRank}%` : 'N/A'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-[#94a3b8]">
                    {t.historicalVol30d ? `${(t.historicalVol30d * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2 px-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          playKeyClick();
                          onNavigateToChain(sym);
                          onClose();
                        }}
                        className="px-2 py-0.5 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/40 text-[9px] font-bold cursor-pointer"
                        title="Load into Option Chain <OMON>"
                      >
                        CHAIN
                      </button>
                      <button
                        onClick={() => {
                          playKeyClick();
                          onNavigateToBuilder(sym);
                          onClose();
                        }}
                        className="px-2 py-0.5 rounded bg-[#38bdf8]/20 hover:bg-[#38bdf8]/30 text-[#38bdf8] border border-[#38bdf8]/40 text-[9px] font-bold cursor-pointer"
                        title="Load into Option Valuation & Strategy Builder <OVME>"
                      >
                        STRAT
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#080d1a] border border-[#ff9900]/40 rounded-lg shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-[#0d1424] border-b border-[#1b253b]">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.svg"
              alt="StrikePoint"
              className="w-6 h-6 object-contain rounded drop-shadow-[0_0_8px_rgba(255,153,0,0.5)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono font-black text-sm sm:text-base text-white tracking-wider">
                  INSTITUTIONAL MULTI-MARKET WATCHLIST BLOTTER
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff9900]/15 text-[#ff9900] border border-[#ff9900]/40 font-bold">
                  &lt;WLST&gt;
                </span>
              </div>
              <p className="text-[11px] text-[#8b9bb4] font-mono">
                Real-time pricing, implied volatility rank, and cross-border US &amp; Canadian derivatives tracking
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-white hover:bg-[#1a233a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Controls: Tabs & Search */}
        <div className="p-3 bg-[#0a0f1f] border-b border-[#1b253b] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('quad');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition-all cursor-pointer ${
                activeTab === 'quad'
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'bg-[#121a2c] text-[#94a3b8] hover:text-white hover:bg-[#18233c]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>4-QUADRANT VIEW</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('us_stocks');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-bold transition-all cursor-pointer ${
                activeTab === 'us_stocks'
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'bg-[#121a2c] text-[#94a3b8] hover:text-white hover:bg-[#18233c]'
              }`}
            >
              <span>🇺🇸 US STOCKS ({usStocks.length})</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('us_futures');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-bold transition-all cursor-pointer ${
                activeTab === 'us_futures'
                  ? 'bg-[#ffd600] text-black shadow-md'
                  : 'bg-[#121a2c] text-[#94a3b8] hover:text-white hover:bg-[#18233c]'
              }`}
            >
              <span>🇺🇸 US FUTURES ({usFutures.length})</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('cad_stocks');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-bold transition-all cursor-pointer ${
                activeTab === 'cad_stocks'
                  ? 'bg-[#ff334b] text-white shadow-md'
                  : 'bg-[#121a2c] text-[#94a3b8] hover:text-white hover:bg-[#18233c]'
              }`}
            >
              <span>🇨🇦 CA STOCKS ({cadStocks.length})</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('cad_futures');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-bold transition-all cursor-pointer ${
                activeTab === 'cad_futures'
                  ? 'bg-[#34d399] text-black shadow-md'
                  : 'bg-[#121a2c] text-[#94a3b8] hover:text-white hover:bg-[#18233c]'
              }`}
            >
              <span>🇨🇦 MX FUTURES ({cadFutures.length})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-2 bg-[#05070d] border border-[#1e293b] rounded px-2.5 py-1 text-xs">
            <Search className="w-3.5 h-3.5 text-[#64748b]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search symbol or name..."
              className="bg-transparent border-none text-white font-mono placeholder-[#475569] focus:outline-none w-44"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="text-[#64748b] hover:text-white font-mono text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 scrollbar-thin space-y-4">
          {activeTab === 'quad' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quadrant 1: US Stocks */}
              <div className="bg-[#0b101c] border border-[#ff9900]/30 rounded-lg overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-[#12192b] border-b border-[#ff9900]/20 flex items-center justify-between">
                  <span className="font-bold font-mono text-xs text-[#ffaa22] flex items-center gap-1.5">
                    <span>🇺🇸</span>
                    <span>US EQUITIES &amp; ETFS</span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#ff9900]/15 text-[#ff9900]">
                      NYSE · NASDAQ ({usStocks.length})
                    </span>
                  </span>
                  <span className="text-[10px] text-[#8b9bb4] font-mono">USD $</span>
                </div>
                {renderTable(usStocks, false, false, 'US EQ')}
              </div>

              {/* Quadrant 2: US Futures */}
              <div className="bg-[#0b101c] border border-[#ffd600]/30 rounded-lg overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-[#141b22] border-b border-[#ffd600]/20 flex items-center justify-between">
                  <span className="font-bold font-mono text-xs text-[#ffd600] flex items-center gap-1.5">
                    <span>🇺🇸</span>
                    <span>US CME &amp; NYMEX FUTURES</span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#ffd600]/15 text-[#ffd600]">
                      CME · CBOT · NYMEX ({usFutures.length})
                    </span>
                  </span>
                  <span className="text-[10px] text-[#8b9bb4] font-mono">Derivatives / FOP</span>
                </div>
                {renderTable(usFutures, false, true, 'CME')}
              </div>

              {/* Quadrant 3: Canadian Stocks */}
              <div className="bg-[#0b101c] border border-[#ff334b]/30 rounded-lg overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-[#19111c] border-b border-[#ff334b]/20 flex items-center justify-between">
                  <span className="font-bold font-mono text-xs text-[#ff4d6d] flex items-center gap-1.5">
                    <span>🇨🇦</span>
                    <span>CANADIAN TSX EQUITIES</span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#ff334b]/15 text-[#ff4d6d]">
                      TSX Toronto ({cadStocks.length})
                    </span>
                  </span>
                  <span className="text-[10px] text-[#ffd600] font-mono font-bold">CAD CA$</span>
                </div>
                {renderTable(cadStocks, true, false, 'TSX')}
              </div>

              {/* Quadrant 4: Canadian MX Futures */}
              <div className="bg-[#0b101c] border border-[#34d399]/30 rounded-lg overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-[#0d1c1a] border-b border-[#34d399]/20 flex items-center justify-between">
                  <span className="font-bold font-mono text-xs text-[#34d399] flex items-center gap-1.5">
                    <span>🇨🇦</span>
                    <span>CANADIAN MONTREAL EXCHANGE (MX) FUTURES</span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#34d399]/15 text-[#34d399]">
                      Bourse de Montréal ({cadFutures.length})
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      playKeyClick();
                      onOpenTSXFuturesHub();
                    }}
                    className="text-[10px] text-[#38bdf8] hover:underline font-mono font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>MX Hub</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
                {renderTable(cadFutures, true, true, 'MX')}
              </div>
            </div>
          ) : activeTab === 'us_stocks' ? (
            <div className="bg-[#0b101c] border border-[#ff9900]/30 rounded-lg overflow-hidden">
              <div className="p-2.5 bg-[#12192b] border-b border-[#ff9900]/20 flex items-center justify-between">
                <span className="font-bold font-mono text-xs text-[#ffaa22]">
                  🇺🇸 ALL US EQUITIES &amp; ETFS ({usStocks.length})
                </span>
                <span className="text-xs text-[#8b9bb4] font-mono">NYSE &amp; NASDAQ Regular + Extended Trading</span>
              </div>
              {renderTable(usStocks, false, false, 'US EQ')}
            </div>
          ) : activeTab === 'us_futures' ? (
            <div className="bg-[#0b101c] border border-[#ffd600]/30 rounded-lg overflow-hidden">
              <div className="p-2.5 bg-[#141b22] border-b border-[#ffd600]/20 flex items-center justify-between">
                <span className="font-bold font-mono text-xs text-[#ffd600]">
                  🇺🇸 ALL US FUTURES &amp; OPTIONS ON FUTURES ({usFutures.length})
                </span>
                <span className="text-xs text-[#8b9bb4] font-mono">Chicago Mercantile Exchange &amp; New York Mercantile Exchange</span>
              </div>
              {renderTable(usFutures, false, true, 'CME')}
            </div>
          ) : activeTab === 'cad_stocks' ? (
            <div className="bg-[#0b101c] border border-[#ff334b]/30 rounded-lg overflow-hidden">
              <div className="p-2.5 bg-[#19111c] border-b border-[#ff334b]/20 flex items-center justify-between">
                <span className="font-bold font-mono text-xs text-[#ff4d6d]">
                  🇨🇦 ALL CANADIAN TSX EQUITIES ({cadStocks.length})
                </span>
                <span className="text-xs text-[#8b9bb4] font-mono">Toronto Stock Exchange · Denominated in Canadian Dollars (CA$)</span>
              </div>
              {renderTable(cadStocks, true, false, 'TSX')}
            </div>
          ) : (
            <div className="bg-[#0b101c] border border-[#34d399]/30 rounded-lg overflow-hidden">
              <div className="p-2.5 bg-[#0d1c1a] border-b border-[#34d399]/20 flex items-center justify-between">
                <span className="font-bold font-mono text-xs text-[#34d399]">
                  🇨🇦 ALL CANADIAN MONTREAL EXCHANGE DERIVATIVES ({cadFutures.length})
                </span>
                <span className="text-xs text-[#8b9bb4] font-mono">Bourse de Montréal · CDCC Standard Margins</span>
              </div>
              {renderTable(cadFutures, true, true, 'MX')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0d1424] border-t border-[#1b253b] flex items-center justify-between text-xs font-mono text-[#8b9bb4]">
          <div className="flex items-center gap-3">
            <span>Selected Contract: <strong className="text-white">{selectedSymbol}</strong></span>
            <span className="text-[#64748b]">|</span>
            <span>46 Total Live Tracked Instruments</span>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-[#ff9900] text-black font-bold font-mono text-xs hover:bg-[#ffaa22] transition-colors cursor-pointer"
          >
            RETURN TO TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
};
