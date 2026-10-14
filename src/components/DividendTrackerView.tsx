import React, { useState, useMemo } from 'react';
import { Position, Ticker } from '../types/options';
import {
  calculatePortfolioDividends,
  simulateDripGrowth,
  MARKET_DIVIDEND_STOCKS,
  DividendStock,
  PortfolioDividendHolding,
} from '../services/dividendData';
import { playKeyClick } from '../utils/terminalSound';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Percent,
  Award,
  Clock,
  ArrowUpRight,
  BarChart2,
  Calculator,
  RefreshCw,
  Sliders,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Zap,
} from 'lucide-react';

interface DividendTrackerViewProps {
  portfolioPositions: Position[];
  tickers?: Record<string, Ticker>;
  accountCashBalance?: number;
  onSelectTicker?: (symbol: string) => void;
  onNavigateToRisk?: () => void;
  onNavigateToOptions?: () => void;
  onOpenStockTrade?: (symbol?: string) => void;
}

export function DividendTrackerView({
  portfolioPositions,
  tickers = {},
  accountCashBalance = 100000,
  onSelectTicker,
  onNavigateToRisk,
  onNavigateToOptions,
  onOpenStockTrade,
}: DividendTrackerViewProps) {
  // Main sub-navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'holdings' | 'cashflow' | 'drip' | 'screener' | 'options_risk'>('holdings');

  // Screener filter states
  const [screenerCategory, setScreenerCategory] = useState<'ALL' | 'ARISTOCRATS' | 'HIGH_YIELD' | 'TECH' | 'CANADIAN' | 'REIT'>('ALL');
  const [screenerSort, setScreenerSort] = useState<'yield' | 'growth' | 'safety' | 'div'>('yield');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // DRIP Simulator interactive parameters
  const [dripInitialInvestment, setDripInitialInvestment] = useState<number>(50000);
  const [dripInitialYield, setDripInitialYield] = useState<number>(3.5);
  const [dripDivGrowth, setDripDivGrowth] = useState<number>(6.5);
  const [dripPriceGrowth, setDripPriceGrowth] = useState<number>(7.0);
  const [dripHorizonYears, setDripHorizonYears] = useState<number>(20);

  // Compute portfolio dividend metrics
  const dividendSummary = useMemo(() => {
    return calculatePortfolioDividends(portfolioPositions, tickers);
  }, [portfolioPositions, tickers]);

  // Compute DRIP simulation series
  const dripSimulationData = useMemo(() => {
    return simulateDripGrowth({
      initialInvestment: dripInitialInvestment,
      initialYield: dripInitialYield / 100,
      dividendGrowthRate: dripDivGrowth / 100,
      priceAppreciationRate: dripPriceGrowth / 100,
      years: dripHorizonYears,
    });
  }, [dripInitialInvestment, dripInitialYield, dripDivGrowth, dripPriceGrowth, dripHorizonYears]);

  // Filtered screener stocks
  const filteredStocks = useMemo(() => {
    return MARKET_DIVIDEND_STOCKS.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (screenerCategory === 'ARISTOCRATS') return s.consecutiveGrowthYears >= 25;
      if (screenerCategory === 'HIGH_YIELD') return s.dividendYield >= 0.035;
      if (screenerCategory === 'TECH') return s.sector.includes('Technology') || s.sector.includes('Software') || s.sector.includes('Semiconductor');
      if (screenerCategory === 'CANADIAN') return s.taxClassification === 'Canadian Eligible';
      if (screenerCategory === 'REIT') return s.taxClassification === 'REIT' || s.sector.includes('Real Estate');
      return true;
    }).sort((a, b) => {
      if (screenerSort === 'yield') return b.dividendYield - a.dividendYield;
      if (screenerSort === 'growth') return b.dividendGrowth5YrCAGR - a.dividendGrowth5YrCAGR;
      if (screenerSort === 'safety') return a.safetyScore.localeCompare(b.safetyScore);
      if (screenerSort === 'div') return b.annualDividend - a.annualDividend;
      return 0;
    });
  }, [screenerCategory, screenerSort, searchQuery]);

  // Max monthly projection for bar chart scaling
  const maxMonthlyPayout = useMemo(() => {
    const maxVal = Math.max(...dividendSummary.monthlyCashFlows.map((m) => m.projectedAmount), 1);
    return maxVal;
  }, [dividendSummary.monthlyCashFlows]);

  return (
    <div className="flex-1 flex flex-col gap-3 w-full max-w-full ml-0 mr-auto text-left text-[#e2e8f0] pb-10">
      {/* 1. TOP HEADER & TELEMETRY HUD */}
      <div className="bg-[#0b0e14] border border-[#1e293b] rounded-md p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#10b981]/15 border border-[#10b981]/30 rounded-lg text-[#10b981]">
            <DollarSign className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/30 uppercase">
                BLOOMBERG DVD &lt;GO&gt;
              </span>
              <span className="text-xs text-[#64748b] font-mono">PORTFOLIO INCOME &amp; CASH FLOW RADAR</span>
            </div>
            <h1 className="text-lg font-black text-white tracking-wide flex items-center gap-2 mt-0.5">
              DIVIDEND TRACKER &amp; REINVESTMENT ENGINE
            </h1>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenStockTrade) onOpenStockTrade('SPY');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-[#052e16] font-bold rounded shadow transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            BUY DIVIDEND EQUITY
          </button>
          {onNavigateToRisk && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToRisk();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white rounded border border-[#334155] transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5 text-[#38bdf8]" />
              RISK PROFILE BLOTTER
            </button>
          )}
        </div>
      </div>

      {/* 2. CORE FINANCIAL AGGREGATE STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Card 1: Projected Annual Income */}
        <div className="bg-[#0f172a]/90 border border-[#1e293b] rounded-md p-3 relative overflow-hidden group hover:border-[#10b981]/50 transition-all">
          <div className="text-[10px] uppercase font-bold text-[#94a3b8] flex items-center justify-between">
            <span>ANNUAL DIV INCOME</span>
            <DollarSign className="w-3.5 h-3.5 text-[#10b981]" />
          </div>
          <div className="text-xl font-black text-[#10b981] font-mono mt-1">
            ${dividendSummary.annualProjectedIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1 flex items-center gap-1">
            <span>Monthly:</span>
            <span className="text-[#cbd5e1] font-mono font-bold">
              ${(dividendSummary.annualProjectedIncome / 12).toFixed(2)}/mo
            </span>
          </div>
        </div>

        {/* Card 2: Portfolio Dividend Yield */}
        <div className="bg-[#0f172a]/90 border border-[#1e293b] rounded-md p-3 relative overflow-hidden group hover:border-[#38bdf8]/50 transition-all">
          <div className="text-[10px] uppercase font-bold text-[#94a3b8] flex items-center justify-between">
            <span>PORTFOLIO YIELD</span>
            <Percent className="w-3.5 h-3.5 text-[#38bdf8]" />
          </div>
          <div className="text-xl font-black text-[#38bdf8] font-mono mt-1">
            {dividendSummary.portfolioDividendYield.toFixed(2)}%
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1 flex items-center gap-1">
            <span>S&amp;P 500 benchmark:</span>
            <span className="text-[#94a3b8] font-mono">1.25%</span>
          </div>
        </div>

        {/* Card 3: Yield on Cost (YoC) */}
        <div className="bg-[#0f172a]/90 border border-[#1e293b] rounded-md p-3 relative overflow-hidden group hover:border-[#a855f7]/50 transition-all">
          <div className="text-[10px] uppercase font-bold text-[#94a3b8] flex items-center justify-between">
            <span>YIELD ON COST (YoC)</span>
            <Award className="w-3.5 h-3.5 text-[#a855f7]" />
          </div>
          <div className="text-xl font-black text-[#c084fc] font-mono mt-1">
            {dividendSummary.portfolioYieldOnCost.toFixed(2)}%
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1 flex items-center gap-1">
            <span>Cost Basis:</span>
            <span className="text-[#cbd5e1] font-mono">
              ${dividendSummary.totalCostBasis.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Card 4: Next 30 Days Payouts */}
        <div className="bg-[#0f172a]/90 border border-[#1e293b] rounded-md p-3 relative overflow-hidden group hover:border-[#f59e0b]/50 transition-all">
          <div className="text-[10px] uppercase font-bold text-[#94a3b8] flex items-center justify-between">
            <span>NEXT 30-DAY PAYOUT</span>
            <Clock className="w-3.5 h-3.5 text-[#f59e0b]" />
          </div>
          <div className="text-xl font-black text-[#fbbf24] font-mono mt-1">
            ${dividendSummary.upcomingPayoutsNext30Days.toFixed(2)}
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1">
            <span>Cash in transit pending ex-dates</span>
          </div>
        </div>

        {/* Card 5: Options Early Assignment Risk */}
        <div className={`bg-[#0f172a]/90 border rounded-md p-3 relative overflow-hidden transition-all ${
          dividendSummary.earlyAssignmentRiskCount > 0
            ? 'border-[#ef4444] bg-[#ef4444]/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            : 'border-[#1e293b]'
        }`}>
          <div className="text-[10px] uppercase font-bold text-[#94a3b8] flex items-center justify-between">
            <span>CALL ASSIGNMENT RISK</span>
            {dividendSummary.earlyAssignmentRiskCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444] animate-bounce" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
            )}
          </div>
          <div className={`text-xl font-black font-mono mt-1 ${dividendSummary.earlyAssignmentRiskCount > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
            {dividendSummary.earlyAssignmentRiskCount > 0 ? `${dividendSummary.earlyAssignmentRiskCount} CALLS AT RISK` : 'ZERO RISK'}
          </div>
          <div className="text-[9.5px] text-[#94a3b8] mt-1">
            {dividendSummary.earlyAssignmentRiskCount > 0 ? 'Extrinsic < Div on ex-date' : 'Short calls protected'}
          </div>
        </div>

        {/* Card 6: Short Dividend Liability */}
        <div className={`bg-[#0f172a]/90 border rounded-md p-3 relative overflow-hidden transition-all ${
          dividendSummary.shortDividendLiabilityTotal > 0
            ? 'border-[#f97316] bg-[#f97316]/10'
            : 'border-[#1e293b]'
        }`}>
          <div className="text-[10px] uppercase font-bold text-[#94a3b8] flex items-center justify-between">
            <span>SHORT DIV LIABILITY</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#f97316]" />
          </div>
          <div className={`text-xl font-black font-mono mt-1 ${dividendSummary.shortDividendLiabilityTotal > 0 ? 'text-[#f97316]' : 'text-[#94a3b8]'}`}>
            ${dividendSummary.shortDividendLiabilityTotal.toFixed(2)}
          </div>
          <div className="text-[9.5px] text-[#64748b] mt-1">
            {dividendSummary.shortDividendLiabilityTotal > 0 ? 'Owed to stock lender' : 'No short stock liabilities'}
          </div>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION TABS BAR */}
      <div className="bg-[#0b0e14] border border-[#1e293b] rounded-md p-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            onClick={() => {
              playKeyClick();
              setActiveSubTab('holdings');
            }}
            className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'holdings'
                ? 'bg-[#10b981] text-[#052e16] shadow'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            PORTFOLIO HOLDINGS &amp; YIELDS ({dividendSummary.holdings.length})
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveSubTab('cashflow');
            }}
            className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'cashflow'
                ? 'bg-[#10b981] text-[#052e16] shadow'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            12-MONTH CASH FLOW WATERFALL
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveSubTab('drip');
            }}
            className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'drip'
                ? 'bg-[#10b981] text-[#052e16] shadow'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            20-YEAR DRIP COMPOUNDING SIMULATOR
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveSubTab('screener');
            }}
            className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'screener'
                ? 'bg-[#10b981] text-[#052e16] shadow'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            DIVIDEND ARISTOCRATS &amp; UNIVERSE
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setActiveSubTab('options_risk');
            }}
            className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'options_risk'
                ? 'bg-[#ef4444] text-white shadow'
                : 'text-[#f87171] hover:text-white hover:bg-[#1e293b]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            OPTIONS EX-DIVIDEND ARBITRAGE
          </button>
        </div>

        <div className="text-[11px] font-mono text-[#64748b] px-2 flex items-center gap-2">
          <span>PORTFOLIO EQUITY VALUE:</span>
          <span className="text-white font-bold">${dividendSummary.totalStockPortfolioValue.toLocaleString()}</span>
        </div>
      </div>

      {/* 4. TAB 1: PORTFOLIO HOLDINGS BLOTTER */}
      {activeSubTab === 'holdings' && (
        <div className="bg-[#0b0e14] border border-[#1e293b] rounded-md overflow-hidden">
          <div className="p-3 bg-[#0f172a] border-b border-[#1e293b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>PORTFOLIO DIVIDEND INCOME BLOTTER</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-mono font-bold">
                  {dividendSummary.holdings.length} ASSETS
                </span>
              </h2>
              <p className="text-[11px] text-[#64748b]">
                Real-time income distributions, dividend yield on cost, countdown to ex-dividend date, and call assignment protection.
              </p>
            </div>
            {dividendSummary.holdings.length === 0 && (
              <button
                onClick={() => {
                  playKeyClick();
                  if (onOpenStockTrade) onOpenStockTrade('SPY');
                }}
                className="px-3 py-1 bg-[#10b981] hover:bg-[#059669] text-[#052e16] text-xs font-bold rounded"
              >
                + ADD EQUITIES TO PORTFOLIO
              </button>
            )}
          </div>

          {dividendSummary.holdings.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <DollarSign className="w-12 h-12 text-[#334155] mb-3" />
              <h3 className="text-sm font-bold text-[#94a3b8]">No Stock Positions Found In Active Portfolio</h3>
              <p className="text-xs text-[#64748b] max-w-md mt-1 mb-4">
                You currently hold options or cash positions. Add dividend-paying equities (such as SPY, NVDA, AAPL, MSFT, or SCHD) to track cash flow distributions, yield on cost, and ex-dividend alerts.
              </p>
              <button
                onClick={() => {
                  playKeyClick();
                  if (onOpenStockTrade) onOpenStockTrade('NVDA');
                }}
                className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-[#052e16] text-xs font-bold rounded shadow"
              >
                Buy NVDA / SPY Shares
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0f172a] text-[#94a3b8] uppercase font-bold text-[10px] tracking-wider border-b border-[#1e293b]">
                    <th className="py-2.5 px-3">TICKER / SECURITY</th>
                    <th className="py-2.5 px-3">POSITION</th>
                    <th className="py-2.5 px-3 text-right">COST BASIS</th>
                    <th className="py-2.5 px-3 text-right">CURRENT PRICE</th>
                    <th className="py-2.5 px-3 text-right">ANNUAL DIV / SH</th>
                    <th className="py-2.5 px-3 text-right">PROJECTED INCOME</th>
                    <th className="py-2.5 px-3 text-right">CURRENT YIELD</th>
                    <th className="py-2.5 px-3 text-right">YIELD ON COST</th>
                    <th className="py-2.5 px-3 text-center">EX-DIVIDEND DATE</th>
                    <th className="py-2.5 px-3 text-center">PAYABLE DATE</th>
                    <th className="py-2.5 px-3 text-center">TAX QUAL</th>
                    <th className="py-2.5 px-3 text-center">CALL RISK</th>
                    <th className="py-2.5 px-3 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {dividendSummary.holdings.map((h) => {
                    return (
                      <tr key={h.positionId} className="hover:bg-[#1a2333] transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                playKeyClick();
                                if (onSelectTicker) onSelectTicker(h.ticker);
                              }}
                              className="font-bold text-white font-mono hover:text-[#10b981] transition-colors"
                            >
                              {h.ticker}
                            </button>
                            <span className="text-[10px] text-[#64748b] truncate max-w-[120px]">{h.name}</span>
                          </div>
                        </td>

                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            h.isShort ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30' : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30'
                          }`}>
                            {h.isShort ? '-' : '+'}{h.shares} Shs
                          </span>
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-[#94a3b8]">
                          ${h.costBasisPerShare.toFixed(2)}
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-white font-bold">
                          ${h.currentPrice.toFixed(2)}
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-[#cbd5e1]">
                          ${h.annualDividendPerShare.toFixed(2)}
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span className={h.annualProjectedIncome >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                            {h.annualProjectedIncome >= 0 ? '+' : '-'}${Math.abs(h.annualProjectedIncome).toFixed(2)}/yr
                          </span>
                          <div className="text-[9.5px] text-[#64748b]">
                            (${Math.abs(h.quarterlyPayout * h.shares).toFixed(2)}/qtr)
                          </div>
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-[#38bdf8] font-bold">
                          {h.currentYield.toFixed(2)}%
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-[#c084fc] font-bold" title={`Yield on Cost = Annual Dividend ($${h.annualDividendPerShare}) ÷ Cost Basis ($${h.costBasisPerShare.toFixed(2)})`}>
                          {h.yieldOnCost.toFixed(2)}%
                        </td>

                        <td className="py-2 px-3 text-center font-mono">
                          <div className="font-bold text-white text-[11px]">{h.exDividendDate}</div>
                          <span className={`text-[9.5px] px-1 py-0.2 rounded font-bold ${
                            h.daysUntilExDate <= 7 && h.daysUntilExDate >= 0
                              ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                              : h.daysUntilExDate <= 30 && h.daysUntilExDate > 7
                              ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                              : 'text-[#64748b]'
                          }`}>
                            {h.daysUntilExDate >= 0 ? `In ${h.daysUntilExDate}d` : 'Passed'}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-center font-mono text-[11px] text-[#cbd5e1]">
                          {h.payableDate}
                        </td>

                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-[#1e293b] text-[#94a3b8] font-mono border border-[#334155]">
                            {h.qualification}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-center">
                          {h.hasOptionsCallAssignmentRisk ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-[#ef4444]/20 text-[#ef4444] font-bold border border-[#ef4444]/40 flex items-center justify-center gap-1" title={h.assignmentRiskDetails}>
                              <AlertTriangle className="w-3 h-3" />
                              RISK
                            </span>
                          ) : (
                            <span className="text-[#10b981] font-mono text-[10px] flex items-center justify-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              SAFE
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                playKeyClick();
                                if (onOpenStockTrade) onOpenStockTrade(h.ticker);
                              }}
                              className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-white rounded text-[10px] font-bold"
                              title="Trade additional shares"
                            >
                              TRADE
                            </button>
                            {onNavigateToOptions && (
                              <button
                                onClick={() => {
                                  playKeyClick();
                                  if (onSelectTicker) onSelectTicker(h.ticker);
                                  onNavigateToOptions();
                                }}
                                className="px-2 py-1 bg-[#0284c7]/20 hover:bg-[#0284c7]/30 text-[#38bdf8] border border-[#0284c7]/40 rounded text-[10px] font-bold"
                                title="Write Covered Call against these shares"
                              >
                                C-CALL
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: 12-MONTH CASH FLOW WATERFALL */}
      {activeSubTab === 'cashflow' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Monthly Waterfall Bar Chart */}
          <div className="lg:col-span-2 bg-[#0b0e14] border border-[#1e293b] rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#10b981]" />
                  2026 MONTHLY DIVIDEND DISTRIBUTION WATERFALL
                </h3>
                <p className="text-[11px] text-[#64748b]">
                  Projected monthly recurring cash flow credited to brokerage account from active stock holdings.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#94a3b8]">ANNUAL RUN-RATE:</span>
                <div className="text-sm font-black text-[#10b981] font-mono">
                  ${dividendSummary.annualProjectedIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Visual Bar Graph */}
            <div className="grid grid-cols-12 gap-1.5 h-48 items-end pt-4 pb-2 border-b border-[#1e293b]">
              {dividendSummary.monthlyCashFlows.map((m) => {
                const heightPct = maxMonthlyPayout > 0 ? (m.projectedAmount / maxMonthlyPayout) * 100 : 0;
                const isCurrentMonth = m.month === 'Oct';
                return (
                  <div key={m.month} className="flex flex-col items-center h-full justify-end group relative">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-[#0f172a] text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg border border-[#334155] whitespace-nowrap">
                        ${m.projectedAmount.toFixed(2)} ({m.payers.length} payers)
                      </div>
                    </div>

                    <span className="text-[9px] font-mono text-[#94a3b8] mb-1">
                      ${m.projectedAmount > 0 ? m.projectedAmount.toFixed(0) : '0'}
                    </span>

                    <div
                      style={{ height: `${Math.max(6, heightPct)}%` }}
                      className={`w-full rounded-t transition-all ${
                        m.projectedAmount > 0
                          ? isCurrentMonth
                            ? 'bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                            : 'bg-[#3b82f6] group-hover:bg-[#60a5fa]'
                          : 'bg-[#1e293b]'
                      }`}
                    />
                    <span className={`text-[10px] font-bold mt-1.5 ${isCurrentMonth ? 'text-[#10b981]' : 'text-[#64748b]'}`}>
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quarterly Totals Breakdown */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-2">
              {[
                { q: 'Q1 (Jan-Mar)', sum: dividendSummary.monthlyCashFlows.slice(0, 3).reduce((a, b) => a + b.projectedAmount, 0) },
                { q: 'Q2 (Apr-Jun)', sum: dividendSummary.monthlyCashFlows.slice(3, 6).reduce((a, b) => a + b.projectedAmount, 0) },
                { q: 'Q3 (Jul-Sep)', sum: dividendSummary.monthlyCashFlows.slice(6, 9).reduce((a, b) => a + b.projectedAmount, 0) },
                { q: 'Q4 (Oct-Dec)', sum: dividendSummary.monthlyCashFlows.slice(9, 12).reduce((a, b) => a + b.projectedAmount, 0) },
              ].map((quarter) => (
                <div key={quarter.q} className="bg-[#0f172a] p-2 rounded border border-[#1e293b] text-center">
                  <span className="text-[10px] text-[#64748b] block">{quarter.q}</span>
                  <span className="text-xs font-bold font-mono text-[#cbd5e1] mt-0.5 block">
                    ${quarter.sum.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Payer Ledger Sidebar */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-md p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-[#38bdf8]" />
                UPCOMING DISTRIBUTION CALENDAR
              </h3>
              <p className="text-[11px] text-[#64748b] mb-3">
                Expected payment dates for active holdings over the next 12 months.
              </p>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {dividendSummary.holdings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748b]">
                    No equity positions currently generate cash flows.
                  </div>
                ) : (
                  dividendSummary.holdings.map((h) => (
                    <div key={h.positionId} className="bg-[#0f172a] p-2.5 rounded border border-[#1e293b] flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-mono">{h.ticker}</span>
                          <span className="text-[10px] text-[#64748b]">({h.shares} shares)</span>
                        </div>
                        <div className="text-[10px] text-[#94a3b8] mt-0.5">
                          Ex-Date: <span className="text-white font-mono">{h.exDividendDate}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#10b981] font-mono">
                          +${(h.quarterlyPayout * h.shares).toFixed(2)}
                        </span>
                        <div className="text-[9.5px] text-[#64748b]">
                          Pay: {h.payableDate}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#1e293b]/50 p-2.5 rounded border border-[#334155]/40 mt-3 text-[11px] text-[#94a3b8]">
              <span className="text-[#10b981] font-bold block mb-0.5">Automated Cash Sweep:</span>
              Dividends settle into available cash on the payable date and instantly augment options Buying Power.
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 3: 20-YEAR DRIP COMPOUNDING SIMULATOR */}
      {activeSubTab === 'drip' && (
        <div className="flex flex-col gap-3">
          {/* Controls Bar */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-md p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1e293b]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#10b981]" />
                  20-YEAR DRIP (DIVIDEND REINVESTMENT PLAN) COMPOUNDING ENGINE
                </h3>
                <p className="text-[11px] text-[#64748b]">
                  Mathematically compare taking dividends as cash vs. automatically reinvesting payouts to accumulate exponential share compounding.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playKeyClick();
                    setDripInitialInvestment(50000);
                    setDripInitialYield(3.5);
                    setDripDivGrowth(6.5);
                    setDripPriceGrowth(7.0);
                    setDripHorizonYears(20);
                  }}
                  className="px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] text-xs text-[#cbd5e1] rounded flex items-center gap-1 border border-[#334155]"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Parameter Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Parameter 1: Initial Capital */}
              <div className="bg-[#0f172a] p-3 rounded border border-[#1e293b]">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#94a3b8]">Starting Capital:</span>
                  <span className="font-mono font-bold text-white">${dripInitialInvestment.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="500000"
                  step="5000"
                  value={dripInitialInvestment}
                  onChange={(e) => setDripInitialInvestment(Number(e.target.value))}
                  className="w-full accent-[#10b981] cursor-pointer"
                />
              </div>

              {/* Parameter 2: Initial Dividend Yield */}
              <div className="bg-[#0f172a] p-3 rounded border border-[#1e293b]">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#94a3b8]">Starting Yield:</span>
                  <span className="font-mono font-bold text-[#38bdf8]">{dripInitialYield.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="12.0"
                  step="0.1"
                  value={dripInitialYield}
                  onChange={(e) => setDripInitialYield(Number(e.target.value))}
                  className="w-full accent-[#38bdf8] cursor-pointer"
                />
              </div>

              {/* Parameter 3: Dividend Growth Rate (CAGR) */}
              <div className="bg-[#0f172a] p-3 rounded border border-[#1e293b]">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#94a3b8]">Div Growth (CAGR):</span>
                  <span className="font-mono font-bold text-[#c084fc]">{dripDivGrowth.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="15.0"
                  step="0.5"
                  value={dripDivGrowth}
                  onChange={(e) => setDripDivGrowth(Number(e.target.value))}
                  className="w-full accent-[#c084fc] cursor-pointer"
                />
              </div>

              {/* Parameter 4: Capital Appreciation */}
              <div className="bg-[#0f172a] p-3 rounded border border-[#1e293b]">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#94a3b8]">Price Appreciation:</span>
                  <span className="font-mono font-bold text-[#f59e0b]">{dripPriceGrowth.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="15.0"
                  step="0.5"
                  value={dripPriceGrowth}
                  onChange={(e) => setDripPriceGrowth(Number(e.target.value))}
                  className="w-full accent-[#f59e0b] cursor-pointer"
                />
              </div>

              {/* Parameter 5: Horizon */}
              <div className="bg-[#0f172a] p-3 rounded border border-[#1e293b]">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#94a3b8]">Horizon:</span>
                  <span className="font-mono font-bold text-[#10b981]">{dripHorizonYears} Years</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={dripHorizonYears}
                  onChange={(e) => setDripHorizonYears(Number(e.target.value))}
                  className="w-full accent-[#10b981] cursor-pointer"
                />
              </div>
            </div>

            {/* High-level Outcome Comparison Cards */}
            {dripSimulationData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#1e293b]">
                {/* Non-DRIP Result */}
                <div className="bg-[#0f172a] p-3 rounded border border-[#334155] text-center">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-bold">WITHOUT DRIP (CASH WITHDRAWN)</span>
                  <div className="text-xl font-mono font-black text-[#94a3b8] mt-1">
                    ${dripSimulationData[dripSimulationData.length - 1].withoutDripValue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#64748b]">
                    Annual Income: ${dripSimulationData[dripSimulationData.length - 1].withoutDripAnnualIncome.toLocaleString()}/yr
                  </span>
                </div>

                {/* DRIP Compounding Result */}
                <div className="bg-[#10b981]/10 p-3 rounded border border-[#10b981]/40 text-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <span className="text-[10px] text-[#10b981] uppercase font-bold">WITH DRIP (DIVIDENDS REINVESTED)</span>
                  <div className="text-xl font-mono font-black text-[#10b981] mt-1">
                    ${dripSimulationData[dripSimulationData.length - 1].withDripValue.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#10b981]">
                    Annual Income: ${dripSimulationData[dripSimulationData.length - 1].withDripAnnualIncome.toLocaleString()}/yr
                  </span>
                </div>

                {/* Delta / Value Created */}
                <div className="bg-[#0f172a] p-3 rounded border border-[#3b82f6]/40 text-center">
                  <span className="text-[10px] text-[#38bdf8] uppercase font-bold">DRIP SURPLUS WEALTH CREATED</span>
                  <div className="text-xl font-mono font-black text-[#38bdf8] mt-1">
                    +${(
                      dripSimulationData[dripSimulationData.length - 1].withDripValue -
                      dripSimulationData[dripSimulationData.length - 1].withoutDripValue
                    ).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#94a3b8]">
                    +{(
                      ((dripSimulationData[dripSimulationData.length - 1].withDripValue -
                        dripSimulationData[dripSimulationData.length - 1].withoutDripValue) /
                        dripSimulationData[dripSimulationData.length - 1].withoutDripValue) *
                      100
                    ).toFixed(1)}% Compounding Advantage
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Year-by-Year Simulation Table */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-md overflow-hidden">
            <div className="p-3 bg-[#0f172a] border-b border-[#1e293b]">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                YEAR-BY-YEAR COMPOUNDING LEDGER &amp; ACCELERATION TABLE
              </h4>
            </div>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-[#0f172a] text-[#94a3b8] uppercase font-bold text-[10px] tracking-wider border-b border-[#1e293b]">
                  <tr>
                    <th className="py-2 px-3">YEAR</th>
                    <th className="py-2 px-3 text-right">NO-DRIP VALUE</th>
                    <th className="py-2 px-3 text-right">NO-DRIP INCOME</th>
                    <th className="py-2 px-3 text-right">WITH-DRIP SHARES</th>
                    <th className="py-2 px-3 text-right">WITH-DRIP VALUE</th>
                    <th className="py-2 px-3 text-right">WITH-DRIP INCOME</th>
                    <th className="py-2 px-3 text-right">CUMULATIVE REINVESTED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b] font-mono">
                  {dripSimulationData.map((row) => (
                    <tr key={row.year} className="hover:bg-[#1a2333] transition-colors">
                      <td className="py-1.5 px-3 font-bold text-white">Year {row.year}</td>
                      <td className="py-1.5 px-3 text-right text-[#94a3b8]">${row.withoutDripValue.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right text-[#64748b]">${row.withoutDripAnnualIncome.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right text-[#cbd5e1]">{row.withDripShares.toFixed(1)}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-[#10b981]">${row.withDripValue.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-[#38bdf8]">${row.withDripAnnualIncome.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right text-[#c084fc]">${row.cumulativeDividendsReinvested.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 4: MARKET DIVIDEND UNIVERSE & ARISTOCRATS SCREENER */}
      {activeSubTab === 'screener' && (
        <div className="bg-[#0b0e14] border border-[#1e293b] rounded-md overflow-hidden">
          {/* Header & Filter Bar */}
          <div className="p-3 bg-[#0f172a] border-b border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#ffd600]" />
                S&amp;P 500 DIVIDEND ARISTOCRATS, KINGS &amp; INCOME BENCHMARKS
              </h3>
              <p className="text-[11px] text-[#64748b]">
                Vetted dividend growth leaders with pristine balance sheets, free cash flow coverage, and covered call yield boosters.
              </p>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  { id: 'ALL', label: 'ALL UNIVERSE' },
                  { id: 'ARISTOCRATS', label: '25+ YR ARISTOCRATS' },
                  { id: 'HIGH_YIELD', label: 'HIGH YIELD (>3.5%)' },
                  { id: 'TECH', label: 'TECH CASH FLOW' },
                  { id: 'CANADIAN', label: 'CANADIAN CHAMPIONS' },
                  { id: 'REIT', label: 'REITs' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playKeyClick();
                    setScreenerCategory(cat.id);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    screenerCategory === cat.id
                      ? 'bg-[#10b981] text-[#052e16]'
                      : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Sort Bar */}
          <div className="px-3 py-2 bg-[#090d16] border-b border-[#1e293b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search symbol, company name, or sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0f172a] border border-[#334155] rounded px-2.5 py-1 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#10b981] w-full sm:w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-[#94a3b8] hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
              <span>SORT BY:</span>
              <button
                onClick={() => setScreenerSort('yield')}
                className={`px-2 py-0.5 rounded ${screenerSort === 'yield' ? 'bg-[#334155] text-white font-bold' : 'hover:text-white'}`}
              >
                Yield %
              </button>
              <button
                onClick={() => setScreenerSort('growth')}
                className={`px-2 py-0.5 rounded ${screenerSort === 'growth' ? 'bg-[#334155] text-white font-bold' : 'hover:text-white'}`}
              >
                5-Yr Growth
              </button>
              <button
                onClick={() => setScreenerSort('safety')}
                className={`px-2 py-0.5 rounded ${screenerSort === 'safety' ? 'bg-[#334155] text-white font-bold' : 'hover:text-white'}`}
              >
                Safety Score
              </button>
            </div>
          </div>

          {/* Universe Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a] text-[#94a3b8] uppercase font-bold text-[10px] tracking-wider border-b border-[#1e293b]">
                  <th className="py-2.5 px-3">TICKER / NAME</th>
                  <th className="py-2.5 px-3 text-right">SHARE PRICE</th>
                  <th className="py-2.5 px-3 text-right">ANNUAL DIVIDEND</th>
                  <th className="py-2.5 px-3 text-right">DIV YIELD</th>
                  <th className="py-2.5 px-3 text-right">COVERED CALL BOOST</th>
                  <th className="py-2.5 px-3 text-right">PAYOUT RATIO</th>
                  <th className="py-2.5 px-3 text-center">GROWTH STREAK</th>
                  <th className="py-2.5 px-3 text-right">5-YR CAGR</th>
                  <th className="py-2.5 px-3 text-center">SAFETY SCORE</th>
                  <th className="py-2.5 px-3 text-center">NEXT EX-DATE</th>
                  <th className="py-2.5 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {filteredStocks.map((stock) => {
                  const combinedYield = stock.dividendYield + (stock.coveredCallAnnualYield || 0);
                  return (
                    <tr key={stock.symbol} className="hover:bg-[#1a2333] transition-colors">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              playKeyClick();
                              if (onSelectTicker) onSelectTicker(stock.symbol);
                            }}
                            className="font-bold text-white font-mono hover:text-[#10b981] transition-colors"
                          >
                            {stock.symbol}
                          </button>
                          <span className="text-[10px] text-[#94a3b8] truncate max-w-[140px]">{stock.name}</span>
                        </div>
                        <div className="text-[9px] text-[#64748b]">{stock.sector}</div>
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-white font-bold">
                        ${stock.price.toFixed(2)}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-[#cbd5e1]">
                        ${stock.annualDividend.toFixed(2)}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-[#10b981] font-bold">
                        {(stock.dividendYield * 100).toFixed(2)}%
                      </td>

                      <td className="py-2 px-3 text-right font-mono" title={`Dividend Yield ${(stock.dividendYield * 100).toFixed(1)}% + 30-Day Covered Call Premium Yield ${((stock.coveredCallAnnualYield || 0) * 100).toFixed(1)}% = Combined Annual Cash Flow Yield ${(combinedYield * 100).toFixed(1)}%`}>
                        <div className="text-[#38bdf8] font-bold">
                          {(combinedYield * 100).toFixed(1)}% Total
                        </div>
                        <div className="text-[9px] text-[#64748b]">
                          +{( (stock.coveredCallAnnualYield || 0) * 100).toFixed(1)}% Call Prem
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-[#cbd5e1]">
                        {stock.payoutRatio.toFixed(1)}%
                      </td>

                      <td className="py-2 px-3 text-center font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          stock.consecutiveGrowthYears >= 50
                            ? 'bg-[#eab308]/20 text-[#facc15] border border-[#eab308]/40'
                            : stock.consecutiveGrowthYears >= 25
                            ? 'bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/40'
                            : 'bg-[#1e293b] text-[#94a3b8]'
                        }`}>
                          {stock.consecutiveGrowthYears} Yrs {stock.consecutiveGrowthYears >= 50 ? '👑' : stock.consecutiveGrowthYears >= 25 ? '🛡️' : ''}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-[#c084fc] font-bold">
                        +{(stock.dividendGrowth5YrCAGR * 100).toFixed(1)}%
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          stock.safetyScore.startsWith('A')
                            ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30'
                            : stock.safetyScore.startsWith('B')
                            ? 'bg-[#3b82f6]/20 text-[#60a5fa]'
                            : 'bg-[#ef4444]/20 text-[#ef4444]'
                        }`}>
                          {stock.safetyScore}
                        </span>
                        <div className="text-[8.5px] text-[#64748b] mt-0.5">{stock.safetyLabel}</div>
                      </td>

                      <td className="py-2 px-3 text-center font-mono text-[11px] text-white">
                        {stock.exDividendDate}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              playKeyClick();
                              if (onOpenStockTrade) onOpenStockTrade(stock.symbol);
                            }}
                            className="px-2 py-1 bg-[#10b981] hover:bg-[#059669] text-[#052e16] rounded text-[10px] font-bold"
                          >
                            BUY
                          </button>
                          {onNavigateToOptions && (
                            <button
                              onClick={() => {
                                playKeyClick();
                                if (onSelectTicker) onSelectTicker(stock.symbol);
                                onNavigateToOptions();
                              }}
                              className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-white rounded text-[10px] font-bold"
                              title="Trade Options Chain"
                            >
                              OPT
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 5: OPTIONS EX-DIVIDEND ARBITRAGE & ASSIGNMENT RISK ENGINE */}
      {activeSubTab === 'options_risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Card 1: Early Assignment Risk Mechanism */}
          <div className="bg-[#0b0e14] border border-[#ef4444]/40 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2 text-[#ef4444]">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                MATHEMATICAL EX-DIVIDEND EARLY EXERCISE RULE
              </h3>
            </div>
            <p className="text-xs text-[#cbd5e1] leading-relaxed mb-3">
              In options markets, call owners do not collect dividends. If an in-the-money (ITM) call option has <strong>less extrinsic value (time value)</strong> than the upcoming quarterly dividend payout, it is mathematically irrational for the call holder to hold the call through the ex-date.
            </p>

            <div className="bg-[#1e1014] border border-[#ef4444]/30 rounded p-3 text-xs mb-3 font-mono text-[#fca5a5]">
              <div className="font-bold text-white mb-1">THE ARBITRAGE FORMULA:</div>
              <div>Extrinsic Value = Call Premium - (Stock Price - Strike Price)</div>
              <div className="mt-1 font-bold text-[#ef4444]">
                If Extrinsic Value &lt; Dividend Payout ➔ ASSIGNMENT IS IMMINENT!
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#94a3b8]">
              <div className="flex items-start gap-2">
                <span className="text-[#ef4444] font-bold">1.</span>
                <span>The call buyer exercises on the afternoon <strong>before</strong> the ex-dividend date to become the shareholder of record.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ef4444] font-bold">2.</span>
                <span>If you sold that call (e.g. as a covered call or credit spread), your stock will be assigned away and you will <strong>forfeit the dividend</strong>!</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ef4444] font-bold">3.</span>
                <span>If you sold a naked call, you become short the stock and must <strong>manufacture and pay the dividend out of your own cash</strong>!</span>
              </div>
            </div>
          </div>

          {/* Card 2: Institutional Defense Protocol */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-md p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#38bdf8]">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  DEFENSIVE PLAYBOOK FOR OPTIONS TRADERS
                </h3>
              </div>
              <p className="text-xs text-[#cbd5e1] leading-relaxed mb-3">
                How institutional market makers and systematic hedge funds eliminate ex-dividend vulnerability:
              </p>

              <div className="space-y-2 text-xs">
                <div className="bg-[#0f172a] p-2.5 rounded border border-[#1e293b]">
                  <span className="font-bold text-white block">Tactic 1: Roll the Short Call Out and Up</span>
                  <span className="text-[#94a3b8]">
                    Close the ITM short call 2 days before the ex-date and roll to a higher strike or further expiration date where extrinsic value exceeds the dividend.
                  </span>
                </div>

                <div className="bg-[#0f172a] p-2.5 rounded border border-[#1e293b]">
                  <span className="font-bold text-white block">Tactic 2: Close Before 4:00 PM EST</span>
                  <span className="text-[#94a3b8]">
                    Assignment happens overnight via the Options Clearing Corporation (OCC). Buy back the short leg before market close to retain 100% of the dividend.
                  </span>
                </div>

                <div className="bg-[#0f172a] p-2.5 rounded border border-[#1e293b]">
                  <span className="font-bold text-white block">Tactic 3: Dividend Capture Conversion</span>
                  <span className="text-[#94a3b8]">
                    Long stock + Long Put + Short Call creates synthetic box arbitrage around dividend distributions when borrow rates and rebate rates align.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between">
              <span className="text-[11px] text-[#64748b]">Ready to inspect your options exposure?</span>
              {onNavigateToOptions && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onNavigateToOptions();
                  }}
                  className="px-3 py-1.5 bg-[#38bdf8] hover:bg-[#0284c7] text-[#082f49] text-xs font-bold rounded"
                >
                  Inspect Active Options Chains &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
