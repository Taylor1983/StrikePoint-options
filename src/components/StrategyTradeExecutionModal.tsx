import React, { useState, useMemo, useEffect } from 'react';
import {
  Ticker,
  ExpirationOptionChain,
  TradeLeg,
  Order,
  Position,
} from '../types/options';
import {
  generateStrategyMarketDepth,
  calculateOrderBookSlippage,
  StrategyMarketDepth,
  DepthLevel,
} from '../services/marketDepthService';
import {
  calculateSmartOrderRoutingPlan,
  SmartOrderRoutingPlan,
  RoutingOptimizationMode,
} from '../services/smartOrderRoutingService';
import { ExchangeRoutingMonitorOverlay } from './ExchangeRoutingMonitorOverlay';
import { generateStrategyLegs, ALL_OPTIONS_STRATEGIES } from '../services/optionsStrategies';
import { analyzeStrategy } from '../utils/blackScholes';
import { playExecutionChime, playKeyClick } from '../utils/terminalSound';
import {
  X,
  Layers,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Activity,
  DollarSign,
  Clock,
  Sparkles,
  BookOpen,
  PieChart,
  Target,
} from 'lucide-react';

export interface StrategyTradeExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: Ticker;
  chain: ExpirationOptionChain;
  allChains?: ExpirationOptionChain[];
  initialLegs: TradeLeg[];
  cashBalance: number;
  onExecuteTrade: (order: Order, position: Position) => void;
  onUpdateBuilderLegs?: (legs: TradeLeg[]) => void;
  onPopOut?: () => void;
}

type OrderTypeMode = 'limit' | 'market' | 'midpoint' | 'auction' | 'stop_limit';
type RouteDestination =
  | 'SMART'
  | 'CBOE_COB'
  | 'ISE_COMPLEX'
  | 'PHLX_COMPLEX'
  | 'MX_MONTREAL'
  | 'TSX_ALPHA'
  | 'CITADEL_DIRECT';
type TimeInForce = 'DAY' | 'GTC' | 'IOC' | 'FOK';
type TabView = 'split' | 'depth' | 'ticket';

export const StrategyTradeExecutionModal: React.FC<StrategyTradeExecutionModalProps> = ({
  isOpen,
  onClose,
  ticker,
  chain,
  allChains = [],
  initialLegs,
  cashBalance,
  onExecuteTrade,
  onUpdateBuilderLegs,
  onPopOut,
}) => {
  // Active legs state
  const [activeLegs, setActiveLegs] = useState<TradeLeg[]>(() => {
    if (initialLegs && initialLegs.length > 0) return initialLegs;
    return generateStrategyLegs('bull-call-spread', ticker, chain, allChains);
  });

  // Strategy preset selector
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('bull-call-spread');

  // Execution parameters
  const [orderType, setOrderType] = useState<OrderTypeMode>('limit');
  const [orderSets, setOrderSets] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(1.25);
  const [userEditedLimit, setUserEditedLimit] = useState<boolean>(false);
  const [routingVenue, setRoutingVenue] = useState<RouteDestination>('SMART');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('DAY');
  const [atomicGuarantee, setAtomicGuarantee] = useState<boolean>(true);

  // Smart Order Routing (SOR) states
  const [isSorActive, setIsSorActive] = useState<boolean>(true);
  const [includeCanadianExchanges, setIncludeCanadianExchanges] = useState<boolean>(true);
  const [sorOptimizationMode, setSorOptimizationMode] = useState<RoutingOptimizationMode>('MIN_SLIPPAGE');
  const [isRoutingMonitorOpen, setIsRoutingMonitorOpen] = useState<boolean>(false);

  // Depth display mode
  const [depthLadderMode, setDepthLadderMode] = useState<'cob' | 'synthetic'>('cob');
  const [sweepSimContracts, setSweepSimContracts] = useState<number>(20);
  const [activeTab, setActiveTab] = useState<TabView>('split');
  const [livePulse, setLivePulse] = useState<number>(0);

  // Execution state & receipt
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionReceipt, setExecutionReceipt] = useState<{
    order: Order;
    position: Position;
    cobMatchId: string;
    allocatedFills: { legId: string; strike: number; type: string; action: string; fillPrice: number; venue?: string }[];
    priceImprovementTotal: number;
    slippageSavingsTotal?: number;
    isSorExecuted?: boolean;
    venueAllocations?: { exchange: string; contracts: number; flag: string }[];
    timestamp: string;
  } | null>(null);

  // Sync when initialLegs changes and modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialLegs && initialLegs.length > 0) {
        setActiveLegs(initialLegs);
      } else {
        const defaultSpread = generateStrategyLegs('bull-call-spread', ticker, chain, allChains);
        setActiveLegs(defaultSpread);
      }
      setUserEditedLimit(false);
      setExecutionReceipt(null);
    }
  }, [isOpen, initialLegs, ticker, chain, allChains]);

  // Periodic subtle live tick update for DOM sizes
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setLivePulse((prev) => prev + 1);
    }, 3200);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Analyze active strategy
  const analysis = useMemo(() => {
    return analyzeStrategy(activeLegs, ticker.price);
  }, [activeLegs, ticker.price]);

  // Generate Strategy Level 2 Market Depth (COB + Synthetic)
  const strategyDepth: StrategyMarketDepth = useMemo(() => {
    return generateStrategyMarketDepth(ticker, activeLegs, analysis.name);
  }, [ticker, activeLegs, analysis.name, livePulse]);

  // Generate Algorithmic Smart Order Routing Plan across CBOE, ISE, PHLX, MX, TSX
  const smartRoutingPlan: SmartOrderRoutingPlan = useMemo(() => {
    return calculateSmartOrderRoutingPlan(
      ticker,
      activeLegs,
      analysis.name,
      orderSets,
      limitPrice,
      strategyDepth.isDebit,
      sorOptimizationMode,
      includeCanadianExchanges,
      livePulse
    );
  }, [
    ticker,
    activeLegs,
    analysis.name,
    orderSets,
    limitPrice,
    strategyDepth.isDebit,
    sorOptimizationMode,
    includeCanadianExchanges,
    livePulse,
  ]);

  // Default limit price to COB Midpoint or Natural Ask
  useEffect(() => {
    if (!userEditedLimit && strategyDepth) {
      if (orderType === 'midpoint') {
        setLimitPrice(strategyDepth.cobMid);
      } else if (orderType === 'market') {
        setLimitPrice(strategyDepth.cobAsk);
      } else {
        setLimitPrice(strategyDepth.cobMid);
      }
    }
  }, [strategyDepth, userEditedLimit, orderType]);

  // Slippage simulation for combo order
  const comboSlippage = useMemo(() => {
    const ladder = strategyDepth.isDebit ? strategyDepth.askLadder : strategyDepth.bidLadder;
    return calculateOrderBookSlippage(ladder, sweepSimContracts, strategyDepth.isDebit);
  }, [strategyDepth, sweepSimContracts]);

  if (!isOpen) return null;

  const multiplier = ticker.multiplier || (ticker.symbol.startsWith('/') ? 50 : 100);
  const totalNotionalCost = Number((limitPrice * multiplier * orderSets).toFixed(2));
  const isDebit = strategyDepth.isDebit;

  // Regulatory & Exchange Commission estimate ($0.65/contract leg + $0.05 regulatory)
  const estimatedCommissions = Number((0.70 * activeLegs.length * orderSets).toFixed(2));

  // Switch preset strategy template
  const handleSelectPreset = (stratId: string) => {
    playKeyClick();
    setSelectedStrategyId(stratId);
    const newLegs = generateStrategyLegs(stratId, ticker, chain, allChains);
    setActiveLegs(newLegs);
    setUserEditedLimit(false);
    if (onUpdateBuilderLegs) onUpdateBuilderLegs(newLegs);
  };

  // Adjust specific leg strike
  const handleShiftStrike = (legId: string, direction: 'up' | 'down') => {
    playKeyClick();
    const calls = chain.calls.map((c) => c.strike).sort((a, b) => a - b);
    setActiveLegs((prev) =>
      prev.map((leg) => {
        if (leg.id !== legId) return leg;
        const currIdx = calls.indexOf(leg.strike);
        if (currIdx === -1) return leg;
        const newIdx = direction === 'up' ? Math.min(calls.length - 1, currIdx + 1) : Math.max(0, currIdx - 1);
        const newStrike = calls[newIdx];
        const contract = leg.type === 'call' ? chain.calls.find((c) => c.strike === newStrike) : chain.puts.find((p) => p.strike === newStrike);
        const newPrem = contract ? (leg.action === 'buy' ? contract.ask : contract.bid) : leg.premium;
        return {
          ...leg,
          strike: newStrike,
          premium: newPrem,
        };
      })
    );
    setUserEditedLimit(false);
  };

  // Toggle leg action (BUY / SELL)
  const handleToggleLegAction = (legId: string) => {
    playKeyClick();
    setActiveLegs((prev) =>
      prev.map((l) => (l.id === legId ? { ...l, action: l.action === 'buy' ? 'sell' : 'buy' } : l))
    );
    setUserEditedLimit(false);
  };

  // Execute multi-leg order
  const handleExecuteMultiLegOrder = () => {
    if (activeLegs.length === 0 || isExecuting) return;
    playKeyClick();
    setIsExecuting(true);

    // Simulate electronic routing and complex order match delay
    setTimeout(() => {
      playExecutionChime();
      const orderId = `COB-${Date.now()}`;
      const venuesList = isSorActive
        ? smartRoutingPlan.exchangeAllocations.map((a) => a.exchange).join('/')
        : routingVenue;
      const cobMatchId = isSorActive
        ? `SOR-MATCH-${Math.floor(100000 + Math.random() * 900000)}`
        : `CBOE-MATCH-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

      // Allocate realistic individual fills that sum up to net limit price
      const netPerUnit = isSorActive ? smartRoutingPlan.smartRoutedPrice : limitPrice;
      let runningSum = 0;
      const allocatedFills = activeLegs.map((leg, idx) => {
        const isLast = idx === activeLegs.length - 1;
        const split = smartRoutingPlan.legSplits.find((ls) => ls.legId === leg.id);
        const bestVenue = split?.allocations[0]?.exchange || 'CBOE';
        let legFill = isSorActive && split ? split.weightedFillPrice : leg.premium;
        if (isLast) {
          // Adjust last leg so sum matches exactly
          const targetRem = isDebit ? netPerUnit - runningSum : netPerUnit + runningSum;
          legFill = Number(Math.max(0.01, Math.abs(targetRem)).toFixed(2));
        } else {
          legFill = Number(legFill.toFixed(2));
          runningSum += (leg.action === 'buy' ? legFill : -legFill);
        }
        return {
          legId: leg.id,
          strike: leg.strike,
          type: leg.type,
          action: leg.action,
          fillPrice: legFill,
          venue: bestVenue,
        };
      });

      const actualUnitCost = isSorActive ? smartRoutingPlan.smartRoutedPrice : limitPrice;
      const actualNotionalCost = Number((actualUnitCost * multiplier * orderSets).toFixed(2));
      const netCashImpact = isDebit ? actualNotionalCost : -actualNotionalCost;

      const totalLegContracts = activeLegs.reduce((acc, l) => acc + l.contracts, 0) || 1;
      const strategyEntryIV = Number(
        (activeLegs.reduce((acc, l) => acc + (l.iv || ticker.currentIV || 0.25) * l.contracts, 0) / totalLegContracts).toFixed(4)
      );

      const newOrder: Order = {
        id: orderId,
        timestamp,
        ticker: ticker.symbol,
        strategyName: `${analysis.name} (${isSorActive ? `SOR: ${venuesList}` : routingVenue})`,
        type: orderType === 'market' ? 'market' : 'limit',
        limitPrice: actualUnitCost,
        legs: activeLegs.map((l) => ({ ...l, contracts: l.contracts * orderSets })),
        contracts: orderSets,
        netDebitCredit: netCashImpact,
        totalCost: netCashImpact,
        status: 'filled',
        assetCategory: ticker.symbol.startsWith('/') ? 'future' : 'option',
        entryIV: strategyEntryIV,
        tradeIV: strategyEntryIV,
      };

      const newPosition: Position = {
        id: `pos-${Date.now()}`,
        ticker: ticker.symbol,
        strategyName: analysis.name,
        openedAt: timestamp,
        legs: activeLegs.map((l) => ({ ...l, contracts: l.contracts * orderSets })),
        contracts: orderSets,
        entryCost: netCashImpact,
        currentMark: netCashImpact,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        assetCategory: ticker.symbol.startsWith('/') ? 'future' : 'option',
        entryIV: strategyEntryIV,
        tradeIV: strategyEntryIV,
      };

      onExecuteTrade(newOrder, newPosition);
      setIsExecuting(false);

      setExecutionReceipt({
        order: newOrder,
        position: newPosition,
        cobMatchId,
        allocatedFills,
        priceImprovementTotal: isSorActive
          ? smartRoutingPlan.totalPriceImprovementDollars
          : Number((strategyDepth.priceImprovement * multiplier * orderSets).toFixed(2)),
        slippageSavingsTotal: isSorActive ? smartRoutingPlan.totalSlippageSavingsDollars : undefined,
        isSorExecuted: isSorActive,
        venueAllocations: isSorActive
          ? smartRoutingPlan.exchangeAllocations.map((a) => ({
              exchange: a.exchange,
              contracts: a.totalContracts,
              flag: a.flag,
            }))
          : undefined,
        timestamp,
      });
    }, 750);
  };

  const ladderToDisplay = depthLadderMode === 'cob' ? strategyDepth : {
    ...strategyDepth,
    bidLadder: strategyDepth.syntheticBidLadder,
    askLadder: strategyDepth.syntheticAskLadder,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-150">
      <div className="bg-[#0b0e14] border-2 border-[#1e293b] rounded-xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden text-[#e2e8f0] font-sans">
        
        {/* TOP MODAL HEADER BAR */}
        <div className="bg-[#101726] px-4 py-2.5 border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-pulse" />
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm text-[#ff9900] tracking-wider uppercase">
                {ticker.symbol}
              </span>
              <span className="text-xs text-[#8b9bb4] font-mono">
                ${ticker.price.toFixed(2)}
              </span>
              <span className="text-xs text-white font-bold bg-[#1e293b] px-2 py-0.5 rounded border border-[#334155]">
                {analysis.name.toUpperCase()}
              </span>
              <span className="text-[11px] font-mono font-bold text-[#38bdf8] bg-[#0284c7]/20 px-2 py-0.5 rounded border border-[#0284c7]/40">
                {activeLegs.length} LEGS COMBO
              </span>
            </div>
          </div>

          {/* Quick Strategy Preset Switcher */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[420px] text-[10px] font-mono">
            {[
              { id: 'bull-call-spread', label: 'BULL CALL' },
              { id: 'bear-put-spread', label: 'BEAR PUT' },
              { id: 'iron-condor', label: 'IRON CONDOR' },
              { id: 'long-strangle', label: 'STRANGLE' },
              { id: 'calendar-spread', label: 'CALENDAR' },
              { id: 'call-butterfly', label: 'BUTTERFLY' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                  selectedStrategyId === preset.id
                    ? 'bg-[#ff9900] text-black font-black'
                    : 'bg-[#141b28] hover:bg-[#1e2638] text-[#94a3b8] border border-[#223150]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Tab View & Close Buttons */}
          <div className="flex items-center gap-1.5">
            <div className="hidden md:flex items-center bg-[#141b28] p-0.5 rounded border border-[#223150] text-[10px] font-bold">
              <button
                onClick={() => setActiveTab('split')}
                className={`px-2 py-1 rounded ${activeTab === 'split' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                SPLIT VIEW
              </button>
              <button
                onClick={() => setActiveTab('depth')}
                className={`px-2 py-1 rounded ${activeTab === 'depth' ? 'bg-[#00e676] text-black' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                STRATEGY DOM
              </button>
              <button
                onClick={() => setActiveTab('ticket')}
                className={`px-2 py-1 rounded ${activeTab === 'ticket' ? 'bg-[#38bdf8] text-black' : 'text-[#8b9bb4] hover:text-white'}`}
              >
                EXECUTION TICKET
              </button>
            </div>

            {/* Smart Order Routing Monitor Overlay Launcher Button */}
            <button
              onClick={() => {
                playKeyClick();
                setIsRoutingMonitorOpen(true);
              }}
              className="px-2 py-1 rounded bg-[#0284c7]/20 hover:bg-[#0284c7]/35 text-[#38bdf8] text-[10px] font-mono font-bold border border-[#0284c7]/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open real-time Exchange Routing Monitor (CBOE, ISE, PHLX, MX, TSX)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-ping" />
              <Activity className="w-3 h-3 text-[#38bdf8]" />
              <span>ROUTER MONITOR</span>
            </button>

            {onPopOut && (
              <button
                onClick={onPopOut}
                className="p-1 rounded hover:bg-[#1e2638] text-[#8b9bb4] hover:text-white"
                title="Pop out into floating window"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#ff334b]/20 text-[#8b9bb4] hover:text-[#ff334b] transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* EXECUTION SUCCESS RECEIPT OVERLAY */}
        {executionReceipt && (
          <div className="bg-[#052e16] border-b border-[#00e676]/40 p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00e676]/20 border border-[#00e676] flex items-center justify-center text-[#00e676]">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[#00e676] font-black text-sm flex items-center gap-2">
                  <span>ORDER FILLED: {executionReceipt.order.contracts}x {executionReceipt.order.strategyName}</span>
                  <span className="text-[10px] bg-[#00e676]/20 text-[#00e676] px-1.5 py-0.5 rounded border border-[#00e676]/40">
                    MATCH ID: {executionReceipt.cobMatchId}
                  </span>
                </div>
                <div className="text-[#a7f3d0] text-[11px]">
                  Filled at Net ${executionReceipt.order.limitPrice.toFixed(2)} {executionReceipt.order.netDebitCredit > 0 ? 'Debit' : 'Credit'} · Total Cash: ${Math.abs(executionReceipt.order.totalCost).toFixed(2)} · Executed at {executionReceipt.timestamp}
                </div>
                {executionReceipt.isSorExecuted && executionReceipt.venueAllocations && executionReceipt.venueAllocations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-[#6ee7b7] font-bold">SMART ROUTED FILLS:</span>
                    {executionReceipt.venueAllocations.map((v) => (
                      <span
                        key={v.exchange}
                        className="px-1.5 py-0.5 rounded bg-[#064e3b] text-[#a7f3d0] border border-[#00e676]/40 text-[9.5px] font-bold"
                      >
                        {v.flag} {v.exchange}: {v.contracts}x
                      </span>
                    ))}
                    {typeof executionReceipt.slippageSavingsTotal === 'number' && executionReceipt.slippageSavingsTotal > 0 && (
                      <span className="text-[10px] text-[#00e676] font-extrabold bg-[#00e676]/25 px-1.5 py-0.5 rounded border border-[#00e676]/50">
                        +${executionReceipt.slippageSavingsTotal.toFixed(2)} SLIPPAGE SAVED
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {executionReceipt.priceImprovementTotal > 0 && (
                <div className="bg-[#064e3b] px-2.5 py-1 rounded border border-[#00e676]/40 text-right">
                  <span className="text-[10px] text-[#6ee7b7] block">COB SAVINGS:</span>
                  <span className="text-[#00e676] font-black text-xs">+${executionReceipt.priceImprovementTotal.toFixed(2)}</span>
                </div>
              )}
              <button
                onClick={() => setExecutionReceipt(null)}
                className="px-3 py-1 rounded bg-[#00e676] hover:bg-[#10b981] text-black font-black text-xs transition-colors"
              >
                EXECUTE ANOTHER
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs transition-colors"
              >
                DONE (CLOSE)
              </button>
            </div>
          </div>
        )}

        {/* INSIDE MARKET (BBO) & COMPLEX ORDER BOOK SUMMARY RIBBON */}
        <div className="bg-[#0f172a] px-4 py-2 border-b border-[#1e293b] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono shrink-0">
          {/* Direct COB Market */}
          <div className="bg-[#0b0f19] p-2 rounded border border-[#1e293b]">
            <div className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider flex items-center justify-between">
              <span>DIRECT COB BBO</span>
              <span className="text-[#00e676] font-bold">LIVE</span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[#00e676] font-black text-sm">${strategyDepth.cobBid.toFixed(2)}</span>
              <span className="text-[#64748b] text-[10px]">x</span>
              <span className="text-[#ff334b] font-black text-sm">${strategyDepth.cobAsk.toFixed(2)}</span>
            </div>
            <div className="text-[9.5px] text-[#8b9bb4] truncate">
              Sprd: ${strategyDepth.cobSpread.toFixed(2)} ({strategyDepth.cobSpreadPercent}%)
            </div>
          </div>

          {/* Natural Leg-by-Leg Market */}
          <div className="bg-[#0b0f19] p-2 rounded border border-[#1e293b]">
            <div className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider">
              NATURAL LEGGING
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[#00e676]/70 font-bold text-xs">${strategyDepth.naturalBid.toFixed(2)}</span>
              <span className="text-[#64748b] text-[10px]">x</span>
              <span className="text-[#ff334b]/70 font-bold text-xs">${strategyDepth.naturalAsk.toFixed(2)}</span>
            </div>
            <div className="text-[9.5px] text-[#94a3b8]">
              Natural Sprd: ${strategyDepth.naturalSpread.toFixed(2)}
            </div>
          </div>

          {/* Price Improvement */}
          <div className="bg-[#0b0f19] p-2 rounded border border-[#1e293b]">
            <div className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ffd600]" />
              <span>IMPROVEMENT</span>
            </div>
            <div className="text-[#ffd600] font-black text-sm mt-0.5">
              +${strategyDepth.priceImprovement.toFixed(2)} / sh
            </div>
            <div className="text-[9.5px] text-[#a1a1aa]">
              +${(strategyDepth.priceImprovement * multiplier).toFixed(0)} / contract
            </div>
          </div>

          {/* Midpoint / Fair Value */}
          <div className="bg-[#0b0f19] p-2 rounded border border-[#1e293b]">
            <div className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider">
              COMBO MIDPOINT
            </div>
            <div className="text-[#38bdf8] font-black text-sm mt-0.5">
              ${strategyDepth.cobMid.toFixed(2)}
            </div>
            <div className="text-[9.5px] text-[#8b9bb4]">
              Fair Value Mark
            </div>
          </div>

          {/* Execution Safety & Legging Risk */}
          <div className="bg-[#0b0f19] p-2 rounded border border-[#1e293b]">
            <div className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#00e676]" />
              <span>ATOMIC SAFETY</span>
            </div>
            <div className="text-[#00e676] font-bold text-xs mt-0.5">
              ZERO LEGGING RISK
            </div>
            <div className="text-[9.5px] text-[#64748b]">
              Electronic COB Match
            </div>
          </div>

          {/* Net Combo Greeks */}
          <div className="bg-[#0b0f19] p-2 rounded border border-[#1e293b]">
            <div className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider">
              NET GREEKS
            </div>
            <div className="flex items-center justify-between text-[10px] mt-0.5">
              <span className="text-slate-400">Δ: <strong className={strategyDepth.comboDelta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>{strategyDepth.comboDelta}</strong></span>
              <span className="text-slate-400">Γ: <strong className="text-white">{strategyDepth.comboGamma}</strong></span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Θ: <strong className={strategyDepth.comboTheta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>{strategyDepth.comboTheta}</strong></span>
              <span className="text-slate-400">ν: <strong className="text-white">{strategyDepth.comboVega}</strong></span>
            </div>
          </div>

          {/* Order Flow Imbalance */}
          <div className="bg-[#0b0f19] p-2 rounded border border-[#1e293b]">
            <div className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider">
              COB IMBALANCE
            </div>
            <div className={`font-black text-xs mt-0.5 ${strategyDepth.imbalancePercent >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
              {strategyDepth.imbalancePercent >= 0 ? '+' : ''}{strategyDepth.imbalancePercent}% {strategyDepth.orderFlowBias.replace('_', ' ')}
            </div>
            <div className="text-[9.5px] text-[#8b9bb4]">
              {strategyDepth.totalBidLiquidity} vs {strategyDepth.totalAskLiquidity} contracts
            </div>
          </div>
        </div>

        {/* MAIN BODY: SPLIT VIEW OF DEPTH LADDER & TRADE TICKET */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1e293b]">
          
          {/* LEFT COLUMN: STRATEGY LEVEL 2 MARKET DEPTH (COB & SYNTHETIC) */}
          {(activeTab === 'split' || activeTab === 'depth') && (
            <div className={`${activeTab === 'depth' ? 'lg:col-span-12' : 'lg:col-span-6'} p-3 sm:p-4 flex flex-col gap-3.5 bg-[#080b11]`}>
              
              {/* Depth Controls & Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00e676]" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    STRATEGY MARKET DEPTH (LEVEL 2 DOM)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-[#8b9bb4]">BOOK:</span>
                  <button
                    onClick={() => setDepthLadderMode('cob')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      depthLadderMode === 'cob'
                        ? 'bg-[#00e676] text-black'
                        : 'bg-[#141b28] text-[#8b9bb4] hover:text-white border border-[#1e2638]'
                    }`}
                  >
                    DIRECT COB
                  </button>
                  <button
                    onClick={() => setDepthLadderMode('synthetic')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      depthLadderMode === 'synthetic'
                        ? 'bg-[#38bdf8] text-black'
                        : 'bg-[#141b28] text-[#8b9bb4] hover:text-white border border-[#1e2638]'
                    }`}
                  >
                    SYNTHETIC
                  </button>
                </div>
              </div>

              {/* SIDE-BY-SIDE BID & ASK DEPTH LADDERS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                
                {/* BIDS LADDER (BUYERS OF COMBO) */}
                <div className="bg-[#0e131f] border border-[#1e2638] rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-[#141b28] px-2.5 py-1.5 border-b border-[#1e2638] flex items-center justify-between text-[10px] font-bold text-[#00e676]">
                    <span>COMBO BIDS (BUYERS)</span>
                    <span>CUM: {strategyDepth.totalBidLiquidity}</span>
                  </div>
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-[#0b0e17] text-[#64748b] text-[9px] uppercase border-b border-[#1e2638]">
                      <tr>
                        <th className="py-1 px-1.5 text-left">VENUE</th>
                        <th className="py-1 px-1.5">SIZE</th>
                        <th className="py-1 px-2 text-right">BID PRICE</th>
                        <th className="py-1 px-1.5">CUM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ladderToDisplay.bidLadder.map((b) => (
                        <tr
                          key={`bid-${b.level}`}
                          onClick={() => {
                            playKeyClick();
                            setLimitPrice(b.price);
                            setUserEditedLimit(true);
                          }}
                          className="hover:bg-[#00e676]/15 transition-colors cursor-pointer group relative border-b border-[#151c2a]"
                          title={`Click to set limit price to $${b.price.toFixed(2)}`}
                        >
                          <td className="py-1 px-1.5 text-left text-[10px] text-[#94a3b8] font-semibold flex items-center gap-1">
                            <span className="text-[8.5px] text-[#64748b]">{b.level}</span>
                            <span>{b.exchange}</span>
                          </td>
                          <td className="py-1 px-1.5 text-white font-bold">{b.size}</td>
                          <td className="py-1 px-2 text-[#00e676] font-black group-hover:underline">
                            ${b.price.toFixed(2)}
                          </td>
                          <td className="py-1 px-1.5 text-[#64748b] text-[10px] relative">
                            {b.cumulativeSize}
                            <div
                              className="absolute top-0 right-0 bottom-0 bg-[#00e676]/10 -z-0 pointer-events-none"
                              style={{ width: `${b.percentOfMax}%` }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ASKS LADDER (SELLERS OF COMBO) */}
                <div className="bg-[#0e131f] border border-[#1e2638] rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-[#141b28] px-2.5 py-1.5 border-b border-[#1e2638] flex items-center justify-between text-[10px] font-bold text-[#ff334b]">
                    <span>COMBO ASKS (SELLERS)</span>
                    <span>CUM: {strategyDepth.totalAskLiquidity}</span>
                  </div>
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-[#0b0e17] text-[#64748b] text-[9px] uppercase border-b border-[#1e2638]">
                      <tr>
                        <th className="py-1 px-2 text-left">ASK PRICE</th>
                        <th className="py-1 px-1.5">SIZE</th>
                        <th className="py-1 px-1.5">VENUE</th>
                        <th className="py-1 px-1.5">CUM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ladderToDisplay.askLadder.map((a) => (
                        <tr
                          key={`ask-${a.level}`}
                          onClick={() => {
                            playKeyClick();
                            setLimitPrice(a.price);
                            setUserEditedLimit(true);
                          }}
                          className="hover:bg-[#ff334b]/15 transition-colors cursor-pointer group relative border-b border-[#151c2a]"
                          title={`Click to set limit price to $${a.price.toFixed(2)}`}
                        >
                          <td className="py-1 px-2 text-left text-[#ff334b] font-black group-hover:underline">
                            ${a.price.toFixed(2)}
                          </td>
                          <td className="py-1 px-1.5 text-white font-bold">{a.size}</td>
                          <td className="py-1 px-1.5 text-[#94a3b8] text-[10px] font-semibold">
                            {a.exchange}
                          </td>
                          <td className="py-1 px-1.5 text-[#64748b] text-[10px] relative">
                            {a.cumulativeSize}
                            <div
                              className="absolute top-0 right-0 bottom-0 bg-[#ff334b]/10 -z-0 pointer-events-none"
                              style={{ width: `${a.percentOfMax}%` }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SWEEP SLIPPAGE ESTIMATOR */}
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-2.5 text-xs font-mono">
                <div className="flex items-center justify-between text-[10px] text-[#8b9bb4] mb-1">
                  <span className="uppercase font-bold text-white flex items-center gap-1">
                    <Activity className="w-3 h-3 text-[#ff9900]" />
                    SWEEP SLIPPAGE SIMULATOR
                  </span>
                  <div className="flex items-center gap-1">
                    {[10, 25, 50, 100].map((qty) => (
                      <button
                        key={qty}
                        onClick={() => setSweepSimContracts(qty)}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] ${
                          sweepSimContracts === qty
                            ? 'bg-[#ff9900] text-black font-bold'
                            : 'bg-[#141b28] text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        {qty}x
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-[#1e293b]">
                  <div>
                    <span className="text-[#64748b] text-[9.5px] block">AVG COMBO FILL:</span>
                    <span className="text-white font-bold">${comboSlippage.avgExecutionPrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[9.5px] block">SLIPPAGE:</span>
                    <span className={`font-bold ${comboSlippage.slippageDollars <= 0.02 ? 'text-[#00e676]' : 'text-[#ffd600]'}`}>
                      ${comboSlippage.slippageDollars.toFixed(2)} ({comboSlippage.slippagePercent}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[9.5px] block">LEVELS CONSUMED:</span>
                    <span className="text-[#38bdf8] font-bold">{comboSlippage.levelsConsumed} / 8</span>
                  </div>
                </div>
              </div>

              {/* COMPLEX ORDER TAPE / TIME & SALES */}
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-2.5 text-xs font-mono">
                <div className="text-[10px] text-[#8b9bb4] uppercase font-bold tracking-wider mb-1.5 flex items-center justify-between">
                  <span>COMPLEX ORDER TAPE (RECENT COB PRINTS)</span>
                  <span className="text-[#00e676] text-[9px]">REAL-TIME TAPE</span>
                </div>
                <div className="flex flex-col gap-1 max-h-[110px] overflow-y-auto">
                  {strategyDepth.timeAndSales.map((ts) => (
                    <div
                      key={ts.id}
                      className="flex items-center justify-between py-0.5 px-1.5 rounded bg-[#0b0e17] text-[10px] border border-[#141b28]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[#64748b]">{ts.time}</span>
                        <span className="text-white font-bold">{ts.size}x</span>
                        <span className={`font-black ${ts.side === 'BID' ? 'text-[#00e676]' : ts.side === 'ASK' ? 'text-[#ff334b]' : 'text-[#38bdf8]'}`}>
                          ${ts.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-[#94a3b8]">{ts.venue}</span>
                        <span className="text-[8.5px] px-1 rounded bg-[#1e293b] text-[#cbd5e1]">
                          {ts.orderType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: INSTITUTIONAL MULTI-LEG TRADE EXECUTION TICKET */}
          {(activeTab === 'split' || activeTab === 'ticket') && (
            <div className={`${activeTab === 'ticket' ? 'lg:col-span-12' : 'lg:col-span-6'} p-3 sm:p-4 flex flex-col gap-3.5 bg-[#0b0f19]`}>
              
              {/* Header Title */}
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ff9900]" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    COMPLEX ORDER EXECUTION TICKET
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#8b9bb4]">
                  AVAIL CASH: <span className="text-white font-bold">${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* ACTIVE STRATEGY LEGS TABLE & STRIKE STEPPERS */}
              <div className="bg-[#080b11] border border-[#1e293b] rounded-lg overflow-hidden flex flex-col">
                <div className="bg-[#101726] px-3 py-1.5 border-b border-[#1e293b] flex items-center justify-between text-[10px] font-bold text-[#8b9bb4]">
                  <span>COMBO LEGS ALLOCATION</span>
                  <span>{activeLegs.length} CONTRACTS PER SET</span>
                </div>
                <div className="divide-y divide-[#151c2a] max-h-[175px] overflow-y-auto">
                  {activeLegs.map((leg) => {
                    const isBuy = leg.action === 'buy';
                    return (
                      <div
                        key={leg.id}
                        className="p-2 px-3 flex items-center justify-between gap-2 text-xs font-mono bg-[#0b0e17]"
                      >
                        {/* Leg Action Button */}
                        <button
                          onClick={() => handleToggleLegAction(leg.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-colors ${
                            isBuy
                              ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                              : 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                          }`}
                        >
                          {leg.action}
                        </button>

                        {/* Strike with Steppers */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleShiftStrike(leg.id, 'down')}
                            className="p-0.5 rounded bg-[#1e293b] hover:bg-[#334155] text-white"
                            title="Shift strike down"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-black text-sm text-white w-12 text-center">
                            ${leg.strike}
                          </span>
                          <button
                            onClick={() => handleShiftStrike(leg.id, 'up')}
                            className="p-0.5 rounded bg-[#1e293b] hover:bg-[#334155] text-white"
                            title="Shift strike up"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Call / Put type & Expiration */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-[11px] ${leg.type === 'call' ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                              {leg.type.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-[#64748b]">
                              {leg.dte}d DTE
                            </span>
                          </div>
                          <span className="text-[9.5px] text-[#8b9bb4]">
                            {leg.expiration}
                          </span>
                        </div>

                        {/* Quoted Premium */}
                        <div className="text-right">
                          <span className="text-white font-bold block">${leg.premium.toFixed(2)}</span>
                          <span className="text-[9.5px] text-[#64748b]">
                            ${(leg.premium * multiplier * leg.contracts).toFixed(0)} / contract
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ORDER TYPE, QUANTITY & LIMIT PRICE SETTINGS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                
                {/* Order Type */}
                <div className="bg-[#080b11] p-2.5 rounded-lg border border-[#1e293b] flex flex-col justify-between">
                  <span className="text-[10px] text-[#8b9bb4] uppercase font-bold block mb-1">
                    ORDER TYPE
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {(['limit', 'market', 'midpoint', 'auction'] as OrderTypeMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          playKeyClick();
                          setOrderType(mode);
                        }}
                        className={`py-1 px-1.5 rounded font-bold uppercase transition-colors ${
                          orderType === mode
                            ? 'bg-[#ff9900] text-black font-black'
                            : 'bg-[#141b28] hover:bg-[#1e2638] text-[#8b9bb4] border border-[#223150]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Sets Stepper */}
                <div className="bg-[#080b11] p-2.5 rounded-lg border border-[#1e293b] flex flex-col justify-between">
                  <span className="text-[10px] text-[#8b9bb4] uppercase font-bold block mb-1">
                    STRATEGY SETS
                  </span>
                  <div className="flex items-center justify-between bg-[#141b28] rounded border border-[#223150] p-1">
                    <button
                      onClick={() => setOrderSets(Math.max(1, orderSets - 1))}
                      className="w-7 h-7 rounded bg-[#1e293b] hover:bg-[#334155] text-white flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-base text-white">
                      {orderSets}
                    </span>
                    <button
                      onClick={() => setOrderSets(orderSets + 1)}
                      className="w-7 h-7 rounded bg-[#1e293b] hover:bg-[#334155] text-white flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex justify-between gap-1 mt-1 text-[9px]">
                    {[1, 5, 10, 25].map((s) => (
                      <button
                        key={s}
                        onClick={() => setOrderSets(s)}
                        className="px-1 py-0.5 rounded bg-[#141b28] hover:bg-[#1e2638] text-[#8b9bb4]"
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Net Combo Limit Price Input */}
                <div className="bg-[#080b11] p-2.5 rounded-lg border border-[#1e293b] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-[#8b9bb4] uppercase font-bold">NET LIMIT PRICE</span>
                    <span className={`font-bold ${isDebit ? 'text-[#ff334b]' : 'text-[#00e676]'}`}>
                      {isDebit ? 'DEBIT' : 'CREDIT'}
                    </span>
                  </div>
                  <div className="flex items-center bg-[#141b28] rounded border border-[#223150] px-2 py-1">
                    <span className="text-[#8b9bb4] font-bold mr-1">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={limitPrice}
                      onChange={(e) => {
                        setLimitPrice(parseFloat(e.target.value) || 0.01);
                        setUserEditedLimit(true);
                      }}
                      className="w-full bg-transparent text-white font-mono font-black text-sm outline-none"
                    />
                  </div>
                  {/* Quick price targets */}
                  <div className="flex justify-between gap-1 mt-1 text-[9px]">
                    <button
                      onClick={() => {
                        setLimitPrice(strategyDepth.cobBid);
                        setUserEditedLimit(true);
                      }}
                      className="px-1 py-0.5 rounded bg-[#141b28] hover:bg-[#00e676]/20 text-[#00e676]"
                      title="Join COB Bid"
                    >
                      BID ${strategyDepth.cobBid.toFixed(2)}
                    </button>
                    <button
                      onClick={() => {
                        setLimitPrice(strategyDepth.cobMid);
                        setUserEditedLimit(true);
                      }}
                      className="px-1 py-0.5 rounded bg-[#141b28] hover:bg-[#38bdf8]/20 text-[#38bdf8] font-bold"
                      title="Set to Midpoint"
                    >
                      MID ${strategyDepth.cobMid.toFixed(2)}
                    </button>
                    <button
                      onClick={() => {
                        setLimitPrice(strategyDepth.cobAsk);
                        setUserEditedLimit(true);
                      }}
                      className="px-1 py-0.5 rounded bg-[#141b28] hover:bg-[#ff334b]/20 text-[#ff334b]"
                      title="Cross COB Ask"
                    >
                      ASK ${strategyDepth.cobAsk.toFixed(2)}
                    </button>
                  </div>
                </div>
              </div>

              {/* SMART ORDER ROUTING (SOR) & VENUE ALLOCATION SECTION */}
              <div className="bg-[#080b11] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2.5 font-mono text-xs">
                {/* Header Row with SOR Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141d30] pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${isSorActive ? 'text-[#00e676]' : 'text-[#8b9bb4]'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black text-xs uppercase tracking-wider">
                          SMART ORDER ROUTING (SOR)
                        </span>
                        <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-black border ${
                          isSorActive
                            ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40'
                            : 'bg-[#1e293b] text-[#8b9bb4] border-[#334155]'
                        }`}>
                          {isSorActive ? 'AUTO MULTI-EXCHANGE SPLIT' : 'OFF (SINGLE VENUE)'}
                        </span>
                        {smartRoutingPlan.isDualListedOrCrossBorder && (
                          <span className="text-[9px] bg-[#ffd600]/15 text-[#ffd600] border border-[#ffd600]/40 px-1.5 py-0.5 rounded font-bold">
                            🇨🇦 DUAL-LISTED
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748b]">
                        Splits large multi-leg orders across CBOE, ISE, PHLX &amp; Canadian exchanges to minimize slippage
                      </span>
                    </div>
                  </div>

                  {/* Toggle Button & Monitor Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        playKeyClick();
                        setIsSorActive(!isSorActive);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSorActive
                          ? 'bg-[#00e676] text-black border-[#00e676] shadow-sm shadow-[#00e676]/30'
                          : 'bg-[#141b28] hover:bg-[#1e2638] text-[#94a3b8] border-[#334155]'
                      }`}
                      title={isSorActive ? 'Click to disable Smart Order Routing' : 'Click to enable Smart Order Routing'}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSorActive ? 'bg-black animate-pulse' : 'bg-[#64748b]'}`} />
                      <span>{isSorActive ? 'SOR ACTIVE' : 'ENABLE SOR'}</span>
                    </button>

                    {/* Routing Monitor Overlay Button */}
                    <button
                      onClick={() => {
                        playKeyClick();
                        setIsRoutingMonitorOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#0284c7]/20 hover:bg-[#0284c7]/35 text-[#38bdf8] text-xs font-bold border border-[#0284c7]/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Open full interactive Exchange Routing Monitor overlay"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>MONITOR</span>
                    </button>
                  </div>
                </div>

                {isSorActive ? (
                  <>
                    {/* Canadian Exchanges Toggle & Optimization Policy Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      {/* Canadian Exchanges Checkbox Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer bg-[#0f172a] px-2.5 py-1 rounded-lg border border-[#1e293b] hover:border-[#38bdf8]/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={includeCanadianExchanges}
                          onChange={(e) => {
                            playKeyClick();
                            setIncludeCanadianExchanges(e.target.checked);
                          }}
                          className="accent-[#38bdf8] cursor-pointer"
                        />
                        <span className="text-[10.5px] font-bold text-white flex items-center gap-1">
                          <span>🇨🇦 CANADIAN EXCHANGES (MX / TSX)</span>
                        </span>
                      </label>

                      {/* Optimization Policy Selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-[9.5px] text-[#64748b] uppercase font-bold mr-1">POLICY:</span>
                        {(
                          [
                            { id: 'MIN_SLIPPAGE', label: 'MIN SLIPPAGE' },
                            { id: 'MAX_REBATE', label: 'REBATES' },
                            { id: 'FAST_FILL', label: 'FAST (<100μs)' },
                            { id: 'BALANCED_CROSS_BORDER', label: 'CROSS-BORDER' },
                          ] as { id: RoutingOptimizationMode; label: string }[]
                        ).map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => {
                              playKeyClick();
                              setSorOptimizationMode(mode.id);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition-colors cursor-pointer ${
                              sorOptimizationMode === mode.id
                                ? 'bg-[#ff9900] text-black font-black'
                                : 'bg-[#141b28] hover:bg-[#1e2638] text-[#8b9bb4] border border-[#223150]'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Real-Time Exchange Split Badges & Slippage Savings Banner */}
                    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[#8b9bb4] font-bold uppercase">VENUE SPLIT:</span>
                        {smartRoutingPlan.exchangeAllocations.map((alloc) => (
                          <div
                            key={alloc.exchange}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#162035] border border-[#253554] text-[10px]"
                          >
                            <span>{alloc.flag}</span>
                            <span className="font-bold text-white">{alloc.exchange}</span>
                            <span className="text-[#38bdf8] font-black">{alloc.totalContracts}x ({alloc.percentOfTotalOrder}%)</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        {smartRoutingPlan.totalSlippageSavingsDollars > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] font-black border border-[#00e676]/40">
                            +${smartRoutingPlan.totalSlippageSavingsDollars.toFixed(2)} SLIPPAGE SAVED
                          </span>
                        )}
                        <span className="text-[10px] text-[#94a3b8]">
                          SOR Price: <strong className="text-white">${smartRoutingPlan.smartRoutedPrice.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Leg-by-Leg Destination Routing Preview */}
                    <div className="flex flex-col gap-1 border-t border-[#141d30] pt-1.5">
                      <div className="flex items-center justify-between text-[9.5px] text-[#64748b] uppercase font-bold">
                        <span>LEG ROUTING DESTINATIONS:</span>
                        <button
                          onClick={() => setIsRoutingMonitorOpen(true)}
                          className="text-[#38bdf8] hover:underline cursor-pointer lowercase"
                        >
                          view full leg matrix in monitor →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                        {smartRoutingPlan.legSplits.map((ls, idx) => (
                          <div
                            key={ls.legId}
                            className="flex items-center justify-between py-1 px-2 rounded bg-[#0b0e17] border border-[#1a2335]"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-[#64748b] font-bold">L{idx + 1}:</span>
                              <span className={`font-bold uppercase ${ls.action === 'buy' ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                                {ls.action}
                              </span>
                              <span className="text-white font-bold">${ls.strike} {ls.type.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[#8b9bb4]">→</span>
                              <span className="font-black text-[#ffd600]">
                                {ls.allocations.map((a) => `${a.exchange} (${a.contracts}x)`).join(' / ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Single Venue Destination fallback when SOR is disabled */
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#8b9bb4] uppercase">SINGLE EXCHANGE VENUE</span>
                      <span className="text-[9.5px] text-[#ffd600]">Notice: Higher slippage risk for large combo sizes</span>
                    </div>
                    <select
                      value={routingVenue}
                      onChange={(e) => setRoutingVenue(e.target.value as RouteDestination)}
                      className="w-full bg-[#141b28] border border-[#1e293b] rounded p-1.5 text-white font-bold text-xs outline-none"
                    >
                      <option value="CBOE_COB">CBOE COMPLEX BOOK (COB)</option>
                      <option value="ISE_COMPLEX">ISE COMPLEX ORDER MATCH</option>
                      <option value="PHLX_COMPLEX">PHLX COMPLEX SPREAD</option>
                      <option value="MX_MONTREAL">MX (Bourse de Montréal) COMPLEX</option>
                      <option value="TSX_ALPHA">TSX ALPHA DIRECT BOOK</option>
                      <option value="CITADEL_DIRECT">CITADEL DIRECT LIQUIDITY</option>
                    </select>
                  </div>
                )}
              </div>

              {/* TIF & ATOMIC MATCH GUARANTEE CONTROLS */}
              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[#8b9bb4] uppercase block mb-1">
                    TIME IN FORCE (TIF)
                  </span>
                  <select
                    value={timeInForce}
                    onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
                    className="w-full bg-[#080b11] border border-[#1e293b] rounded p-1.5 text-white font-bold text-xs outline-none"
                  >
                    <option value="DAY">DAY (Standard Session)</option>
                    <option value="GTC">GTC (Good 'Til Cancel)</option>
                    <option value="IOC">IOC (Immediate Or Cancel)</option>
                    <option value="FOK">FOK (Fill Or Kill)</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-[#8b9bb4] uppercase block mb-1">
                    ATOMIC MATCH GUARANTEE
                  </span>
                  <button
                    onClick={() => setAtomicGuarantee((prev) => !prev)}
                    className={`w-full py-1.5 px-2 rounded font-bold text-xs border flex items-center justify-center gap-1.5 ${
                      atomicGuarantee
                        ? 'bg-[#00e676]/15 border-[#00e676]/50 text-[#00e676]'
                        : 'bg-[#141b28] border-[#334155] text-[#94a3b8]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{atomicGuarantee ? 'ALL LEGS ATOMIC (NO LEGGING)' : 'STANDARD LEGGING'}</span>
                  </button>
                </div>
              </div>

              {/* CAPITAL IMPACT & RISK PROFILE CARDS */}
              <div className="bg-[#080b11] border border-[#1e293b] rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[#8b9bb4] uppercase block">
                    TOTAL CASH BASIS
                  </span>
                  <span className={`font-black text-base ${isDebit ? 'text-[#ff334b]' : 'text-[#00e676]'}`}>
                    ${totalNotionalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9.5px] text-[#64748b] block">
                    {isDebit ? 'Net Cash Debit Outflow' : 'Net Cash Credit Inflow'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8b9bb4] uppercase block">
                    MAX PROFIT
                  </span>
                  <span className="font-black text-base text-[#00e676]">
                    {typeof analysis.maxProfit === 'number'
                      ? `$${(analysis.maxProfit * orderSets).toFixed(2)}`
                      : 'UNLIMITED'}
                  </span>
                  <span className="text-[9.5px] text-[#64748b] block">
                    POP: {analysis.probOfProfit}%
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8b9bb4] uppercase block">
                    MAX RISK / LOSS
                  </span>
                  <span className="font-black text-base text-[#ff334b]">
                    {typeof analysis.maxLoss === 'number'
                      ? `$${Math.abs(analysis.maxLoss * orderSets).toFixed(2)}`
                      : 'UNLIMITED'}
                  </span>
                  <span className="text-[9.5px] text-[#64748b] block">
                    Defined Risk Spread
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8b9bb4] uppercase block">
                    COMMISSIONS & FEES
                  </span>
                  <span className="font-bold text-sm text-slate-300">
                    ${estimatedCommissions.toFixed(2)}
                  </span>
                  <span className="text-[9.5px] text-[#64748b] block">
                    ${(0.70).toFixed(2)} / contract leg
                  </span>
                </div>
              </div>

              {/* PRIMARY SUBMIT COMBO ORDER ACTION BUTTON */}
              <button
                disabled={isExecuting || activeLegs.length === 0}
                onClick={handleExecuteMultiLegOrder}
                className={`w-full py-3 px-4 rounded-xl font-mono font-black text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                  isExecuting
                    ? 'bg-[#334155] text-[#94a3b8] cursor-wait'
                    : isDebit
                    ? 'bg-[#ff334b] hover:bg-[#ff4d63] text-white shadow-[#ff334b]/20 hover:shadow-[#ff334b]/40'
                    : 'bg-[#00e676] hover:bg-[#1cf387] text-black shadow-[#00e676]/20 hover:shadow-[#00e676]/40'
                }`}
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {isSorActive
                        ? 'DISPATCHING PARALLEL SOR SWEEP (CBOE / ISE / PHLX / CA)...'
                        : `ROUTING TO ${routingVenue} COB AUCTION...`}
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>
                      {isSorActive
                        ? `EXECUTE SMART ROUTED ${orderSets}x ${analysis.name.toUpperCase()} @ $${(isSorActive ? smartRoutingPlan.smartRoutedPrice : limitPrice).toFixed(2)} ${isDebit ? 'DEBIT' : 'CREDIT'}`
                        : `EXECUTE ${orderSets}x ${analysis.name.toUpperCase()} @ $${limitPrice.toFixed(2)} ${isDebit ? 'DEBIT' : 'CREDIT'}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* REAL-TIME EXCHANGE ROUTING MONITOR OVERLAY (CBOE, ISE, PHLX, MX, TSX) */}
      {isRoutingMonitorOpen && (
        <ExchangeRoutingMonitorOverlay
          plan={smartRoutingPlan}
          onClose={() => setIsRoutingMonitorOpen(false)}
          onApplyPlan={() => {
            setIsSorActive(true);
            if (smartRoutingPlan.smartRoutedPrice > 0) {
              setLimitPrice(smartRoutingPlan.smartRoutedPrice);
              setUserEditedLimit(true);
            }
          }}
          onExecuteTrade={() => {
            setIsRoutingMonitorOpen(false);
            handleExecuteMultiLegOrder();
          }}
          isExecuting={isExecuting}
          onToggleCanadianExchanges={(enabled) => setIncludeCanadianExchanges(enabled)}
          onChangeOptimizationMode={(mode) => setSorOptimizationMode(mode)}
          onRefreshQuotes={() => setLivePulse((p) => p + 1)}
        />
      )}
    </div>
  );
};
