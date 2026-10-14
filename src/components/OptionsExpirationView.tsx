import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Flame,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  Zap,
  Info,
  Check,
  Copy,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  Maximize2
} from 'lucide-react';
import { Ticker, ExpirationOptionChain, TradeLeg } from '../types/options';
import { EXPIRATION_PRESETS, ExpirationPreset } from '../services/marketData';
import { playKeyClick } from '../utils/terminalSound';

interface OptionsExpirationViewProps {
  currentTicker: Ticker;
  allTickers?: Record<string, Ticker>;
  allChains: ExpirationOptionChain[];
  activeDte: number;
  onSelectDte: (dte: number) => void;
  onNavigateScreen: (screen: any) => void;
  onOpenQuadWitching?: () => void;
  onOpenExpectedMove?: () => void;
  onOpenNetGamma?: () => void;
  onApplyStrategyTemplate?: (templateName: string) => void;
  onAddLeg?: (leg: TradeLeg) => void;
}

type ExpirationCategoryFilter = 'ALL' | '0DTE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'QUAD WITCH' | 'LEAPS';

export const OptionsExpirationView: React.FC<OptionsExpirationViewProps> = ({
  currentTicker,
  allTickers = {},
  allChains,
  activeDte,
  onSelectDte,
  onNavigateScreen,
  onOpenQuadWitching,
  onOpenExpectedMove,
  onOpenNetGamma,
  onApplyStrategyTemplate,
  onAddLeg,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<ExpirationCategoryFilter>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);
  const [hoveredDte, setHoveredDte] = useState<number | null>(null);
  const [nowET, setNowET] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      setNowET(
        now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const S = currentTicker.price;

  // Extract distinct months
  const distinctMonths = useMemo(() => {
    const months = new Set<string>();
    EXPIRATION_PRESETS.forEach((p) => {
      if (p.month) months.add(p.month.toUpperCase());
    });
    return ['ALL', ...Array.from(months)];
  }, []);

  // Compute detailed statistics for each chain/expiration
  const enrichedExpirations = useMemo(() => {
    return EXPIRATION_PRESETS.map((preset) => {
      const chain = allChains.find((c) => c.dte === preset.days) || {
        expirationDate: `2026-${preset.days}`,
        formattedDate: preset.dateLabel,
        dte: preset.days,
        avgIV: currentTicker.currentIV,
        calls: [],
        puts: [],
        isQuadWitching: preset.isQuadWitching || false,
      };

      // Find ATM strike and options
      let closestCall = chain.calls[0];
      let closestPut = chain.puts[0];
      let minDiff = Infinity;
      let totalCallOi = 0;
      let totalPutOi = 0;
      let totalCallVol = 0;
      let totalPutVol = 0;

      chain.calls.forEach((c) => {
        totalCallOi += c.openInterest || 0;
        totalCallVol += c.volume || 0;
        const diff = Math.abs(c.strike - S);
        if (diff < minDiff) {
          minDiff = diff;
          closestCall = c;
        }
      });

      chain.puts.forEach((p) => {
        totalPutOi += p.openInterest || 0;
        totalPutVol += p.volume || 0;
        const diff = Math.abs(p.strike - S);
        if (diff === minDiff) {
          closestPut = p;
        }
      });

      const atmStrike = closestCall?.strike ?? S;
      const atmIv = chain.avgIV || currentTicker.currentIV;
      const dteT = Math.max(0.001, preset.days / 365);
      const expectedMoveDollar = S * atmIv * Math.sqrt(dteT);
      const expectedMovePct = (expectedMoveDollar / S) * 100;

      const callPrice = closestCall ? (closestCall.bid + closestCall.ask) / 2 || closestCall.last : expectedMoveDollar * 0.4;
      const putPrice = closestPut ? (closestPut.bid + closestPut.ask) / 2 || closestPut.last : expectedMoveDollar * 0.4;
      const straddleCost = callPrice + putPrice;

      const pcrOi = totalCallOi > 0 ? totalPutOi / totalCallOi : 1.0;
      const pcrVol = totalCallVol > 0 ? totalPutVol / totalCallVol : 1.0;

      // Calculate approximate Max Pain strike
      let maxPainStrike = atmStrike;
      if (chain.calls.length > 0) {
        let minTotalLoss = Infinity;
        const testStrikes = chain.calls.slice(0, 25).map((c) => c.strike);
        testStrikes.forEach((k) => {
          let totalLoss = 0;
          chain.calls.forEach((c) => {
            if (k > c.strike) totalLoss += (k - c.strike) * c.openInterest * 100;
          });
          chain.puts.forEach((p) => {
            if (k < p.strike) totalLoss += (p.strike - k) * p.openInterest * 100;
          });
          if (totalLoss < minTotalLoss) {
            minTotalLoss = totalLoss;
            maxPainStrike = k;
          }
        });
      }

      const isCurrentActive = preset.days === activeDte;

      // Settlement specification
      const isIndex = currentTicker.assetType === 'index';
      const isThirdFridayMonthly = preset.category === 'Monthly';
      const settlement = isIndex && isThirdFridayMonthly ? 'AM Cash Settled (SOQ)' : 'PM Settled (4:00 PM ET)';

      return {
        preset,
        chain,
        dte: preset.days,
        dateLabel: preset.dateLabel,
        fullLabel: preset.label,
        category: preset.category,
        month: preset.month,
        isQuadWitching: preset.isQuadWitching || false,
        isCurrentActive,
        atmStrike,
        atmIv,
        expectedMoveDollar,
        expectedMovePct,
        rangeLow: Math.max(0, S - expectedMoveDollar),
        rangeHigh: S + expectedMoveDollar,
        straddleCost,
        totalCallOi,
        totalPutOi,
        totalOi: totalCallOi + totalPutOi,
        totalCallVol,
        totalPutVol,
        totalVol: totalCallVol + totalPutVol,
        pcrOi,
        pcrVol,
        maxPainStrike,
        settlement,
        strikesCount: chain.calls.length,
      };
    });
  }, [EXPIRATION_PRESETS, allChains, S, currentTicker, activeDte]);

  // Filtered expirations
  const filteredExpirations = useMemo(() => {
    return enrichedExpirations.filter((exp) => {
      // Category filter
      let catMatch = true;
      if (categoryFilter === '0DTE') catMatch = exp.dte <= 3;
      else if (categoryFilter === 'WEEKLY') catMatch = exp.category === 'Weekly';
      else if (categoryFilter === 'MONTHLY') catMatch = exp.category === 'Monthly';
      else if (categoryFilter === 'QUARTERLY') catMatch = exp.category === 'Quarterly';
      else if (categoryFilter === 'QUAD WITCH') catMatch = exp.isQuadWitching === true || exp.category === 'Quarterly';
      else if (categoryFilter === 'LEAPS') catMatch = exp.category === 'LEAPS';

      // Month filter
      let monthMatch = true;
      if (selectedMonth !== 'ALL') {
        monthMatch = exp.month.toUpperCase() === selectedMonth.toUpperCase();
      }

      // Query filter
      let queryMatch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        queryMatch =
          exp.dateLabel.toLowerCase().includes(q) ||
          exp.fullLabel.toLowerCase().includes(q) ||
          exp.category.toLowerCase().includes(q) ||
          `${exp.dte}d`.includes(q) ||
          `${exp.dte}` === q;
      }

      return catMatch && monthMatch && queryMatch;
    });
  }, [enrichedExpirations, categoryFilter, selectedMonth, searchQuery]);

  // Overall statistics
  const summaryStats = useMemo(() => {
    const totalExps = enrichedExpirations.length;
    const quadWitchCount = enrichedExpirations.filter((e) => e.isQuadWitching).length;
    const frontMonth = enrichedExpirations[0];
    const backMonth = enrichedExpirations[enrichedExpirations.length - 1];
    const slope = frontMonth && backMonth ? ((backMonth.atmIv - frontMonth.atmIv) * 100).toFixed(1) : '0.0';
    const isContango = Number(slope) >= 0;

    return {
      totalExps,
      quadWitchCount,
      frontMonth,
      backMonth,
      slope,
      isContango,
    };
  }, [enrichedExpirations]);

  const handleCopySchedule = () => {
    playKeyClick();
    const rows = filteredExpirations.map(
      (e) =>
        `${e.dateLabel}\t${e.dte} DTE\t${e.category}\tIV: ${(e.atmIv * 100).toFixed(1)}%\tMove: ±$${e.expectedMoveDollar.toFixed(2)} (±${e.expectedMovePct.toFixed(1)}%)\tATM Straddle: $${e.straddleCost.toFixed(2)}\tMax Pain: $${e.maxPainStrike}\tP/C: ${e.pcrOi.toFixed(2)}`
    );
    const header = `EXPIRATION\tDTE\tCYCLE\tATM IV\tEXP MOVE\tSTRADDLE\tMAX PAIN\tPCR\n`;
    navigator.clipboard.writeText(header + rows.join('\n'));
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090e] text-[#d1d5db] overflow-y-auto no-scrollbar font-mono text-xs select-none p-3 sm:p-5">
      {/* ========================================================
          1. TOP COMMAND DECK & SUMMARY HEADER
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-xl p-4 mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#1a2336]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#ff9900]/15 border border-[#ff9900]/30 text-[#ff9900]">
              <Calendar className="w-5 h-5 text-[#ff9900]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base sm:text-lg tracking-wide flex items-center gap-1.5">
                  <span className="text-[#ff9900]">{currentTicker.symbol}</span> OPTIONS EXPIRATION MASTER CALENDAR
                </span>
                <span className="text-[10px] bg-[#1e293b] text-[#38bdf8] px-2 py-0.5 rounded font-black border border-[#334155]">
                  OPEX ENGINE
                </span>
                <span className="text-[10px] bg-[#a855f7]/20 text-[#c084fc] px-2 py-0.5 rounded font-black border border-[#a855f7]/40">
                  {summaryStats.totalExps} CYCLES LOADED
                </span>
              </div>
              <div className="text-[11px] text-[#8b9bb4] flex items-center gap-2 mt-0.5">
                <span>Spot: <strong className="text-white">${currentTicker.price.toFixed(2)}</strong></span>
                <span className="text-[#64748b]">|</span>
                <span>Change: <strong className={currentTicker.change >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>{currentTicker.change >= 0 ? '+' : ''}{currentTicker.change.toFixed(2)} ({currentTicker.changePercent.toFixed(2)}%)</strong></span>
                <span className="text-[#64748b]">|</span>
                <span>IV Rank: <strong className="text-[#ff9900]">{currentTicker.ivRank}%</strong></span>
                <span className="text-[#64748b]">|</span>
                <span>Term Structure: <strong className={summaryStats.isContango ? 'text-[#00e676]' : 'text-[#ff9900]'}>{summaryStats.isContango ? 'CONTANGO (+ ' : 'BACKWARDATION (- '}{Math.abs(Number(summaryStats.slope))}% pts)</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playKeyClick();
                onNavigateScreen('omon');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff9900] hover:bg-[#ffa726] text-black rounded font-black text-xs shadow-[0_0_12px_rgba(255,153,0,0.4)] transition-all cursor-pointer"
              title="Open Option Chain Monitor (OMON)"
            >
              <Layers className="w-3.5 h-3.5 text-black" />
              <span>LOAD IN CHAIN (OMON)</span>
            </button>

            {onOpenQuadWitching && (
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenQuadWitching();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a855f7]/20 hover:bg-[#a855f7]/35 text-[#c084fc] border border-[#a855f7]/60 rounded font-black text-xs transition-all cursor-pointer"
                title="Launch Quadruple Witching Intelligence & Pin Risk Terminal"
              >
                <Flame className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>QUAD WITCH (4W)</span>
              </button>
            )}

            {onOpenExpectedMove && (
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenExpectedMove();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d2ff]/15 hover:bg-[#00d2ff]/25 text-[#00d2ff] border border-[#00d2ff]/40 rounded font-bold text-xs transition-all cursor-pointer"
                title="Open Expected Price Move Matrix"
              >
                <Activity className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span>EXP MOVE</span>
              </button>
            )}

            <button
              onClick={handleCopySchedule}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141b2a] hover:bg-[#1e293b] text-[#cbd5e1] border border-[#222f46] rounded font-bold text-xs transition-all cursor-pointer"
              title="Copy entire expiration schedule to clipboard"
            >
              {copiedStatus ? <Check className="w-3.5 h-3.5 text-[#00e676]" /> : <Copy className="w-3.5 h-3.5 text-[#ff9900]" />}
              <span>{copiedStatus ? 'COPIED' : 'EXPORT'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Expiration Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
          <div className="bg-[#070a12] border border-[#1e2638] p-2.5 rounded-lg">
            <span className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider block">Active Expiration</span>
            <div className="text-sm font-black text-[#ff9900] flex items-center gap-1 mt-0.5">
              <span>{enrichedExpirations.find((e) => e.isCurrentActive)?.dateLabel || '16 OCT 26'}</span>
              <span className="text-[10px] text-[#cbd5e1]">({activeDte}d)</span>
            </div>
            <span className="text-[9px] text-[#64748b]">Selected in Chain</span>
          </div>

          <div className="bg-[#070a12] border border-[#1e2638] p-2.5 rounded-lg">
            <span className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider block">Front-Month Expected Move</span>
            <div className="text-sm font-black text-[#00e676] mt-0.5">
              ±${enrichedExpirations[0]?.expectedMoveDollar.toFixed(2)}
              <span className="text-[10px] text-[#38bdf8] ml-1">(±{enrichedExpirations[0]?.expectedMovePct.toFixed(1)}%)</span>
            </div>
            <span className="text-[9px] text-[#64748b]">1-Sigma Implied Range</span>
          </div>

          <div className="bg-[#070a12] border border-[#1e2638] p-2.5 rounded-lg">
            <span className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider block">ATM Straddle Mark</span>
            <div className="text-sm font-black text-[#ffd600] mt-0.5">
              ${enrichedExpirations.find((e) => e.isCurrentActive)?.straddleCost.toFixed(2) || '14.50'}
            </div>
            <span className="text-[9px] text-[#64748b]">Call ATM + Put ATM</span>
          </div>

          <div className="bg-[#070a12] border border-[#1e2638] p-2.5 rounded-lg">
            <span className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider block">Max Pain Gravity Strike</span>
            <div className="text-sm font-black text-[#c084fc] mt-0.5">
              ${enrichedExpirations.find((e) => e.isCurrentActive)?.maxPainStrike.toFixed(2) || currentTicker.price.toFixed(2)}
            </div>
            <span className="text-[9px] text-[#64748b]">Dealer Gamma Minimum</span>
          </div>

          <div className="bg-[#070a12] border border-[#1e2638] p-2.5 rounded-lg">
            <span className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider block">Next Quad Witch Cycle</span>
            <div className="text-sm font-black text-[#a855f7] flex items-center gap-1 mt-0.5">
              <Flame className="w-3 h-3 text-[#a855f7]" />
              <span>18 DEC '26 (80d)</span>
            </div>
            <span className="text-[9px] text-[#64748b]">Q4 Global Derivatives Expiry</span>
          </div>

          <div className="bg-[#070a12] border border-[#1e2638] p-2.5 rounded-lg">
            <span className="text-[9.5px] text-[#8b9bb4] uppercase tracking-wider block">Clock (New York Time)</span>
            <div className="text-sm font-black text-white font-mono mt-0.5">
              {nowET || '16:00:00'} ET
            </div>
            <span className="text-[9px] text-[#00e676]">Market Open / Live</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. FILTER STRIP: CYCLE CATEGORIES & MONTHS
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-xl p-3 mb-4 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Cycle Category Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-[#ff9900]" />
              <span>CYCLE:</span>
            </span>

            {(['ALL', '0DTE', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'QUAD WITCH', 'LEAPS'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  playKeyClick();
                  setCategoryFilter(cat);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                  categoryFilter === cat
                    ? cat === 'QUAD WITCH'
                      ? 'bg-[#a855f7] text-black shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                      : 'bg-[#ff9900] text-black shadow-sm'
                    : cat === 'QUAD WITCH'
                    ? 'bg-[#180f28] text-[#c084fc] hover:text-white border border-[#a855f7]/40'
                    : 'bg-[#141b2a] text-[#8b9bb4] hover:text-white hover:bg-[#1e293b]'
                }`}
              >
                {cat === 'QUAD WITCH' && <Flame className="w-2.5 h-2.5 text-current" />}
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {/* Search Input Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#8b9bb4] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter date or DTE (e.g. 17d, DEC, 80)..."
              className="bg-[#070a12] border border-[#222d44] focus:border-[#ff9900] rounded-md pl-8 pr-3 py-1 text-xs text-white placeholder-[#4b5563] w-full focus:outline-none"
            />
          </div>
        </div>

        {/* Month Pills Strip */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-[#1a2336]">
          <span className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#38bdf8]" />
            <span>EXP MONTH:</span>
          </span>
          {distinctMonths.map((m) => (
            <button
              key={m}
              onClick={() => {
                playKeyClick();
                setSelectedMonth(m);
              }}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedMonth === m
                  ? 'bg-[#38bdf8] text-black font-extrabold shadow-sm'
                  : 'bg-[#101524] text-[#8b9bb4] hover:text-white hover:bg-[#1a2336] border border-[#1e2638]'
              }`}
            >
              {m}
            </button>
          ))}
          <span className="text-[10px] text-[#64748b] ml-auto shrink-0 hidden md:inline">
            Showing {filteredExpirations.length} of {enrichedExpirations.length} maturities
          </span>
        </div>
      </div>

      {/* ========================================================
          3. MASTER EXPIRATIONS SCHEDULE & METRICS TABLE
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.6)] mb-4 flex flex-col">
        <div className="bg-[#0e1424] px-4 py-2.5 border-b border-[#1e2638] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#ff9900]" />
            <span className="font-black text-white uppercase tracking-wider">
              {currentTicker.symbol} EXPIRATIONS SCHEDULE & VOLATILITY MATRIX
            </span>
          </div>
          <span className="text-[10px] text-[#8b9bb4]">
            Click any row or button to load expiration into the Option Chain (OMON)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-[#080c16] text-[#8b9bb4] uppercase text-[9.5px] border-b border-[#1e2638] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">EXPIRATION DATE</th>
                <th className="py-2.5 px-2">TENOR (DTE)</th>
                <th className="py-2.5 px-2">CYCLE CLASS</th>
                <th className="py-2.5 px-2 text-right">ATM IV</th>
                <th className="py-2.5 px-3 text-right">EXPECTED MOVE (±1σ)</th>
                <th className="py-2.5 px-3 text-center">IMPLIED PRICE RANGE</th>
                <th className="py-2.5 px-2 text-right">ATM STRADDLE</th>
                <th className="py-2.5 px-2 text-right">MAX PAIN</th>
                <th className="py-2.5 px-2 text-right">P/C RATIO</th>
                <th className="py-2.5 px-2 text-center">SETTLEMENT</th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141b2a]">
              {filteredExpirations.map((exp) => {
                const isHovered = hoveredDte === exp.dte;
                const isSelected = exp.isCurrentActive;

                return (
                  <tr
                    key={exp.dte}
                    onMouseEnter={() => setHoveredDte(exp.dte)}
                    onMouseLeave={() => setHoveredDte(null)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#ff9900]/15 border-l-4 border-l-[#ff9900]'
                        : isHovered
                        ? 'bg-[#121927]'
                        : 'hover:bg-[#0e1320]'
                    }`}
                    onClick={() => {
                      playKeyClick();
                      onSelectDte(exp.dte);
                    }}
                  >
                    {/* Date and Month */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {exp.isQuadWitching ? (
                          <Flame className="w-3.5 h-3.5 text-[#a855f7] shrink-0 animate-pulse" />
                        ) : (
                          <Calendar className="w-3.5 h-3.5 text-[#8b9bb4] shrink-0" />
                        )}
                        <div>
                          <span className={`font-black text-xs ${isSelected ? 'text-[#ff9900]' : 'text-white'}`}>
                            {exp.dateLabel}
                          </span>
                          <span className="text-[10px] text-[#64748b] block">{exp.preset.monthYear}</span>
                        </div>
                      </div>
                    </td>

                    {/* DTE with badge */}
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            exp.dte <= 3
                              ? 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                              : exp.dte <= 30
                              ? 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40'
                              : 'bg-[#1e293b] text-[#cbd5e1]'
                          }`}
                        >
                          {exp.dte}d
                        </span>
                        {isSelected && (
                          <span className="text-[8.5px] bg-[#ff9900] text-black font-black px-1.5 py-0.2 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cycle classification */}
                    <td className="py-3 px-2">
                      {exp.isQuadWitching ? (
                        <span className="px-2 py-0.5 rounded bg-[#a855f7]/25 text-[#d8b4fe] border border-[#a855f7]/60 font-black text-[9.5px] flex items-center gap-1 w-max">
                          <Flame className="w-2.5 h-2.5 text-[#a855f7]" />
                          <span>QUAD WITCH</span>
                        </span>
                      ) : exp.category === 'Monthly' ? (
                        <span className="px-2 py-0.5 rounded bg-[#00d2ff]/15 text-[#00d2ff] border border-[#00d2ff]/40 font-bold text-[9.5px]">
                          MONTHLY [STD]
                        </span>
                      ) : exp.category === 'Quarterly' ? (
                        <span className="px-2 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/40 font-bold text-[9.5px]">
                          QUARTERLY
                        </span>
                      ) : exp.category === 'LEAPS' ? (
                        <span className="px-2 py-0.5 rounded bg-[#3b82f6]/20 text-[#93c5fd] border border-[#3b82f6]/40 font-bold text-[9.5px]">
                          LEAPS (LONG)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] font-bold text-[9.5px]">
                          WEEKLY
                        </span>
                      )}
                    </td>

                    {/* ATM IV */}
                    <td className="py-3 px-2 text-right">
                      <div className="font-bold text-[#ff9900] text-xs">
                        {(exp.atmIv * 100).toFixed(1)}%
                      </div>
                      <div className="w-16 h-1 bg-[#1e2638] rounded-full overflow-hidden ml-auto mt-1">
                        <div
                          className="h-full bg-[#ff9900] rounded-full"
                          style={{ width: `${Math.min(100, exp.atmIv * 200)}%` }}
                        />
                      </div>
                    </td>

                    {/* Expected Move */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-black text-[#00e676] text-xs">
                        ±${exp.expectedMoveDollar.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[#38bdf8] font-bold">
                        (±{exp.expectedMovePct.toFixed(1)}%)
                      </div>
                    </td>

                    {/* Implied Price Range */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-[#070a12] px-2.5 py-1 rounded border border-[#1e2638] text-[10px]">
                        <span className="text-[#ff334b] font-bold">${exp.rangeLow.toFixed(2)}</span>
                        <span className="text-[#64748b]">↔</span>
                        <span className="text-[#00e676] font-bold">${exp.rangeHigh.toFixed(2)}</span>
                      </div>
                    </td>

                    {/* ATM Straddle */}
                    <td className="py-3 px-2 text-right">
                      <span className="font-bold text-[#ffd600] text-xs">${exp.straddleCost.toFixed(2)}</span>
                    </td>

                    {/* Max Pain Strike */}
                    <td className="py-3 px-2 text-right">
                      <span className="font-black text-[#c084fc] text-xs">${exp.maxPainStrike.toFixed(2)}</span>
                    </td>

                    {/* Put/Call Ratio */}
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`font-bold text-xs ${
                          exp.pcrOi < 0.8
                            ? 'text-[#00e676]'
                            : exp.pcrOi > 1.2
                            ? 'text-[#ff334b]'
                            : 'text-[#ffd600]'
                        }`}
                      >
                        {exp.pcrOi.toFixed(2)}x
                      </span>
                    </td>

                    {/* Settlement */}
                    <td className="py-3 px-2 text-center text-[10px] text-[#8b9bb4]">
                      <span className="px-1.5 py-0.5 rounded bg-[#0b101c] border border-[#1e2638]">
                        {exp.settlement}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            playKeyClick();
                            onSelectDte(exp.dte);
                            onNavigateScreen('omon');
                          }}
                          className="px-2.5 py-1 rounded bg-[#ff9900]/20 hover:bg-[#ff9900] text-[#ff9900] hover:text-black border border-[#ff9900]/50 font-black text-[10px] transition-all cursor-pointer flex items-center gap-1"
                          title={`Open ${exp.dateLabel} Option Chain`}
                        >
                          <span>CHAIN</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>

                        <button
                          onClick={() => {
                            playKeyClick();
                            onSelectDte(exp.dte);
                            onNavigateScreen('ovme');
                          }}
                          className="px-2 py-1 rounded bg-[#141b2a] hover:bg-[#1e293b] text-[#38bdf8] border border-[#222f46] font-bold text-[10px] transition-all cursor-pointer"
                          title={`Evaluate Greeks for ${exp.dateLabel}`}
                        >
                          OVME
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          4. TERM STRUCTURE & SKEW VISUAL CURVE
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-xl p-4 mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1a2336]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#00d2ff]" />
            <span className="font-black text-white uppercase tracking-wider text-xs">
              VOLATILITY TERM STRUCTURE CURVE (IV vs EXPIRATION MATURITY)
            </span>
          </div>
          <span className="text-[10px] text-[#8b9bb4]">
            Curve Regime: <strong className={summaryStats.isContango ? 'text-[#00e676]' : 'text-[#ff9900]'}>{summaryStats.isContango ? 'CONTANGO' : 'BACKWARDATION'}</strong>
          </span>
        </div>

        {/* SVG Term Structure Graph */}
        <div className="relative w-full h-44 bg-[#070a12] rounded-lg border border-[#1e2638] p-3 flex flex-col justify-between">
          <svg className="w-full h-32 overflow-visible">
            {/* Grid Lines */}
            {[0.1, 0.2, 0.3, 0.4].map((iv, idx) => {
              const y = 120 - (iv / 0.5) * 110;
              return (
                <g key={idx}>
                  <line x1="0" y1={y} x2="100%" y2={y} stroke="#1a2336" strokeDasharray="3 3" />
                  <text x="4" y={y - 2} fill="#64748b" fontSize="8" fontFamily="monospace">
                    {(iv * 100).toFixed(0)}% IV
                  </text>
                </g>
              );
            })}

            {/* Polyline Path */}
            {enrichedExpirations.length > 1 && (() => {
              const points = enrichedExpirations.map((exp, idx) => {
                const x = `${(idx / (enrichedExpirations.length - 1)) * 96 + 2}%`;
                const y = Math.max(10, Math.min(120, 120 - (exp.atmIv / 0.5) * 110));
                return { x, y, exp, idx };
              });

              const pathD = points.reduce((acc, pt, idx) => {
                return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.idx * (100 / (points.length - 1))}% ${pt.y}`;
              }, '');

              return (
                <>
                  <path
                    d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * 1000} ${p.y}`).join(' ')}
                    fill="none"
                    stroke="#ff9900"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {points.map((pt, i) => (
                    <g key={i}>
                      <circle
                        cx={`${(i / (points.length - 1)) * 98 + 1}%`}
                        cy={pt.y}
                        r={pt.exp.isCurrentActive ? 5 : pt.exp.isQuadWitching ? 4 : 3}
                        fill={pt.exp.isCurrentActive ? '#ff9900' : pt.exp.isQuadWitching ? '#a855f7' : '#00d2ff'}
                        stroke="#000"
                        strokeWidth="1.5"
                        className="cursor-pointer hover:r-6 transition-all"
                        onClick={() => {
                          playKeyClick();
                          onSelectDte(pt.exp.dte);
                        }}
                      />
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>

          {/* X Axis Labels */}
          <div className="flex justify-between text-[9px] text-[#8b9bb4] pt-1 border-t border-[#1a2336]">
            {enrichedExpirations
              .filter((_, i) => i === 0 || i === 4 || i === 8 || i === 12 || i === enrichedExpirations.length - 1)
              .map((e) => (
                <span key={e.dte} className={e.isCurrentActive ? 'text-[#ff9900] font-bold' : ''}>
                  {e.dateLabel} ({e.dte}d)
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          5. OCC / CBOE SETTLEMENT & INSTITUTIONAL RULES GUIDE
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[#1a2336]">
          <ShieldAlert className="w-4 h-4 text-[#ff9900]" />
          <span className="font-black text-white uppercase tracking-wider text-xs">
            INSTITUTIONAL OPTIONS EXPIRATION & SETTLEMENT SPECIFICATIONS (OCC & CBOE)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-[#cbd5e1]">
          <div className="bg-[#070a12] p-3 rounded-lg border border-[#1e2638]">
            <strong className="text-[#ff9900] block mb-1">Standard Exercise & Cut-Off Rules</strong>
            <p className="text-[#8b9bb4] text-[10px] leading-relaxed">
              Options stop trading at 4:00 PM ET on expiration day. Option holders have until 5:30 PM ET to submit exercise instructions or "Do Not Exercise" (DNE) notices. The OCC automatically exercises contracts that are at least $0.01 in the money based on the 4:00 PM closing price.
            </p>
          </div>

          <div className="bg-[#070a12] p-3 rounded-lg border border-[#1e2638]">
            <strong className="text-[#a855f7] block mb-1">Quadruple Witching & Pin Risk</strong>
            <p className="text-[#8b9bb4] text-[10px] leading-relaxed">
              Occurs the 3rd Friday of March, June, September, and December when Index Futures, Index Options, Stock Options, and Single-Stock Futures expire concurrently. Market makers engage in heavy gamma hedging, causing prices to "pin" close to strikes with massive open interest.
            </p>
          </div>

          <div className="bg-[#070a12] p-3 rounded-lg border border-[#1e2638]">
            <strong className="text-[#00d2ff] block mb-1">AM vs PM Settlement Differences</strong>
            <p className="text-[#8b9bb4] text-[10px] leading-relaxed">
              Standard equity options (e.g. SPY, AAPL) are PM-settled with physical stock delivery. Broad index options (e.g. SPX monthly 3rd Friday) are AM cash-settled using the Special Opening Quotation (SOQ), ceasing trading on Thursday afternoon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
