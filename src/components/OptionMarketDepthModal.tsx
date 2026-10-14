import React, { useState, useMemo, useEffect } from 'react';
import { Ticker, ExpirationOptionChain, TradeLeg } from '../types/options';
import {
  generateOptionMarketDepth,
  calculateOrderBookSlippage,
  OptionMarketDepth,
} from '../services/marketDepthService';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  X,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Plus,
  ArrowUpDown,
  BookOpen,
  PieChart,
} from 'lucide-react';

export interface OptionMarketDepthModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: Ticker;
  chain: ExpirationOptionChain;
  allChains?: ExpirationOptionChain[];
  initialStrike?: number;
  initialType?: 'call' | 'put';
  onAddLeg?: (leg: TradeLeg) => void;
  onPopOut?: () => void;
  onOpenStrategyExecution?: () => void;
}

export const OptionMarketDepthModal: React.FC<OptionMarketDepthModalProps> = ({
  isOpen,
  onClose,
  ticker,
  chain,
  allChains = [],
  initialStrike,
  initialType = 'call',
  onAddLeg,
  onPopOut,
  onOpenStrategyExecution,
}) => {
  // Active contract selection
  const [selectedType, setSelectedType] = useState<'call' | 'put'>(initialType);
  const [selectedStrike, setSelectedStrike] = useState<number>(() => {
    if (initialStrike) return initialStrike;
    if (chain.calls && chain.calls.length > 0) {
      // Find closest to current price
      let closest = chain.calls[0].strike;
      let minDiff = Math.abs(closest - ticker.price);
      chain.calls.forEach((c) => {
        const diff = Math.abs(c.strike - ticker.price);
        if (diff < minDiff) {
          minDiff = diff;
          closest = c.strike;
        }
      });
      return closest;
    }
    return Math.round(ticker.price);
  });

  const [activeDte, setActiveDte] = useState<number>(chain.dte);
  const [sweepContracts, setSweepContracts] = useState<number>(25);
  const [liveTickPulse, setLiveTickPulse] = useState<number>(0);
  const [stagedToast, setStagedToast] = useState<string | null>(null);

  // Update whenever initialStrike or initialType changes
  useEffect(() => {
    if (initialStrike) setSelectedStrike(initialStrike);
    if (initialType) setSelectedType(initialType);
  }, [initialStrike, initialType]);

  // Periodic random live quote size tick
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setLiveTickPulse((prev) => prev + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Find active chain from activeDte
  const currentChain = useMemo(() => {
    if (allChains.length === 0) return chain;
    return allChains.find((c) => c.dte === activeDte) || chain;
  }, [allChains, activeDte, chain]);

  // Available strikes for selection
  const availableStrikes = useMemo(() => {
    const list = currentChain.calls.map((c) => c.strike);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [currentChain]);

  // Generate real-time Level 2 Market Depth
  const depthData: OptionMarketDepth = useMemo(() => {
    return generateOptionMarketDepth(ticker, currentChain, selectedStrike, selectedType);
  }, [ticker, currentChain, selectedStrike, selectedType, liveTickPulse]);

  // Calculate order book slippage for sweep order simulation
  const buySlippage = useMemo(() => {
    return calculateOrderBookSlippage(depthData.askLadder, sweepContracts, true);
  }, [depthData.askLadder, sweepContracts]);

  const sellSlippage = useMemo(() => {
    return calculateOrderBookSlippage(depthData.bidLadder, sweepContracts, false);
  }, [depthData.bidLadder, sweepContracts]);

  if (!isOpen) return null;

  const handleStageLeg = (action: 'buy' | 'sell', targetPrice: number, label: string) => {
    playExecutionChime();
    if (onAddLeg) {
      const leg: TradeLeg = {
        id: `${selectedType}-${action}-${selectedStrike}-${currentChain.dte}-${Date.now()}`,
        type: selectedType,
        action,
        strike: selectedStrike,
        expiration: currentChain.formattedDate,
        dte: currentChain.dte,
        iv: depthData.iv,
        premium: targetPrice,
        contracts: 1,
        multiplier: ticker.multiplier || 100,
        underlyingSymbol: ticker.symbol,
      };
      onAddLeg(leg);
    }
    setStagedToast(`Staged 1x ${ticker.symbol} ${selectedStrike} ${selectedType.toUpperCase()} (${action.toUpperCase()} @ $${targetPrice.toFixed(2)})`);
    setTimeout(() => setStagedToast(null), 3500);
  };

  const handleNextStrike = (delta: number) => {
    playKeyClick();
    const idx = availableStrikes.indexOf(selectedStrike);
    if (idx >= 0) {
      const nextIdx = Math.max(0, Math.min(availableStrikes.length - 1, idx + delta));
      setSelectedStrike(availableStrikes[nextIdx]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#070b14] border-2 border-[#1e2a44] rounded-lg shadow-[0_16px_50px_rgba(0,0,0,0.9)] w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-slate-200 font-mono text-xs select-none">
        
        {/* ========================================================================= */}
        {/* TOP HEADER: SYMBOL, CONTRACT SPECS & QUICK SWITCHERS                      */}
        {/* ========================================================================= */}
        <div className="bg-[#0b1220] border-b border-[#1e2a44] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#ff9900]/15 border border-[#ff9900]/40 flex items-center justify-center text-[#ff9900] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-white tracking-wide">
                  {ticker.symbol} ${selectedStrike.toFixed(2)} {selectedType.toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                  selectedType === 'call'
                    ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40'
                    : 'bg-[#ff334b]/20 text-[#ff334b] border-[#ff334b]/40'
                }`}>
                  {selectedType === 'call' ? 'CALL OPTION' : 'PUT OPTION'}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/30 text-[10px] font-bold">
                  EXP: {currentChain.formattedDate} ({currentChain.dte}D)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#141b2b] text-[#ffd600] border border-[#ffd600]/30 text-[10px] font-bold">
                  SPOT: ${ticker.price.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-[#8b9bb4] mt-0.5">
                Level 2 Depth of Market (DOM) · Consolidated OPRA Exchange BBO &amp; Multi-Tier Order Book
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-2">
            {onOpenStrategyExecution && (
              <button
                onClick={() => {
                  playKeyClick();
                  onClose();
                  onOpenStrategyExecution();
                }}
                className="px-2.5 py-1 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 text-[10px] font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Switch to Multi-Leg Strategy Order Book (COB) & Execution Ticket"
              >
                <Zap className="w-3 h-3 text-[#ff9900]" />
                <span className="hidden sm:inline">STRATEGY COB DEPTH</span>
              </button>
            )}
            {onPopOut && (
              <button
                onClick={() => {
                  playKeyClick();
                  onPopOut();
                  onClose();
                }}
                className="px-2 py-1 rounded bg-[#141b2b] hover:bg-[#1e273d] text-[#38bdf8] border border-[#38bdf8]/40 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Pop out to floating window"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">POP OUT</span>
              </button>
            )}
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="p-1 rounded hover:bg-[#1e273d] text-[#8b9bb4] hover:text-white transition-colors cursor-pointer"
              title="Close Market Depth"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONTRACT NAVIGATION STRIP: CALL/PUT TOGGLE, STRIKE STEPPERS, EXPIRATIONS   */}
        {/* ========================================================================= */}
        <div className="bg-[#090e1a] border-b border-[#162035] px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Call / Put Toggle */}
          <div className="flex items-center bg-[#050811] p-0.5 rounded border border-[#1e2a44]">
            <button
              onClick={() => {
                playKeyClick();
                setSelectedType('call');
              }}
              className={`px-3 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                selectedType === 'call'
                  ? 'bg-[#00e676] text-black shadow-[0_0_10px_rgba(0,230,118,0.4)]'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              CALLS
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSelectedType('put');
              }}
              className={`px-3 py-1 rounded text-xs font-black transition-all cursor-pointer ${
                selectedType === 'put'
                  ? 'bg-[#ff334b] text-white shadow-[0_0_10px_rgba(255,51,75,0.4)]'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              PUTS
            </button>
          </div>

          {/* Strike Stepper */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#8b9bb4] uppercase font-bold">STRIKE:</span>
            <button
              onClick={() => handleNextStrike(-1)}
              className="w-6 h-6 rounded bg-[#101726] hover:bg-[#1b2740] border border-[#223150] text-white font-black text-xs flex items-center justify-center transition-colors cursor-pointer"
              title="Previous Strike (-)"
            >
              -
            </button>
            <select
              value={selectedStrike}
              onChange={(e) => {
                playKeyClick();
                setSelectedStrike(Number(e.target.value));
              }}
              className="bg-[#0b101c] border border-[#ff9900]/50 text-[#ff9900] font-black rounded px-2.5 py-1 text-xs outline-none cursor-pointer"
            >
              {availableStrikes.map((s) => (
                <option key={s} value={s}>
                  ${s.toFixed(2)} {s === availableStrikes.reduce((prev, curr) => Math.abs(curr - ticker.price) < Math.abs(prev - ticker.price) ? curr : prev) ? '(ATM)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleNextStrike(+1)}
              className="w-6 h-6 rounded bg-[#101726] hover:bg-[#1b2740] border border-[#223150] text-white font-black text-xs flex items-center justify-center transition-colors cursor-pointer"
              title="Next Strike (+)"
            >
              +
            </button>
          </div>

          {/* Expiration Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#8b9bb4] uppercase font-bold">EXPIRATION:</span>
            <select
              value={activeDte}
              onChange={(e) => {
                playKeyClick();
                setActiveDte(Number(e.target.value));
              }}
              className="bg-[#0b101c] border border-[#1e2a44] text-[#38bdf8] font-bold rounded px-2.5 py-1 text-xs outline-none cursor-pointer"
            >
              {(allChains.length > 0 ? allChains : [chain]).map((c) => (
                <option key={c.dte} value={c.dte}>
                  {c.formattedDate} ({c.dte}D)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => {
              playKeyClick();
              setLiveTickPulse((prev) => prev + 1);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#101726] hover:bg-[#1a253c] border border-[#223150] text-[#8b9bb4] hover:text-white text-[10px] cursor-pointer"
            title="Refresh order book depth"
          >
            <RefreshCw className="w-3 h-3 text-[#ff9900]" />
            <span>TICK</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: 2-COLUMN VIEW (DOM LADDER + SPREAD & MICROSTRUCTURE ANALYTICS) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3">
          
          {/* Toast Notification */}
          {stagedToast && (
            <div className="bg-[#00e676]/20 border border-[#00e676]/50 text-[#00e676] px-3 py-1.5 rounded flex items-center justify-between text-xs font-bold animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{stagedToast}</span>
              </span>
              <button onClick={() => setStagedToast(null)} className="text-[#00e676] hover:text-white">✕</button>
            </div>
          )}

          {/* ======================================================================= */}
          {/* 1. SPREAD & INSIDE BBO DASHBOARD CARDS                                  */}
          {/* ======================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            
            {/* Best Bid */}
            <div className="bg-[#0b101d] border border-[#00e676]/30 rounded p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
                <span className="font-bold text-[#00e676]">BEST BID (BBO)</span>
                <span className="px-1 rounded bg-[#00e676]/10 text-[#00e676] font-bold text-[9px]">{depthData.bestBidExchange}</span>
              </div>
              <div className="text-xl font-black text-[#00e676] my-0.5">
                ${depthData.bid.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#8b9bb4] flex items-center justify-between">
                <span>Size: <strong className="text-white">{depthData.bidSize}x</strong></span>
                <span>Notional: <strong className="text-white">${(depthData.bid * depthData.bidSize * (ticker.multiplier || 100)).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Best Ask */}
            <div className="bg-[#0b101d] border border-[#ff334b]/30 rounded p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
                <span className="font-bold text-[#ff334b]">BEST ASK (BBO)</span>
                <span className="px-1 rounded bg-[#ff334b]/10 text-[#ff334b] font-bold text-[9px]">{depthData.bestAskExchange}</span>
              </div>
              <div className="text-xl font-black text-[#ff334b] my-0.5">
                ${depthData.ask.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#8b9bb4] flex items-center justify-between">
                <span>Size: <strong className="text-white">{depthData.askSize}x</strong></span>
                <span>Notional: <strong className="text-white">${(depthData.ask * depthData.askSize * (ticker.multiplier || 100)).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Bid-Ask Spread ($ and %) */}
            <div className="bg-[#0b101d] border border-[#ff9900]/40 rounded p-2.5 flex flex-col justify-between shadow-[0_0_12px_rgba(255,153,0,0.1)]">
              <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
                <span className="font-extrabold text-[#ff9900]">BID-ASK SPREAD</span>
                <span className={`px-1 rounded text-[9px] font-black ${
                  depthData.liquidityGrade === 'A+' || depthData.liquidityGrade === 'A'
                    ? 'bg-[#00e676]/20 text-[#00e676]'
                    : depthData.liquidityGrade === 'B'
                    ? 'bg-[#ffd600]/20 text-[#ffd600]'
                    : 'bg-[#ff334b]/20 text-[#ff334b]'
                }`}>
                  {depthData.liquidityGrade}
                </span>
              </div>
              <div className="text-xl font-black text-white my-0.5 flex items-baseline gap-1.5">
                <span className="text-[#ff9900]">${depthData.spread.toFixed(2)}</span>
                <span className="text-xs text-[#8b9bb4]">({depthData.spreadPercent}%)</span>
              </div>
              <div className="text-[10px] text-[#8b9bb4] truncate" title={depthData.liquidityLabel}>
                {depthData.liquidityLabel}
              </div>
            </div>

            {/* Midpoint & Tick Size */}
            <div className="bg-[#0b101d] border border-[#1e2a44] rounded p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
                <span className="font-bold text-[#38bdf8]">MIDPOINT</span>
                <span className="text-[9px] text-[#8b9bb4]">TICK: ${depthData.tickSize.toFixed(2)}</span>
              </div>
              <div className="text-xl font-black text-[#38bdf8] my-0.5">
                ${depthData.midPrice.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#8b9bb4] flex items-center justify-between">
                <span>Effective Sprd:</span>
                <span className="text-white font-bold">${depthData.effectiveSpread.toFixed(2)}</span>
              </div>
            </div>

            {/* Order Book Imbalance */}
            <div className="bg-[#0b101d] border border-[#1e2a44] rounded p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
                <span className="font-bold text-white">BOOK IMBALANCE</span>
                <span className={`text-[9px] font-bold ${depthData.imbalancePercent >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                  {depthData.orderFlowBias.replace('_', ' ')}
                </span>
              </div>
              <div className={`text-xl font-black my-0.5 ${depthData.imbalancePercent >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                {depthData.imbalancePercent >= 0 ? '+' : ''}{depthData.imbalancePercent}%
              </div>
              {/* Visual Balance Bar */}
              <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-[#00e676] h-full"
                  style={{ width: `${Math.max(10, Math.min(90, 50 + depthData.imbalancePercent / 2))}%` }}
                />
                <div
                  className="bg-[#ff334b] h-full flex-1"
                />
              </div>
            </div>

            {/* Total Book Liquidity */}
            <div className="bg-[#0b101d] border border-[#1e2a44] rounded p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
                <span className="font-bold text-white">DEPTH LIQUIDITY</span>
                <span className="text-[9px] text-[#ffd600]">8 LEVELS</span>
              </div>
              <div className="text-xl font-black text-white my-0.5">
                {(depthData.totalBidLiquidity + depthData.totalAskLiquidity).toLocaleString()} ct
              </div>
              <div className="text-[10px] text-[#8b9bb4] flex items-center justify-between">
                <span className="text-[#00e676]">{depthData.totalBidLiquidity}b</span>
                <span>/</span>
                <span className="text-[#ff334b]">{depthData.totalAskLiquidity}a</span>
              </div>
            </div>

          </div>

          {/* ======================================================================= */}
          {/* 2. LEVEL 2 MARKET DEPTH DUAL LADDER (DEPTH OF MARKET / DOM)             */}
          {/* ======================================================================= */}
          <div className="bg-[#080d19] border border-[#1e2a44] rounded-lg p-3 flex flex-col gap-2.5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#162035] pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#ff9900]" />
                <span className="font-black text-white text-xs uppercase tracking-wide">
                  LEVEL 2 ORDER BOOK DEPTH LADDER (DOM)
                </span>
                <span className="text-[10px] text-[#8b9bb4]">
                  // 8 TIERS CONSOLIDATED OPRA PARTICIPANTS
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-[#00e676]">
                  <span className="w-2 h-2 rounded-full bg-[#00e676]" />
                  <span>Total Bids: <strong>{depthData.totalBidLiquidity} ct</strong> (${depthData.totalBidNotional.toLocaleString()})</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-[#ff334b]">
                  <span className="w-2 h-2 rounded-full bg-[#ff334b]" />
                  <span>Total Asks: <strong>{depthData.totalAskLiquidity} ct</strong> (${depthData.totalAskNotional.toLocaleString()})</span>
                </span>
              </div>
            </div>

            {/* Dual Ladder Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              
              {/* BIDS SIDE (Left) */}
              <div className="bg-[#050811] rounded border border-[#121c2e] overflow-hidden">
                <div className="bg-[#0d1627] px-3 py-1.5 border-b border-[#1a253c] flex items-center justify-between text-[10px] font-bold text-[#00e676]">
                  <span>BID ORDERS (BUYERS)</span>
                  <span>VWAP BID: ${depthData.bidVwap.toFixed(2)}</span>
                </div>
                <table className="w-full text-[11px] text-right">
                  <thead>
                    <tr className="border-b border-[#162238] text-[9.5px] text-[#8b9bb4] uppercase">
                      <th className="py-1 px-2 text-left">EXCH</th>
                      <th className="py-1 px-2">ORDERS</th>
                      <th className="py-1 px-2">CUM CT</th>
                      <th className="py-1 px-2">SIZE</th>
                      <th className="py-1 px-2 text-[#00e676] font-bold">BID PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depthData.bidLadder.map((b) => {
                      const isBbo = b.level === 1;
                      return (
                        <tr
                          key={b.level}
                          className={`relative border-b border-[#0d1627] transition-colors ${
                            isBbo
                              ? 'bg-[#00e676]/10 font-bold border-l-2 border-l-[#00e676]'
                              : 'hover:bg-[#0b1220]'
                          }`}
                        >
                          {/* Visual Depth Bar Background */}
                          <td colSpan={5} className="p-0 relative">
                            <div
                              className="absolute top-0 bottom-0 right-0 bg-[#00e676]/15 pointer-events-none transition-all duration-300"
                              style={{ width: `${b.percentOfMax}%` }}
                            />
                            <div className="relative flex items-center justify-between py-1 px-2">
                              <span className="text-[10px] font-extrabold text-[#38bdf8] flex items-center gap-1">
                                <span className="text-[#64748b] text-[8.5px]">L{b.level}</span>
                                <span>{b.exchange}</span>
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-[9.5px] text-[#64748b]">{b.orderCount} ord</span>
                                <span className="text-[10px] text-[#8b9bb4] min-w-[40px] text-right">{b.cumulativeSize}</span>
                                <span className="text-white font-bold min-w-[45px] text-right">{b.size}</span>
                                <span className="text-sm font-black text-[#00e676] min-w-[55px] text-right font-mono">
                                  ${b.price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ASKS SIDE (Right) */}
              <div className="bg-[#050811] rounded border border-[#121c2e] overflow-hidden">
                <div className="bg-[#0d1627] px-3 py-1.5 border-b border-[#1a253c] flex items-center justify-between text-[10px] font-bold text-[#ff334b]">
                  <span>VWAP ASK: ${depthData.askVwap.toFixed(2)}</span>
                  <span>ASK ORDERS (SELLERS)</span>
                </div>
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="border-b border-[#162238] text-[9.5px] text-[#8b9bb4] uppercase">
                      <th className="py-1 px-2 text-[#ff334b] font-bold">ASK PRICE</th>
                      <th className="py-1 px-2 text-right">SIZE</th>
                      <th className="py-1 px-2 text-right">CUM CT</th>
                      <th className="py-1 px-2 text-right">ORDERS</th>
                      <th className="py-1 px-2 text-right">EXCH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depthData.askLadder.map((a) => {
                      const isBbo = a.level === 1;
                      return (
                        <tr
                          key={a.level}
                          className={`relative border-b border-[#0d1627] transition-colors ${
                            isBbo
                              ? 'bg-[#ff334b]/10 font-bold border-r-2 border-r-[#ff334b]'
                              : 'hover:bg-[#0b1220]'
                          }`}
                        >
                          {/* Visual Depth Bar Background */}
                          <td colSpan={5} className="p-0 relative">
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-[#ff334b]/15 pointer-events-none transition-all duration-300"
                              style={{ width: `${a.percentOfMax}%` }}
                            />
                            <div className="relative flex items-center justify-between py-1 px-2">
                              <span className="text-sm font-black text-[#ff334b] min-w-[55px] text-left font-mono">
                                ${a.price.toFixed(2)}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-white font-bold min-w-[45px] text-right">{a.size}</span>
                                <span className="text-[10px] text-[#8b9bb4] min-w-[40px] text-right">{a.cumulativeSize}</span>
                                <span className="text-[9.5px] text-[#64748b]">{a.orderCount} ord</span>
                                <span className="text-[10px] font-extrabold text-[#38bdf8] flex items-center gap-1">
                                  <span>{a.exchange}</span>
                                  <span className="text-[#64748b] text-[8.5px]">L{a.level}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

          {/* ======================================================================= */}
          {/* 3. ORDER FLOW SLIPPAGE SIMULATOR & TIME AND SALES TAPE                   */}
          {/* ======================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            
            {/* Interactive Market Sweep / Impact Calculator */}
            <div className="bg-[#080d19] border border-[#1e2a44] rounded-lg p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-[#162035] pb-2">
                <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff9900]" />
                  <span>MARKET ORDER IMPACT &amp; SLIPPAGE ESTIMATOR</span>
                </span>
                <span className="text-[10px] text-[#38bdf8]">
                  Sweep Depth Analysis
                </span>
              </div>

              {/* Order Size Presets */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-[#8b9bb4]">TEST ORDER SIZE:</span>
                <div className="flex items-center gap-1">
                  {[10, 25, 50, 100, 250].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => {
                        playKeyClick();
                        setSweepContracts(sz);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        sweepContracts === sz
                          ? 'bg-[#ff9900] text-black border-[#ff9900] font-black'
                          : 'bg-[#101726] text-[#8b9bb4] border-[#223150] hover:text-white'
                      }`}
                    >
                      {sz} ct
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Results Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                
                {/* BUY Sweep */}
                <div className="bg-[#050811] p-2.5 rounded border border-[#1a253c]">
                  <div className="text-[10px] font-bold text-[#ff334b] flex items-center justify-between">
                    <span>BUY {sweepContracts}x (SWEEP ASKS)</span>
                    <span>{buySlippage.levelsConsumed} Levels</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">
                    Avg Fill: ${buySlippage.avgExecutionPrice.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-[#8b9bb4] mt-0.5 flex items-center justify-between">
                    <span>Slippage vs BBO:</span>
                    <span className="text-[#ffd600] font-bold">
                      +${buySlippage.slippageDollars.toFixed(2)} ({buySlippage.slippagePercent}%)
                    </span>
                  </div>
                  <div className="text-[9.5px] text-[#64748b] mt-0.5">
                    Total Notional: ${(buySlippage.totalCost * (ticker.multiplier || 100)).toLocaleString()}
                  </div>
                </div>

                {/* SELL Sweep */}
                <div className="bg-[#050811] p-2.5 rounded border border-[#1a253c]">
                  <div className="text-[10px] font-bold text-[#00e676] flex items-center justify-between">
                    <span>SELL {sweepContracts}x (HIT BIDS)</span>
                    <span>{sellSlippage.levelsConsumed} Levels</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">
                    Avg Fill: ${sellSlippage.avgExecutionPrice.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-[#8b9bb4] mt-0.5 flex items-center justify-between">
                    <span>Slippage vs BBO:</span>
                    <span className="text-[#ffd600] font-bold">
                      -${sellSlippage.slippageDollars.toFixed(2)} ({sellSlippage.slippagePercent}%)
                    </span>
                  </div>
                  <div className="text-[9.5px] text-[#64748b] mt-0.5">
                    Total Notional: ${(sellSlippage.totalCost * (ticker.multiplier || 100)).toLocaleString()}
                  </div>
                </div>

              </div>
            </div>

            {/* Recent Time & Sales Matched Prints */}
            <div className="bg-[#080d19] border border-[#1e2a44] rounded-lg p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-[#162035] pb-2">
                <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>RECENT TIME &amp; SALES MATCHED PRINTS</span>
                </span>
                <span className="text-[10px] text-[#8b9bb4]">
                  {ticker.symbol} ${selectedStrike} {selectedType.toUpperCase()}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr className="border-b border-[#162035] text-[9.5px] text-[#8b9bb4] uppercase text-left">
                      <th className="py-1 px-1.5">TIME</th>
                      <th className="py-1 px-1.5">PRICE</th>
                      <th className="py-1 px-1.5 text-right">SIZE</th>
                      <th className="py-1 px-1.5 text-center">EXCH</th>
                      <th className="py-1 px-1.5 text-center">SIDE</th>
                      <th className="py-1 px-1.5 text-right">TYPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#101726]">
                    {depthData.timeAndSales.map((ts) => (
                      <tr key={ts.id} className="hover:bg-[#0c1322]">
                        <td className="py-1 px-1.5 text-[#8b9bb4] font-mono">{ts.time}</td>
                        <td className="py-1 px-1.5 font-black text-white">${ts.price.toFixed(2)}</td>
                        <td className="py-1 px-1.5 text-right font-bold text-white">{ts.size}</td>
                        <td className="py-1 px-1.5 text-center text-[#38bdf8] font-bold text-[9.5px]">{ts.exchange}</td>
                        <td className="py-1 px-1.5 text-center">
                          <span className={`px-1 py-0.2 rounded text-[8.5px] font-black ${
                            ts.side === 'ASK' || ts.side === 'SWEEP'
                              ? 'bg-[#00e676]/20 text-[#00e676]'
                              : ts.side === 'BID'
                              ? 'bg-[#ff334b]/20 text-[#ff334b]'
                              : 'bg-[#ffd600]/20 text-[#ffd600]'
                          }`}>
                            {ts.side}
                          </span>
                        </td>
                        <td className="py-1 px-1.5 text-right text-[8.5px] text-[#64748b]">{ts.condition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* ======================================================================= */}
          {/* 4. INSTANT ONE-CLICK TRADE EXECUTION & BUILDER ACTION STRIP            */}
          {/* ======================================================================= */}
          <div className="bg-[#0b1220] border border-[#1e2a44] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#ffd600]" />
                <span>DIRECT ROUTING &amp; BUILDER STAGING</span>
              </div>
              <div className="text-[10px] text-[#8b9bb4] mt-0.5">
                Route into live order book inside the spread, or stage leg into Multi-Leg Strategy Builder
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Buy at Ask */}
              <button
                onClick={() => handleStageLeg('buy', depthData.ask, 'BUY @ ASK')}
                className="px-3 py-1.5 rounded bg-[#43a047] hover:bg-[#388e3c] text-white font-black text-xs transition-colors cursor-pointer shadow-md"
                title={`Buy 1 contract immediately at Best Ask $${depthData.ask.toFixed(2)}`}
              >
                BUY @ ASK (${depthData.ask.toFixed(2)})
              </button>

              {/* Buy at Mid */}
              <button
                onClick={() => handleStageLeg('buy', depthData.midPrice, 'BUY @ MID')}
                className="px-3 py-1.5 rounded bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-xs transition-colors cursor-pointer shadow-md"
                title={`Place passive limit inside spread at Midpoint $${depthData.midPrice.toFixed(2)}`}
              >
                BUY @ MID (${depthData.midPrice.toFixed(2)})
              </button>

              {/* Sell at Bid */}
              <button
                onClick={() => handleStageLeg('sell', depthData.bid, 'SELL @ BID')}
                className="px-3 py-1.5 rounded bg-[#e53935] hover:bg-[#d32f2f] text-white font-black text-xs transition-colors cursor-pointer shadow-md"
                title={`Sell 1 contract immediately at Best Bid $${depthData.bid.toFixed(2)}`}
              >
                SELL @ BID (${depthData.bid.toFixed(2)})
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
