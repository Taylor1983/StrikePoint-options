import React from 'react';
import { TerminalScreen } from '../types/options';
import { playKeyClick } from '../utils/terminalSound';
import {
  X,
  Layers,
  Calculator,
  Briefcase,
  DollarSign,
  Smartphone,
  TrendingUp,
  BarChart2,
  PieChart,
  Activity,
  Globe,
  ShieldAlert,
  Zap,
  Percent,
  Radio,
  FileText,
  HelpCircle,
  Settings,
  Scale,
  Flame,
  Download,
  Tv,
  Sliders,
  BookOpen,
} from 'lucide-react';

interface MobileToolsDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: TerminalScreen;
  onNavigateScreen: (screen: TerminalScreen) => void;
  onOpenDeviceSuite: () => void;
  onOpenHelp: () => void;
  onOpenCanadianSuite: () => void;
  onOpenStrategyExecution: () => void;
  onOpenMarketDepth: () => void;
  onOpenStockTrade: () => void;
}

export const MobileToolsDrawerModal: React.FC<MobileToolsDrawerModalProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onNavigateScreen,
  onOpenDeviceSuite,
  onOpenHelp,
  onOpenCanadianSuite,
  onOpenStrategyExecution,
  onOpenMarketDepth,
  onOpenStockTrade,
}) => {
  if (!isOpen) return null;

  const navigateAndClose = (screen: TerminalScreen) => {
    playKeyClick();
    onNavigateScreen(screen);
    onClose();
  };

  const toolCategories = [
    {
      title: 'OPTIONS TRADING & CHAINS',
      items: [
        { label: 'OMON Options Monitor', code: 'omon' as TerminalScreen, icon: Layers, color: 'text-[#00d2ff]' },
        { label: 'Options Academy (EDUC)', code: 'educ' as TerminalScreen, icon: BookOpen, color: 'text-[#facc15]' },
        { label: 'ETF & Company Profile (DES)', code: 'des' as TerminalScreen, icon: PieChart, color: 'text-[#00d2ff]' },
        { label: 'Quadruple Witching (WITCH)', code: 'witch' as TerminalScreen, icon: Flame, color: 'text-[#c084fc]' },
        { label: 'OVME Strategy Valuation', code: 'ovme' as TerminalScreen, icon: Calculator, color: 'text-[#ff9900]' },
        { label: 'COB Multi-Leg Execution', action: () => { onOpenStrategyExecution(); onClose(); }, icon: Zap, color: 'text-[#ffd600]' },
        { label: 'DOM Level 2 Market Depth', action: () => { onOpenMarketDepth(); onClose(); }, icon: Activity, color: 'text-[#38bdf8]' },
        { label: 'Stock & Futures Ticket', action: () => { onOpenStockTrade(); onClose(); }, icon: DollarSign, color: 'text-[#10b981]' },
      ],
    },
    {
      title: 'RISK & SCENARIO ANALYTICS',
      items: [
        { label: 'Risk Payoff Profile', code: 'risk' as TerminalScreen, icon: TrendingUp, color: 'text-[#00e676]' },
        { label: 'Probability Cone (CONE)', code: 'cone' as TerminalScreen, icon: PieChart, color: 'text-[#38bdf8]' },
        { label: 'Scenario Matrix (SCEN)', code: 'scen' as TerminalScreen, icon: BarChart2, color: 'text-[#a855f7]' },
        { label: 'Unusual Flow Tape (FLOW)', code: 'flow' as TerminalScreen, icon: Flame, color: 'text-[#f97316]' },
        { label: 'Put/Call Ratio (PCR)', code: 'pcr' as TerminalScreen, icon: Percent, color: 'text-[#fbbf24]' },
      ],
    },
    {
      title: 'VOLATILITY & GREEKS ENGINE',
      items: [
        { label: 'Volatility Skews (VOLS)', code: 'vols' as TerminalScreen, icon: Activity, color: 'text-[#38bdf8]' },
        { label: 'Volatility Skew Finder (SKEW)', code: 'skew' as TerminalScreen, icon: Sliders, color: 'text-[#ff9900]' },
        { label: '3D Volatility Surface', code: 'surf' as TerminalScreen, icon: Globe, color: 'text-[#00d2ff]' },
        { label: 'Historical vs IV (HIVG)', code: 'hivg' as TerminalScreen, icon: BarChart2, color: 'text-[#10b981]' },
        { label: 'Vega Term Structure', code: 'vega' as TerminalScreen, icon: Layers, color: 'text-[#c084fc]' },
        { label: 'Futures Term Structure (FTS)', code: 'fts' as TerminalScreen, icon: TrendingUp, color: 'text-[#ff9900]' },
        { label: 'Technical Chart / TA', code: 'chart' as TerminalScreen, icon: TrendingUp, color: 'text-[#43a047]' },
      ],
    },
    {
      title: 'DIVIDENDS, MACRO & GEOPOLITICS',
      items: [
        { label: 'GICS Canada 11 Sectors', code: 'gics' as TerminalScreen, icon: Globe, color: 'text-[#ff9900]' },
        { label: 'GIC (100% CDIC Guaranteed)', code: 'gic' as TerminalScreen, icon: ShieldAlert, color: 'text-[#00e676]' },
        { label: 'BNN Bloomberg Live TV', code: 'bnn' as TerminalScreen, icon: Tv, color: 'text-[#ff1744]' },
        { label: 'Dividend Tracker (DVD)', code: 'div' as TerminalScreen, icon: DollarSign, color: 'text-[#10b981]' },
        { label: 'G20 Sovereign Yields (YC)', code: 'yc' as TerminalScreen, icon: Activity, color: 'text-[#00e5ff]' },
        { label: 'Global Macro (MACR)', code: 'macro' as TerminalScreen, icon: Globe, color: 'text-[#00e676]' },
        { label: 'OPEC & Oil Volatility', code: 'opec' as TerminalScreen, icon: Flame, color: 'text-[#ff9900]' },
        { label: 'Tariff & Trade Wars', code: 'tariff' as TerminalScreen, icon: ShieldAlert, color: 'text-[#ff334b]' },
        { label: 'DEFCON Geopolitical Alert', code: 'defcon' as TerminalScreen, icon: ShieldAlert, color: 'text-[#ffd600]' },
      ],
    },
    {
      title: 'PORTFOLIO & REGULATORY SUITE',
      items: [
        { label: 'Strategy Trade Journal (JRNL)', code: 'journal' as TerminalScreen, icon: BookOpen, color: 'text-[#ff9900]' },
        { label: 'Positions & Margin Monitor', code: 'monitor' as TerminalScreen, icon: Radio, color: 'text-[#38bdf8]' },
        { label: 'Official Account Statement', code: 'statement' as TerminalScreen, icon: FileText, color: 'text-[#ff9900]' },
        { label: 'Portfolio & Margin (PORT)', code: 'port' as TerminalScreen, icon: Briefcase, color: 'text-[#10b981]' },
        { label: 'Canadian CIRO & CRA Suite', action: () => { onOpenCanadianSuite(); onClose(); }, icon: FileText, color: 'text-[#ff334b]' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-fade-in md:hidden">
      <div className="bg-[#0b0e17] border-t-2 border-[#00d2ff]/40 rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-[#00d2ff]/15 rounded text-[#00d2ff]">
              <Layers className="w-4 h-4" />
            </span>
            <span className="font-bold text-white text-sm">ALL TERMINAL INSTRUMENTS &amp; TOOLS</span>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-full bg-[#1e293b] text-[#94a3b8] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Switcher Quick Strip */}
        <div className="px-3 py-2 bg-[#080c14] border-b border-[#1e293b] flex items-center justify-between">
          <button
            onClick={() => {
              playKeyClick();
              onOpenDeviceSuite();
              onClose();
            }}
            className="w-full py-2 px-3 bg-[#00d2ff]/10 hover:bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/30 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            MULTI-PLATFORM &amp; PWA INSTALLATION SUITE
          </button>
        </div>

        {/* Tools List */}
        <div className="overflow-y-auto p-3 space-y-4 text-xs">
          {toolCategories.map((cat) => (
            <div key={cat.title}>
              <span className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase block mb-1.5 px-1">
                {cat.title}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = 'code' in item && item.code === currentScreen;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if ('action' in item && item.action) {
                          playKeyClick();
                          item.action();
                        } else if ('code' in item && item.code) {
                          navigateAndClose(item.code);
                        }
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all min-h-[44px] ${
                        isCurrent
                          ? 'bg-[#00d2ff]/15 border-[#00d2ff] text-white font-bold'
                          : 'bg-[#0f172a] border-[#1e293b] text-[#cbd5e1] hover:bg-[#1a2336]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                      <span className="text-[11px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
