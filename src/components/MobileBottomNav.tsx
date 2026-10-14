import React from 'react';
import { TerminalScreen } from '../types/options';
import { playKeyClick } from '../utils/terminalSound';
import {
  Layers,
  Calculator,
  Briefcase,
  DollarSign,
  Smartphone,
  Menu,
  Activity,
  BarChart2,
  TrendingUp,
  ShieldAlert,
  Globe,
  Sliders,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentScreen: TerminalScreen;
  onNavigateScreen: (screen: TerminalScreen) => void;
  onOpenDeviceModal: () => void;
  onOpenMenuDrawer: () => void;
  openPositionsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentScreen,
  onNavigateScreen,
  onOpenDeviceModal,
  onOpenMenuDrawer,
  openPositionsCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#070a10]/95 backdrop-blur-md border-t border-[#1e293b] px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] md:hidden select-none shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Tab 1: OMON Options Chain */}
        <button
          type="button"
          onClick={() => {
            playKeyClick();
            onNavigateScreen('omon');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] min-h-[44px] ${
            currentScreen === 'omon'
              ? 'text-[#00d2ff] font-extrabold bg-[#00d2ff]/10 scale-105'
              : 'text-[#8b9bb4] hover:text-white'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">CHAIN</span>
        </button>

        {/* Tab 2: OVME Valuation */}
        <button
          type="button"
          onClick={() => {
            playKeyClick();
            onNavigateScreen('ovme');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] min-h-[44px] ${
            currentScreen === 'ovme'
              ? 'text-[#ff9900] font-extrabold bg-[#ff9900]/10 scale-105'
              : 'text-[#8b9bb4] hover:text-white'
          }`}
        >
          <Calculator className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">TRADE</span>
        </button>

        {/* Tab 3: MONITOR Hub (Positions, Portfolio, Statement, TFSA/RRSP) */}
        <button
          type="button"
          onClick={() => {
            playKeyClick();
            onNavigateScreen('monitor');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] min-h-[44px] relative ${
            currentScreen === 'port' || currentScreen === 'monitor' || currentScreen === 'statement'
              ? 'text-[#38bdf8] font-extrabold bg-[#38bdf8]/10 scale-105'
              : 'text-[#8b9bb4] hover:text-white'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">MONITOR</span>
          {openPositionsCount > 0 && (
            <span className="absolute top-0 right-1.5 w-4 h-4 rounded-full bg-[#38bdf8] text-[#082f49] font-bold text-[9px] flex items-center justify-center font-mono">
              {openPositionsCount}
            </span>
          )}
        </button>

        {/* Tab 4: DVD Dividend Tracker */}
        <button
          type="button"
          onClick={() => {
            playKeyClick();
            onNavigateScreen('div');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] min-h-[44px] ${
            currentScreen === 'div'
              ? 'text-[#c084fc] font-extrabold bg-[#c084fc]/10 scale-105'
              : 'text-[#8b9bb4] hover:text-white'
          }`}
        >
          <DollarSign className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">DIVIDENDS</span>
        </button>

        {/* Tab 5: Device & Multi-Platform Suite */}
        <button
          type="button"
          onClick={() => {
            playKeyClick();
            onOpenDeviceModal();
          }}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] min-h-[44px] text-[#38bdf8] hover:text-white"
          title="Device and Platform Settings"
        >
          <Smartphone className="w-5 h-5 mb-0.5 text-[#38bdf8]" />
          <span className="text-[10px] tracking-tight">DEVICE</span>
        </button>

        {/* Tab 6: More Menu Drawer */}
        <button
          type="button"
          onClick={() => {
            playKeyClick();
            onOpenMenuDrawer();
          }}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] min-h-[44px] text-[#cbd5e1] hover:text-white"
          title="All Terminal Tools"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">ALL TOOLS</span>
        </button>
      </div>
    </nav>
  );
};
