import React, { useState } from 'react';
import { Ticker } from '../types/options';
import {
  getAssetFundamentals,
  isTickerETF,
  ETFFundamentals,
  CompanyProfile,
} from '../services/companyAndEtfProfiles';
import { playKeyClick } from '../utils/terminalSound';
import {
  Building2,
  PieChart,
  TrendingUp,
  DollarSign,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Calendar,
  Globe,
  MapPin,
  Users,
  Target,
  BarChart3,
  Search,
} from 'lucide-react';

interface CompanyProfileViewProps {
  currentTicker: Ticker;
  allTickers: Record<string, Ticker>;
  onSelectTicker: (symbol: string) => void;
  onOpenStockTrade: () => void;
  onNavigateToChain?: () => void;
  onNavigateToRisk?: () => void;
  onNavigateToCone?: () => void;
  onNavigateToValuation?: () => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({
  currentTicker,
  allTickers,
  onSelectTicker,
  onOpenStockTrade,
  onNavigateToChain,
  onNavigateToRisk,
  onNavigateToCone,
  onNavigateToValuation,
  isModal = false,
  onCloseModal,
}) => {
  const [selectedAssetType, setSelectedAssetType] = useState<'all' | 'equity' | 'etf'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fundamentals = getAssetFundamentals(
    currentTicker.symbol,
    currentTicker.price,
    currentTicker.name
  );
  const isETF = fundamentals.assetType === 'etf';
  const etfData = isETF ? (fundamentals as ETFFundamentals) : null;
  const companyData = !isETF ? (fundamentals as CompanyProfile) : null;

  const currencyPrefix = currentTicker.currency === 'CAD' || currentTicker.symbol.endsWith('.TO') ? 'C$' : '$';
  const isUp = currentTicker.change >= 0;

  // Filter tickers for quick selection
  const tickerList = Object.values(allTickers).filter((t) => {
    const isEtfMatch = isTickerETF(t.symbol, t.name);
    if (selectedAssetType === 'etf' && !isEtfMatch) return false;
    if (selectedAssetType === 'equity' && isEtfMatch) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className={`flex flex-col bg-[#0d0f12] text-white font-mono select-none ${isModal ? 'h-[85vh] rounded border border-[#2d3339] overflow-hidden shadow-2xl' : 'h-full border border-[var(--border)] rounded overflow-y-auto'}`}>
      {/* 1. TOP HEADER & ASSET SELECTOR BAR */}
      <div className="bg-[#121519] border-b border-[#242b35] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#ff9900]/15 border border-[#ff9900]/40 text-[#ff9900]">
              {isETF ? <PieChart className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[#ff9900] font-black text-sm tracking-wider">
                  {currentTicker.symbol}
                </span>
                <span className="text-[10px] text-[#8c8c8c] font-bold">
                  {isETF ? 'ETF FUNDAMENTALS & HOLDINGS <DES>' : 'COMPANY PROFILE & VALUATION <DES>'}
                </span>
                <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded border ${
                  isETF
                    ? 'bg-[#00d2ff]/15 text-[#00d2ff] border-[#00d2ff]/40'
                    : 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40'
                }`}>
                  {isETF ? 'EXCHANGE-TRADED FUND' : 'EQUITY CORP'}
                </span>
              </div>
              <span className="text-[11px] text-[#cbd5e1] font-semibold truncate max-w-sm sm:max-w-md">
                {currentTicker.name}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-[#263140] hidden md:block" />

          {/* Real-Time Price Tag */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black font-mono text-white">
              {currencyPrefix}{currentTicker.price.toFixed(2)}
            </span>
            <span className={`text-xs font-bold font-mono flex items-center ${isUp ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{isUp ? '+' : ''}{currentTicker.change.toFixed(2)} ({isUp ? '+' : ''}{currentTicker.changePercent.toFixed(2)}%)</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Fractional Trade Action */}
          <button
            onClick={() => {
              playKeyClick();
              onOpenStockTrade();
            }}
            className="px-3 py-1.5 bg-[#00e676] hover:bg-[#43a047] text-black font-black text-xs rounded transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,230,118,0.3)] cursor-pointer active:scale-95"
            title="Open Order Ticket with Fractional Shares Trading Enabled"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>TRADE SHARES (FRACTIONAL)</span>
          </button>

          {onNavigateToChain && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToChain();
              }}
              className="tos-btn hidden sm:flex items-center gap-1 text-[10px]"
              title="Navigate to Options Chain (OMON)"
            >
              <span>CHAIN &gt;</span>
            </button>
          )}

          {onNavigateToRisk && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToRisk();
              }}
              className="tos-btn hidden md:flex items-center gap-1 text-[10px]"
              title="Open Standalone Risk Profile & Bigger Picture Payoff Engine"
            >
              <span>RISK &gt;</span>
            </button>
          )}

          {isModal && onCloseModal && (
            <button
              onClick={() => {
                playKeyClick();
                onCloseModal();
              }}
              className="text-[#8c8c8c] hover:text-white p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. SUB-HEADER TICKER SEARCH & FILTER CAROUSEL */}
      <div className="bg-[#090c10] border-b border-[#1c222b] px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-[10px] shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Type Pills */}
          <div className="flex items-center bg-[#12151b] border border-[#232d3f] rounded p-0.5">
            <button
              onClick={() => {
                playKeyClick();
                setSelectedAssetType('all');
              }}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                selectedAssetType === 'all'
                  ? 'bg-[var(--accent)] text-black font-extrabold'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              ALL ASSETS
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSelectedAssetType('equity');
              }}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                selectedAssetType === 'equity'
                  ? 'bg-[#00e676] text-black font-extrabold'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              EQUITIES / COMPANIES
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSelectedAssetType('etf');
              }}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                selectedAssetType === 'etf'
                  ? 'bg-[#00d2ff] text-black font-extrabold'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              ETFs &amp; TRUSTS
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-[#64748b] absolute left-2 top-1.5" />
            <input
              type="text"
              placeholder="Filter ticker / company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#12151b] border border-[#232d3f] text-white pl-6 pr-2 py-0.5 rounded text-[10px] w-36 sm:w-48 font-mono focus:border-[#00d2ff] focus:outline-none"
            />
          </div>
        </div>

        {/* Ticker Quick Launcher Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full sm:max-w-xl">
          {tickerList.slice(0, 10).map((t) => {
            const isThisEtf = isTickerETF(t.symbol, t.name);
            const active = t.symbol === currentTicker.symbol;
            return (
              <button
                key={t.symbol}
                onClick={() => {
                  playKeyClick();
                  onSelectTicker(t.symbol);
                }}
                className={`px-2 py-0.5 rounded text-[9.5px] font-bold border transition-all shrink-0 flex items-center gap-1 ${
                  active
                    ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-sm'
                    : 'bg-[#12151b] text-[#cbd5e1] border-[#222b3a] hover:border-[#38bdf8]/50'
                }`}
              >
                <span>{t.symbol}</span>
                <span className={`text-[8px] ${active ? 'text-black' : isThisEtf ? 'text-[#00d2ff]' : 'text-[#8c8c8c]'}`}>
                  {isThisEtf ? 'ETF' : 'STK'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* ========================================================
            CASE A: ETF FUNDAMENTALS VIEW
        ======================================================== */}
        {isETF && etfData && (
          <div className="flex flex-col gap-4">
            {/* Top Vital Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
              <div className="bg-[#12151a] border border-[#232b36] p-2.5 rounded flex flex-col justify-between">
                <span className="text-[9.5px] text-[#8c8c8c] font-bold">ASSETS UNDER MGMT (AUM)</span>
                <span className="text-base font-extrabold text-[#00e676]">{etfData.aum}</span>
                <span className="text-[8.5px] text-[#64748b]">Institutional Tier</span>
              </div>

              <div className="bg-[#12151a] border border-[#232b36] p-2.5 rounded flex flex-col justify-between">
                <span className="text-[9.5px] text-[#8c8c8c] font-bold">NET EXPENSE RATIO</span>
                <span className="text-base font-extrabold text-[#00d2ff]">
                  {(etfData.expenseRatioNet * 100).toFixed(2)}%
                </span>
                <span className="text-[8.5px] text-[#64748b]">{currencyPrefix}{((etfData.expenseRatioNet / 100) * 10000).toFixed(2)} per $10k/yr</span>
              </div>

              <div className="bg-[#12151a] border border-[#232b36] p-2.5 rounded flex flex-col justify-between">
                <span className="text-[9.5px] text-[#8c8c8c] font-bold">30-DAY SEC YIELD</span>
                <span className="text-base font-extrabold text-[#ffd600]">{etfData.sec30DayYield}</span>
                <span className="text-[8.5px] text-[#64748b]">Trailing 12M: {etfData.trailing12mYield}</span>
              </div>

              <div className="bg-[#12151a] border border-[#232b36] p-2.5 rounded flex flex-col justify-between">
                <span className="text-[9.5px] text-[#8c8c8c] font-bold">NAV &amp; PREMIUM / DISC</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-extrabold text-white">${etfData.nav.toFixed(2)}</span>
                  <span className={`text-[10px] font-bold ${etfData.navPremiumDiscount >= 0 ? 'text-[#00e676]' : 'text-[#ff5252]'}`}>
                    {etfData.navPremiumDiscount >= 0 ? '+' : ''}{etfData.navPremiumDiscount}%
                  </span>
                </div>
                <span className="text-[8.5px] text-[#64748b]">Spread: {etfData.medianBidAskSpread}</span>
              </div>

              <div className="bg-[#12151a] border border-[#232b36] p-2.5 rounded flex flex-col justify-between">
                <span className="text-[9.5px] text-[#8c8c8c] font-bold">HOLDINGS COUNT</span>
                <span className="text-base font-extrabold text-white">{etfData.holdingsCount}</span>
                <span className="text-[8.5px] text-[#64748b]">Turnover: {etfData.turnoverRate}</span>
              </div>

              <div className="bg-[#12151a] border border-[#232b36] p-2.5 rounded flex flex-col justify-between">
                <span className="text-[9.5px] text-[#8c8c8c] font-bold">PORTFOLIO P/E &amp; P/B</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-[#ff9900]">{etfData.portfolioPe}x</span>
                  <span className="text-xs text-[#8c8c8c]">P/B: {etfData.portfolioPb}x</span>
                </div>
                <span className="text-[8.5px] text-[#64748b]">Beta: {etfData.betaVsSpy.toFixed(2)} vs SPY</span>
              </div>
            </div>

            {/* Fund Facts & Objective Box */}
            <div className="bg-[#12151a] border border-[#232b36] p-3.5 rounded flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222b38] pb-2">
                <span className="text-xs font-black text-[#00d2ff] flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>INVESTMENT OBJECTIVE &amp; BENCHMARK METHODOLOGY</span>
                </span>
                <div className="flex items-center gap-3 text-[10px] text-[#8c8c8c]">
                  <span>Issuer: <strong className="text-white">{etfData.issuer}</strong></span>
                  <span>Inception: <strong className="text-white">{etfData.inceptionDate}</strong></span>
                  <span>Benchmark: <strong className="text-[#ff9900]">{etfData.benchmarkIndex}</strong></span>
                </div>
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                {etfData.investmentObjective}
              </p>
            </div>

            {/* Two-Column: Top 10 Holdings + Sector Allocations */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Top Holdings Table (7 cols) */}
              <div className="lg:col-span-7 bg-[#12151a] border border-[#232b36] rounded p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-[#222b38] pb-2">
                  <span className="text-xs font-black text-[#00e676] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>TOP 10 BASKET HOLDINGS (WEIGHTED ALLOCATION)</span>
                  </span>
                  <span className="text-[10px] text-[#8c8c8c]">
                    Top 10 = {etfData.topHoldings.reduce((sum, h) => sum + h.weight, 0).toFixed(1)}% of Fund
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-[#222b38] text-[#8c8c8c] text-[9.5px]">
                        <th className="py-1 px-2">#</th>
                        <th className="py-1 px-2">TICKER</th>
                        <th className="py-1 px-2">COMPANY</th>
                        <th className="py-1 px-2">SECTOR</th>
                        <th className="py-1 px-2 text-right">WEIGHT</th>
                        <th className="py-1 px-2 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b222d]">
                      {etfData.topHoldings.map((h, idx) => (
                        <tr key={h.symbol} className="hover:bg-[#1a202a] transition-colors">
                          <td className="py-1.5 px-2 font-mono text-[#64748b]">{idx + 1}</td>
                          <td className="py-1.5 px-2 font-black text-[#ff9900]">
                            <button
                              onClick={() => {
                                playKeyClick();
                                onSelectTicker(h.symbol);
                              }}
                              className="hover:underline cursor-pointer flex items-center gap-1"
                              title={`Inspect ${h.symbol} Company Profile`}
                            >
                              <span>{h.symbol}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          </td>
                          <td className="py-1.5 px-2 text-white font-medium truncate max-w-[140px]">
                            {h.name}
                          </td>
                          <td className="py-1.5 px-2 text-[#8c8c8c] text-[10px]">{h.sector}</td>
                          <td className="py-1.5 px-2 text-right font-black font-mono text-[#00e676]">
                            {h.weight.toFixed(2)}%
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <button
                              onClick={() => {
                                playKeyClick();
                                onSelectTicker(h.symbol);
                                onOpenStockTrade();
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#00e676]/10 hover:bg-[#00e676]/25 text-[#00e676] text-[9px] font-bold border border-[#00e676]/30 transition-all cursor-pointer"
                              title={`Trade fractional shares of ${h.symbol}`}
                            >
                              TRADE
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sector Breakdown & Distribution (5 cols) */}
              <div className="lg:col-span-5 bg-[#12151a] border border-[#232b36] rounded p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#222b38] pb-2">
                  <span className="text-xs font-black text-[#ffd600] flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5" />
                    <span>SECTOR EXPOSURE &amp; MACRO WEIGHTS</span>
                  </span>
                  <span className="text-[10px] text-[#8c8c8c]">11 GICS Sectors</span>
                </div>

                <div className="flex flex-col gap-2">
                  {etfData.sectorAllocations.map((sec) => (
                    <div key={sec.sector} className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center text-[10.5px]">
                        <span className="text-[#cbd5e1] font-semibold">{sec.sector}</span>
                        <span className="font-mono font-extrabold text-white">{sec.weight.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1b222d] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${sec.weight}%`,
                            backgroundColor: sec.color || '#38bdf8',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Derivatives & Liquidity Tier */}
                <div className="mt-auto bg-[#0a0d12] border border-[#1e2530] p-2.5 rounded flex flex-col gap-1.5 text-[10px]">
                  <span className="font-bold text-[#38bdf8]">DERIVATIVES &amp; LIQUIDITY PROFILE</span>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Option Volume Rank:</span>
                    <strong className="text-white">{etfData.derivativesProfile.optionVolumeRank}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Avg Daily Contracts:</span>
                    <strong className="text-[#00e676]">{etfData.derivativesProfile.avgDailyOptionVolume}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Put/Call Open Interest:</span>
                    <strong className="text-[#ffd600]">{etfData.derivativesProfile.putCallRatio}x</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Fractional Trading Integration Banner */}
            <div className="bg-gradient-to-r from-[#0d1e2e] via-[#102436] to-[#0a1724] border border-[#00d2ff]/40 p-3.5 rounded flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-[#00d2ff]/20 border border-[#00d2ff] flex items-center justify-center text-[#00d2ff]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-white text-xs flex items-center gap-2">
                    <span>FRACTIONAL SHARES TRADING AVAILABLE FOR {etfData.symbol}</span>
                    <span className="text-[9px] bg-[#00e676]/20 text-[#00e676] px-1.5 py-0.2 rounded border border-[#00e676]/40 font-bold">
                      MIN $1.00 OR 0.0001 SHS
                    </span>
                  </span>
                  <span className="text-[10px] text-[#94a3b8]">
                    Invest exact dollar amounts (e.g. $50, $250, $1,000) into {etfData.symbol} with real-time decimal precision clearing and zero full-share barrier.
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenStockTrade();
                }}
                className="px-4 py-2 bg-[#00d2ff] hover:bg-[#38bdf8] text-black font-extrabold text-xs rounded transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>TRADE FRACTIONAL {etfData.symbol}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            CASE B: OPERATING COMPANY / EQUITY VIEW
        ======================================================== */}
        {!isETF && companyData && (
          <div className="flex flex-col gap-4">
            {/* Vital Company Header Strip */}
            <div className="bg-[#12151a] border border-[#232b36] p-3.5 rounded flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222b38] pb-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#cbd5e1] font-bold">
                    <Building2 className="w-4 h-4 text-[#ff9900]" />
                    <span>{companyData.name}</span>
                  </div>
                  <span className="text-[#64748b]">·</span>
                  <span className="text-[#38bdf8] text-[11px] font-semibold">{companyData.sector}</span>
                  <span className="text-[#64748b]">·</span>
                  <span className="text-[#94a3b8] text-[11px]">{companyData.industry}</span>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[#8c8c8c]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#64748b]" />
                    <span>CEO: <strong className="text-white">{companyData.ceo}</strong></span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#64748b]" />
                    <span className="truncate max-w-xs">{companyData.headquarters}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#64748b]" />
                    <a
                      href={companyData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00d2ff] hover:underline"
                    >
                      Website
                    </a>
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                {companyData.description}
              </p>
            </div>

            {/* Valuation Multiples Matrix */}
            <div className="bg-[#12151a] border border-[#232b36] p-3 rounded flex flex-col gap-2.5">
              <span className="text-xs font-black text-[#ff9900] flex items-center gap-1.5 border-b border-[#222b38] pb-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>VALUATION MULTIPLES &amp; ENTERPRISE ENTERPRISE METRICS</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[10.5px]">
                <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col">
                  <span className="text-[#8c8c8c] text-[9px]">MARKET CAP</span>
                  <span className="font-extrabold text-[#00e676] text-sm">{companyData.valuation.marketCap}</span>
                </div>
                <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col">
                  <span className="text-[#8c8c8c] text-[9px]">ENTERPRISE VAL (EV)</span>
                  <span className="font-extrabold text-white text-sm">{companyData.valuation.enterpriseValue}</span>
                </div>
                <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col">
                  <span className="text-[#8c8c8c] text-[9px]">P/E (TRAILING TTM)</span>
                  <span className="font-extrabold text-[#ffd600] text-sm">{companyData.valuation.peTrailing}x</span>
                </div>
                <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col">
                  <span className="text-[#8c8c8c] text-[9px]">FORWARD P/E</span>
                  <span className="font-extrabold text-white text-sm">{companyData.valuation.peForward}x</span>
                </div>
                <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col">
                  <span className="text-[#8c8c8c] text-[9px]">PEG RATIO</span>
                  <span className="font-extrabold text-[#00d2ff] text-sm">{companyData.valuation.pegRatio}x</span>
                </div>
                <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col">
                  <span className="text-[#8c8c8c] text-[9px]">PRICE / SALES (P/S)</span>
                  <span className="font-extrabold text-white text-sm">{companyData.valuation.priceToSales}x</span>
                </div>
                <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col">
                  <span className="text-[#8c8c8c] text-[9px]">PRICE / BOOK (P/B)</span>
                  <span className="font-extrabold text-white text-sm">{companyData.valuation.priceToBook}x</span>
                </div>
                <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col">
                  <span className="text-[#8c8c8c] text-[9px]">EV / EBITDA</span>
                  <span className="font-extrabold text-[#c084fc] text-sm">{companyData.valuation.evToEbitda}x</span>
                </div>
              </div>
            </div>

            {/* 3-Column Financial Statements Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Financial Performance (Income Statement) */}
              <div className="bg-[#12151a] border border-[#232b36] p-3 rounded flex flex-col gap-2">
                <span className="text-[11px] font-black text-[#38bdf8] border-b border-[#222b38] pb-1 flex items-center justify-between">
                  <span>INCOME STATEMENT (TTM)</span>
                  <span className="text-[9px] text-[#00e676]">{companyData.financials.revenueGrowthYoy} YoY</span>
                </span>
                <div className="flex flex-col gap-1.5 text-[10.5px]">
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Total Revenue:</span>
                    <strong className="text-white">{companyData.financials.revenueTtm}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Gross Profit / Margin:</span>
                    <strong className="text-white">{companyData.financials.grossProfit} ({companyData.financials.grossMarginPct}%)</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>EBITDA:</span>
                    <strong className="text-white">{companyData.financials.ebitda}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Operating Margin:</span>
                    <strong className="text-[#00e676]">{companyData.financials.operatingMarginPct}%</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Net Income (Profit):</span>
                    <strong className="text-[#00e676]">{companyData.financials.netIncomeTtm}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Diluted EPS / Fwd:</span>
                    <strong className="text-[#ffd600]">{companyData.financials.dilutedEpsTtm} / {companyData.financials.forwardEps}</strong>
                  </div>
                </div>
              </div>

              {/* Balance Sheet & Solvency */}
              <div className="bg-[#12151a] border border-[#232b36] p-3 rounded flex flex-col gap-2">
                <span className="text-[11px] font-black text-[#4ade80] border-b border-[#222b38] pb-1 flex items-center justify-between">
                  <span>BALANCE SHEET &amp; SOLVENCY</span>
                  <span className="text-[9px] text-[#8c8c8c]">Current: {companyData.balanceSheet.currentRatio}x</span>
                </span>
                <div className="flex flex-col gap-1.5 text-[10.5px]">
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Cash &amp; Short-Term Equiv:</span>
                    <strong className="text-[#00e676]">{companyData.balanceSheet.cashAndEquivalents}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Total Debt Outstanding:</span>
                    <strong className="text-[#ff5252]">{companyData.balanceSheet.totalDebt}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Net Debt Status:</span>
                    <strong className="text-white">{companyData.balanceSheet.netDebt}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Debt-to-Equity Ratio:</span>
                    <strong className="text-white">{companyData.balanceSheet.debtToEquityPct}%</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Quick Ratio (Acid Test):</span>
                    <strong className="text-white">{companyData.balanceSheet.quickRatio}x</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Book Value Per Share:</span>
                    <strong className="text-[#38bdf8]">{companyData.balanceSheet.bookValuePerShare}</strong>
                  </div>
                </div>
              </div>

              {/* Cash Flow & Capital Returns */}
              <div className="bg-[#12151a] border border-[#232b36] p-3 rounded flex flex-col gap-2">
                <span className="text-[11px] font-black text-[#c084fc] border-b border-[#222b38] pb-1 flex items-center justify-between">
                  <span>CASH FLOW &amp; RETURNS</span>
                  <span className="text-[9px] text-[#c084fc]">ROE: {companyData.cashFlow.returnOnEquityPct}%</span>
                </span>
                <div className="flex flex-col gap-1.5 text-[10.5px]">
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Operating Cash Flow:</span>
                    <strong className="text-white">{companyData.cashFlow.operatingCashFlow}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Free Cash Flow (FCF):</span>
                    <strong className="text-[#00e676]">{companyData.cashFlow.freeCashFlow}</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Return on Invested Cap (ROIC):</span>
                    <strong className="text-[#ffd600]">{companyData.cashFlow.returnOnInvestedCapitalPct}%</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Dividend Rate / Yield:</span>
                    <strong className="text-white">{companyData.dividends.dividendRate} ({companyData.dividends.dividendYieldPct}%)</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Payout Ratio:</span>
                    <strong className="text-white">{companyData.dividends.payoutRatioPct}%</strong>
                  </div>
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>Next Ex-Dividend Date:</span>
                    <strong className="text-[#8b9bb4]">{companyData.dividends.exDividendDate}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyst Consensus & Upcoming Earnings Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Wall Street Analyst Price Targets */}
              <div className="bg-[#12151a] border border-[#232b36] p-3 rounded flex flex-col gap-2">
                <div className="flex justify-between items-center border-b border-[#222b38] pb-1.5">
                  <span className="text-xs font-black text-[#00e676] flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>WALL STREET ANALYST CONSENSUS &amp; TARGETS</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] text-[9px] font-black border border-[#00e676]/40">
                    {companyData.analysts.ratingConsensus.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10.5px] mt-1">
                  <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col items-center">
                    <span className="text-[#8c8c8c] text-[8.5px]">LOW TARGET</span>
                    <span className="font-extrabold text-[#ff5252] text-sm">${companyData.analysts.targetLow.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col items-center">
                    <span className="text-[#8c8c8c] text-[8.5px]">AVERAGE TARGET</span>
                    <span className="font-extrabold text-[#ffd600] text-sm">${companyData.analysts.targetMean.toFixed(2)}</span>
                    <span className={`text-[8.5px] font-bold ${companyData.analysts.impliedUpsidePct >= 0 ? 'text-[#00e676]' : 'text-[#ff5252]'}`}>
                      {companyData.analysts.impliedUpsidePct >= 0 ? '+' : ''}{companyData.analysts.impliedUpsidePct}% Upside
                    </span>
                  </div>
                  <div className="bg-[#0b0e13] p-2 rounded border border-[#1f2633] flex flex-col items-center">
                    <span className="text-[#8c8c8c] text-[8.5px]">HIGH TARGET</span>
                    <span className="font-extrabold text-[#00e676] text-sm">${companyData.analysts.targetHigh.toFixed(2)}</span>
                  </div>
                </div>

                {/* Rating Distribution Meter */}
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className="text-[#8c8c8c]">Ratings:</span>
                  <span className="text-[#00e676] font-bold">{companyData.analysts.buyCount} Buy</span>
                  <span>·</span>
                  <span className="text-[#ffd600] font-bold">{companyData.analysts.holdCount} Hold</span>
                  <span>·</span>
                  <span className="text-[#ff5252] font-bold">{companyData.analysts.sellCount} Sell</span>
                  <span className="text-[#64748b] ml-auto">({companyData.analysts.totalAnalysts} Analysts)</span>
                </div>
              </div>

              {/* Next Earnings Catalyst & Short Interest */}
              <div className="bg-[#12151a] border border-[#232b36] p-3 rounded flex flex-col gap-2">
                <div className="flex justify-between items-center border-b border-[#222b38] pb-1.5">
                  <span className="text-xs font-black text-[#c084fc] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>EARNINGS CATALYST &amp; SHARE STRUCTURE</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 text-[9px] font-bold border border-purple-500/40">
                    IN {companyData.earningsCatalyst.daysToEarnings} DAYS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[#8c8c8c]">
                      <span>Next Earnings:</span>
                      <strong className="text-white">{companyData.earningsCatalyst.nextEarningsDate}</strong>
                    </div>
                    <div className="flex justify-between text-[#8c8c8c]">
                      <span>Options Implied Move:</span>
                      <strong className="text-[#00e676]">±{companyData.earningsCatalyst.impliedMovePct}%</strong>
                    </div>
                    <div className="flex justify-between text-[#8c8c8c]">
                      <span>EPS Consensus:</span>
                      <strong className="text-[#ffd600]">{companyData.earningsCatalyst.epsConsensus}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 border-l border-[#222b38] pl-2.5">
                    <div className="flex justify-between text-[#8c8c8c]">
                      <span>Public Float:</span>
                      <strong className="text-white">{companyData.sharesStatistics.publicFloat}</strong>
                    </div>
                    <div className="flex justify-between text-[#8c8c8c]">
                      <span>Short % of Float:</span>
                      <strong className="text-[#ff9900]">{companyData.sharesStatistics.shortPercentOfFloat}%</strong>
                    </div>
                    <div className="flex justify-between text-[#8c8c8c]">
                      <span>Institutional Own:</span>
                      <strong className="text-[#38bdf8]">{companyData.sharesStatistics.institutionalOwnershipPct}%</strong>
                    </div>
                  </div>
                </div>

                {/* 52-Week Range Bar */}
                <div className="mt-1 flex flex-col gap-0.5 text-[9.5px]">
                  <div className="flex justify-between text-[#8c8c8c]">
                    <span>52-Week Range: {companyData.sharesStatistics.week52Range}</span>
                    <span className="text-white">Beta: {companyData.sharesStatistics.beta}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fractional Shares Trading Feature Banner */}
            <div className="bg-gradient-to-r from-[#0f2316] via-[#122e1d] to-[#0d1e15] border border-[#00e676]/40 p-3.5 rounded flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-[#00e676]/20 border border-[#00e676] flex items-center justify-center text-[#00e676]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-white text-xs flex items-center gap-2">
                    <span>FRACTIONAL SHARES TRADING AVAILABLE FOR {companyData.symbol}</span>
                    <span className="text-[9px] bg-[#00e676]/20 text-[#00e676] px-1.5 py-0.2 rounded border border-[#00e676]/40 font-bold">
                      MIN $1.00 OR 0.0001 SHS
                    </span>
                  </span>
                  <span className="text-[10px] text-[#94a3b8]">
                    Buy or sell any fractional amount of {companyData.symbol} (e.g. 0.25 shares, $50.00, $100.00, or $500.00) with real-time institutional clearing and continuous dividend accrual.
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenStockTrade();
                }}
                className="px-4 py-2 bg-[#00e676] hover:bg-[#4ade80] text-black font-extrabold text-xs rounded transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>TRADE FRACTIONAL {companyData.symbol}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
