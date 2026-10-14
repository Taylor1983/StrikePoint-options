import React, { useState, useMemo } from 'react';
import { TradeLeg, Order, Position } from '../types/options';
import {
  analyzeStrategy,
  calculateStrategyPayoff,
  StrategyPayoffPoint,
} from '../utils/blackScholes';
import { playExecutionChime, playKeyClick } from '../utils/terminalSound';
import {
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Activity,
  Layers,
  Table,
  Sliders,
  DollarSign,
  TrendingUp,
  BarChart2,
  Crosshair,
  Zap,
  Info,
  ChevronDown,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

interface OptionsValuationOVMEProps {
  currentStockPrice: number;
  tickerSymbol: string;
  legs: TradeLeg[];
  onUpdateLeg: (updatedLeg: TradeLeg) => void;
  onRemoveLeg: (legId: string) => void;
  onClearLegs: () => void;
  onExecuteTrade: (order: Order, position: Position) => void;
  cashBalance: number;
  onNavigateToScenario: () => void;
  onNavigateToCone?: () => void;
  onApplyStrategyTemplate?: (templateName: string) => void;
  onOpenStrategyCatalog?: () => void;
  onOpenStrategyExecution?: () => void;
}

export type RiskGraphMode = 'pnl' | 'dual' | 'greek';
export type GreekProfileType = 'delta' | 'gamma' | 'theta' | 'vega' | 'rho';

export const OptionsValuationOVME: React.FC<OptionsValuationOVMEProps> = ({
  currentStockPrice,
  tickerSymbol,
  legs,
  onUpdateLeg,
  onRemoveLeg,
  onClearLegs,
  onExecuteTrade,
  cashBalance,
  onNavigateToScenario,
  onNavigateToCone,
  onApplyStrategyTemplate,
  onOpenStrategyCatalog,
  onOpenStrategyExecution,
}) => {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [orderContracts, setOrderContracts] = useState<number>(1);
  const [timeElapsedDays, setTimeElapsedDays] = useState<number>(0);
  const [ivShiftPercent, setIvShiftPercent] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<StrategyPayoffPoint | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Risk Graph & Greeks Display States
  const [graphMode, setGraphMode] = useState<RiskGraphMode>('dual');
  const [activeGreek, setActiveGreek] = useState<GreekProfileType>('delta');
  const [selectedShockPct, setSelectedShockPct] = useState<number>(0);
  const [showAttribution, setShowAttribution] = useState<boolean>(true);

  // Strategy Analysis
  const analysis = useMemo(() => {
    return analyzeStrategy(legs, currentStockPrice);
  }, [legs, currentStockPrice]);

  // Payoff and Greeks Points across stock price spectrum
  const payoffPoints = useMemo(() => {
    return calculateStrategyPayoff(
      legs,
      currentStockPrice,
      ivShiftPercent / 100,
      timeElapsedDays
    );
  }, [legs, currentStockPrice, ivShiftPercent, timeElapsedDays]);

  const maxDte = useMemo(() => {
    return legs.length > 0 ? Math.max(...legs.map((l) => l.dte)) : 30;
  }, [legs]);

  const totalNetDebitCredit = analysis.netDebitCredit * orderContracts;
  const isDebit = totalNetDebitCredit > 0;

  // Selected or target price for Greeks Attribution calculation
  const targetStockPrice = useMemo(() => {
    if (hoveredPoint) return hoveredPoint.price;
    if (selectedShockPct !== 0) {
      return Number((currentStockPrice * (1 + selectedShockPct / 100)).toFixed(2));
    }
    return currentStockPrice;
  }, [hoveredPoint, selectedShockPct, currentStockPrice]);

  // Find payoff data node closest to targetStockPrice
  const targetPoint = useMemo(() => {
    if (payoffPoints.length === 0) return null;
    return payoffPoints.reduce((prev, curr) =>
      Math.abs(curr.price - targetStockPrice) < Math.abs(prev.price - targetStockPrice) ? curr : prev
    );
  }, [payoffPoints, targetStockPrice]);

  // Quantitative Greeks P/L Attribution (Taylor Decomposition)
  const greeksAttribution = useMemo(() => {
    const deltaS = targetStockPrice - currentStockPrice;
    const deltaIV = ivShiftPercent / 100;
    const days = timeElapsedDays;

    // First-order price sensitivity: Delta * dS
    const deltaPnL = analysis.totalDelta * deltaS * orderContracts;

    // Second-order convexity: 1/2 * Gamma * (dS)^2
    // Gamma is per share, so multiply by 100 shares/contract
    const gammaPnL = 0.5 * analysis.totalGamma * Math.pow(deltaS, 2) * 100 * orderContracts;

    // Time decay: Theta * days
    const thetaPnL = analysis.totalTheta * days * orderContracts;

    // Volatility sensitivity: Vega * dIV (vega is per 1% IV)
    const vegaPnL = analysis.totalVega * (deltaIV * 100) * orderContracts;

    // Sum of first and second order Greek approximations
    const totalAttributed = deltaPnL + gammaPnL + thetaPnL + vegaPnL;

    // Exact theoretical Black-Scholes P/L at target price
    const actualPnL = targetPoint ? targetPoint.pnlT0 * orderContracts : totalAttributed;

    // Higher-order Cross-effects (Vanna, Volga, Charm, Speed)
    const residualPnL = actualPnL - totalAttributed;

    return {
      deltaS,
      deltaIV,
      days,
      deltaPnL,
      gammaPnL,
      thetaPnL,
      vegaPnL,
      totalAttributed,
      actualPnL,
      residualPnL,
    };
  }, [
    targetStockPrice,
    currentStockPrice,
    ivShiftPercent,
    timeElapsedDays,
    analysis,
    orderContracts,
    targetPoint,
  ]);

  const handleExecute = () => {
    if (legs.length === 0) return;
    playExecutionChime();

    const orderId = `BLOT-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

    const totalLegContracts = legs.reduce((acc, l) => acc + l.contracts, 0) || 1;
    const strategyEntryIV = Number(
      (legs.reduce((acc, l) => acc + (l.iv || 0.25) * l.contracts, 0) / totalLegContracts).toFixed(4)
    );

    const newOrder: Order = {
      id: orderId,
      timestamp,
      ticker: tickerSymbol,
      strategyName: analysis.name,
      type: orderType,
      limitPrice: Math.abs(analysis.netDebitCredit / (100 * (legs[0]?.contracts || 1))),
      legs: legs.map((l) => ({ ...l, contracts: l.contracts * orderContracts })),
      contracts: orderContracts,
      netDebitCredit: totalNetDebitCredit,
      totalCost: totalNetDebitCredit,
      status: 'filled',
      entryIV: strategyEntryIV,
      tradeIV: strategyEntryIV,
    };

    const newPosition: Position = {
      id: `pos-${Date.now()}`,
      ticker: tickerSymbol,
      strategyName: analysis.name,
      openedAt: timestamp,
      legs: legs.map((l) => ({ ...l, contracts: l.contracts * orderContracts })),
      contracts: orderContracts,
      entryCost: totalNetDebitCredit,
      currentMark: totalNetDebitCredit,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      entryIV: strategyEntryIV,
      tradeIV: strategyEntryIV,
    };

    onExecuteTrade(newOrder, newPosition);
    setExecutionMessage(
      `ORDER FILLED // ${orderContracts}x ${analysis.name} @ ${isDebit ? 'DEBIT' : 'CREDIT'} $${Math.abs(totalNetDebitCredit).toFixed(2)}`
    );

    setTimeout(() => {
      setExecutionMessage(null);
    }, 4500);
  };

  // SVG Chart Dimensions
  const svgWidth = 660;
  const pnlSvgHeight = graphMode === 'dual' ? 145 : graphMode === 'pnl' ? 220 : 0;
  const greekSvgHeight = graphMode === 'dual' ? 105 : graphMode === 'greek' ? 220 : 0;
  const padding = { top: 20, right: 35, bottom: 25, left: 65 };

  // Common X-axis (Stock Price Bounds)
  const chartBounds = useMemo(() => {
    if (payoffPoints.length === 0) return null;
    const prices = payoffPoints.map((p) => p.price);
    const pnlsExp = payoffPoints.map((p) => p.pnlExpiration);
    const pnlsT0 = payoffPoints.map((p) => p.pnlT0);

    const minX = Math.min(...prices);
    const maxX = Math.max(...prices);

    let minY = Math.min(...pnlsExp, ...pnlsT0);
    let maxY = Math.max(...pnlsExp, ...pnlsT0);

    if (minY > 0) minY = -Math.abs(minY * 0.2);
    if (maxY < 0) maxY = Math.abs(maxY * 0.2);

    const rangeY = maxY - minY || 100;
    minY -= rangeY * 0.15;
    maxY += rangeY * 0.15;

    return { minX, maxX, minY, maxY };
  }, [payoffPoints]);

  // Greek Chart Bounds
  const greekBounds = useMemo(() => {
    if (payoffPoints.length === 0) return null;
    const values = payoffPoints.map((p) => p[activeGreek]);
    let minY = Math.min(...values);
    let maxY = Math.max(...values);

    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }

    // Always include zero in Greeks bounds for clear zero-crossing line
    if (minY > 0) minY = 0;
    if (maxY < 0) maxY = 0;

    const rangeY = maxY - minY || 1;
    minY -= rangeY * 0.15;
    maxY += rangeY * 0.15;

    return { minY, maxY };
  }, [payoffPoints, activeGreek]);

  // Coordinate mappers
  const getPnlSvgCoords = (price: number, pnl: number) => {
    if (!chartBounds || pnlSvgHeight === 0) return { x: 0, y: 0 };
    const { minX, maxX, minY, maxY } = chartBounds;
    const x =
      padding.left +
      ((price - minX) / (maxX - minX || 1)) * (svgWidth - padding.left - padding.right);
    const y =
      pnlSvgHeight -
      padding.bottom -
      ((pnl - minY) / (maxY - minY || 1)) * (pnlSvgHeight - padding.top - padding.bottom);
    return { x, y };
  };

  const getGreekSvgCoords = (price: number, val: number) => {
    if (!chartBounds || !greekBounds || greekSvgHeight === 0) return { x: 0, y: 0 };
    const { minX, maxX } = chartBounds;
    const { minY, maxY } = greekBounds;
    const x =
      padding.left +
      ((price - minX) / (maxX - minX || 1)) * (svgWidth - padding.left - padding.right);
    const y =
      greekSvgHeight -
      padding.bottom -
      ((val - minY) / (maxY - minY || 1)) * (greekSvgHeight - padding.top - padding.bottom);
    return { x, y };
  };

  // P&L Curves
  const expPathD = useMemo(() => {
    if (payoffPoints.length === 0 || !chartBounds || pnlSvgHeight === 0) return '';
    return payoffPoints.reduce((acc, point, index) => {
      const { x, y } = getPnlSvgCoords(point.price, point.pnlExpiration);
      return `${acc} ${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [payoffPoints, chartBounds, pnlSvgHeight]);

  const t0PathD = useMemo(() => {
    if (payoffPoints.length === 0 || !chartBounds || pnlSvgHeight === 0) return '';
    return payoffPoints.reduce((acc, point, index) => {
      const { x, y } = getPnlSvgCoords(point.price, point.pnlT0);
      return `${acc} ${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [payoffPoints, chartBounds, pnlSvgHeight]);

  // Selected Greek Curve
  const greekPathD = useMemo(() => {
    if (payoffPoints.length === 0 || !chartBounds || !greekBounds || greekSvgHeight === 0) return '';
    return payoffPoints.reduce((acc, point, index) => {
      const val = point[activeGreek];
      const { x, y } = getGreekSvgCoords(point.price, val);
      return `${acc} ${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [payoffPoints, chartBounds, greekBounds, activeGreek, greekSvgHeight]);

  const zeroPnlY = chartBounds ? getPnlSvgCoords(chartBounds.minX, 0).y : 0;
  const zeroGreekY = greekBounds ? getGreekSvgCoords(chartBounds?.minX || 0, 0).y : 0;
  const currentPriceX = chartBounds ? getPnlSvgCoords(currentStockPrice, 0).x : 0;

  // Active Greek display details
  const greekMeta = useMemo(() => {
    switch (activeGreek) {
      case 'delta':
        return {
          symbol: 'Δ',
          name: 'Delta Profile (Shares Exposure)',
          color: '#00e5ff',
          unit: 'shares',
          desc: 'Directional speed. Shows delta-neutral points and directional shifts.',
        };
      case 'gamma':
        return {
          symbol: 'Γ',
          name: 'Gamma Profile (Curvature & Pin Risk)',
          color: '#a855f7',
          unit: 'Δ/pt',
          desc: 'Convexity rate. Peaks around short strikes; measures gamma squeeze danger.',
        };
      case 'theta':
        return {
          symbol: 'Θ',
          name: 'Theta Profile (Daily Time Decay)',
          color: '#ffd600',
          unit: '$/day',
          desc: 'Decay pace. Positive is time decay collected; negative is time decay paid.',
        };
      case 'vega':
        return {
          symbol: 'ν',
          name: 'Vega Profile (Volatility Sensitivity)',
          color: '#ec4899',
          unit: '$/1% IV',
          desc: 'Vol exposure. Dollar change per 1 percentage point shift in implied vol.',
        };
      case 'rho':
        return {
          symbol: 'ρ',
          name: 'Rho Profile (Interest Rate Sensitivity)',
          color: '#38bdf8',
          unit: '$/1% rate',
          desc: 'Sensitivity to benchmark central bank interest rates.',
        };
    }
  }, [activeGreek]);

  if (legs.length === 0) {
    return (
      <div className="bg-[#07090e] border border-[#1e2638] rounded p-10 text-center font-mono">
        <div className="w-12 h-12 rounded bg-[#0f1422] border border-[#222d44] flex items-center justify-center mx-auto mb-3 text-[#ff9900]">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">OVME // STRATEGY STRUCTURING EMPTY</h4>
        <p className="text-xs text-[#8b9bb4] max-w-lg mx-auto mb-4">
          Select legs in the <strong className="text-[#ff9900]">OMON</strong> options monitor by
          clicking any <span className="text-[#00e676]">Ask to BUY</span> or{' '}
          <span className="text-[#ff334b]">Bid to SELL</span>, or instantly load an institutional strategy template:
        </p>

        {onApplyStrategyTemplate && (
          <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
            <button
              onClick={() => {
                playKeyClick();
                onApplyStrategyTemplate('covered-call');
              }}
              className="px-3.5 py-2 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-black rounded text-xs transition-all shadow-[0_0_15px_rgba(255,153,0,0.35)] flex items-center gap-1.5"
            >
              <span>+ COVERED CALL</span>
              <span className="text-[10px] bg-black/35 text-white px-1.5 py-0.5 rounded font-bold">
                100sh + Short Call
              </span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                onApplyStrategyTemplate('bull-call-spread');
              }}
              className="px-3 py-2 bg-[#141b28] hover:bg-[#1f293d] text-[#00d2ff] border border-[#00d2ff]/40 font-bold rounded text-xs transition-all"
            >
              Bull Call Spread
            </button>
            <button
              onClick={() => {
                playKeyClick();
                onApplyStrategyTemplate('iron-condor');
              }}
              className="px-3 py-2 bg-[#141b28] hover:bg-[#1f293d] text-[#ffd600] border border-[#ffd600]/40 font-bold rounded text-xs transition-all"
            >
              Iron Condor
            </button>
            <button
              onClick={() => {
                playKeyClick();
                onApplyStrategyTemplate('bull-put-spread');
              }}
              className="px-3 py-2 bg-[#141b28] hover:bg-[#1f293d] text-[#00e676] border border-[#00e676]/40 font-bold rounded text-xs transition-all"
            >
              Bull Put Credit (+Θ)
            </button>
            <button
              onClick={() => {
                playKeyClick();
                onApplyStrategyTemplate('long-straddle');
              }}
              className="px-3 py-2 bg-[#141b28] hover:bg-[#1f293d] text-[#cbd5e1] border border-[#2d3748] font-bold rounded text-xs transition-all"
            >
              Long Straddle
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl font-mono text-xs">
      {/* Execution Toast */}
      {executionMessage && (
        <div className="bg-[#00e676]/20 border-b border-[#00e676] px-4 py-2 text-xs text-[#00e676] font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{executionMessage}</span>
        </div>
      )}

      {/* Screen Header Bar */}
      <div className="bg-[#0b0f1a] border-b border-[#1e2638] px-3 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[#ff9900] font-black text-sm tracking-wider">
            {tickerSymbol} US Equity OVME
          </span>
          <span className="text-[#8b9bb4] text-[11px] hidden sm:inline">
            // OPTION VALUATION & GREEKS RISK GRAPH
          </span>
          <span className="bg-[#1a2336] text-[#ffd600] px-2 py-0.5 rounded text-[11px] font-bold ml-2">
            {analysis.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onApplyStrategyTemplate && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  playKeyClick();
                  onApplyStrategyTemplate(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="bg-[#0e1320] border border-[#ff9900]/40 text-[#ff9900] text-xs rounded px-2 py-1 font-bold focus:outline-none max-w-[200px] truncate"
            >
              <option value="" disabled>
                + QUICK TEMPLATES...
              </option>
              <optgroup label="Single Leg Options">
                <option value="long-call">Long Call (Bullish)</option>
                <option value="short-call">Short Call (Naked)</option>
                <option value="long-put">Long Put (Bearish)</option>
                <option value="cash-secured-put">Cash-Secured Put</option>
              </optgroup>
              <optgroup label="Vertical Spreads">
                <option value="bull-call-spread">Bull Call Spread (+Δ)</option>
                <option value="bear-put-spread">Bear Put Spread (-Δ)</option>
                <option value="bull-put-spread">Bull Put Spread (+Θ)</option>
                <option value="bear-call-spread">Bear Call Spread (+Θ)</option>
              </optgroup>
              <optgroup label="Straddles & Strangles">
                <option value="long-straddle">Long Straddle (Vol)</option>
                <option value="short-straddle">Short Straddle (Theta)</option>
                <option value="long-strangle">Long Strangle (OTM)</option>
                <option value="short-strangle">Short Strangle</option>
              </optgroup>
              <optgroup label="Wings & Multi-Leg">
                <option value="iron-condor">Iron Condor (4-Leg)</option>
                <option value="reverse-iron-condor">Reverse Iron Condor</option>
                <option value="iron-butterfly">Iron Butterfly (ATM)</option>
                <option value="long-call-butterfly">Call Butterfly (1-2-1)</option>
                <option value="long-put-butterfly">Put Butterfly (1-2-1)</option>
                <option value="broken-wing-call-butterfly">Broken Wing Butterfly</option>
              </optgroup>
              <optgroup label="Calendars & Diagonals">
                <option value="call-calendar-spread">Call Calendar Spread</option>
                <option value="put-calendar-spread">Put Calendar Spread</option>
                <option value="poor-mans-covered-call">Poor Man's Covered Call (PMCC)</option>
                <option value="poor-mans-covered-put">Poor Man's Covered Put (PMCP)</option>
                <option value="double-calendar-spread">Double Calendar</option>
              </optgroup>
              <optgroup label="Covered & Synthetics">
                <option value="covered-call">Covered Call (Buy-Write)</option>
                <option value="protective-put">Protective Put (Hedge)</option>
                <option value="collar">Collar (Zero-Cost)</option>
                <option value="synthetic-long-stock">Synthetic Long (+100Δ)</option>
                <option value="synthetic-short-stock">Synthetic Short (-100Δ)</option>
              </optgroup>
              <optgroup label="Ratio & Exotics">
                <option value="jade-lizard">Jade Lizard</option>
                <option value="reverse-jade-lizard">Reverse Jade Lizard</option>
                <option value="call-ratio-backspread">Call Ratio Backspread</option>
                <option value="put-ratio-backspread">Put Ratio Backspread</option>
                <option value="box-spread">Box Spread (Arbitrage)</option>
              </optgroup>
            </select>
          )}

          {onOpenStrategyCatalog && (
            <button
              onClick={() => {
                playKeyClick();
                onOpenStrategyCatalog();
              }}
              className="px-2.5 py-1 bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 rounded text-xs font-bold transition-all shadow-[0_0_8px_rgba(255,153,0,0.2)]"
              title="Open full options strategy catalog & directory"
            >
              + ALL STRATEGIES...
            </button>
          )}

          {onNavigateToCone && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToCone();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 rounded text-xs font-bold transition-all shadow-[0_0_8px_rgba(255,153,0,0.2)]"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>PROBABILITY CONE</span>
            </button>
          )}

          <button
            onClick={() => {
              playKeyClick();
              onNavigateToScenario();
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/50 rounded text-xs font-bold transition-all"
          >
            <Table className="w-3.5 h-3.5" />
            <span>SCENARIO MATRIX</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              onClearLegs();
            }}
            className="px-2.5 py-1 text-[#ff334b] hover:bg-[#ff334b]/20 border border-[#ff334b]/40 rounded text-xs font-bold transition-all"
          >
            CLEAR LEGS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1e2638]">
        {/* Left Column: Multi-Leg Positions & Greeks (5 cols) */}
        <div className="lg:col-span-5 p-3 flex flex-col gap-3 bg-[#080b14]">
          <div className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span>Strategy Legs ({legs.length})</span>
              {!legs.some((l) => l.type === 'stock') && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onUpdateLeg({
                      id: `leg-stock-${Date.now()}`,
                      type: 'stock',
                      action: 'buy',
                      strike: Number(currentStockPrice.toFixed(2)),
                      expiration: legs[0]?.expiration ?? 'Spot',
                      dte: legs[0]?.dte ?? 30,
                      iv: 0,
                      premium: Number(currentStockPrice.toFixed(2)),
                      contracts: 1,
                    });
                  }}
                  className="text-[9px] text-[#00d2ff] bg-[#00d2ff]/15 hover:bg-[#00d2ff]/25 px-1.5 py-0.5 rounded border border-[#00d2ff]/40 font-bold transition-all"
                  title="Add 100 shares of underlying stock to create a Covered Call"
                >
                  + 100 SH (COVERED CALL)
                </button>
              )}
            </div>
            <span>Multiplier: 100</span>
          </div>

          {/* Active Legs List */}
          <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
            {legs.map((leg) => {
              const isBuy = leg.action === 'buy';
              const isStock = leg.type === 'stock';
              return (
                <div
                  key={leg.id}
                  className={`border rounded p-2 flex items-center justify-between gap-2 text-xs transition-colors ${
                    isStock
                      ? 'bg-[#00d2ff]/5 border-[#00d2ff]/30'
                      : 'bg-[#0b0f1a] border-[#1e2638]'
                  }`}
                >
                  {/* Action Toggle */}
                  <button
                    onClick={() => {
                      playKeyClick();
                      onUpdateLeg({
                        ...leg,
                        action: isBuy ? 'sell' : 'buy',
                      });
                    }}
                    className={`px-2 py-0.5 rounded font-black uppercase text-[10px] border ${
                      isBuy
                        ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/50'
                        : 'bg-[#ff334b]/20 text-[#ff334b] border-[#ff334b]/50'
                    }`}
                  >
                    {leg.action}
                  </button>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-[#05070a] border border-[#1e2638] rounded px-1">
                    <button
                      onClick={() => {
                        playKeyClick();
                        onUpdateLeg({ ...leg, contracts: Math.max(1, leg.contracts - 1) });
                      }}
                      className="text-[#64748b] hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-white text-xs w-4 text-center">
                      {leg.contracts}
                    </span>
                    <button
                      onClick={() => {
                        playKeyClick();
                        onUpdateLeg({ ...leg, contracts: leg.contracts + 1 });
                      }}
                      className="text-[#64748b] hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Leg Detail */}
                  <div className="flex flex-col min-w-0">
                    <div className="font-bold text-white flex items-center gap-1">
                      {isStock ? (
                        <>
                          <span className="text-[#00d2ff]">100 SHARES</span>
                          <span className="text-[10px] uppercase text-[#00d2ff] bg-[#00d2ff]/20 px-1 py-0.2 rounded font-black">
                            STOCK
                          </span>
                        </>
                      ) : (
                        <>
                          <span>${leg.strike}</span>
                          <span
                            className={`text-[10px] uppercase ${
                              leg.type === 'call' ? 'text-[#00e676]' : 'text-[#ff334b]'
                            }`}
                          >
                            {leg.type}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-[#8b9bb4] truncate">
                      {isStock
                        ? `Spot Basis: $${leg.premium.toFixed(2)}`
                        : `${leg.expiration} (${leg.dte}d)`}
                    </div>
                  </div>

                  {/* Premium Price */}
                  <div className="text-right">
                    <div className="text-white font-bold">${leg.premium.toFixed(2)}</div>
                    <div className="text-[10px] text-[#64748b]">
                      ${(leg.premium * 100 * leg.contracts).toFixed(0)}
                    </div>
                  </div>

                  {/* Delete Leg */}
                  <button
                    onClick={() => {
                      playKeyClick();
                      onRemoveLeg(leg.id);
                    }}
                    className="p-1 text-[#64748b] hover:text-[#ff334b] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Risk Metrics Card */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e2638] text-xs">
            <div className="bg-[#0b0f1a] p-2 rounded border border-[#1e2638]">
              <div className="text-[10px] text-[#8b9bb4] uppercase">Max Profit</div>
              <div className="text-[#00e676] font-black text-sm">
                {typeof analysis.maxProfit === 'number'
                  ? `$${(analysis.maxProfit * orderContracts).toFixed(2)}`
                  : 'Unlimited'}
              </div>
            </div>

            <div className="bg-[#0b0f1a] p-2 rounded border border-[#1e2638]">
              <div className="text-[10px] text-[#8b9bb4] uppercase">Max Loss</div>
              <div className="text-[#ff334b] font-black text-sm">
                {typeof analysis.maxLoss === 'number'
                  ? `$${Math.abs(analysis.maxLoss * orderContracts).toFixed(2)}`
                  : 'Unlimited'}
              </div>
            </div>

            <div className="bg-[#0b0f1a] p-2 rounded border border-[#1e2638]">
              <div className="text-[10px] text-[#8b9bb4] uppercase">Break-Even(s)</div>
              <div className="text-white font-bold text-xs truncate">
                {analysis.breakEvens.length > 0
                  ? analysis.breakEvens.map((b) => `$${b}`).join(', ')
                  : `$${currentStockPrice.toFixed(2)}`}
              </div>
            </div>

            <div className="bg-[#0b0f1a] p-2 rounded border border-[#1e2638]">
              <div className="text-[10px] text-[#8b9bb4] uppercase">POP (Prob of Profit)</div>
              <div className="text-[#ffd600] font-black text-sm">{analysis.probOfProfit}%</div>
            </div>
          </div>

          {/* Greek Portfolio Summary at Current Spot */}
          <div className="bg-[#0c101c] p-2.5 rounded border border-[#222d44] flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between text-[10px] text-[#8b9bb4] font-bold border-b border-[#1e2638] pb-1">
              <span>POSITION GREEKS (SPOT ${currentStockPrice.toFixed(2)})</span>
              <span className="text-[#ffd600]">100x Multiplier</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center pt-0.5">
              <div className="bg-[#07090e] p-1.5 rounded border border-[#1e2638]">
                <div className="text-[9px] text-[#8b9bb4]">DELTA (Δ)</div>
                <div
                  className={`font-black text-xs ${
                    analysis.totalDelta >= 0 ? 'text-[#00e5ff]' : 'text-[#ff334b]'
                  }`}
                >
                  {(analysis.totalDelta * orderContracts).toFixed(1)}
                </div>
              </div>

              <div className="bg-[#07090e] p-1.5 rounded border border-[#1e2638]">
                <div className="text-[9px] text-[#8b9bb4]">GAMMA (Γ)</div>
                <div className="font-black text-xs text-[#a855f7]">
                  {(analysis.totalGamma * orderContracts).toFixed(3)}
                </div>
              </div>

              <div className="bg-[#07090e] p-1.5 rounded border border-[#1e2638]">
                <div className="text-[9px] text-[#8b9bb4]">THETA (Θ)</div>
                <div
                  className={`font-black text-xs ${
                    analysis.totalTheta >= 0 ? 'text-[#00e676]' : 'text-[#ffd600]'
                  }`}
                >
                  {(analysis.totalTheta * orderContracts).toFixed(1)}/d
                </div>
              </div>

              <div className="bg-[#07090e] p-1.5 rounded border border-[#1e2638]">
                <div className="text-[9px] text-[#8b9bb4]">VEGA (ν)</div>
                <div className="font-black text-xs text-[#ec4899]">
                  {(analysis.totalVega * orderContracts).toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Greeks P/L Attribution Panel (Taylor Decomposition) */}
          <div className="bg-[#0a0e18] border border-[#1e2638] rounded p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#ff9900] uppercase flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>P/L GREEKS ATTRIBUTION (TAYLOR EXPANSION)</span>
              </span>
              <button
                onClick={() => setShowAttribution(!showAttribution)}
                className="text-[9px] text-[#8b9bb4] hover:text-white"
              >
                {showAttribution ? 'COLLAPSE' : 'EXPAND'}
              </button>
            </div>

            {showAttribution && (
              <div className="space-y-1.5 text-[10px]">
                {/* Target Price & Shock Bar */}
                <div className="flex items-center justify-between bg-[#101626] p-1.5 rounded border border-[#1e2638]">
                  <div>
                    <span className="text-[#8b9bb4]">Simulated Target: </span>
                    <strong className="text-white">${targetStockPrice.toFixed(2)}</strong>
                    <span className="text-[9px] text-[#00e5ff] ml-1">
                      ({greeksAttribution.deltaS >= 0 ? '+' : ''}
                      {((greeksAttribution.deltaS / currentStockPrice) * 100).toFixed(1)}%)
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1">
                    {[-5, -2, 0, 2, 5].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => {
                          playKeyClick();
                          setSelectedShockPct(pct);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                          selectedShockPct === pct
                            ? 'bg-[#ff9900] text-black border-[#ff9900]'
                            : 'bg-[#141b28] text-[#8b9bb4] border-[#2b354d] hover:text-white'
                        }`}
                      >
                        {pct === 0 ? 'SPOT' : `${pct > 0 ? '+' : ''}${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attribution Breakdown Table */}
                <div className="divide-y divide-[#162033] bg-[#07090e] border border-[#1e2638] rounded p-1.5">
                  {/* Delta Component */}
                  <div className="py-1 flex items-center justify-between">
                    <span className="text-[#8b9bb4] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                      <span>Delta Effect (Δ · dS):</span>
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        greeksAttribution.deltaPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                      }`}
                    >
                      {greeksAttribution.deltaPnL >= 0 ? '+' : ''}$
                      {greeksAttribution.deltaPnL.toFixed(2)}
                    </span>
                  </div>

                  {/* Gamma Component */}
                  <div className="py-1 flex items-center justify-between">
                    <span className="text-[#8b9bb4] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                      <span>Gamma Effect (½Γ · dS²):</span>
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        greeksAttribution.gammaPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                      }`}
                    >
                      {greeksAttribution.gammaPnL >= 0 ? '+' : ''}$
                      {greeksAttribution.gammaPnL.toFixed(2)}
                    </span>
                  </div>

                  {/* Theta Component */}
                  <div className="py-1 flex items-center justify-between">
                    <span className="text-[#8b9bb4] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffd600]" />
                      <span>Theta Decay (Θ · dt):</span>
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        greeksAttribution.thetaPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                      }`}
                    >
                      {greeksAttribution.thetaPnL >= 0 ? '+' : ''}$
                      {greeksAttribution.thetaPnL.toFixed(2)}
                    </span>
                  </div>

                  {/* Vega Component */}
                  <div className="py-1 flex items-center justify-between">
                    <span className="text-[#8b9bb4] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" />
                      <span>Vega Effect (ν · dIV):</span>
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        greeksAttribution.vegaPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                      }`}
                    >
                      {greeksAttribution.vegaPnL >= 0 ? '+' : ''}$
                      {greeksAttribution.vegaPnL.toFixed(2)}
                    </span>
                  </div>

                  {/* Total Modeled vs Actual BSM */}
                  <div className="py-1.5 flex items-center justify-between border-t border-[#1e2638] font-bold">
                    <span className="text-white">Total Modeled P/L:</span>
                    <span
                      className={`font-mono ${
                        greeksAttribution.totalAttributed >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                      }`}
                    >
                      {greeksAttribution.totalAttributed >= 0 ? '+' : ''}$
                      {greeksAttribution.totalAttributed.toFixed(2)}
                    </span>
                  </div>

                  <div className="py-1 flex items-center justify-between text-[9px] text-[#64748b]">
                    <span>Actual BSM Theoretical P/L:</span>
                    <span className="text-white font-mono">
                      {greeksAttribution.actualPnL >= 0 ? '+' : ''}$
                      {greeksAttribution.actualPnL.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payoff Diagram & Greeks Risk Graph (7 cols) */}
        <div className="lg:col-span-7 p-3 flex flex-col justify-between gap-3 bg-[#07090e]">
          {/* Risk Graph View Modes & Greek Profile Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#8b9bb4] font-bold uppercase">VIEW:</span>
              <button
                onClick={() => {
                  playKeyClick();
                  setGraphMode('dual');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  graphMode === 'dual'
                    ? 'bg-[#ff9900] text-black border-[#ff9900]'
                    : 'bg-[#141b28] text-[#8b9bb4] border-[#2b354d] hover:text-white'
                }`}
              >
                P&amp;L + GREEKS (DUAL)
              </button>
              <button
                onClick={() => {
                  playKeyClick();
                  setGraphMode('pnl');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  graphMode === 'pnl'
                    ? 'bg-[#ff9900] text-black border-[#ff9900]'
                    : 'bg-[#141b28] text-[#8b9bb4] border-[#2b354d] hover:text-white'
                }`}
              >
                P&amp;L PAYOFF ONLY
              </button>
              <button
                onClick={() => {
                  playKeyClick();
                  setGraphMode('greek');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  graphMode === 'greek'
                    ? 'bg-[#ff9900] text-black border-[#ff9900]'
                    : 'bg-[#141b28] text-[#8b9bb4] border-[#2b354d] hover:text-white'
                }`}
              >
                GREEK PROFILE ONLY
              </button>
            </div>

            {/* Greek Profile Type Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#8b9bb4] font-bold uppercase mr-1">GREEK:</span>
              {(['delta', 'gamma', 'theta', 'vega', 'rho'] as GreekProfileType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    playKeyClick();
                    setActiveGreek(g);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border transition-colors ${
                    activeGreek === g
                      ? 'bg-[#00e5ff] text-black border-[#00e5ff]'
                      : 'bg-[#0f1422] text-[#8b9bb4] border-[#1e2638] hover:text-white'
                  }`}
                >
                  {g === 'delta'
                    ? 'Δ Delta'
                    : g === 'gamma'
                    ? 'Γ Gamma'
                    : g === 'theta'
                    ? 'Θ Theta'
                    : g === 'vega'
                    ? 'ν Vega'
                    : 'ρ Rho'}
                </button>
              ))}
            </div>
          </div>

          {/* Synchronized Hover Inspection Bar */}
          {hoveredPoint && (
            <div className="bg-[#0b0f1a] border border-[#ff9900]/40 rounded p-1.5 flex flex-wrap items-center justify-between text-[11px] gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-[#ff9900]" />
                <span className="text-white font-bold">
                  PROJECTION: ${hoveredPoint.price.toFixed(2)}
                </span>
                <span className="text-[10px] text-[#8b9bb4]">
                  ({hoveredPoint.price >= currentStockPrice ? '+' : ''}
                  {(((hoveredPoint.price - currentStockPrice) / currentStockPrice) * 100).toFixed(1)}
                  %)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[#8b9bb4]">
                  P/L Exp:{' '}
                  <strong
                    className={
                      hoveredPoint.pnlExpiration >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                    }
                  >
                    {hoveredPoint.pnlExpiration >= 0 ? '+' : ''}$
                    {(hoveredPoint.pnlExpiration * orderContracts).toFixed(2)}
                  </strong>
                </span>

                <span className="text-[#8b9bb4]">
                  T+{timeElapsedDays}:{' '}
                  <strong
                    className={hoveredPoint.pnlT0 >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}
                  >
                    {hoveredPoint.pnlT0 >= 0 ? '+' : ''}$
                    {(hoveredPoint.pnlT0 * orderContracts).toFixed(2)}
                  </strong>
                </span>

                <span className="text-[#8b9bb4] border-l border-[#1e2638] pl-2">
                  Δ: <strong className="text-[#00e5ff]">{hoveredPoint.delta}</strong> · Γ:{' '}
                  <strong className="text-[#a855f7]">{hoveredPoint.gamma}</strong> · Θ:{' '}
                  <strong className="text-[#ffd600]">${hoveredPoint.theta}/d</strong> · ν:{' '}
                  <strong className="text-[#ec4899]">${hoveredPoint.vega}</strong>
                </span>
              </div>
            </div>
          )}

          {/* SVG Graph Viewport Container */}
          <div className="relative bg-[#05070a] border border-[#1e2638] rounded overflow-hidden select-none flex flex-col divide-y divide-[#1e2638]">
            {/* PANE 1: P&L Payoff Diagram */}
            {(graphMode === 'dual' || graphMode === 'pnl') && (
              <div className="relative w-full">
                <div className="absolute top-2 left-3 flex items-center gap-3 text-[10px] z-10 pointer-events-none">
                  <span className="font-bold text-white uppercase">P&amp;L PAYOFF CURVE</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-[#ff9900] inline-block" />
                    <span className="text-[#8b9bb4]">At Expiry (T=0)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 border-t border-dashed border-[#00d2ff] inline-block" />
                    <span className="text-[#00d2ff]">T+{timeElapsedDays} Days</span>
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${svgWidth} ${pnlSvgHeight}`}
                  className="w-full select-none block"
                  style={{ height: pnlSvgHeight }}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onMouseMove={(e) => {
                    if (!chartBounds || payoffPoints.length === 0) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const svgX = (mouseX / rect.width) * svgWidth;

                    let closest = payoffPoints[0];
                    let minDiff = Infinity;
                    payoffPoints.forEach((p) => {
                      const px = getPnlSvgCoords(p.price, 0).x;
                      const diff = Math.abs(px - svgX);
                      if (diff < minDiff) {
                        minDiff = diff;
                        closest = p;
                      }
                    });
                    setHoveredPoint(closest);
                  }}
                >
                  {/* Zero P&L horizontal reference line */}
                  <line
                    x1={padding.left}
                    y1={zeroPnlY}
                    x2={svgWidth - padding.right}
                    y2={zeroPnlY}
                    stroke="#2a364f"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={zeroPnlY + 3}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    textAnchor="end"
                  >
                    $0
                  </text>

                  {/* Current Stock Price vertical line */}
                  <line
                    x1={currentPriceX}
                    y1={padding.top}
                    x2={currentPriceX}
                    y2={pnlSvgHeight - padding.bottom}
                    stroke="#ffd600"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={currentPriceX}
                    y={padding.top - 4}
                    fill="#ffd600"
                    fontSize="8.5"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Spot ${currentStockPrice.toFixed(2)}
                  </text>

                  {/* Break-Even Markers */}
                  {analysis.breakEvens.map((be, idx) => {
                    const beX = getPnlSvgCoords(be, 0).x;
                    return (
                      <g key={idx}>
                        <line
                          x1={beX}
                          y1={padding.top + 8}
                          x2={beX}
                          y2={pnlSvgHeight - padding.bottom}
                          stroke="#8b9bb4"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <text
                          x={beX}
                          y={pnlSvgHeight - padding.bottom + 12}
                          fill="#8b9bb4"
                          fontSize="8"
                          fontFamily="JetBrains Mono"
                          textAnchor="middle"
                        >
                          BE ${be}
                        </text>
                      </g>
                    );
                  })}

                  {/* T+n curve (Cyan dashed) */}
                  <path d={t0PathD} fill="none" stroke="#00d2ff" strokeWidth="2" strokeDasharray="4 2" />

                  {/* Expiration curve (Bloomberg Amber) */}
                  <path d={expPathD} fill="none" stroke="#ff9900" strokeWidth="2.5" />

                  {/* Crosshair hover */}
                  {hoveredPoint && (
                    <g>
                      {(() => {
                        const coords = getPnlSvgCoords(hoveredPoint.price, hoveredPoint.pnlExpiration);
                        return (
                          <>
                            <line
                              x1={coords.x}
                              y1={padding.top}
                              x2={coords.x}
                              y2={pnlSvgHeight - padding.bottom}
                              stroke="#cbd5e1"
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                            <circle
                              cx={coords.x}
                              cy={coords.y}
                              r="3.5"
                              fill="#ff9900"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          </>
                        );
                      })()}
                    </g>
                  )}
                </svg>
              </div>
            )}

            {/* PANE 2: Greeks Profile Diagram */}
            {(graphMode === 'dual' || graphMode === 'greek') && (
              <div className="relative w-full">
                <div className="absolute top-2 left-3 flex items-center gap-2 text-[10px] z-10 pointer-events-none">
                  <span
                    className="font-bold uppercase flex items-center gap-1"
                    style={{ color: greekMeta.color }}
                  >
                    <span>{greekMeta.symbol}</span>
                    <span>{greekMeta.name}</span>
                  </span>
                  <span className="text-[#64748b]">({greekMeta.desc})</span>
                </div>

                <svg
                  viewBox={`0 0 ${svgWidth} ${greekSvgHeight}`}
                  className="w-full select-none block"
                  style={{ height: greekSvgHeight }}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onMouseMove={(e) => {
                    if (!chartBounds || payoffPoints.length === 0) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const svgX = (mouseX / rect.width) * svgWidth;

                    let closest = payoffPoints[0];
                    let minDiff = Infinity;
                    payoffPoints.forEach((p) => {
                      const px = getGreekSvgCoords(p.price, 0).x;
                      const diff = Math.abs(px - svgX);
                      if (diff < minDiff) {
                        minDiff = diff;
                        closest = p;
                      }
                    });
                    setHoveredPoint(closest);
                  }}
                >
                  {/* Zero Greek reference line */}
                  <line
                    x1={padding.left}
                    y1={zeroGreekY}
                    x2={svgWidth - padding.right}
                    y2={zeroGreekY}
                    stroke="#2a364f"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={zeroGreekY + 3}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    textAnchor="end"
                  >
                    0
                  </text>

                  {/* Current Stock Price vertical line */}
                  <line
                    x1={currentPriceX}
                    y1={padding.top}
                    x2={currentPriceX}
                    y2={greekSvgHeight - padding.bottom}
                    stroke="#ffd600"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />

                  {/* Greek curve */}
                  <path d={greekPathD} fill="none" stroke={greekMeta.color} strokeWidth="2.5" />

                  {/* Price ticks along bottom axis */}
                  {payoffPoints
                    .filter((_, idx) => idx % 10 === 0)
                    .map((pt) => {
                      const { x } = getGreekSvgCoords(pt.price, 0);
                      return (
                        <g key={pt.price}>
                          <line
                            x1={x}
                            y1={greekSvgHeight - padding.bottom}
                            x2={x}
                            y2={greekSvgHeight - padding.bottom + 4}
                            stroke="#1e2638"
                          />
                          <text
                            x={x}
                            y={greekSvgHeight - padding.bottom + 14}
                            fill="#64748b"
                            fontSize="8"
                            fontFamily="JetBrains Mono"
                            textAnchor="middle"
                          >
                            ${pt.price.toFixed(0)}
                          </text>
                        </g>
                      );
                    })}

                  {/* Hover indicator on Greek curve */}
                  {hoveredPoint && (
                    <g>
                      {(() => {
                        const val = hoveredPoint[activeGreek];
                        const coords = getGreekSvgCoords(hoveredPoint.price, val);
                        return (
                          <>
                            <line
                              x1={coords.x}
                              y1={padding.top}
                              x2={coords.x}
                              y2={greekSvgHeight - padding.bottom}
                              stroke="#cbd5e1"
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                            <circle
                              cx={coords.x}
                              cy={coords.y}
                              r="3.5"
                              fill={greekMeta.color}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          </>
                        );
                      })()}
                    </g>
                  )}
                </svg>
              </div>
            )}
          </div>

          {/* Interactive Simulation Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0b0f1a] p-2 rounded border border-[#1e2638] text-[11px]">
            {/* Days Passed (Theta Simulation) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[#8b9bb4]">
                <span>Time Decay Simulation (Theta):</span>
                <span className="text-[#00d2ff] font-bold">
                  {timeElapsedDays} / {maxDte} Days
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(1, maxDte)}
                value={timeElapsedDays}
                onChange={(e) => setTimeElapsedDays(parseInt(e.target.value, 10))}
                className="w-full accent-[#00d2ff] h-1.5 bg-[#141b28] rounded cursor-pointer"
              />
            </div>

            {/* IV Shock (Vega Simulation) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[#8b9bb4]">
                <span>Implied Volatility Shift (Vega):</span>
                <span
                  className={
                    ivShiftPercent >= 0 ? 'text-[#00e676] font-bold' : 'text-[#ff334b] font-bold'
                  }
                >
                  {ivShiftPercent >= 0 ? '+' : ''}
                  {ivShiftPercent}%
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                value={ivShiftPercent}
                onChange={(e) => setIvShiftPercent(parseInt(e.target.value, 10))}
                className="w-full accent-[#ff9900] h-1.5 bg-[#141b28] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Bloomberg Order Execution Ticket */}
          <div className="bg-[#0b0f1a] border border-[#1e2638] rounded p-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[#8b9bb4] text-[10px]">SETS:</span>
                <div className="flex items-center bg-[#05070a] border border-[#1e2638] rounded">
                  <button
                    onClick={() => {
                      playKeyClick();
                      setOrderContracts(Math.max(1, orderContracts - 1));
                    }}
                    className="px-2 py-0.5 text-[#8b9bb4] hover:text-white"
                  >
                    -
                  </button>
                  <span className="px-2 font-black text-white">{orderContracts}</span>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setOrderContracts(orderContracts + 1);
                    }}
                    className="px-2 py-0.5 text-[#8b9bb4] hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[#8b9bb4] text-[10px]">ORDER:</span>
                <span className="text-[#ff9900] font-bold uppercase text-[10px] bg-[#141b28] px-2 py-0.5 rounded border border-[#1e2638]">
                  LIMIT / DAY
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-[#8b9bb4] uppercase">
                {isDebit ? 'Total Net Debit' : 'Total Net Credit'}
              </div>
              <div
                className={`text-base font-black ${isDebit ? 'text-[#ff334b]' : 'text-[#00e676]'}`}
              >
                ${Math.abs(totalNetDebitCredit).toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenStrategyExecution && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onOpenStrategyExecution();
                  }}
                  className="px-4 py-2 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="Open Institutional Level 2 Strategy Market Depth (COB) & Multi-Leg Router"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>STRATEGY DOM & COB ROUTER</span>
                </button>
              )}
              <button
                onClick={handleExecute}
                className={`px-5 py-2 rounded font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer ${
                  isDebit
                    ? 'bg-[#ff334b] hover:bg-[#ff4d63] text-white shadow-[#ff334b]/20'
                    : 'bg-[#00e676] hover:bg-[#1cf387] text-black shadow-[#00e676]/20'
                }`}
              >
                EXECUTE {orderContracts}x {analysis.name.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
