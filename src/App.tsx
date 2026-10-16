import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Ticker,
  TradeLeg,
  Order,
  Position,
  AccountState,
  ExpirationOptionChain,
  TerminalScreen,
  MacroIndexQuote,
  UnusualFlowItem,
} from './types/options';
import {
  INITIAL_TICKERS,
  INITIAL_MACRO_INDICES,
  INITIAL_FLOW_SEED,
  INITIAL_PORTFOLIO_POSITIONS,
  INITIAL_ACCOUNT_ORDERS,
  generateRandomFlowItem,
  generateOptionsChainForTicker,
  generateAllOptionChainsForTicker,
  EXPIRATION_PRESETS,
} from './services/marketData';
import { OptionsMatrixOMON } from './components/OptionsMatrixOMON';
import { OptionsValuationOVME } from './components/OptionsValuationOVME';
import { RiskProfileView } from './components/RiskProfileView';
import { ProbabilityConeCONE } from './components/ProbabilityConeCONE';
import { ScenarioMatrixSCEN } from './components/ScenarioMatrixSCEN';
import { UnusualFlowTapeFLOW } from './components/UnusualFlowTapeFLOW';
import { VolatilityLabView } from './components/VolatilityLabView';
import { VolatilitySurface3D } from './components/VolatilitySurface3D';
import { HistoricalImpliedVolChart } from './components/HistoricalImpliedVolChart';
import { TechnicalsChart } from './components/TechnicalsChart';
import { PositionsPortfolioView } from './components/PositionsPortfolioView';
import { PositionMonitorView } from './components/PositionMonitorView';
import { AccountStatementView } from './components/AccountStatementView';
import { PutCallRatioView } from './components/PutCallRatioView';
import { HelpTerminalModal } from './components/HelpTerminalModal';
import { EarningsCalendarSidebar } from './components/EarningsCalendarSidebar';
import { StockTradeModal } from './components/StockTradeModal';
import { OPECMeetingsView } from './components/OPECMeetingsView';
import { TariffTrackerView } from './components/TariffTrackerView';
import { OptionsAnalysisSidebarGadget } from './components/OptionsAnalysisSidebarGadget';
import { CountryRiskModal } from './components/CountryRiskModal';
import { ExpectedMoveModal } from './components/ExpectedMoveModal';
import { StrategyCatalogModal } from './components/StrategyCatalogModal';
import { DefconLevelView } from './components/DefconLevelView';
import { CanadianAccountsModal } from './components/CanadianAccountsModal';
import { NetGammaModal } from './components/NetGammaModal';
import { GitHubSyncModal } from './components/GitHubSyncModal';
import { DisplaySettingsModal, DisplayDensity, TextLegibility, ContrastMode } from './components/DisplaySettingsModal';
import { VegaTermStructureView } from './components/VegaTermStructureView';
import { YieldCurveView } from './components/YieldCurveView';
import { GlobalMacroView } from './components/GlobalMacroView';
import { DividendTrackerView } from './components/DividendTrackerView';
import { QuadrupleWitchingView } from './components/QuadrupleWitchingView';
import { QuadrupleWitchingModal } from './components/QuadrupleWitchingModal';
import { OptionsExpirationView } from './components/OptionsExpirationView';
import { BNNLiveStreamingView } from './components/BNNLiveStreamingView';
import { FuturesTermStructureView } from './components/FuturesTermStructureView';
import { VolatilitySkewFinderView } from './components/VolatilitySkewFinderView';
import { StrategyTradeJournalView } from './components/StrategyTradeJournalView';
import { OptionsEducationView } from './components/OptionsEducationView';
import { logTradeToJournal, closeJournalTrade } from './services/tradeJournalService';
import { GICSCanadaView } from './components/GICSCanadaView';
import { CompanyProfileView } from './components/CompanyProfileView';
import { isTickerETF } from './services/companyAndEtfProfiles';
import { FloatingBNNStreamWidget } from './components/FloatingBNNStreamWidget';
import { FloatingDisplayWidget } from './components/FloatingDisplayWidget';
import { BiometricLoginModal } from './components/BiometricLoginModal';
import { DevicePlatformModal } from './components/DevicePlatformModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileToolsDrawerModal } from './components/MobileToolsDrawerModal';
import { getDeviceDiagnostics, getActiveDesktopResolution, DeviceDiagnostics, DeviceCategory } from './services/devicePlatformService';
import { PopOutWindowManager, PopOutWindow } from './components/PopOutWindowManager';
import { OptionMarketDepthModal } from './components/OptionMarketDepthModal';
import { StrategyTradeExecutionModal } from './components/StrategyTradeExecutionModal';
import { INITIAL_CANADIAN_ACCOUNTS, CanadianAccount } from './services/canadianAccounts';
import { ALL_OPTIONS_STRATEGIES, generateStrategyLegs } from './services/optionsStrategies';
import { TSXFuturesHubModal } from './components/TSXFuturesHubModal';
import { ExchangeClockBellModal, TIME_ZONE_OPTIONS } from './components/ExchangeClockBellModal';
import { WatchlistSidebarGadget } from './components/WatchlistSidebarGadget';
import { WatchlistBlotterModal } from './components/WatchlistBlotterModal';
import { calculateNetGammaAnalysis } from './services/gammaAnalytics';
import { calculateBSM } from './utils/blackScholes';
import {
  playTickBlip,
  playKeyClick,
  playExecutionChime,
  playOpeningBell,
  playClosingBell,
  playMarketTriggerAlert,
  isTerminalAudioEnabled,
  setTerminalAudioEnabled
} from './utils/terminalSound';
import {
  Volume2,
  VolumeX,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Github,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  X,
  Fingerprint,
  ExternalLink,
  Lock,
  Unlock,
  BookOpen,
  Zap,
  Smartphone,
  Tablet,
  Monitor,
  Flame,
  ChevronRight,
  Tv,
  Calendar,
  Clock,
  Bell,
  Activity,
  PieChart,
  Wallet,
  FileText,
  Building2,
  Type,
  Folder,
  BarChart2,
  GraduationCap,
  Globe,
} from 'lucide-react';
import {
  loadPrivacySettings,
  savePrivacySettings,
  PrivacySettings,
  DEFAULT_PRIVACY_SETTINGS,
  maskCurrency,
  maskAccountIdentifier,
  maskPercentage,
} from './utils/privacy';
import { PrivacyShieldOverlay } from './components/PrivacyShieldOverlay';
import { AccountPrivacyModal } from './components/AccountPrivacyModal';

const STORAGE_KEY_ACCOUNT = 'bloomberg_options_account_v1';

export default function App() {
  const [tickers, setTickers] = useState<Record<string, Ticker>>(INITIAL_TICKERS);
  const [macroIndices, setMacroIndices] = useState<MacroIndexQuote[]>(INITIAL_MACRO_INDICES);
  const [flowItems, setFlowItems] = useState<UnusualFlowItem[]>(INITIAL_FLOW_SEED);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('SPY');
  const [currentScreen, setCurrentScreen] = useState<TerminalScreen>('omon');
  const [activeDte, setActiveDte] = useState<number>(17);
  const [selectedExpMonth, setSelectedExpMonth] = useState<string>('ALL');
  const [builderLegs, setBuilderLegs] = useState<TradeLeg[]>([]);
  const [isLiveTickActive, setIsLiveTickActive] = useState<boolean>(true);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isGitHubOpen, setIsGitHubOpen] = useState<boolean>(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState<boolean>(false);
  const [displaySettingsTab, setDisplaySettingsTab] = useState<'display' | 'audio' | 'device'>('display');
  const [monitorSubTab, setMonitorSubTab] = useState<'positions' | 'portfolio' | 'statement' | 'tfsa_rrsp'>('positions');
  const [macroSubTab, setMacroSubTab] = useState<'economies' | 'yield_curve' | 'tariff' | 'defcon' | 'geopolitical' | 'central_banks' | 'opec' | 'regime' | 'inflation' | 'calendar' | 'simulator'>('economies');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Screen Scaling & Display Customization State
  const [scale, setScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('strikepoint_ui_scale');
      if (saved) return Number(saved);
      if (typeof window !== 'undefined') {
        const activeRes = getActiveDesktopResolution();
        const baseW = window.innerWidth < 640 ? Math.max(380, window.innerWidth) : activeRes.width;
        const baseH = window.innerHeight < 640 ? Math.max(660, window.innerHeight) : activeRes.height;
        const opt = Math.min(window.innerWidth / baseW, window.innerHeight / baseH);
        return Math.max(0.40, Math.min(1.40, Number(opt.toFixed(2))));
      }
    } catch {}
    return 1.0;
  });

  const [density, setDensity] = useState<DisplayDensity>(() => {
    try {
      const saved = localStorage.getItem('strikepoint_density');
      if (saved === 'compact' || saved === 'standard' || saved === 'touch') return saved;
      if (typeof window !== 'undefined' && window.innerWidth < 768) return 'touch';
    } catch {}
    return 'standard';
  });

  const [textLegibility, setTextLegibility] = useState<TextLegibility>(() => {
    try {
      const saved = localStorage.getItem('strikepoint_text_legibility');
      if (saved === 'standard' || saved === 'large' || saved === 'xlarge') return saved;
      if (typeof window !== 'undefined' && window.innerWidth < 768) return 'large';
    } catch {}
    return 'standard';
  });

  const [contrastMode, setContrastMode] = useState<ContrastMode>(() => {
    try {
      const saved = localStorage.getItem('strikepoint_contrast_mode');
      if (saved === 'standard' || saved === 'high-contrast') return saved;
    } catch {}
    return 'standard';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('strikepoint_sidebar_open');
      if (saved !== null) return saved === 'true';
    } catch {}
    return false; // Hidden by default when not in use to make screen bigger!
  });

  const [sidebarActiveTab, setSidebarActiveTab] = useState<'watchlist' | 'strategies' | 'analysis' | 'earnings'>('watchlist');

  const [isCountryRiskOpen, setIsCountryRiskOpen] = useState<boolean>(false);
  const [isStockTradeOpen, setIsStockTradeOpen] = useState<boolean>(false);
  const [isStockTradeFractional, setIsStockTradeFractional] = useState<boolean>(false);
  const [isExpectedMoveOpen, setIsExpectedMoveOpen] = useState<boolean>(false);
  const [isStrategyCatalogOpen, setIsStrategyCatalogOpen] = useState<boolean>(false);
  const [isCanadianSuiteOpen, setIsCanadianSuiteOpen] = useState<boolean>(false);
  const [isNetGammaOpen, setIsNetGammaOpen] = useState<boolean>(false);
  const [isQuadWitchingOpen, setIsQuadWitchingOpen] = useState<boolean>(false);
  const [isTSXFuturesHubOpen, setIsTSXFuturesHubOpen] = useState<boolean>(false);
  const [isBnnPipOpen, setIsBnnPipOpen] = useState<boolean>(false);
  const [canadianAccounts, setCanadianAccounts] = useState<CanadianAccount[]>(INITIAL_CANADIAN_ACCOUNTS);
  const [activeCanadianAccountId, setActiveCanadianAccountId] = useState<string>('act-margin-cad');
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState<boolean>(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(false);
  const [isMarketDepthOpen, setIsMarketDepthOpen] = useState<boolean>(false);
  const [isStrategyExecutionOpen, setIsStrategyExecutionOpen] = useState<boolean>(false);
  const [marketDepthContract, setMarketDepthContract] = useState<{ type: 'call' | 'put'; strike: number } | null>(null);
  const [popOutWindows, setPopOutWindows] = useState<PopOutWindow[]>([]);
  const [watchlistCategory, setWatchlistCategory] = useState<'all' | 'equity' | 'future' | 'cad' | 'tsxfut'>('all');
  const [commandInput, setCommandInput] = useState<string>('SPY US Equity OMON');
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);
  const [isClockBellModalOpen, setIsClockBellModalOpen] = useState<boolean>(false);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState<boolean>(false);
  const [timeZoneId, setTimeZoneId] = useState<string>(() => {
    return localStorage.getItem('strikepoint_timezone') || 'et';
  });
  const [useAmPm, setUseAmPm] = useState<boolean>(() => {
    const saved = localStorage.getItem('strikepoint_use_ampm');
    return saved !== null ? saved === 'true' : true; // Default to 12-hour AM/PM as requested
  });
  const [clockTime, setClockTime] = useState<{ est: string; utc: string }>(() => {
    const now = new Date();
    const savedTz = localStorage.getItem('strikepoint_timezone') || 'et';
    const tzOpt = TIME_ZONE_OPTIONS.find((t) => t.id === savedTz) || TIME_ZONE_OPTIONS[0];
    const savedAmPm = localStorage.getItem('strikepoint_use_ampm');
    const amPmBool = savedAmPm !== null ? savedAmPm === 'true' : true;
    const utcStr = now.toUTCString().split(' ')[4] + ' UTC';
    const mainStr = now.toLocaleTimeString('en-US', {
      timeZone: tzOpt.zone,
      hour12: amPmBool,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ` ${tzOpt.label}`;
    return { utc: utcStr, est: mainStr };
  });
  const [isAutoBellEnabled, setIsAutoBellEnabled] = useState<boolean>(() => {
    return localStorage.getItem('strikepoint_autobell') === 'true';
  });

  // Account Privacy & Stealth Mode States
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(loadPrivacySettings);
  const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isAutoFitActive, setIsAutoFitActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('strikepoint_auto_fit');
      if (saved !== null) return saved === 'true';
      return true;
    } catch {
      return true;
    }
  });

  // Multi-Platform & Multi-Device States (Linux, Windows, Smartphones, Tablets, PC)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [deviceDiagnostics, setDeviceDiagnostics] = useState<DeviceDiagnostics>(getDeviceDiagnostics);

  useEffect(() => {
    const handleDeviceUpdate = () => {
      setDeviceDiagnostics(getDeviceDiagnostics());
    };
    window.addEventListener('resize', handleDeviceUpdate);
    window.addEventListener('orientationchange', handleDeviceUpdate);
    return () => {
      window.removeEventListener('resize', handleDeviceUpdate);
      window.removeEventListener('orientationchange', handleDeviceUpdate);
    };
  }, []);

  // Initialize Account from LocalStorage or default
  const [account, setAccount] = useState<AccountState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.positions) && parsed.positions.length > 0) {
          // Ensure every position has entryIV backfilled if previously undefined
          const hydratedPositions = parsed.positions.map((p: any) => {
            if (p.entryIV !== undefined && p.entryIV > 0) return p;
            const seedMatch = INITIAL_PORTFOLIO_POSITIONS.find((s) => s.id === p.id);
            const entryIV = seedMatch?.entryIV ?? (p.legs?.[0]?.iv > 0 ? p.legs[0].iv : (INITIAL_TICKERS[p.ticker]?.currentIV || 0.25));
            return {
              ...p,
              entryIV,
              tradeIV: entryIV,
              legs: p.legs?.map((l: any) => ({
                ...l,
                iv: (l.iv !== undefined && l.iv > 0) ? l.iv : entryIV,
              })) || [],
            };
          });

          // Ensure orders array has entries
          const orders = Array.isArray(parsed.orders) && parsed.orders.length > 0
            ? parsed.orders.map((o: any) => ({
                ...o,
                entryIV: o.entryIV ?? (INITIAL_TICKERS[o.ticker]?.currentIV || 0.25),
                tradeIV: o.tradeIV ?? (INITIAL_TICKERS[o.ticker]?.currentIV || 0.25),
              }))
            : INITIAL_ACCOUNT_ORDERS;

          return {
            ...parsed,
            positions: hydratedPositions,
            orders,
          };
        }
        // If saved account had no positions, seed initial stock & futures positions
        return {
          ...parsed,
          positions: INITIAL_PORTFOLIO_POSITIONS,
          orders: INITIAL_ACCOUNT_ORDERS,
        };
      }
    } catch {
      // fallback
    }
    return {
      cashBalance: 100000.0,
      startingBalance: 100000.0,
      realizedPnL: 0,
      positions: INITIAL_PORTFOLIO_POSITIONS,
      orders: INITIAL_ACCOUNT_ORDERS,
    };
  });

  // Save account changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    } catch {
      // ignore
    }
  }, [account]);

  // Apply scale and density to root document and localStorage
  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--ui-scale', String(scale));
      localStorage.setItem('strikepoint_ui_scale', String(scale));
    } catch {}
  }, [scale]);

  useEffect(() => {
    try {
      document.body.classList.remove('density-compact', 'density-touch');
      if (density !== 'standard') {
        document.body.classList.add(`density-${density}`);
      }
      localStorage.setItem('strikepoint_density', density);
    } catch {}
  }, [density]);

  const handleFitToScreen = useCallback((targetLegibility?: TextLegibility, sidebarOverride?: boolean) => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const currentLegibility = targetLegibility || textLegibility;
    const currentSidebar = sidebarOverride !== undefined ? sidebarOverride : isSidebarOpen;

    // Factor in text legibility: larger text takes more volume, so adapt target scale to fit 100% inside screen
    const fontMultiplier = currentLegibility === 'xlarge' ? 1.25 : currentLegibility === 'large' ? 1.12 : 1.0;

    const activeRes = getActiveDesktopResolution();
    // When sidebar is closed (watchlist not in use), workspace expands and needs less base width, making screen bigger!
    const effectiveTargetWidth = currentSidebar ? activeRes.width : Math.max(1000, activeRes.width - 240);
    const baseWidth = (w < 640 ? Math.max(380, w) : Math.min(effectiveTargetWidth, Math.max(1280, w))) * (fontMultiplier > 1 ? 1 + (fontMultiplier - 1) * 0.75 : 1);
    const baseHeight = (w < 640 ? Math.max(660, h) : Math.min(activeRes.height, Math.max(800, h))) * fontMultiplier;

    const scaleW = w / baseWidth;
    const scaleH = h / baseHeight;
    // Math.min ensures the entire terminal footprint stays 100% inside both width and height
    const optimal = Math.min(scaleW, scaleH);
    const clamped = Math.max(0.35, Math.min(1.40, Number(optimal.toFixed(2))));

    setScale(clamped);
    if (w < 768) {
      setDensity('touch');
    } else if (clamped < 0.85 || currentLegibility === 'xlarge') {
      setDensity('compact');
    } else {
      setDensity('standard');
    }
  }, [textLegibility, isSidebarOpen]);

  // Automatically recalculate and expand screen when watchlist sidebar opens or collapses
  useEffect(() => {
    if (isAutoFitActive) {
      handleFitToScreen(textLegibility, isSidebarOpen);
    }
  }, [isSidebarOpen, isAutoFitActive, textLegibility, handleFitToScreen]);

  const handleCycleTextLegibility = useCallback(() => {
    playKeyClick();
    setTextLegibility((prev) => {
      const next = prev === 'standard' ? 'large' : prev === 'large' ? 'xlarge' : 'standard';
      handleFitToScreen(next);
      return next;
    });
  }, [handleFitToScreen]);

  // Apply text legibility (font scaling) to body class & automatically re-fit screen
  useEffect(() => {
    try {
      document.body.classList.remove('font-large', 'font-xlarge');
      if (textLegibility === 'large') document.body.classList.add('font-large');
      if (textLegibility === 'xlarge') document.body.classList.add('font-xlarge');
      localStorage.setItem('strikepoint_text_legibility', textLegibility);
      if (isAutoFitActive) {
        handleFitToScreen(textLegibility);
      }
    } catch {}
  }, [textLegibility, isAutoFitActive, handleFitToScreen]);

  // Apply high contrast OLED black mode
  useEffect(() => {
    try {
      document.body.classList.remove('high-contrast');
      if (contrastMode === 'high-contrast') document.body.classList.add('high-contrast');
      localStorage.setItem('strikepoint_contrast_mode', contrastMode);
    } catch {}
  }, [contrastMode]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleStepZoom = (delta: number) => {
    playKeyClick();
    setScale((prev) => Math.min(1.5, Math.max(0.65, Number((prev + delta).toFixed(2)))));
  };

  const handleToggleAutoFit = useCallback(() => {
    setIsAutoFitActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('strikepoint_auto_fit', String(next));
      } catch {}
      if (next) {
        handleFitToScreen();
      }
      return next;
    });
  }, [handleFitToScreen]);

  // Window resize auto-fit listener when Auto-Fit mode is active
  useEffect(() => {
    if (!isAutoFitActive) return;
    handleFitToScreen();
    const handleResize = () => {
      handleFitToScreen();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAutoFitActive, handleFitToScreen]);

  // Privacy Handlers
  const handleTogglePrivacyMode = useCallback(() => {
    playKeyClick();
    setPrivacySettings((prev) => {
      const next = { ...prev, isPrivacyMode: !prev.isPrivacyMode };
      savePrivacySettings(next);
      return next;
    });
  }, []);

  const handleUpdatePrivacySettings = useCallback((updates: Partial<PrivacySettings>) => {
    setPrivacySettings((prev) => {
      const next = { ...prev, ...updates };
      savePrivacySettings(next);
      return next;
    });
  }, []);

  const handleTriggerScreenBlur = useCallback(() => {
    setIsPrivacyShieldActive(true);
  }, []);

  const handleUnlockScreen = useCallback(() => {
    setIsPrivacyShieldActive(false);
  }, []);

  // Keyboard shortcut listener: Alt+P toggles stealth mode, double-Esc activates privacy blur
  useEffect(() => {
    let lastEscTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handleTogglePrivacyMode();
      }
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscTime < 400 && !isPrivacyShieldActive) {
          setIsPrivacyShieldActive(true);
        }
        lastEscTime = now;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePrivacyMode, isPrivacyShieldActive]);

  // Inactivity auto-lock listener
  useEffect(() => {
    if (privacySettings.inactivityLockMinutes <= 0) return;
    let timer: any;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsPrivacyShieldActive(true);
      }, privacySettings.inactivityLockMinutes * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [privacySettings.inactivityLockMinutes]);

  const handleClearLocalData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_ACCOUNT);
      localStorage.removeItem('strikepoint_watchlist');
      localStorage.removeItem('strikepoint_flow_feed');
    } catch {}
    setAccount({
      cashBalance: 100000.0,
      startingBalance: 100000.0,
      realizedPnL: 0,
      positions: INITIAL_PORTFOLIO_POSITIONS,
      orders: INITIAL_ACCOUNT_ORDERS,
    });
  }, []);

  const handleResetDefaults = () => {
    setScale(1.0);
    setDensity('standard');
    setTextLegibility('standard');
    setContrastMode('standard');
    setIsSidebarOpen(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  };

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  };

  // Pop-Out Floating Multi-Window Handlers
  const handleOpenMarketDepth = (type: 'call' | 'put' = 'call', strike?: number) => {
    playKeyClick();
    const targetStrike = strike || currentChain.calls[0]?.strike || Math.round(selectedTicker.price);
    setMarketDepthContract({ type, strike: targetStrike });
    setIsMarketDepthOpen(true);
  };

  const handleOpenStrategyExecution = () => {
    playKeyClick();
    setIsStrategyExecutionOpen(true);
  };

  const handleOpenPopOut = (screenToPop: TerminalScreen = currentScreen) => {
    playExecutionChime();
    const titles: Record<TerminalScreen, string> = {
      omon: `OPTION CHAIN [${selectedTicker.symbol}]`,
      ovme: `GREEKS VALUATION & STRATEGY [${selectedTicker.symbol}]`,
      risk: `RISK PAYOFF PROFILE [${selectedTicker.symbol}]`,
      cone: `PROBABILITY CONE [${selectedTicker.symbol}]`,
      scen: `SCENARIO MATRIX [${selectedTicker.symbol}]`,
      flow: `UNUSUAL FLOW TAPE`,
      vols: `VOLATILITY SURFACE & SKEW [${selectedTicker.symbol}]`,
      vega: `VEGA TERM STRUCTURE & ALL-EXPIRATIONS [${selectedTicker.symbol}]`,
      yc: `G20 SOVEREIGN YIELD CURVES (GLOBAL)`,
      macro: `GLOBAL MACROECONOMIC DATA & REGIMES [ECST]`,
      chart: `TECHNICAL CHART [${selectedTicker.symbol}]`,
      port: `PORTFOLIO BLOTTER & MARGIN`,
      monitor: `MARGIN & POSITIONS MONITOR`,
      statement: `OFFICIAL ACCOUNT STATEMENT & CASH LEDGER [STMT]`,
      hivg: `HISTORICAL VS IMPLIED VOL [${selectedTicker.symbol}]`,
      surf: `3D VOLATILITY SURFACE [${selectedTicker.symbol}]`,
      pcr: `PUT/CALL RATIO ENGINE [${selectedTicker.symbol}]`,
      opec: `OPEC+ ENERGY INTELLIGENCE`,
      tariff: `TARIFF TRACKER & TRADE WARS`,
      defcon: `DEFCON ALERT OSINT`,
      div: `DIVIDEND TRACKER & DRIP COMPONENT`,
      witch: `QUADRUPLE WITCHING INTELLIGENCE [${selectedTicker.symbol}]`,
      bnn: `BNN BLOOMBERG FREE LIVE BROADCAST & NEWS STREAM`,
      exp: `OPTIONS EXPIRATION CALENDAR & SCHEDULE [${selectedTicker.symbol}]`,
      fts: `FUTURES TERM STRUCTURE & FORWARD CURVES [FTS]`,
      tsxf: `TSX & MONTREAL EXCHANGE FUTURES HUB`,
      gics: `GICS CANADA · 11 SECTORS & TSX COMPOSITE [GICS]`,
      gic: `GUARANTEED INVESTMENT CERTIFICATES (GIC) · CDIC 100% [GIC]`,
      des: `ETF FUNDAMENTALS & COMPANY PROFILE [${selectedTicker.symbol}] <DES>`,
      skew: `VOLATILITY SKEW FINDER & ARBITRAGE SCANNER [${selectedTicker.symbol}] <SKEW>`,
      journal: `STRATEGY TRADE JOURNAL & EXECUTION LEDGER [JRNL]`,
      educ: `OPTIONS ACADEMY & QUANTITATIVE MASTERCLASS [EDUC]`,
    };

    const newId = `pop-${screenToPop}-${Date.now()}`;
    const offset = (popOutWindows.length % 6) * 28;
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
    const newWin: PopOutWindow = {
      id: newId,
      title: titles[screenToPop] || screenToPop.toUpperCase(),
      screen: screenToPop,
      x: isMobileViewport ? 8 : Math.max(20, Math.min(window.innerWidth - 650, 70 + offset)),
      y: isMobileViewport ? 24 : Math.max(30, Math.min(window.innerHeight - 550, 70 + offset)),
      width: isMobileViewport ? Math.min(window.innerWidth - 16, 960) : Math.min(window.innerWidth - 40, 960),
      height: isMobileViewport ? Math.min(window.innerHeight - 80, 640) : Math.min(window.innerHeight - 80, 640),
      isMinimized: false,
      isMaximized: isMobileViewport,
      zIndex: 100 + popOutWindows.length,
    };

    setPopOutWindows((prev) => [...prev, newWin]);
  };

  const handleClosePopOut = (id: string) => {
    setPopOutWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const handleUpdatePopOut = (id: string, updates: Partial<PopOutWindow>) => {
    setPopOutWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  const handleBringToFront = (id: string) => {
    setPopOutWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 100);
      return prev.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
    });
  };

  // Update terminal clock every second with AM/PM format, time zone, and automatic bell triggers
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tzOpt = TIME_ZONE_OPTIONS.find((t) => t.id === timeZoneId) || TIME_ZONE_OPTIONS[0];
      const utcStr = now.toUTCString().split(' ')[4] + ' UTC';
      const mainStr = now.toLocaleTimeString('en-US', {
        timeZone: tzOpt.zone,
        hour12: useAmPm,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ` ${tzOpt.label}`;
      setClockTime({ utc: utcStr, est: mainStr });

      // Automatic exchange bell trigger at exact market open & close (Eastern Time)
      if (isAutoBellEnabled) {
        const etFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour12: false,
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          weekday: 'short',
        });
        const parts = etFormatter.formatToParts(now);
        const h = parts.find((p) => p.type === 'hour')?.value;
        const m = parts.find((p) => p.type === 'minute')?.value;
        const s = parts.find((p) => p.type === 'second')?.value;
        const day = parts.find((p) => p.type === 'weekday')?.value;

        if (day !== 'Sat' && day !== 'Sun') {
          if (h === '9' && m === '30' && s === '0') {
            playOpeningBell();
          } else if (h === '16' && m === '0' && s === '0') {
            playClosingBell();
          }
        }
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timeZoneId, useAmPm, isAutoBellEnabled]);

  const handleSelectTimeZone = (id: string) => {
    setTimeZoneId(id);
    try {
      localStorage.setItem('strikepoint_timezone', id);
    } catch {}
  };

  const handleToggleUseAmPm = (val: boolean) => {
    setUseAmPm(val);
    try {
      localStorage.setItem('strikepoint_use_ampm', String(val));
    } catch {}
  };

  const handleToggleAutoBell = (val: boolean) => {
    setIsAutoBellEnabled(val);
    try {
      localStorage.setItem('strikepoint_autobell', String(val));
    } catch {}
  };

  const handleAudioToggle = () => {
    const next = !isAudioOn;
    setIsAudioOn(next);
    setTerminalAudioEnabled(next);
    if (next) playKeyClick();
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playKeyClick();
    const trimmed = commandInput.trim().toUpperCase();
    if (!trimmed) return;

    if (
      trimmed === 'SDEPTH' ||
      trimmed === 'CDEPTH' ||
      trimmed === 'COB' ||
      trimmed === 'SMD' ||
      trimmed === 'COMBO' ||
      trimmed === 'MULTI' ||
      trimmed === 'STRAT EXEC' ||
      trimmed === 'EXEC' ||
      trimmed.includes('STRAT DEPTH') ||
      trimmed.includes('STRATEGY DEPTH') ||
      trimmed.includes('STRAT EXEC') ||
      trimmed.includes('MULTI LEG')
    ) {
      handleOpenStrategyExecution();
    } else if (
      trimmed === 'MD' ||
      trimmed === 'DOM' ||
      trimmed === 'DEPTH' ||
      trimmed === 'L2' ||
      trimmed === 'BOOK' ||
      trimmed.includes('MARKET DEPTH') ||
      trimmed.includes('ORDER BOOK') ||
      trimmed.includes('SPREAD')
    ) {
      handleOpenMarketDepth('call');
    } else if (
      trimmed.includes('OMON') ||
      trimmed.includes('CHAIN') ||
      trimmed.includes('OPTION') ||
      trimmed === 'OPT'
    ) {
      setCurrentScreen('omon');
    }
    else if (trimmed.includes('OVME') || trimmed.includes('CALC') || trimmed.includes('STRAT')) setCurrentScreen('ovme');
    else if (trimmed.includes('RISK') || trimmed.includes('PROF') || trimmed.includes('PAYOFF')) setCurrentScreen('risk');
    else if (trimmed.includes('CONE') || trimmed.includes('PROB')) setCurrentScreen('cone');
    else if (trimmed.includes('FLOW')) setCurrentScreen('flow');
    else if (trimmed.includes('SCEN')) setCurrentScreen('scen');
    else if (trimmed.includes('HIVG') || trimmed.includes('HVIV')) setCurrentScreen('hivg');
    else if (trimmed.includes('SURF') || trimmed.includes('3D')) setCurrentScreen('surf');
    else if (trimmed.includes('VOL') || trimmed.includes('SKEW')) setCurrentScreen('vols');
    else if (
      trimmed === 'DES' ||
      trimmed === 'PROFILE' ||
      trimmed === 'ETF' ||
      trimmed === 'ETFS' ||
      trimmed === 'FUNDAMENTALS' ||
      trimmed === 'FUND' ||
      trimmed === 'COMPANY' ||
      trimmed === 'HOLDINGS' ||
      trimmed.includes('DES') ||
      trimmed.includes('FUNDAMENTAL') ||
      trimmed.includes('PROFILE') ||
      trimmed.includes('HOLDING')
    ) {
      setCurrentScreen('des');
    }
    else if (trimmed.includes('CHART') || trimmed.includes('TECH') || trimmed === 'TA') setCurrentScreen('chart');
    else if (
      trimmed === 'WLST' ||
      trimmed === 'WATCH' ||
      trimmed === 'WATCHLIST' ||
      trimmed === 'WATCHLISTS' ||
      trimmed.includes('WATCHLIST')
    ) {
      setIsWatchlistModalOpen(true);
    } else if (trimmed.includes('MONITOR') || trimmed === 'MON' || trimmed === 'BLOTTER') {
      setMonitorSubTab('positions');
      setCurrentScreen('monitor');
    } else if (trimmed.includes('PORT') || trimmed.includes('POS')) {
      setMonitorSubTab('portfolio');
      setCurrentScreen('monitor');
    } else if (trimmed.includes('STMT') || trimmed.includes('STATEMENT') || trimmed.includes('LEDGER')) {
      setMonitorSubTab('statement');
      setCurrentScreen('monitor');
    } else if (
      trimmed.includes('TFSA') ||
      trimmed.includes('RRSP') ||
      trimmed.includes('FHSA') ||
      trimmed.includes('RESP') ||
      trimmed === 'CAD'
    ) {
      setMonitorSubTab('tfsa_rrsp');
      setCurrentScreen('monitor');
    } else if (trimmed.includes('PCR') || trimmed.includes('RATIO')) setCurrentScreen('pcr');
    else if (
      trimmed.includes('OPEC') ||
      trimmed.includes('JMMC') ||
      trimmed.includes('OVX') ||
      trimmed.includes('OIL EVENT') ||
      trimmed.includes('OIL VOL')
    ) {
      setMacroSubTab('opec');
      setCurrentScreen('macro');
    } else if (
      trimmed.includes('TARIFF') ||
      trimmed === 'TRFF' ||
      trimmed.includes('TRADE WAR') ||
      trimmed.includes('DUTY') ||
      trimmed.includes('CUSTOMS')
    ) {
      setMacroSubTab('tariff');
      setCurrentScreen('macro');
    } else if (
      trimmed.includes('GEO') ||
      trimmed.includes('COUNTRY') ||
      trimmed.includes('HEATMAP') ||
      trimmed.includes('WAR')
    ) {
      setMacroSubTab('geopolitical');
      setCurrentScreen('macro');
    } else if (trimmed.includes('MOVE') || trimmed.includes('EXP MOVE') || trimmed.includes('EXPECTED')) {
      setIsExpectedMoveOpen(true);
    } else if (
      trimmed === 'BTEST' ||
      trimmed === 'BACKTEST' ||
      trimmed === 'TEST' ||
      trimmed.includes('BACKTEST')
    ) {
      setIsStrategyCatalogOpen(true);
    } else if (trimmed.includes('CATALOG') || trimmed.includes('ALL STRAT') || trimmed.includes('PRESETS')) {
      setIsStrategyCatalogOpen(true);
    } else if (
      trimmed.includes('GAMMA') ||
      trimmed.includes('GEX') ||
      trimmed.includes('NET GAMMA') ||
      trimmed.includes('CONVEXITY')
    ) {
      setIsNetGammaOpen(true);
    } else if (
      trimmed === 'EXP' ||
      trimmed === 'EXPR' ||
      trimmed === 'EXPIRATION' ||
      trimmed === 'EXPIRATIONS' ||
      trimmed === 'OPEX' ||
      trimmed === 'EXPD' ||
      trimmed === 'EXPIRY' ||
      trimmed === 'CYCLE' ||
      trimmed.includes('EXPIRATION')
    ) {
      setCurrentScreen('exp');
    } else if (
      trimmed === 'TSXF' ||
      trimmed === 'TSX FUTURES' ||
      trimmed === 'TSX FUT' ||
      trimmed === 'TSXFUT' ||
      trimmed === 'BOURSE' ||
      trimmed.includes('TSX FUT') ||
      trimmed.includes('MONTREAL')
    ) {
      setIsTSXFuturesHubOpen(true);
    } else if (trimmed === 'SXF' || trimmed === '/SXF') {
      setSelectedSymbol('/SXF');
      setCurrentScreen('omon');
    } else if (trimmed === 'SXM' || trimmed === '/SXM') {
      setSelectedSymbol('/SXM');
      setCurrentScreen('omon');
    } else if (trimmed === 'CGB' || trimmed === '/CGB') {
      setSelectedSymbol('/CGB');
      setCurrentScreen('omon');
    } else if (trimmed === 'CRA' || trimmed === '/CRA' || trimmed === 'BAX' || trimmed === '/BAX') {
      setSelectedSymbol('/CRA');
      setCurrentScreen('omon');
    } else if (trimmed === 'SCF' || trimmed === '/SCF') {
      setSelectedSymbol('/SCF');
      setCurrentScreen('omon');
    } else if (trimmed === 'CGF' || trimmed === '/CGF') {
      setSelectedSymbol('/CGF');
      setCurrentScreen('omon');
    } else if (trimmed === '6C' || trimmed === '/6C') {
      setSelectedSymbol('/6C');
      setCurrentScreen('omon');
    } else if (
      trimmed === 'UTC' ||
      trimmed === 'GMT' ||
      trimmed.startsWith('TZ ') ||
      trimmed.startsWith('TIMEZONE ') ||
      trimmed.startsWith('SET TZ ') ||
      trimmed.startsWith('ZONE ')
    ) {
      const parts = trimmed.split(/\s+/);
      const targetCode = parts[parts.length - 1].toLowerCase();
      const matched = TIME_ZONE_OPTIONS.find(
        (t) =>
          t.id.toLowerCase() === targetCode ||
          t.label.toLowerCase() === targetCode ||
          t.name.toLowerCase().includes(targetCode) ||
          t.zone.toLowerCase().includes(targetCode)
      );
      if (matched) {
        handleSelectTimeZone(matched.id);
        playExecutionChime();
      } else {
        setIsClockBellModalOpen(true);
      }
    } else if (
      trimmed === 'TIME' ||
      trimmed === 'CLOCK' ||
      trimmed === 'BELL' ||
      trimmed === 'BELLS' ||
      trimmed === 'TZ' ||
      trimmed === 'TIMEZONE' ||
      trimmed === 'ZONE' ||
      trimmed.includes('BELL') ||
      trimmed.includes('TIMEZONE')
    ) {
      setIsClockBellModalOpen(true);
    } else if (
      trimmed === 'WITCH' ||
      trimmed === 'QWITCH' ||
      trimmed.includes('WITCH') ||
      trimmed === 'QUAD' ||
      trimmed === '4W'
    ) {
      setCurrentScreen('witch');
    } else if (
      trimmed === 'BNN' ||
      trimmed === 'TV' ||
      trimmed === 'BNNLIVE' ||
      trimmed === 'STREAM' ||
      trimmed === 'BNN TV' ||
      trimmed.includes('BNN') ||
      trimmed.includes('BLOOMBERG TV') ||
      trimmed === 'LIVE'
    ) {
      setCurrentScreen('bnn');
    } else if (
      trimmed === 'FTS' ||
      trimmed === 'TERM' ||
      trimmed === 'CURV' ||
      trimmed === 'CURVE' ||
      trimmed === 'FUTURES' ||
      trimmed === 'FORWARD' ||
      trimmed === 'FORWARD CURVE' ||
      trimmed === 'CONTANGO' ||
      trimmed === 'BACKWARDATION' ||
      trimmed.includes('TERM STRUCTURE') ||
      trimmed.includes('FORWARD CURVE') ||
      trimmed.includes('FUTURES CURVE')
    ) {
      setCurrentScreen('fts');
    } else if (
      trimmed === 'SKEW' ||
      trimmed === 'VSKEW' ||
      trimmed === 'SKWF' ||
      trimmed === 'SKEWFINDER' ||
      trimmed === 'FINDER' ||
      trimmed === 'VOLSKEW' ||
      trimmed === 'SKEW FINDER' ||
      trimmed.includes('SKEW FINDER') ||
      trimmed.includes('VOLATILITY SKEW')
    ) {
      setCurrentScreen('skew');
    } else if (
      trimmed === 'JRNL' ||
      trimmed === 'JOURNAL' ||
      trimmed === 'TRADE JOURNAL' ||
      trimmed === 'STRATEGY JOURNAL' ||
      trimmed === 'STRATEGY TRADE JOURNAL' ||
      trimmed === 'LOG' ||
      trimmed === 'DIARY' ||
      trimmed.includes('JOURNAL')
    ) {
      setCurrentScreen('journal');
    } else if (
      trimmed === 'EDUC' ||
      trimmed === 'EDUCATION' ||
      trimmed === 'ACADEMY' ||
      trimmed === 'LEARN' ||
      trimmed === 'SCHOOL' ||
      trimmed === 'MASTERCLASS' ||
      trimmed === 'TUTORIAL' ||
      trimmed === 'OPTIONS EDUCATION' ||
      trimmed === 'STRATEGY EDUCATION' ||
      trimmed.includes('EDUCATION') ||
      trimmed.includes('ACADEMY') ||
      trimmed.includes('MASTERCLASS')
    ) {
      setCurrentScreen('educ');
    } else if (
      trimmed.includes('DEFCON') ||
      trimmed.includes('DEFCONLEVEL') ||
      trimmed.includes('MILITARY') ||
      trimmed.includes('ROUND HOUSE')
    ) {
      setMacroSubTab('defcon');
      setCurrentScreen('macro');
    } else if (
      trimmed.includes('TFSA') ||
      trimmed.includes('RRSP') ||
      trimmed.includes('FHSA') ||
      trimmed.includes('RESP') ||
      trimmed.includes('CANADIAN') ||
      trimmed.includes('CRA') ||
      trimmed.includes('NORBERT')
    ) {
      setMonitorSubTab('tfsa_rrsp');
      setCurrentScreen('monitor');
    } else if (trimmed.includes('GITHUB') || trimmed === 'GIT' || trimmed === 'REPO') {
      setIsGitHubOpen(true);
    } else if (
      trimmed === 'SOUND' ||
      trimmed === 'CHIME' ||
      trimmed === 'CHIMES' ||
      trimmed === 'AUDIO' ||
      trimmed === 'BELL' ||
      trimmed === 'ALARM' ||
      trimmed.includes('SOUND') ||
      trimmed.includes('CHIME')
    ) {
      setDisplaySettingsTab('audio');
      setIsDisplaySettingsOpen(true);
    } else if (
      trimmed.includes('SCALE') ||
      trimmed.includes('ZOOM') ||
      trimmed.includes('DISPLAY') ||
      trimmed.includes('FIT') ||
      trimmed.includes('SCREEN')
    ) {
      setDisplaySettingsTab('display');
      setIsDisplaySettingsOpen(true);
    } else if (
      trimmed.includes('VEGA') ||
      trimmed.includes('TERM STRUCT') ||
      trimmed === 'VTS' ||
      trimmed.includes('VOLGA') ||
      trimmed.includes('VOMMA')
    ) {
      setCurrentScreen('vega');
    } else if (
      trimmed === 'YC' ||
      trimmed.includes('YIELD') ||
      trimmed.includes('CURVE') ||
      trimmed.includes('G20') ||
      trimmed.includes('RATES') ||
      trimmed.includes('BOND') ||
      trimmed.includes('TREASURY')
    ) {
      setMacroSubTab('yield_curve');
      setCurrentScreen('macro');
    } else if (
      trimmed === 'CA' ||
      trimmed === 'CAD' ||
      trimmed === 'CAMARGIN' ||
      trimmed === 'MARGIN_CAD' ||
      trimmed === 'TSX' ||
      trimmed === 'MX'
    ) {
      setActiveCanadianAccountId('act-margin-cad');
      if (tickers['RY.TO']) setSelectedSymbol('RY.TO');
      setMonitorSubTab('tfsa_rrsp');
      setCurrentScreen('monitor');
    } else if (
      trimmed.includes('LOCK') ||
      trimmed === 'L' ||
      trimmed.includes('SECURE')
    ) {
      setIsTerminalLocked(true);
      setIsBiometricModalOpen(true);
    } else if (
      trimmed.includes('BIO') ||
      trimmed.includes('FINGERPRINT') ||
      trimmed.includes('BUNIT') ||
      trimmed.includes('LOGIN') ||
      trimmed.includes('AUTH')
    ) {
      setIsBiometricModalOpen(true);
    } else if (
      trimmed.includes('POP') ||
      trimmed.includes('WINDOW') ||
      trimmed.includes('DETACH') ||
      trimmed.includes('SPLIT')
    ) {
      handleOpenPopOut(currentScreen);
    } else if (
      trimmed === 'MACRO' ||
      trimmed === 'MACR' ||
      trimmed === 'ECST' ||
      trimmed === 'ECON' ||
      trimmed.includes('MACRO') ||
      trimmed.includes('CENTRAL BANK') ||
      trimmed.includes('INFLATION') ||
      trimmed.includes('GLOBAL DATA')
    ) {
      setCurrentScreen('macro');
    } else if (trimmed.includes('BORROW') || trimmed.includes('INTEREST') || trimmed.includes('FINANCING') || trimmed.includes('HTB')) {
      setMonitorSubTab('portfolio');
      setCurrentScreen('monitor');
    } else if (trimmed.includes('MARGIN DEBT') || trimmed === 'DEBT' || trimmed.includes('GDP')) {
      setCurrentScreen('chart');
    } else if (trimmed.includes('HELP')) setIsHelpOpen(true);

    const words = trimmed.split(' ');
    for (const w of words) {
      if (tickers[w]) {
        setSelectedSymbol(w);
        break;
      }
      if (tickers[`/${w}`]) {
        setSelectedSymbol(`/${w}`);
        break;
      }
    }
  };

  useEffect(() => {
    setCommandInput(`${selectedSymbol} US Equity ${currentScreen.toUpperCase()}`);
  }, [selectedSymbol, currentScreen]);

  // Global Keyboard shortcuts (F1..F8, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpOpen(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentScreen('omon');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentScreen('ovme');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentScreen('cone');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setCurrentScreen('scen');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setCurrentScreen('flow');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setCurrentScreen('vols');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setCurrentScreen('chart');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setMonitorSubTab('portfolio');
        setCurrentScreen('monitor');
      } else if (e.key === 'F10') {
        e.preventDefault();
        setCurrentScreen('chart');
      } else if (e.key === 'F11') {
        e.preventDefault();
        setCurrentScreen('pcr');
      } else if (e.key === 'F12') {
        e.preventDefault();
        setCurrentScreen('opec');
      } else if (e.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedTicker = tickers[selectedSymbol] || tickers['SPY'];

  // Generate current option chain for selected ticker and DTE
  const currentChain: ExpirationOptionChain = useMemo(() => {
    return generateOptionsChainForTicker(selectedTicker, activeDte);
  }, [selectedTicker, activeDte]);

  // Generate all option chains across all standard expirations
  const allChains: ExpirationOptionChain[] = useMemo(() => {
    return generateAllOptionChainsForTicker(selectedTicker);
  }, [selectedTicker]);

  // Aggregate Put/Call ratio for current ticker
  const currentTickerPcr = useMemo(() => {
    let callVol = 0;
    let putVol = 0;
    allChains.forEach((c) => {
      c.calls.forEach((cl) => { callVol += cl.volume; });
      c.puts.forEach((pt) => { putVol += pt.volume; });
    });
    return callVol > 0 ? Number((putVol / callVol).toFixed(2)) : 0.85;
  }, [allChains]);

  // Market Maker Net Gamma Exposure (GEX) Analysis for current ticker
  const netGammaData = useMemo(() => {
    return calculateNetGammaAnalysis(selectedTicker, allChains);
  }, [selectedTicker, allChains]);

  // Simulate tick for tickers, macro indices and occasional unusual flow sweeps
  const simulatePriceTick = useCallback(() => {
    // 1. Tick tickers
    const updatedTickers: Record<string, Ticker> = { ...tickers };
    Object.keys(updatedTickers).forEach((sym) => {
      const t = updatedTickers[sym];
      const deltaPct = (Math.random() - 0.49) * 0.003;
      const newPrice = Number(Math.max(1, t.price * (1 + deltaPct)).toFixed(2));
      const diff = Number((newPrice - t.previousClose).toFixed(2));
      const pct = Number(((diff / t.previousClose) * 100).toFixed(2));

      const newHigh = Math.max(t.high, newPrice);
      const newLow = Math.min(t.low, newPrice);

      const candles = [...t.candles];
      if (candles.length > 0) {
        const lastCandle = { ...candles[candles.length - 1] };
        lastCandle.close = newPrice;
        lastCandle.high = Math.max(lastCandle.high, newPrice);
        lastCandle.low = Math.min(lastCandle.low, newPrice);
        candles[candles.length - 1] = lastCandle;
      }

      updatedTickers[sym] = {
        ...t,
        price: newPrice,
        change: diff,
        changePercent: pct,
        high: newHigh,
        low: newLow,
        candles,
      };
    });
    setTickers(updatedTickers);

    // 2. Tick macro indices
    setMacroIndices((prev) =>
      prev.map((idx) => {
        const nudge = (Math.random() - 0.49) * (idx.isRateOrYield ? 0.005 : 0.001);
        const nextVal = Math.max(0.1, idx.value * (1 + nudge));
        return {
          ...idx,
          value: Number(nextVal.toFixed(idx.isRateOrYield ? 3 : 2)),
          changePct: Number((idx.changePct + (Math.random() - 0.49) * 0.08).toFixed(2)),
        };
      })
    );

    // Helper: Mark to market any position list using live updated ticker quotes
    const updatePositionsMTM = (positions: Position[]) => {
      return positions.map((pos) => {
        const tick = updatedTickers[pos.ticker] || tickers[pos.ticker];
        if (!tick) return pos;

        let totalCurrentMark = 0;
        pos.legs.forEach((leg) => {
          let markPrice = 0;
          if (leg.type === 'stock' || leg.type === 'future') {
            markPrice = tick.price;
          } else {
            const bsm = calculateBSM(
              tick.price,
              leg.strike,
              Math.max(0.001, leg.dte / 365),
              leg.iv,
              leg.type === 'put' ? 'put' : 'call'
            );
            markPrice = bsm.price;
          }
          const sign = leg.action === 'buy' ? 1 : -1;
          const shareMultiplier = leg.multiplier || (leg.type === 'stock' ? 1 : (tick.multiplier || 100));
          totalCurrentMark += sign * markPrice * shareMultiplier * leg.contracts;
        });

        const unrealizedPnL = totalCurrentMark - pos.entryCost;
        const unrealizedPnLPercent =
          pos.entryCost !== 0 ? (unrealizedPnL / Math.abs(pos.entryCost)) * 100 : 0;

        return {
          ...pos,
          currentMark: Number(totalCurrentMark.toFixed(2)),
          unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
          unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
        };
      });
    };

    // 3. Mark to market open positions in main account
    setAccount((prevAcc) => {
      if (prevAcc.positions.length === 0) return prevAcc;
      return {
        ...prevAcc,
        positions: updatePositionsMTM(prevAcc.positions),
      };
    });

    // 4. Mark to market Canadian accounts positions
    setCanadianAccounts((prevAccs) =>
      prevAccs.map((acc) => ({
        ...acc,
        positions: updatePositionsMTM(acc.positions),
      }))
    );

    // 5. Occasional unusual flow trigger (approx every 3-4 ticks)
    if (Math.random() > 0.65) {
      const newFlow = generateRandomFlowItem(updatedTickers);
      setFlowItems((prev) => [newFlow, ...prev.slice(0, 40)]);
      playMarketTriggerAlert('flow');
    }
  }, [tickers, selectedSymbol]);

  // Live tick interval
  useEffect(() => {
    if (!isLiveTickActive) return;
    const interval = setInterval(() => {
      simulatePriceTick();
    }, 2400);

    return () => clearInterval(interval);
  }, [isLiveTickActive, simulatePriceTick]);

  // Builder leg actions
  const handleAddLeg = (newLeg: TradeLeg) => {
    setBuilderLegs((prev) => [...prev, newLeg]);
  };

  const handleUpdateLeg = (updatedLeg: TradeLeg) => {
    setBuilderLegs((prev) =>
      prev.map((l) => (l.id === updatedLeg.id ? updatedLeg : l))
    );
  };

  const handleRemoveLeg = (legId: string) => {
    setBuilderLegs((prev) => prev.filter((l) => l.id !== legId));
  };

  const handleClearLegs = () => {
    setBuilderLegs([]);
  };

  const handleUpdatePosition = (updatedPosition: Position) => {
    setAccount((prev) => ({
      ...prev,
      positions: prev.positions.map((p) => (p.id === updatedPosition.id ? updatedPosition : p)),
    }));
  };

  // Pre-built Strategy Templates - supports ALL 45+ institutional strategies
  const handleApplyStrategyTemplate = (templateName: string) => {
    // Normalize aliases
    let stratId = templateName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Common alias mappings
    if (stratId === 'vertical-spread') stratId = 'bull-call-spread';
    else if (stratId === 'straddle') stratId = 'long-straddle';
    else if (stratId === 'strangle') stratId = 'long-strangle';
    else if (stratId === 'butterfly') stratId = 'long-call-butterfly';
    else if (stratId === 'calendar-spread' || stratId === 'calendar') stratId = 'call-calendar-spread';
    else if (stratId === 'covered' || stratId === 'cc') stratId = 'covered-call';
    else if (stratId === 'protective-put' || stratId === 'married-put') stratId = 'protective-put';
    else if (stratId === 'pmcc') stratId = 'poor-mans-covered-call';
    else if (stratId === 'pmcp') stratId = 'poor-mans-covered-put';
    else if (stratId === 'iron-fly') stratId = 'iron-butterfly';
    else if (stratId === 'bwb') stratId = 'broken-wing-call-butterfly';
    else if (stratId === 'box') stratId = 'box-spread';

    const newLegs = generateStrategyLegs(stratId, selectedTicker, currentChain, allChains);
    setBuilderLegs(newLegs);
  };

  // Mirror trade from unusual flow
  const handleMirrorTrade = (leg: TradeLeg, tickerSymbol: string) => {
    setSelectedSymbol(tickerSymbol);
    setBuilderLegs([leg]);
    setCurrentScreen('ovme');
  };

  // Order execution handler
  const handleExecuteTrade = (order: Order, position: Position) => {
    // Automatically log trade into Strategy Trade Journal with execution stats & entry IV
    try {
      logTradeToJournal(order, position, tickers[position.ticker]);
    } catch (e) {
      console.error('Failed to log trade to journal:', e);
    }

    setAccount((prev) => {
      const isDebit = order.netDebitCredit > 0;
      const newCash = isDebit
        ? prev.cashBalance - Math.abs(order.totalCost)
        : prev.cashBalance + Math.abs(order.totalCost);

      return {
        ...prev,
        cashBalance: Number(newCash.toFixed(2)),
        orders: [order, ...prev.orders],
        positions: [position, ...prev.positions],
      };
    });
  };

  // Close position handler
  const handleClosePosition = (positionId: string) => {
    // Automatically close trade in Strategy Trade Journal and record realized P&L
    try {
      closeJournalTrade(positionId);
    } catch (e) {
      console.error('Failed to close trade in journal:', e);
    }

    // Check main account
    setAccount((prev) => {
      const targetPos = prev.positions.find((p) => p.id === positionId);
      if (!targetPos) return prev;

      const closeCashImpact = targetPos.currentMark;
      const realizedChange = targetPos.unrealizedPnL;

      const closingOrder: Order = {
        id: `BLOT-CLOSE-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        ticker: targetPos.ticker,
        strategyName: `Close ${targetPos.strategyName}`,
        type: 'market',
        limitPrice: 0,
        legs: targetPos.legs,
        contracts: targetPos.contracts,
        netDebitCredit: -closeCashImpact,
        totalCost: Math.abs(closeCashImpact),
        status: 'filled',
      };

      return {
        ...prev,
        cashBalance: Number((prev.cashBalance + closeCashImpact).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL + realizedChange).toFixed(2)),
        positions: prev.positions.filter((p) => p.id !== positionId),
        orders: [closingOrder, ...prev.orders],
      };
    });

    // Also check Canadian accounts if target position is in one
    setCanadianAccounts((prevAccounts) => {
      return prevAccounts.map((acc) => {
        const found = acc.positions.find((p) => p.id === positionId);
        if (!found) return acc;
        return {
          ...acc,
          cashBalance: Number((acc.cashBalance + found.currentMark).toFixed(2)),
          realizedPnL: Number((acc.realizedPnL + found.unrealizedPnL).toFixed(2)),
          positions: acc.positions.filter((p) => p.id !== positionId),
        };
      });
    });
  };

  const handleResetAccount = () => {
    const freshAccount: AccountState = {
      cashBalance: 100000.0,
      startingBalance: 100000.0,
      realizedPnL: 0,
      positions: [],
      orders: [],
    };
    setAccount(freshAccount);
    setCanadianAccounts(INITIAL_CANADIAN_ACCOUNTS);
    localStorage.removeItem(STORAGE_KEY_ACCOUNT);
  };

  const isUp = selectedTicker.change >= 0;
  const positionsMark = account.positions.reduce((acc, p) => acc + p.currentMark, 0);
  const netLiq = account.cashBalance + positionsMark;
  const marginRequirement = account.positions.reduce((acc, p) => {
    if (p.entryCost < 0) return acc + Math.abs(p.entryCost) * 1.5;
    if (p.ticker.startsWith('/')) return acc + p.contracts * 5000;
    return acc;
  }, 0);
  const optionsBP = Math.max(0, account.cashBalance - marginRequirement);
  const isMarginWarning = account.cashBalance > 0 && (marginRequirement / account.cashBalance) > 0.8;
  const marginUsagePct = account.cashBalance > 0 ? (marginRequirement / account.cashBalance) * 100 : 0;

  const activeTosTab = useMemo(() => {
    if (currentScreen === 'omon') return 'monitor';
    if (currentScreen === 'ovme') return 'trade';
    if (currentScreen === 'cone' || currentScreen === 'scen' || currentScreen === 'risk') return 'analyze';
    if (currentScreen === 'flow' || currentScreen === 'pcr') return 'scan';
    return 'marketwatch';
  }, [currentScreen]);

  const quickScreens: { label: string; screen: TerminalScreen }[] = [
    { label: 'OMON', screen: 'omon' },
    { label: 'OVME', screen: 'ovme' },
    { label: 'RISK', screen: 'risk' },
    { label: 'CONE', screen: 'cone' },
    { label: 'SCEN', screen: 'scen' },
    { label: 'FLOW', screen: 'flow' },
    { label: 'VOLS', screen: 'vols' },
    { label: 'SURF', screen: 'surf' },
    { label: 'HIVG', screen: 'hivg' },
    { label: 'CHART', screen: 'chart' },
    { label: 'PORT', screen: 'port' },
    { label: 'STMT', screen: 'statement' },
    { label: 'DVD', screen: 'div' },
    { label: 'GICS', screen: 'gics' },
    { label: 'GIC', screen: 'gic' },
    { label: 'DES', screen: 'des' },
    { label: 'PCR', screen: 'pcr' },
    { label: 'VEGA', screen: 'vega' },
  ];

  const atmMetrics = useMemo(() => {
    if (!currentChain.calls.length) {
      return { straddleCost: 15.09, movePct: 2.67 };
    }
    const currentPrice = selectedTicker.price;
    let closestIdx = 0;
    let minDiff = Infinity;
    currentChain.calls.forEach((c, idx) => {
      const diff = Math.abs(c.strike - currentPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    const callAtm = currentChain.calls[closestIdx];
    const putAtm = currentChain.puts[closestIdx] || callAtm;
    const straddleCost = callAtm.last + putAtm.last;
    const movePct = currentPrice > 0 ? (straddleCost / currentPrice) * 100 : 2.67;
    return {
      straddleCost: Number(straddleCost.toFixed(2)),
      movePct: Number(movePct.toFixed(2)),
    };
  }, [currentChain, selectedTicker.price]);

  // Common screen renderer (supports both main workspace and floating pop-out windows)
  const renderScreenContent = (screenToRender: TerminalScreen = currentScreen, isPopOut: boolean = false) => (
    <>
      {/* SCREEN 1: OMON (Options Monitor Chain) */}
      {screenToRender === 'omon' && (
        <div className="flex-1 flex flex-col gap-3 w-full max-w-[1920px] ml-0 mr-auto">
          <OptionsMatrixOMON
            ticker={selectedTicker}
            chain={currentChain}
            allChains={allChains}
            activeDte={activeDte}
            onSelectDte={(dte) => setActiveDte(dte)}
            builderLegs={builderLegs}
            portfolioPositions={account.positions}
            onOpenMonitorScreen={() => setCurrentScreen('monitor')}
            onAddLeg={handleAddLeg}
            onUpdateLeg={handleUpdateLeg}
            onUpdatePosition={handleUpdatePosition}
            onRemoveLeg={handleRemoveLeg}
            onApplyStrategyTemplate={handleApplyStrategyTemplate}
            onOpenValuationScreen={() => setCurrentScreen('ovme')}
            onOpenConeScreen={() => setCurrentScreen('cone')}
            onOpenVolsScreen={() => setCurrentScreen('vols')}
            onOpenPcrScreen={() => setCurrentScreen('pcr')}
            onOpenRiskProfile={() => setCurrentScreen('risk')}
            onSelectTicker={(sym) => setSelectedSymbol(sym)}
            onOpenStockTrade={() => setIsStockTradeOpen(true)}
            onOpenOpecScreen={() => setCurrentScreen('opec')}
            onOpenExpectedMove={() => setIsExpectedMoveOpen(true)}
            onOpenNetGamma={() => setIsNetGammaOpen(true)}
            onOpenVegaScreen={() => setCurrentScreen('vega')}
            onOpenMarketDepth={handleOpenMarketDepth}
            onOpenStrategyExecution={handleOpenStrategyExecution}
            onOpenQuadWitching={() => setIsQuadWitchingOpen(true)}
            onOpenOptionsExpiration={() => setCurrentScreen('exp')}
            onOpenFuturesTermStructure={() => setCurrentScreen('fts')}
          />

          {builderLegs.length > 0 && (
            <div className="mt-2">
              <OptionsValuationOVME
                currentStockPrice={selectedTicker.price}
                tickerSymbol={selectedTicker.symbol}
                legs={builderLegs}
                onUpdateLeg={handleUpdateLeg}
                onRemoveLeg={handleRemoveLeg}
                onClearLegs={handleClearLegs}
                onExecuteTrade={handleExecuteTrade}
                cashBalance={account.cashBalance}
                onNavigateToScenario={() => setCurrentScreen('scen')}
                onNavigateToCone={() => setCurrentScreen('cone')}
                onApplyStrategyTemplate={handleApplyStrategyTemplate}
                onOpenStrategyCatalog={() => setIsStrategyCatalogOpen(true)}
                onOpenStrategyExecution={handleOpenStrategyExecution}
              />
            </div>
          )}
        </div>
      )}

      {/* SCREEN 2: OVME (Options Valuation & Greeks Engine) */}
      {screenToRender === 'ovme' && (
        <div className="w-full max-w-[1920px] ml-0 mr-auto">
          <OptionsValuationOVME
            currentStockPrice={selectedTicker.price}
            tickerSymbol={selectedTicker.symbol}
            legs={builderLegs}
            onUpdateLeg={handleUpdateLeg}
            onRemoveLeg={handleRemoveLeg}
            onClearLegs={handleClearLegs}
            onExecuteTrade={handleExecuteTrade}
            cashBalance={account.cashBalance}
            onNavigateToScenario={() => setCurrentScreen('scen')}
            onNavigateToCone={() => setCurrentScreen('cone')}
            onApplyStrategyTemplate={handleApplyStrategyTemplate}
            onOpenStrategyCatalog={() => setIsStrategyCatalogOpen(true)}
            onOpenStrategyExecution={handleOpenStrategyExecution}
          />
        </div>
      )}

      {/* SCREEN: RISK (Dedicated Standalone Risk Profile & Bigger Picture Payoff Engine) */}
      {screenToRender === 'risk' && (
        <div className="flex-1 flex flex-col gap-2 w-full max-w-full ml-0 mr-auto text-left">
          <RiskProfileView
            ticker={selectedTicker}
            chain={currentChain}
            allChains={allChains}
            builderLegs={builderLegs}
            portfolioPositions={account.positions}
            tickers={tickers}
            accountCashBalance={account.cashBalance}
            onAddLeg={handleAddLeg}
            onOpenStockTrade={() => setIsStockTradeOpen(true)}
            onSelectTicker={(sym: string) => setSelectedSymbol(sym)}
            onSeedPositions={() => {
              setAccount((prev) => ({
                ...prev,
                positions: INITIAL_PORTFOLIO_POSITIONS,
                orders: INITIAL_ACCOUNT_ORDERS,
              }));
            }}
            onUpdateLeg={handleUpdateLeg}
            onUpdatePosition={handleUpdatePosition}
            onRemoveLeg={handleRemoveLeg}
            onClearLegs={handleClearLegs}
            onApplyStrategyTemplate={handleApplyStrategyTemplate}
            onNavigateToChain={() => setCurrentScreen('omon')}
            onNavigateToValuation={() => setCurrentScreen('ovme')}
            onNavigateToCone={() => setCurrentScreen('cone')}
            onNavigateToScenario={() => setCurrentScreen('scen')}
            onOpenExpectedMove={() => setIsExpectedMoveOpen(true)}
            onOpenStrategyCatalog={() => setIsStrategyCatalogOpen(true)}
            onOpenStrategyExecution={handleOpenStrategyExecution}
            onNavigateToMacro={() => setCurrentScreen('macro')}
          />
        </div>
      )}

      {/* SCREEN: CONE (Probability of Expiring Cones & Expected Move Bands) */}
      {screenToRender === 'cone' && (
        <ProbabilityConeCONE
          ticker={selectedTicker}
          chain={currentChain}
          legs={builderLegs}
          onNavigateToBuilder={() => setCurrentScreen('ovme')}
          onNavigateToChain={() => setCurrentScreen('omon')}
        />
      )}

      {/* SCREEN 3: SCEN (2D Scenario Matrix) */}
      {screenToRender === 'scen' && (
        <ScenarioMatrixSCEN
          ticker={selectedTicker}
          legs={builderLegs}
          onNavigateToBuilder={() => setCurrentScreen('ovme')}
          onApplyStrategyTemplate={handleApplyStrategyTemplate}
        />
      )}

      {/* SCREEN 4: FLOW (Unusual Options Flow Tape) */}
      {screenToRender === 'flow' && (
        <UnusualFlowTapeFLOW
          flowItems={flowItems}
          onMirrorTrade={handleMirrorTrade}
          tickers={tickers}
          onNavigateToPcr={() => setCurrentScreen('pcr')}
        />
      )}

      {/* SCREEN 5: VOLS (Volatility Lab, Multi-Skew & Vega Term Structure Suite) */}
      {screenToRender === 'vols' && (
        <VolatilityLabView
          ticker={selectedTicker}
          chain={currentChain}
          allChains={allChains}
          positions={account.positions}
          legs={builderLegs}
          selectedDte={activeDte}
          onSelectDte={(dte) => setActiveDte(dte)}
          onNavigateToChain={() => setCurrentScreen('omon')}
          onNavigateToCone={() => setCurrentScreen('cone')}
          onNavigateToValuation={() => setCurrentScreen('ovme')}
          onNavigateToVega={() => setCurrentScreen('vega')}
          onNavigateToSkewFinder={() => setCurrentScreen('skew')}
          onApplyStrategyTemplate={handleApplyStrategyTemplate}
        />
      )}

      {/* SCREEN: SURF (3D Volatility Surface Engine) */}
      {screenToRender === 'surf' && (
        <VolatilitySurface3D
          ticker={selectedTicker}
          allChains={allChains}
          onNavigateToChain={() => setCurrentScreen('omon')}
          onNavigateToHIVG={() => setCurrentScreen('hivg')}
          onNavigateToSkews={() => setCurrentScreen('vols')}
          onNavigateToValuation={() => setCurrentScreen('ovme')}
        />
      )}

      {/* SCREEN: HIVG (Historical & Implied Volatility Chart & Cones) */}
      {screenToRender === 'hivg' && (
        <HistoricalImpliedVolChart
          ticker={selectedTicker}
          allChains={allChains}
          onNavigateToChain={() => setCurrentScreen('omon')}
          onNavigateToValuation={() => setCurrentScreen('ovme')}
          onNavigateToCone={() => setCurrentScreen('cone')}
          onNavigateToSkews={() => setCurrentScreen('vols')}
        />
      )}

      {/* SCREEN 6: CHART / TA (Technical Analysis & Quantitative Indicators Suite) */}
      {screenToRender === 'chart' && (
        <TechnicalsChart
          ticker={selectedTicker}
          chain={currentChain}
          allChains={allChains}
          onNavigateToHIVG={() => setCurrentScreen('hivg')}
          onNavigateToOMON={() => setCurrentScreen('omon')}
          onNavigateToPCR={() => setCurrentScreen('pcr')}
        />
      )}

      {/* SCREEN: UNIFIED MONITOR HUB (Activity & Positions, Portfolio & Greeks, Statement, TFSA / RRSP) */}
      {(screenToRender === 'monitor' || screenToRender === 'port' || screenToRender === 'statement') && (
        <PositionMonitorView
          account={account}
          canadianAccounts={canadianAccounts}
          activeAccountId={activeCanadianAccountId}
          onSelectAccount={(accId) => setActiveCanadianAccountId(accId)}
          tickers={tickers}
          isLiveTickActive={isLiveTickActive}
          onToggleLiveTick={() => setIsLiveTickActive((prev) => !prev)}
          onSimulateTick={simulatePriceTick}
          onNavigateToRisk={(pos) => {
            if (pos && pos.legs.length > 0) {
              setBuilderLegs(pos.legs);
            }
            setCurrentScreen('risk');
          }}
          onNavigateToChain={(sym) => {
            setSelectedSymbol(sym);
            setCurrentScreen('omon');
          }}
          onClosePosition={handleClosePosition}
          onSeedPortfolio={() => {
            setAccount((prev) => ({
              ...prev,
              positions: INITIAL_PORTFOLIO_POSITIONS,
            }));
          }}
          isPrivacyMode={privacySettings.isPrivacyMode}
          initialSubTab={
            screenToRender === 'port'
              ? 'portfolio'
              : screenToRender === 'statement'
              ? 'statement'
              : monitorSubTab
          }
          onSubTabChange={(tab) => setMonitorSubTab(tab)}
          onResetAccount={handleResetAccount}
          onSelectTicker={(sym) => setSelectedSymbol(sym)}
          onOpenCanadianSuite={() => setMonitorSubTab('tfsa_rrsp')}
          onNavigateToJournal={() => setCurrentScreen('journal')}
        />
      )}

      {/* SCREEN 8: PCR (Put/Call Ratio & Institutional Sentiment Engine) */}
      {screenToRender === 'pcr' && (
        <PutCallRatioView
          ticker={selectedTicker}
          allChains={allChains}
          onNavigateToChain={(dte) => {
            if (dte !== undefined) setActiveDte(dte);
            setCurrentScreen('omon');
          }}
          onNavigateToFlow={() => setCurrentScreen('flow')}
          onNavigateToVols={() => setCurrentScreen('vols')}
          onNavigateToValuation={() => setCurrentScreen('ovme')}
          onOpenNetGamma={() => setIsNetGammaOpen(true)}
        />
      )}



      {/* SCREEN: VEGA (Institutional Vega Term Structure under Volatility Suite) */}
      {screenToRender === 'vega' && (
        <VolatilityLabView
          ticker={selectedTicker}
          chain={currentChain}
          allChains={allChains}
          positions={account.positions}
          legs={builderLegs}
          selectedDte={activeDte}
          initialTab="vega"
          onSelectDte={(dte) => setActiveDte(dte)}
          onNavigateToChain={() => setCurrentScreen('omon')}
          onNavigateToCone={() => setCurrentScreen('cone')}
          onNavigateToValuation={() => setCurrentScreen('ovme')}
          onApplyStrategyTemplate={handleApplyStrategyTemplate}
        />
      )}

      {/* SCREEN: UNIFIED GLOBAL MACRO HUB (Economies, Yield Curves, Central Banks, OPEC, Tariffs, DEFCON, Regimes) */}
      {(screenToRender === 'macro' || screenToRender === 'yc' || screenToRender === 'opec' || screenToRender === 'tariff' || screenToRender === 'defcon') && (
        <GlobalMacroView
          initialTab={
            screenToRender === 'yc'
              ? 'yield_curve'
              : screenToRender === 'opec'
              ? 'opec'
              : screenToRender === 'tariff'
              ? 'tariff'
              : screenToRender === 'defcon'
              ? 'defcon'
              : macroSubTab
          }
          onSubTabChange={(tab) => setMacroSubTab(tab)}
          currentTicker={selectedTicker}
          onSelectTicker={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
          }}
          onNavigateToRisk={() => setCurrentScreen('risk')}
          onNavigateToChain={(sym) => {
            if (sym && tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('omon');
          }}
          onNavigateToValuation={() => setCurrentScreen('ovme')}
          onApplyStrategyLegs={(newLegs) => setBuilderLegs(newLegs)}
          onNavigateToGeoRisk={() => setMacroSubTab('geopolitical')}
        />
      )}

      {/* SCREEN: DIV (Bloomberg DVD Dividend Tracker, 12-Month Cash Flow Waterfall & 20-Year DRIP Engine) */}
      {screenToRender === 'div' && (
        <DividendTrackerView
          portfolioPositions={account.positions}
          tickers={tickers}
          accountCashBalance={account.cashBalance}
          onSelectTicker={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
          }}
          onNavigateToRisk={() => setCurrentScreen('risk')}
          onNavigateToOptions={() => setCurrentScreen('omon')}
          onOpenStockTrade={(sym) => {
            if (sym && tickers[sym]) setSelectedSymbol(sym);
            setIsStockTradeOpen(true);
          }}
        />
      )}

      {/* SCREEN: WITCH (Quadruple Witching Intelligence & Expiration Volatility Engine) */}
      {screenToRender === 'witch' && (
        <QuadrupleWitchingView
          currentTicker={selectedTicker}
          allTickers={tickers}
          onSelectTicker={(sym) => setSelectedSymbol(sym)}
          onNavigateToChain={(dte) => {
            if (dte !== undefined) setActiveDte(dte);
            setCurrentScreen('omon');
          }}
          onNavigateToRisk={() => setCurrentScreen('risk')}
          onNavigateToStrategyCatalog={() => setIsStrategyCatalogOpen(true)}
          onPopOut={() => handleOpenPopOut('witch')}
        />
      )}

      {/* SCREEN: BNN (BNN Bloomberg Free Live Streaming & Financial News Broadcast) */}
      {screenToRender === 'bnn' && (
        <BNNLiveStreamingView
          onSelectTicker={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
          }}
          onPopOut={() => handleOpenPopOut('bnn')}
          onTogglePip={() => setIsBnnPipOpen((prev) => !prev)}
          isPipActive={isBnnPipOpen}
        />
      )}


      {/* SCREEN: FTS (Futures Term Structure, Forward Curves, Contango/Backwardation & Roll Yield) */}
      {screenToRender === 'fts' && (
        <FuturesTermStructureView
          initialStructureId={selectedTicker.symbol.startsWith('/') ? selectedTicker.symbol.replace('/', '') : 'VIX'}
          onNavigateToChain={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('omon');
          }}
          onOpenOrderTicket={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setIsStockTradeOpen(true);
          }}
          onNavigateToRisk={() => setCurrentScreen('risk')}
          onNavigateToYieldCurve={() => setCurrentScreen('yc')}
          onOpenTSXFuturesHub={() => setIsTSXFuturesHubOpen(true)}
          onPopOut={() => handleOpenPopOut('fts')}
        />
      )}

      {/* SCREEN: SKEW (Quant Volatility Skew Finder, 25-Delta Risk Reversal, Fly, Regime & Arbitrage Scanner) */}
      {screenToRender === 'skew' && (
        <VolatilitySkewFinderView
          ticker={selectedTicker}
          allChains={allChains}
          positions={account.positions}
          onSelectTicker={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
          }}
          onNavigateToChain={() => setCurrentScreen('omon')}
          onNavigateToSurface={() => setCurrentScreen('surf')}
          onNavigateToCone={() => setCurrentScreen('cone')}
          onNavigateToHIVG={() => setCurrentScreen('hivg')}
          onNavigateToFTS={() => setCurrentScreen('fts')}
          onApplyTrade={(opp) => {
            if (tickers[opp.symbol]) setSelectedSymbol(opp.symbol);
            setIsStrategyExecutionOpen(true);
          }}
        />
      )}

      {/* SCREEN: JOURNAL (Strategy Trade Journal, Execution Stats, Entry IV & P&L Excursion Engine) */}
      {screenToRender === 'journal' && (
        <StrategyTradeJournalView
          currentTicker={selectedTicker}
          allTickers={tickers}
          positions={account.positions}
          onNavigateToRisk={(legs, sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setBuilderLegs(legs);
            setCurrentScreen('risk');
          }}
          onNavigateToChain={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('omon');
          }}
          onClosePosition={handleClosePosition}
          onPopOut={() => handleOpenPopOut('journal')}
        />
      )}

      {/* SCREEN: EDUC (Options Academy, Strategy Risk Profiles, Skews, Event Risk, Greeks & Valuation) */}
      {screenToRender === 'educ' && (
        <OptionsEducationView
          currentTicker={selectedTicker}
          allTickers={tickers}
          onStageStrategy={(legs, sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setBuilderLegs(legs);
            setCurrentScreen('ovme');
          }}
          onNavigateToChain={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('omon');
          }}
          onNavigateToRisk={(legs, sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setBuilderLegs(legs);
            setCurrentScreen('risk');
          }}
          onNavigateToVolLab={() => setCurrentScreen('vols')}
          onPopOut={() => handleOpenPopOut('educ')}
        />
      )}

      {/* SCREEN: EXP (Options Expiration Master Calendar, Term Structure & Settlement Rules) */}
      {screenToRender === 'exp' && (
        <OptionsExpirationView
          currentTicker={selectedTicker}
          allTickers={tickers}
          allChains={allChains}
          activeDte={activeDte}
          onSelectDte={(dte) => {
            setActiveDte(dte);
          }}
          onNavigateScreen={(screen) => {
            setCurrentScreen(screen);
          }}
          onOpenQuadWitching={() => {
            setIsQuadWitchingOpen(true);
          }}
          onOpenExpectedMove={() => {
            setIsExpectedMoveOpen(true);
          }}
          onOpenNetGamma={() => {
            setIsNetGammaOpen(true);
          }}
          onApplyStrategyTemplate={handleApplyStrategyTemplate}
          onAddLeg={handleAddLeg}
        />
      )}

      {/* SCREEN: GICS (GICS Canada: Global Industry Classification Standard, 11 Sectors, Heatmap, TSX Equities) */}
      {screenToRender === 'gics' && (
        <GICSCanadaView
          canadianAccounts={canadianAccounts}
          onUpdateAccounts={setCanadianAccounts}
          onSelectTicker={(sym) => {
            if (tickers[sym]) {
              setSelectedSymbol(sym);
            }
          }}
          onNavigateToChain={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('omon');
          }}
          onNavigateToChart={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('chart');
          }}
          onNavigateToValuation={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('ovme');
          }}
          onNavigateToRisk={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('risk');
          }}
          onOpenTSXFuturesHub={() => setIsTSXFuturesHubOpen(true)}
          onOpenCanadianSuite={() => setIsCanadianSuiteOpen(true)}
        />
      )}

      {/* SCREEN: GIC (Canadian Guaranteed Investment Certificates: Rates Matrix, Compound Calculator & CDIC Protection) */}
      {screenToRender === 'gic' && (
        <GICSCanadaView
          initialTab="gic"
          canadianAccounts={canadianAccounts}
          onUpdateAccounts={setCanadianAccounts}
          onSelectTicker={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
          }}
          onNavigateToChain={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('omon');
          }}
          onNavigateToChart={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('chart');
          }}
          onNavigateToValuation={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('ovme');
          }}
          onNavigateToRisk={(sym) => {
            if (tickers[sym]) setSelectedSymbol(sym);
            setCurrentScreen('risk');
          }}
          onOpenTSXFuturesHub={() => setIsTSXFuturesHubOpen(true)}
          onOpenCanadianSuite={() => setIsCanadianSuiteOpen(true)}
        />
      )}

      {/* SCREEN: DES (Institutional ETF Fundamentals, Holdings, Sector Allocation & Company Profiles) */}
      {screenToRender === 'des' && (
        <div className="w-full h-full flex flex-col">
          <CompanyProfileView
            currentTicker={selectedTicker}
            allTickers={tickers}
            onSelectTicker={(sym: string) => setSelectedSymbol(sym)}
            onOpenStockTrade={() => {
              setIsStockTradeFractional(true);
              setIsStockTradeOpen(true);
            }}
            onNavigateToChain={() => setCurrentScreen('omon')}
            onNavigateToRisk={() => setCurrentScreen('risk')}
            onNavigateToCone={() => setCurrentScreen('cone')}
            onNavigateToValuation={() => setCurrentScreen('ovme')}
            isModal={isPopOut}
          />
        </div>
      )}

      {/* Fallback branded state if no screen is matched */}
      {![
        'omon', 'ovme', 'risk', 'cone', 'scen', 'flow', 'vols', 'chart', 'port',
        'monitor', 'statement', 'hivg', 'surf', 'pcr', 'opec', 'tariff', 'defcon', 'vega',
        'yc', 'macro', 'div', 'witch', 'bnn', 'exp', 'fts', 'gics', 'gic', 'des', 'skew', 'journal', 'educ'
      ].includes(screenToRender) && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <img
            src="/icon.svg"
            alt="StrikePoint Public Icon"
            className="w-16 h-16 object-contain drop-shadow-[0_0_24px_rgba(255,153,0,0.6)] mb-3 animate-pulse"
          />
          <h2 className="text-lg font-black text-white tracking-wider mb-1 font-mono">
            STRIKEPOINT OPTIONS TERMINAL
          </h2>
          <p className="text-xs text-[#8b9bb4] max-w-sm mb-4 font-mono">
            Professional derivatives intelligence, Greeks modeling, and high-frequency volatility analysis.
          </p>
          <button
            onClick={() => setCurrentScreen('omon')}
            className="px-4 py-1.5 rounded bg-[#ff9900] text-black font-black text-xs hover:bg-[#ffaa22] transition-colors cursor-pointer"
          >
            OPEN OPTION CHAIN &lt;OMON&gt;
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="tos-app-shell">
      {/* Top Utility Bar */}
      <div className="system-nav">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#101522] border border-[#222d44]">
            <img src="/icon.svg" alt="StrikePoint" className="w-3.5 h-3.5 object-contain" />
            <span className="font-mono font-black text-[10px] text-[#ff9900] tracking-wider">STRIKEPOINT</span>
          </div>
          <button onClick={() => setIsHelpOpen(true)} className="hover:text-white text-[#94a3b8] flex items-center gap-1 text-[10px] cursor-pointer">
            <span className="f-key">F1</span> HELP
          </button>
        </div>

        <div className="f-keys hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button onClick={() => setCurrentScreen('omon')} className={`hover:opacity-80 transition-colors ${currentScreen === 'omon' ? 'text-white font-bold' : ''}`}>
            <span className="f-key">F2</span> OMON
          </button>
          <button onClick={() => setCurrentScreen('ovme')} className={`hover:opacity-80 transition-colors ${currentScreen === 'ovme' ? 'text-white font-bold' : ''}`}>
            <span className="f-key">F3</span> OVME
          </button>
          <button onClick={() => setCurrentScreen('risk')} className={`hover:opacity-80 transition-colors ${currentScreen === 'risk' ? 'text-white font-bold' : ''}`}>
            <span className="f-key">F4</span> RISK
          </button>
          <button onClick={() => setCurrentScreen('cone')} className={`hover:opacity-80 transition-colors ${currentScreen === 'cone' ? 'text-white font-bold' : ''}`}>
            <span className="f-key">F5</span> CONE
          </button>
          <button onClick={() => setCurrentScreen('scen')} className={`hover:opacity-80 transition-colors ${currentScreen === 'scen' ? 'text-white font-bold' : ''}`}>
            <span className="f-key">F6</span> SCEN
          </button>
          <button onClick={() => setCurrentScreen('flow')} className={`hover:opacity-80 transition-colors ${currentScreen === 'flow' ? 'text-white font-bold' : ''}`}>
            <span className="f-key">F7</span> FLOW
          </button>
          <button onClick={() => setCurrentScreen('vols')} className={`hover:opacity-80 transition-colors ${currentScreen === 'vols' ? 'text-white font-bold' : ''}`}>
            <span className="f-key">F8</span> VOLS
          </button>
          <button onClick={() => setCurrentScreen('chart')} className={`hover:opacity-80 transition-colors ${currentScreen === 'chart' ? 'text-white font-bold' : ''}`}>
            <span className="f-key">F10</span> CHART
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setMonitorSubTab('positions');
              setCurrentScreen('monitor');
            }}
            className={`hover:opacity-80 transition-colors ${currentScreen === 'monitor' ? 'text-[#38bdf8] font-bold' : ''}`}
            title="Positions, Portfolio & Margin Monitor"
          >
            <span className="f-key text-[#38bdf8]">MON</span> MONITOR {account.positions.length > 0 ? `(${account.positions.length})` : ''}
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setCurrentScreen('macro');
            }}
            className={`hover:opacity-80 transition-colors ${currentScreen === 'macro' ? 'text-[#00e676] font-bold' : ''}`}
            title="Global Macro Hub (Economies, Yield Curves, Tariffs, DEFCON, OPEC, Geo Risk)"
          >
            <span className="f-key text-[#00e676]">MACR</span> MACRO
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Zoom Stepper */}
          <div className="flex items-center bg-[#141b28] px-1 py-0.5 rounded border border-[#222d44] text-[10px] select-none">
            <button
              onClick={() => handleStepZoom(-0.05)}
              className="px-1 text-[#8b9bb4] hover:text-white font-mono font-bold cursor-pointer"
              title="Zoom Out (-5%)"
            >
              -
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setIsDisplaySettingsOpen(true);
              }}
              className="text-[#ff9900] font-mono font-black px-1 cursor-pointer hover:underline"
              title="Display scale settings"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={() => handleStepZoom(+0.05)}
              className="px-1 text-[#8b9bb4] hover:text-white font-mono font-bold cursor-pointer"
              title="Zoom In (+5%)"
            >
              +
            </button>
          </div>

          {/* Text Size Cycler */}
          <button
            onClick={handleCycleTextLegibility}
            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold transition-all cursor-pointer ${
              textLegibility === 'xlarge'
                ? 'bg-[#ffd600]/20 text-[#ffd600] border-[#ffd600]/50'
                : textLegibility === 'large'
                ? 'bg-[#00d2ff]/20 text-[#00d2ff] border-[#00d2ff]/50'
                : 'bg-[#141b28] text-[#cbd5e1] hover:text-white border-[#222d44]'
            }`}
            title="Cycle Text Legibility (STD / LRG / XL)"
          >
            <span className="font-mono">{textLegibility === 'xlarge' ? 'TXT:XL' : textLegibility === 'large' ? 'TXT:LG' : 'TXT:STD'}</span>
          </button>

          {/* 1-Click Fit */}
          <button
            onClick={() => {
              playExecutionChime();
              handleFitToScreen();
            }}
            className="px-1.5 py-0.5 rounded bg-[#00d2ff]/10 hover:bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/30 text-[10px] font-bold transition-all cursor-pointer"
            title="Fit resolution to viewport"
          >
            <span>FIT</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => {
              playKeyClick();
              handleToggleFullscreen();
            }}
            className="p-1 rounded bg-[#ffd600]/10 hover:bg-[#ffd600]/20 text-[#ffd600] border border-[#ffd600]/30 text-[10px] font-bold transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={handleAudioToggle}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#141b28] hover:bg-[#202a3c] text-[#cbd5e1] border border-[#222d44] text-[10px] font-bold cursor-pointer"
            title={isAudioOn ? 'Audio On (Click to mute)' : 'Muted (Click to unmute)'}
          >
            {isAudioOn ? <Volume2 className="w-3 h-3 text-[#00e676]" /> : <VolumeX className="w-3 h-3 text-[#8c8c8c]" />}
            <span className="hidden xl:inline">{isAudioOn ? 'AUDIO' : 'MUTE'}</span>
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => {
              playKeyClick();
              setIsDisplaySettingsOpen(true);
            }}
            className="p-1 rounded bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 cursor-pointer"
            title="Display, Sound & Device Settings"
          >
            <Sliders className="w-3 h-3" />
          </button>

          {/* Quick Time Zone Switcher & Financial Market Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0b101c] border border-[#1e2a40] hover:border-[#ff9900]/50 transition-colors shadow-inner">
            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setIsClockBellModalOpen(true);
              }}
              className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#ff9900] hover:text-[#ffd600] cursor-pointer transition-colors"
              title="Click to open Full World Clocks & Exchange Bells Controller <TZ / BELL>"
            >
              <Clock className="w-3 h-3 text-[#ff9900]" />
              <span>{clockTime.est}</span>
            </button>

            {/* Quick Time Zone Dropdown */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-[#1e2a40]">
              <Globe className="w-3 h-3 text-[#00d2ff]" />
              <select
                value={timeZoneId}
                onChange={(e) => {
                  playKeyClick();
                  handleSelectTimeZone(e.target.value);
                }}
                className="bg-[#101726] text-[#00e676] font-mono font-bold text-[9.5px] border border-[#23334d] hover:border-[#ff9900] rounded px-1 py-0.5 outline-none cursor-pointer tracking-wider"
                title="Quick Switch Time Zone (ET, CT, PT, UTC, LON, TOK...)"
              >
                <optgroup label="North America">
                  <option value="et">ET · New York / TSX</option>
                  <option value="ct">CT · Chicago CME</option>
                  <option value="mt">MT · Denver Mountain</option>
                  <option value="pt">PT · SF / LA Pacific</option>
                  <option value="at">AT · Halifax Atlantic</option>
                </optgroup>
                <optgroup label="Global & Europe">
                  <option value="utc">UTC · Coordinated Universal</option>
                  <option value="lon">LON · London LSE</option>
                  <option value="fra">CET · Frankfurt XETRA</option>
                  <option value="par">CET · Paris Euronext</option>
                  <option value="zur">CHF · Zurich SIX</option>
                </optgroup>
                <optgroup label="Asia-Pacific & Middle East">
                  <option value="tok">JST · Tokyo JPX</option>
                  <option value="hk">HKT · Hong Kong HKEX</option>
                  <option value="sg">SGT · Singapore SGX</option>
                  <option value="mum">IST · Mumbai NSE</option>
                  <option value="sha">CST · Shanghai SSE</option>
                  <option value="syd">AEST · Sydney ASX</option>
                  <option value="dxb">GST · Dubai DFM</option>
                  <option value="br">BRT · São Paulo B3</option>
                </optgroup>
                <optgroup label="System Device">
                  <option value="local">LOC · Operating System Local</option>
                </optgroup>
              </select>

              <button
                type="button"
                onClick={() => {
                  playKeyClick();
                  setIsClockBellModalOpen(true);
                }}
                className="text-[#8c9bb4] hover:text-[#ff9900] p-0.5 ml-0.5 transition-colors cursor-pointer"
                title="All World Clocks, Sessions & Bells <TZ>"
              >
                <Bell className="w-3 h-3 hover:scale-125 transition-transform text-[#ffd600]" />
              </button>
            </div>
          </div>

          {/* Mobile Clock & TZ Button */}
          <button
            type="button"
            onClick={() => {
              playKeyClick();
              setIsClockBellModalOpen(true);
            }}
            className="sm:hidden flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#101726] border border-[#1e2a40] text-[9.5px] font-mono text-[#ff9900] cursor-pointer"
            title="Market Clock & Time Zone <TZ>"
          >
            <Clock className="w-3 h-3 text-[#ff9900]" />
            <span>{timeZoneId.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Search Header */}
      <header className="top-header">
        {/* Sidebar Watchlist Toggle Button */}
        <button
          type="button"
          onClick={() => {
            playKeyClick();
            setIsSidebarOpen((prev) => {
              const next = !prev;
              try {
                localStorage.setItem('strikepoint_sidebar_open', String(next));
              } catch {}
              return next;
            });
          }}
          className={`px-2.5 py-1 rounded text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            isSidebarOpen
              ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-[0_0_8px_rgba(255,153,0,0.4)]'
              : 'bg-[#151c2d] hover:bg-[#ff9900]/20 text-[#ff9900] border-[#ff9900]/60'
          }`}
          title={isSidebarOpen ? 'Collapse Left Watchlist Sidebar' : 'Show Left Watchlist Sidebar'}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-3.5 h-3.5" />
          ) : (
            <PanelLeftOpen className="w-3.5 h-3.5" />
          )}
          <span>{isSidebarOpen ? 'HIDE WATCHLIST' : 'WATCHLIST'}</span>
        </button>

        <form onSubmit={handleCommandSubmit} className="symbol-input-group">
          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>&gt;</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="SPY US Equity OMON"
          />
          <button type="submit" className="btn-go" style={{ marginRight: '4px' }}>
            &lt;GO&gt;
          </button>
        </form>

        <div className="quote-summary">
          <div>
            <span style={{ color: 'var(--ink-muted)', fontSize: '10px' }} className="flex items-center gap-1.5">
              <span className="font-bold">{selectedTicker.symbol}</span>
              {selectedTicker.symbol.startsWith('/') || selectedTicker.assetType === 'future' ? (
                <span className="text-[#ffd600] font-black bg-[#ffd600]/20 px-1 py-0.5 rounded border border-[#ffd600]/40 text-[9px]">
                  FUTURES &amp; FOP
                </span>
              ) : (
                <span>US EQUITY</span>
              )}
            </span>
          </div>
          <div className="quote-val">
            ${selectedTicker.price.toFixed(selectedTicker.symbol === '/6E' ? 4 : selectedTicker.symbol === '/NG' ? 3 : 2)}
          </div>
          <div className={`quote-delta ${isUp ? 'pos' : 'neg'}`}>
            {isUp ? '▲ +' : '▼ '}
            {selectedTicker.change.toFixed(selectedTicker.symbol === '/6E' ? 4 : selectedTicker.symbol === '/NG' ? 3 : 2)} (
            {isUp ? '+' : ''}
            {selectedTicker.changePercent.toFixed(2)}%)
          </div>
          <div className="quote-delta hidden md:block" style={{ color: '#64748b' }}>
            Prev: {selectedTicker.previousClose.toFixed(selectedTicker.symbol === '/6E' ? 4 : selectedTicker.symbol === '/NG' ? 3 : 2)}
          </div>

          {/* Expected Price Move Header Metric */}
          <button
            onClick={() => {
              playKeyClick();
              setIsExpectedMoveOpen(true);
            }}
            title="Click to view Expected Price Move Matrix across all expirations"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0b101d] border border-[#1e293b] hover:border-[#00d2ff]/60 transition-all text-left cursor-pointer group"
          >
            <div>
              <div className="text-[8.5px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#00d2ff]">
                <span>EXP MOVE</span>
                <span className="text-[#ffd600] font-bold">±1σ</span>
              </div>
              <div className="font-mono font-bold text-[11px] text-white flex items-center gap-1">
                <span className="text-[#00e676]">
                  ±${(selectedTicker.price * (selectedTicker.currentIV || 0.25) * Math.sqrt(Math.max(1, activeDte) / 365)).toFixed(2)}
                </span>
                <span className="text-[10px] text-[#00d2ff]">
                  (±{(((selectedTicker.price * (selectedTicker.currentIV || 0.25) * Math.sqrt(Math.max(1, activeDte) / 365)) / selectedTicker.price) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              playKeyClick();
              setIsStockTradeFractional(false);
              setIsStockTradeOpen(true);
            }}
            className="px-2.5 py-1 bg-[var(--bull)]/20 hover:bg-[var(--bull)]/30 text-[var(--bull)] border border-[var(--bull)]/50 rounded font-black text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title={`Trade shares of ${selectedTicker.symbol} or futures contracts`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>TRADE</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setIsStrategyCatalogOpen(true);
            }}
            className="hidden sm:flex px-2 py-1 bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] border border-[#ff9900]/40 rounded font-bold text-xs items-center gap-1 transition-all shadow-sm cursor-pointer"
            title="Browse all 45+ Institutional Options Strategies Directory"
          >
            <span>STRATEGIES</span>
            <span className="text-[10px] bg-[#ff9900]/30 px-1 rounded font-mono font-black">45+</span>
          </button>
        </div>

        {/* Right Status Badges & Privacy Controls */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {/* Visual Margin Call Warning */}
          {isMarginWarning && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ff334b] text-white font-black text-[10px] animate-pulse border border-white/40 shadow-[0_0_10px_rgba(255,51,75,0.9)]"
              title={`Margin required ($${marginRequirement.toFixed(0)}) exceeds 80% of cash`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MARGIN: {marginUsagePct.toFixed(0)}%</span>
            </div>
          )}

          {/* Account Privacy & Stealth Mode Toggle */}
          <div className="flex items-center bg-[#0a0f1d] border border-[#1e293b] rounded p-0.5 shadow-sm">
            <button
              onClick={handleTogglePrivacyMode}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                privacySettings.isPrivacyMode
                  ? 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/50 shadow-[0_0_8px_rgba(255,153,0,0.3)]'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
              title={privacySettings.isPrivacyMode ? 'Stealth Mode Active (Balances Masked). Click to unmask.' : 'Activate Stealth Mode (Alt+P)'}
            >
              {privacySettings.isPrivacyMode ? <EyeOff className="w-3 h-3 text-[#ff9900]" /> : <Eye className="w-3 h-3" />}
              <span className="hidden md:inline">{privacySettings.isPrivacyMode ? 'MASKED' : 'STEALTH'}</span>
            </button>
            <button
              onClick={() => {
                playExecutionChime();
                handleTriggerScreenBlur();
              }}
              className="p-1 rounded text-[#00d2ff] hover:bg-[#00d2ff]/20 transition-all cursor-pointer"
              title="Instant Screen Camouflage / Frosted Blur Lock"
            >
              <Lock className="w-3 h-3" />
            </button>
          </div>

          <div
            className="gadget-header font-mono cursor-pointer"
            style={{ background: 'transparent', border: '1px solid var(--border)' }}
            onClick={handleTogglePrivacyMode}
            title={privacySettings.isPrivacyMode ? 'Click to toggle Stealth Mode' : 'Click to mask Buying Power'}
          >
            BP: <span style={{ color: 'cyan', marginLeft: '4px' }}>
              {maskCurrency(optionsBP > 100000 ? `${(optionsBP / 1000).toFixed(0)}k` : optionsBP.toFixed(0), privacySettings.isPrivacyMode, '$', 0)}
            </span>
          </div>
          <div
            className="gadget-header font-mono hidden sm:flex cursor-pointer"
            style={{ background: 'transparent', border: '1px solid var(--border)' }}
            onClick={handleTogglePrivacyMode}
            title={privacySettings.isPrivacyMode ? 'Click to toggle Stealth Mode' : 'Click to mask Net Liq'}
          >
            NET LIQ: <span style={{ color: '#fff', marginLeft: '4px' }}>
              {maskCurrency(netLiq, privacySettings.isPrivacyMode, '$', 2)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className={`main-workspace ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
        {/* Mobile Backdrop when sidebar drawer is open on mobile */}
        {isSidebarOpen && (
          <div
            className="md:hidden mobile-sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Panels */}
        <aside className={`left-sidebar ${isSidebarOpen ? 'drawer-open' : 'drawer-closed'}`}>
          {/* Sidebar Header with Close & Minimize Button */}
          <div className="flex items-center justify-between p-2 sm:p-2.5 bg-[#0a0f1c] border-b border-[#1e2a44] shrink-0">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <PanelLeftClose className="w-3.5 h-3.5 text-[#ff9900]" />
              <span className="font-mono text-[11px] text-[#ff9900] font-black tracking-wide">WATCHLIST &amp; SUITE</span>
            </span>
            <button
              type="button"
              onClick={() => {
                playKeyClick();
                setIsSidebarOpen(false);
                try {
                  localStorage.setItem('strikepoint_sidebar_open', 'false');
                } catch {}
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1e2638] hover:bg-[#ff9900] text-[#cbd5e1] hover:text-black text-[10px] font-bold border border-[#2e3c54] transition-all cursor-pointer shadow-sm"
              title="Hide Watchlist to make screen bigger"
            >
              <X className="w-3 h-3" />
              <span>HIDE</span>
            </button>
          </div>

          {/* Sidebar Segmented Navigation Bar */}
          <div className="grid grid-cols-4 bg-[#070b14] border-b border-[#1e2a44] p-1 gap-1 text-[10px] font-bold shrink-0">
            <button
              onClick={() => {
                playKeyClick();
                setSidebarActiveTab('watchlist');
              }}
              className={`py-1 px-1 rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                sidebarActiveTab === 'watchlist'
                  ? 'bg-[#ff9900] text-black font-black shadow-sm'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
              }`}
              title="Watchlist & Custom Folders"
            >
              <Folder className="w-3 h-3" />
              <span>WATCH</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSidebarActiveTab('strategies');
              }}
              className={`py-1 px-1 rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                sidebarActiveTab === 'strategies'
                  ? 'bg-[#ff9900] text-black font-black shadow-sm'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
              }`}
              title="Strategy Templates & Catalog"
            >
              <Zap className="w-3 h-3" />
              <span>STRATS</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSidebarActiveTab('analysis');
              }}
              className={`py-1 px-1 rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                sidebarActiveTab === 'analysis'
                  ? 'bg-[#ff9900] text-black font-black shadow-sm'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
              }`}
              title="Options Volatility Analytics"
            >
              <BarChart2 className="w-3 h-3" />
              <span>ANLYS</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSidebarActiveTab('earnings');
              }}
              className={`py-1 px-1 rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                sidebarActiveTab === 'earnings'
                  ? 'bg-[#ff9900] text-black font-black shadow-sm'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b28]'
              }`}
              title="Earnings Calendar"
            >
              <Calendar className="w-3 h-3" />
              <span>EARN</span>
            </button>
          </div>

          {/* Active Sidebar Gadget */}
          {sidebarActiveTab === 'watchlist' && (
            <WatchlistSidebarGadget
              tickers={tickers}
              selectedSymbol={selectedSymbol}
              onSelectTicker={(sym) => {
                setSelectedSymbol(sym);
                setCurrentScreen('omon');
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              onOpenFullBlotter={() => setIsWatchlistModalOpen(true)}
              onOpenTSXFuturesHub={() => setIsTSXFuturesHubOpen(true)}
            />
          )}

          {sidebarActiveTab === 'strategies' && (
            <div className="gadget flex-1 flex flex-col p-2 overflow-y-auto">
              <div className="gadget-header flex items-center justify-between mb-2">
                <span className="font-bold text-[#ff9900]">Quick Templates</span>
                <button
                  onClick={() => {
                    playKeyClick();
                    setIsStrategyCatalogOpen(true);
                  }}
                  className="text-[#ff9900] hover:underline font-bold text-[9px] cursor-pointer"
                  title="Open Institutional Options Strategy Directory"
                >
                  + Catalog ({ALL_OPTIONS_STRATEGIES.length})
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleApplyStrategyTemplate(e.target.value);
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-[#141b28] border border-[#222d44] text-[#cbd5e1] p-1.5 text-xs rounded"
                >
                  <option value="" disabled>Apply Strategy Template...</option>
                  <optgroup label="Single Leg Options">
                    <option value="long-call">Long Call (Bullish)</option>
                    <option value="short-call">Short Call (Naked)</option>
                    <option value="long-put">Long Put (Bearish)</option>
                    <option value="cash-secured-put">Cash-Secured Put</option>
                  </optgroup>
                  <optgroup label="Vertical Spreads">
                    <option value="bull-call-spread">Bull Call Spread (+Δ)</option>
                    <option value="bear-call-spread">Bear Call Spread (+Θ)</option>
                    <option value="bull-put-spread">Bull Put Spread (+Θ)</option>
                    <option value="bear-put-spread">Bear Put Spread (-Δ)</option>
                  </optgroup>
                  <optgroup label="Straddles & Strangles">
                    <option value="long-straddle">Long Straddle (Vol)</option>
                    <option value="short-straddle">Short Straddle (Theta)</option>
                    <option value="long-strangle">Long Strangle (OTM)</option>
                    <option value="short-strangle">Short Straddle</option>
                  </optgroup>
                  <optgroup label="Wings / Condors & Butterflies">
                    <option value="iron-condor">Iron Condor (4-Leg)</option>
                    <option value="reverse-iron-condor">Reverse Iron Condor</option>
                    <option value="iron-butterfly">Iron Butterfly (ATM)</option>
                    <option value="long-call-butterfly">Call Butterfly (1-2-1)</option>
                    <option value="long-put-butterfly">Put Butterfly (1-2-1)</option>
                    <option value="broken-wing-call-butterfly">Broken Wing Butterfly</option>
                  </optgroup>
                  <optgroup label="Calendars & Diagonals">
                    <option value="call-calendar-spread">Call Calendar Spread</option>
                    <option value="put-calendar-spread">Put Calendar Spread</option>
                    <option value="double-calendar-spread">Double Calendar Spread</option>
                    <option value="double-diagonal-spread">Double Diagonal Spread</option>
                    <option value="poor-mans-covered-call">Poor Man's Covered Call (PMCC)</option>
                    <option value="poor-mans-covered-put">Poor Man's Covered Put (PMCP)</option>
                  </optgroup>
                  <optgroup label="Covered & Synthetics">
                    <option value="covered-call">Covered Call (Buy-Write)</option>
                    <option value="protective-put">Protective Put (Hedge)</option>
                    <option value="collar">Collar (Zero-Cost)</option>
                    <option value="synthetic-long-stock">Synthetic Long Stock</option>
                  </optgroup>
                  <optgroup label="Ratios & Exotics">
                    <option value="jade-lizard">Jade Lizard</option>
                    <option value="reverse-jade-lizard">Reverse Jade Lizard</option>
                    <option value="call-ratio-backspread">Call Ratio Backspread</option>
                    <option value="put-ratio-backspread">Put Ratio Backspread</option>
                    <option value="box-spread">Box Spread (Arbitrage)</option>
                  </optgroup>
                </select>

                <button
                  onClick={() => {
                    playKeyClick();
                    setIsStrategyCatalogOpen(true);
                  }}
                  className="tos-btn w-full py-1.5 text-center font-bold text-[#ff9900] bg-[#ff9900]/10 hover:bg-[#ff9900]/20 border border-[#ff9900]/40 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>+ BROWSE ALL 45+ STRATEGIES</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {[
                    { label: 'Covered Call', id: 'covered-call' },
                    { label: 'Bull Call', id: 'bull-call-spread' },
                    { label: 'Iron Condor', id: 'iron-condor' },
                    { label: 'Straddle', id: 'long-straddle' },
                    { label: 'Butterfly', id: 'long-call-butterfly' },
                    { label: 'Calendar', id: 'call-calendar-spread' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyStrategyTemplate(tpl.id)}
                      className="tos-btn truncate py-1 text-[10px] cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                {builderLegs.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#222d44] text-[10px]">
                    <div className="flex justify-between text-[#8b9bb4]">
                      <span>Active Legs:</span>
                      <strong className="text-white">{builderLegs.length}</strong>
                    </div>
                    <button
                      onClick={() => setCurrentScreen('ovme')}
                      className="tos-btn w-full mt-2 text-center text-[#ff9900] cursor-pointer"
                    >
                      Evaluate in OVME &gt;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {sidebarActiveTab === 'analysis' && (
            <OptionsAnalysisSidebarGadget
              selectedTicker={selectedTicker}
              atmMetrics={atmMetrics}
              currentTickerPcr={currentTickerPcr}
              onSelectTicker={(sym) => setSelectedSymbol(sym)}
              onOpenFullGeoRiskModal={() => setIsCountryRiskOpen(true)}
              onNavigateToTariff={() => {
                setMacroSubTab('tariff');
                setCurrentScreen('macro');
              }}
              onNavigateToYieldCurve={() => {
                setMacroSubTab('yield_curve');
                setCurrentScreen('macro');
              }}
              onOpenNetGamma={() => setIsNetGammaOpen(true)}
            />
          )}

          {sidebarActiveTab === 'earnings' && (
            <EarningsCalendarSidebar
              tickers={tickers}
              selectedSymbol={selectedSymbol}
              onSelectTicker={(sym) => setSelectedSymbol(sym)}
              onNavigateToOpec={() => {
                setMacroSubTab('opec');
                setCurrentScreen('macro');
              }}
            />
          )}
        </aside>

        {/* Floating Quick Edge Toggle when Watchlist is Collapsed */}
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => {
              playKeyClick();
              setIsSidebarOpen(true);
              try {
                localStorage.setItem('strikepoint_sidebar_open', 'true');
              } catch {}
            }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-[#0d1322]/95 hover:bg-[#ff9900] hover:text-black text-[#ff9900] border-y border-r border-[#ff9900]/50 rounded-r-md px-1.5 py-3 flex flex-col items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer transition-all group backdrop-blur-sm"
            title="Click to show Watchlist & Strategy Suite"
          >
            <PanelLeftOpen className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="[writing-mode:vertical-rl] rotate-180 text-[9.5px] font-black tracking-widest font-mono">
              WATCHLIST
            </span>
          </button>
        )}

        {/* Content Area */}
        <main className="content-area">
          <div className="tab-bar">
            {/* Primary Core Options Screens */}
            <div
              className={`tab ${currentScreen === 'omon' ? 'active' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('omon');
              }}
            >
              OPTION CHAIN
            </div>

            <div
              className={`tab ${currentScreen === 'ovme' ? 'active' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('ovme');
              }}
            >
              GREEKS (OVME)
            </div>

            <div
              className={`tab ${currentScreen === 'risk' ? 'active' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('risk');
              }}
            >
              RISK PROFILE
            </div>

            <div
              className={`tab ${currentScreen === 'cone' ? 'active text-[#00e5ff] font-extrabold shadow-[0_0_8px_rgba(0,229,255,0.3)]' : 'text-[#00e5ff] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('cone');
              }}
              title="Probability Cone, Volatility Envelopes & Monte Carlo Paths <CONE>"
            >
              <TrendingUp className="w-3 h-3 inline-block mr-1 text-[#00e5ff]" />
              CONE
            </div>

            <div
              className={`tab ${currentScreen === 'vols' || currentScreen === 'vega' || currentScreen === 'surf' || currentScreen === 'hivg' ? 'active text-[#00e5ff] font-extrabold shadow-[0_0_8px_rgba(0,229,255,0.3)]' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('vols');
              }}
              title="Unified Volatility Suite (Multi-Skew, ATM Term Structure, Vega Term Structure & Constant Maturity, 3D Surface & Historical Vol)"
            >
              VOLATILITY
            </div>

            <div
              className={`tab ${currentScreen === 'exp' ? 'active text-[#ff9900] font-extrabold shadow-[0_0_8px_rgba(255,153,0,0.3)]' : 'text-[#ff9900] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('exp');
              }}
              title="Options Expiration Schedule, Volatility Term Structure & Settlement Rules <EXP>"
            >
              <Calendar className="w-3 h-3 inline-block mr-1 text-[#ff9900]" />
              EXPIRATIONS
            </div>

            <div
              className={`tab ${currentScreen === 'scen' ? 'active' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('scen');
              }}
            >
              SCENARIO
            </div>

            <div
              className={`tab ${currentScreen === 'flow' ? 'active' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('flow');
              }}
            >
              FLOW TAPE
            </div>

            <div
              className={`tab ${currentScreen === 'chart' ? 'active' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('chart');
              }}
            >
              CHART
            </div>

            <div
              className={`tab ${currentScreen === 'pcr' ? 'active' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('pcr');
              }}
            >
              PCR ENGINE
            </div>

            {/* Fundamentals & Macro Intelligence */}
            <div
              className={`tab ${currentScreen === 'des' ? 'active text-[#00d2ff] font-extrabold shadow-[0_0_8px_rgba(0,210,255,0.3)]' : 'text-[#00d2ff] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('des');
              }}
              title="Company Profile, Valuation Multiples & ETF Fundamentals <DES>"
            >
              {isTickerETF(selectedTicker.symbol, selectedTicker.name) ? (
                <PieChart className="w-3 h-3 inline-block mr-1 text-[#00d2ff]" />
              ) : (
                <Building2 className="w-3 h-3 inline-block mr-1 text-[#00d2ff]" />
              )}
              <span>{isTickerETF(selectedTicker.symbol, selectedTicker.name) ? 'ETF FUNDAMENTALS' : 'COMPANY PROFILE'}</span>
            </div>

            {/* Global Macro Hub */}
            <div
              className={`tab ${['macro', 'yc', 'opec', 'tariff', 'defcon'].includes(currentScreen) ? 'active text-[#00e676] font-extrabold shadow-[0_0_8px_rgba(0,230,118,0.3)]' : 'text-[#00e676] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('macro');
              }}
              title="Global Macro Hub: Economies, G20 Yield Curves, OPEC & IV, Tariffs, DEFCON 3 & Geo Risk <MACR>"
            >
              <span className="mr-1 inline-block">🌍</span>
              <span>GLOBAL MACRO</span>
              {['macro', 'yc', 'opec', 'tariff', 'defcon'].includes(currentScreen) && (
                <span className="ml-1.5 text-[8.5px] px-1 py-0.2 rounded bg-[#090d16] border border-[#1e2a44] text-[#00e676] font-mono tracking-wider hidden sm:inline">
                  {macroSubTab === 'yield_curve'
                    ? 'YIELD CURVES'
                    : macroSubTab === 'opec'
                    ? 'OPEC & IV'
                    : macroSubTab === 'tariff'
                    ? 'TARIFFS'
                    : macroSubTab === 'defcon'
                    ? 'DEFCON 3'
                    : macroSubTab === 'geopolitical'
                    ? 'GEO RISK'
                    : 'MACRO'}
                </span>
              )}
            </div>

            {/* Unified Account Monitor Hub */}
            <div
              className={`tab ${['monitor', 'port', 'statement'].includes(currentScreen) ? 'active text-[#38bdf8] font-extrabold shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'text-[#38bdf8] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('monitor');
              }}
              title="Unified Monitor Hub: Positions & Blotter, Portfolio & Greeks, Statement, and TFSA / RRSP Suite <MON>"
            >
              <Activity className="w-3 h-3 inline-block mr-1 text-[#38bdf8]" />
              <span>MONITOR</span>
              {account.positions.length > 0 && (
                <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-[#38bdf8]/25 font-mono">
                  {account.positions.length}
                </span>
              )}
              {['monitor', 'port', 'statement'].includes(currentScreen) && (
                <span className="ml-1.5 text-[8.5px] px-1 py-0.2 rounded bg-[#090d16] border border-[#1e2a44] text-[#38bdf8] font-mono tracking-wider hidden sm:inline">
                  {monitorSubTab === 'positions'
                    ? 'POSITIONS'
                    : monitorSubTab === 'portfolio'
                    ? 'PORTFOLIO'
                    : monitorSubTab === 'statement'
                    ? 'STATEMENT'
                    : 'TFSA/RRSP'}
                </span>
              )}
            </div>

            {/* Canadian Market Hubs */}
            <div
              className={`tab ${currentScreen === 'gics' ? 'active text-[#ff9900] font-extrabold shadow-[0_0_8px_rgba(255,153,0,0.3)]' : 'text-[#ff9900] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('gics');
              }}
              title="GICS Canada: 11 Sectors, Heatmap, TSX Equities & Macro Intelligence <GICS>"
            >
              <span className="mr-1 inline-block">🇨🇦</span>
              GICS CANADA
            </div>

            <div
              className={`tab ${currentScreen === 'gic' ? 'active text-[#00e676] font-extrabold shadow-[0_0_8px_rgba(0,230,118,0.3)]' : 'text-[#00e676] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('gic');
              }}
              title="Guaranteed Investment Certificates (GIC): Rates Matrix & Rollover <GIC>"
            >
              <ShieldCheck className="w-3 h-3 inline-block mr-1 text-[#00e676]" />
              GIC
            </div>

            <div
              className={`tab ${currentScreen === 'witch' ? 'active text-[#c084fc] font-extrabold' : ''}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('witch');
              }}
              title="Quadruple Witching Intelligence & Expiration Volatility Engine"
            >
              ⚡ QUAD WITCH
            </div>

            <div
              className={`tab ${currentScreen === 'bnn' ? 'active text-[#ff3b30] font-extrabold shadow-[0_0_8px_rgba(255,59,48,0.3)]' : 'text-[#ff3b30] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('bnn');
              }}
              title="BNN Bloomberg Free Live Stream & Market Coverage Broadcast <BNN>"
            >
              <span className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse inline-block mr-1.5" />
              BNN TV
            </div>

            <div
              className={`tab ${currentScreen === 'fts' ? 'active text-[#ff9900] font-extrabold shadow-[0_0_8px_rgba(255,153,0,0.3)]' : 'text-[#ff9900] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('fts');
              }}
              title="Futures Term Structure, Forward Curves, Contango/Backwardation & Roll Yield <FTS>"
            >
              <TrendingUp className="w-3 h-3 inline-block mr-1 text-[#ff9900]" />
              FTS CURVE
            </div>

            <div
              className={`tab ${currentScreen === 'skew' ? 'active text-[#ff9900] font-extrabold shadow-[0_0_8px_rgba(255,153,0,0.3)]' : 'text-[#ff9900] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('skew');
              }}
              title="Volatility Skew Finder: 25-Delta Risk Reversal, Butterfly Wings, Skew Slope & Arbitrage Scanner <SKEW>"
            >
              <Sliders className="w-3 h-3 inline-block mr-1 text-[#ff9900]" />
              SKEW FINDER
            </div>

            <div
              className={`tab ${currentScreen === 'journal' ? 'active text-[#ff9900] font-extrabold shadow-[0_0_8px_rgba(255,153,0,0.3)]' : 'text-[#ff9900] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('journal');
              }}
              title="Strategy Trade Journal: Automated Execution Ledger, Entry IV & P&L Excursions <JRNL>"
            >
              <BookOpen className="w-3 h-3 inline-block mr-1 text-[#ff9900]" />
              STRAT JRNL
            </div>

            <div
              className={`tab ${currentScreen === 'educ' ? 'active text-[#ff9900] font-extrabold shadow-[0_0_8px_rgba(255,153,0,0.3)]' : 'text-[#ff9900] hover:text-white'}`}
              onClick={() => {
                playKeyClick();
                setCurrentScreen('educ');
              }}
              title="Options Academy: Interactive Strategy Risk Profiles, Volatility Skews, Event Risk, Greeks & Valuation <EDUC>"
            >
              <GraduationCap className="w-3.5 h-3.5 inline-block mr-1 text-[#ff9900]" />
              ACADEMY
            </div>

            {/* Pop-Out Screen Button */}
            <button
              onClick={() => {
                playKeyClick();
                handleOpenPopOut(currentScreen);
              }}
              className="ml-auto px-2 py-0.5 my-1 mr-1 rounded bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[#00e5ff] border border-[#00e5ff]/40 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Pop out active screen into a separate floating window"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">POP OUT</span>
            </button>
          </div>

          {/* Options Expiration Sub-Header Bar (Only shown on options-relevant screens to eliminate clutter) */}
          {['omon', 'ovme', 'risk', 'scen', 'vols', 'exp', 'pcr'].includes(currentScreen) && (
            <div style={{ background: '#252525', padding: '4px 12px', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #333', overflowX: 'auto' }} className="no-scrollbar">
              {/* Direct Link to Full Options Expiration Calendar */}
              <button
                onClick={() => {
                  playKeyClick();
                  setCurrentScreen('exp');
                }}
                className="tos-btn bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] border border-[#ff9900]/40 font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                style={{ fontSize: '10px', padding: '2px 6px' }}
                title="Show Full Options Expiration Master Calendar <EXP>"
              >
                <Calendar className="w-3 h-3 text-[#ff9900]" />
                <span>EXP CALENDAR</span>
              </button>

              {/* Expiration Month Dropdown */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent)' }}>EXP MONTH:</span>
                <select
                  value={selectedExpMonth}
                  onChange={(e) => {
                    playKeyClick();
                    const m = e.target.value;
                    setSelectedExpMonth(m);
                    if (m !== 'ALL') {
                      const found = EXPIRATION_PRESETS.find((p) => p.month.toUpperCase() === m.toUpperCase());
                      if (found) setActiveDte(found.days);
                    }
                  }}
                  className="tos-btn"
                  style={{ fontSize: '10px', padding: '2px 4px', fontWeight: 'bold' }}
                >
                  <option value="ALL">ALL EXPIRATION MONTHS (18 Cycles)</option>
                  <option value="SEP">SEP '26 (Sep 29 - Front Month)</option>
                  <option value="OCT">OCT '26 (Oct 02 - Oct 30)</option>
                  <option value="NOV">NOV '26 (Nov 06 - Nov 20)</option>
                  <option value="DEC">DEC '26 (Dec 18 - Quarterly)</option>
                  <option value="JAN">JAN '27 (Jan 15 - Monthly)</option>
                  <option value="FEB">FEB '27 (Feb 19 - Monthly)</option>
                  <option value="MAR">MAR '27 (Mar 19 - Quarterly)</option>
                  <option value="APR">APR '27 (Apr 16 - Monthly)</option>
                  <option value="MAY">MAY '27 (May 21 - Monthly)</option>
                  <option value="JUN">JUN '27 (Jun 18 - Quarterly)</option>
                  <option value="SEP">SEP '27 (Sep 17 - LEAPS)</option>
                  <option value="DEC">DEC '27 (Dec 17 - LEAPS)</option>
                </select>
              </div>

              {/* Quick Month Filter Pills */}
              <div className="flex items-center gap-1 shrink-0">
                {['ALL', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'MAR', 'JUN'].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      playKeyClick();
                      setSelectedExpMonth(m);
                      if (m !== 'ALL') {
                        const found = EXPIRATION_PRESETS.find((p) => p.month.toUpperCase() === m.toUpperCase());
                        if (found) setActiveDte(found.days);
                      }
                    }}
                    className={`tos-btn ${
                      selectedExpMonth === m ? 'bg-[#ff9900] text-black font-extrabold border-[#ff9900]' : ''
                    }`}
                    style={{ fontSize: '9px', padding: '2px 6px' }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div style={{ height: '14px', width: '1px', background: '#444' }} className="shrink-0" />

              {/* Expiration Date Pills with Month and Days */}
              <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
                {EXPIRATION_PRESETS.filter(
                  (p) => selectedExpMonth === 'ALL' || p.month.toUpperCase() === selectedExpMonth.toUpperCase()
                ).map((p) => (
                  <button
                    key={p.days}
                    onClick={() => {
                      playKeyClick();
                      setActiveDte(p.days);
                    }}
                    className={`tos-btn shrink-0 flex items-center gap-1 ${
                      activeDte === p.days ? 'bg-[#ff9900] text-black font-extrabold border-[#ff9900]' : ''
                    }`}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    title={`${p.label} - ${p.category}`}
                  >
                    <span className="font-extrabold">{p.dateLabel}</span>
                    <span className="opacity-75 text-[9px]">({p.days}d)</span>
                    {p.isQuadWitching && (
                      <span
                        className={`px-1 py-0.2 rounded text-[7.5px] font-black ${
                          activeDte === p.days
                            ? 'bg-black text-[#a855f7]'
                            : 'bg-[#a855f7] text-black shadow-[0_0_6px_rgba(168,85,247,0.5)]'
                        }`}
                        title="Quadruple Witching Expiration"
                      >
                        ⚡ 4W
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ color: 'var(--ink-muted)', fontSize: '10px', marginLeft: 'auto' }} className="shrink-0 hidden md:block">
                Implied Move: <span style={{ color: '#00d2ff', fontWeight: 'bold' }}>±{atmMetrics.movePct.toFixed(2)}%</span>
              </div>
              <div style={{ color: 'var(--ink-muted)', fontSize: '10px' }} className="shrink-0 hidden md:block">
                ATM Straddle: <span style={{ color: '#ffd600', fontWeight: 'bold' }}>${atmMetrics.straddleCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className={`options-chain-wrapper ${currentScreen === 'risk' ? 'p-0 sm:p-1' : 'p-2'}`}>
            {renderScreenContent()}
          </div>
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="status-footer">
        <div className="ticker-tape">
          <button
            onClick={() => {
              playKeyClick();
              setCurrentScreen('macro');
            }}
            className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#00e676]/15 hover:bg-[#00e676]/30 text-[#00e676] border border-[#00e676]/40 mr-1 shrink-0 flex items-center gap-1 cursor-pointer transition-all"
            title="Open Global Macroeconomic Indicators & Central Bank Terminal"
          >
            <span>🌍 MACR &lt;GO&gt;</span>
          </button>
          <button
            onClick={() => {
              playKeyClick();
              setIsQuadWitchingOpen(true);
            }}
            className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-[#a855f7]/15 hover:bg-[#a855f7]/30 text-[#d8b4fe] border border-[#a855f7]/40 mr-1.5 shrink-0 flex items-center gap-1 cursor-pointer transition-all"
            title="Open Quadruple Witching Intelligence & Pin Risk Monitor <WITCH>"
          >
            <span>⚡ WITCH &lt;GO&gt;</span>
          </button>
          {macroIndices.map((idx) => {
            const isPositive = idx.change >= 0;
            return (
              <div
                key={idx.symbol}
                className="ticker-item cursor-pointer hover:bg-[#202632] px-1 rounded transition-colors"
                onClick={() => {
                  playKeyClick();
                  setCurrentScreen('macro');
                }}
                title={`Click to inspect ${idx.name} in Global Macro Engine`}
              >
                <span>{idx.symbol}</span>
                {idx.isRateOrYield
                  ? `${idx.value.toFixed(3)}%`
                  : idx.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {' '}
                <span style={{ color: isPositive ? 'var(--bull)' : 'var(--bear)' }}>
                  {isPositive ? '+' : ''}{idx.changePct.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
        {/* Footer BP and Net Liq status area with visual margin warning and privacy controls */}
        <div className="flex items-center gap-2.5 font-mono text-[11px] shrink-0 border-l border-[#333] pl-3">
          {/* Quick stealth button */}
          <button
            onClick={handleTogglePrivacyMode}
            className={`flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${
              privacySettings.isPrivacyMode
                ? 'bg-[#ff9900]/20 text-[#ff9900] border-[#ff9900]/40'
                : 'bg-[#141b28] text-[#8b9bb4] border-[#222d44] hover:text-white'
            }`}
            title="Toggle Financial Privacy / Stealth Masking (Alt+P)"
          >
            {privacySettings.isPrivacyMode ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
            <span>{privacySettings.isPrivacyMode ? 'MASKED' : 'STEALTH'}</span>
          </button>

          <span style={{ color: 'var(--ink-muted)' }}>MARGIN BP:</span>
          <span style={{ color: 'cyan', fontWeight: 'bold' }}>
            ({maskCurrency(optionsBP, privacySettings.isPrivacyMode, '$', 0)})
          </span>
          <span style={{ color: 'var(--ink-muted)' }}>NET LIQ:</span>
          <span style={{ color: '#fff', fontWeight: 'bold' }}>
            {maskCurrency(netLiq, privacySettings.isPrivacyMode, '$', 2)}
          </span>

          {isMarginWarning && (
            <span
              className="bg-[#ff334b] text-white font-black px-2 py-0.5 rounded text-[10px] animate-pulse border border-red-300 shadow-[0_0_8px_rgba(255,51,75,0.9)] flex items-center gap-1"
              title={`Margin requirement ($${marginRequirement.toFixed(0)}) exceeds 80% of cash balance ($${account.cashBalance.toFixed(0)})`}
            >
              <span>⚠️ MARGIN &gt; 80% ({marginUsagePct.toFixed(0)}%)</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            playKeyClick();
            setIsClockBellModalOpen(true);
          }}
          className="font-bold flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#1a2336] transition-all cursor-pointer border border-transparent hover:border-[#ff9900]/40 group"
          style={{ color: 'var(--accent)' }}
          title="Click to change terminal Time Zone or ring market bell <TZ>"
        >
          <Clock className="w-3 h-3 text-[#ff9900] group-hover:rotate-45 transition-transform" />
          <span>{clockTime.est || '03:16:26 EST'}</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#ff9900]/15 text-[#ff9900] border border-[#ff9900]/30 font-mono">
            {timeZoneId.toUpperCase()}
          </span>
        </button>
        <div style={{ color: 'var(--ink-muted)' }}>
          MARKET DATA: REAL-TIME (CBOE BZX)
        </div>
      </footer>

      {/* Stock & Futures Order Ticket Modal */}
      <StockTradeModal
        isOpen={isStockTradeOpen}
        onClose={() => {
          setIsStockTradeOpen(false);
          setIsStockTradeFractional(false);
        }}
        ticker={selectedTicker}
        cashBalance={account.cashBalance}
        onExecuteTrade={handleExecuteTrade}
        initialFractionalMode={isStockTradeFractional}
      />

      {/* Help Modal (<F1 HELP>) */}
      <HelpTerminalModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onNavigateToEducation={() => setCurrentScreen('educ')}
      />

      {/* Expected Price Move Matrix Modal */}
      <ExpectedMoveModal
        isOpen={isExpectedMoveOpen}
        onClose={() => setIsExpectedMoveOpen(false)}
        ticker={selectedTicker}
        currentChain={currentChain}
        allChains={allChains}
        onOpenRiskProfile={() => {
          setIsExpectedMoveOpen(false);
          setCurrentScreen('risk');
        }}
        onOpenCone={() => {
          setIsExpectedMoveOpen(false);
          setCurrentScreen('cone');
        }}
      />

      {/* Institutional Strategy Catalog Directory & 30-Day Options Backtester Modal */}
      <StrategyCatalogModal
        isOpen={isStrategyCatalogOpen}
        onClose={() => setIsStrategyCatalogOpen(false)}
        activeTickerSymbol={selectedTicker.symbol}
        activeTicker={selectedTicker}
        allTickers={tickers}
        onSelectStrategy={(strategyId, destination) => {
          handleApplyStrategyTemplate(strategyId);
          if (destination === 'risk') {
            setCurrentScreen('risk');
          } else {
            setCurrentScreen('ovme');
          }
        }}
      />

      {/* Country & Geo-Political Risk Modal */}
      <CountryRiskModal
        isOpen={isCountryRiskOpen}
        onClose={() => setIsCountryRiskOpen(false)}
        onSelectTicker={(sym) => setSelectedSymbol(sym)}
        onNavigateToScreen={(scr) => setCurrentScreen(scr as TerminalScreen)}
      />

      {/* Canadian Accounts & CRA Tax Suite Modal (TFSA, RRSP, FHSA, RESP, Norbert's Gambit) */}
      <CanadianAccountsModal
        isOpen={isCanadianSuiteOpen}
        onClose={() => setIsCanadianSuiteOpen(false)}
        accounts={canadianAccounts}
        activeAccountId={activeCanadianAccountId}
        onSelectAccount={(accId) => {
          setActiveCanadianAccountId(accId);
          setMonitorSubTab('portfolio');
          setCurrentScreen('monitor');
        }}
        onNavigateToGIC={() => {
          setCurrentScreen('gic');
        }}
      />

      {/* GitHub Repository Synchronization & Export Terminal Modal */}
      <GitHubSyncModal
        isOpen={isGitHubOpen}
        onClose={() => setIsGitHubOpen(false)}
      />

      {/* Display Scaling, Device Fit & Density Settings Modal */}
      <DisplaySettingsModal
        isOpen={isDisplaySettingsOpen}
        onClose={() => setIsDisplaySettingsOpen(false)}
        initialTab={displaySettingsTab}
        scale={scale}
        onScaleChange={(s) => setScale(s)}
        density={density}
        onDensityChange={(d) => setDensity(d)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onFitToScreen={handleFitToScreen}
        onResetDefaults={handleResetDefaults}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        textLegibility={textLegibility}
        onTextLegibilityChange={(tl) => {
          setTextLegibility(tl);
          handleFitToScreen(tl);
        }}
        contrastMode={contrastMode}
        onContrastModeChange={(cm) => setContrastMode(cm)}
        onOpenDeviceSuite={() => setIsDeviceModalOpen(true)}
        isAutoFitActive={isAutoFitActive}
        onToggleAutoFit={handleToggleAutoFit}
        onOpenPrivacySuite={() => setIsPrivacyModalOpen(true)}
        timeZoneId={timeZoneId}
        onSelectTimeZoneId={handleSelectTimeZone}
        useAmPm={useAmPm}
        onToggleUseAmPm={handleToggleUseAmPm}
        onOpenClockBellModal={() => setIsClockBellModalOpen(true)}
      />

      {/* Floating Quick Scale & Fit Widget for Mobile / Tablet */}
      <FloatingDisplayWidget
        scale={scale}
        onScaleChange={(s) => setScale(s)}
        onFitToScreen={handleFitToScreen}
        onOpenSettings={() => setIsDisplaySettingsOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        textLegibility={textLegibility}
        onCycleLegibility={handleCycleTextLegibility}
        onOpenDeviceSuite={() => setIsDeviceModalOpen(true)}
        isAutoFitActive={isAutoFitActive}
        onToggleAutoFit={handleToggleAutoFit}
        isPrivacyMode={privacySettings.isPrivacyMode}
        onTogglePrivacyMode={handleTogglePrivacyMode}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
      />

      {/* Institutional Account Privacy & Stealth Control Hub Modal */}
      <AccountPrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        settings={privacySettings}
        onUpdateSettings={handleUpdatePrivacySettings}
        onTriggerScreenBlur={handleTriggerScreenBlur}
        onClearLocalData={handleClearLocalData}
      />

      {/* Full-Screen Frosted Glass Privacy Camouflage Shield Overlay */}
      <PrivacyShieldOverlay
        isActive={isPrivacyShieldActive}
        onUnlock={handleUnlockScreen}
        clockTime={clockTime.est}
        isPrivacyMode={privacySettings.isPrivacyMode}
      />

      {/* Biometric Security & Fingerprint Sensor Login Gatekeeper Modal */}
      <BiometricLoginModal
        isOpen={isBiometricModalOpen || isTerminalLocked}
        onClose={() => {
          if (!isTerminalLocked) setIsBiometricModalOpen(false);
        }}
        isTerminalLocked={isTerminalLocked}
        onUnlockTerminal={() => {
          setIsTerminalLocked(false);
          setIsBiometricModalOpen(false);
        }}
        onLockTerminal={() => {
          setIsTerminalLocked(true);
          setIsBiometricModalOpen(true);
        }}
      />

      {/* Level 2 Option Bid-Ask Spread & Market Depth (DOM) Modal */}
      <OptionMarketDepthModal
        isOpen={isMarketDepthOpen}
        onClose={() => setIsMarketDepthOpen(false)}
        ticker={selectedTicker}
        chain={currentChain}
        allChains={allChains}
        initialStrike={marketDepthContract?.strike}
        initialType={marketDepthContract?.type || 'call'}
        onAddLeg={handleAddLeg}
        onPopOut={() => handleOpenPopOut('omon')}
        onOpenStrategyExecution={handleOpenStrategyExecution}
      />

      {/* Multi-Leg Options Strategy Trade Execution & Level 2 COB Market Depth Modal */}
      <StrategyTradeExecutionModal
        isOpen={isStrategyExecutionOpen}
        onClose={() => setIsStrategyExecutionOpen(false)}
        ticker={selectedTicker}
        chain={currentChain}
        allChains={allChains}
        initialLegs={builderLegs}
        cashBalance={account.cashBalance}
        onExecuteTrade={handleExecuteTrade}
        onUpdateBuilderLegs={(legs) => setBuilderLegs(legs)}
        onPopOut={() => handleOpenPopOut('ovme')}
      />

      {/* Quadruple Witching Intelligence & Pin Risk Monitor Modal */}
      <QuadrupleWitchingModal
        isOpen={isQuadWitchingOpen}
        onClose={() => setIsQuadWitchingOpen(false)}
        currentTicker={selectedTicker}
        allTickers={tickers}
        onSelectTicker={(sym) => setSelectedSymbol(sym)}
        onNavigateToChain={(dte) => {
          if (dte !== undefined) setActiveDte(dte);
          setCurrentScreen('omon');
        }}
        onNavigateToRisk={() => setCurrentScreen('risk')}
        onNavigateToStrategyCatalog={() => setIsStrategyCatalogOpen(true)}
        onPopOut={() => handleOpenPopOut('witch')}
      />

      {/* Floating Picture-in-Picture (PiP) BNN Bloomberg Live Broadcast Widget */}
      {isBnnPipOpen && currentScreen !== 'bnn' && (
        <FloatingBNNStreamWidget
          onClose={() => setIsBnnPipOpen(false)}
          onMaximize={() => {
            setCurrentScreen('bnn');
          }}
          onPopOut={() => handleOpenPopOut('bnn')}
        />
      )}

      {/* Floating Pop-Out Multi-Window Manager */}
      <PopOutWindowManager
        windows={popOutWindows}
        onCloseWindow={handleClosePopOut}
        onUpdateWindow={handleUpdatePopOut}
        onBringToFront={handleBringToFront}
        renderScreenContent={(screen) => renderScreenContent(screen, true)}
      />

      {/* Multi-Platform & Multi-Device Control Center (Linux, Windows, Android, iOS, Tablets, PC, PWA) */}
      <DevicePlatformModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        scale={scale}
        onScaleChange={(s) => setScale(s)}
        density={density}
        onDensityChange={(d) => setDensity(d)}
        contrastMode={contrastMode}
        onContrastModeChange={(cm) => setContrastMode(cm)}
      />

      {/* Mobile Smartphone & Tablet Fixed Bottom Navigation Dock */}
      <MobileBottomNav
        currentScreen={currentScreen}
        onNavigateScreen={(scr) => setCurrentScreen(scr)}
        onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
        onOpenMenuDrawer={() => setIsMobileMenuOpen(true)}
        openPositionsCount={account.positions.length}
      />

      {/* Mobile & Tablet Full Tools Drawer Modal */}
      <MobileToolsDrawerModal
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentScreen={currentScreen}
        onNavigateScreen={(scr) => setCurrentScreen(scr)}
        onOpenDeviceSuite={() => setIsDeviceModalOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenCanadianSuite={() => setIsCanadianSuiteOpen(true)}
        onOpenStrategyExecution={handleOpenStrategyExecution}
        onOpenMarketDepth={() => handleOpenMarketDepth('call')}
        onOpenStockTrade={() => setIsStockTradeOpen(true)}
        onOpenClockBellModal={() => setIsClockBellModalOpen(true)}
        timeZoneId={timeZoneId}
      />

      {/* Institutional Multi-Market Watchlist Blotter Modal (US & Canadian Markets) */}
      <WatchlistBlotterModal
        isOpen={isWatchlistModalOpen}
        onClose={() => setIsWatchlistModalOpen(false)}
        tickers={tickers}
        selectedSymbol={selectedSymbol}
        onSelectTicker={(sym) => setSelectedSymbol(sym)}
        onNavigateToChain={(sym) => {
          setSelectedSymbol(sym);
          setCurrentScreen('omon');
        }}
        onNavigateToBuilder={(sym) => {
          setSelectedSymbol(sym);
          setCurrentScreen('ovme');
        }}
        onOpenTSXFuturesHub={() => setIsTSXFuturesHubOpen(true)}
      />

      {/* Financial Market Clock & Exchange Bell Modal */}
      <ExchangeClockBellModal
        isOpen={isClockBellModalOpen}
        onClose={() => setIsClockBellModalOpen(false)}
        selectedTimeZoneId={timeZoneId}
        onSelectTimeZoneId={(tz) => {
          setTimeZoneId(tz);
          localStorage.setItem('strikepoint_timezone', tz);
        }}
        isAutoBellEnabled={isAutoBellEnabled}
        onToggleAutoBell={(enabled) => {
          setIsAutoBellEnabled(enabled);
          localStorage.setItem('strikepoint_autobell', String(enabled));
        }}
        useAmPm={useAmPm}
        onToggleUseAmPm={(v) => {
          setUseAmPm(v);
          localStorage.setItem('strikepoint_use_ampm', String(v));
        }}
      />
    </div>
  );
}
