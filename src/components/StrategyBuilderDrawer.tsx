import React, { useState, useMemo } from 'react';
import { TradeLeg, Order, Position } from '../types/options';
import {
  analyzeStrategy,
  calculateStrategyPayoff,
  StrategyPayoffPoint,
} from '../utils/blackScholes';
import {
  Trash2,
  Plus,
  Minus,
  Maximize2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Sliders,
  BookOpen,
  Zap,
} from 'lucide-react';

interface StrategyBuilderDrawerProps {
  currentStockPrice: number;
  tickerSymbol: string;
  legs: TradeLeg[];
  onUpdateLeg: (updatedLeg: TradeLeg) => void;
  onRemoveLeg: (legId: string) => void;
  onClearLegs: () => void;
  onExecuteTrade: (order: Order, position: Position) => void;
  cashBalance: number;
  onOpenStrategyExecution?: () => void;
}

export const StrategyBuilderDrawer: React.FC<StrategyBuilderDrawerProps> = ({
  currentStockPrice,
  tickerSymbol,
  legs,
  onUpdateLeg,
  onRemoveLeg,
  onClearLegs,
  onExecuteTrade,
  cashBalance,
  onOpenStrategyExecution,
}) => {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [orderContracts, setOrderContracts] = useState<number>(1);
  const [timeElapsedDays, setTimeElapsedDays] = useState<number>(0);
  const [ivShiftPercent, setIvShiftPercent] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<StrategyPayoffPoint | null>(null);
  const [tradeSuccessToast, setTradeSuccessToast] = useState<string | null>(null);

  // Strategy Analysis
  const analysis = useMemo(() => {
    return analyzeStrategy(legs, currentStockPrice);
  }, [legs, currentStockPrice]);

  // Payoff Points
  const payoffPoints = useMemo(() => {
    return calculateStrategyPayoff(
      legs,
      currentStockPrice,
      ivShiftPercent / 100,
      timeElapsedDays
    );
  }, [legs, currentStockPrice, ivShiftPercent, timeElapsedDays]);

  // Max DTE across legs for slider
  const maxDte = useMemo(() => {
    return legs.length > 0 ? Math.max(...legs.map((l) => l.dte)) : 30;
  }, [legs]);

  // Total order cash impact
  const totalNetDebitCredit = analysis.netDebitCredit * orderContracts;
  const isDebit = totalNetDebitCredit > 0;
  const isCredit = totalNetDebitCredit < 0;

  const handleExecute = () => {
    if (legs.length === 0) return;

    const orderId = `ord-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newOrder: Order = {
      id: orderId,
      timestamp,
      ticker: tickerSymbol,
      strategyName: analysis.name,
      type: orderType,
      limitPrice: Math.abs(analysis.netDebitCredit / ((legs[0]?.multiplier || (tickerSymbol.startsWith('/') ? 50 : 100)) * (legs[0]?.contracts || 1))),
      legs: legs.map((l) => ({ ...l, contracts: l.contracts * orderContracts })),
      contracts: orderContracts,
      netDebitCredit: totalNetDebitCredit,
      totalCost: totalNetDebitCredit,
      status: 'filled',
      assetCategory: tickerSymbol.startsWith('/') ? 'future' : 'option',
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
    };

    onExecuteTrade(newOrder, newPosition);
    setTradeSuccessToast(
      `Order Executed: ${analysis.name} (${orderContracts}x) for ${
        isDebit ? 'debit' : 'credit'
      } $${Math.abs(totalNetDebitCredit).toFixed(2)}`
    );

    setTimeout(() => {
      setTradeSuccessToast(null);
    }, 4500);
  };

  // SVG dimensions & scaling for Payoff Graph
  const svgWidth = 640;
  const svgHeight = 240;
  const padding = { top: 25, right: 35, bottom: 35, left: 55 };

  const chartBounds = useMemo(() => {
    if (payoffPoints.length === 0) return null;

    const prices = payoffPoints.map((p) => p.price);
    const pnlsExp = payoffPoints.map((p) => p.pnlExpiration);
    const pnlsT0 = payoffPoints.map((p) => p.pnlT0);

    const minX = Math.min(...prices);
    const maxX = Math.max(...prices);

    let minY = Math.min(...pnlsExp, ...pnlsT0);
    let maxY = Math.max(...pnlsExp, ...pnlsT0);

    // Ensure zero is visible with good margin
    if (minY > 0) minY = -Math.abs(minY * 0.2);
    if (maxY < 0) maxY = Math.abs(maxY * 0.2);

    const rangeY = maxY - minY || 100;
    minY -= rangeY * 0.15;
    maxY += rangeY * 0.15;

    return { minX, maxX, minY, maxY };
  }, [payoffPoints]);

  const getSvgCoordinates = (price: number, pnl: number) => {
    if (!chartBounds) return { x: 0, y: 0 };
    const { minX, maxX, minY, maxY } = chartBounds;
    const x =
      padding.left +
      ((price - minX) / (maxX - minX || 1)) * (svgWidth - padding.left - padding.right);
    const y =
      svgHeight -
      padding.bottom -
      ((pnl - minY) / (maxY - minY || 1)) * (svgHeight - padding.top - padding.bottom);
    return { x, y };
  };

  // Generate SVG path for expiration and T+0 curves
  const expPathD = useMemo(() => {
    if (payoffPoints.length === 0 || !chartBounds) return '';
    return payoffPoints.reduce((acc, point, index) => {
      const { x, y } = getSvgCoordinates(point.price, point.pnlExpiration);
      return `${acc} ${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [payoffPoints, chartBounds]);

  const t0PathD = useMemo(() => {
    if (payoffPoints.length === 0 || !chartBounds) return '';
    return payoffPoints.reduce((acc, point, index) => {
      const { x, y } = getSvgCoordinates(point.price, point.pnlT0);
      return `${acc} ${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [payoffPoints, chartBounds]);

  const zeroY = chartBounds ? getSvgCoordinates(chartBounds.minX, 0).y : 0;
  const currentPriceX = chartBounds ? getSvgCoordinates(currentStockPrice, 0).x : 0;

  if (legs.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-200 mb-1">Strategy Builder Empty</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
          Click any <span className="text-emerald-400 font-semibold">Ask price to BUY</span> or{' '}
          <span className="text-rose-400 font-semibold">Bid price to SELL</span> options from the
          chain above, or choose a pre-built strategy like Iron Condor or Bull Call Spread.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Toast Notification */}
      {tradeSuccessToast && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/50 px-4 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{tradeSuccessToast}</span>
        </div>
      )}

      {/* Builder Header Bar */}
      <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Strategy Builder
          </span>
          <span className="text-base font-extrabold text-white">{analysis.name}</span>
          <span className="text-xs text-slate-500 font-mono">
            {legs.length} {legs.length === 1 ? 'Leg' : 'Legs'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearLegs}
            className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 rounded transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left Column: Active Trade Legs List (5 cols) */}
        <div className="lg:col-span-5 p-4 flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
            <span>Option Legs</span>
            <span className="text-slate-500 text-[11px]">
              {tickerSymbol.startsWith('/')
                ? `${legs[0]?.multiplier || 50}x multiplier / FOP contract`
                : '100 shares / contract'}
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
            {legs.map((leg) => {
              const isBuy = leg.action === 'buy';
              return (
                <div
                  key={leg.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  {/* Action Toggle (Buy / Sell) */}
                  <button
                    onClick={() =>
                      onUpdateLeg({
                        ...leg,
                        action: isBuy ? 'sell' : 'buy',
                      })
                    }
                    className={`px-2 py-1 rounded font-mono font-bold uppercase text-[11px] transition-colors ${
                      isBuy
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {leg.action}
                  </button>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-1 py-0.5">
                    <button
                      onClick={() =>
                        onUpdateLeg({
                          ...leg,
                          contracts: Math.max(1, leg.contracts - 1),
                        })
                      }
                      className="p-0.5 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-xs w-4 text-center text-slate-200">
                      {leg.contracts}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateLeg({
                          ...leg,
                          contracts: leg.contracts + 1,
                        })
                      }
                      className="p-0.5 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Leg Detail */}
                  <div className="flex flex-col min-w-0">
                    <div className="font-mono font-bold text-white flex items-center gap-1.5">
                      <span>${leg.strike}</span>
                      <span
                        className={`text-[10px] uppercase font-bold ${
                          leg.type === 'call' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {leg.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {leg.expiration} ({leg.dte}d)
                    </div>
                  </div>

                  {/* Premium Price */}
                  <div className="text-right font-mono">
                    <div className="text-slate-200 font-semibold">${leg.premium.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">
                      ${(leg.premium * 100 * leg.contracts).toFixed(0)}
                    </div>
                  </div>

                  {/* Delete Leg */}
                  <button
                    onClick={() => onRemoveLeg(leg.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Strategy Risk / Return Statistics */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
            <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase">Max Profit</div>
              <div className="text-emerald-400 font-bold text-sm">
                {typeof analysis.maxProfit === 'number'
                  ? `$${(analysis.maxProfit * orderContracts).toFixed(2)}`
                  : 'Unlimited'}
              </div>
            </div>

            <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase">Max Loss</div>
              <div className="text-rose-400 font-bold text-sm">
                {typeof analysis.maxLoss === 'number'
                  ? `$${Math.abs(analysis.maxLoss * orderContracts).toFixed(2)}`
                  : 'Unlimited'}
              </div>
            </div>

            <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase">Break-Even(s)</div>
              <div className="text-slate-200 font-bold text-xs truncate">
                {analysis.breakEvens.length > 0
                  ? analysis.breakEvens.map((b) => `$${b}`).join(', ')
                  : `$${currentStockPrice.toFixed(2)}`}
              </div>
            </div>

            <div className="bg-slate-900/50 p-2 rounded border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase">Prob of Profit (POP)</div>
              <div className="text-amber-400 font-bold text-sm">{analysis.probOfProfit}%</div>
            </div>
          </div>

          {/* Total Net Greeks Breakdown */}
          <div className="bg-slate-900/40 p-2 rounded border border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
            <div>
              <span className="text-slate-500">Δ: </span>
              <span className={analysis.totalDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {analysis.totalDelta.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Γ: </span>
              <span className="text-slate-300">{analysis.totalGamma.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-slate-500">Θ: </span>
              <span className={analysis.totalTheta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {analysis.totalTheta >= 0 ? '+' : ''}
                {analysis.totalTheta.toFixed(1)}/day
              </span>
            </div>
            <div>
              <span className="text-slate-500">Vega: </span>
              <span className="text-slate-300">{analysis.totalVega.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Payoff Graph & Order Ticket (7 cols) */}
        <div className="lg:col-span-7 p-4 flex flex-col justify-between gap-3">
          {/* Graph Header and Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-300">P&L Payoff Diagram</span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                <span className="text-slate-400">At Expiration</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="w-3 h-0.5 border-t border-dashed border-cyan-400 inline-block" />
                <span className="text-slate-400">T+{timeElapsedDays} Days</span>
              </div>
            </div>

            {/* Readout of hovered or current price */}
            {hoveredPoint ? (
              <div className="font-mono text-[11px] flex items-center gap-2 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                <span className="text-slate-400">Stock: ${hoveredPoint.price.toFixed(2)}</span>
                <span
                  className={
                    hoveredPoint.pnlExpiration >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  Exp: {hoveredPoint.pnlExpiration >= 0 ? '+' : ''}$
                  {(hoveredPoint.pnlExpiration * orderContracts).toFixed(2)}
                </span>
                <span className="text-cyan-400 font-medium">
                  T+{timeElapsedDays}: {hoveredPoint.pnlT0 >= 0 ? '+' : ''}$
                  {(hoveredPoint.pnlT0 * orderContracts).toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500">Hover over chart for P&L estimates</div>
            )}
          </div>

          {/* SVG Payoff Curve */}
          <div className="relative bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-48 select-none"
              onMouseLeave={() => setHoveredPoint(null)}
              onMouseMove={(e) => {
                if (!chartBounds || payoffPoints.length === 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const svgX = (mouseX / rect.width) * svgWidth;

                // Find closest point
                let closest = payoffPoints[0];
                let minDiff = Infinity;
                payoffPoints.forEach((p) => {
                  const px = getSvgCoordinates(p.price, 0).x;
                  const diff = Math.abs(px - svgX);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closest = p;
                  }
                });
                setHoveredPoint(closest);
              }}
            >
              <defs>
                {/* Profit gradient */}
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Zero P&L horizontal reference line */}
              <line
                x1={padding.left}
                y1={zeroY}
                x2={svgWidth - padding.right}
                y2={zeroY}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={zeroY + 3}
                fill="#64748b"
                fontSize="10"
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
                y2={svgHeight - padding.bottom}
                stroke="#eab308"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <text
                x={currentPriceX}
                y={padding.top - 6}
                fill="#eab308"
                fontSize="10"
                fontFamily="JetBrains Mono"
                fontWeight="bold"
                textAnchor="middle"
              >
                ${currentStockPrice.toFixed(2)}
              </text>

              {/* Break-Even Markers */}
              {analysis.breakEvens.map((be, idx) => {
                const beX = getSvgCoordinates(be, 0).x;
                return (
                  <g key={idx}>
                    <line
                      x1={beX}
                      y1={padding.top + 10}
                      x2={beX}
                      y2={svgHeight - padding.bottom}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={beX}
                      y={svgHeight - padding.bottom + 14}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      BE: ${be}
                    </text>
                  </g>
                );
              })}

              {/* T+0 / Days Elapsed Curve (Cyan dashed) */}
              <path
                d={t0PathD}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="4 2"
              />

              {/* Expiration Payoff Line (Solid Emerald) */}
              <path
                d={expPathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
              />

              {/* Hover crosshair */}
              {hoveredPoint && (
                <g>
                  {(() => {
                    const coords = getSvgCoordinates(
                      hoveredPoint.price,
                      hoveredPoint.pnlExpiration
                    );
                    return (
                      <>
                        <line
                          x1={coords.x}
                          y1={padding.top}
                          x2={coords.x}
                          y2={svgHeight - padding.bottom}
                          stroke="#cbd5e1"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <circle cx={coords.x} cy={coords.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>

          {/* Interactive Simulation Sliders (Time Decay & IV Shock) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
            {/* Days Elapsed Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>Days Passed:</span>
                <span className="text-cyan-400 font-bold">{timeElapsedDays} / {maxDte} Days</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(1, maxDte)}
                value={timeElapsedDays}
                onChange={(e) => setTimeElapsedDays(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* IV Shift Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                <span>IV Shift:</span>
                <span className={ivShiftPercent >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {ivShiftPercent >= 0 ? '+' : ''}{ivShiftPercent}%
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                value={ivShiftPercent}
                onChange={(e) => setIvShiftPercent(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Order Execution Ticket */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Sets:</span>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded">
                <button
                  onClick={() => setOrderContracts(Math.max(1, orderContracts - 1))}
                  className="px-2 py-1 text-slate-400 hover:text-white"
                >
                  -
                </button>
                <span className="px-2 font-mono font-bold text-white text-xs">{orderContracts}</span>
                <button
                  onClick={() => setOrderContracts(orderContracts + 1)}
                  className="px-2 py-1 text-slate-400 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Cost Basis Readout */}
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                {isDebit ? 'Total Net Debit' : 'Total Net Credit'}
              </div>
              <div
                className={`text-base font-extrabold font-mono ${
                  isDebit ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                ${Math.abs(totalNetDebitCredit).toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenStrategyExecution && (
                <button
                  onClick={onOpenStrategyExecution}
                  className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/40 flex items-center gap-1.5 shadow-md cursor-pointer"
                  title="Open Strategy Level 2 Complex Order Book (COB) Depth & Advanced Multi-Leg Router"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>COB DOM & ROUTER</span>
                </button>
              )}
              {/* Primary Action Button */}
              <button
                onClick={handleExecute}
                className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                  isDebit
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                }`}
              >
                Execute Paper Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
