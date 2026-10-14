import React, { useState, useMemo } from 'react';
import { Ticker } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  Info,
  Calendar,
  Zap,
  Activity,
  Calculator,
  Percent,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  X,
  Maximize2
} from 'lucide-react';

interface TSXFuturesHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickers: Record<string, Ticker>;
  selectedSymbol: string;
  onSelectTicker: (symbol: string) => void;
  onOpenStockTrade?: (ticker?: Ticker) => void;
  onOpenOptionsExpiration?: () => void;
  onOpenQuadWitching?: () => void;
}

interface ContractSpec {
  symbol: string;
  alias?: string;
  name: string;
  subType: 'Index' | 'Bond' | 'Rate' | 'FX';
  exchange: string;
  clearingHouse: string;
  price: number;
  change: number;
  changePercent: number;
  multiplier: number;
  currency: 'CAD' | 'USD';
  multiplierLabel: string;
  tickSize: number;
  tickValue: number;
  notionalValue: number;
  initialMargin: number;
  volume: string;
  openInterest: string;
  high: number;
  low: number;
  tradingHours: string;
  settlementMethod: string;
  description: string;
  institutionalRole: string;
}

export const TSXFuturesHubModal: React.FC<TSXFuturesHubModalProps> = ({
  isOpen,
  onClose,
  tickers,
  selectedSymbol,
  onSelectTicker,
  onOpenStockTrade,
  onOpenOptionsExpiration,
  onOpenQuadWitching,
}) => {
  const [activeTab, setActiveTab] = useState<'contracts' | 'arbitrage' | 'crossborder' | 'cdcc'>('contracts');
  const [selectedSpecSymbol, setSelectedSpecSymbol] = useState<string>('/SXF');
  const [customCashIndex, setCustomCashIndex] = useState<number>(1460.10);
  const [customDaysToExpiry, setCustomDaysToExpiry] = useState<number>(70);
  const [customCorraRate, setCustomCorraRate] = useState<number>(4.25);
  const [customDivYield, setCustomDivYield] = useState<number>(3.12);

  if (!isOpen) return null;

  // Real-time contract specs mapped from live tickers where available
  const sxfTicker = tickers['/SXF'] || { price: 1462.40, change: 8.60, changePercent: 0.59, high: 1468.20, low: 1455.10, volume: '48.5K' };
  const sxmTicker = tickers['/SXM'] || { price: 1462.40, change: 8.60, changePercent: 0.59, high: 1468.20, low: 1455.10, volume: '18.2K' };
  const cgbTicker = tickers['/CGB'] || { price: 118.65, change: -0.32, changePercent: -0.27, high: 119.10, low: 118.40, volume: '38.4K' };
  const craTicker = tickers['/CRA'] || { price: 95.825, change: 0.015, changePercent: 0.02, high: 95.860, low: 95.800, volume: '54.0K' };
  const scfTicker = tickers['/SCF'] || { price: 24840.00, change: 145.00, changePercent: 0.59, high: 24920.00, low: 24710.00, volume: '12.8K' };
  const cgfTicker = tickers['/CGF'] || { price: 112.40, change: -0.18, changePercent: -0.16, high: 112.75, low: 112.20, volume: '22.1K' };
  const cadFxTicker = tickers['/6C'] || { price: 0.7385, change: 0.0018, changePercent: 0.24, high: 0.7410, low: 0.7360, volume: '88K' };

  const CONTRACT_SPECS: ContractSpec[] = [
    {
      symbol: '/SXF',
      alias: 'SXF',
      name: 'S&P/TSX 60 Index Standard Futures',
      subType: 'Index',
      exchange: 'Bourse de Montréal (MX) / TMX Group',
      clearingHouse: 'CDCC (Canadian Derivatives Clearing Corp)',
      price: sxfTicker.price,
      change: sxfTicker.change,
      changePercent: sxfTicker.changePercent,
      high: sxfTicker.high,
      low: sxfTicker.low,
      multiplier: 200,
      currency: 'CAD',
      multiplierLabel: 'C$200 per index point',
      tickSize: 0.10,
      tickValue: 20.0,
      notionalValue: sxfTicker.price * 200,
      initialMargin: 14200,
      volume: sxfTicker.volume,
      openInterest: '198,420 cts',
      tradingHours: '02:00 to 16:30 ET (Continuous Electronic)',
      settlementMethod: 'Cash Settled against Official Closing Price (OCP)',
      description: 'Canada’s premier institutional equity index derivative. Tracks the 60 largest blue chips on the Toronto Stock Exchange (TSX). Primary vehicle for Canadian pension asset allocation & cash-and-carry basis arbitrage.',
      institutionalRole: 'Institutional core benchmark, beta management, and cash-and-carry index replication.',
    },
    {
      symbol: '/SXM',
      alias: 'SXM',
      name: 'Mini S&P/TSX 60 Index Futures',
      subType: 'Index',
      exchange: 'Bourse de Montréal (MX) / TMX Group',
      clearingHouse: 'CDCC (Canadian Derivatives Clearing Corp)',
      price: sxmTicker.price,
      change: sxmTicker.change,
      changePercent: sxmTicker.changePercent,
      high: sxmTicker.high,
      low: sxmTicker.low,
      multiplier: 50,
      currency: 'CAD',
      multiplierLabel: 'C$50 per index point (1/4 size)',
      tickSize: 0.10,
      tickValue: 5.0,
      notionalValue: sxmTicker.price * 50,
      initialMargin: 3550,
      volume: sxmTicker.volume,
      openInterest: '44,810 cts',
      tradingHours: '02:00 to 16:30 ET',
      settlementMethod: 'Cash Settled against S&P/TSX 60 Closing Price',
      description: 'Quarter-sized contract designed for precise risk calibration, tactical overlay, and smaller account sizes with 1/4 the capital requirement of the standard SXF.',
      institutionalRole: 'Tactical hedging, overlay alpha, and boutique asset manager allocation.',
    },
    {
      symbol: '/CGB',
      alias: 'CGB',
      name: '10-Year Government of Canada Bond Futures',
      subType: 'Bond',
      exchange: 'Bourse de Montréal (MX) / TMX Group',
      clearingHouse: 'CDCC (Canadian Derivatives Clearing Corp)',
      price: cgbTicker.price,
      change: cgbTicker.change,
      changePercent: cgbTicker.changePercent,
      high: cgbTicker.high,
      low: cgbTicker.low,
      multiplier: 1000,
      currency: 'CAD',
      multiplierLabel: 'C$1,000 per point (C$100,000 notional face value)',
      tickSize: 0.01,
      tickValue: 10.0,
      notionalValue: 100000,
      initialMargin: 2800,
      volume: cgbTicker.volume,
      openInterest: '312,650 cts',
      tradingHours: '02:00 to 16:30 ET',
      settlementMethod: 'Physical Delivery of eligible GoC Benchmark 10Y Bonds (6% Notional Coupon)',
      description: 'The benchmark sovereign debt future of Canada. Equivalent to the US 10-Year Treasury Note (/ZN). Yields directly reflect Bank of Canada macro policy, Canadian sovereign credit, and global rate flows.',
      institutionalRole: 'Duration hedging, Canada-US sovereign yield spread trading, and mortgage pipeline hedging.',
    },
    {
      symbol: '/CRA',
      alias: 'BAX',
      name: 'Three-Month CORRA Futures (Canadian Overnight Repo Rate)',
      subType: 'Rate',
      exchange: 'Bourse de Montréal (MX) / TMX Group',
      clearingHouse: 'CDCC (Canadian Derivatives Clearing Corp)',
      price: craTicker.price,
      change: craTicker.change,
      changePercent: craTicker.changePercent,
      high: craTicker.high,
      low: craTicker.low,
      multiplier: 2500,
      currency: 'CAD',
      multiplierLabel: 'C$2,500 per pt ($25 per 0.01% yield)',
      tickSize: 0.005,
      tickValue: 12.5,
      notionalValue: 250000,
      initialMargin: 1250,
      volume: craTicker.volume,
      openInterest: '520,180 cts',
      tradingHours: '02:00 to 16:30 ET',
      settlementMethod: 'Cash Settled against Daily Compounded CORRA Average',
      description: 'Canada’s flagship short-term interest rate derivative (successor to historic BAX Bankers’ Acceptance futures). Directly prices expectations for the Bank of Canada (BoC) overnight target rate policy decisions.',
      institutionalRole: 'Monetary policy forecasting, bank balance sheet hedging, and swap curve basis.',
    },
    {
      symbol: '/SCF',
      alias: 'SCF',
      name: 'S&P/TSX Composite Index Futures',
      subType: 'Index',
      exchange: 'Bourse de Montréal (MX) / TMX Group',
      clearingHouse: 'CDCC (Canadian Derivatives Clearing Corp)',
      price: scfTicker.price,
      change: scfTicker.change,
      changePercent: scfTicker.changePercent,
      high: scfTicker.high,
      low: scfTicker.low,
      multiplier: 10,
      currency: 'CAD',
      multiplierLabel: 'C$10 per index point',
      tickSize: 1.00,
      tickValue: 10.0,
      notionalValue: scfTicker.price * 10,
      initialMargin: 11800,
      volume: scfTicker.volume,
      openInterest: '16,400 cts',
      tradingHours: '02:00 to 16:30 ET',
      settlementMethod: 'Cash Settled against S&P/TSX Composite Index',
      description: 'Broad-market equity future reflecting all ~220 constituents of the S&P/TSX Composite Index across Canadian mining, energy, banks, telecoms, and industrial conglomerates.',
      institutionalRole: 'Broad market Canadian equity index tracking and sector weighting adjustments.',
    },
    {
      symbol: '/CGF',
      alias: 'CGF',
      name: '5-Year Government of Canada Bond Futures',
      subType: 'Bond',
      exchange: 'Bourse de Montréal (MX) / TMX Group',
      clearingHouse: 'CDCC (Canadian Derivatives Clearing Corp)',
      price: cgfTicker.price,
      change: cgfTicker.change,
      changePercent: cgfTicker.changePercent,
      high: cgfTicker.high,
      low: cgfTicker.low,
      multiplier: 1000,
      currency: 'CAD',
      multiplierLabel: 'C$1,000 per point (C$100,000 notional)',
      tickSize: 0.01,
      tickValue: 10.0,
      notionalValue: 100000,
      initialMargin: 1900,
      volume: cgfTicker.volume,
      openInterest: '88,400 cts',
      tradingHours: '02:00 to 16:30 ET',
      settlementMethod: 'Physical Delivery of GoC 5Y Bonds',
      description: 'Intermediate belly-of-the-curve sovereign benchmark. Highly liquid for Canadian bank asset-liability management and sovereign curve steepener/flattener trades against /CGB.',
      institutionalRole: 'Yield curve shape arbitrage (2s5s, 5s10s) and medium-term corporate debt hedging.',
    },
    {
      symbol: '/6C',
      alias: 'CAD',
      name: 'Canadian Dollar Currency Futures (CAD/USD FX)',
      subType: 'FX',
      exchange: 'CME Group / MX Cross-Listed',
      clearingHouse: 'CME Clearing / CDCC',
      price: cadFxTicker.price,
      change: cadFxTicker.change,
      changePercent: cadFxTicker.changePercent,
      high: cadFxTicker.high,
      low: cadFxTicker.low,
      multiplier: 100000,
      currency: 'USD',
      multiplierLabel: '100,000 CAD per contract',
      tickSize: 0.00005,
      tickValue: 5.0,
      notionalValue: cadFxTicker.price * 100000,
      initialMargin: 1650,
      volume: cadFxTicker.volume,
      openInterest: '142,300 cts',
      tradingHours: '23/6 Globex Active',
      settlementMethod: 'Physical Delivery of Canadian Dollars',
      description: 'The standard currency future for hedging foreign exchange exposure between Canadian and US Dollars. Correlated to Canadian resource exports, crude oil (/CL), and interest rate differentials.',
      institutionalRole: 'Cross-border currency hedging for dual-listed stocks (Norbert’s Gambit alternative).',
    },
  ];

  const currentSpec = CONTRACT_SPECS.find((c) => c.symbol === selectedSpecSymbol) || CONTRACT_SPECS[0];

  // Cash-and-carry theoretical fair value calculations
  // F = S * [1 + (r - q) * (T / 365)]
  const T = customDaysToExpiry / 365;
  const netCarryRate = (customCorraRate - customDivYield) / 100;
  const theoreticalFairValue = customCashIndex * (1 + netCarryRate * T);
  const actualFuturesPrice = sxfTicker.price;
  const basis = actualFuturesPrice - customCashIndex;
  const mispricing = actualFuturesPrice - theoreticalFairValue;
  const annualizedImpliedRepo = ((actualFuturesPrice / customCashIndex - 1) / T) * 100 + customDivYield;

  const handleSelectContract = (sym: string) => {
    playKeyClick();
    setSelectedSpecSymbol(sym);
  };

  const handleLoadContract = (sym: string) => {
    playExecutionChime();
    onSelectTicker(sym);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto font-mono text-xs">
      <div className="bg-[#0b0e14] border border-[#ff334b]/50 rounded-lg w-full max-w-6xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(255,51,75,0.25)] text-gray-200 overflow-hidden">
        {/* HEADER BAR */}
        <div className="bg-gradient-to-r from-[#1b0d12] via-[#101524] to-[#0d141e] border-b border-[#3b1d24] p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff334b]/30 to-[#00d2ff]/20 border border-[#ff334b]/60 flex items-center justify-center font-black text-lg text-white shadow-[0_0_15px_rgba(255,51,75,0.4)]">
              🇨🇦
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base text-white tracking-wide flex items-center gap-1.5">
                  <span>TMX GROUP / BOURSE DE MONTRÉAL (MX)</span>
                  <span className="text-[#ff334b]">FUTURES PLATFORM</span>
                </span>
                <span className="bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40 text-[9px] font-extrabold px-2 py-0.5 rounded">
                  CDCC CENTRAL CLEARING
                </span>
                <span className="bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 text-[9px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
                  <span>MX ELECTRONIC ACTIVE</span>
                </span>
              </div>
              <p className="text-[10px] text-[#8c9bb4] mt-0.5">
                Official Canadian benchmark derivatives · S&P/TSX 60 Index Standard (/SXF) &amp; Mini (/SXM) · GoC Bonds (/CGB) · CORRA (/CRA) · Composite (/SCF)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="p-1.5 rounded bg-[#161d2b] hover:bg-[#253047] text-gray-400 hover:text-white transition-colors"
              title="Close TSX Futures Hub"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* REAL-TIME CANADIAN MACRO TICKER TAPE */}
        <div className="bg-[#0e131d] border-b border-[#1f2838] px-3 py-2 flex items-center justify-between gap-3 text-[10px] overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-[#8c9bb4]">S&amp;P/TSX 60 (/SXF):</span>
              <span className="text-white font-extrabold font-mono">1,462.40 pts</span>
              <span className="text-[#00e676] flex items-center font-bold">
                <ArrowUpRight className="w-3 h-3" /> +8.60 (+0.59%)
              </span>
            </div>
            <div className="h-3 w-px bg-[#26344d]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[#8c9bb4]">10Y GoC Bond (/CGB):</span>
              <span className="text-white font-bold font-mono">118.65</span>
              <span className="text-[#ff4455] flex items-center font-bold">
                <ArrowDownRight className="w-3 h-3" /> -0.32 (-0.27%)
              </span>
            </div>
            <div className="h-3 w-px bg-[#26344d]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[#8c9bb4]">3M CORRA (/CRA):</span>
              <span className="text-white font-bold font-mono">95.825</span>
              <span className="text-[#ffd600] font-bold">(Implied BoC: 4.175%)</span>
            </div>
            <div className="h-3 w-px bg-[#26344d]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[#8c9bb4]">CAD/USD FX (/6C):</span>
              <span className="text-[#00d2ff] font-bold font-mono">$0.7385</span>
              <span className="text-[#00e676] font-bold">+0.24%</span>
            </div>
            <div className="h-3 w-px bg-[#26344d]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[#8c9bb4]">Cash TSX 60 Index:</span>
              <span className="text-white font-mono">1,460.10</span>
              <span className="text-[#ffd600] font-bold">Basis: +2.30 pts</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="bg-[#10141e] border-b border-[#1f2838] px-3 pt-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('contracts');
              }}
              className={`px-3 py-1.5 rounded-t font-extrabold text-[11px] transition-all flex items-center gap-1.5 border-t border-x ${
                activeTab === 'contracts'
                  ? 'bg-[#171d2b] text-[#ff334b] border-[#ff334b]/60 border-b-transparent shadow-sm'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#ff334b]" />
              <span>TSX / MX CONTRACT SPECIFICATIONS &amp; QUOTES</span>
            </button>

            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('arbitrage');
              }}
              className={`px-3 py-1.5 rounded-t font-extrabold text-[11px] transition-all flex items-center gap-1.5 border-t border-x ${
                activeTab === 'arbitrage'
                  ? 'bg-[#171d2b] text-[#00d2ff] border-[#00d2ff]/60 border-b-transparent shadow-sm'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>CASH-AND-CARRY ARBITRAGE &amp; FAIR VALUE BASIS</span>
            </button>

            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('crossborder');
              }}
              className={`px-3 py-1.5 rounded-t font-extrabold text-[11px] transition-all flex items-center gap-1.5 border-t border-x ${
                activeTab === 'crossborder'
                  ? 'bg-[#171d2b] text-[#ffd600] border-[#ffd600]/60 border-b-transparent shadow-sm'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#ffd600]" />
              <span>CANADA-US CROSS-BORDER SPREADS (/SXF vs /ES)</span>
            </button>

            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('cdcc');
              }}
              className={`px-3 py-1.5 rounded-t font-extrabold text-[11px] transition-all flex items-center gap-1.5 border-t border-x ${
                activeTab === 'cdcc'
                  ? 'bg-[#171d2b] text-[#00e676] border-[#00e676]/60 border-b-transparent shadow-sm'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#00e676]" />
              <span>CDCC SPAN MARGIN &amp; CIRO/CRA RULES</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-400 pb-1">
            <span>Trading Hours: 02:00 - 16:30 ET</span>
            <span>·</span>
            <span className="text-[#00e676]">Extended Session</span>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0a0d14] space-y-4">
          {/* TAB 1: ALL CONTRACTS & SPECIFICATIONS */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              {/* CONTRACTS CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {CONTRACT_SPECS.map((spec) => {
                  const isSelected = spec.symbol === selectedSpecSymbol;
                  const isUp = spec.change >= 0;
                  return (
                    <div
                      key={spec.symbol}
                      onClick={() => handleSelectContract(spec.symbol)}
                      className={`rounded-lg p-3 transition-all cursor-pointer border flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#151c2a] border-[#ff334b] shadow-[0_0_15px_rgba(255,51,75,0.3)] ring-1 ring-[#ff334b]'
                          : 'bg-[#0f1420] border-[#1f2838] hover:border-[#384863] hover:bg-[#131926]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#ff334b]/20 text-[#ff334b] font-black text-[10px] border border-[#ff334b]/40">
                              {spec.symbol}
                            </span>
                            <span className="text-[9px] uppercase px-1 rounded bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/20 font-bold">
                              {spec.subType}
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold text-white">
                            {spec.currency === 'CAD' ? 'C$' : '$'}
                            {spec.price.toLocaleString('en-US', { minimumFractionDigits: spec.tickSize < 0.01 ? (spec.tickSize === 0.005 ? 3 : 4) : 2 })}
                          </span>
                        </div>

                        <div className="font-extrabold text-[11px] text-white leading-tight line-clamp-1 mb-1">
                          {spec.name}
                        </div>

                        <div className="text-[10px] text-[#8c9bb4] flex items-center justify-between">
                          <span>Change:</span>
                          <span className={isUp ? 'text-[#00e676] font-bold' : 'text-[#ff4455] font-bold'}>
                            {isUp ? '+' : ''}{spec.change.toFixed(spec.tickSize < 0.01 ? (spec.tickSize === 0.005 ? 3 : 4) : 2)} ({isUp ? '+' : ''}{spec.changePercent.toFixed(2)}%)
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#1e2738] grid grid-cols-2 gap-1.5 text-[9.5px]">
                          <div>
                            <span className="text-[#8c9bb4] block text-[8.5px]">Multiplier</span>
                            <span className="text-white font-bold">{spec.multiplierLabel.split('(')[0]}</span>
                          </div>
                          <div>
                            <span className="text-[#8c9bb4] block text-[8.5px]">Min Tick</span>
                            <span className="text-[#ffd600] font-bold">{spec.tickSize} ({spec.currency === 'CAD' ? 'C$' : '$'}{spec.tickValue.toFixed(2)})</span>
                          </div>
                          <div>
                            <span className="text-[#8c9bb4] block text-[8.5px]">SPAN Margin</span>
                            <span className="text-[#00e676] font-bold">{spec.currency === 'CAD' ? 'C$' : '$'}{spec.initialMargin.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#8c9bb4] block text-[8.5px]">Volume</span>
                            <span className="text-[#cbd5e1] font-bold">{spec.volume}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#1e2738] flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadContract(spec.symbol);
                          }}
                          className="flex-1 py-1 rounded bg-[#ff334b] hover:bg-[#ff4d63] text-white font-black text-[9.5px] transition-all flex items-center justify-center gap-1 shadow-sm"
                          title={`Select ${spec.symbol} and view live options matrix`}
                        >
                          <span>LOAD OMON</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        {onOpenStockTrade && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playKeyClick();
                              const t = tickers[spec.symbol];
                              if (t) onOpenStockTrade(t);
                            }}
                            className="px-2 py-1 rounded bg-[#ffd600] hover:bg-[#ffe033] text-black font-black text-[9.5px] transition-all"
                            title={`Trade outright future for ${spec.symbol}`}
                          >
                            TRADE
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DETAILED SPECIFICATION PANEL FOR SELECTED CONTRACT */}
              <div className="bg-[#101622] border border-[#233149] rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#202d44] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 rounded bg-[#ff334b]/20 border border-[#ff334b]/40 text-[#ff334b] font-black text-sm">
                      {currentSpec.symbol}
                    </div>
                    <div>
                      <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                        <span>{currentSpec.name}</span>
                        <span className="text-[10px] text-[#00d2ff] bg-[#00d2ff]/10 px-2 py-0.5 rounded border border-[#00d2ff]/30 font-bold">
                          {currentSpec.exchange}
                        </span>
                      </h3>
                      <p className="text-[10.5px] text-[#8c9bb4]">{currentSpec.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadContract(currentSpec.symbol)}
                      className="px-3 py-1.5 rounded bg-[#ff334b] hover:bg-[#ff4d63] text-white font-black text-[11px] transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,51,75,0.3)]"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>OPEN OPTIONS CHAIN (OMON)</span>
                    </button>
                    {onOpenOptionsExpiration && (
                      <button
                        onClick={() => {
                          playKeyClick();
                          onOpenOptionsExpiration();
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] border border-[#00d2ff]/50 font-black text-[11px] transition-all flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>EXPIRATIONS &amp; ROLLS</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-[10.5px]">
                  <div className="bg-[#0b0e14] p-2.5 rounded border border-[#1b2434]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Contract Multiplier</span>
                    <span className="text-white font-extrabold text-xs">{currentSpec.multiplierLabel}</span>
                  </div>
                  <div className="bg-[#0b0e14] p-2.5 rounded border border-[#1b2434]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Tick Size &amp; Value</span>
                    <span className="text-[#ffd600] font-extrabold text-xs">
                      {currentSpec.tickSize} = {currentSpec.currency === 'CAD' ? 'C$' : '$'}{currentSpec.tickValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-[#0b0e14] p-2.5 rounded border border-[#1b2434]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Estimated Notional</span>
                    <span className="text-white font-extrabold text-xs">
                      {currentSpec.currency === 'CAD' ? 'C$' : '$'}{currentSpec.notionalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="bg-[#0b0e14] p-2.5 rounded border border-[#1b2434]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">CDCC SPAN Margin</span>
                    <span className="text-[#00e676] font-extrabold text-xs">
                      {currentSpec.currency === 'CAD' ? 'C$' : '$'}{currentSpec.initialMargin.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#0b0e14] p-2.5 rounded border border-[#1b2434]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Open Interest</span>
                    <span className="text-[#cbd5e1] font-extrabold text-xs">{currentSpec.openInterest}</span>
                  </div>
                  <div className="bg-[#0b0e14] p-2.5 rounded border border-[#1b2434]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Daily Volume</span>
                    <span className="text-[#00d2ff] font-extrabold text-xs">{currentSpec.volume}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] pt-1">
                  <div className="bg-[#0c1017] p-3 rounded border border-[#1c2536] space-y-1">
                    <span className="text-[#ffd600] font-black uppercase tracking-wider block text-[9.5px]">
                      Settlement &amp; Delivery Mechanics
                    </span>
                    <p className="text-[#cbd5e1] leading-relaxed">{currentSpec.settlementMethod}</p>
                    <p className="text-[#8c9bb4]">
                      Trading Hours: <span className="text-white font-mono">{currentSpec.tradingHours}</span>
                    </p>
                  </div>
                  <div className="bg-[#0c1017] p-3 rounded border border-[#1c2536] space-y-1">
                    <span className="text-[#00d2ff] font-black uppercase tracking-wider block text-[9.5px]">
                      Institutional Application &amp; Hedging Role
                    </span>
                    <p className="text-[#cbd5e1] leading-relaxed">{currentSpec.institutionalRole}</p>
                    <p className="text-[#8c9bb4]">
                      Clearing Organization: <span className="text-white font-mono">{currentSpec.clearingHouse}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CASH-AND-CARRY ARBITRAGE & FAIR VALUE BASIS */}
          {activeTab === 'arbitrage' && (
            <div className="space-y-4">
              <div className="bg-[#111726] border border-[#23334d] rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#213049] pb-3">
                  <div>
                    <h3 className="font-black text-white text-sm flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#00d2ff]" />
                      <span>S&amp;P/TSX 60 CASH-AND-CARRY ARBITRAGE &amp; THEORETICAL FAIR VALUE</span>
                    </h3>
                    <p className="text-[10px] text-[#8c9bb4]">
                      Models institutional arbitrage between S&amp;P/TSX 60 cash equity basket, iShares XIU ETF, and /SXF front-quarter futures contract.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#00d2ff] bg-[#00d2ff]/10 border border-[#00d2ff]/30 px-2 py-0.5 rounded font-bold">
                      Formula: F = S · [1 + (r - q) · (T/365)]
                    </span>
                  </div>
                </div>

                {/* INTERACTIVE INPUT CONTROLS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0a0d14] p-3 rounded border border-[#1a2538] text-[10px]">
                  <div>
                    <label className="text-[#8c9bb4] block font-bold mb-1">Cash TSX 60 Index (S):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customCashIndex}
                      onChange={(e) => setCustomCashIndex(parseFloat(e.target.value) || 1460.0)}
                      className="w-full bg-[#141b29] border border-[#263750] rounded px-2 py-1 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[#8c9bb4] block font-bold mb-1">Days to Expiration (DTE):</label>
                    <input
                      type="number"
                      step="1"
                      value={customDaysToExpiry}
                      onChange={(e) => setCustomDaysToExpiry(parseInt(e.target.value) || 30)}
                      className="w-full bg-[#141b29] border border-[#263750] rounded px-2 py-1 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[#8c9bb4] block font-bold mb-1">BoC CORRA Financing (r%):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={customCorraRate}
                      onChange={(e) => setCustomCorraRate(parseFloat(e.target.value) || 4.25)}
                      className="w-full bg-[#141b29] border border-[#263750] rounded px-2 py-1 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[#8c9bb4] block font-bold mb-1">Index Dividend Yield (q%):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={customDivYield}
                      onChange={(e) => setCustomDivYield(parseFloat(e.target.value) || 3.12)}
                      className="w-full bg-[#141b29] border border-[#263750] rounded px-2 py-1 text-white font-mono font-bold"
                    />
                  </div>
                </div>

                {/* ARBITRAGE METRICS SUMMARY */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="bg-[#0d121c] p-3 rounded border border-[#1e2a3f]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Live Futures Price (/SXF)</span>
                    <span className="text-white font-extrabold text-sm font-mono">{actualFuturesPrice.toFixed(2)} pts</span>
                    <span className="text-[9px] text-[#00e676] block mt-0.5">Market Price</span>
                  </div>
                  <div className="bg-[#0d121c] p-3 rounded border border-[#1e2a3f]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Theoretical Fair Value</span>
                    <span className="text-[#00d2ff] font-extrabold text-sm font-mono">{theoreticalFairValue.toFixed(2)} pts</span>
                    <span className="text-[9px] text-[#8c9bb4] block mt-0.5">Cost-of-Carry Model</span>
                  </div>
                  <div className="bg-[#0d121c] p-3 rounded border border-[#1e2a3f]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Gross Index Basis (F - S)</span>
                    <span className={`font-extrabold text-sm font-mono ${basis >= 0 ? 'text-[#00e676]' : 'text-[#ff4455]'}`}>
                      {basis >= 0 ? '+' : ''}{basis.toFixed(2)} pts
                    </span>
                    <span className="text-[9px] text-[#8c9bb4] block mt-0.5">Premium to Cash</span>
                  </div>
                  <div className="bg-[#0d121c] p-3 rounded border border-[#1e2a3f]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Mispricing (F - FV)</span>
                    <span className={`font-extrabold text-sm font-mono ${mispricing > 0 ? 'text-[#ffd600]' : 'text-[#00e676]'}`}>
                      {mispricing >= 0 ? '+' : ''}{mispricing.toFixed(2)} pts
                    </span>
                    <span className="text-[9px] text-[#8c9bb4] block mt-0.5">
                      {mispricing > 0 ? 'Rich vs Fair Value' : 'Cheap vs Fair Value'}
                    </span>
                  </div>
                  <div className="bg-[#0d121c] p-3 rounded border border-[#1e2a3f]">
                    <span className="text-[#8c9bb4] block text-[9px] uppercase font-bold">Implied Repo Financing</span>
                    <span className="text-[#ffd600] font-extrabold text-sm font-mono">{annualizedImpliedRepo.toFixed(2)}%</span>
                    <span className="text-[9px] text-[#8c9bb4] block mt-0.5">Spread vs CORRA: {(annualizedImpliedRepo - customCorraRate).toFixed(2)}%</span>
                  </div>
                </div>

                {/* INSTITUTIONAL CASH-AND-CARRY STRATEGY BREAKDOWN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                  <div className="bg-[#0e1420] p-3 rounded border border-[#1e2c44] space-y-2">
                    <span className="text-[#00e676] font-black uppercase flex items-center gap-1.5 text-[10px]">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Long Cash-and-Carry Arbitrage (When Futures are Rich)</span>
                    </span>
                    <p className="text-[#cbd5e1] leading-relaxed">
                      If /SXF trades above Fair Value (+{mispricing.toFixed(2)} pts), market makers short /SXF contracts and buy the 60 underlying TSX stocks or iShares S&amp;P/TSX 60 ETF (XIU.TO). They lock in risk-free spread yields above the Bank of Canada CORRA benchmark.
                    </p>
                    <div className="bg-[#080b11] p-2 rounded text-[9.5px] border border-[#162134] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">1. Sell 1 Contract /SXF:</span>
                        <span className="text-white font-mono">Short @ {actualFuturesPrice.toFixed(2)} (C$292,480)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">2. Buy Cash Basket or XIU:</span>
                        <span className="text-white font-mono">Long Cash @ {customCashIndex.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">3. Collect TSX Dividend Drag:</span>
                        <span className="text-[#00e676] font-mono">+{customDivYield}% Annualized</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0e1420] p-3 rounded border border-[#1e2c44] space-y-2">
                    <span className="text-[#ff334b] font-black uppercase flex items-center gap-1.5 text-[10px]">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Reverse Cash-and-Carry Arbitrage (When Futures are Cheap)</span>
                    </span>
                    <p className="text-[#cbd5e1] leading-relaxed">
                      If /SXF trades below Fair Value, pension funds and institutions buy the discounted /SXF contracts and sell/lend physical shares, reinvesting cash into Canadian overnight repos (CORRA) at {customCorraRate}%.
                    </p>
                    <div className="bg-[#080b11] p-2 rounded text-[9.5px] border border-[#162134] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">1. Buy 1 Contract /SXF:</span>
                        <span className="text-white font-mono">Long @ {actualFuturesPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">2. Short Cash / XIU:</span>
                        <span className="text-white font-mono">Short Stock Basket</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">3. Earn Overnight Repo:</span>
                        <span className="text-[#ffd600] font-mono">+{customCorraRate}% CORRA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CROSS-BORDER SPREADS */}
          {activeTab === 'crossborder' && (
            <div className="space-y-4">
              <div className="bg-[#111726] border border-[#23334d] rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#213049] pb-3">
                  <div>
                    <h3 className="font-black text-white text-sm flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#ffd600]" />
                      <span>CANADA-US CROSS-BORDER PAIRS &amp; MACRO HEDGE SPREADS</span>
                    </h3>
                    <p className="text-[10px] text-[#8c9bb4]">
                      Cross-market derivatives intelligence connecting Montréal Exchange (MX) and CME Group complexes.
                    </p>
                  </div>
                  <span className="text-[10px] text-[#ffd600] bg-[#ffd600]/10 border border-[#ffd600]/30 px-2 py-0.5 rounded font-bold">
                    Relative Value &amp; Beta-Adjusted Pairs
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* PAIR 1: /SXF vs /ES */}
                  <div className="bg-[#0d121c] p-3.5 rounded border border-[#1f2b40] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#ff334b]/20 text-[#ff334b] font-black text-[10px] border border-[#ff334b]/40">
                        EQUITY INDEX PAIR
                      </span>
                      <span className="text-[#00e676] font-bold text-[10px]">Beta: 0.85</span>
                    </div>
                    <div className="font-extrabold text-sm text-white">
                      /SXF (TSX 60) vs /ES (S&amp;P 500)
                    </div>
                    <p className="text-[10px] text-[#8c9bb4] leading-relaxed">
                      Measures Canadian resource-and-bank equity valuation against US mega-cap tech. Canadian TSX trading at a forward P/E discount (15.4x vs 24.8x SPX).
                    </p>
                    <div className="bg-[#080b11] p-2.5 rounded border border-[#172236] text-[9.5px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">Notional Ratio:</span>
                        <span className="text-white font-mono">1 /ES = 1.34 /SXF (CAD-adjusted)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">Hedge Ratio:</span>
                        <span className="text-[#ffd600] font-mono">Buy 4 /SXF vs Short 3 /ES</span>
                      </div>
                    </div>
                  </div>

                  {/* PAIR 2: /CGB vs /ZN */}
                  <div className="bg-[#0d121c] p-3.5 rounded border border-[#1f2b40] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#00d2ff]/20 text-[#00d2ff] font-black text-[10px] border border-[#00d2ff]/40">
                        SOVEREIGN DEBT SPREAD
                      </span>
                      <span className="text-[#ffd600] font-bold text-[10px]">-79 bps Spread</span>
                    </div>
                    <div className="font-extrabold text-sm text-white">
                      /CGB (10Y GoC) vs /ZN (10Y US Note)
                    </div>
                    <p className="text-[10px] text-[#8c9bb4] leading-relaxed">
                      Captures Bank of Canada vs Federal Reserve rate policy divergence. Canadian 10Y yields trade lower due to higher Canadian household debt sensitivity.
                    </p>
                    <div className="bg-[#080b11] p-2.5 rounded border border-[#172236] text-[9.5px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">Duration Match:</span>
                        <span className="text-white font-mono">1 /CGB : 1 /ZN (Equal Notional)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">Policy Trade:</span>
                        <span className="text-[#00e676] font-mono">Long /CGB vs Short /ZN (BoC dovish)</span>
                      </div>
                    </div>
                  </div>

                  {/* PAIR 3: /6C vs /CL */}
                  <div className="bg-[#0d121c] p-3.5 rounded border border-[#1f2b40] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] font-black text-[10px] border border-[#00e676]/40">
                        PETRO-CURRENCY CORRELATION
                      </span>
                      <span className="text-[#00d2ff] font-bold text-[10px]">+0.68 Corr</span>
                    </div>
                    <div className="font-extrabold text-sm text-white">
                      /6C (CAD/USD) vs /CL (Crude Oil)
                    </div>
                    <p className="text-[10px] text-[#8c9bb4] leading-relaxed">
                      Canadian Dollar exhibits high sensitivity to Western Canadian Select (WCS) and WTI oil export revenues. Used by macro desks to isolate currency alpha.
                    </p>
                    <div className="bg-[#080b11] p-2.5 rounded border border-[#172236] text-[9.5px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">Oil Beta:</span>
                        <span className="text-white font-mono">+$10/bbl Oil = +$0.015 CAD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8c9bb4]">Clean Energy Hedge:</span>
                        <span className="text-[#ffd600] font-mono">Long /6C + Short /CL to hedge crude shock</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CDCC MARGIN & CIRO / CRA REGULATORY RULES */}
          {activeTab === 'cdcc' && (
            <div className="space-y-4">
              <div className="bg-[#111726] border border-[#23334d] rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#213049] pb-3">
                  <div>
                    <h3 className="font-black text-white text-sm flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#00e676]" />
                      <span>CDCC CENTRAL CLEARING &amp; CIRO / CRA REGULATORY COMPLIANCE</span>
                    </h3>
                    <p className="text-[10px] text-[#8c9bb4]">
                      Canadian Derivatives Clearing Corporation (CDCC) SPAN parameters and Canadian account eligibility guidelines.
                    </p>
                  </div>
                  <span className="text-[10px] text-[#00e676] bg-[#00e676]/10 border border-[#00e676]/30 px-2 py-0.5 rounded font-bold">
                    AAA Clearing Standard
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                  {/* CDCC MARGIN RULES */}
                  <div className="bg-[#0d121c] p-3.5 rounded border border-[#1d273a] space-y-2">
                    <span className="text-[#ffd600] font-black uppercase text-[10.5px] flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-[#ffd600]" />
                      <span>CDCC Margin Offset &amp; Inter-Commodity Spread Credits</span>
                    </span>
                    <p className="text-[#cbd5e1] leading-relaxed">
                      CDCC provides portfolio margin offsets when trading correlated contracts:
                    </p>
                    <ul className="space-y-1.5 text-[9.5px] text-[#cbd5e1]">
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#00e676] font-bold">✓</span>
                        <span>
                          <strong className="text-white">SXF vs SXM:</strong> 80% margin relief on opposite positions (1 standard vs 4 mini contracts).
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#00e676] font-bold">✓</span>
                        <span>
                          <strong className="text-white">CGB vs CGF:</strong> 65% inter-commodity curve spread credit on 10Y vs 5Y GoC bond calendar spreads.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#00e676] font-bold">✓</span>
                        <span>
                          <strong className="text-white">Calendar Rolls:</strong> Intra-commodity roll margin reduction of 85% when rolling front-quarter contracts into next quarter during Quad Witching week.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* CRA & CIRO ACCOUNT ELIGIBILITY */}
                  <div className="bg-[#0d121c] p-3.5 rounded border border-[#1d273a] space-y-2">
                    <span className="text-[#ff334b] font-black uppercase text-[10.5px] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#ff334b]" />
                      <span>Canadian Account Eligibility &amp; CRA Tax Treatment</span>
                    </span>
                    <p className="text-[#cbd5e1] leading-relaxed">
                      How Canadian brokerages (Questrade, TD Direct, Interactive Brokers Canada) handle TSX Futures:
                    </p>
                    <ul className="space-y-1.5 text-[9.5px] text-[#cbd5e1]">
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#00e676] font-bold">✓</span>
                        <span>
                          <strong className="text-white">CAD Margin Accounts (Taxable):</strong> Fully permitted with Level 4 CIRO margin. Carrying costs and financing interest are fully tax-deductible on CRA Line 22100.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#ff4455] font-bold">✗</span>
                        <span>
                          <strong className="text-white">Registered Accounts (TFSA / RRSP / FHSA):</strong> Direct bilateral futures contracts are non-qualified investments under Section 204.4 of the Income Tax Act.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#ffd600] font-bold">ℹ</span>
                        <span>
                          <strong className="text-white">Registered Account Proxy:</strong> Registered investors achieve synthetic exposure via exchange-traded funds (XIU, HQU, HXD) or covered calls on TSX blue chips.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-[#0e131d] border-t border-[#1f2838] p-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8c9bb4]">Selected Contract:</span>
            <span className="px-2 py-0.5 rounded bg-[#ff334b]/20 text-[#ff334b] font-black text-[11px] border border-[#ff334b]/40">
              {currentSpec.symbol}
            </span>
            <span className="text-white font-bold text-[10.5px] hidden sm:inline">
              {currentSpec.name} ({currentSpec.currency === 'CAD' ? 'C$' : '$'}{currentSpec.price.toFixed(2)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLoadContract(currentSpec.symbol)}
              className="px-3.5 py-1.5 rounded bg-[#ff334b] hover:bg-[#ff4d63] text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,51,75,0.35)]"
            >
              <span>LOAD {currentSpec.symbol} INTO OMON</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {onOpenStockTrade && (
              <button
                onClick={() => {
                  playKeyClick();
                  const t = tickers[currentSpec.symbol];
                  if (t) onOpenStockTrade(t);
                }}
                className="px-3 py-1.5 rounded bg-[#ffd600] hover:bg-[#ffe033] text-black font-black text-xs transition-all flex items-center gap-1"
              >
                <span>TRADE OUTRIGHT</span>
              </button>
            )}
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="px-3 py-1.5 rounded bg-[#1e2638] hover:bg-[#2c3852] text-gray-300 font-bold text-xs transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
