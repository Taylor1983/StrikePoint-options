import React, { useState, useMemo } from 'react';
import { Ticker } from '../types/options';
import {
  ALL_OPTIONS_STRATEGIES,
  StrategyDefinition,
  StrategyCategory,
  MarketOutlook,
} from '../services/optionsStrategies';
import {
  X,
  Search,
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Layers,
  Zap,
  RotateCcw,
  BarChart2,
} from 'lucide-react';
import { playKeyClick } from '../utils/terminalSound';
import { StrategyBacktesterView } from './StrategyBacktesterView';

interface StrategyCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStrategy: (strategyId: string, destination?: 'builder' | 'risk' | 'ovme') => void;
  activeTickerSymbol: string;
  activeTicker?: Ticker;
  allTickers?: Record<string, Ticker>;
}

export const StrategyCatalogModal: React.FC<StrategyCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectStrategy,
  activeTickerSymbol,
  activeTicker,
  allTickers = {},
}) => {
  const [activeModalTab, setActiveModalTab] = useState<'catalog' | 'backtest'>('catalog');
  const [selectedBacktestStrategyId, setSelectedBacktestStrategyId] = useState<string>('long-call');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedOutlook, setSelectedOutlook] = useState<string>('ALL');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('ALL');

  const categories: (string | StrategyCategory)[] = [
    'ALL',
    'Single',
    'Vertical Spread',
    'Straddle & Strangle',
    'Condor & Butterfly',
    'Calendar & Diagonal',
    'Covered & Synthetic',
    'Ratio & Asymmetric',
  ];

  const outlooks: (string | MarketOutlook)[] = [
    'ALL',
    'Bullish',
    'Bearish',
    'Neutral',
    'High Volatility',
    'Low Volatility',
    'Income',
    'Hedging',
  ];

  const filteredStrategies = useMemo(() => {
    return ALL_OPTIONS_STRATEGIES.filter((st) => {
      if (selectedCategory !== 'ALL' && st.category !== selectedCategory) return false;
      if (selectedOutlook !== 'ALL' && st.outlook !== selectedOutlook) return false;
      if (selectedComplexity !== 'ALL' && st.complexity !== selectedComplexity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchDesc = st.description.toLowerCase().includes(q);
        const matchCat = st.category.toLowerCase().includes(q);
        const matchOut = st.outlook.toLowerCase().includes(q);
        return matchName || matchDesc || matchCat || matchOut;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedOutlook, selectedComplexity]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col font-mono text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0e1424] px-5 py-3 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="StrikePoint"
              className="w-9 h-9 rounded-lg shadow-[0_0_12px_rgba(255,153,0,0.4)] border border-[#ff9900]/50 object-contain p-0.5 bg-[#0a0e17] shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm uppercase tracking-wide">
                  STRIKEPOINT OPTIONS STRATEGY SUITE
                </span>
                <span className="bg-[#00d2ff]/20 text-[#00d2ff] font-bold px-2 py-0.5 rounded text-[10px] border border-[#00d2ff]/30">
                  TARGET: {activeTickerSymbol}
                </span>
              </div>
              <p className="text-[10.5px] text-[#8b9bb4]">
                Directory of {ALL_OPTIONS_STRATEGIES.length} institutional strategies with quantitative Black-Scholes 30-day historical backtesting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center bg-[#070b14] p-1 rounded-lg border border-[#1e293b]">
              <button
                onClick={() => {
                  playKeyClick();
                  setActiveModalTab('catalog');
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'catalog'
                    ? 'bg-[#1e293b] text-white shadow-sm'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span>STRATEGY DIRECTORY</span>
              </button>

              <button
                onClick={() => {
                  playKeyClick();
                  setActiveModalTab('backtest');
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModalTab === 'backtest'
                    ? 'bg-[#ff9900] text-black font-extrabold shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                    : 'text-[#ff9900] hover:text-[#ffaa22]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>30-DAY BACKTESTER</span>
              </button>
            </div>

            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="p-1.5 text-[#8b9bb4] hover:text-white rounded hover:bg-[#1e2638] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content: Catalog or Backtester */}
        {activeModalTab === 'backtest' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <StrategyBacktesterView
              initialStrategyId={selectedBacktestStrategyId}
              activeTicker={
                activeTicker || {
                  symbol: activeTickerSymbol,
                  name: activeTickerSymbol,
                  price: 100,
                  change: 0,
                  changePercent: 0,
                  high: 105,
                  low: 95,
                  open: 100,
                  previousClose: 100,
                  volume: '10M',
                  avgVolume: '10M',
                  marketCap: '100B',
                  peRatio: '20',
                  ivRank: 50,
                  ivPercentile: 50,
                  historicalVol30d: 0.25,
                  currentIV: 0.25,
                  beta: 1,
                  week52High: 120,
                  week52Low: 80,
                  candles: [],
                }
              }
              allTickers={allTickers}
              onSelectStrategyForBuilder={(stratId) => {
                onSelectStrategy(stratId, 'builder');
                onClose();
              }}
              onSelectStrategyForRisk={(stratId) => {
                onSelectStrategy(stratId, 'risk');
                onClose();
              }}
              onSelectStrategyForOVME={(stratId) => {
                onSelectStrategy(stratId, 'ovme');
                onClose();
              }}
            />
          </div>
        ) : (
          <>
            {/* Filter Controls Bar */}
            <div className="bg-[#080c14] border-b border-[#1e2638] p-4 space-y-3 shrink-0">
              {/* Search + Quick Outlook Pills */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-[#8b9bb4] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search strategies by name, leg, or thesis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0f172a] border border-[#1e293b] rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#ff9900]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b9bb4] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Outlook Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto py-0.5">
                  <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider hidden lg:inline mr-1">
                    OUTLOOK:
                  </span>
                  {outlooks.map((out) => (
                    <button
                      key={out}
                      onClick={() => {
                        playKeyClick();
                        setSelectedOutlook(out);
                      }}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all border shrink-0 ${
                        selectedOutlook === out
                          ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-sm'
                          : 'bg-[#0f172a] text-[#8b9bb4] border-[#1e293b] hover:text-white hover:border-[#334155]'
                      }`}
                    >
                      {out}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-[#1e2638]/60">
                <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider mr-1 shrink-0">
                  CATEGORY:
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      playKeyClick();
                      setSelectedCategory(cat);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10.5px] font-medium transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#00d2ff] text-black font-extrabold shadow-sm'
                        : 'bg-transparent text-[#94a3b8] hover:text-white hover:bg-[#141d33]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategies Grid List */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#050811] divide-y divide-[#1e2638]/40">
              {filteredStrategies.length === 0 ? (
                <div className="py-16 text-center text-[#8b9bb4]">
                  <ShieldAlert className="w-10 h-10 mx-auto text-[#64748b] mb-2" />
                  <div className="font-bold text-white text-sm">No strategies match your active filters</div>
                  <p className="text-xs text-[#64748b] mt-1">Try resetting your search query or selecting "ALL" categories</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                      setSelectedOutlook('ALL');
                      setSelectedComplexity('ALL');
                    }}
                    className="mt-3 px-3 py-1 bg-[#1e2638] text-white rounded text-xs hover:bg-[#2b354d]"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
                  {filteredStrategies.map((st) => (
                    <div
                      key={st.id}
                      className="bg-[#0b101e] border border-[#1e293b] hover:border-[#ff9900]/50 rounded-lg p-3.5 flex flex-col justify-between transition-all hover:shadow-[0_0_15px_rgba(255,153,0,0.1)] group"
                    >
                      <div>
                        {/* Top Row: Title, Badges */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white text-sm group-hover:text-[#ff9900] transition-colors">
                                {st.name}
                              </span>
                              {st.popularTag && (
                                <span className="bg-[#ff9900]/20 text-[#ff9900] text-[9px] px-1.5 py-0.2 rounded font-black border border-[#ff9900]/40">
                                  POPULAR
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#00d2ff] font-medium">{st.category}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                st.bias === 'Bullish'
                                  ? 'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30'
                                  : st.bias === 'Bearish'
                                  ? 'bg-[#ff334b]/15 text-[#ff334b] border border-[#ff334b]/30'
                                  : st.bias === 'Volatile'
                                  ? 'bg-[#ff9900]/15 text-[#ff9900] border border-[#ff9900]/30'
                                  : 'bg-[#94a3b8]/15 text-[#cbd5e1] border border-[#94a3b8]/30'
                              }`}
                            >
                              {st.bias}
                            </span>

                            <span className="bg-[#1e293b] text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded font-mono">
                              {st.legsCount} {st.legsCount === 1 ? 'LEG' : 'LEGS'}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[#94a3b8] text-[11px] leading-relaxed mb-3">
                          {st.description}
                        </p>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#060a14] p-2.5 rounded border border-[#1e2638] text-[10px] mb-3">
                          <div>
                            <span className="text-[#64748b] block text-[9px]">MAX PROFIT</span>
                            <span className="font-bold text-[#00e676] truncate block" title={st.maxProfit}>
                              {st.maxProfit}
                            </span>
                          </div>

                          <div>
                            <span className="text-[#64748b] block text-[9px]">MAX LOSS / RISK</span>
                            <span
                              className={`font-bold truncate block ${
                                st.riskType === 'Undefined' ? 'text-[#ff334b]' : 'text-[#ffd600]'
                              }`}
                              title={st.maxLoss}
                            >
                              {st.maxLoss}
                            </span>
                          </div>

                          <div>
                            <span className="text-[#64748b] block text-[9px]">IDEAL IV REGIME</span>
                            <span className="font-bold text-[#00d2ff] truncate block" title={st.idealIV}>
                              {st.idealIV}
                            </span>
                          </div>

                          <div className="col-span-2 sm:col-span-3 pt-1 border-t border-[#1e2638]/60 flex items-center justify-between text-[9.5px]">
                            <span className="text-[#64748b]">
                              B/E:{' '}
                              <strong className="text-[#cbd5e1] font-mono">{st.breakevenFormula}</strong>
                            </span>
                            <span className="text-[#8b9bb4]">
                              Complexity: <strong className="text-white">{st.complexity}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1e2638]/50">
                        <button
                          onClick={() => {
                            playKeyClick();
                            onSelectStrategy(st.id, 'builder');
                            onClose();
                          }}
                          className="flex-1 min-w-[130px] py-1.5 px-2 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold rounded text-xs transition-all flex items-center justify-center gap-1 shadow-sm active:scale-98 cursor-pointer"
                        >
                          <span>LOAD IN BUILDER</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => {
                            playKeyClick();
                            setSelectedBacktestStrategyId(st.id);
                            setActiveModalTab('backtest');
                          }}
                          title="Run 30-day historical Black-Scholes backtest against real market data"
                          className="py-1.5 px-2.5 bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] border border-[#ff9900]/40 rounded font-bold text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-[#ff9900]" />
                          <span>BACKTEST 30D</span>
                        </button>

                        <button
                          onClick={() => {
                            playKeyClick();
                            onSelectStrategy(st.id, 'risk');
                            onClose();
                          }}
                          title="Plot interactive P&L curve in Risk Profile"
                          className="py-1.5 px-2 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/40 rounded font-bold text-xs transition-colors shrink-0 cursor-pointer"
                        >
                          RISK
                        </button>

                        <button
                          onClick={() => {
                            playKeyClick();
                            onSelectStrategy(st.id, 'ovme');
                            onClose();
                          }}
                          title="Inspect Greeks & scenario matrix in OVME"
                          className="py-1.5 px-2 bg-[#1e293b] hover:bg-[#334155] text-white rounded font-bold text-xs transition-colors shrink-0 cursor-pointer"
                        >
                          OVME
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="bg-[#0e1424] px-5 py-3 border-t border-[#1e2638] flex items-center justify-between shrink-0">
          <div className="text-[10px] text-[#8b9bb4]">
            {activeModalTab === 'backtest' ? (
              <span>
                Simulating strategy pricing via <strong>Black-Scholes-Merton</strong> model across 30 days of market candles
              </span>
            ) : (
              <span>
                Showing <strong className="text-white">{filteredStrategies.length}</strong> of{' '}
                <strong className="text-white">{ALL_OPTIONS_STRATEGIES.length}</strong> standard strategies · Dynamic multi-leg pricing active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeModalTab === 'backtest' && (
              <button
                onClick={() => {
                  playKeyClick();
                  setActiveModalTab('catalog');
                }}
                className="px-3 py-1.5 rounded bg-[#1e2638] hover:bg-[#2b354d] text-[#00d2ff] font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3 h-3" />
                <span>Back to Strategy List</span>
              </button>
            )}

            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="px-4 py-1.5 rounded bg-[#1e2638] hover:bg-[#2b354d] text-white font-bold text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
