import React, { useState } from 'react';
import {
  Sliders,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Maximize,
  Minimize,
  Type,
  Sun,
  X,
  Smartphone,
  Tablet,
  Monitor,
  Shield,
  EyeOff,
  Eye,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import { TextLegibility, ContrastMode } from './DisplaySettingsModal';

interface FloatingDisplayWidgetProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  onFitToScreen: () => void;
  onOpenSettings: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  textLegibility: TextLegibility;
  onCycleLegibility: () => void;
  onOpenDeviceSuite?: () => void;
  isAutoFitActive?: boolean;
  onToggleAutoFit?: () => void;
  isPrivacyMode?: boolean;
  onTogglePrivacyMode?: () => void;
  onOpenPrivacyModal?: () => void;
}

export const FloatingDisplayWidget: React.FC<FloatingDisplayWidgetProps> = ({
  scale,
  onScaleChange,
  onFitToScreen,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
  textLegibility,
  onCycleLegibility,
  onOpenDeviceSuite,
  isAutoFitActive = false,
  onToggleAutoFit,
  isPrivacyMode = false,
  onTogglePrivacyMode,
  onOpenPrivacyModal,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleStepZoom = (delta: number) => {
    playKeyClick();
    const next = Math.min(1.5, Math.max(0.65, Number((scale + delta).toFixed(2))));
    onScaleChange(next);
  };

  return (
    <aside
      aria-label="Screen display & zoom controls"
      className="fixed bottom-20 md:bottom-10 right-3 z-40 flex flex-col items-end gap-1.5 select-none print:hidden pointer-events-auto"
    >
      {/* Expanded Quick Controls Panel */}
      {isExpanded && (
        <div className="bg-[#0b101c]/95 border border-[#1e2a44] backdrop-blur-md rounded-lg p-2.5 shadow-2xl flex flex-col gap-2 min-w-[210px] text-xs animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-[#1e2a44] pb-1.5 text-[11px] font-bold text-white">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#ff9900]" />
              <span>SCREEN SCALE &amp; FIT</span>
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[#8b9bb4] hover:text-white p-0.5 rounded"
              title="Close Quick Bar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between bg-[#141b28] p-1.5 rounded border border-[#222d44]">
            <button
              onClick={() => handleStepZoom(-0.05)}
              className="w-7 h-7 rounded bg-[#0b101c] hover:bg-[#1e293b] text-white font-mono font-bold flex items-center justify-center border border-[#222d44]"
              title="Zoom out (-5%)"
            >
              -
            </button>
            <div className="text-center">
              <span className="font-mono font-black text-[#ff9900] text-sm">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <button
              onClick={() => handleStepZoom(+0.05)}
              className="w-7 h-7 rounded bg-[#0b101c] hover:bg-[#1e293b] text-white font-mono font-bold flex items-center justify-center border border-[#222d44]"
              title="Zoom in (+5%)"
            >
              +
            </button>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                playExecutionChime();
                onFitToScreen();
                if (onToggleAutoFit && !isAutoFitActive) {
                  onToggleAutoFit();
                }
              }}
              className={`px-2 py-1.5 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isAutoFitActive
                  ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/50'
                  : 'bg-[#00d2ff]/15 hover:bg-[#00d2ff]/25 text-[#00d2ff] border border-[#00d2ff]/40'
              }`}
              title={isAutoFitActive ? 'Auto-Fit is Active (Recalculating on resize)' : 'Auto-Fit Terminal to current window'}
            >
              <Sparkles className="w-3 h-3" />
              <span>{isAutoFitActive ? 'AUTO-FIT ON' : 'FIT SCREEN'}</span>
            </button>

            <button
              onClick={() => {
                playKeyClick();
                onToggleFullscreen();
              }}
              className="px-2 py-1.5 bg-[#ffd600]/15 hover:bg-[#ffd600]/25 text-[#ffd600] border border-[#ffd600]/40 rounded font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
              title="Toggle Fullscreen Mode"
            >
              {isFullscreen ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
              <span>{isFullscreen ? 'EXIT' : 'FULL'}</span>
            </button>
          </div>

          {/* Privacy & Stealth Mode Quick Toggle */}
          {onTogglePrivacyMode && (
            <div className="flex items-center justify-between bg-[#141b28] p-1.5 rounded border border-[#222d44]">
              <div className="flex items-center gap-1.5 text-[10px]">
                {isPrivacyMode ? (
                  <EyeOff className="w-3 h-3 text-[#ff9900]" />
                ) : (
                  <Eye className="w-3 h-3 text-[#8b9bb4]" />
                )}
                <span className="text-[#8b9bb4]">STEALTH:</span>
                <span className={isPrivacyMode ? 'text-[#ff9900] font-bold' : 'text-slate-400 font-mono'}>
                  {isPrivacyMode ? 'ACTIVE (MASKED)' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    onTogglePrivacyMode();
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                    isPrivacyMode
                      ? 'bg-[#ff9900] text-black font-black'
                      : 'bg-[#1e293b] text-white hover:bg-[#2e3d5b]'
                  }`}
                >
                  {isPrivacyMode ? 'UNMASK' : 'MASK'}
                </button>
                {onOpenPrivacyModal && (
                  <button
                    type="button"
                    onClick={() => {
                      playKeyClick();
                      setIsExpanded(false);
                      onOpenPrivacyModal();
                    }}
                    className="p-1 rounded text-[#00d2ff] hover:bg-[#00d2ff]/20 cursor-pointer"
                    title="Open Privacy & Security Settings"
                  >
                    <Shield className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Text Font Size Quick Toggle */}
          <button
            onClick={() => {
              playKeyClick();
              onCycleLegibility();
            }}
            className="px-2 py-1 bg-[#141b28] hover:bg-[#1e293b] text-[#cbd5e1] border border-[#222d44] rounded text-[10px] font-bold flex items-center justify-between"
            title="Click to toggle text readability size"
          >
            <span className="flex items-center gap-1 text-[#8b9bb4]">
              <Type className="w-3 h-3 text-[#ff9900]" />
              <span>TEXT SIZE:</span>
            </span>
            <span className="font-mono text-white uppercase">
              {textLegibility === 'standard' ? '100% REGULAR' : textLegibility === 'large' ? '+15% LARGE' : '+30% XLARGE'}
            </span>
          </button>

          {onOpenDeviceSuite && (
            <button
              onClick={() => {
                playKeyClick();
                setIsExpanded(false);
                onOpenDeviceSuite();
              }}
              className="w-full py-1.5 bg-[#00d2ff]/15 hover:bg-[#00d2ff]/25 text-[#00d2ff] border border-[#00d2ff]/40 font-bold text-[10px] rounded flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            >
              <Smartphone className="w-3 h-3" />
              <span>DEVICE &amp; PWA INSTALL...</span>
            </button>
          )}

          {/* Full Settings Modal Launcher */}
          <button
            onClick={() => {
              playKeyClick();
              setIsExpanded(false);
              onOpenSettings();
            }}
            className="w-full py-1.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-black text-[10px] rounded flex items-center justify-center gap-1 mt-0.5 shadow-sm"
          >
            <Sliders className="w-3 h-3" />
            <span>MORE DISPLAY SETTINGS...</span>
          </button>
        </div>
      )}

      {/* Floating Pill Toggle Button */}
      <button
        onClick={() => {
          playKeyClick();
          setIsExpanded((prev) => !prev);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all cursor-pointer ${
          isExpanded
            ? 'bg-[#ff9900] text-black border-[#ff9900] shadow-[0_0_12px_rgba(255,153,0,0.5)]'
            : 'bg-[#0b101c]/90 text-white border-[#222d44] hover:border-[#ff9900]/60 hover:bg-[#141b28]'
        }`}
        title="Quick screen scaling, fit and readability controls for mobile/tablet"
      >
        <Sliders className={`w-3.5 h-3.5 ${isExpanded ? 'text-black' : 'text-[#ff9900]'}`} />
        <span className="font-mono font-black text-[11px]">
          {Math.round(scale * 100)}%
        </span>
        <span className={`text-[9px] px-1 rounded font-bold ${isExpanded ? 'bg-black/20 text-black' : 'bg-[#00d2ff]/20 text-[#00d2ff]'}`}>
          FIT
        </span>
      </button>
    </aside>
  );
};
