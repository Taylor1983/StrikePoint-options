import React, { useState, useEffect } from 'react';
import {
  getDeviceDiagnostics,
  setDeviceCategoryOverride,
  getActiveDesktopResolution,
  setActiveDesktopResolution,
  DESKTOP_RESOLUTION_PRESETS,
  DesktopResolutionPreset,
  isDesktopResolutionSimulationActive,
  setDesktopResolutionSimulationActive,
  DeviceDiagnostics,
  DeviceCategory,
} from '../services/devicePlatformService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  Smartphone,
  Tablet,
  Monitor,
  Cpu,
  Download,
  CheckCircle2,
  Share,
  Sparkles,
  Sliders,
  X,
  Maximize2,
  RefreshCw,
  ExternalLink,
  Layers,
  Touchpad,
  Keyboard,
  Shield,
  Zap,
  Check,
  Tv,
} from 'lucide-react';

interface DevicePlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  scale: number;
  onScaleChange: (newScale: number) => void;
  density: 'compact' | 'standard' | 'touch';
  onDensityChange: (newDensity: 'compact' | 'standard' | 'touch') => void;
  contrastMode: 'standard' | 'high-contrast';
  onContrastModeChange: (newMode: 'standard' | 'high-contrast') => void;
  onApplyDeviceMode?: (mode: DeviceCategory) => void;
}

export const DevicePlatformModal: React.FC<DevicePlatformModalProps> = ({
  isOpen,
  onClose,
  scale,
  onScaleChange,
  density,
  onDensityChange,
  contrastMode,
  onContrastModeChange,
  onApplyDeviceMode,
}) => {
  const [diagnostics, setDiagnostics] = useState<DeviceDiagnostics>(getDeviceDiagnostics);
  const [activePresetId, setActivePresetId] = useState<string>(() => getActiveDesktopResolution().id);
  const [isSimulateRes, setIsSimulateRes] = useState<boolean>(isDesktopResolutionSimulationActive);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDiagnostics(getDeviceDiagnostics());
    setActivePresetId(getActiveDesktopResolution().id);
    setIsSimulateRes(isDesktopResolutionSimulationActive());

    const handleResize = () => setDiagnostics(getDeviceDiagnostics());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectResolutionPreset = (preset: DesktopResolutionPreset) => {
    playExecutionChime();
    setActiveDesktopResolution(preset.id);
    setActivePresetId(preset.id);
    setDiagnostics(getDeviceDiagnostics());

    // Calibrate UI scale for the resolution: 1920x1200 gets 100% (1.00) scale
    if (preset.id === '16-fhd-plus-1920x1200-wva') {
      onScaleChange(1.0);
      onDensityChange('standard');
    } else if (preset.width > 2000) {
      onScaleChange(1.1);
      onDensityChange('compact');
    }
  };

  const handleToggleSimulation = () => {
    playKeyClick();
    const next = !isSimulateRes;
    setIsSimulateRes(next);
    setDesktopResolutionSimulationActive(next);
    setDiagnostics(getDeviceDiagnostics());
  };

  const handleApply16InchFHDPlus = () => {
    playExecutionChime();
    setActiveDesktopResolution('16-fhd-plus-1920x1200-wva');
    setActivePresetId('16-fhd-plus-1920x1200-wva');
    setDeviceCategoryOverride('desktop');
    const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const h = typeof window !== 'undefined' ? window.innerHeight : 1200;
    const optimalScale = Math.min(w / 1920, h / 1200);
    const targetScale = Math.max(0.40, Math.min(1.0, Number(optimalScale.toFixed(2))));
    onScaleChange(targetScale);
    onDensityChange(targetScale < 0.85 ? 'compact' : 'standard');
    setDiagnostics(getDeviceDiagnostics());
    if (onApplyDeviceMode) {
      onApplyDeviceMode('desktop');
    }
  };

  const handleSelectMode = (mode: DeviceCategory) => {
    playExecutionChime();
    setDeviceCategoryOverride(mode);
    setDiagnostics(getDeviceDiagnostics());

    // Apply auto-density matching the device
    if (mode === 'smartphone') {
      onDensityChange('touch');
      onScaleChange(0.9);
    } else if (mode === 'tablet') {
      onDensityChange('standard');
      onScaleChange(0.95);
    } else {
      // Desktop defaults to 16" Full HD+ 1920x1200 WVA 100% scale
      setActiveDesktopResolution('16-fhd-plus-1920x1200-wva');
      setActivePresetId('16-fhd-plus-1920x1200-wva');
      onDensityChange('standard');
      onScaleChange(1.0);
    }

    if (onApplyDeviceMode) {
      onApplyDeviceMode(mode);
    }
  };

  const handleResetAuto = () => {
    playKeyClick();
    setDeviceCategoryOverride(null);
    setDiagnostics(getDeviceDiagnostics());
  };

  const handleTriggerInstall = async () => {
    playKeyClick();
    const ok = await install();
    if (ok) {
      setInstallSuccess(true);
      playExecutionChime();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0b0e17] border border-[#22304d] rounded-lg shadow-2xl max-w-2xl w-full text-[#e2e8f0] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-[#22304d] shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.svg"
              alt="StrikePoint"
              className="w-8 h-8 rounded-lg border border-[#00d2ff]/40 p-0.5 bg-[#0a0e17] object-contain shadow-[0_0_8px_rgba(0,210,255,0.3)] shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#00d2ff] bg-[#00d2ff]/10 px-1.5 py-0.2 rounded border border-[#00d2ff]/30 uppercase font-mono">
                  CROSS-PLATFORM ENGINE
                </span>
                <span className="text-[10px] text-[#8b9bb4] font-mono">LINUX • WINDOWS • SMARTPHONES • TABLETS • PC</span>
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                MULTI-PLATFORM &amp; MULTI-DEVICE SUITE
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded hover:bg-[#1e293b] text-[#94a3b8] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* 1. Live Detected Hardware & OS Radar */}
          <div className="bg-[#0e1424] border border-[#1e2c47] rounded-md p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#ffd600]" />
                CURRENT HARDWARE &amp; OPERATING SYSTEM
              </span>
              <button
                onClick={handleResetAuto}
                className="text-[10px] text-[#00d2ff] hover:underline flex items-center gap-1 font-mono"
                title="Reset to automatic browser device detection"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Auto Detect
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              {/* OS Badge */}
              <div className="bg-[#080c16] p-2.5 rounded border border-[#1b263b]">
                <span className="text-[9.5px] text-[#64748b] block mb-0.5">PLATFORM / OS</span>
                <span className="text-sm font-bold text-[#00d2ff] flex items-center gap-1.5">
                  {diagnostics.os}
                </span>
                <span className="text-[9px] text-[#94a3b8] truncate block mt-0.5" title={diagnostics.osDetails}>
                  {diagnostics.osDetails}
                </span>
              </div>

              {/* Device Category */}
              <div className="bg-[#080c16] p-2.5 rounded border border-[#1b263b]">
                <span className="text-[9.5px] text-[#64748b] block mb-0.5">DEVICE CLASS</span>
                <span className="text-sm font-bold text-[#10b981] capitalize flex items-center gap-1.5">
                  {diagnostics.deviceCategory === 'smartphone' && <Smartphone className="w-4 h-4" />}
                  {diagnostics.deviceCategory === 'tablet' && <Tablet className="w-4 h-4" />}
                  {diagnostics.deviceCategory === 'desktop' && <Monitor className="w-4 h-4" />}
                  {diagnostics.deviceCategory}
                </span>
                <span className="text-[9px] text-[#94a3b8] block mt-0.5">
                  {diagnostics.isTouchDevice ? `Touch (${diagnostics.maxTouchPoints} pts)` : 'Mouse / Trackpad'}
                </span>
              </div>

              {/* Viewport Resolution */}
              <div className="bg-[#080c16] p-2.5 rounded border border-[#1b263b]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9.5px] text-[#64748b]">VIEWPORT RESOLUTION</span>
                  {diagnostics.deviceCategory === 'desktop' && (
                    <span className="text-[8.5px] px-1 py-0.2 rounded bg-[#00d2ff]/20 text-[#00d2ff] font-mono font-bold">
                      16:10 FHD+
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  {diagnostics.screenWidth} × {diagnostics.screenHeight}
                </span>
                <span className="text-[9px] text-[#94a3b8] block mt-0.5 truncate" title={diagnostics.desktopResolutionName || '(16") Full HD+ 1920 x 1200 WVA'}>
                  {diagnostics.deviceCategory === 'desktop' ? '(16") FHD+ 1920×1200 WVA' : `${diagnostics.orientation.toUpperCase()} • ${diagnostics.devicePixelRatio}x DPR`}
                </span>
              </div>

              {/* Installation Mode */}
              <div className="bg-[#080c16] p-2.5 rounded border border-[#1b263b]">
                <span className="text-[9.5px] text-[#64748b] block mb-0.5">PWA / RUNTIME</span>
                <span className={`text-sm font-bold flex items-center gap-1 ${
                  diagnostics.isPWA || isInstalled ? 'text-[#10b981]' : 'text-[#f59e0b]'
                }`}>
                  {diagnostics.isPWA || isInstalled ? 'NATIVE PWA' : 'BROWSER TAB'}
                </span>
                <span className="text-[9px] text-[#94a3b8] block mt-0.5 truncate">
                  {diagnostics.browserName}
                </span>
              </div>
            </div>
          </div>

          {/* 2. One-Click Device Layout Switcher */}
          <div className="bg-[#0e1424] border border-[#1e2c47] rounded-md p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#38bdf8]" />
                DEVICE ADAPTIVE LAYOUT PRESETS
              </span>
              <span className="text-[10px] text-[#64748b]">Click any mode to adapt layout instantly</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Preset 1: Smartphone */}
              <button
                type="button"
                onClick={() => handleSelectMode('smartphone')}
                className={`p-3 rounded-md border text-left transition-all relative overflow-hidden group ${
                  diagnostics.deviceCategory === 'smartphone'
                    ? 'bg-[#10b981]/15 border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : 'bg-[#080c16] border-[#1b263b] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className={`w-5 h-5 ${
                      diagnostics.deviceCategory === 'smartphone' ? 'text-[#10b981]' : 'text-[#8b9bb4]'
                    }`} />
                    <span className="font-bold text-white text-xs">SMARTPHONE</span>
                  </div>
                  {diagnostics.deviceCategory === 'smartphone' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#10b981] text-[#052e16] font-bold font-mono">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-[#94a3b8] leading-relaxed">
                  Single-column cards, thumb-friendly 44px touch targets, fixed bottom navigation dock, and auto-adjusted table swipe.
                </p>
                <div className="mt-2 text-[9px] text-[#64748b] font-mono">
                  • iPhone, Samsung Galaxy, Pixel
                </div>
              </button>

              {/* Preset 2: Tablet */}
              <button
                type="button"
                onClick={() => handleSelectMode('tablet')}
                className={`p-3 rounded-md border text-left transition-all relative overflow-hidden group ${
                  diagnostics.deviceCategory === 'tablet'
                    ? 'bg-[#00d2ff]/15 border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.25)]'
                    : 'bg-[#080c16] border-[#1b263b] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Tablet className={`w-5 h-5 ${
                      diagnostics.deviceCategory === 'tablet' ? 'text-[#00d2ff]' : 'text-[#8b9bb4]'
                    }`} />
                    <span className="font-bold text-white text-xs">TABLET / HYBRID</span>
                  </div>
                  {diagnostics.deviceCategory === 'tablet' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00d2ff] text-black font-bold font-mono">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-[#94a3b8] leading-relaxed">
                  2-column responsive grid, balanced touch spacing, collapsible option chains, and portrait/landscape orientation support.
                </p>
                <div className="mt-2 text-[9px] text-[#64748b] font-mono">
                  • iPad, iPad Air, Surface Pro, Galaxy Tab
                </div>
              </button>

              {/* Preset 3: Desktop PC */}
              <button
                type="button"
                onClick={() => handleSelectMode('desktop')}
                className={`p-3 rounded-md border text-left transition-all relative overflow-hidden group ${
                  diagnostics.deviceCategory === 'desktop'
                    ? 'bg-[#ff9900]/15 border-[#ff9900] shadow-[0_0_15px_rgba(255,153,0,0.25)]'
                    : 'bg-[#080c16] border-[#1b263b] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Monitor className={`w-5 h-5 ${
                      diagnostics.deviceCategory === 'desktop' ? 'text-[#ff9900]' : 'text-[#8b9bb4]'
                    }`} />
                    <span className="font-bold text-white text-xs">DESKTOP (16" FHD+ 1920×1200 WVA)</span>
                  </div>
                  {diagnostics.deviceCategory === 'desktop' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ff9900] text-black font-bold font-mono">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-[#94a3b8] leading-relaxed">
                  High-density Bloomberg terminal matrix, floating pop-out multi-windows, full F1-F12 keys, and command-line entry.
                </p>
                <div className="mt-2 text-[9px] text-[#00d2ff] font-mono">
                  • (16") Full HD+ 1920 × 1200 WVA (16:10 Wide Viewing Angle)
                </div>
              </button>
            </div>
          </div>

          {/* 3. Desktop Resolution & Display Specification Center */}
          <div className="bg-[#0e1424] border border-[#1e2c47] rounded-md p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-[#00d2ff]" />
                DESKTOP RESOLUTION &amp; DISPLAY PROFILE (16" FULL HD+ 1920 × 1200 WVA)
              </span>
              <span className="text-[10px] font-mono text-[#00d2ff] bg-[#00d2ff]/10 px-2 py-0.5 rounded border border-[#00d2ff]/30">
                16:10 WUXGA WVA
              </span>
            </div>

            {/* Main 16" FHD+ 1920x1200 Feature Card */}
            <div className="bg-[#080d1a] border border-[#00d2ff]/40 rounded-md p-3 mb-3 shadow-[0_0_15px_rgba(0,210,255,0.1)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-[#00d2ff] shrink-0 mt-0.5">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs">
                        (16") Full HD+ 1920 × 1200 WVA
                      </span>
                      <span className="px-1.5 py-0.2 bg-[#00e676]/20 text-[#00e676] text-[9px] font-mono font-bold rounded border border-[#00e676]/30">
                        FLAGSHIP DESKTOP RESOLUTION
                      </span>
                      {activePresetId === '16-fhd-plus-1920x1200-wva' && (
                        <span className="px-1.5 py-0.2 bg-[#ff9900]/20 text-[#ff9900] text-[9px] font-mono font-bold rounded border border-[#ff9900]/30">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-1 leading-relaxed">
                      16.0-inch 16:10 WUXGA anti-glare display with Wide Viewing Angle (WVA). Delivers +11.1% extra vertical workspace compared to standard 1080p 16:9, rendering full 20+ strike option chains without vertical clipping.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono text-[9.5px]">
                      <div className="bg-[#0e1628] px-2 py-1 rounded border border-[#1e2a44]">
                        <span className="text-[#64748b] block text-[8.5px]">RESOLUTION:</span>
                        <span className="text-white font-bold">1920 × 1200 px</span>
                      </div>
                      <div className="bg-[#0e1628] px-2 py-1 rounded border border-[#1e2a44]">
                        <span className="text-[#64748b] block text-[8.5px]">ASPECT RATIO:</span>
                        <span className="text-[#00d2ff] font-bold">16:10 (+11% H)</span>
                      </div>
                      <div className="bg-[#0e1628] px-2 py-1 rounded border border-[#1e2a44]">
                        <span className="text-[#64748b] block text-[8.5px]">PANEL TYPE:</span>
                        <span className="text-[#ffd600] font-bold">WVA Anti-Glare</span>
                      </div>
                      <div className="bg-[#0e1628] px-2 py-1 rounded border border-[#1e2a44]">
                        <span className="text-[#64748b] block text-[8.5px]">PIXEL DENSITY:</span>
                        <span className="text-[#00e676] font-bold">~142 PPI (100% Scale)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleApply16InchFHDPlus}
                    className="px-3.5 py-2 bg-[#00d2ff] hover:bg-[#00b4db] text-black font-extrabold rounded text-xs transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    APPLY 1920×1200 WVA
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleSimulation}
                    className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                      isSimulateRes
                        ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/50'
                        : 'bg-[#141b28] text-[#8b9bb4] hover:text-white border-[#222d44]'
                    }`}
                    title="Toggle canvas simulation for 1920x1200 on smaller windows"
                  >
                    <span>{isSimulateRes ? '● SIMULATION ACTIVE' : '○ SIMULATE 1920×1200'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Desktop Resolution Presets Grid */}
            <div className="text-[10px] text-[#8b9bb4] font-bold mb-1.5 uppercase">
              ALL DESKTOP DISPLAY RESOLUTION PRESETS:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {DESKTOP_RESOLUTION_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectResolutionPreset(preset)}
                    className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00d2ff]/15 border-[#00d2ff] shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                        : 'bg-[#080c16] border-[#1b263b] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-[11px] ${isSelected ? 'text-[#00d2ff]' : 'text-white'}`}>
                        {preset.shortName}
                      </span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-[#00d2ff]" />
                      )}
                    </div>
                    <div className="text-[9.5px] text-[#64748b] font-mono">
                      {preset.width} × {preset.height} ({preset.aspectRatio})
                    </div>
                    <div className="text-[9px] text-[#94a3b8] mt-1 line-clamp-2">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Native App Installation Station (Linux, Windows, Android, iOS) */}
          <div className="bg-[#0e1424] border border-[#1e2c47] rounded-md p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-[#10b981]" />
                NATIVE INSTALLATION &amp; STANDALONE PWA
              </span>
              <span className="text-[10px] font-mono text-[#10b981]">SECURE HTTPS SHELL</span>
            </div>

            {/* If install prompt is ready */}
            {isInstallable ? (
              <div className="bg-[#10b981]/10 border border-[#10b981]/40 rounded p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <img src="/icon.svg" alt="StrikePoint" className="w-5 h-5 object-contain rounded" />
                    Install StrikePoint to {diagnostics.os} Desktop / Home Screen
                  </h4>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5">
                    Launches instantly without browser address bars, enables offline caching, and runs with native GPU acceleration.
                  </p>
                </div>
                <button
                  onClick={handleTriggerInstall}
                  className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-[#052e16] font-bold rounded shadow transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  INSTALL NOW
                </button>
              </div>
            ) : isInstalled ? (
              <div className="bg-[#10b981]/15 border border-[#10b981]/40 rounded p-3 flex items-center gap-2.5 text-[#10b981]">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold text-white block">StrikePoint is Running in Native Standalone App Mode</span>
                  <span className="text-[11px] text-[#94a3b8]">
                    Full-screen hardware acceleration and local cache persistence active on this device.
                  </span>
                </div>
              </div>
            ) : isIOS ? (
              /* iOS Safari guided instructions */
              <div className="bg-[#1e293b]/60 border border-[#334155] rounded p-3 space-y-2">
                <div className="flex items-center gap-2 text-[#38bdf8] font-bold">
                  <Share className="w-4 h-4" />
                  How to Install on iPhone &amp; iPad (iOS Safari):
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#cbd5e1] ml-1">
                  <li>Tap the <strong>Share</strong> button (<Share className="w-3 h-3 inline mx-0.5 text-[#38bdf8]" />) in Safari's bottom toolbar.</li>
                  <li>Scroll down and select <strong>"Add to Home Screen"</strong> (<span className="text-white font-mono font-bold">+</span>).</li>
                  <li>Tap <strong>"Add"</strong> in the top-right corner. StrikePoint will open as a full-screen native iOS app!</li>
                </ol>
              </div>
            ) : (
              /* Windows / Linux / Android browser guidance */
              <div className="bg-[#080c16] border border-[#1b263b] rounded p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="font-bold text-[#00d2ff] block mb-1">
                      🐧 Linux &amp; Chrome / Brave / Firefox:
                    </span>
                    <p className="text-[#94a3b8] leading-relaxed">
                      Click the <strong>Install Icon</strong> (<Download className="w-3 h-3 inline text-[#00d2ff]" />) on the right side of the address bar, or open the browser menu (⋮) and select <strong>"Install StrikePoint..."</strong> to pin the high-resolution icon to your desktop &amp; application launcher.
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-[#ffd600] block mb-1">
                      🪟 Windows 10/11 &amp; Microsoft Edge:
                    </span>
                    <p className="text-[#94a3b8] leading-relaxed">
                      Click the <strong>App Available</strong> icon in the Edge address bar, or click Menu ➔ <strong>Apps ➔ Install this site as an app</strong> to pin the large StrikePoint icon directly to your Windows Desktop, Taskbar, and Start Menu.
                    </p>
                  </div>
                </div>

                {/* Desktop Icon & Asset Preview for PC Shortcut */}
                <div className="pt-2 border-t border-[#1b263b] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1527]/50 -mx-3 -mb-3 p-3 rounded-b">
                  <div className="flex items-center gap-3">
                    <img
                      src="/pwa-512x512.png"
                      alt="StrikePoint Desktop Icon"
                      className="w-12 h-12 rounded-xl border border-[#00d2ff]/40 shadow-lg shadow-[#00d2ff]/10 shrink-0"
                    />
                    <div>
                      <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <span>STRIKEPOINT HIGH-RES DESKTOP ICON (512×512)</span>
                        <span className="px-1.5 py-0.2 bg-[#10b981]/20 text-[#10b981] text-[9px] rounded font-mono">VISIBLE PC ICON</span>
                      </div>
                      <div className="text-[10px] text-[#94a3b8] mt-0.5">
                        Configured for Windows desktop shortcuts, taskbar pins, and macOS docks.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href="/favicon.ico"
                      download="strikepoint-desktop.ico"
                      className="px-2.5 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-white rounded text-[10px] font-mono flex items-center gap-1 border border-[#334155] transition-colors"
                      title="Download Windows .ico icon file"
                    >
                      <Download className="w-3 h-3 text-[#ff9900]" />
                      <span>.ICO FILE</span>
                    </a>
                    <a
                      href="/pwa-512x512.png"
                      download="strikepoint-512x512.png"
                      className="px-2.5 py-1.5 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 text-[#00d2ff] rounded text-[10px] font-mono font-bold flex items-center gap-1 border border-[#00d2ff]/40 transition-colors"
                      title="Download full 512x512 PNG icon for desktop shortcut"
                    >
                      <Download className="w-3 h-3" />
                      <span>512px PNG</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Display Scale & Ergonomics Fine-Tuning */}
          <div className="bg-[#0e1424] border border-[#1e2c47] rounded-md p-3.5">
            <span className="text-[10px] font-bold text-[#8b9bb4] uppercase tracking-wider block mb-2">
              ERGONOMICS &amp; VISUAL ACCESSIBILITY
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Density */}
              <div className="bg-[#080c16] p-2.5 rounded border border-[#1b263b]">
                <span className="text-[10px] text-[#8b9bb4] block mb-1.5 font-bold">TOUCH TARGET DENSITY:</span>
                <div className="flex items-center gap-1">
                  {(['compact', 'standard', 'touch'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        playKeyClick();
                        onDensityChange(d);
                      }}
                      className={`flex-1 py-1 rounded text-[10.5px] font-bold capitalize transition-all ${
                        density === d
                          ? 'bg-[#00d2ff] text-black font-extrabold shadow'
                          : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* UI Scale */}
              <div className="bg-[#080c16] p-2.5 rounded border border-[#1b263b]">
                <div className="flex justify-between items-center text-[10px] text-[#8b9bb4] mb-1.5 font-bold">
                  <span>UI SCALE:</span>
                  <span className="font-mono text-white">{Math.round(scale * 100)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0.82, 0.9, 1.0, 1.1].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        playKeyClick();
                        onScaleChange(s);
                      }}
                      className={`flex-1 py-1 rounded text-[10.5px] font-bold transition-all ${
                        Math.abs(scale - s) < 0.03
                          ? 'bg-[#ffd600] text-black font-extrabold shadow'
                          : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {Math.round(s * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* OLED High Contrast */}
              <div className="bg-[#080c16] p-2.5 rounded border border-[#1b263b]">
                <span className="text-[10px] text-[#8b9bb4] block mb-1.5 font-bold">OLED CONTRAST:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      playKeyClick();
                      onContrastModeChange('standard');
                    }}
                    className={`flex-1 py-1 rounded text-[10.5px] font-bold transition-all ${
                      contrastMode === 'standard'
                        ? 'bg-[#3b82f6] text-white font-extrabold shadow'
                        : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      onContrastModeChange('high-contrast');
                    }}
                    className={`flex-1 py-1 rounded text-[10.5px] font-bold transition-all ${
                      contrastMode === 'high-contrast'
                        ? 'bg-[#10b981] text-black font-extrabold shadow'
                        : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    High Contrast
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#0f172a] border-t border-[#22304d] flex items-center justify-between shrink-0">
          <div className="text-[10px] text-[#64748b] font-mono">
            STRIKEPOINT CROSS-PLATFORM v26.4 • PWA REGISTERED
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-[#00d2ff] hover:bg-[#00b4db] text-black font-bold rounded text-xs transition-colors"
          >
            APPLY &amp; RETURN TO TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
};
