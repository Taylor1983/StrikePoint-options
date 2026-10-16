import React from 'react';
import {
  X,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  RotateCcw,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  Layers,
  ArrowRight,
  Type,
  Sun,
  Tv,
  MonitorSmartphone,
  Shield,
  ShieldAlert,
  EyeOff,
  Bell,
  Volume2,
  Music,
  Globe,
  Clock,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import { SoundSelectorSettings } from './SoundSelectorSettings';
import { TIME_ZONE_OPTIONS } from './ExchangeClockBellModal';

export type DisplayDensity = 'compact' | 'standard' | 'touch';
export type TextLegibility = 'standard' | 'large' | 'xlarge';
export type ContrastMode = 'standard' | 'high-contrast';

export interface DisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scale: number;
  onScaleChange: (newScale: number) => void;
  density: DisplayDensity;
  onDensityChange: (newDensity: DisplayDensity) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onFitToScreen: () => void;
  onResetDefaults: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  textLegibility?: TextLegibility;
  onTextLegibilityChange?: (legibility: TextLegibility) => void;
  contrastMode?: ContrastMode;
  onContrastModeChange?: (mode: ContrastMode) => void;
  onOpenDeviceSuite?: () => void;
  isAutoFitActive?: boolean;
  onToggleAutoFit?: () => void;
  onOpenPrivacySuite?: () => void;
  initialTab?: 'display' | 'audio' | 'device';
  timeZoneId?: string;
  onSelectTimeZoneId?: (tzId: string) => void;
  useAmPm?: boolean;
  onToggleUseAmPm?: (useAmPm: boolean) => void;
  onOpenClockBellModal?: () => void;
}

export const DisplaySettingsModal: React.FC<DisplaySettingsModalProps> = ({
  isOpen,
  onClose,
  scale,
  onScaleChange,
  density,
  onDensityChange,
  isSidebarOpen,
  onToggleSidebar,
  onFitToScreen,
  onResetDefaults,
  isFullscreen,
  onToggleFullscreen,
  textLegibility = 'standard',
  onTextLegibilityChange,
  contrastMode = 'standard',
  onContrastModeChange,
  onOpenDeviceSuite,
  isAutoFitActive = false,
  onToggleAutoFit,
  onOpenPrivacySuite,
  initialTab = 'display',
  timeZoneId = 'et',
  onSelectTimeZoneId,
  useAmPm = true,
  onToggleUseAmPm,
  onOpenClockBellModal,
}) => {
  const [activeTab, setActiveTab] = React.useState<'display' | 'audio' | 'device'>(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const SCALE_PRESETS = [
    { label: '75%', value: 0.75, desc: 'Ultra-Dense' },
    { label: '85%', value: 0.85, desc: 'Compact' },
    { label: '90%', value: 0.90, desc: 'Condensed' },
    { label: '100%', value: 1.00, desc: 'Default Standard' },
    { label: '110%', value: 1.10, desc: 'Comfortable' },
    { label: '125%', value: 1.25, desc: 'Large Touch' },
    { label: '140%', value: 1.40, desc: 'High Legibility' },
  ];

  const handleStepZoom = (delta: number) => {
    playKeyClick();
    const next = Math.min(1.5, Math.max(0.65, Number((scale + delta).toFixed(2))));
    onScaleChange(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 font-sans">
        {/* Modal Top Header */}
        <div className="bg-[#0e1628] border-b border-[#1e2a44] px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#ff9900]/10 border border-[#ff9900]/40 flex items-center justify-center text-[#ff9900]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide">
                  TERMINAL SETTINGS &amp; CUSTOMIZATION
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 text-[9px] font-mono font-bold">
                  {Math.round(scale * 100)}% ZOOM
                </span>
              </div>
              <div className="text-[10px] text-[#8b9bb4]">
                Customize display scaling, audio chimes for market trigger alerts, and device layouts
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1 rounded hover:bg-[#18243c] text-[#8b9bb4] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Sub-Tabs */}
        <div className="bg-[#080d18] border-b border-[#1e2a44] px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto select-none">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setActiveTab('display');
              }}
              className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'display'
                  ? 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/50 shadow-sm'
                  : 'bg-[#0e1628] hover:bg-[#152038] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>DISPLAY &amp; SCALING</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setActiveTab('audio');
              }}
              className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/50 shadow-sm'
                  : 'bg-[#0e1628] hover:bg-[#152038] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-[#ffd600]" />
              <span>AUDIO &amp; TRIGGER CHIMES</span>
              <span className="px-1 py-0.2 rounded bg-[#00d2ff]/20 text-[#00d2ff] text-[8.5px] font-bold">
                CHIMES
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setActiveTab('device');
              }}
              className={`px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'device'
                  ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/50 shadow-sm'
                  : 'bg-[#0e1628] hover:bg-[#152038] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
              }`}
            >
              <MonitorSmartphone className="w-3.5 h-3.5" />
              <span>DEVICE &amp; RESOLUTIONS</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-[#8b9bb4]">
            <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse" />
            <span className="text-slate-300 font-bold uppercase">{activeTab}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
          {activeTab === 'audio' && (
            <SoundSelectorSettings />
          )}

          {activeTab === 'display' && (
            <>
              {/* Audio Chimes Quick Highlight Banner */}
              <div className="bg-[#00d2ff]/10 border border-[#00d2ff]/40 rounded p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#00d2ff]/20 rounded text-[#00d2ff] shrink-0">
                    <Bell className="w-5 h-5 text-[#ffd600]" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Market Trigger Alert Audio Chimes
                    </span>
                    <span className="text-[10.5px] text-[#8b9bb4]">
                      Choose specific audio chimes for order executions, unusual flow, zero-gamma flips, and risk alarms.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    setActiveTab('audio');
                  }}
                  className="px-3 py-1.5 bg-[#00d2ff] hover:bg-[#00b4db] text-black font-extrabold text-[11px] rounded shadow transition-colors shrink-0 cursor-pointer"
                >
                  SELECT CHIMES &rarr;
                </button>
              </div>

              {/* Quick Fit & Fullscreen Actions Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#0e1628] hover:bg-[#152038] border border-[#00d2ff]/40 rounded p-3 text-left flex items-center justify-between gap-2 transition-all">
              <div
                onClick={() => {
                  playExecutionChime();
                  onFitToScreen();
                }}
                className="cursor-pointer flex-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  <Sparkles className="w-4 h-4 text-[#00d2ff]" />
                  <span>FIT TO CURRENT SCREEN</span>
                </div>
                <div className="text-[10px] text-[#8b9bb4] mt-0.5">
                  Calculates exact aspect ratio &amp; dimensions to fit screen without clipping
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playExecutionChime();
                    onFitToScreen();
                  }}
                  className="text-[10px] px-2 py-0.5 bg-[#00d2ff]/15 hover:bg-[#00d2ff] hover:text-black text-[#00d2ff] border border-[#00d2ff]/30 rounded font-black transition-colors cursor-pointer"
                >
                  FIT NOW
                </button>
                {onToggleAutoFit && (
                  <button
                    type="button"
                    onClick={() => {
                      playKeyClick();
                      onToggleAutoFit();
                    }}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all border cursor-pointer ${
                      isAutoFitActive
                        ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/50'
                        : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'
                    }`}
                    title="Automatically re-fit terminal whenever window is resized"
                  >
                    {isAutoFitActive ? '● AUTO-FIT ON' : '○ AUTO-FIT OFF'}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                playKeyClick();
                onToggleFullscreen();
              }}
              className="bg-[#0e1628] hover:bg-[#152038] border border-[#1e2a44] hover:border-[#ffd600]/40 rounded p-3 text-left flex items-center justify-between gap-2 transition-all group cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4 text-[#ffd600]" />
                  ) : (
                    <Maximize className="w-4 h-4 text-[#ffd600]" />
                  )}
                  <span>{isFullscreen ? 'EXIT FULLSCREEN' : 'TOGGLE FULLSCREEN'}</span>
                </div>
                <div className="text-[10px] text-[#8b9bb4] mt-0.5">
                  Hide browser toolbars for true terminal experience on tablet/mobile
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 bg-[#ffd600]/15 text-[#ffd600] border border-[#ffd600]/30 rounded font-black group-hover:bg-[#ffd600] group-hover:text-black transition-colors">
                {isFullscreen ? 'ON' : 'OFF'}
              </span>
            </button>

            {onOpenPrivacySuite && (
              <div className="sm:col-span-2 bg-[#00d2ff]/10 border border-[#00d2ff]/40 rounded p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#00d2ff]/20 rounded text-[#00d2ff] shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Account Privacy &amp; Financial Stealth Controls
                    </span>
                    <span className="text-[10.5px] text-[#8b9bb4]">
                      Mask account balances, BP &amp; Net Liq, camouflage screen with instant frosted blur, and set inactivity auto-lock.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    onOpenPrivacySuite();
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-[#00d2ff] hover:bg-[#00b4db] text-black font-extrabold text-[11px] rounded shadow transition-colors shrink-0 cursor-pointer"
                >
                  PRIVACY SETTINGS &rarr;
                </button>
              </div>
            )}

            {onOpenDeviceSuite && (
              <div className="sm:col-span-2 bg-[#00d2ff]/10 border border-[#00d2ff]/40 rounded p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#00d2ff]/20 rounded text-[#00d2ff] shrink-0">
                    <MonitorSmartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Multi-Platform &amp; Multi-Device Suite (Linux • Windows • Android • iOS • Tablets • PC)
                    </span>
                    <span className="text-[10.5px] text-[#8b9bb4]">
                      Detected hardware profile, native PWA install prompt, and 1-click device layout presets.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playKeyClick();
                    onOpenDeviceSuite();
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-[#00d2ff] hover:bg-[#00b4db] text-black font-extrabold text-[11px] rounded shadow transition-colors shrink-0"
                >
                  OPEN DEVICE SUITE &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Scale / Zoom Stepper & Slider */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-[#ff9900]" />
                <span>MAGNIFICATION &amp; UI SCALE</span>
              </span>
              <div className="flex items-center gap-1 font-mono">
                <button
                  onClick={() => handleStepZoom(-0.05)}
                  className="w-7 h-7 bg-[#141b28] hover:bg-[#1e293b] text-white rounded border border-[#222d44] font-bold text-sm flex items-center justify-center transition-colors"
                  title="Zoom Out (-5%)"
                >
                  -
                </button>
                <span className="px-3 py-1 bg-[#0b101c] border border-[#ff9900]/50 rounded text-[#ff9900] font-black text-xs min-w-[58px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => handleStepZoom(+0.05)}
                  className="w-7 h-7 bg-[#141b28] hover:bg-[#1e293b] text-white rounded border border-[#222d44] font-bold text-sm flex items-center justify-center transition-colors"
                  title="Zoom In (+5%)"
                >
                  +
                </button>
              </div>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#64748b] font-mono">65%</span>
              <input
                type="range"
                min="0.65"
                max="1.50"
                step="0.05"
                value={scale}
                onChange={(e) => {
                  onScaleChange(Number(e.target.value));
                }}
                className="flex-1 accent-[#ff9900] cursor-pointer"
              />
              <span className="text-[10px] text-[#64748b] font-mono">150%</span>
            </div>

            {/* Quick Presets Pills */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
              {SCALE_PRESETS.map((p) => {
                const isSelected = Math.abs(scale - p.value) < 0.02;
                return (
                  <button
                    key={p.value}
                    onClick={() => {
                      playKeyClick();
                      onScaleChange(p.value);
                    }}
                    className={`px-2 py-1.5 rounded text-center transition-all ${
                      isSelected
                        ? 'bg-[#ff9900] text-black font-black shadow-md'
                        : 'bg-[#0e1628] hover:bg-[#18243c] text-[#8b9bb4] hover:text-white border border-[#1e2a44]'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold leading-tight">{p.label}</div>
                    <div className={`text-[8.5px] truncate ${isSelected ? 'text-black/80' : 'text-[#64748b]'}`}>
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Density & Tap Target Optimization */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded p-4 flex flex-col gap-3">
            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#00e676]" />
              <span>TOUCH TARGETS &amp; TYPOGRAPHY DENSITY</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => {
                  playKeyClick();
                  onDensityChange('compact');
                }}
                className={`p-3 rounded border text-left flex flex-col justify-between gap-2 transition-all ${
                  density === 'compact'
                    ? 'bg-[#00e676]/10 border-[#00e676] text-white'
                    : 'bg-[#0e1628] border-[#1e2a44] text-[#8b9bb4] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Compact Dense</span>
                  {density === 'compact' && <Check className="w-3.5 h-3.5 text-[#00e676]" />}
                </div>
                <p className="text-[10px] text-[#64748b] leading-tight">
                  Maximum data density. Tight table rows, 11px font for Bloomberg pros on high-res monitors.
                </p>
              </button>

              <button
                onClick={() => {
                  playKeyClick();
                  onDensityChange('standard');
                }}
                className={`p-3 rounded border text-left flex flex-col justify-between gap-2 transition-all ${
                  density === 'standard'
                    ? 'bg-[#ff9900]/10 border-[#ff9900] text-white'
                    : 'bg-[#0e1628] border-[#1e2a44] text-[#8b9bb4] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Standard (Balanced)</span>
                  {density === 'standard' && <Check className="w-3.5 h-3.5 text-[#ff9900]" />}
                </div>
                <p className="text-[10px] text-[#64748b] leading-tight">
                  Balanced institutional readability for laptops and external monitors. Default terminal setting.
                </p>
              </button>

              <button
                onClick={() => {
                  playKeyClick();
                  onDensityChange('touch');
                }}
                className={`p-3 rounded border text-left flex flex-col justify-between gap-2 transition-all ${
                  density === 'touch'
                    ? 'bg-[#00d2ff]/10 border-[#00d2ff] text-white'
                    : 'bg-[#0e1628] border-[#1e2a44] text-[#8b9bb4] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Touch &amp; Comfort</span>
                  {density === 'touch' && <Check className="w-3.5 h-3.5 text-[#00d2ff]" />}
                </div>
                <p className="text-[10px] text-[#64748b] leading-tight">
                  Larger fonts (13-14px), 42px+ tap targets, spacious buttons for phones, iPads, and touchscreens.
                </p>
              </button>
            </div>
          </div>

          {/* Text Legibility & Font Scale ("See It Better") */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded p-4 flex flex-col gap-3">
            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-[#ff9900]" />
              <span>TEXT VISIBILITY &amp; FONT SCALE ("SEE IT BETTER")</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => {
                  playKeyClick();
                  if (onTextLegibilityChange) onTextLegibilityChange('standard');
                }}
                className={`p-3 rounded border text-left flex flex-col justify-between gap-1.5 transition-all ${
                  textLegibility === 'standard'
                    ? 'bg-[#ff9900]/10 border-[#ff9900] text-white'
                    : 'bg-[#0e1628] border-[#1e2a44] text-[#8b9bb4] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Standard Text (100%)</span>
                  {textLegibility === 'standard' && <Check className="w-3.5 h-3.5 text-[#ff9900]" />}
                </div>
                <p className="text-[10px] text-[#64748b]">
                  Default 12px font for standard computer monitors and high density blotters.
                </p>
              </button>

              <button
                onClick={() => {
                  playExecutionChime();
                  if (onTextLegibilityChange) onTextLegibilityChange('large');
                }}
                className={`p-3 rounded border text-left flex flex-col justify-between gap-1.5 transition-all ${
                  textLegibility === 'large'
                    ? 'bg-[#00d2ff]/10 border-[#00d2ff] text-white'
                    : 'bg-[#0e1628] border-[#1e2a44] text-[#8b9bb4] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#00d2ff]">Enlarged Text (+15%)</span>
                  {textLegibility === 'large' && <Check className="w-3.5 h-3.5 text-[#00d2ff]" />}
                </div>
                <p className="text-[10px] text-[#64748b]">
                  13.5px base font. Crisp &amp; readable on tablets, small laptops, and phones.
                </p>
              </button>

              <button
                onClick={() => {
                  playExecutionChime();
                  if (onTextLegibilityChange) onTextLegibilityChange('xlarge');
                }}
                className={`p-3 rounded border text-left flex flex-col justify-between gap-1.5 transition-all ${
                  textLegibility === 'xlarge'
                    ? 'bg-[#ffd600]/10 border-[#ffd600] text-white'
                    : 'bg-[#0e1628] border-[#1e2a44] text-[#8b9bb4] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#ffd600]">Maximum Legibility (+30%)</span>
                  {textLegibility === 'xlarge' && <Check className="w-3.5 h-3.5 text-[#ffd600]" />}
                </div>
                <p className="text-[10px] text-[#64748b]">
                  15px large font with heavy weights. Maximum visibility from a distance or on phones.
                </p>
              </button>
            </div>

            {/* Contrast Mode Selector */}
            <div className="pt-2 border-t border-[#1e2a44] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-[#ffd600]" />
                <span className="text-[11px] font-bold text-white">Ultra-High Contrast OLED Black:</span>
                <span className="text-[10px] text-[#8b9bb4] hidden sm:inline">Boosts font luminance &amp; border sharpness</span>
              </div>
              <button
                onClick={() => {
                  playKeyClick();
                  if (onContrastModeChange) {
                    onContrastModeChange(contrastMode === 'standard' ? 'high-contrast' : 'standard');
                  }
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                  contrastMode === 'high-contrast'
                    ? 'bg-[#ffd600] text-black border-[#ffd600]'
                    : 'bg-[#141b28] text-[#8b9bb4] border-[#222d44] hover:text-white'
                }`}
              >
                {contrastMode === 'high-contrast' ? 'HIGH CONTRAST ON' : 'STANDARD CONTRAST'}
              </button>
            </div>
          </div>

              {/* Left Sidebar Toggle Card */}
              <div className="bg-[#080d18] border border-[#1e2a44] rounded p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {isSidebarOpen ? (
                    <PanelLeftClose className="w-4 h-4 text-[#ff9900]" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4 text-[#8b9bb4]" />
                  )}
                  <div>
                    <div className="font-bold text-white text-xs">
                      LEFT WATCHLIST &amp; STRATEGY SIDEBAR
                    </div>
                    <div className="text-[10px] text-[#8b9bb4]">
                      {isSidebarOpen
                        ? 'Sidebar is currently VISIBLE. Collapse it to give 100% full width to charts and options matrix.'
                        : 'Sidebar is currently HIDDEN. Maximizing trading surface.'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    playKeyClick();
                    onToggleSidebar();
                  }}
                  className={`px-3 py-1.5 rounded font-black text-xs border transition-all ${
                    isSidebarOpen
                      ? 'bg-[#ff9900]/15 text-[#ff9900] border-[#ff9900]/40 hover:bg-[#ff9900]/25'
                      : 'bg-[#141b28] text-white border-[#222d44] hover:bg-[#1e293b]'
                  }`}
                >
                  {isSidebarOpen ? 'COLLAPSE SIDEBAR' : 'EXPAND SIDEBAR'}
                </button>
              </div>

              {/* Time Zone & Exchange Clocks Preference Section */}
              <div className="bg-[#0e1628] border border-[#ff9900]/30 rounded-lg p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b263b] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#ff9900]/20 rounded text-[#ff9900]">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-xs block">
                        EXCHANGE TIME ZONE &amp; MARKET CLOCK
                      </span>
                      <span className="text-[10px] text-[#8b9bb4]">
                        Set terminal reference clock for market open/close, order timestamps, and chart tenors.
                      </span>
                    </div>
                  </div>

                  {onOpenClockBellModal && (
                    <button
                      type="button"
                      onClick={() => {
                        playKeyClick();
                        onOpenClockBellModal();
                      }}
                      className="px-2.5 py-1 rounded bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] border border-[#ff9900]/40 text-[10.5px] font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>BELL CONTROLLER &rarr;</span>
                    </button>
                  )}
                </div>

                {/* Quick Switch Buttons for Major Financial Hubs */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#8c9bb4] uppercase tracking-wider block">
                    1-CLICK TIME ZONE SELECT:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
                    {[
                      { id: 'et', label: 'ET', name: 'New York / TSX' },
                      { id: 'ct', label: 'CT', name: 'Chicago CME' },
                      { id: 'pt', label: 'PT', name: 'San Francisco' },
                      { id: 'utc', label: 'UTC', name: 'Universal' },
                      { id: 'lon', label: 'LON', name: 'London LSE' },
                      { id: 'fra', label: 'CET', name: 'Frankfurt' },
                      { id: 'tok', label: 'JST', name: 'Tokyo JPX' },
                      { id: 'mum', label: 'IST', name: 'Mumbai NSE' },
                    ].map((hub) => {
                      const isSelected = timeZoneId === hub.id;
                      return (
                        <button
                          key={hub.id}
                          type="button"
                          onClick={() => {
                            playKeyClick();
                            if (onSelectTimeZoneId) onSelectTimeZoneId(hub.id);
                          }}
                          className={`p-1.5 rounded text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#ff9900]/20 border-[#ff9900] text-white shadow-sm'
                              : 'bg-[#121927] border-[#1f2a40] text-[#8c9bb4] hover:text-white hover:border-[#38bdf8]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-mono text-[10px] font-black ${isSelected ? 'text-[#ff9900]' : 'text-white'}`}>
                              {hub.label}
                            </span>
                            {isSelected && <Check className="w-2.5 h-2.5 text-[#00e676]" />}
                          </div>
                          <div className="text-[8px] truncate text-[#8c9bb4] mt-0.5">
                            {hub.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Full Dropdown & 12h/24h Format Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-[#8c9bb4] uppercase tracking-wider block mb-1">
                      ALL AVAILABLE GLOBAL TIME ZONES:
                    </label>
                    <select
                      value={timeZoneId}
                      onChange={(e) => {
                        playKeyClick();
                        if (onSelectTimeZoneId) onSelectTimeZoneId(e.target.value);
                      }}
                      className="w-full bg-[#121927] border border-[#23334d] hover:border-[#ff9900] text-[#00e676] font-mono font-bold text-xs rounded px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                      {TIME_ZONE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} · {opt.name} ({opt.region})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#8c9bb4] uppercase tracking-wider block mb-1">
                      TIME DISPLAY FORMAT:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          playKeyClick();
                          if (onToggleUseAmPm) onToggleUseAmPm(true);
                        }}
                        className={`flex-1 py-1.5 px-2 rounded font-bold text-xs border transition-all ${
                          useAmPm
                            ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-extrabold'
                            : 'bg-[#121927] text-[#8c9bb4] border-[#222d42] hover:text-white'
                        }`}
                      >
                        12-HR (AM / PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playKeyClick();
                          if (onToggleUseAmPm) onToggleUseAmPm(false);
                        }}
                        className={`flex-1 py-1.5 px-2 rounded font-bold text-xs border transition-all ${
                          !useAmPm
                            ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-extrabold'
                            : 'bg-[#121927] text-[#8c9bb4] border-[#222d42] hover:text-white'
                        }`}
                      >
                        24-HR (MILITARY)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'device' && (
            <div className="flex flex-col gap-4">
              {/* Quick Fit & Fullscreen Actions Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#0e1628] hover:bg-[#152038] border border-[#00d2ff]/40 rounded p-3 text-left flex items-center justify-between gap-2 transition-all">
                  <div
                    onClick={() => {
                      playExecutionChime();
                      onFitToScreen();
                    }}
                    className="cursor-pointer flex-1"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <Sparkles className="w-4 h-4 text-[#00d2ff]" />
                      <span>FIT TO CURRENT SCREEN</span>
                    </div>
                    <div className="text-[10px] text-[#8b9bb4] mt-0.5">
                      Calculates exact aspect ratio &amp; dimensions to fit screen without clipping
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        playExecutionChime();
                        onFitToScreen();
                      }}
                      className="text-[10px] px-2 py-0.5 bg-[#00d2ff]/15 hover:bg-[#00d2ff] hover:text-black text-[#00d2ff] border border-[#00d2ff]/30 rounded font-black transition-colors cursor-pointer"
                    >
                      FIT NOW
                    </button>
                    {onToggleAutoFit && (
                      <button
                        type="button"
                        onClick={() => {
                          playKeyClick();
                          onToggleAutoFit();
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all border cursor-pointer ${
                          isAutoFitActive
                            ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/50'
                            : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'
                        }`}
                        title="Automatically re-fit terminal whenever window is resized"
                      >
                        {isAutoFitActive ? '● AUTO-FIT ON' : '○ AUTO-FIT OFF'}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    playKeyClick();
                    onToggleFullscreen();
                  }}
                  className="bg-[#0e1628] hover:bg-[#152038] border border-[#1e2a44] hover:border-[#ffd600]/40 rounded p-3 text-left flex items-center justify-between gap-2 transition-all group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      {isFullscreen ? (
                        <Minimize className="w-4 h-4 text-[#ffd600]" />
                      ) : (
                        <Maximize className="w-4 h-4 text-[#ffd600]" />
                      )}
                      <span>{isFullscreen ? 'EXIT FULLSCREEN' : 'TOGGLE FULLSCREEN'}</span>
                    </div>
                    <div className="text-[10px] text-[#8b9bb4] mt-0.5">
                      Hide browser toolbars for true terminal experience on tablet/mobile
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 bg-[#ffd600]/15 text-[#ffd600] border border-[#ffd600]/30 rounded font-black group-hover:bg-[#ffd600] group-hover:text-black transition-colors">
                    {isFullscreen ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Device Quick Presets */}
              <div className="bg-[#080d18] border border-[#1e2a44] rounded p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>OPTIMIZE FOR HARDWARE DEVICE &amp; SCREEN SIZE</span>
                  </span>
                  <span className="text-[9.5px] font-mono text-[#8b9bb4]">
                    {typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}px` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Phone */}
                  <button
                    onClick={() => {
                      playExecutionChime();
                      onScaleChange(0.80);
                      onDensityChange('touch');
                      if (onTextLegibilityChange) onTextLegibilityChange('large');
                      if (isSidebarOpen) onToggleSidebar();
                    }}
                    className="bg-[#0e1628] hover:bg-[#162238] border border-[#1e2a44] rounded p-2.5 text-left flex items-start gap-2 transition-colors group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8] shrink-0 mt-0.5">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-[11px] group-hover:text-[#38bdf8] transition-colors">
                        Mobile (375-430px)
                      </div>
                      <div className="text-[9.5px] text-[#8b9bb4] mt-0.5">
                        80% scale, touch targets, hides sidebar, large text
                      </div>
                    </div>
                  </button>

                  {/* Tablet Portrait */}
                  <button
                    onClick={() => {
                      playExecutionChime();
                      onScaleChange(0.88);
                      onDensityChange('touch');
                      if (onTextLegibilityChange) onTextLegibilityChange('large');
                      if (isSidebarOpen) onToggleSidebar();
                    }}
                    className="bg-[#0e1628] hover:bg-[#162238] border border-[#1e2a44] rounded p-2.5 text-left flex items-start gap-2 transition-colors group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded bg-[#ffd600]/10 border border-[#ffd600]/30 flex items-center justify-center text-[#ffd600] shrink-0 mt-0.5">
                      <Tablet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-[11px] group-hover:text-[#ffd600] transition-colors">
                        Tablet Portrait (768-834px)
                      </div>
                      <div className="text-[9.5px] text-[#8b9bb4] mt-0.5">
                        88% scale, iPad Mini/Air portrait fit
                      </div>
                    </div>
                  </button>

                  {/* Tablet Landscape */}
                  <button
                    onClick={() => {
                      playExecutionChime();
                      onScaleChange(0.95);
                      onDensityChange('standard');
                    }}
                    className="bg-[#0e1628] hover:bg-[#162238] border border-[#1e2a44] rounded p-2.5 text-left flex items-start gap-2 transition-colors group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded bg-[#a855f7]/10 border border-[#a855f7]/30 flex items-center justify-center text-[#a855f7] shrink-0 mt-0.5">
                      <MonitorSmartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-[11px] group-hover:text-[#a855f7] transition-colors">
                        Tablet Landscape (1024-1180px)
                      </div>
                      <div className="text-[9.5px] text-[#8b9bb4] mt-0.5">
                        95% scale, iPad Pro &amp; Surface landscape
                      </div>
                    </div>
                  </button>

                  {/* Laptop & Desktop (16" Full HD+ 1920x1200 WVA) */}
                  <button
                    onClick={() => {
                      playExecutionChime();
                      const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
                      const h = typeof window !== 'undefined' ? window.innerHeight : 1200;
                      const optimalScale = Math.min(w / 1920, h / 1200);
                      const targetScale = Math.max(0.40, Math.min(1.0, Number(optimalScale.toFixed(2))));
                      onScaleChange(targetScale);
                      onDensityChange(targetScale < 0.85 ? 'compact' : 'standard');
                      if (!isSidebarOpen) onToggleSidebar();
                    }}
                    className="bg-[#0e1628] hover:bg-[#162238] border border-[#00d2ff]/40 rounded p-2.5 text-left flex items-start gap-2 transition-colors group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded bg-[#00d2ff]/10 border border-[#00d2ff]/30 flex items-center justify-center text-[#00d2ff] shrink-0 mt-0.5">
                      <Monitor className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-[11px] group-hover:text-[#00d2ff] transition-colors flex items-center gap-1">
                        <span>(16") FHD+ 1920×1200 WVA</span>
                      </div>
                      <div className="text-[9.5px] text-[#8b9bb4] mt-0.5">
                        Fit to 16:10 Wide Viewing Angle Full HD+ layout
                      </div>
                    </div>
                  </button>
                </div>

                {/* Desktop Resolution Presets Strip */}
                <div className="bg-[#080c16] p-2.5 rounded border border-[#1b263b] flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[#8b9bb4] uppercase flex items-center gap-1.5">
                      <Tv className="w-3 h-3 text-[#00d2ff]" />
                      TARGET DESKTOP DISPLAY RESOLUTION:
                    </span>
                    <span className="font-mono text-[#00d2ff] font-bold">
                      (16") Full HD+ 1920 × 1200 WVA (16:10)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        playExecutionChime();
                        const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
                        const h = typeof window !== 'undefined' ? window.innerHeight : 1200;
                        const optimalScale = Math.min(w / 1920, h / 1200);
                        const targetScale = Math.max(0.40, Math.min(1.0, Number(optimalScale.toFixed(2))));
                        onScaleChange(targetScale);
                        onDensityChange(targetScale < 0.85 ? 'compact' : 'standard');
                      }}
                      className="px-2 py-1.5 rounded bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/50 font-bold text-left flex items-center justify-between cursor-pointer"
                    >
                      <span>16" 1920×1200 WVA</span>
                      <Check className="w-3 h-3 text-[#00d2ff]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playKeyClick();
                        onScaleChange(0.95);
                        onDensityChange('compact');
                      }}
                      className="px-2 py-1.5 rounded bg-[#0e1628] hover:bg-[#162238] text-[#8b9bb4] hover:text-white border border-[#1e2a44] text-left cursor-pointer"
                    >
                      15.6" 1920×1080
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playKeyClick();
                        onScaleChange(1.10);
                        onDensityChange('compact');
                      }}
                      className="px-2 py-1.5 rounded bg-[#0e1628] hover:bg-[#162238] text-[#8b9bb4] hover:text-white border border-[#1e2a44] text-left cursor-pointer"
                    >
                      16" 2560×1600 WVA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playKeyClick();
                        onScaleChange(1.0);
                        onDensityChange('compact');
                      }}
                      className="px-2 py-1.5 rounded bg-[#0e1628] hover:bg-[#162238] text-[#8b9bb4] hover:text-white border border-[#1e2a44] text-left cursor-pointer"
                    >
                      34" 3440×1440 UW
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-[#0e1628] border-t border-[#1e2a44] px-4 py-3 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              playExecutionChime();
              onResetDefaults();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141b28] hover:bg-[#ff334b]/20 text-[#8b9bb4] hover:text-[#ff334b] border border-[#222d44] rounded font-bold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET TO DEFAULTS</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-black rounded text-xs transition-colors shadow-sm"
          >
            APPLY &amp; CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
