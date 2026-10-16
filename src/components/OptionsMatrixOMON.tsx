import React, { useState, useMemo } from 'react';
import { Ticker, ExpirationOptionChain, OptionContract, TradeLeg, Position } from '../types/options';
import { EXPIRATION_PRESETS, ExpirationPreset } from '../services/marketData';
import { playKeyClick } from '../utils/terminalSound';
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Layers,
  TrendingUp,
  Percent,
  Activity,
  Zap,
  Search,
  BookOpen,
  X,
  Maximize2,
  Calendar,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Flame,
  Star,
  CheckCircle,
  GripVertical,
} from 'lucide-react';

interface OptionsMatrixOMONProps {
  ticker: Ticker;
  chain: ExpirationOptionChain;
  allChains?: ExpirationOptionChain[];
  activeDte: number;
  onSelectDte: (dte: number) => void;
  builderLegs: TradeLeg[];
  portfolioPositions?: Position[];
  onAddLeg: (leg: TradeLeg) => void;
  onUpdateLeg?: (updatedLeg: TradeLeg) => void;
  onRemoveLeg: (legId: string) => void;
  onApplyStrategyTemplate: (templateName: string) => void;
  onOpenValuationScreen: () => void;
  onOpenConeScreen?: () => void;
  onOpenVolsScreen?: () => void;
  onOpenPcrScreen?: () => void;
  onOpenRiskProfile?: () => void;
  onOpenMonitorScreen?: () => void;
  onSelectTicker?: (symbol: string) => void;
  onOpenStockTrade?: () => void;
  onOpenOpecScreen?: () => void;
  onOpenExpectedMove?: () => void;
  onOpenNetGamma?: () => void;
  onOpenVegaScreen?: () => void;
  onOpenMarketDepth?: (type: 'call' | 'put', strike: number) => void;
  onOpenStrategyExecution?: () => void;
  onOpenQuadWitching?: () => void;
  onOpenOptionsExpiration?: () => void;
  onOpenTSXFuturesHub?: () => void;
  onOpenFuturesTermStructure?: () => void;
  onUpdatePosition?: (position: Position) => void;
}

type ExpirationCategory = 'ALL' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'QUAD WITCH' | 'LEAPS';
type MoneynessFilter = 'all' | 'atm' | 'near' | 'otm' | 'itm';

export const OptionsMatrixOMON: React.FC<OptionsMatrixOMONProps> = ({
  ticker,
  chain,
  allChains = [],
  activeDte,
  onSelectDte,
  builderLegs,
  portfolioPositions = [],
  onAddLeg,
  onUpdateLeg,
  onUpdatePosition,
  onRemoveLeg,
  onApplyStrategyTemplate,
  onOpenValuationScreen,
  onOpenConeScreen,
  onOpenVolsScreen,
  onOpenPcrScreen,
  onOpenRiskProfile,
  onOpenMonitorScreen,
  onSelectTicker,
  onOpenStockTrade,
  onOpenOpecScreen,
  onOpenExpectedMove,
  onOpenNetGamma,
  onOpenVegaScreen,
  onOpenMarketDepth,
  onOpenStrategyExecution,
  onOpenQuadWitching,
  onOpenOptionsExpiration,
  onOpenTSXFuturesHub,
  onOpenFuturesTermStructure,
}) => {
  // Strikes filter controls
  const [strikeCountFilter, setStrikeCountFilter] = useState<'12' | '20' | '32' | '48' | 'all'>('all');
  const [moneynessFilter, setMoneynessFilter] = useState<MoneynessFilter>('all');
  const [strikeSearchQuery, setStrikeSearchQuery] = useState<string>('');
  const [sideFilter, setSideFilter] = useState<'both' | 'calls' | 'puts'>('both');
  const [showGreeks, setShowGreeks] = useState(true);
  const [showSpread, setShowSpread] = useState<boolean>(true);

  // Drag and drop strike state
  const [draggedLegId, setDraggedLegId] = useState<string | null>(null);
  const [hoveredDropStrike, setHoveredDropStrike] = useState<number | null>(null);

  // Multi-Expiration Mode controls
  const [isAllExpirationsView, setIsAllExpirationsView] = useState<boolean>(false);
  const [expirationCategory, setExpirationCategory] = useState<ExpirationCategory>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [expandedDtes, setExpandedDtes] = useState<Record<number, boolean>>({
    [chain.dte]: true,
    0: true,
    3: true,
    17: true,
    80: true,
  });
  const [showDirectoryModal, setShowDirectoryModal] = useState<boolean>(false);
  const [showPositionsOnly, setShowPositionsOnly] = useState<boolean>(false);

  const currentPrice = ticker.price;

  // Track open portfolio positions for this underlying symbol
  const tickerOpenPositions = useMemo(() => {
    return (portfolioPositions || []).filter((p) => p.ticker === ticker.symbol);
  }, [portfolioPositions, ticker.symbol]);

  // Map of (strike + '_' + type + '_' + dte) or (strike + '_' + type) to position details
  const openPositionsMap = useMemo(() => {
    const map: Record<string, { pos: Position; leg: TradeLeg; contracts: number; action: 'buy' | 'sell'; entryPrice: number; unrealizedPnL: number }[]> = {};

    tickerOpenPositions.forEach((pos) => {
      pos.legs.forEach((leg) => {
        if (leg.type === 'call' || leg.type === 'put') {
          const entry = {
            pos,
            leg,
            contracts: leg.contracts,
            action: leg.action,
            entryPrice: leg.premium,
            unrealizedPnL: pos.unrealizedPnL,
          };
          const keys = [
            `${Number(leg.strike)}_${leg.type}`,
            `${Number(leg.strike).toFixed(2)}_${leg.type}`,
            `${Number(leg.strike)}_${leg.type}_${leg.dte}`,
            `${Number(leg.strike).toFixed(2)}_${leg.type}_${leg.dte}`,
          ];
          keys.forEach((k) => {
            if (!map[k]) map[k] = [];
            map[k].push(entry);
          });
        }
      });
    });

    return map;
  }, [tickerOpenPositions]);

  // Extract distinct calendar months available in presets
  const distinctMonths = useMemo(() => {
    const list: string[] = ['ALL'];
    EXPIRATION_PRESETS.forEach((p) => {
      if (p.month && !list.includes(p.month)) {
        list.push(p.month);
      }
    });
    return list;
  }, []);

  // Filter Expiration Presets by Category and Month
  const filteredPresets = useMemo(() => {
    return EXPIRATION_PRESETS.filter((p) => {
      // Category filter
      let catMatch = true;
      if (expirationCategory === 'WEEKLY') catMatch = p.category === 'Weekly';
      else if (expirationCategory === 'MONTHLY') catMatch = p.category === 'Monthly';
      else if (expirationCategory === 'QUARTERLY') catMatch = p.category === 'Quarterly';
      else if (expirationCategory === 'QUAD WITCH') catMatch = p.isQuadWitching === true || p.category === 'Quarterly';
      else if (expirationCategory === 'LEAPS') catMatch = p.category === 'LEAPS';

      // Month filter
      const monthMatch = selectedMonth === 'ALL' || p.month.toUpperCase() === selectedMonth.toUpperCase();

      return catMatch && monthMatch;
    });
  }, [expirationCategory, selectedMonth]);

  // Helper to filter contracts for any chain
  const getFilteredContractsForChain = (targetChain: ExpirationOptionChain) => {
    let calls = [...targetChain.calls];
    let puts = [...targetChain.puts];

    // Filter to strikes where user holds positions if toggled
    if (showPositionsOnly) {
      const posStrikes = new Set(
        tickerOpenPositions.flatMap((p) => p.legs.filter((l) => l.type === 'call' || l.type === 'put').map((l) => l.strike))
      );
      if (posStrikes.size > 0) {
        calls = calls.filter((c) => posStrikes.has(c.strike));
        puts = puts.filter((p) => posStrikes.has(p.strike));
      }
    }

    // 1. Moneyness filter
    if (moneynessFilter === 'atm') {
      // ±5%
      calls = calls.filter((c) => Math.abs(c.strike - currentPrice) / currentPrice <= 0.05);
      puts = puts.filter((p) => Math.abs(p.strike - currentPrice) / currentPrice <= 0.05);
    } else if (moneynessFilter === 'near') {
      // ±10%
      calls = calls.filter((c) => Math.abs(c.strike - currentPrice) / currentPrice <= 0.10);
      puts = puts.filter((p) => Math.abs(p.strike - currentPrice) / currentPrice <= 0.10);
    } else if (moneynessFilter === 'otm') {
      calls = calls.filter((c) => c.strike > currentPrice);
      puts = puts.filter((p) => p.strike < currentPrice);
    } else if (moneynessFilter === 'itm') {
      calls = calls.filter((c) => c.strike <= currentPrice);
      puts = puts.filter((p) => p.strike >= currentPrice);
    }

    // 2. Search query filter
    if (strikeSearchQuery.trim()) {
      const q = strikeSearchQuery.trim();
      calls = calls.filter((c) => c.strike.toString().includes(q));
      puts = puts.filter((p) => p.strike.toString().includes(q));
    }

    // 3. Count filter around ATM (only if not filtering by positions only)
    if (!showPositionsOnly && strikeCountFilter !== 'all' && calls.length > 0) {
      const count = parseInt(strikeCountFilter, 10);
      let closestIdx = 0;
      let minDiff = Infinity;
      calls.forEach((c, idx) => {
        const diff = Math.abs(c.strike - currentPrice);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      const half = Math.floor(count / 2);
      const start = Math.max(0, closestIdx - half);
      const end = Math.min(calls.length, start + count);

      calls = calls.slice(start, end);
      puts = puts.slice(start, end);
    }

    return { calls, puts };
  };

  // Filtered contracts for the currently active chain
  const filteredContracts = useMemo(() => {
    return getFilteredContractsForChain(chain);
  }, [chain, currentPrice, strikeCountFilter, moneynessFilter, strikeSearchQuery, showPositionsOnly, tickerOpenPositions]);

  // Find ATM Straddle Cost & Breakeven percentage for active chain
  const atmMetrics = useMemo(() => {
    if (!chain.calls.length) return { straddleCost: 0, movePct: 0, atmStrike: currentPrice };
    let closestIdx = 0;
    let minDiff = Infinity;
    chain.calls.forEach((c, idx) => {
      const diff = Math.abs(c.strike - currentPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    const callAtm = chain.calls[closestIdx];
    const putAtm = chain.puts[closestIdx] || callAtm;
    const straddleCost = callAtm.last + putAtm.last;
    const movePct = (straddleCost / currentPrice) * 100;
    return {
      straddleCost: Number(straddleCost.toFixed(2)),
      movePct: Number(movePct.toFixed(2)),
      atmStrike: callAtm.strike,
    };
  }, [chain, currentPrice]);

  // Compute Put/Call ratio for active chain
  const chainPcr = useMemo(() => {
    let callVol = 0;
    let putVol = 0;
    let callOi = 0;
    let putOi = 0;
    chain.calls.forEach((c) => {
      callVol += c.volume;
      callOi += c.openInterest;
    });
    chain.puts.forEach((p) => {
      putVol += p.volume;
      putOi += p.openInterest;
    });
    const volRatio = callVol > 0 ? Number((putVol / callVol).toFixed(2)) : 1.0;
    const oiRatio = callOi > 0 ? Number((putOi / callOi).toFixed(2)) : 1.0;
    return { volRatio, oiRatio, callVol, putVol, callOi, putOi };
  }, [chain]);

  // Toggle multi-expiration accordion section
  const toggleAccordion = (dte: number) => {
    playKeyClick();
    setExpandedDtes((prev) => ({ ...prev, [dte]: !prev[dte] }));
  };

  const expandAllMaturities = () => {
    playKeyClick();
    const updated: Record<number, boolean> = {};
    allChains.forEach((c) => {
      updated[c.dte] = true;
    });
    setExpandedDtes(updated);
  };

  const collapseAllMaturities = () => {
    playKeyClick();
    const updated: Record<number, boolean> = {};
    allChains.forEach((c) => {
      updated[c.dte] = false;
    });
    setExpandedDtes(updated);
  };

  const handleLegClick = (
    type: 'call' | 'put',
    action: 'buy' | 'sell',
    contract: OptionContract,
    chainRef: ExpirationOptionChain
  ) => {
    playKeyClick();
    const existingIndex = builderLegs.findIndex(
      (l) => l.strike === contract.strike && l.type === type && l.action === action && l.dte === chainRef.dte
    );

    if (existingIndex >= 0) {
      onRemoveLeg(builderLegs[existingIndex].id);
      return;
    }

    const premium = action === 'buy' ? contract.ask : contract.bid;
    const multiplier = ticker.multiplier || (ticker.symbol.startsWith('/') ? 50 : 100);
    const newLeg: TradeLeg = {
      id: `${type}-${action}-${contract.strike}-${chainRef.dte}-${Date.now()}`,
      type,
      action,
      strike: contract.strike,
      expiration: chainRef.formattedDate,
      dte: chainRef.dte,
      iv: contract.iv,
      premium,
      contracts: 1,
      multiplier,
      underlyingSymbol: ticker.symbol,
    };

    onAddLeg(newLeg);
  };

  const isLegSelected = (strike: number, type: 'call' | 'put', action: 'buy' | 'sell', dte: number) => {
    return builderLegs.some(
      (l) => l.strike === strike && l.type === type && l.action === action && l.dte === dte
    );
  };

  const handleDropLegOnStrike = (
    legId: string,
    newStrike: number,
    chainRef: ExpirationOptionChain,
    positionId?: string
  ) => {
    // 1. Check if it's a simulated combo trade leg in the builder
    const builderLeg = builderLegs.find((l) => l.id === legId);
    if (builderLeg) {
      const isCall = builderLeg.type === 'call';
      const matched = isCall
        ? chainRef.calls.find((c) => c.strike === newStrike)
        : chainRef.puts.find((p) => p.strike === newStrike);
      const newPremium = matched
        ? (builderLeg.action === 'buy' ? matched.ask : matched.bid)
        : builderLeg.premium;
      const newIv = matched ? matched.iv : builderLeg.iv;
      if (onUpdateLeg) {
        playKeyClick();
        onUpdateLeg({
          ...builderLeg,
          strike: newStrike,
          premium: newPremium,
          iv: newIv,
        });
      }
      return;
    }

    // 2. Check if it's an open portfolio position being rolled/shifted
    const targetPos = (portfolioPositions || []).find(
      (p) => (positionId && p.id === positionId) || p.legs.some((l) => l.id === legId)
    );
    if (targetPos) {
      const targetLeg = targetPos.legs.find((l) => l.id === legId);
      if (!targetLeg) return;
      const isCall = targetLeg.type === 'call';
      const matched = isCall
        ? chainRef.calls.find((c) => c.strike === newStrike)
        : chainRef.puts.find((p) => p.strike === newStrike);
      const newPremium = matched
        ? (targetLeg.action === 'buy' ? matched.ask : matched.bid)
        : targetLeg.premium;
      const newIv = matched ? matched.iv : targetLeg.iv;

      const updatedLegs = targetPos.legs.map((l) =>
        l.id === legId ? { ...l, strike: newStrike, premium: newPremium, iv: newIv } : l
      );
      const newMark = updatedLegs.reduce((sum, l) => {
        const s = l.action === 'buy' ? 1 : -1;
        const mult = l.multiplier || 100;
        return sum + s * l.premium * l.contracts * mult;
      }, 0);
      const updatedPosition: Position = {
        ...targetPos,
        legs: updatedLegs,
        currentMark: newMark,
        unrealizedPnL: newMark - targetPos.entryCost,
        unrealizedPnLPercent:
          targetPos.entryCost !== 0
            ? ((newMark - targetPos.entryCost) / Math.abs(targetPos.entryCost)) * 100
            : 0,
      };

      if (onUpdatePosition) {
        playKeyClick();
        onUpdatePosition(updatedPosition);
      }
    }
  };

  // Reusable sub-renderer for contract table
  const renderOptionTable = (
    contractsData: { calls: OptionContract[]; puts: OptionContract[] },
    chainRef: ExpirationOptionChain
  ) => {
    return (
      <table className="options-matrix w-full text-left border-collapse text-[11px] font-mono select-none">
        {/* Table Header */}
        <thead className="sticky top-0 z-20 bg-[#222] border-b border-[var(--border)] text-[var(--ink-muted)] uppercase text-[10px]">
          {/* Top super-header row */}
          <tr className="border-b border-[#333]">
            {(sideFilter === 'both' || sideFilter === 'calls') && (
              <th
                colSpan={(showGreeks ? 8 : 5) + (showSpread ? 2 : 0)}
                className="py-1 px-2 text-center font-bold tracking-wider"
                style={{ color: 'var(--bull)' }}
              >
                CALLS
              </th>
            )}
            <th className="strike-cell py-1 px-2 text-center uppercase tracking-wider text-[9px] text-[#ffd600] border-l border-[var(--border)]" title="Count of days until next quarterly earnings release">
              DTEARN
            </th>
            <th className="strike-cell py-1 px-3 text-center uppercase tracking-wider text-[10px] border-r border-[var(--border)]">
              STRIKE
            </th>
            {(sideFilter === 'both' || sideFilter === 'puts') && (
              <th
                colSpan={(showGreeks ? 8 : 5) + (showSpread ? 2 : 0)}
                className="py-1 px-2 text-center font-bold tracking-wider"
                style={{ color: 'var(--bear)' }}
              >
                PUTS
              </th>
            )}
          </tr>

          <tr>
            {/* CALLS SIDE HEADERS */}
            {(sideFilter === 'both' || sideFilter === 'calls') && (
              <>
                {showGreeks && (
                  <>
                    <th className="py-1.5 px-2 text-right">Delta</th>
                    <th className="py-1.5 px-2 text-right">Theta</th>
                    <th className="py-1.5 px-2 text-right">Vega</th>
                  </>
                )}
                <th className="py-1.5 px-2 text-right">Vol</th>
                <th className="py-1.5 px-2 text-right">OI</th>
                <th className="py-1.5 px-2 text-right text-[#00d2ff]">IV%</th>
                <th className="py-1.5 px-2 text-right text-[var(--bull)] font-bold">Bid (Sell)</th>
                <th className="py-1.5 px-2 text-right text-[var(--bear)] font-bold">Ask (Buy)</th>
                {showSpread && (
                  <>
                    <th className="py-1.5 px-2 text-right text-[#ff9900] font-bold" title="Bid-Ask Option Spread in $ and % of Mid">Spread</th>
                    <th className="py-1.5 px-1.5 text-center text-[#38bdf8] font-bold" title="Level 2 Option Market Depth (DOM)">DOM</th>
                  </>
                )}
              </>
            )}

            {/* DAYS TO EARNINGS HEADER */}
            <th className="strike-cell py-1.5 px-2 text-center font-bold text-[#ffd600] border-l border-[var(--border)] text-[9px]" title="Days until next quarterly earnings release">
              EARN (DTE)
            </th>

            {/* CENTER STRIKE HEADER */}
            <th className="strike-cell py-1.5 px-3 text-center font-black border-r border-[var(--border)]">
              {currentPrice.toFixed(2)}
            </th>

            {/* PUTS SIDE HEADERS */}
            {(sideFilter === 'both' || sideFilter === 'puts') && (
              <>
                {showSpread && (
                  <>
                    <th className="py-1.5 px-1.5 text-center text-[#38bdf8] font-bold" title="Level 2 Option Market Depth (DOM)">DOM</th>
                    <th className="py-1.5 px-2 text-left text-[#ff9900] font-bold" title="Bid-Ask Option Spread in $ and % of Mid">Spread</th>
                  </>
                )}
                <th className="py-1.5 px-2 text-left text-[var(--bull)] font-bold">Bid (Sell)</th>
                <th className="py-1.5 px-2 text-left text-[var(--bear)] font-bold">Ask (Buy)</th>
                <th className="py-1.5 px-2 text-left text-[#00d2ff]">IV%</th>
                <th className="py-1.5 px-2 text-left">OI</th>
                <th className="py-1.5 px-2 text-left">Vol</th>
                {showGreeks && (
                  <>
                    <th className="py-1.5 px-2 text-left">Delta</th>
                    <th className="py-1.5 px-2 text-left">Theta</th>
                    <th className="py-1.5 px-2 text-left">Vega</th>
                  </>
                )}
              </>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-[#101624]">
          {contractsData.calls.map((call, idx) => {
            const put = contractsData.puts[idx] || call;
            const strike = call.strike;
            const isAtm =
              Math.abs(strike - currentPrice) <=
              (contractsData.calls[1] ? Math.abs(contractsData.calls[1].strike - strike) * 0.6 : 1);

            const moneynessPct = Number((((strike - currentPrice) / currentPrice) * 100).toFixed(1));

            const callBuy = isLegSelected(strike, 'call', 'buy', chainRef.dte);
            const callSell = isLegSelected(strike, 'call', 'sell', chainRef.dte);
            const putBuy = isLegSelected(strike, 'put', 'buy', chainRef.dte);
            const putSell = isLegSelected(strike, 'put', 'sell', chainRef.dte);

            const callPosList =
              openPositionsMap[`${Number(strike)}_${'call'}_${chainRef.dte}`] ||
              openPositionsMap[`${Number(strike).toFixed(2)}_${'call'}_${chainRef.dte}`] ||
              openPositionsMap[`${Number(strike)}_${'call'}`] ||
              openPositionsMap[`${Number(strike).toFixed(2)}_${'call'}`];

            const putPosList =
              openPositionsMap[`${Number(strike)}_${'put'}_${chainRef.dte}`] ||
              openPositionsMap[`${Number(strike).toFixed(2)}_${'put'}_${chainRef.dte}`] ||
              openPositionsMap[`${Number(strike)}_${'put'}`] ||
              openPositionsMap[`${Number(strike).toFixed(2)}_${'put'}`];

            const hasPositionOnRow = Boolean((callPosList && callPosList.length > 0) || (putPosList && putPosList.length > 0));
            const isDropTarget = hoveredDropStrike === strike;

            return (
              <tr
                key={strike}
                onDragOver={(e) => {
                  if (draggedLegId) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (hoveredDropStrike !== strike) setHoveredDropStrike(strike);
                  }
                }}
                onDragLeave={() => {
                  if (hoveredDropStrike === strike) setHoveredDropStrike(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoveredDropStrike(null);
                  const data = e.dataTransfer.getData('text/plain');
                  if (data) {
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.legId) {
                        handleDropLegOnStrike(parsed.legId, strike, chainRef, parsed.positionId);
                      }
                    } catch {}
                  }
                }}
                className={`transition-all border-b border-[#1a1a1a] ${
                  isDropTarget
                    ? 'bg-[#00d2ff]/20 ring-2 ring-[#00d2ff] border-l-4 border-l-[#00d2ff]'
                    : hasPositionOnRow
                    ? 'bg-[#ff9900]/15 border-l-4 border-l-[#ff9900] ring-1 ring-[#ff9900]/40'
                    : isAtm
                    ? 'bg-[#2a2a2a] font-bold'
                    : 'hover:bg-[#252525]'
                }`}
              >
                {/* CALLS COLUMNS */}
                {(sideFilter === 'both' || sideFilter === 'calls') && (
                  <>
                    {showGreeks && (
                      <>
                        <td
                          className={`py-1 px-2 text-right ${
                            call.itm ? 'itm-call text-[#e2e8f0]' : 'text-[#8c8c8c]'
                          }`}
                        >
                          {call.delta.toFixed(2)}
                        </td>
                        <td
                          className={`py-1 px-2 text-right ${
                            call.itm ? 'itm-call text-[#e2e8f0]' : 'text-[#555]'
                          }`}
                        >
                          {call.theta.toFixed(2)}
                        </td>
                        <td
                          className={`py-1 px-2 text-right ${
                            call.itm ? 'itm-call text-[#e2e8f0]' : 'text-[#555]'
                          }`}
                        >
                          {call.vega.toFixed(2)}
                        </td>
                      </>
                    )}

                    {/* Vol & OI */}
                    <td
                      className={`py-1 px-2 text-right ${
                        call.itm ? 'itm-call text-white' : 'text-[#d1d1d1]'
                      }`}
                    >
                      {call.volume.toLocaleString()}
                    </td>
                    <td
                      className={`py-1 px-2 text-right ${
                        call.itm ? 'itm-call text-[#8c8c8c]' : 'text-[#666]'
                      }`}
                    >
                      {call.openInterest.toLocaleString()}
                    </td>

                    {/* IV */}
                    <td
                      className={`py-1 px-2 text-right text-[#00d2ff] ${
                        call.itm ? 'itm-call' : ''
                      }`}
                    >
                      {(call.iv * 100).toFixed(1)}%
                    </td>

                    {/* Call Bid (SELL) */}
                    <td className={`py-0.5 px-1 text-right ${call.itm ? 'itm-call' : ''}`}>
                      <button
                        onClick={() => handleLegClick('call', 'sell', call, chainRef)}
                        title={`Sell ${strike} Call @ $${call.bid.toFixed(2)}`}
                        className={`bid w-full py-0.5 px-1.5 rounded transition-all text-right font-bold ${
                          callSell
                            ? 'bg-[#e53935] text-white'
                            : 'text-[var(--bull)] hover:bg-[#43a047]/20'
                        }`}
                      >
                        {call.bid.toFixed(2)}
                      </button>
                    </td>

                    {/* Call Ask (BUY) */}
                    <td className={`py-0.5 px-1 text-right ${call.itm ? 'itm-call' : ''}`}>
                      <button
                        onClick={() => handleLegClick('call', 'buy', call, chainRef)}
                        title={`Buy ${strike} Call @ $${call.ask.toFixed(2)}`}
                        className={`ask w-full py-0.5 px-1.5 rounded transition-all text-right font-bold ${
                          callBuy
                            ? 'bg-[#43a047] text-white'
                            : 'text-[var(--bear)] hover:bg-[#e53935]/20'
                        }`}
                      >
                        {call.ask.toFixed(2)}
                      </button>
                      {callPosList && callPosList.length > 0 && (
                        <div className="flex flex-col items-end gap-0.5 mt-1">
                          {callPosList.map((cp, cIdx) => {
                            const isThisExpiry = cp.leg.dte === chainRef.dte;
                            const isLong = cp.action === 'buy';
                            return (
                              <span
                                key={cIdx}
                                className={`px-1.5 py-0.5 rounded text-[8.5px] font-black tracking-wider flex items-center gap-1 shadow-xs border ${
                                  isLong
                                    ? 'bg-[#00e676] text-black border-[#00c853]'
                                    : 'bg-[#ff9900] text-black border-[#e68a00]'
                                }`}
                                title={`Open ${cp.pos.strategyName}: ${isLong ? 'LONG' : 'SHORT'} ${cp.contracts}x @ $${cp.entryPrice.toFixed(2)} (P&L: ${cp.unrealizedPnL >= 0 ? '+' : ''}$${cp.unrealizedPnL.toFixed(2)})${!isThisExpiry ? ` · Exp: ${cp.leg.expiration || cp.leg.dte + 'd'}` : ''}`}
                              >
                                <span className="font-extrabold">{isLong ? 'LONG CALL' : 'SHORT CALL'}</span>
                                <span>{isLong ? '+' : '-'}{cp.contracts}x</span>
                                {!isThisExpiry && (
                                  <span className="text-[7.5px] opacity-85">({cp.leg.dte}d)</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Call Spread & DOM Market Depth */}
                    {showSpread && (() => {
                      const sprd = Number((call.ask - call.bid).toFixed(2));
                      const mid = (call.ask + call.bid) / 2;
                      const sprdPct = mid > 0 ? Number(((sprd / mid) * 100).toFixed(1)) : 0;
                      const isTight = sprd <= 0.05 || sprdPct <= 2.5;
                      const isWide = sprd >= 0.20 || sprdPct >= 8.0;
                      return (
                        <>
                          <td
                            onClick={() => onOpenMarketDepth && onOpenMarketDepth('call', strike)}
                            className={`py-0.5 px-2 text-right cursor-pointer hover:bg-[#1a2336] transition-colors ${call.itm ? 'itm-call' : ''}`}
                            title={`Click to open Market Depth for ${strike} Call (Spread: $${sprd.toFixed(2)} · ${sprdPct}%)`}
                          >
                            <span className={`font-mono font-bold ${
                              isTight ? 'text-[#00e676]' : isWide ? 'text-[#ff334b]' : 'text-[#ff9900]'
                            }`}>
                              ${sprd.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-[#8b9bb4] ml-1">
                              ({sprdPct}%)
                            </span>
                          </td>
                          <td className="py-0.5 px-1 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playKeyClick();
                                if (onOpenMarketDepth) onOpenMarketDepth('call', strike);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#101726] hover:bg-[#00e676] hover:text-black text-[#38bdf8] border border-[#223150] hover:border-[#00e676] text-[8.5px] font-black transition-colors cursor-pointer"
                              title={`Inspect Level 2 Market Depth (DOM) for ${strike} Call`}
                            >
                              DOM
                            </button>
                          </td>
                        </>
                      );
                    })()}
                  </>
                )}

                {/* DAYS TO EARNINGS COLUMN */}
                <td className="strike-cell py-1 px-2 text-center border-l border-[var(--border)] bg-[#191919]">
                  {ticker.daysToEarnings !== null && ticker.daysToEarnings !== undefined ? (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold ${
                        ticker.daysToEarnings <= 21
                          ? 'bg-[#ffd600]/25 text-[#ffd600] border border-[#ffd600]/50'
                          : ticker.daysToEarnings <= 35
                          ? 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/30'
                          : 'text-[#8c8c8c]'
                      }`}
                      title={`Next Earnings: ${ticker.earningsDate || 'TBD'} (Est Move: ±${ticker.earningsEstimatedMovePct || 'N/A'}%)`}
                    >
                      {ticker.daysToEarnings}d
                    </span>
                  ) : (
                    <span className="text-[#555] text-[9px]" title="Index / ETF / Futures - No single-stock earnings">
                      --
                    </span>
                  )}
                </td>

                {/* CENTER STRIKE COLUMN */}
                <td
                  className={`strike-cell py-1.5 px-3 text-center font-bold border-r border-[var(--border)] ${
                    isDropTarget
                      ? 'bg-[#00d2ff] text-black font-black animate-pulse shadow-lg ring-2 ring-[#00e5ff]'
                      : hasPositionOnRow
                      ? 'bg-[#ff9900]/25 text-white font-black ring-1 ring-[#ff9900]/60'
                      : isAtm
                      ? 'bg-[var(--accent)] text-black font-extrabold shadow-inner'
                      : 'bg-[var(--sidebar-bg)] text-[var(--accent)]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {isDropTarget ? (
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-black">
                        <GripVertical className="w-3.5 h-3.5 text-black" />
                        <span>ROLL ➔ ${strike.toFixed(2)}</span>
                      </span>
                    ) : (
                      <>
                        {hasPositionOnRow && (
                          <span
                            draggable
                            onDragStart={(e) => {
                              const posItem = (callPosList && callPosList[0]) || (putPosList && putPosList[0]);
                              if (posItem) {
                                e.dataTransfer.setData(
                                  'text/plain',
                                  JSON.stringify({
                                    positionId: posItem.pos.id,
                                    legId: posItem.leg.id,
                                    type: posItem.leg.type,
                                    strike: posItem.leg.strike,
                                  })
                                );
                                setDraggedLegId(posItem.leg.id);
                              }
                            }}
                            onDragEnd={() => {
                              setDraggedLegId(null);
                              setHoveredDropStrike(null);
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#ff9900] text-black text-[8px] font-black shadow-xs flex items-center gap-0.5 cursor-grab active:cursor-grabbing hover:brightness-110 select-none"
                            title="Drag this open position to any strike row to roll your strike!"
                          >
                            <Star className="w-2.5 h-2.5 fill-black" />
                            <span>POS</span>
                            <GripVertical className="w-2 h-2 text-black" />
                          </span>
                        )}
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', JSON.stringify({ strike, type: 'strike' }));
                          }}
                          className="text-xs font-black cursor-grab active:cursor-grabbing hover:underline"
                          title="Drag this strike to Combo Bar or click to inspect"
                        >
                          {strike.toFixed(2)}
                        </span>
                        <span
                          className={`text-[9px] ${
                            hasPositionOnRow ? 'text-[#ffb020] font-black' : isAtm ? 'text-black font-extrabold' : 'text-[#8c8c8c]'
                          }`}
                        >
                          {moneynessPct > 0 ? `+${moneynessPct}%` : `${moneynessPct}%`}
                        </span>
                      </>
                    )}
                  </div>
                </td>

                {/* PUTS COLUMNS */}
                {(sideFilter === 'both' || sideFilter === 'puts') && (
                  <>
                    {/* Put Spread & DOM Market Depth */}
                    {showSpread && (() => {
                      const sprd = Number((put.ask - put.bid).toFixed(2));
                      const mid = (put.ask + put.bid) / 2;
                      const sprdPct = mid > 0 ? Number(((sprd / mid) * 100).toFixed(1)) : 0;
                      const isTight = sprd <= 0.05 || sprdPct <= 2.5;
                      const isWide = sprd >= 0.20 || sprdPct >= 8.0;
                      return (
                        <>
                          <td className="py-0.5 px-1 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playKeyClick();
                                if (onOpenMarketDepth) onOpenMarketDepth('put', strike);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#101726] hover:bg-[#ff334b] hover:text-white text-[#38bdf8] border border-[#223150] hover:border-[#ff334b] text-[8.5px] font-black transition-colors cursor-pointer"
                              title={`Inspect Level 2 Market Depth (DOM) for ${strike} Put`}
                            >
                              DOM
                            </button>
                          </td>
                          <td
                            onClick={() => onOpenMarketDepth && onOpenMarketDepth('put', strike)}
                            className={`py-0.5 px-2 text-left cursor-pointer hover:bg-[#1a2336] transition-colors ${put.itm ? 'itm-put' : ''}`}
                            title={`Click to open Market Depth for ${strike} Put (Spread: $${sprd.toFixed(2)} · ${sprdPct}%)`}
                          >
                            <span className={`font-mono font-bold ${
                              isTight ? 'text-[#00e676]' : isWide ? 'text-[#ff334b]' : 'text-[#ff9900]'
                            }`}>
                              ${sprd.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-[#8b9bb4] ml-1">
                              ({sprdPct}%)
                            </span>
                          </td>
                        </>
                      );
                    })()}

                    {/* Put Bid (SELL) */}
                    <td className={`py-0.5 px-1 text-left ${put.itm ? 'itm-put' : ''}`}>
                      <button
                        onClick={() => handleLegClick('put', 'sell', put, chainRef)}
                        title={`Sell ${strike} Put @ $${put.bid.toFixed(2)}`}
                        className={`bid w-full py-0.5 px-1.5 rounded transition-all text-left font-bold ${
                          putSell
                            ? 'bg-[#e53935] text-white'
                            : 'text-[var(--bull)] hover:bg-[#43a047]/20'
                        }`}
                      >
                        {put.bid.toFixed(2)}
                      </button>
                      {putPosList && putPosList.length > 0 && (
                        <div className="flex flex-col items-start gap-0.5 mt-1">
                          {putPosList.map((pp, pIdx) => {
                            const isThisExpiry = pp.leg.dte === chainRef.dte;
                            const isLong = pp.action === 'buy';
                            return (
                              <span
                                key={pIdx}
                                className={`px-1.5 py-0.5 rounded text-[8.5px] font-black tracking-wider flex items-center gap-1 shadow-xs border ${
                                  isLong
                                    ? 'bg-[#00e676] text-black border-[#00c853]'
                                    : 'bg-[#ff9900] text-black border-[#e68a00]'
                                }`}
                                title={`Open ${pp.pos.strategyName}: ${isLong ? 'LONG' : 'SHORT'} ${pp.contracts}x @ $${pp.entryPrice.toFixed(2)} (P&L: ${pp.unrealizedPnL >= 0 ? '+' : ''}$${pp.unrealizedPnL.toFixed(2)})${!isThisExpiry ? ` · Exp: ${pp.leg.expiration || pp.leg.dte + 'd'}` : ''}`}
                              >
                                <span className="font-extrabold">{isLong ? 'LONG PUT' : 'SHORT PUT'}</span>
                                <span>{isLong ? '+' : '-'}{pp.contracts}x</span>
                                {!isThisExpiry && (
                                  <span className="text-[7.5px] opacity-85">({pp.leg.dte}d)</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Put Ask (BUY) */}
                    <td className={`py-0.5 px-1 text-left ${put.itm ? 'itm-put' : ''}`}>
                      <button
                        onClick={() => handleLegClick('put', 'buy', put, chainRef)}
                        title={`Buy ${strike} Put @ $${put.ask.toFixed(2)}`}
                        className={`ask w-full py-0.5 px-1.5 rounded transition-all text-left font-bold ${
                          putBuy
                            ? 'bg-[#43a047] text-white'
                            : 'text-[var(--bear)] hover:bg-[#e53935]/20'
                        }`}
                      >
                        {put.ask.toFixed(2)}
                      </button>
                    </td>

                    {/* Put IV */}
                    <td
                      className={`py-1 px-2 text-left text-[#00d2ff] ${
                        put.itm ? 'itm-put' : ''
                      }`}
                    >
                      {(put.iv * 100).toFixed(1)}%
                    </td>

                    {/* Put OI & Vol */}
                    <td
                      className={`py-1 px-2 text-left ${
                        put.itm ? 'itm-put text-[#8c8c8c]' : 'text-[#666]'
                      }`}
                    >
                      {put.openInterest.toLocaleString()}
                    </td>
                    <td
                      className={`py-1 px-2 text-left ${
                        put.itm ? 'itm-put text-white' : 'text-[#d1d1d1]'
                      }`}
                    >
                      {put.volume.toLocaleString()}
                    </td>

                    {showGreeks && (
                      <>
                        <td
                          className={`py-1 px-2 text-left ${
                            put.itm ? 'itm-put text-[#e2e8f0]' : 'text-[#8c8c8c]'
                          }`}
                        >
                          {put.delta.toFixed(2)}
                        </td>
                        <td
                          className={`py-1 px-2 text-left ${
                            put.itm ? 'itm-put text-[#e2e8f0]' : 'text-[#555]'
                          }`}
                        >
                          {put.theta.toFixed(2)}
                        </td>
                        <td
                          className={`py-1 px-2 text-left ${
                            put.itm ? 'itm-put text-[#e2e8f0]' : 'text-[#555]'
                          }`}
                        >
                          {put.vega.toFixed(2)}
                        </td>
                      </>
                    )}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border border-[var(--border)] rounded overflow-hidden font-mono text-xs">
      {/* ========================================================
          1. SCREEN HEADER BANNER
      ======================================================== */}
      <div className="bg-[var(--sidebar-bg)] border-b border-[var(--border)] px-3 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent)] font-black text-sm tracking-wider">
            {ticker.symbol} US Equity OMON
          </span>
          <span className="text-[var(--ink-muted)] text-[11px] hidden sm:inline">
            // OPTIONS MONITOR & COMPREHENSIVE STRIKE MATRIX
          </span>

          {/* Master Expirations & Strikes Directory Button */}
          <button
            onClick={() => {
              playKeyClick();
              setShowDirectoryModal(true);
            }}
            className="ml-2 px-2.5 py-0.5 bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] border border-[#ff9900]/40 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all"
            title="Browse All 16 Expirations & Strikes Master Directory"
          >
            <BookOpen className="w-3 h-3" />
            <span>ALL EXPIRATIONS & STRIKES DIRECTORY</span>
          </button>
        </div>

        {/* ATM Straddle & Expected Move Metric Box */}
        <div className="flex items-center gap-3 bg-[#1e1e1e] border border-[var(--border)] px-3 py-1 rounded text-[11px]">
          <div>
            <span className="text-[var(--ink-muted)]">ATM STRADDLE: </span>
            <span className="text-[#ffd600] font-bold">${atmMetrics.straddleCost}</span>
          </div>
          <div className="h-3 w-px bg-[var(--border)]" />
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenExpectedMove) onOpenExpectedMove();
            }}
            title="Open comprehensive Expected Price Move Matrix & Multi-Expiration Probability Analysis"
            className="flex items-center gap-1.5 hover:text-[#00d2ff] cursor-pointer group"
          >
            <span className="text-[var(--ink-muted)] group-hover:text-[#00d2ff]">EXPECTED MOVE: </span>
            <span className="text-[#00d2ff] font-extrabold group-hover:underline">
              ±${atmMetrics.straddleCost} (±{atmMetrics.movePct}%)
            </span>
            <span className="text-[10px] text-[#00e676] bg-[#00e676]/10 px-1 rounded border border-[#00e676]/30 hidden sm:inline">
              [${(currentPrice - atmMetrics.straddleCost).toFixed(1)} – ${(currentPrice + atmMetrics.straddleCost).toFixed(1)}]
            </span>
          </button>
          <div className="h-3 w-px bg-[var(--border)]" />
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenNetGamma) onOpenNetGamma();
            }}
            title="Open Net Gamma Exposure (GEX) Engine & Zero-Gamma Volatility Trigger"
            className="flex items-center gap-1.5 hover:text-[#a855f7] cursor-pointer group"
          >
            <span className="text-[var(--ink-muted)] group-hover:text-[#a855f7]">NET GAMMA: </span>
            <span className="text-[#a855f7] font-extrabold group-hover:underline">
              {ticker.ivRank < 50 ? '+$1.84B' : '-$420M'}
            </span>
            <span className="text-[9.5px] text-[#ffd600] bg-[#ffd600]/10 px-1 rounded border border-[#ffd600]/30 hidden md:inline font-mono">
              Flip: ${(currentPrice * (ticker.ivRank < 50 ? 0.985 : 1.015)).toFixed(1)}
            </span>
          </button>
          <div className="h-3 w-px bg-[var(--border)]" />
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenMarketDepth) onOpenMarketDepth('call', currentPrice);
            }}
            className="flex items-center gap-1.5 hover:text-[#00e676] cursor-pointer group"
            title="Open Option Level 2 Bid-Ask Market Depth (DOM)"
          >
            <span className="text-[var(--ink-muted)] group-hover:text-white">ATM SPREAD: </span>
            <span className="text-[#00e676] font-extrabold group-hover:underline">
              ${(Math.abs((chain.calls[0]?.ask || 1) - (chain.calls[0]?.bid || 0.95))).toFixed(2)}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30 font-bold">
              DOM L2
            </span>
          </button>
          <div className="h-3 w-px bg-[var(--border)]" />
          <div>
            <span className="text-[var(--ink-muted)]">IV RANK: </span>
            <span className="text-[var(--accent)] font-bold">{ticker.ivRank}%</span>
          </div>
          <div className="h-3 w-px bg-[var(--border)]" />
          <div>
            <span className="text-[var(--ink-muted)]">P/C VOL: </span>
            <span
              className={`font-bold ${
                chainPcr.volRatio < 0.8
                  ? 'text-[var(--bull)]'
                  : chainPcr.volRatio > 1.1
                  ? 'text-[var(--bear)]'
                  : 'text-[#00d2ff]'
              }`}
            >
              {chainPcr.volRatio.toFixed(2)}x
            </span>
          </div>
          <div className="h-3 w-px bg-[var(--border)]" />
          {ticker.daysToEarnings !== null && ticker.daysToEarnings !== undefined ? (
            <div className="flex items-center gap-1 text-[10px]" title={`Next release: ${ticker.earningsDate}`}>
              <span className="text-[var(--ink-muted)]">EARNINGS: </span>
              <span className="text-[#ffd600] font-bold">
                {ticker.daysToEarnings}d ({ticker.earningsDate})
              </span>
              {ticker.earningsEstimatedMovePct && (
                <span className="text-[#00d2ff] font-extrabold text-[9px] bg-[#00d2ff]/10 px-1 rounded">
                  ±{ticker.earningsEstimatedMovePct}%
                </span>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-[#8c8c8c]">
              <span>{ticker.assetType === 'future' ? 'FUTURES & FOP' : 'INDEX / ETF'}</span>
            </div>
          )}
          {onOpenRiskProfile && (
            <>
              <div className="h-3 w-px bg-[var(--border)]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenRiskProfile();
                }}
                className="px-2 py-0.5 bg-[#43a047]/20 hover:bg-[#43a047]/30 text-[#43a047] border border-[#43a047]/50 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                title="Open Dedicated Risk Profile (Bigger Picture Payoff Engine)"
              >
                <span>RISK PROFILE</span>
                <span className="text-[9px] opacity-75">{'<RISK>'}</span>
              </button>
            </>
          )}
          {onOpenPcrScreen && (
            <>
              <div className="h-3 w-px bg-[var(--border)]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenPcrScreen();
                }}
                className="px-2 py-0.5 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/50 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                title="View Institutional Put/Call Ratio & Sentiment Analysis"
              >
                <span>P/C RATIO</span>
                <span className="text-[9px] opacity-75">{'<PCR>'}</span>
              </button>
            </>
          )}
          {onOpenRiskProfile && (
            <>
              <div className="h-3 w-px bg-[var(--border)]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenRiskProfile();
                }}
                className="px-2 py-0.5 bg-[#43a047]/20 hover:bg-[#43a047]/30 text-[#43a047] border border-[#43a047]/50 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                title="View Dedicated Risk Profile & Bigger Picture Payoff Engine"
              >
                <span>RISK PROFILE</span>
                <span className="text-[9px] opacity-75">{'<F4>'}</span>
              </button>
            </>
          )}
          {onOpenConeScreen && (
            <>
              <div className="h-3 w-px bg-[var(--border)]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenConeScreen();
                }}
                className="px-2 py-0.5 bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                title="View Probability of Expiring Cones & Multi-Sigma Bands"
              >
                <span>PROBABILITY CONE</span>
                <span className="text-[9px] opacity-75">{'<F5>'}</span>
              </button>
            </>
          )}
          {onOpenVolsScreen && (
            <>
              <div className="h-3 w-px bg-[var(--border)]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenVolsScreen();
                }}
                className="px-2 py-0.5 bg-[#00e5ff]/20 hover:bg-[#00e5ff]/30 text-[#00e5ff] border border-[#00e5ff]/50 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                title="View Volatility Skews for All Expirations, Term Structure, & 2D Surface"
              >
                <span>VOL SKEWS</span>
                <span className="text-[9px] opacity-75">{'<F7>'}</span>
              </button>
            </>
          )}
          {onOpenVegaScreen && (
            <>
              <div className="h-3 w-px bg-[var(--border)]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenVegaScreen();
                }}
                className="px-2 py-0.5 bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="View Vega across ALL Expirations and ALL Strikes"
              >
                <span>VEGA MATRIX</span>
                <span className="text-[9px] opacity-75">ALL EXP / STRIKES</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* FUTURES & OPTIONS ON FUTURES (FOP) CONTRACT SPECIFICATIONS BANNER */}
      {/* FUTURES & OPTIONS ON FUTURES (FOP) CONTRACT SPECIFICATIONS BANNER */}
      {(ticker.assetType === 'future' || ticker.symbol.startsWith('/')) && (
        <div className="bg-gradient-to-r from-[#171c26] via-[#101522] to-[#12141a] border-b border-[#2d3a54] px-3 py-2 flex flex-col gap-2 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-black text-[10px] border tracking-wider ${
                ticker.symbol === '/SXF' || ticker.symbol === '/SXM' || ticker.symbol === '/CGB' || ticker.symbol === '/CRA' || ticker.symbol === '/SCF' || ticker.symbol === '/CGF'
                  ? 'bg-[#ff334b]/20 text-[#ff334b] border-[#ff334b]/40'
                  : 'bg-[#ffd600]/20 text-[#ffd600] border-[#ffd600]/40'
              }`}>
                {ticker.symbol === '/SXF' || ticker.symbol === '/SXM' || ticker.symbol === '/CGB' || ticker.symbol === '/CRA' || ticker.symbol === '/SCF' || ticker.symbol === '/CGF'
                  ? '🇨🇦 TSX / MX FUTURE'
                  : 'OPTIONS ON FUTURES (FOP)'}
              </span>
              <span className="text-white font-extrabold text-sm">{ticker.symbol}</span>
              <span className="text-[#8c8c8c] text-[11px] font-bold">· {ticker.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                ticker.symbol === '/SXF' || ticker.symbol === '/SXM' || ticker.symbol === '/CGB' || ticker.symbol === '/CRA' || ticker.symbol === '/SCF' || ticker.symbol === '/CGF'
                  ? 'bg-[#ff334b]/15 text-[#ff334b] border-[#ff334b]/30'
                  : 'bg-[#00d2ff]/10 text-[#00d2ff] border-[#00d2ff]/30'
              }`}>
                {ticker.symbol === '/SXF' || ticker.symbol === '/SXM' || ticker.symbol === '/CGB' || ticker.symbol === '/CRA' || ticker.symbol === '/SCF' || ticker.symbol === '/CGF'
                  ? 'BOURSE DE MONTRÉAL (MX) / TMX'
                  : ticker.symbol === '/ES' || ticker.symbol === '/NQ' || ticker.symbol === '/RTY' || ticker.symbol === '/BTC' || ticker.symbol === '/ETH' || ticker.symbol === '/6E' || ticker.symbol === '/6C'
                  ? 'CME GROUP'
                  : ticker.symbol === '/CL' || ticker.symbol === '/NG'
                  ? 'NYMEX'
                  : ticker.symbol === '/GC' || ticker.symbol === '/SI'
                  ? 'COMEX'
                  : 'CBOT'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenTSXFuturesHub && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onOpenTSXFuturesHub();
                  }}
                  className="px-2.5 py-1 rounded bg-[#ff334b]/20 hover:bg-[#ff334b]/30 text-[#ff334b] border border-[#ff334b]/50 font-black text-[10px] transition-all flex items-center gap-1.5 shadow-[0_0_8px_rgba(255,51,75,0.2)]"
                  title="Open Canadian TSX & Montreal Exchange (MX) Futures Platform & Arbitrage Hub"
                >
                  <span>🇨🇦 TSX FUTURES HUB</span>
                </button>
              )}
              {onOpenOpecScreen && (ticker.symbol === '/CL' || ticker.symbol === '/NG' || ticker.symbol === 'BP') && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onOpenOpecScreen();
                  }}
                  className="px-2.5 py-1 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 font-black text-[10px] transition-all flex items-center gap-1.5 shadow-[0_0_8px_rgba(255,153,0,0.2)]"
                  title="Analyze upcoming OPEC+ meetings and implied volatility (OVX) crush & run-up dynamics"
                >
                  <Flame className="w-3.5 h-3.5 animate-pulse text-[#ff9900]" />
                  <span>OPEC+ &amp; CRUDE IV DYNAMICS</span>
                </button>
              )}
              {onOpenFuturesTermStructure && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onOpenFuturesTermStructure();
                  }}
                  className="px-2.5 py-1 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 font-black text-[10px] transition-all flex items-center gap-1.5 shadow-[0_0_8px_rgba(255,153,0,0.2)]"
                  title="Analyze forward curve, contango/backwardation, and roll yields for futures contracts <FTS>"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#ff9900]" />
                  <span>FUTURES TERM STRUCTURE (FTS)</span>
                </button>
              )}
              {onOpenStockTrade && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onOpenStockTrade();
                  }}
                  className="px-2.5 py-1 rounded bg-[#ffd600] hover:bg-[#ffe033] text-black font-black text-[10px] transition-all shadow-sm flex items-center gap-1"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>TRADE OUTRIGHT FUTURE ({ticker.symbol})</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Specifications Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 bg-[#0c1017] p-2 rounded border border-[#1e2738] text-[10px]">
            <div>
              <span className="text-[#8c8c8c] block text-[9px] uppercase">Multiplier</span>
              <span className="text-white font-black">
                {ticker.multiplier || 50}x ({ticker.currency === 'CAD' ? 'C$' : '$'}{ticker.multiplier || 50} / pt)
              </span>
            </div>
            <div>
              <span className="text-[#8c8c8c] block text-[9px] uppercase">Min Tick / Value</span>
              <span className="text-[#00e676] font-bold">
                {ticker.tickSize || 0.25} ({ticker.currency === 'CAD' ? 'C$' : '$'}{((ticker.tickSize || 0.25) * (ticker.multiplier || 50)).toFixed(2)})
              </span>
            </div>
            <div>
              <span className="text-[#8c8c8c] block text-[9px] uppercase">Clearing House</span>
              <span className="text-white font-bold">
                {ticker.currency === 'CAD' ? 'CDCC (Montreal)' : 'CME Clearing'}
              </span>
            </div>
            <div>
              <span className="text-[#8c8c8c] block text-[9px] uppercase">Settlement</span>
              <span className="text-[#00d2ff] font-bold">
                {ticker.symbol === '/CGB' || ticker.symbol === '/CGF' ? 'Physical GoC Bond' : 'Cash Settled (OCP)'}
              </span>
            </div>
            <div>
              <span className="text-[#8c8c8c] block text-[9px] uppercase">Initial Margin</span>
              <span className="text-[#ffd600] font-bold">
                {ticker.currency === 'CAD' ? 'C$' : '$'}{((ticker.price * (ticker.multiplier || 50)) * 0.08).toLocaleString('en-US', { maximumFractionDigits: 0 })} SPAN
              </span>
            </div>
            <div>
              <span className="text-[#8c8c8c] block text-[9px] uppercase">Trading Hours</span>
              <span className="text-[#cbd5e1] font-bold">
                {ticker.currency === 'CAD' ? 'MX 02:00 - 16:30 ET' : '23/6 Globex Active'}
              </span>
            </div>
          </div>

          {/* Quick Futures Switcher Row */}
          {onSelectTicker && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
              {/* CANADIAN TSX / MX FUTURES BUTTONS */}
              <span className="text-[#ff334b] text-[9px] font-black uppercase shrink-0 mr-1 flex items-center gap-1">
                <span>🇨🇦 TSX/MX:</span>
              </span>
              {[
                { sym: '/SXF', label: 'TSX 60' },
                { sym: '/SXM', label: 'Mini 60' },
                { sym: '/CGB', label: '10Y GoC' },
                { sym: '/CRA', label: '3M CORRA' },
                { sym: '/SCF', label: 'TSX Comp' },
                { sym: '/CGF', label: '5Y GoC' },
                { sym: '/6C', label: 'CAD FX' },
              ].map((f) => (
                <button
                  key={f.sym}
                  onClick={() => {
                    playKeyClick();
                    onSelectTicker(f.sym);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-all border ${
                    ticker.symbol === f.sym
                      ? 'bg-[#ff334b] text-white border-[#ff334b] font-black shadow-sm'
                      : 'bg-[#191016] text-[#ff99a8] border-[#381d28] hover:text-white hover:border-[#ff334b]/60'
                  }`}
                >
                  <span className="font-extrabold">{f.sym}</span>
                  <span className="text-[9px] opacity-80 ml-1">({f.label})</span>
                </button>
              ))}

              <div className="h-3.5 w-px bg-[#2d3a54] mx-1 shrink-0" />

              {/* US / GLOBAL FUTURES BUTTONS */}
              <span className="text-[#8c8c8c] text-[9px] font-bold uppercase shrink-0 mr-1">
                CME/US:
              </span>
              {[
                { sym: '/ES', label: 'E-mini S&P' },
                { sym: '/NQ', label: 'Nasdaq 100' },
                { sym: '/RTY', label: 'Russell 2000' },
                { sym: '/CL', label: 'Crude Oil' },
                { sym: '/NG', label: 'Natural Gas' },
                { sym: '/GC', label: 'Gold' },
                { sym: '/SI', label: 'Silver' },
                { sym: '/BTC', label: 'Bitcoin' },
                { sym: '/ETH', label: 'Ether' },
                { sym: '/ZB', label: '30Y Bond' },
                { sym: '/ZN', label: '10Y Note' },
                { sym: '/6E', label: 'Euro FX' },
              ].map((f) => (
                <button
                  key={f.sym}
                  onClick={() => {
                    playKeyClick();
                    onSelectTicker(f.sym);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-all border ${
                    ticker.symbol === f.sym
                      ? 'bg-[#ffd600] text-black border-[#ffd600] font-black'
                      : 'bg-[#141b28] text-[#94a3b8] border-[#222d44] hover:text-white hover:border-[#384b6e]'
                  }`}
                >
                  <span className="font-extrabold">{f.sym}</span>
                  <span className="text-[9px] opacity-75 ml-1">({f.label})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          2. EXPIRATION STRIP & CATEGORY FILTER BAR
      ======================================================== */}
      <div className="bg-[#222] border-b border-[var(--border)] p-2 flex flex-col gap-2">
        {/* Top line: Category filters & Multi-Expiration toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          {/* Expiration Categories */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#ff9900]" />
              <span>CYCLE:</span>
            </span>

            {(['ALL', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'QUAD WITCH', 'LEAPS'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  playKeyClick();
                  setExpirationCategory(cat);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  expirationCategory === cat
                    ? cat === 'QUAD WITCH'
                      ? 'bg-[#a855f7] text-black font-extrabold shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                      : 'bg-[#ff9900] text-black font-extrabold'
                    : cat === 'QUAD WITCH'
                    ? 'bg-[#180f28] text-[#c084fc] hover:text-white border border-[#a855f7]/40'
                    : 'bg-[#0f1422] text-[#8b9bb4] hover:text-white'
                }`}
              >
                {cat === 'QUAD WITCH' && <Flame className="w-2.5 h-2.5 text-[#a855f7]" />}
                <span>{cat}</span>
              </button>
            ))}

            {onOpenQuadWitching && (
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenQuadWitching();
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#a855f7]/20 hover:bg-[#a855f7]/35 text-[#d8b4fe] border border-[#a855f7]/50 flex items-center gap-1 transition-all ml-1"
                title="Open Quadruple Witching Intelligence & Pin Risk Monitor <WITCH>"
              >
                <Flame className="w-3 h-3 text-[#a855f7] animate-pulse" />
                <span>WITCH &lt;GO&gt;</span>
              </button>
            )}

            {onOpenOptionsExpiration && (
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenOptionsExpiration();
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff9900]/20 hover:bg-[#ff9900]/35 text-[#ff9900] border border-[#ff9900]/50 flex items-center gap-1 transition-all ml-1 cursor-pointer"
                title="Show Full Options Expiration Master Calendar, Term Structure & Settlement Rules <EXP>"
              >
                <Calendar className="w-3 h-3 text-[#ff9900]" />
                <span>EXP SCHEDULE &lt;GO&gt;</span>
              </button>
            )}

            <div className="h-3.5 w-px bg-[#1e2638] mx-1" />

            {/* ALL EXPIRATIONS MULTI-CHAIN TOGGLE */}
            <button
              onClick={() => {
                playKeyClick();
                setIsAllExpirationsView(!isAllExpirationsView);
              }}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                isAllExpirationsView
                  ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                  : 'bg-[#141b2a] text-[#00d2ff] hover:bg-[#00d2ff]/20 border-[#00d2ff]/40'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>ALL EXPIRATIONS (MULTI-CHAIN)</span>
            </button>

            {isAllExpirationsView && (
              <div className="flex items-center gap-1 ml-1 text-[10px]">
                <button
                  onClick={expandAllMaturities}
                  className="px-2 py-0.5 bg-[#0e1424] hover:bg-[#1a233a] text-[#8b9bb4] hover:text-white rounded border border-[#1e2638]"
                >
                  EXPAND ALL
                </button>
                <button
                  onClick={collapseAllMaturities}
                  className="px-2 py-0.5 bg-[#0e1424] hover:bg-[#1a233a] text-[#8b9bb4] hover:text-white rounded border border-[#1e2638]"
                >
                  COLLAPSE ALL
                </button>
              </div>
            )}
          </div>

          {/* Quick Strategy Templates Dropdown */}
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  playKeyClick();
                  onApplyStrategyTemplate(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="bg-[#0e1320] border border-[#222d44] text-[#ff9900] text-xs rounded px-2 py-1 font-bold focus:outline-none focus:border-[#ff9900]"
            >
              <option value="" disabled>
                + QUICK STRATEGY TEMPLATES...
              </option>
              <option value="covered-call">Income: Covered Call (Stock + Short Call)</option>
              <option value="long-call">Single: Long Call (Bullish)</option>
              <option value="long-put">Single: Long Put (Bearish)</option>
              <option value="bull-call-spread">Debit Spread: Bull Call (+Δ)</option>
              <option value="bear-put-spread">Debit Spread: Bear Put (-Δ)</option>
              <option value="bull-put-spread">Credit Spread: Bull Put (+Θ)</option>
              <option value="bear-call-spread">Credit Spread: Bear Call (+Θ)</option>
              <option value="iron-condor">Neutral: Iron Condor (4-Leg)</option>
              <option value="long-straddle">Volatility: Long Straddle</option>
              <option value="long-strangle">Volatility: Long Strangle</option>
            </select>
          </div>
        </div>

        {/* Month Filter Selector Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 border-t border-[#3c3c3c]">
          <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[var(--accent)]" />
            <span>EXP MONTH:</span>
          </span>

          {distinctMonths.map((m) => {
            const isSelected = selectedMonth === m;
            return (
              <button
                key={m}
                onClick={() => {
                  playKeyClick();
                  setSelectedMonth(m);
                  if (m !== 'ALL') {
                    const firstInMonth = EXPIRATION_PRESETS.find(
                      (p) => p.month?.toUpperCase() === m.toUpperCase()
                    );
                    if (firstInMonth) {
                      onSelectDte(firstInMonth.days);
                    }
                  }
                }}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[var(--accent)] text-black font-extrabold shadow-sm'
                    : 'bg-[#1a1e21] text-[#8c8c8c] hover:text-white border border-[#3c3c3c]'
                }`}
              >
                {m === 'ALL' ? 'ALL MONTHS' : m}
              </button>
            );
          })}
        </div>

        {/* Bottom line: Expiration Pills with Month & Date (e.g. SEP 29, DEC 18) */}
        {!isAllExpirationsView && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-[10px] font-bold text-[#8c8c8c] uppercase tracking-wider mr-1 shrink-0">
              EXPIRY ({filteredPresets.length}):
            </span>
            {filteredPresets.map((p) => {
              const active = activeDte === p.days;
              const hasPosInExpiry = tickerOpenPositions.some((pos) =>
                pos.legs.some((l) => (l.type === 'call' || l.type === 'put') && l.dte === p.days)
              );
              return (
                <button
                  key={p.days}
                  onClick={() => {
                    playKeyClick();
                    onSelectDte(p.days);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-[0_0_8px_rgba(255,153,0,0.4)]'
                      : hasPosInExpiry
                      ? 'bg-[#1e1b14] text-[#ffb020] hover:text-white hover:bg-[#2b2518] border-[#ff9900]/70 ring-1 ring-[#ff9900]/40'
                      : 'bg-[#1e1e1e] text-[#d1d1d1] hover:text-white hover:bg-[#2b2b2b] border-[#3c3c3c]'
                  }`}
                  title={`${p.dateLabel} - ${p.category}${hasPosInExpiry ? ' ★ (Holds active open positions in this expiry)' : ''}`}
                >
                  <span className="font-extrabold">{p.dateLabel}</span>
                  <span className="text-[9px] opacity-75">({p.days}d)</span>
                  {p.isQuadWitching && (
                    <span
                      className={`px-1 py-0.2 rounded text-[7.5px] font-black tracking-wider flex items-center gap-0.5 ${
                        active
                          ? 'bg-black text-[#a855f7]'
                          : 'bg-[#a855f7] text-black shadow-[0_0_6px_rgba(168,85,247,0.5)]'
                      }`}
                      title="Quadruple Witching Expiration (Index Futures + Index Options + Stock Options + Single-Stock Futures)"
                    >
                      <Flame className="w-2 h-2 fill-current" />
                      <span>4W</span>
                    </span>
                  )}
                  {hasPosInExpiry && (
                    <span
                      className={`px-1 py-0.2 rounded text-[7.5px] font-black tracking-wider flex items-center gap-0.5 ${
                        active ? 'bg-black text-[#ff9900]' : 'bg-[#ff9900] text-black'
                      }`}
                    >
                      <Star className="w-2 h-2 fill-current" />
                      <span>POS</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          3. STRIKES FILTER, SEARCH, MONEYNESS & GREEKS CONTROLS
      ======================================================== */}
      <div className="bg-[#060a12] border-b border-[#141b28] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Left: Strike Count & Moneyness Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Strike Count Selector */}
          <div className="flex items-center gap-1 bg-[#0c101c] border border-[#1e2638] rounded p-0.5">
            <span className="text-[#64748b] text-[10px] font-bold px-1.5 uppercase">STRIKES:</span>
            {(['12', '20', '32', '48', 'all'] as const).map((cnt) => (
              <button
                key={cnt}
                onClick={() => {
                  playKeyClick();
                  setStrikeCountFilter(cnt);
                }}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
                  strikeCountFilter === cnt
                    ? 'bg-[#ff9900] text-black font-extrabold'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                {cnt === 'all' ? 'ALL STRIKES' : cnt}
              </button>
            ))}
          </div>

          {/* Moneyness Quick Filter */}
          <div className="flex items-center gap-1 bg-[#0c101c] border border-[#1e2638] rounded p-0.5">
            <span className="text-[#64748b] text-[10px] font-bold px-1.5 uppercase">MONEY:</span>
            {(
              [
                { key: 'all', label: 'ALL' },
                { key: 'atm', label: 'ATM (±5%)' },
                { key: 'near', label: 'NEAR (±10%)' },
                { key: 'otm', label: 'OTM ONLY' },
                { key: 'itm', label: 'ITM ONLY' },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  playKeyClick();
                  setMoneynessFilter(m.key);
                }}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
                  moneynessFilter === m.key
                    ? 'bg-[#00d2ff] text-black font-extrabold'
                    : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* My Positions Filter Toggle Button */}
          {tickerOpenPositions.length > 0 && (
            <button
              onClick={() => {
                playKeyClick();
                setShowPositionsOnly((prev) => !prev);
              }}
              className={`px-2.5 py-0.5 rounded font-bold uppercase transition-all flex items-center gap-1 border text-[10px] ${
                showPositionsOnly
                  ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-sm'
                  : 'bg-[#ff9900]/15 text-[#ff9900] border-[#ff9900]/40 hover:bg-[#ff9900]/25'
              }`}
              title="Show only strikes where you currently have active open positions"
            >
              <Star className={`w-3 h-3 ${showPositionsOnly ? 'fill-black' : 'fill-[#ff9900]'}`} />
              <span>MY POSITIONS ({tickerOpenPositions.length})</span>
            </button>
          )}

          {/* Strike Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-[#64748b] absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter Strike (e.g. 560)..."
              value={strikeSearchQuery}
              onChange={(e) => setStrikeSearchQuery(e.target.value)}
              className="bg-[#0c101c] border border-[#1e2638] focus:border-[#ff9900] rounded pl-6 pr-6 py-0.5 text-[10px] text-white font-mono placeholder:text-[#475569] w-36 outline-hidden"
            />
            {strikeSearchQuery && (
              <button
                onClick={() => setStrikeSearchQuery('')}
                className="absolute right-1.5 text-[#64748b] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Side Filter & Greeks Toggle */}
        <div className="flex items-center gap-2">
          {/* Side Filter */}
          <div className="flex items-center bg-[#0e1320] border border-[#222d44] rounded p-0.5 text-[10px]">
            {(['both', 'calls', 'puts'] as const).map((side) => (
              <button
                key={side}
                onClick={() => {
                  playKeyClick();
                  setSideFilter(side);
                }}
                className={`px-2 py-0.5 rounded uppercase font-bold transition-all ${
                  sideFilter === side ? 'bg-[#ff9900] text-black font-extrabold' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                {side}
              </button>
            ))}
          </div>

          {/* Greeks Toggle */}
          <button
            onClick={() => {
              playKeyClick();
              setShowGreeks(!showGreeks);
            }}
            className={`px-2 py-1 rounded border text-[11px] font-bold flex items-center gap-1 transition-all ${
              showGreeks
                ? 'bg-[#00d2ff]/20 text-[#00d2ff] border-[#00d2ff]/50'
                : 'bg-[#0e1320] text-[#8b9bb4] border-[#222d44]'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>GREEKS</span>
          </button>

          {/* Spread Column & Market Depth Toggle */}
          <button
            onClick={() => {
              playKeyClick();
              setShowSpread(!showSpread);
            }}
            className={`px-2 py-1 rounded border text-[11px] font-bold flex items-center gap-1 transition-all ${
              showSpread
                ? 'bg-[#ff9900]/20 text-[#ff9900] border-[#ff9900]/50 font-extrabold'
                : 'bg-[#0e1320] text-[#8b9bb4] border-[#222d44]'
            }`}
            title="Toggle Option Bid-Ask Spread ($ and %) and DOM columns"
          >
            <Layers className="w-3 h-3" />
            <span>SPREAD</span>
          </button>

          {/* Level 2 Market Depth (DOM) Trigger Button */}
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenMarketDepth) onOpenMarketDepth('call', currentPrice);
            }}
            className="px-2.5 py-1 rounded border text-[11px] font-black flex items-center gap-1 transition-all bg-[#00e676]/15 hover:bg-[#00e676]/25 text-[#00e676] border-[#00e676]/40 shadow-sm cursor-pointer"
            title="Open Option Bid-Ask Market Depth (DOM / Level 2 Order Book)"
          >
            <BookOpen className="w-3 h-3 text-[#00e676]" />
            <span>DEPTH (DOM)</span>
          </button>

          {/* Strategy Multi-Leg Execution & COB Market Depth Button */}
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenStrategyExecution) onOpenStrategyExecution();
            }}
            className="px-2.5 py-1 rounded border text-[11px] font-black flex items-center gap-1.5 transition-all bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border-[#ff9900]/50 shadow-sm cursor-pointer"
            title="Open Multi-Leg Strategy Order Execution & Level 2 Complex Order Book (COB) Depth"
          >
            <Zap className="w-3 h-3 text-[#ff9900]" />
            <span>STRAT COB & EXEC</span>
          </button>

          {/* Net Gamma Exposure (GEX) Trigger */}
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenNetGamma) onOpenNetGamma();
            }}
            className="px-2 py-1 rounded border text-[11px] font-bold flex items-center gap-1 transition-all bg-[#a855f7]/15 hover:bg-[#a855f7]/25 text-[#a855f7] border-[#a855f7]/40 shadow-sm"
            title="Open Market Maker Net Gamma Exposure (GEX) Engine & Zero Gamma Level"
          >
            <Zap className="w-3 h-3 text-[#a855f7]" />
            <span>NET GEX</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          4. MAIN OPTIONS MATRIX VIEWPORT
      ======================================================== */}
      <div className="flex-1 overflow-auto bg-[#07090e]">
        {/* ACTIVE PORTFOLIO POSITIONS ON CURRENT TICKER BANNER */}
        {tickerOpenPositions.length > 0 && (
          <div className="bg-[#10141f] border-b border-[#222d44] px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#ff9900]/20 border border-[#ff9900]/40 text-[#ff9900] text-[10px] font-black tracking-wide">
                <Star className="w-3 h-3 fill-[#ff9900]" />
                <span>YOUR POSITIONS ON {ticker.symbol} ({tickerOpenPositions.length}):</span>
              </div>

              {tickerOpenPositions.map((pos) => {
                const isWinner = pos.unrealizedPnL >= 0;
                return (
                  <div
                    key={pos.id}
                    className="flex items-center gap-2 bg-[#090d16] border border-[#1e2638] px-2.5 py-1 rounded text-[11px] font-mono shadow-xs hover:border-[#ff9900]/60 transition-colors"
                  >
                    <span className="text-white font-bold">{pos.strategyName}</span>
                    <span className="text-[#8b9bb4] text-[10px]">
                      {pos.legs.map((l) => `${l.action === 'buy' ? '+' : '-'}${l.contracts}x ${l.strike}${l.type === 'call' ? 'C' : l.type === 'put' ? 'P' : ''}`).join(' / ')}
                    </span>
                    <span className={`font-black text-[10px] ${isWinner ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                      {isWinner ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({isWinner ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setShowPositionsOnly((prev) => !prev);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                  showPositionsOnly
                    ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-xs'
                    : 'bg-[#182030] text-[#ffb020] border-[#ff9900]/40 hover:bg-[#ff9900]/20'
                }`}
              >
                <Star className={`w-3 h-3 ${showPositionsOnly ? 'fill-black' : 'fill-[#ffb020]'}`} />
                <span>{showPositionsOnly ? 'SHOW ALL STRIKES' : 'ISOLATE POSITION STRIKES'}</span>
              </button>

              {onOpenMonitorScreen && (
                <button
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    onOpenMonitorScreen();
                  }}
                  className="px-2.5 py-1 rounded text-[10px] font-bold border bg-[#00d2ff]/15 text-[#00d2ff] border-[#00d2ff]/40 hover:bg-[#00d2ff]/25 transition-colors flex items-center gap-1"
                >
                  <Layers className="w-3 h-3" />
                  <span>MONITOR BLOTTER &gt;</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODE A: SINGLE EXPIRATION TABLE */}
        {!isAllExpirationsView && (
          <div>
            {filteredContracts.calls.length === 0 ? (
              <div className="p-8 text-center text-[#64748b] flex flex-col items-center gap-2">
                <span>No strikes found matching current filter or search.</span>
                <button
                  onClick={() => {
                    setStrikeCountFilter('all');
                    setMoneynessFilter('all');
                    setStrikeSearchQuery('');
                  }}
                  className="px-3 py-1 bg-[#141b2a] hover:bg-[#ff9900] text-[#ff9900] hover:text-black rounded text-xs font-bold border border-[#2d3748]"
                >
                  RESET FILTERS TO ALL STRIKES
                </button>
              </div>
            ) : (
              renderOptionTable(filteredContracts, chain)
            )}
          </div>
        )}

        {/* MODE B: ALL EXPIRATIONS MULTI-CHAIN STACK */}
        {isAllExpirationsView && (
          <div className="flex flex-col divide-y divide-[#1e2638]">
            {allChains
              .filter((chainItem) => {
                const preset = EXPIRATION_PRESETS.find((p) => p.days === chainItem.dte);
                const monthMatch =
                  selectedMonth === 'ALL' ||
                  (chainItem.month || preset?.month)?.toUpperCase() === selectedMonth.toUpperCase();
                let catMatch = true;
                if (expirationCategory === 'WEEKLY') catMatch = preset?.category === 'Weekly';
                else if (expirationCategory === 'MONTHLY') catMatch = preset?.category === 'Monthly';
                else if (expirationCategory === 'QUARTERLY') catMatch = preset?.category === 'Quarterly';
                else if (expirationCategory === 'QUAD WITCH') catMatch = preset?.isQuadWitching === true || preset?.category === 'Quarterly';
                else if (expirationCategory === 'LEAPS') catMatch = preset?.category === 'LEAPS';
                return monthMatch && catMatch;
              })
              .map((chainItem) => {
              const isExpanded = !!expandedDtes[chainItem.dte];
              const cContracts = getFilteredContractsForChain(chainItem);
              const preset = EXPIRATION_PRESETS.find((p) => p.days === chainItem.dte);

              // Quick stats for this maturity
              let cCallVol = 0;
              let cPutVol = 0;
              let cCallOI = 0;
              let cPutOI = 0;
              chainItem.calls.forEach((c) => {
                cCallVol += c.volume;
                cCallOI += c.openInterest;
              });
              chainItem.puts.forEach((p) => {
                cPutVol += p.volume;
                cPutOI += p.openInterest;
              });
              const pcr = cCallVol > 0 ? (cPutVol / cCallVol).toFixed(2) : '1.0';

              return (
                <div key={chainItem.dte} className="flex flex-col">
                  {/* Expiration Section Header Strip */}
                  <div
                    onClick={() => toggleAccordion(chainItem.dte)}
                    className="bg-[#0b101c] hover:bg-[#131b2e] px-3 py-2 flex items-center justify-between border-y border-[#182338] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-[#ff9900]">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black text-xs">
                          {chainItem.formattedDate}
                        </span>
                        {(chainItem.month || preset?.month) && (
                          <span className="px-1.5 py-0.5 bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 rounded text-[9px] font-bold">
                            {chainItem.month || preset?.month}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-[#ff9900] text-black font-black rounded text-[10px]">
                          {chainItem.dte} DTE
                        </span>
                        <span className="text-[#8b9bb4] text-[10px]">
                          ({cContracts.calls.length} STRIKES LOADED)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <div>
                        <span className="text-[#8b9bb4]">ATM IV: </span>
                        <span className="text-[#00d2ff] font-bold">
                          {(chainItem.avgIV * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-3 w-px bg-[#1e2638]" />
                      <div>
                        <span className="text-[#8b9bb4]">CALL VOL: </span>
                        <span className="text-white">{cCallVol.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[#8b9bb4]">PUT VOL: </span>
                        <span className="text-white">{cPutVol.toLocaleString()}</span>
                      </div>
                      <div className="h-3 w-px bg-[#1e2638]" />
                      <div>
                        <span className="text-[#8b9bb4]">P/C: </span>
                        <span
                          className={`font-bold ${
                            Number(pcr) < 0.8
                              ? 'text-[#00e676]'
                              : Number(pcr) > 1.1
                              ? 'text-[#ff334b]'
                              : 'text-[#ffd600]'
                          }`}
                        >
                          {pcr}x
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playKeyClick();
                          onSelectDte(chainItem.dte);
                          setIsAllExpirationsView(false);
                        }}
                        className="px-2 py-0.5 bg-[#141b2a] hover:bg-[#ff9900] text-[#ff9900] hover:text-black border border-[#2d3748] rounded text-[10px] font-bold ml-2"
                      >
                        ISOLATE {'<GO>'}
                      </button>
                    </div>
                  </div>

                  {/* Render Table when expanded */}
                  {isExpanded && (
                    <div className="bg-[#05070a]">
                      {renderOptionTable(cContracts, chainItem)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          5. MODAL: ALL EXPIRATIONS & STRIKES MASTER DIRECTORY
      ======================================================== */}
      {showDirectoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 font-mono select-none">
          <div className="bg-[#070b14] border-2 border-[#ff9900] rounded-lg max-w-5xl w-full shadow-[0_0_40px_rgba(255,153,0,0.35)] overflow-hidden text-xs flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#ff9900] text-black px-4 py-2 font-black text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>
                  {ticker.symbol} // ALL EXPIRATIONS & STRIKES DIRECTORY ({allChains.length} MATURITIES)
                </span>
              </div>
              <button
                onClick={() => {
                  playKeyClick();
                  setShowDirectoryModal(false);
                }}
                className="text-black hover:bg-black/20 p-0.5 rounded font-black transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex flex-col gap-3 text-[#cbd5e1]">
              <div className="flex items-center justify-between bg-[#0c101c] p-3 rounded border border-[#1e2638]">
                <div>
                  <span className="text-[#8b9bb4] text-[10px] uppercase tracking-wider block">
                    Underlying Security
                  </span>
                  <span className="text-white font-black text-sm">
                    {ticker.symbol} ${ticker.price.toFixed(2)} ({ticker.change >= 0 ? '+' : ''}
                    {ticker.changePercent.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-[#8b9bb4]">TOTAL EXPIRATIONS: </span>
                    <strong className="text-[#ff9900]">{allChains.length}</strong>
                  </div>
                  <div>
                    <span className="text-[#8b9bb4]">TOTAL STRIKES LOADED: </span>
                    <strong className="text-[#00d2ff]">
                      {allChains.reduce((acc, c) => acc + c.calls.length, 0)} contracts
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#8b9bb4]">IV RANK: </span>
                    <strong className="text-[#00e676]">{ticker.ivRank}%</strong>
                  </div>
                </div>
              </div>

              {/* Directory Expiration Month Filter Strip */}
              <div className="flex items-center gap-1.5 bg-[#161a1d] p-2 rounded border border-[var(--border)] overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[var(--accent)]" />
                  <span>FILTER EXPIRATION MONTH:</span>
                </span>
                {distinctMonths.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      playKeyClick();
                      setSelectedMonth(m);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 ${
                      selectedMonth === m
                        ? 'bg-[var(--accent)] text-black font-extrabold shadow-sm'
                        : 'bg-[#222] text-[#8c8c8c] hover:text-white border border-[#3c3c3c]'
                    }`}
                  >
                    {m === 'ALL' ? 'ALL MONTHS' : m}
                  </button>
                ))}
              </div>

              {/* Master Expirations Table */}
              <div className="border border-[#1e2638] rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0e1424] text-[#8b9bb4] uppercase text-[10px] border-b border-[#1e2638]">
                    <tr>
                      <th className="py-2 px-3">EXPIRY DATE</th>
                      <th className="py-2 px-2">MONTH</th>
                      <th className="py-2 px-2">DTE</th>
                      <th className="py-2 px-2">CYCLE</th>
                      <th className="py-2 px-2 text-center">STRIKES</th>
                      <th className="py-2 px-3">STRIKE RANGE</th>
                      <th className="py-2 px-2 text-right">ATM IV</th>
                      <th className="py-2 px-2 text-right">STRADDLE</th>
                      <th className="py-2 px-2 text-right">EXP MOVE</th>
                      <th className="py-2 px-2 text-right">CALL OI</th>
                      <th className="py-2 px-2 text-right">PUT OI</th>
                      <th className="py-2 px-2 text-right">P/C RATIO</th>
                      <th className="py-2 px-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141b2a]">
                    {allChains
                      .filter((c) => {
                        const preset = EXPIRATION_PRESETS.find((p) => p.days === c.dte);
                        return selectedMonth === 'ALL' || (c.month || preset?.month)?.toUpperCase() === selectedMonth.toUpperCase();
                      })
                      .map((c) => {
                      const preset = EXPIRATION_PRESETS.find((p) => p.days === c.dte);
                      const minK = c.calls[0]?.strike ?? 0;
                      const maxK = c.calls[c.calls.length - 1]?.strike ?? 0;

                      // ATM straddle
                      let closestIdx = 0;
                      let minDiff = Infinity;
                      c.calls.forEach((cl, idx) => {
                        const diff = Math.abs(cl.strike - currentPrice);
                        if (diff < minDiff) {
                          minDiff = diff;
                          closestIdx = idx;
                        }
                      });
                      const callAtm = c.calls[closestIdx];
                      const putAtm = c.puts[closestIdx] || callAtm;
                      const straddle = (callAtm.last + putAtm.last).toFixed(2);
                      const movePct = (((callAtm.last + putAtm.last) / currentPrice) * 100).toFixed(1);

                      let callOi = 0;
                      let putOi = 0;
                      let callVol = 0;
                      let putVol = 0;
                      c.calls.forEach((cl) => {
                        callOi += cl.openInterest;
                        callVol += cl.volume;
                      });
                      c.puts.forEach((pt) => {
                        putOi += pt.openInterest;
                        putVol += pt.volume;
                      });
                      const pcr = callVol > 0 ? (putVol / callVol).toFixed(2) : '1.0';

                      return (
                        <tr
                          key={c.dte}
                          className={`hover:bg-[#141c2c] transition-colors ${
                            c.dte === activeDte ? 'bg-[#ff9900]/10 font-bold' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-bold text-white">{c.formattedDate}</td>
                          <td className="py-2 px-2">
                            <span className="px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 font-bold text-[9px]">
                              {preset?.month || c.month}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-[#ff9900] font-bold">{c.dte} DTE</td>
                          <td className="py-2 px-2 text-[#8b9bb4]">
                            <span className="px-1.5 py-0.2 rounded bg-black/40 text-[9px] font-bold">
                              {preset?.category ?? 'Standard'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center text-[#00d2ff] font-bold">
                            {c.calls.length}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#cbd5e1]">
                            ${minK.toFixed(1)} — ${maxK.toFixed(1)}
                          </td>
                          <td className="py-2 px-2 text-right text-[#00d2ff]">
                            {(c.avgIV * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-2 text-right text-[#ffd600] font-mono">
                            ${straddle}
                          </td>
                          <td className="py-2 px-2 text-right text-[#f43f5e] font-mono">
                            ±{movePct}%
                          </td>
                          <td className="py-2 px-2 text-right text-white">
                            {callOi.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right text-white">
                            {putOi.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-right font-bold">
                            <span
                              className={
                                Number(pcr) < 0.8
                                  ? 'text-[#00e676]'
                                  : Number(pcr) > 1.1
                                  ? 'text-[#ff334b]'
                                  : 'text-[#ffd600]'
                              }
                            >
                              {pcr}x
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => {
                                playKeyClick();
                                onSelectDte(c.dte);
                                setIsAllExpirationsView(false);
                                setShowDirectoryModal(false);
                              }}
                              className="px-2 py-0.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold rounded text-[10px] transition-all"
                            >
                              SELECT
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#0b101d] border-t border-[#1e2638] px-4 py-2 flex items-center justify-between">
              <span className="text-[#8b9bb4] text-[10px]">
                Click any expiration to load all strikes instantly in OMON.
              </span>
              <button
                onClick={() => {
                  playKeyClick();
                  setShowDirectoryModal(false);
                }}
                className="px-4 py-1.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold rounded text-xs transition-all"
              >
                CLOSE {'<ESC>'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING MULTI-LEG BUILDER QUICK ACTION BAR */}
      {builderLegs.length > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            if (data) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.strike && !parsed.legId) {
                  const matched = chain.calls.find((c) => c.strike === parsed.strike) || chain.calls[0];
                  if (matched) {
                    handleLegClick('call', 'buy', matched, chain);
                  }
                }
              } catch {}
            }
          }}
          className="sticky bottom-2 z-30 mx-auto max-w-5xl w-full bg-[#0b0f19]/95 backdrop-blur-md border border-[#ff9900]/60 rounded-xl p-2.5 px-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-pulse" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#ff9900] font-black uppercase mr-1">ACTIVE COMBO:</span>
              <span className="text-white font-bold">{builderLegs.length} {builderLegs.length === 1 ? 'Leg' : 'Legs'}</span>
              <div className="flex items-center gap-1.5 flex-wrap ml-1">
                {builderLegs.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ legId: l.id, type: l.type, strike: l.strike }));
                      setDraggedLegId(l.id);
                    }}
                    onDragEnd={() => {
                      setDraggedLegId(null);
                      setHoveredDropStrike(null);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono cursor-grab active:cursor-grabbing transition-all select-none ${
                      draggedLegId === l.id
                        ? 'opacity-40 border-dashed border-[#ff9900]'
                        : 'bg-[#182030] hover:bg-[#202b40] border-[#38bdf8]/40 hover:border-[#38bdf8]'
                    }`}
                    title="Drag and drop onto any strike row in the chain above to shift/roll strike"
                  >
                    <GripVertical className="w-3 h-3 text-[#38bdf8]" />
                    <span className={l.action === 'buy' ? 'text-[#00e676] font-bold' : 'text-[#ff5252] font-bold'}>
                      {l.action === 'buy' ? '+' : '-'}{l.contracts}x
                    </span>
                    <span className="font-extrabold text-white">${l.strike}</span>
                    <span className={l.type === 'call' ? 'text-[#00e676] font-bold' : 'text-[#ff9900] font-bold'}>
                      {l.type === 'call' ? 'C' : 'P'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8b9bb4] hidden lg:inline">
              Drag legs onto any strike row to roll
            </span>
            <button
              onClick={() => {
                playKeyClick();
                if (onOpenStrategyExecution) onOpenStrategyExecution();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#ff9900] hover:bg-[#ffaa22] text-black font-mono font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-[#ff9900]/20 transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-black" />
              <span>EXECUTE &amp; COB DEPTH</span>
            </button>
            <button
              onClick={() => onOpenValuationScreen()}
              className="px-2.5 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs transition-colors"
            >
              OVME
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
