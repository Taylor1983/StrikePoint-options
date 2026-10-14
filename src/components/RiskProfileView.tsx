import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Ticker, TradeLeg, Position, ExpirationOptionChain } from '../types/options';
import {
  analyzeStrategy,
  calculateStrategyPayoff,
  calculateTheoreticalLeg,
  calculateBSM,
  RISK_FREE_RATE,
  StrategyPayoffPoint,
  StrategyAnalysis,
  SkewModelConfig,
  DEFAULT_SKEW_MODEL,
  SKEW_MODEL_PRESETS,
} from '../utils/blackScholes';
import {
  ALL_OPTIONS_STRATEGIES,
  generateStrategyLegs,
} from '../services/optionsStrategies';
import { playKeyClick, playTickBlip } from '../utils/terminalSound';
import {
  calculatePortfolioMarginStress,
  generatePortfolioStressMatrix,
  generateMarginCurvePoints,
  calculateDynamicPositionMargin,
  MARKET_CONDITION_PRESETS,
  MarginingModel,
  MarketConditionPreset,
  PortfolioMarginStressSummary,
} from '../utils/portfolioMarginStress';
import { PortfolioBetaWeightingView } from './PortfolioBetaWeightingView';
import { calculatePortfolioBetaWeighting } from '../utils/portfolioBetaWeighting';
import {
  Activity,
  Scale,
  Sliders,
  Calendar,
  Layers,
  CheckCircle,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Zap,
  Maximize2,
  Minimize2,
  Trash2,
  Percent,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Shield,
  ExternalLink,
  Copy,
  ArrowLeftRight,
  Plus,
  Minus,
  X,
  AlertTriangle,
  BarChart2,
  Globe,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
} from 'lucide-react';

interface RiskProfileViewProps {
  ticker: Ticker;
  chain: ExpirationOptionChain;
  allChains: ExpirationOptionChain[];
  builderLegs: TradeLeg[];
  portfolioPositions: Position[];
  tickers?: Record<string, Ticker>;
  accountCashBalance?: number;
  onAddLeg?: (newLeg: TradeLeg) => void;
  onUpdateLeg: (updatedLeg: TradeLeg) => void;
  onUpdatePosition?: (updatedPosition: Position) => void;
  onRemoveLeg: (legId: string) => void;
  onClearLegs: () => void;
  onApplyStrategyTemplate: (templateName: string) => void;
  onNavigateToChain: () => void;
  onNavigateToValuation: () => void;
  onNavigateToCone: () => void;
  onNavigateToScenario: () => void;
  onOpenStockTrade?: () => void;
  onSelectTicker?: (symbol: string) => void;
  onSeedPositions?: () => void;
  onOpenExpectedMove?: () => void;
  onOpenStrategyCatalog?: () => void;
  onOpenStrategyExecution?: () => void;
  onNavigateToMacro?: () => void;
}

export type RiskProfileSource = 'builder' | 'portfolio' | 'preset';

export const RiskProfileView: React.FC<RiskProfileViewProps> = ({
  ticker,
  chain,
  allChains,
  builderLegs,
  portfolioPositions,
  tickers,
  accountCashBalance = 100000,
  onAddLeg,
  onUpdateLeg,
  onUpdatePosition,
  onRemoveLeg,
  onClearLegs,
  onApplyStrategyTemplate,
  onNavigateToChain,
  onNavigateToValuation,
  onNavigateToCone,
  onNavigateToScenario,
  onOpenStockTrade,
  onSelectTicker,
  onSeedPositions,
  onOpenExpectedMove,
  onOpenStrategyCatalog,
  onOpenStrategyExecution,
  onNavigateToMacro,
}) => {
  const currentPrice = ticker.price;

  // View Source: Builder Legs, Portfolio Positions, or Preset
  const [sourceMode, setSourceMode] = useState<RiskProfileSource>(() => {
    if (builderLegs.length > 0) return 'builder';
    if (portfolioPositions.length > 0) return 'portfolio';
    return 'preset';
  });

  // Toggle for persistent Portfolio Stocks & Futures tray
  const [isPortfolioTrayExpanded, setIsPortfolioTrayExpanded] = useState<boolean>(true);

  // Selected Preset Strategy if in preset mode
  const [selectedPreset, setSelectedPreset] = useState<string>('Iron Condor');

  // Portfolio filter states for Stocks, Futures, and Options
  const [portfolioCategoryFilter, setPortfolioCategoryFilter] = useState<'ALL' | 'STOCKS' | 'FUTURES' | 'OPTIONS'>('ALL');
  const [portfolioTickerFilter, setPortfolioTickerFilter] = useState<'CURRENT' | 'ALL_TICKERS'>('ALL_TICKERS');
  const [enabledPositionIds, setEnabledPositionIds] = useState<Record<string, boolean>>({});

  // Interactive Simulation Deck state
  const [timeElapsedDays, setTimeElapsedDays] = useState<number>(0);
  const [ivShiftPercent, setIvShiftPercent] = useState<number>(0);
  const [priceShockPct, setPriceShockPct] = useState<number>(0);

  // Regulatory Margining Model: US Reg-T (Rule 4210) vs Institutional Portfolio Margin (OCC TIMS Grid)
  const [marginingModel, setMarginingModel] = useState<MarginingModel>('REG_T');
  // Margin Scope for portfolio stress analysis: 'ALL' (all tickers in portfolio) vs 'CURRENT' (matching ticker) vs 'ACTIVE_TRADES'
  const [marginScope, setMarginScope] = useState<'PORTFOLIO_ALL' | 'PORTFOLIO_CURRENT' | 'ACTIVE_TRADES'>('PORTFOLIO_ALL');
  // Toggle for 2D Market Condition Stress Matrix
  const [isStressMatrixOpen, setIsStressMatrixOpen] = useState<boolean>(false);
  // Toggle for Margin Requirement Curve overlay on chart
  const [showMarginCurve, setShowMarginCurve] = useState<boolean>(false);
  // Active selected market condition preset id
  const [activeMarketPresetId, setActiveMarketPresetId] = useState<string>('baseline');
  // Margin engine panel expansion
  const [isMarginEngineExpanded, setIsMarginEngineExpanded] = useState<boolean>(true);

  // Drag & drop strikes state for payoff chart and tables
  const [showDraggableStrikes, setShowDraggableStrikes] = useState<boolean>(true);
  const [activeStrikeDrag, setActiveStrikeDrag] = useState<{
    legId: string;
    leg: TradeLeg;
    isPortfolioPosition: boolean;
    initialStrike: number;
    currentStrike: number;
    currentMouseX: number;
    newPremium: number;
    newIv: number;
  } | null>(null);
  const [dragPreviewOverride, setDragPreviewOverride] = useState<{
    legId: string;
    strike: number;
    premium: number;
    iv: number;
  } | null>(null);
  const [strikeToast, setStrikeToast] = useState<{
    message: string;
    action: string;
    type: string;
    oldStrike: number;
    newStrike: number;
  } | null>(null);
  const [hoveredStrikePinId, setHoveredStrikePinId] = useState<string | null>(null);
  const [strikePickerLegId, setStrikePickerLegId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Curve Visibility Toggles
  const [showExpirationCurve, setShowExpirationCurve] = useState<boolean>(true);
  const [showTodayCurve, setShowTodayCurve] = useState<boolean>(true);
  const [showSimulatedCurve, setShowSimulatedCurve] = useState<boolean>(true);
  const [showSigmaBands, setShowSigmaBands] = useState<boolean>(true);
  const [showBreakevens, setShowBreakevens] = useState<boolean>(true);
  const [showScenarioMatrix, setShowScenarioMatrix] = useState<boolean>(false); // Hidden by default in Risk Profile
  const [isBiggerPictureExpanded, setIsBiggerPictureExpanded] = useState<boolean>(true);
  const [isSimulatedTradesExtended, setIsSimulatedTradesExtended] = useState<boolean>(true);
  const [simulatedTradesSize, setSimulatedTradesSize] = useState<'compact' | 'normal' | 'expanded' | 'maximum'>('expanded');
  const [simulatedTradesHeight, setSimulatedTradesHeight] = useState<'compact' | 'standard' | 'expanded'>('standard');
  const [simulatedTradesViewMode, setSimulatedTradesViewMode] = useState<'standard' | 'extended'>('extended');
  const [isSimulatedTradesModalOpen, setIsSimulatedTradesModalOpen] = useState<boolean>(false);
  const [isBetaWeightingModalOpen, setIsBetaWeightingModalOpen] = useState<boolean>(false);

  // Portfolio Beta Weighting Summary relative to SPY
  const portfolioBetaSummary = useMemo(() => {
    return calculatePortfolioBetaWeighting(portfolioPositions || [], tickers || {}, 'SPY', 0);
  }, [portfolioPositions, tickers]);

  // Sizing styles for position simulated trades blotter
  const sizeStyles = useMemo(() => {
    switch (simulatedTradesSize) {
      case 'compact':
        return {
          tableText: 'text-[9.5px]',
          headerPadding: 'py-1 px-1.5 text-[8.5px]',
          cellPadding: 'py-1 px-1.5',
          badge: 'text-[7.5px] px-1 py-0',
          btn: 'text-[8.5px] py-0 px-1',
          input: 'text-[9px] py-0 px-1 h-5',
          scaleLabel: '80%',
          scaleName: 'Compact',
        };
      case 'normal':
        return {
          tableText: 'text-[11px]',
          headerPadding: 'py-1.5 px-2 text-[10px]',
          cellPadding: 'py-1.5 px-2',
          badge: 'text-[8.5px] px-1.5 py-0.2',
          btn: 'text-[9.5px] py-0.5 px-1.5',
          input: 'text-[10px] py-0.5 px-1.5 h-6',
          scaleLabel: '100%',
          scaleName: 'Normal',
        };
      case 'maximum':
        return {
          tableText: 'text-[13.5px]',
          headerPadding: 'py-3 px-3.5 text-xs font-black',
          cellPadding: 'py-3.5 px-3.5',
          badge: 'text-[10.5px] px-2 py-0.5 font-bold',
          btn: 'text-xs py-1 px-2.5 font-bold',
          input: 'text-xs py-1 px-2 h-8 font-bold',
          scaleLabel: '140%',
          scaleName: 'Maximum',
        };
      case 'expanded':
      default:
        return {
          tableText: 'text-xs',
          headerPadding: 'py-2 px-2.5 text-[10.5px]',
          cellPadding: 'py-2.5 px-2.5',
          badge: 'text-[9px] px-1.5 py-0.5',
          btn: 'text-[10px] py-0.5 px-2',
          input: 'text-[11px] py-0.5 px-2 h-7',
          scaleLabel: '120%',
          scaleName: 'Bigger',
        };
    }
  }, [simulatedTradesSize]);

  const handleMakeSmaller = () => {
    playKeyClick();
    if (simulatedTradesSize === 'maximum') setSimulatedTradesSize('expanded');
    else if (simulatedTradesSize === 'expanded') setSimulatedTradesSize('normal');
    else if (simulatedTradesSize === 'normal') setSimulatedTradesSize('compact');
  };

  const handleMakeBigger = () => {
    playKeyClick();
    if (simulatedTradesSize === 'compact') setSimulatedTradesSize('normal');
    else if (simulatedTradesSize === 'normal') setSimulatedTradesSize('expanded');
    else if (simulatedTradesSize === 'expanded') setSimulatedTradesSize('maximum');
  };

  // Enabled Legs Filter (for "What-If" leg elimination)
  const [enabledLegIds, setEnabledLegIds] = useState<Record<string, boolean>>({});

  // Individual Implied Volatility overrides per simulated trade leg ID (e.g. { 'leg-1': 0.35 })
  const [individualIvOverrides, setIndividualIvOverrides] = useState<Record<string, number>>({});

  // Volatility Skew Model configuration for Calendar & Double Diagonal risk profiles
  const [skewModel, setSkewModel] = useState<SkewModelConfig>(DEFAULT_SKEW_MODEL);
  const [isSkewModelEnabled, setIsSkewModelEnabled] = useState<boolean>(true);
  const [isSkewPanelExpanded, setIsSkewPanelExpanded] = useState<boolean>(true);
  const [selectedSkewPresetKey, setSelectedSkewPresetKey] = useState<string>('doubleDiagonalWingSkew');
  const [showUnskewedOverlay, setShowUnskewedOverlay] = useState<boolean>(true);

  // Hovered Point & Coordinates for Direct P/L Crosshair and Tooltip
  const [hoveredPoint, setHoveredPoint] = useState<StrategyPayoffPoint | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ svgX: number; svgY: number; clientX: number; clientY: number } | null>(null);

  // Preset leg strike overrides when adjusting preset strategies
  const [presetOverrides, setPresetOverrides] = useState<Record<string, { strike: number; premium: number; iv: number }>>({});

  useEffect(() => {
    setPresetOverrides({});
  }, [selectedPreset]);

  // Generate synthetic preset legs if in preset mode
  const rawPresetLegs = useMemo((): TradeLeg[] => {
    const calls = chain.calls;
    const puts = chain.puts;
    const S = currentPrice;
    const exp = chain.formattedDate;
    const dte = chain.dte;

    let atmIdx = 0;
    let minDiff = Infinity;
    calls.forEach((c, idx) => {
      const diff = Math.abs(c.strike - S);
      if (diff < minDiff) {
        minDiff = diff;
        atmIdx = idx;
      }
    });

    // Check if selectedPreset matches any institutional strategy in ALL_OPTIONS_STRATEGIES
    const matchingStrategy = ALL_OPTIONS_STRATEGIES.find(
      (st) =>
        st.id === selectedPreset ||
        st.name.toLowerCase() === selectedPreset.toLowerCase() ||
        selectedPreset.toLowerCase().includes(st.id) ||
        selectedPreset.toLowerCase().includes(st.name.toLowerCase())
    );
    if (matchingStrategy) {
      return generateStrategyLegs(matchingStrategy.id, ticker, chain, allChains);
    }

    switch (selectedPreset) {
      case 'Iron Condor': {
        const lp = puts[Math.max(0, atmIdx - 4)];
        const sp = puts[Math.max(0, atmIdx - 2)];
        const sc = calls[Math.min(calls.length - 1, atmIdx + 2)];
        const lc = calls[Math.min(calls.length - 1, atmIdx + 4)];
        return [
          { id: 'pre-ic-lp', type: 'put', action: 'buy', strike: lp.strike, expiration: exp, dte, iv: lp.iv, premium: lp.ask, contracts: 1 },
          { id: 'pre-ic-sp', type: 'put', action: 'sell', strike: sp.strike, expiration: exp, dte, iv: sp.iv, premium: sp.bid, contracts: 1 },
          { id: 'pre-ic-sc', type: 'call', action: 'sell', strike: sc.strike, expiration: exp, dte, iv: sc.iv, premium: sc.bid, contracts: 1 },
          { id: 'pre-ic-lc', type: 'call', action: 'buy', strike: lc.strike, expiration: exp, dte, iv: lc.iv, premium: lc.ask, contracts: 1 },
        ];
      }
      case 'Covered Call': {
        const otmCall = calls[Math.min(calls.length - 1, atmIdx + 1)];
        return [
          { id: 'pre-cc-stock', type: 'stock', action: 'buy', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol: ticker.symbol },
          { id: 'pre-cc-call', type: 'call', action: 'sell', strike: otmCall.strike, expiration: exp, dte, iv: otmCall.iv, premium: otmCall.bid, contracts: 1, multiplier: 100, underlyingSymbol: ticker.symbol },
        ];
      }
      case 'Protective Put': {
        const otmPut = puts[Math.max(0, atmIdx - 1)];
        return [
          { id: 'pre-pp-stock', type: 'stock', action: 'buy', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol: ticker.symbol },
          { id: 'pre-pp-put', type: 'put', action: 'buy', strike: otmPut.strike, expiration: exp, dte, iv: otmPut.iv, premium: otmPut.ask, contracts: 1, multiplier: 100, underlyingSymbol: ticker.symbol },
        ];
      }
      case 'Collar': {
        const otmPut = puts[Math.max(0, atmIdx - 2)];
        const otmCall = calls[Math.min(calls.length - 1, atmIdx + 2)];
        return [
          { id: 'pre-col-stock', type: 'stock', action: 'buy', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol: ticker.symbol },
          { id: 'pre-col-put', type: 'put', action: 'buy', strike: otmPut.strike, expiration: exp, dte, iv: otmPut.iv, premium: otmPut.ask, contracts: 1, multiplier: 100, underlyingSymbol: ticker.symbol },
          { id: 'pre-col-call', type: 'call', action: 'sell', strike: otmCall.strike, expiration: exp, dte, iv: otmCall.iv, premium: otmCall.bid, contracts: 1, multiplier: 100, underlyingSymbol: ticker.symbol },
        ];
      }
      case 'Long Stock (100 shs)': {
        return [
          { id: 'pre-stk-buy', type: 'stock', action: 'buy', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol: ticker.symbol },
        ];
      }
      case 'Short Stock (-100 shs)': {
        return [
          { id: 'pre-stk-sell', type: 'stock', action: 'sell', strike: S, expiration: 'Perpetual', dte: 0, iv: 0, premium: S, contracts: 100, multiplier: 1, underlyingSymbol: ticker.symbol },
        ];
      }
      case 'Long Future (1 ct)': {
        const mult = ticker.multiplier || (ticker.symbol === '/CL' ? 1000 : 50);
        return [
          { id: 'pre-fut-buy', type: 'future', action: 'buy', strike: S, expiration: 'Front Month', dte: 0, iv: 0, premium: S, contracts: 1, multiplier: mult, underlyingSymbol: ticker.symbol },
        ];
      }
      case 'Short Future (-1 ct)': {
        const mult = ticker.multiplier || (ticker.symbol === '/CL' ? 1000 : 50);
        return [
          { id: 'pre-fut-sell', type: 'future', action: 'sell', strike: S, expiration: 'Front Month', dte: 0, iv: 0, premium: S, contracts: 1, multiplier: mult, underlyingSymbol: ticker.symbol },
        ];
      }
      case 'Future + Protective Put': {
        const mult = ticker.multiplier || (ticker.symbol === '/CL' ? 1000 : 50);
        const otmPut = puts[Math.max(0, atmIdx - 1)];
        return [
          { id: 'pre-fhp-fut', type: 'future', action: 'buy', strike: S, expiration: 'Front Month', dte: 0, iv: 0, premium: S, contracts: 1, multiplier: mult, underlyingSymbol: ticker.symbol },
          { id: 'pre-fhp-put', type: 'put', action: 'buy', strike: otmPut.strike, expiration: exp, dte, iv: otmPut.iv, premium: otmPut.ask, contracts: 1, multiplier: mult, underlyingSymbol: ticker.symbol },
        ];
      }
      case 'Bull Call Spread': {
        const buyC = calls[Math.max(0, atmIdx - 1)];
        const sellC = calls[Math.min(calls.length - 1, atmIdx + 2)];
        return [
          { id: 'pre-bcs-buy', type: 'call', action: 'buy', strike: buyC.strike, expiration: exp, dte, iv: buyC.iv, premium: buyC.ask, contracts: 1 },
          { id: 'pre-bcs-sell', type: 'call', action: 'sell', strike: sellC.strike, expiration: exp, dte, iv: sellC.iv, premium: sellC.bid, contracts: 1 },
        ];
      }
      case 'Bear Put Spread': {
        const buyP = puts[Math.min(puts.length - 1, atmIdx + 1)];
        const sellP = puts[Math.max(0, atmIdx - 2)];
        return [
          { id: 'pre-bps-buy', type: 'put', action: 'buy', strike: buyP.strike, expiration: exp, dte, iv: buyP.iv, premium: buyP.ask, contracts: 1 },
          { id: 'pre-bps-sell', type: 'put', action: 'sell', strike: sellP.strike, expiration: exp, dte, iv: sellP.iv, premium: sellP.bid, contracts: 1 },
        ];
      }
      case 'Long Straddle': {
        const c = calls[atmIdx];
        const p = puts[atmIdx];
        return [
          { id: 'pre-strd-c', type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1 },
          { id: 'pre-strd-p', type: 'put', action: 'buy', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.ask, contracts: 1 },
        ];
      }
      case 'Long Strangle': {
        const p = puts[Math.max(0, atmIdx - 2)];
        const c = calls[Math.min(calls.length - 1, atmIdx + 2)];
        return [
          { id: 'pre-strg-p', type: 'put', action: 'buy', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.ask, contracts: 1 },
          { id: 'pre-strg-c', type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1 },
        ];
      }
      case 'Long Call': {
        const c = calls[atmIdx];
        return [
          { id: 'pre-lc', type: 'call', action: 'buy', strike: c.strike, expiration: exp, dte, iv: c.iv, premium: c.ask, contracts: 1 },
        ];
      }
      case 'Long Put': {
        const p = puts[atmIdx];
        return [
          { id: 'pre-lp', type: 'put', action: 'buy', strike: p.strike, expiration: exp, dte, iv: p.iv, premium: p.ask, contracts: 1 },
        ];
      }
      default:
        return [];
    }
  }, [selectedPreset, chain, currentPrice]);

  const presetLegs = useMemo((): TradeLeg[] => {
    return rawPresetLegs.map((l) =>
      presetOverrides[l.id]
        ? {
            ...l,
            strike: presetOverrides[l.id].strike,
            premium: presetOverrides[l.id].premium,
            iv: presetOverrides[l.id].iv,
          }
        : l
    );
  }, [rawPresetLegs, presetOverrides]);

  // Portfolio category stats and aggregate financial exposures
  const portfolioStats = useMemo(() => {
    let stocksCount = 0;
    let futuresCount = 0;
    let optionsCount = 0;

    portfolioPositions.forEach((p) => {
      const isStock = p.legs.some((l) => l.type === 'stock') || p.strategyName.toLowerCase().includes('stock');
      const isFuture = p.legs.some((l) => l.type === 'future') || p.strategyName.toLowerCase().includes('future') || p.ticker.startsWith('/');
      if (isStock) stocksCount++;
      else if (isFuture) futuresCount++;
      else optionsCount++;
    });

    return { stocksCount, futuresCount, optionsCount, total: portfolioPositions.length };
  }, [portfolioPositions]);

  // Aggregate financial metrics across portfolio asset classes
  const portfolioAggregates = useMemo(() => {
    let totalStockValue = 0;
    let totalStockPnL = 0;
    let totalStockDelta = 0;

    let totalFuturesNotional = 0;
    let totalFuturesPnL = 0;
    let totalFuturesDelta = 0;

    let totalOptionsPnL = 0;
    let totalOptionsMark = 0;

    let netPnL = 0;

    let totalIvWeight = 0;
    let sumEntryIvWeighted = 0;
    let sumLiveIvWeighted = 0;

    portfolioPositions.forEach((pos) => {
      netPnL += pos.unrealizedPnL;
      const isStock = pos.legs.some((l) => l.type === 'stock') || pos.strategyName.toLowerCase().includes('stock');
      const isFuture = pos.legs.some((l) => l.type === 'future') || pos.strategyName.toLowerCase().includes('future') || pos.ticker.startsWith('/');

      // Calculate position's IV when trade was made vs current live IV
      const entryIv = pos.entryIV !== undefined
        ? pos.entryIV
        : (pos.legs[0]?.iv && pos.legs[0].iv > 0)
        ? pos.legs.reduce((acc, l) => acc + (l.iv || 0) * (l.contracts || 1), 0) / Math.max(1, pos.legs.reduce((acc, l) => acc + (l.contracts || 1), 0))
        : (tickers?.[pos.ticker]?.currentIV || 0.25);
      const liveIv = tickers?.[pos.ticker]?.currentIV || entryIv;
      const weight = Math.max(100, Math.abs(pos.currentMark || pos.entryCost || 100));

      sumEntryIvWeighted += entryIv * weight;
      sumLiveIvWeighted += liveIv * weight;
      totalIvWeight += weight;

      if (isStock) {
        totalStockValue += Math.abs(pos.currentMark);
        totalStockPnL += pos.unrealizedPnL;
        pos.legs.forEach((l) => {
          if (l.type === 'stock') {
            totalStockDelta += (l.action === 'buy' ? 1 : -1) * l.contracts * (l.multiplier || 1);
          }
        });
      } else if (isFuture) {
        totalFuturesNotional += Math.abs(pos.currentMark);
        totalFuturesPnL += pos.unrealizedPnL;
        pos.legs.forEach((l) => {
          if (l.type === 'future') {
            totalFuturesDelta += (l.action === 'buy' ? 1 : -1) * l.contracts * (l.multiplier || 50);
          }
        });
      } else {
        totalOptionsMark += pos.currentMark;
        totalOptionsPnL += pos.unrealizedPnL;
      }
    });

    const avgEntryIV = totalIvWeight > 0 ? sumEntryIvWeighted / totalIvWeight : 0.25;
    const avgLiveIV = totalIvWeight > 0 ? sumLiveIvWeighted / totalIvWeight : 0.25;
    const portfolioIvDelta = avgLiveIV - avgEntryIV;

    return {
      totalStockValue,
      totalStockPnL,
      totalStockDelta,
      totalFuturesNotional,
      totalFuturesPnL,
      totalFuturesDelta,
      totalOptionsMark,
      totalOptionsPnL,
      netPnL,
      avgEntryIV,
      avgLiveIV,
      portfolioIvDelta,
    };
  }, [portfolioPositions]);

  // Filtered portfolio positions based on category & ticker scope
  const visiblePortfolioPositions = useMemo(() => {
    return portfolioPositions.filter((p) => {
      if (portfolioTickerFilter === 'CURRENT' && p.ticker !== ticker.symbol) return false;
      const isStock = p.legs.some((l) => l.type === 'stock') || p.strategyName.toLowerCase().includes('stock');
      const isFuture = p.legs.some((l) => l.type === 'future') || p.strategyName.toLowerCase().includes('future') || p.ticker.startsWith('/');
      const isOption = !isStock && !isFuture;

      if (portfolioCategoryFilter === 'STOCKS') return isStock;
      if (portfolioCategoryFilter === 'FUTURES') return isFuture;
      if (portfolioCategoryFilter === 'OPTIONS') return isOption;
      return true;
    });
  }, [portfolioPositions, portfolioTickerFilter, portfolioCategoryFilter, ticker.symbol]);

  // Source simulated trade legs prior to checkbox filter
  const allSourceLegs = useMemo((): TradeLeg[] => {
    let source: TradeLeg[] = [];
    if (sourceMode === 'builder') {
      source = builderLegs;
    } else if (sourceMode === 'portfolio') {
      // Flatten legs from filtered open positions (stocks, futures, options)
      const enabledPositions = visiblePortfolioPositions.filter(
        (p) => enabledPositionIds[p.id] !== false
      );
      // Prefer positions matching current ticker to avoid mixing wildly different price scales on 1 curve
      const matchingCurrent = enabledPositions.filter((p) => p.ticker === ticker.symbol);
      const targetPositions = matchingCurrent.length > 0 ? matchingCurrent : enabledPositions;
      source = targetPositions.flatMap((p) => p.legs);
    } else {
      source = presetLegs;
    }
    return source;
  }, [sourceMode, builderLegs, visiblePortfolioPositions, enabledPositionIds, presetLegs, ticker.symbol]);

  // Active enabled legs used for payoff curves and analysis (incorporating real-time drag preview)
  const activeLegs = useMemo((): TradeLeg[] => {
    const base = allSourceLegs.filter((leg) => enabledLegIds[leg.id] !== false);
    if (!dragPreviewOverride) return base;
    return base.map((l) =>
      l.id === dragPreviewOverride.legId
        ? {
            ...l,
            strike: dragPreviewOverride.strike,
            premium: dragPreviewOverride.premium,
            iv: dragPreviewOverride.iv,
          }
        : l
    );
  }, [allSourceLegs, enabledLegIds, dragPreviewOverride]);

  // Effective legs incorporating individual IV overrides
  const legsWithEffectiveIv = useMemo((): TradeLeg[] => {
    return activeLegs.map((leg) => {
      const override = individualIvOverrides[leg.id];
      if (override !== undefined && leg.type !== 'stock' && leg.type !== 'future') {
        return { ...leg, iv: override };
      }
      return leg;
    });
  }, [activeLegs, individualIvOverrides]);

  const maxDte = useMemo(() => {
    const optLegs = legsWithEffectiveIv.filter((l) => l.type === 'call' || l.type === 'put');
    return optLegs.length > 0 ? Math.max(...optLegs.map((l) => l.dte)) : 30;
  }, [legsWithEffectiveIv]);

  // Inspect if active position has multiple expiration cycles (Calendar, Double Calendar, Diagonal, Double Diagonal)
  const calendarDiagonalDetails = useMemo(() => {
    const optLegs = legsWithEffectiveIv.filter((l) => l.type === 'call' || l.type === 'put');
    if (optLegs.length < 2) return null;
    const dtes = Array.from(new Set(optLegs.map((l) => l.dte))).sort((a, b) => a - b);
    if (dtes.length < 2) return null;
    const frontDte = dtes[0];
    const backDte = dtes[dtes.length - 1];
    const frontLegs = optLegs.filter((l) => l.dte === frontDte);
    const backLegs = optLegs.filter((l) => l.dte === backDte);
    const isDoubleDiagonal = optLegs.length >= 4 && frontLegs.length >= 2 && backLegs.length >= 2;
    const isDoubleCalendar =
      isDoubleDiagonal &&
      frontLegs.every((fl) => backLegs.some((bl) => bl.strike === fl.strike && bl.type === fl.type));
    const isCalendar = frontLegs.some((fl) => backLegs.some((bl) => bl.strike === fl.strike && bl.type === fl.type));
    return {
      frontDte,
      backDte,
      dteGap: backDte - frontDte,
      frontLegs,
      backLegs,
      isDoubleDiagonal,
      isDoubleCalendar,
      isCalendar,
    };
  }, [legsWithEffectiveIv]);

  const isCalendarOrDiagonal = calendarDiagonalDetails !== null;
  const activeSkewModel = isSkewModelEnabled ? skewModel : undefined;

  // Analyze strategy with effective individual leg IVs and skew model
  const analysis: StrategyAnalysis = useMemo(() => {
    return analyzeStrategy(legsWithEffectiveIv, currentPrice, activeSkewModel);
  }, [legsWithEffectiveIv, currentPrice, activeSkewModel]);

  // Generate high-resolution Payoff and Greeks Curve Points with individual IV overrides and skew model
  const payoffPoints = useMemo(() => {
    return calculateStrategyPayoff(
      legsWithEffectiveIv,
      currentPrice,
      ivShiftPercent / 100,
      timeElapsedDays,
      undefined,
      undefined,
      individualIvOverrides,
      activeSkewModel
    );
  }, [legsWithEffectiveIv, currentPrice, ivShiftPercent, timeElapsedDays, individualIvOverrides, activeSkewModel]);

  // Unskewed Baseline Curve (Flat Vol / Zero Skew Reference)
  const unskewedPayoffPoints = useMemo(() => {
    if (!isSkewModelEnabled) return null;
    return calculateStrategyPayoff(
      legsWithEffectiveIv,
      currentPrice,
      ivShiftPercent / 100,
      timeElapsedDays,
      undefined,
      undefined,
      individualIvOverrides,
      undefined // Flat BSM baseline
    );
  }, [legsWithEffectiveIv, currentPrice, ivShiftPercent, timeElapsedDays, individualIvOverrides, isSkewModelEnabled]);

  // Front-month DTE for calendar and diagonal spreads
  const frontDte = useMemo(() => {
    const optLegs = activeLegs.filter((l) => l.type === 'call' || l.type === 'put');
    return optLegs.length > 0 ? Math.min(...optLegs.map((l) => l.dte)) : undefined;
  }, [activeLegs]);

  // Active option legs with valid strikes to render on the chart as draggable pins
  const activeOptionLegs = useMemo(() => {
    return activeLegs.filter((l) => (l.type === 'call' || l.type === 'put') && l.strike > 0);
  }, [activeLegs]);

  // Calculate Statistical Sigma Bands based on 30D / DTE Volatility
  const sigma1Move = useMemo(() => {
    const T = Math.max(0.005, maxDte / 365);
    const effectiveIV = Math.max(0.08, ticker.currentIV + ivShiftPercent / 100);
    return currentPrice * effectiveIV * Math.sqrt(T);
  }, [currentPrice, ticker.currentIV, ivShiftPercent, maxDte]);

  const sigma2Move = sigma1Move * 2;
  const lower1Sigma = currentPrice - sigma1Move;
  const upper1Sigma = currentPrice + sigma1Move;
  const lower2Sigma = currentPrice - sigma2Move;
  const upper2Sigma = currentPrice + sigma2Move;

  // SVG Chart Dimensions ("Bigger Picture" expansive view with left-aligned coordinate origin)
  const svgWidth = 1040;
  const svgHeight = isBiggerPictureExpanded ? 500 : 380;
  const padding = { top: 32, right: 42, bottom: 45, left: 52 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Domain & Range calculations
  const { minPrice, maxPrice, minPnl, maxPnl } = useMemo(() => {
    if (!payoffPoints.length) {
      return {
        minPrice: currentPrice * 0.8,
        maxPrice: currentPrice * 1.2,
        minPnl: -500,
        maxPnl: 500,
      };
    }

    const prices = payoffPoints.map((p) => p.price);
    const pnlExps = payoffPoints.map((p) => p.pnlExpiration);
    const pnlTodays = payoffPoints.map((p) => p.pnlT0);

    const minX = Math.min(...prices);
    const maxX = Math.max(...prices);

    let minY = Math.min(...pnlExps, ...pnlTodays);
    let maxY = Math.max(...pnlExps, ...pnlTodays);

    // Provide balanced zero line padding
    if (minY >= 0) minY = -maxY * 0.2;
    if (maxY <= 0) maxY = -minY * 0.2;

    const span = Math.max(100, maxY - minY);
    minY = Math.floor((minY - span * 0.08) / 50) * 50;
    maxY = Math.ceil((maxY + span * 0.08) / 50) * 50;

    return { minPrice: minX, maxPrice: maxX, minPnl: minY, maxPnl: maxY };
  }, [payoffPoints, currentPrice]);

  // Coordinate transforms
  const scaleX = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
    return padding.left + Math.max(0, Math.min(graphWidth, ratio * graphWidth));
  };

  const scaleY = (pnl: number) => {
    const ratio = (pnl - minPnl) / (maxPnl - minPnl || 1);
    return padding.top + graphHeight - ratio * graphHeight;
  };

  const zeroY = scaleY(0);
  const spotX = scaleX(currentPrice);

  // SVG Paths
  const expirationPath = useMemo(() => {
    if (!payoffPoints.length) return '';
    return payoffPoints.reduce((acc, pt, idx) => {
      const x = scaleX(pt.price);
      const y = scaleY(pt.pnlExpiration);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [payoffPoints, minPrice, maxPrice, minPnl, maxPnl]);

  const todayPath = useMemo(() => {
    if (!payoffPoints.length) return '';
    return payoffPoints.reduce((acc, pt, idx) => {
      const x = scaleX(pt.price);
      const y = scaleY(pt.pnlT0);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [payoffPoints, minPrice, maxPrice, minPnl, maxPnl]);

  // Unskewed baseline overlay paths (for side-by-side comparison with Flat Vol)
  const unskewedExpirationPath = useMemo(() => {
    if (!unskewedPayoffPoints || !unskewedPayoffPoints.length) return '';
    return unskewedPayoffPoints.reduce((acc, pt, idx) => {
      const x = scaleX(pt.price);
      const y = scaleY(pt.pnlExpiration);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [unskewedPayoffPoints, minPrice, maxPrice, minPnl, maxPnl]);

  const unskewedTodayPath = useMemo(() => {
    if (!unskewedPayoffPoints || !unskewedPayoffPoints.length) return '';
    return unskewedPayoffPoints.reduce((acc, pt, idx) => {
      const x = scaleX(pt.price);
      const y = scaleY(pt.pnlT0);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [unskewedPayoffPoints, minPrice, maxPrice, minPnl, maxPnl]);

  // Area under curve for green (profit) / red (loss) shading at expiration
  const profitAreaPath = useMemo(() => {
    if (!payoffPoints.length) return '';
    const pointsAboveZero = payoffPoints.map((pt) => ({
      x: scaleX(pt.price),
      y: scaleY(Math.max(0, pt.pnlExpiration)),
    }));

    const path = pointsAboveZero.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    return `${path} L ${scaleX(maxPrice)} ${zeroY} L ${scaleX(minPrice)} ${zeroY} Z`;
  }, [payoffPoints, minPrice, maxPrice, minPnl, maxPnl, zeroY]);

  // Breakevens
  const breakEvenLines = useMemo(() => {
    return analysis.breakEvens.map((be) => ({
      price: be,
      x: scaleX(be),
    }));
  }, [analysis.breakEvens, minPrice, maxPrice]);

  // Scenario Table Points
  const scenarioSteps = [-20, -15, -10, -5, -2, 0, 2, 5, 10, 15, 20];
  const scenarioRows = useMemo(() => {
    if (!showScenarioMatrix) return [];
    return scenarioSteps.map((stepPct) => {
      const targetP = Number((currentPrice * (1 + stepPct / 100)).toFixed(2));
      // Closest payoff point
      let closestPt = payoffPoints[0];
      let minDiff = Infinity;
      payoffPoints.forEach((pt) => {
        const diff = Math.abs(pt.price - targetP);
        if (diff < minDiff) {
          minDiff = diff;
          closestPt = pt;
        }
      });

      return {
        stepPct,
        targetP,
        pnlToday: closestPt ? closestPt.pnlT0 : 0,
        pnlExp: closestPt ? closestPt.pnlExpiration : 0,
        delta: closestPt ? closestPt.delta : 0,
        theta: closestPt ? closestPt.theta : 0,
      };
    });
  }, [scenarioSteps, currentPrice, payoffPoints]);

  // Target positions evaluated for Portfolio Margin Stress under Market Conditions
  const targetMarginPositions = useMemo((): Position[] => {
    if (sourceMode === 'portfolio' || marginScope.startsWith('PORTFOLIO')) {
      if (marginScope === 'PORTFOLIO_CURRENT') {
        const filtered = portfolioPositions.filter((p) => p.ticker === ticker.symbol);
        return filtered.length > 0 ? filtered : portfolioPositions;
      }
      return portfolioPositions;
    }
    // If active trades / builder / preset:
    if (activeLegs.length > 0) {
      return [
        {
          id: 'simulated-active-trades-pos',
          ticker: ticker.symbol,
          strategyName: analysis.name || 'Simulated Trade Strategy',
          openedAt: 'Now',
          legs: activeLegs,
          contracts: 1,
          entryCost: analysis.netDebitCredit,
          currentMark: analysis.netDebitCredit,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          assetCategory: 'option' as const,
        },
      ];
    }
    return portfolioPositions;
  }, [sourceMode, marginScope, portfolioPositions, ticker.symbol, activeLegs, analysis.name, analysis.netDebitCredit]);

  // Full Portfolio Margin Stress Summary under active market conditions (Spot Shock, IV Shift, Days Forward, Reg-T vs PM)
  const portfolioMarginStress: PortfolioMarginStressSummary = useMemo(() => {
    return calculatePortfolioMarginStress(
      targetMarginPositions,
      tickers || { [ticker.symbol]: ticker },
      accountCashBalance,
      {
        priceShockPct,
        ivShiftPct: ivShiftPercent,
        daysElapsed: timeElapsedDays,
        model: marginingModel,
      }
    );
  }, [targetMarginPositions, tickers, ticker, accountCashBalance, priceShockPct, ivShiftPercent, timeElapsedDays, marginingModel]);

  // 2D Market Condition Stress Matrix Data (Heatmap)
  const stressMatrixData = useMemo(() => {
    if (!isStressMatrixOpen) return null;
    return generatePortfolioStressMatrix(
      targetMarginPositions,
      tickers || { [ticker.symbol]: ticker },
      accountCashBalance,
      marginingModel
    );
  }, [isStressMatrixOpen, targetMarginPositions, tickers, ticker, accountCashBalance, marginingModel]);

  // Continuous Margin Curve Points across Underlying Price range for SVG Canvas
  const marginCurvePoints = useMemo(() => {
    if (!showMarginCurve) return [];
    return generateMarginCurvePoints(
      targetMarginPositions,
      ticker.symbol,
      minPrice,
      maxPrice,
      70,
      ivShiftPercent,
      timeElapsedDays,
      marginingModel
    );
  }, [showMarginCurve, targetMarginPositions, ticker.symbol, minPrice, maxPrice, ivShiftPercent, timeElapsedDays, marginingModel]);

  const maxMarginInCurve = useMemo(() => {
    if (!marginCurvePoints.length) return 10000;
    return Math.max(1000, ...marginCurvePoints.map((p) => p.marginBp));
  }, [marginCurvePoints]);

  const scaleMarginY = (marginVal: number) => {
    const ratio = marginVal / (maxMarginInCurve * 1.15 || 1);
    return padding.top + graphHeight - Math.min(graphHeight, Math.max(0, ratio * graphHeight));
  };

  const marginCurvePath = useMemo(() => {
    if (!marginCurvePoints.length) return '';
    return marginCurvePoints.reduce((acc, pt, idx) => {
      const x = scaleX(pt.price);
      const y = scaleMarginY(pt.marginBp);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [marginCurvePoints, scaleX, scaleMarginY]);

  // Hovered margin inspection at cursor price
  const hoveredMarginInfo = useMemo(() => {
    if (!hoveredPoint) return null;
    let closest = marginCurvePoints[0];
    let minD = Infinity;
    marginCurvePoints.forEach((pt) => {
      const d = Math.abs(pt.price - hoveredPoint.price);
      if (d < minD) {
        minD = d;
        closest = pt;
      }
    });

    if (!closest) {
      let marginSum = 0;
      targetMarginPositions.forEach((pos) => {
        const spot = hoveredPoint.price;
        const res = calculateDynamicPositionMargin(pos, spot, {
          priceShockPct: ((spot - (pos.legs[0]?.strike || spot)) / (pos.legs[0]?.strike || spot)) * 100,
          ivShiftPct: ivShiftPercent,
          daysElapsed: timeElapsedDays,
          model: marginingModel,
        });
        marginSum += res.marginBp;
      });
      closest = {
        price: hoveredPoint.price,
        marginBp: Number(marginSum.toFixed(2)),
        status: marginSum > 50000 ? 'MARGIN_CALL' : marginSum > 30000 ? 'CAUTION' : 'SAFE',
      };
    }

    const deltaFromBase = closest.marginBp - portfolioMarginStress.baseInitialMarginBp;
    return {
      marginBp: closest.marginBp,
      deltaFromBase,
      status: closest.status,
    };
  }, [hoveredPoint, marginCurvePoints, targetMarginPositions, ivShiftPercent, timeElapsedDays, marginingModel, portfolioMarginStress.baseInitialMarginBp]);

  const toggleLegCheckbox = (legId: string) => {
    playKeyClick();
    setEnabledLegIds((prev) => ({
      ...prev,
      [legId]: prev[legId] === false ? true : false,
    }));
  };

  const togglePositionCheckbox = (posId: string) => {
    playKeyClick();
    setEnabledPositionIds((prev) => ({
      ...prev,
      [posId]: prev[posId] === false ? true : false,
    }));
  };

  // Handler to update an individual simulated trade leg's Implied Volatility
  const handleUpdateLegIv = (leg: TradeLeg, newIv: number) => {
    playKeyClick();
    const clampedIv = Math.max(0.01, Math.min(5.00, Number(newIv.toFixed(4))));
    setIndividualIvOverrides((prev) => ({
      ...prev,
      [leg.id]: clampedIv,
    }));
    if (sourceMode === 'builder') {
      onUpdateLeg({ ...leg, iv: clampedIv });
    }
  };

  // Handler to reset an individual simulated trade leg's Implied Volatility back to base
  const handleResetLegIv = (legId: string, baseLeg: TradeLeg) => {
    playKeyClick();
    setIndividualIvOverrides((prev) => {
      const next = { ...prev };
      delete next[legId];
      return next;
    });
    if (sourceMode === 'builder') {
      const origContract = [...chain.calls, ...chain.puts].find((c) => c.strike === baseLeg.strike);
      const originalIv = origContract ? origContract.iv : ticker.currentIV;
      onUpdateLeg({ ...baseLeg, iv: originalIv });
    }
  };

  // Reset all individual leg IV overrides across simulated trades
  const handleResetAllIndividualIvs = () => {
    playKeyClick();
    setIndividualIvOverrides({});
  };

  // Quick preset: Simulate Post-Earnings IV Crush (-25% relative IV on option legs)
  const handleApplyEarningsCrush = () => {
    playKeyClick();
    const newOverrides: Record<string, number> = {};
    allSourceLegs.forEach((leg) => {
      if (leg.type === 'call' || leg.type === 'put') {
        const baseIv = individualIvOverrides[leg.id] ?? leg.iv;
        const crushed = Math.max(0.05, baseIv * 0.75);
        newOverrides[leg.id] = Number(crushed.toFixed(4));
        if (sourceMode === 'builder') {
          onUpdateLeg({ ...leg, iv: Number(crushed.toFixed(4)) });
        }
      }
    });
    setIndividualIvOverrides(newOverrides);
  };

  // Quick preset: Simulate Event Vol Expansion (+25% relative IV on option legs)
  const handleApplyVolExpansion = () => {
    playKeyClick();
    const newOverrides: Record<string, number> = {};
    allSourceLegs.forEach((leg) => {
      if (leg.type === 'call' || leg.type === 'put') {
        const baseIv = individualIvOverrides[leg.id] ?? leg.iv;
        const expanded = Math.min(5.00, baseIv * 1.25);
        newOverrides[leg.id] = Number(expanded.toFixed(4));
        if (sourceMode === 'builder') {
          onUpdateLeg({ ...leg, iv: Number(expanded.toFixed(4)) });
        }
      }
    });
    setIndividualIvOverrides(newOverrides);
  };

  const handleAddStockLeg = (action: 'buy' | 'sell', shares = 100) => {
    playKeyClick();
    const newLeg: TradeLeg = {
      id: `leg-stk-${Date.now()}`,
      type: 'stock',
      action,
      strike: currentPrice,
      expiration: 'Perpetual',
      dte: 0,
      iv: 0,
      premium: currentPrice,
      contracts: shares,
      multiplier: 1,
      underlyingSymbol: ticker.symbol,
    };
    if (onAddLeg) {
      onAddLeg(newLeg);
    } else {
      onUpdateLeg(newLeg);
    }
    setSourceMode('builder');
  };

  const handleAddFuturesLeg = (action: 'buy' | 'sell', contracts = 1) => {
    playKeyClick();
    const mult = ticker.multiplier || (ticker.symbol === '/CL' ? 1000 : 50);
    const newLeg: TradeLeg = {
      id: `leg-fut-${Date.now()}`,
      type: 'future',
      action,
      strike: currentPrice,
      expiration: 'Front Month',
      dte: 0,
      iv: 0,
      premium: currentPrice,
      contracts,
      multiplier: mult,
      underlyingSymbol: ticker.symbol,
    };
    if (onAddLeg) {
      onAddLeg(newLeg);
    } else {
      onUpdateLeg(newLeg);
    }
    setSourceMode('builder');
  };

  const handleModelPositionInRiskProfile = (pos: Position) => {
    playKeyClick();
    if (onSelectTicker && pos.ticker !== ticker.symbol) {
      onSelectTicker(pos.ticker);
    }
    setSourceMode('portfolio');
    setEnabledPositionIds({ [pos.id]: true });
  };

  const handleStagePositionLegsInBuilder = (pos: Position) => {
    playKeyClick();
    if (onAddLeg) {
      pos.legs.forEach((l) => {
        onAddLeg({
          ...l,
          id: `leg-staged-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        });
      });
    }
    setSourceMode('builder');
  };

  const handleDuplicateLeg = (leg: TradeLeg) => {
    playKeyClick();
    const duplicatedLeg: TradeLeg = {
      ...leg,
      id: `leg-copy-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    };
    if (onAddLeg) {
      onAddLeg(duplicatedLeg);
    } else {
      onUpdateLeg(duplicatedLeg);
    }
  };

  const handleInvertLeg = (leg: TradeLeg) => {
    playKeyClick();
    const invertedLeg: TradeLeg = {
      ...leg,
      action: leg.action === 'buy' ? 'sell' : 'buy',
    };
    onUpdateLeg(invertedLeg);
  };

  // Available Option Strikes across current expiration & all loaded expirations
  const availableStrikes = useMemo(() => {
    const set = new Set<number>();
    (chain?.calls || []).forEach((c) => set.add(c.strike));
    (chain?.puts || []).forEach((p) => set.add(p.strike));
    (allChains || []).forEach((ch) => {
      ch.calls.forEach((c) => set.add(c.strike));
      ch.puts.forEach((p) => set.add(p.strike));
    });
    const sorted = Array.from(set).sort((a, b) => a - b);
    if (sorted.length > 0) return sorted;
    const step = ticker.price > 200 ? 5 : ticker.price > 50 ? 2.5 : 1;
    const fallback: number[] = [];
    for (let p = Math.max(5, ticker.price * 0.7); p <= ticker.price * 1.3; p += step) {
      fallback.push(Number(p.toFixed(2)));
    }
    return fallback;
  }, [chain, allChains, ticker.price]);

  // Lookup contract or calculate theoretical price/IV for any strike
  const getContractForStrike = useCallback(
    (type: 'call' | 'put', targetStrike: number, legDte?: number) => {
      const list = type === 'call' ? chain?.calls : chain?.puts;
      const matched = list?.find((c) => c.strike === targetStrike);
      if (matched) return { bid: matched.bid, ask: matched.ask, mid: (matched.bid + matched.ask) / 2, iv: matched.iv };

      if (allChains && allChains.length > 0) {
        for (const ch of allChains) {
          if (legDte === undefined || ch.dte === legDte) {
            const chList = type === 'call' ? ch.calls : ch.puts;
            const chMatch = chList.find((c) => c.strike === targetStrike);
            if (chMatch) {
              return { bid: chMatch.bid, ask: chMatch.ask, mid: (chMatch.bid + chMatch.ask) / 2, iv: chMatch.iv };
            }
          }
        }
      }

      const dteYears = Math.max(0.005, (legDte || chain?.dte || 30) / 365);
      const iv = ticker.currentIV || 0.25;
      const bsmResult = calculateBSM(currentPrice, targetStrike, dteYears, iv, type, RISK_FREE_RATE);
      const bsmTheo = bsmResult.price;
      const halfSpread = Math.max(0.05, bsmTheo * 0.02);
      return {
        bid: Math.max(0.01, Number((bsmTheo - halfSpread).toFixed(2))),
        ask: Number((bsmTheo + halfSpread).toFixed(2)),
        mid: Number(bsmTheo.toFixed(2)),
        iv,
      };
    },
    [chain, allChains, currentPrice, ticker.currentIV]
  );

  const handleStrikePointerDown = (e: React.PointerEvent, leg: TradeLeg, isPortfolioPosition: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    const rect = svgRef.current?.getBoundingClientRect();
    const mouseX = rect ? e.clientX - rect.left : scaleX(leg.strike);

    const contractInfo = getContractForStrike(leg.type as 'call' | 'put', leg.strike, leg.dte);
    const prem = contractInfo.mid;
    const iv = contractInfo.iv;

    setActiveStrikeDrag({
      legId: leg.id,
      leg,
      isPortfolioPosition,
      initialStrike: leg.strike,
      currentStrike: leg.strike,
      currentMouseX: mouseX,
      newPremium: prem,
      newIv: iv,
    });

    setDragPreviewOverride({
      legId: leg.id,
      strike: leg.strike,
      premium: prem,
      iv,
    });

    playTickBlip();
  };

  // Precise conversion from client pointer coordinates to SVG viewBox coordinate space
  const getSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    try {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const svgP = pt.matrixTransform(ctm.inverse());
        return { svgX: svgP.x, svgY: svgP.y, clientX, clientY };
      }
    } catch {
      // Fallback below
    }
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / (rect.width || 1)) * svgWidth;
    const svgY = ((clientY - rect.top) / (rect.height || 1)) * svgHeight;
    return { svgX, svgY, clientX, clientY };
  }, [svgWidth, svgHeight]);

  const handleChartPointerMove = (e: React.PointerEvent) => {
    if (!activeStrikeDrag || !svgRef.current) return;
    e.preventDefault();

    const coords = getSvgCoords(e.clientX, e.clientY);
    const svgX = coords ? coords.svgX : (e.clientX - svgRef.current.getBoundingClientRect().left);
    const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / graphWidth));
    const rawPrice = minPrice + ratio * (maxPrice - minPrice);

    // Snap to closest available strike
    let closestStrike = availableStrikes[0];
    let minDiff = Infinity;
    for (const s of availableStrikes) {
      const diff = Math.abs(s - rawPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closestStrike = s;
      }
    }

    if (closestStrike !== activeStrikeDrag.currentStrike) {
      playTickBlip();
    }

    const contractInfo = getContractForStrike(
      activeStrikeDrag.leg.type as 'call' | 'put',
      closestStrike,
      activeStrikeDrag.leg.dte
    );

    setActiveStrikeDrag((prev) =>
      prev
        ? {
            ...prev,
            currentStrike: closestStrike,
            currentMouseX: svgX,
            newPremium: contractInfo.mid,
            newIv: contractInfo.iv,
          }
        : null
    );

    setDragPreviewOverride({
      legId: activeStrikeDrag.leg.id,
      strike: closestStrike,
      premium: contractInfo.mid,
      iv: contractInfo.iv,
    });
  };

  const handleChartPointerUp = (e?: React.PointerEvent) => {
    if (!activeStrikeDrag) return;
    if (e) {
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {}
    }

    const { leg, isPortfolioPosition, initialStrike, currentStrike, newPremium, newIv } = activeStrikeDrag;

    if (currentStrike !== initialStrike) {
      playKeyClick();

      if (isPortfolioPosition) {
        const targetPos = portfolioPositions.find((p) => p.legs.some((l) => l.id === leg.id));
        if (targetPos) {
          const updatedLegs = targetPos.legs.map((l) =>
            l.id === leg.id
              ? { ...l, strike: currentStrike, premium: newPremium, iv: newIv }
              : l
          );
          const newMark = updatedLegs.reduce((sum, l) => {
            const s = l.action === 'buy' ? 1 : -1;
            const mult = l.multiplier || 100;
            return sum + s * l.premium * l.contracts * mult;
          }, 0);
          const updatedPosition: Position = {
            ...targetPos,
            legs: updatedLegs,
            currentMark: newMark,
            unrealizedPnL: newMark - targetPos.entryCost,
            unrealizedPnLPercent: targetPos.entryCost !== 0 ? ((newMark - targetPos.entryCost) / Math.abs(targetPos.entryCost)) * 100 : 0,
          };
          if (onUpdatePosition) {
            onUpdatePosition(updatedPosition);
          }
        }
      } else if (sourceMode === 'builder') {
        onUpdateLeg({
          ...leg,
          strike: currentStrike,
          premium: newPremium,
          iv: newIv,
        });
      } else if (sourceMode === 'preset') {
        setPresetOverrides((prev) => ({
          ...prev,
          [leg.id]: { strike: currentStrike, premium: newPremium, iv: newIv },
        }));
      }

      setStrikeToast({
        message: `Strike shifted from $${initialStrike.toFixed(2)} to $${currentStrike.toFixed(2)}`,
        action: leg.action,
        type: leg.type,
        oldStrike: initialStrike,
        newStrike: currentStrike,
      });
      setTimeout(() => setStrikeToast(null), 3500);
    }

    setActiveStrikeDrag(null);
    setDragPreviewOverride(null);
  };

  const handleShiftStrikeStep = (leg: TradeLeg, direction: 'up' | 'down', isPortfolioPosition: boolean) => {
    playKeyClick();
    if (leg.type !== 'call' && leg.type !== 'put') return;
    const currentIdx = availableStrikes.indexOf(leg.strike);
    let newStrike = leg.strike;
    if (currentIdx !== -1) {
      const nextIdx =
        direction === 'up'
          ? Math.min(availableStrikes.length - 1, currentIdx + 1)
          : Math.max(0, currentIdx - 1);
      newStrike = availableStrikes[nextIdx];
    } else {
      const step = ticker.price > 200 ? 5 : ticker.price > 50 ? 2.5 : 1;
      newStrike = direction === 'up' ? leg.strike + step : Math.max(1, leg.strike - step);
    }
    if (newStrike === leg.strike) return;

    const contractInfo = getContractForStrike(leg.type, newStrike, leg.dte);

    if (isPortfolioPosition) {
      const targetPos = portfolioPositions.find((p) => p.legs.some((l) => l.id === leg.id));
      if (targetPos) {
        const updatedLegs = targetPos.legs.map((l) =>
          l.id === leg.id ? { ...l, strike: newStrike, premium: contractInfo.mid, iv: contractInfo.iv } : l
        );
        const newMark = updatedLegs.reduce((sum, l) => {
          const s = l.action === 'buy' ? 1 : -1;
          const mult = l.multiplier || 100;
          return sum + s * l.premium * l.contracts * mult;
        }, 0);
        const updatedPosition: Position = {
          ...targetPos,
          legs: updatedLegs,
          currentMark: newMark,
          unrealizedPnL: newMark - targetPos.entryCost,
          unrealizedPnLPercent: targetPos.entryCost !== 0 ? ((newMark - targetPos.entryCost) / Math.abs(targetPos.entryCost)) * 100 : 0,
        };
        if (onUpdatePosition) {
          onUpdatePosition(updatedPosition);
        }
      }
    } else if (sourceMode === 'builder') {
      onUpdateLeg({
        ...leg,
        strike: newStrike,
        premium: contractInfo.mid,
        iv: contractInfo.iv,
      });
    } else if (sourceMode === 'preset') {
      setPresetOverrides((prev) => ({
        ...prev,
        [leg.id]: { strike: newStrike, premium: contractInfo.mid, iv: contractInfo.iv },
      }));
    }

    setStrikeToast({
      message: `Shifted strike to $${newStrike.toFixed(2)}`,
      action: leg.action,
      type: leg.type,
      oldStrike: leg.strike,
      newStrike,
    });
    setTimeout(() => setStrikeToast(null), 3000);
  };

  const handleShiftStrike = (leg: TradeLeg, direction: 'up' | 'down') => {
    handleShiftStrikeStep(leg, direction, sourceMode === 'portfolio');
  };

  // Window-level pointer and keyboard listeners for smooth drag & drop strikes across the entire window
  useEffect(() => {
    if (!activeStrikeDrag) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!svgRef.current) return;
      const coords = getSvgCoords(e.clientX, e.clientY);
      const svgX = coords ? coords.svgX : (e.clientX - svgRef.current.getBoundingClientRect().left);
      const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / graphWidth));
      const rawPrice = minPrice + ratio * (maxPrice - minPrice);

      let closestStrike = availableStrikes[0];
      let minDiff = Infinity;
      for (const s of availableStrikes) {
        const diff = Math.abs(s - rawPrice);
        if (diff < minDiff) {
          minDiff = diff;
          closestStrike = s;
        }
      }

      if (closestStrike !== activeStrikeDrag.currentStrike) {
        playTickBlip();
      }

      const contractInfo = getContractForStrike(
        activeStrikeDrag.leg.type as 'call' | 'put',
        closestStrike,
        activeStrikeDrag.leg.dte
      );

      setActiveStrikeDrag((prev) =>
        prev
          ? {
              ...prev,
              currentStrike: closestStrike,
              currentMouseX: svgX,
              newPremium: contractInfo.mid,
              newIv: contractInfo.iv,
            }
          : null
      );

      setDragPreviewOverride({
        legId: activeStrikeDrag.leg.id,
        strike: closestStrike,
        premium: contractInfo.mid,
        iv: contractInfo.iv,
      });
    };

    const handleWindowPointerUp = () => {
      handleChartPointerUp();
    };

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveStrikeDrag(null);
        setDragPreviewOverride(null);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [
    activeStrikeDrag,
    availableStrikes,
    graphWidth,
    minPrice,
    maxPrice,
    padding.left,
    getContractForStrike,
    handleChartPointerUp,
    getSvgCoords,
  ]);

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] border border-[var(--border)] rounded overflow-hidden font-mono text-xs select-none text-left">
      {/* ========================================================
          1. HEADER BANNER: RISK PROFILE // BIGGER PICTURE ENGINE
      ======================================================== */}
      <div className="bg-[var(--sidebar-bg)] border-b border-[var(--border)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)] font-black text-sm tracking-wider">
              {ticker.symbol} RISK PROFILE
            </span>
            <span className="text-[var(--ink-muted)] text-[11px] hidden md:inline">
              // BIGGER PICTURE VISUAL PAYOFF ENGINE
            </span>
          </div>

          <div className="h-4 w-px bg-[var(--border)]" />

          {/* Source Mode Switcher */}
          <div className="flex items-center bg-[#111] border border-[var(--border)] rounded p-0.5 text-[10px]">
            <button
              onClick={() => {
                playKeyClick();
                setSourceMode('builder');
              }}
              className={`px-2.5 py-0.5 rounded font-bold transition-all ${
                sourceMode === 'builder'
                  ? 'bg-[var(--accent)] text-black font-extrabold shadow-sm'
                  : 'text-[#8c8c8c] hover:text-white'
              }`}
            >
              BUILDER LEGS ({builderLegs.length})
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setSourceMode('portfolio');
              }}
              className={`px-2.5 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                sourceMode === 'portfolio'
                  ? 'bg-[#00d2ff] text-black font-extrabold shadow-sm'
                  : 'text-[#8c8c8c] hover:text-white'
              }`}
            >
              <span>PORTFOLIO POSITIONS ({portfolioPositions.length})</span>
              {portfolioPositions.length > 0 && (
                <span className="text-[8.5px] opacity-80">
                  [{portfolioStats.stocksCount} Stk · {portfolioStats.futuresCount} Fut · {portfolioStats.optionsCount} Opt]
                </span>
              )}
            </button>

            {/* Portfolio Beta Weighting Quick Launcher Button */}
            {portfolioPositions.length > 0 && (
              <button
                onClick={() => {
                  playKeyClick();
                  setIsBetaWeightingModalOpen(true);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38bdf8]/15 hover:bg-[#38bdf8]/30 text-[#38bdf8] border border-[#38bdf8]/40 transition-all flex items-center gap-1 cursor-pointer"
                title="Open Portfolio Beta Weighting & Systematic Shock Analyzer"
              >
                <Scale className="w-3 h-3 text-[#38bdf8]" />
                <span>β-WEIGHTING</span>
                <span className="text-[9px] bg-[#0284c7]/40 text-white px-1 rounded font-black font-mono">
                  {portfolioBetaSummary.totalNetBetaWeightedDelta >= 0 ? '+' : ''}{portfolioBetaSummary.totalNetBetaWeightedDelta.toFixed(1)} SPY
                </span>
              </button>
            )}
            <button
              onClick={() => {
                playKeyClick();
                setSourceMode('preset');
              }}
              className={`px-2.5 py-0.5 rounded font-bold transition-all ${
                sourceMode === 'preset'
                  ? 'bg-[#43a047] text-white font-extrabold shadow-sm'
                  : 'text-[#8c8c8c] hover:text-white'
              }`}
            >
              STRATEGY PRESETS
            </button>
          </div>

          {/* Preset Selector Dropdown & Catalog Button */}
          {sourceMode === 'preset' && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedPreset}
                onChange={(e) => {
                  playKeyClick();
                  const nextPreset = e.target.value;
                  setSelectedPreset(nextPreset);
                  if (nextPreset === 'double-diagonal-spread' || nextPreset.toLowerCase().includes('diagonal')) {
                    setIsSkewModelEnabled(true);
                    setIsSkewPanelExpanded(true);
                    setSelectedSkewPresetKey('doubleDiagonalWingSkew');
                    setSkewModel({ ...SKEW_MODEL_PRESETS.doubleDiagonalWingSkew.config });
                  } else if (nextPreset.includes('calendar')) {
                    setIsSkewModelEnabled(true);
                    setIsSkewPanelExpanded(true);
                    setSelectedSkewPresetKey('normalContango');
                    setSkewModel({ ...SKEW_MODEL_PRESETS.normalContango.config });
                  }
                }}
                className="tos-btn text-[10px] font-bold text-[var(--accent)] py-1 px-2 max-w-[260px] truncate"
              >
                <optgroup label="Single Leg Options">
                  <option value="long-call">Long Call (Bullish)</option>
                  <option value="short-call">Short Call (Naked Bearish)</option>
                  <option value="long-put">Long Put (Bearish / Protection)</option>
                  <option value="cash-secured-put">Cash-Secured Put (Income)</option>
                </optgroup>
                <optgroup label="Vertical Spreads (Debit & Credit)">
                  <option value="bull-call-spread">Bull Call Spread (Debit +Δ)</option>
                  <option value="bear-call-spread">Bear Call Spread (Credit +Θ)</option>
                  <option value="bull-put-spread">Bull Put Spread (Credit +Θ)</option>
                  <option value="bear-put-spread">Bear Put Spread (Debit -Δ)</option>
                </optgroup>
                <optgroup label="Straddles & Strangles (Volatility)">
                  <option value="long-straddle">Long Straddle (Vol Breakout)</option>
                  <option value="short-straddle">Short Straddle (IV Crush)</option>
                  <option value="long-strangle">Long Strangle (OTM Breakout)</option>
                  <option value="short-strangle">Short Strangle (High Prob Theta)</option>
                  <option value="long-guts">Long Guts (ITM Volatility)</option>
                  <option value="short-guts">Short Guts (Deep Credit)</option>
                </optgroup>
                <optgroup label="Wings (Condors & Butterflies)">
                  <option value="iron-condor">Iron Condor (4-Leg Neutral)</option>
                  <option value="reverse-iron-condor">Reverse Iron Condor (Debit)</option>
                  <option value="iron-butterfly">Iron Butterfly (4-Leg ATM)</option>
                  <option value="reverse-iron-butterfly">Reverse Iron Butterfly</option>
                  <option value="long-call-butterfly">Long Call Butterfly (1-2-1 Pin)</option>
                  <option value="long-put-butterfly">Long Put Butterfly (1-2-1)</option>
                  <option value="broken-wing-call-butterfly">Broken Wing Call Butterfly</option>
                  <option value="broken-wing-put-butterfly">Broken Wing Put Butterfly</option>
                  <option value="long-call-condor">Long Call Condor (Plateau)</option>
                  <option value="long-put-condor">Long Put Condor (Plateau)</option>
                </optgroup>
                <optgroup label="Calendars & Diagonals (Time Spreads)">
                  <option value="call-calendar-spread">Call Calendar Spread (Time)</option>
                  <option value="put-calendar-spread">Put Calendar Spread</option>
                  <option value="poor-mans-covered-call">Poor Man's Covered Call (PMCC)</option>
                  <option value="poor-mans-covered-put">Poor Man's Covered Put (PMCP)</option>
                  <option value="double-calendar-spread">Double Calendar Spread</option>
                  <option value="double-diagonal-spread">Double Diagonal Spread</option>
                </optgroup>
                <optgroup label="Stock & Synthetic Equities">
                  <option value="covered-call">Covered Call (Stock + Short Call)</option>
                  <option value="protective-put">Protective Put (Stock + Put Hedge)</option>
                  <option value="collar">Collar (Zero-Cost Hedge)</option>
                  <option value="synthetic-long-stock">Synthetic Long Stock (+100Δ)</option>
                  <option value="synthetic-short-stock">Synthetic Short Stock (-100Δ)</option>
                  <option value="covered-put">Covered Put (Short Stock + Put)</option>
                  <option value="Long Stock (100 shs)">Long Stock (+100 shs)</option>
                  <option value="Short Stock (-100 shs)">Short Stock (-100 shs)</option>
                </optgroup>
                <optgroup label="Ratio & Asymmetric Exotics">
                  <option value="jade-lizard">Jade Lizard (No Upside Risk)</option>
                  <option value="reverse-jade-lizard">Reverse Jade Lizard (Twisted Sister)</option>
                  <option value="call-ratio-front-spread">Call Ratio Front Spread (1x2)</option>
                  <option value="put-ratio-front-spread">Put Ratio Front Spread (1x2)</option>
                  <option value="call-ratio-backspread">Call Ratio Backspread (2x1)</option>
                  <option value="put-ratio-backspread">Put Ratio Backspread (Crash Hedge)</option>
                  <option value="strap">Strap (Bullish Volatility)</option>
                  <option value="strip">Strip (Bearish Volatility)</option>
                  <option value="box-spread">Box Spread (4-Leg Arbitrage)</option>
                  <option value="risk-reversal">Risk Reversal (Directional Tunnel)</option>
                </optgroup>
                <optgroup label="Futures Strategies">
                  <option value="Long Future (1 ct)">Long Future (+1 ct)</option>
                  <option value="Short Future (-1 ct)">Short Future (-1 ct)</option>
                  <option value="Future + Protective Put">Future + Put Hedge</option>
                </optgroup>
              </select>

              {onOpenStrategyCatalog && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onOpenStrategyCatalog();
                  }}
                  className="px-2 py-1 bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/50 rounded text-[10px] font-black transition-all flex items-center gap-1 shadow-sm"
                  title="Browse complete Institutional Options Strategy Directory with risk-reward parameters"
                >
                  <Layers className="w-3 h-3" />
                  <span>ALL STRATEGIES ({ALL_OPTIONS_STRATEGIES.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Spot Quote & Navigation Buttons */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[#fff] font-extrabold text-xs">
              ${ticker.price.toFixed(2)}{' '}
              <span className={ticker.change >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}>
                {ticker.change >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="text-[9px] text-[#8c8c8c] flex items-center justify-end gap-2">
              <span>IV: {(ticker.currentIV * 100).toFixed(1)}% | IVR: {ticker.ivRank}%</span>
              <button
                onClick={() => {
                  playKeyClick();
                  if (onOpenExpectedMove) onOpenExpectedMove();
                }}
                className="hover:underline text-[#00d2ff] font-bold flex items-center gap-0.5"
                title="Click to view Expected Price Move & Volatility Bands"
              >
                <span>EXP:</span>
                <span className="text-[#00e676]">
                  ±${(ticker.price * (ticker.currentIV || 0.25) * Math.sqrt(Math.max(1, chain.dte) / 365)).toFixed(2)}
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              playKeyClick();
              onNavigateToChain();
            }}
            className="tos-btn"
            title="Return to Options Chain (OMON)"
          >
            CHAIN &gt;
          </button>
          <button
            onClick={() => {
              playKeyClick();
              onNavigateToValuation();
            }}
            className="tos-btn"
            title="Open Options Valuation (OVME)"
          >
            OVME &gt;
          </button>
        </div>
      </div>

      {/* ========================================================
          2. VITAL RISK & GREEKS METRICS RIBBON
      ======================================================== */}
      <div className="bg-[#181a1d] border-b border-[var(--border)] px-4 py-2 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3 text-[11px]">
        {/* Strategy Name */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#8c8c8c]">STRATEGY</span>
          <span className="font-extrabold text-[var(--accent)] truncate">{analysis.name}</span>
        </div>

        {/* Max Profit */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#8c8c8c]">MAX PROFIT</span>
          <span className="font-extrabold text-[var(--bull)]">
            {typeof analysis.maxProfit === 'number'
              ? `$${analysis.maxProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : 'Unlimited (∞)'}
          </span>
        </div>

        {/* Max Loss */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#8c8c8c]">MAX LOSS</span>
          <span className="font-extrabold text-[var(--bear)]">
            {typeof analysis.maxLoss === 'number'
              ? `$${analysis.maxLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : 'Unlimited (∞)'}
          </span>
        </div>

        {/* Margin BP Requirement */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#ff9900] font-bold">
              {sourceMode === 'portfolio' ? 'PORTFOLIO MARGIN' : 'MARGIN BP (REQ)'}
            </span>
            {(priceShockPct !== 0 || ivShiftPercent !== 0 || timeElapsedDays !== 0) && (
              <span className={`text-[7.5px] font-black px-1 rounded ${
                portfolioMarginStress.marginDeltaDollar > 0
                  ? 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40'
                  : 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
              }`}>
                {portfolioMarginStress.marginDeltaDollar >= 0 ? '+' : ''}
                {portfolioMarginStress.marginDeltaPercent.toFixed(0)}%
              </span>
            )}
          </div>
          <span className="font-extrabold text-[#ff9900]">
            (${portfolioMarginStress.stressedInitialMarginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </span>
          <span className="text-[8px] text-[#8c8c8c] truncate" title={marginingModel === 'PORTFOLIO_MARGIN' ? 'Institutional OCC TIMS Grid' : analysis.marginFormula}>
            {marginingModel === 'PORTFOLIO_MARGIN' ? 'OCC TIMS Grid' : analysis.marginType.replace(/_/g, ' ')}
            {(priceShockPct !== 0 || ivShiftPercent !== 0) && ` (Base $${Math.round(portfolioMarginStress.baseInitialMarginBp).toLocaleString()})`}
          </span>
        </div>

        {/* Return on Margin (RoM) */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#00e676] font-bold">RETURN ON MARGIN</span>
          <span className="font-extrabold text-[#00e676]">
            {analysis.returnOnMargin}
          </span>
          <span className="text-[8px] text-[#8c8c8c]">RoM / Capital</span>
        </div>

        {/* Breakevens */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#8c8c8c]">BREAKEVEN(S)</span>
          <span className="font-bold text-[#fff]">
            {analysis.breakEvens.length > 0
              ? analysis.breakEvens.map((b) => `$${b.toFixed(2)}`).join(' | ')
              : 'None / Delta Stock'}
          </span>
        </div>

        {/* Probability of Profit */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#8c8c8c]">PROB OF PROFIT (POP)</span>
          <span className="font-extrabold text-[#00d2ff]">{analysis.probOfProfit}%</span>
        </div>

        {/* Net Delta */}
        <div
          onClick={() => {
            if (portfolioPositions.length > 0) {
              playKeyClick();
              setIsBetaWeightingModalOpen(true);
            }
          }}
          className={`flex flex-col ${portfolioPositions.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
          title={portfolioPositions.length > 0 ? "Click to view Portfolio Beta Weighting" : undefined}
        >
          <div className="flex items-center justify-between text-[9px] text-[#8c8c8c]">
            <span>NET DELTA (Δ)</span>
            {portfolioPositions.length > 0 && <span className="text-[#38bdf8] font-bold">β &gt;</span>}
          </div>
          <span className={`font-bold ${analysis.totalDelta >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
            {analysis.totalDelta >= 0 ? '+' : ''}{analysis.totalDelta.toFixed(2)}
          </span>
          {portfolioPositions.length > 0 && (
            <span className="text-[8px] text-[#38bdf8] font-mono font-bold">
              β-SPY: {portfolioBetaSummary.totalNetBetaWeightedDelta >= 0 ? '+' : ''}{portfolioBetaSummary.totalNetBetaWeightedDelta.toFixed(1)}
            </span>
          )}
        </div>

        {/* Net Theta */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#8c8c8c]">NET THETA (Θ)</span>
          <span className={`font-bold ${analysis.totalTheta >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
            {analysis.totalTheta >= 0 ? '+' : ''}${analysis.totalTheta.toFixed(2)}/day
          </span>
        </div>

        {/* Net Vega */}
        <div className="flex flex-col">
          <span className="text-[9px] text-[#8c8c8c]">NET VEGA (V)</span>
          <span className="font-bold text-[#ffd600]">
            ${analysis.totalVega.toFixed(2)}/1% IV
          </span>
        </div>
      </div>

      {/* ========================================================
          3. MAIN RISK PROFILE CANVAS VIEWPORT ("BIGGER PICTURE")
      ======================================================== */}
      <div className="flex-1 flex flex-col overflow-y-auto w-full text-left">
        <div className="relative bg-[#0d0f12] border-b border-[var(--border)] p-1.5 sm:p-2">
          {/* Canvas Sub-Header with Controls & Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-1 text-[10px]">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[var(--accent)] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>EXPANSIVE PAYOFF CANVAS</span>
              </span>

              {/* Underlying Position Indicator */}
              {activeLegs.some((l) => l.type === 'stock' || l.type === 'future') && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10b981]/20 border border-[#10b981]/40 text-[#34d399] font-bold text-[9.5px]">
                  <span>UNDERLYING LOADED:</span>
                  <span className="text-white font-mono">
                    {[
                      ...activeLegs
                        .filter((l) => l.type === 'stock')
                        .map((l) => `${l.action === 'buy' ? '+' : '-'}${l.contracts} shs Stock`),
                      ...activeLegs
                        .filter((l) => l.type === 'future')
                        .map((l) => `${l.action === 'buy' ? '+' : '-'}${l.contracts} ct Future (${l.multiplier || 50}x)`),
                    ].join(' · ')}
                  </span>
                </div>
              )}

              {/* Legend Badges */}
              <div className="flex items-center gap-2 text-[10px]">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showExpirationCurve}
                    onChange={(e) => setShowExpirationCurve(e.target.checked)}
                    className="accent-[var(--bull)]"
                  />
                  <span className="text-[var(--bull)] font-bold">Expiration Line (T)</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTodayCurve}
                    onChange={(e) => setShowTodayCurve(e.target.checked)}
                    className="accent-[#00d2ff]"
                  />
                  <span className="text-[#00d2ff] font-bold">Today Curve (T+0)</span>
                </label>

                {timeElapsedDays > 0 && (
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSimulatedCurve}
                      onChange={(e) => setShowSimulatedCurve(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-[var(--accent)] font-bold">Simulated Curve (T+{timeElapsedDays}d)</span>
                  </label>
                )}

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSigmaBands}
                    onChange={(e) => setShowSigmaBands(e.target.checked)}
                    className="accent-[#8c8c8c]"
                  />
                  <span className="text-[#8c8c8c]">±1σ / ±2σ Bands</span>
                </label>

                {/* Scenario Payoff Matrix Visibility Toggle */}
                <label className="flex items-center gap-1 cursor-pointer" title="Toggle scenario payoff matrix table">
                  <input
                    type="checkbox"
                    checked={showScenarioMatrix}
                    onChange={(e) => {
                      playKeyClick();
                      setShowScenarioMatrix(e.target.checked);
                    }}
                    className="accent-[var(--accent)]"
                  />
                  <span className={showScenarioMatrix ? 'text-[var(--accent)] font-bold' : 'text-[#8c8c8c]'}>
                    Scenario Matrix
                  </span>
                </label>

                {/* Skew Baseline Overlay Checkbox */}
                {isSkewModelEnabled && (
                  <label className="flex items-center gap-1 cursor-pointer" title="Overlay classical unskewed flat-vol Black-Scholes curve to observe skew alpha">
                    <input
                      type="checkbox"
                      checked={showUnskewedOverlay}
                      onChange={(e) => setShowUnskewedOverlay(e.target.checked)}
                      className="accent-[#f59e0b]"
                    />
                    <span className="text-[#f59e0b] font-bold flex items-center gap-1">
                      <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-[#f59e0b]" />
                      <span>Flat-Vol Baseline Overlay</span>
                    </span>
                  </label>
                )}

                {/* Margin Requirement Curve Overlay Checkbox */}
                <label className="flex items-center gap-1 cursor-pointer" title="Overlay theoretical Margin Requirement ($) curve across price range">
                  <input
                    type="checkbox"
                    checked={showMarginCurve}
                    onChange={(e) => {
                      playKeyClick();
                      setShowMarginCurve(e.target.checked);
                    }}
                    className="accent-[#ff9900]"
                  />
                  <span className="text-[#ff9900] font-bold flex items-center gap-1">
                    <span className="inline-block w-2.5 h-0.5 border-t-2 border-dashed border-[#ff9900]" />
                    <span>Margin Req Curve</span>
                  </span>
                </label>

                {/* Draggable Strikes Toggle */}
                <label className="flex items-center gap-1 cursor-pointer" title="Enable/disable click, drag & drop strike pins directly on the payoff chart">
                  <input
                    type="checkbox"
                    checked={showDraggableStrikes}
                    onChange={(e) => {
                      playKeyClick();
                      setShowDraggableStrikes(e.target.checked);
                    }}
                    className="accent-[#00d2ff]"
                  />
                  <span className="text-[#00d2ff] font-bold flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-[#00d2ff]" />
                    <span>Drag Strikes</span>
                  </span>
                </label>

                {showDraggableStrikes && activeOptionLegs.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 text-[8.5px] font-bold hidden sm:inline-block">
                    {activeOptionLegs.length} Draggable Pins
                  </span>
                )}

                {/* Skew Active Pill Badge */}
                {isSkewModelEnabled && (
                  <button
                    onClick={() => {
                      playKeyClick();
                      setIsSkewPanelExpanded(!isSkewPanelExpanded);
                    }}
                    className="px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-500/40 hover:bg-purple-900/50 text-[9px] font-bold flex items-center gap-1 transition-all"
                    title="Click to configure Volatility Skew Engine parameters"
                  >
                    <Sliders className="w-2.5 h-2.5 text-[#c084fc]" />
                    <span>SKEW: {SKEW_MODEL_PRESETS[selectedSkewPresetKey]?.name.split(' (')[0] || 'Custom Skew'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Canvas Actions & Expand Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playKeyClick();
                  setIsBiggerPictureExpanded(!isBiggerPictureExpanded);
                }}
                className={`tos-btn flex items-center gap-1.5 ${
                  isBiggerPictureExpanded ? 'bg-[var(--accent)] text-black font-extrabold border-[var(--accent)]' : ''
                }`}
                title="Toggle expansive full-size bigger picture canvas"
              >
                {isBiggerPictureExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isBiggerPictureExpanded ? 'EXPANDED CANVAS' : 'BIGGER PICTURE'}</span>
              </button>

              {/* Quick Reset */}
              {(timeElapsedDays !== 0 || ivShiftPercent !== 0 || priceShockPct !== 0) && (
                <button
                  onClick={() => {
                    playKeyClick();
                    setTimeElapsedDays(0);
                    setIvShiftPercent(0);
                    setPriceShockPct(0);
                  }}
                  className="tos-btn text-[var(--accent)] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET SHOCKS</span>
                </button>
              )}
            </div>
          </div>

          {/* Strike Shift Feedback Toast */}
          {strikeToast && (
            <div className="mx-3 mt-1 mb-2 p-2 rounded-lg bg-[#0c1829] border border-[#00d2ff] shadow-xl flex items-center justify-between text-xs font-mono text-white animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00e676]" />
                <span>
                  <strong className={strikeToast.action === 'buy' ? 'text-[#00e676]' : 'text-[#ff5252]'}>
                    {strikeToast.action.toUpperCase()} {strikeToast.type.toUpperCase()}
                  </strong>
                  : {strikeToast.message} (from ${strikeToast.oldStrike.toFixed(2)} ➔ ${strikeToast.newStrike.toFixed(2)})
                </span>
              </div>
              <button
                onClick={() => setStrikeToast(null)}
                className="text-[#8c8c8c] hover:text-white p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* SVG Canvas & Floating HUD */}
          <div className="w-full overflow-x-auto no-scrollbar relative flex justify-start items-start">
            {/* Live Floating Drag & Drop Strike HUD */}
            {activeStrikeDrag && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-[#090d16]/95 border-2 border-[#00d2ff] rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs font-mono text-white animate-in zoom-in-95 pointer-events-none select-none">
                <div className="w-3 h-3 rounded-full bg-[#00d2ff] animate-ping" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-[#94a3b8]">
                      {activeStrikeDrag.isPortfolioPosition
                        ? 'ROLLING PORTFOLIO POSITION'
                        : sourceMode === 'preset'
                        ? 'ADJUSTING STRATEGY PRESET'
                        : 'ADJUSTING SIMULATED TRADE'}:
                    </span>
                    <span
                      className={`font-black ${
                        activeStrikeDrag.leg.action === 'buy' ? 'text-[#00e676]' : 'text-[#ff5252]'
                      }`}
                    >
                      {activeStrikeDrag.leg.action.toUpperCase()} {activeStrikeDrag.leg.contracts}x{' '}
                      {activeStrikeDrag.leg.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm font-black mt-0.5">
                    <span className="text-[#94a3b8] line-through">
                      ${activeStrikeDrag.initialStrike.toFixed(2)}
                    </span>
                    <span className="text-[#00d2ff]">➔</span>
                    <span className="text-white text-base font-extrabold bg-[#00d2ff]/20 px-2 py-0.5 rounded border border-[#00d2ff]">
                      ${activeStrikeDrag.currentStrike.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs ${
                        activeStrikeDrag.currentStrike >= activeStrikeDrag.initialStrike
                          ? 'text-[#00e676]'
                          : 'text-[#ff5252]'
                      }`}
                    >
                      ({activeStrikeDrag.currentStrike >= activeStrikeDrag.initialStrike ? '+' : ''}
                      {(activeStrikeDrag.currentStrike - activeStrikeDrag.initialStrike).toFixed(2)})
                    </span>
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-[#334155]" />
                <div className="flex flex-col text-[10.5px]">
                  <div className="text-[#94a3b8]">
                    Simulated Theo Mark:{' '}
                    <strong className="text-[#ffd600]">${activeStrikeDrag.newPremium.toFixed(2)}</strong>
                  </div>
                  <div className="text-[#94a3b8]">
                    Implied Vol (IV):{' '}
                    <strong className="text-white">{(activeStrikeDrag.newIv * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="text-[9px] text-[#38bdf8] mt-0.5">
                    Release to drop &amp; confirm · Press ESC to cancel
                  </div>
                </div>
              </div>
            )}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMinYMid meet"
              className={`w-full h-auto min-w-[760px] ${
                isBiggerPictureExpanded ? 'max-h-[580px]' : 'max-h-[420px]'
              } bg-[#121417] rounded border border-[#2d3339] shadow-inner select-none ml-0 mr-auto ${
                activeStrikeDrag ? 'cursor-ew-resize' : 'cursor-crosshair'
              }`}
              onPointerMove={(e) => {
                if (activeStrikeDrag) {
                  handleChartPointerMove(e);
                } else {
                  const coords = getSvgCoords(e.clientX, e.clientY);
                  if (!coords) return;
                  const { svgX, svgY, clientX, clientY } = coords;
                  const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / graphWidth));
                  const price = minPrice + ratio * (maxPrice - minPrice);
                  let closest = payoffPoints[0];
                  let minD = Infinity;
                  payoffPoints.forEach((pt) => {
                    const d = Math.abs(pt.price - price);
                    if (d < minD) {
                      minD = d;
                      closest = pt;
                    }
                  });
                  if (closest && svgX >= padding.left - 15 && svgX <= svgWidth - padding.right + 15) {
                    setHoveredPoint(closest);
                    setHoverCoords({ svgX, svgY, clientX, clientY });
                  } else {
                    setHoveredPoint(null);
                    setHoverCoords(null);
                  }
                }
              }}
              onPointerUp={(e) => {
                if (activeStrikeDrag) {
                  handleChartPointerUp(e);
                }
              }}
              onPointerCancel={() => {
                if (activeStrikeDrag) {
                  setActiveStrikeDrag(null);
                  setDragPreviewOverride(null);
                }
                setHoveredPoint(null);
                setHoverCoords(null);
              }}
              onMouseLeave={() => {
                if (!activeStrikeDrag) {
                  setHoveredPoint(null);
                  setHoverCoords(null);
                }
              }}
            >
              {/* Grids and Axes */}
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#43a047" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#43a047" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lossGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#e53935" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#e53935" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Standard Deviation Expected Move Bands */}
              {showSigmaBands && (
                <>
                  {/* 2-Sigma Band (95.4% probability) */}
                  <rect
                    x={scaleX(lower2Sigma)}
                    y={padding.top}
                    width={Math.max(2, scaleX(upper2Sigma) - scaleX(lower2Sigma))}
                    height={graphHeight}
                    fill="#3c3f41"
                    opacity="0.18"
                  />
                  {/* 1-Sigma Band (68.2% probability) */}
                  <rect
                    x={scaleX(lower1Sigma)}
                    y={padding.top}
                    width={Math.max(2, scaleX(upper1Sigma) - scaleX(lower1Sigma))}
                    height={graphHeight}
                    fill="#ff9900"
                    opacity="0.08"
                  />
                  {/* Sigma labels */}
                  <text
                    x={scaleX(lower1Sigma)}
                    y={padding.top + 14}
                    fill="#8c8c8c"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    -1σ (${lower1Sigma.toFixed(1)})
                  </text>
                  <text
                    x={scaleX(upper1Sigma)}
                    y={padding.top + 14}
                    fill="#8c8c8c"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    +1σ (${upper1Sigma.toFixed(1)})
                  </text>
                </>
              )}

              {/* Horizontal P&L Gridlines */}
              {[-1000, -500, -250, 0, 250, 500, 1000].map((level) => {
                if (level < minPnl || level > maxPnl) return null;
                const y = scaleY(level);
                const isZero = level === 0;
                return (
                  <g key={level}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke={isZero ? '#8c8c8c' : '#26292d'}
                      strokeWidth={isZero ? 1.5 : 1}
                      strokeDasharray={isZero ? '4 3' : undefined}
                    />
                    <text
                      x={padding.left - 5}
                      y={y + 3}
                      fill={isZero ? '#fff' : '#64748b'}
                      fontSize="8.5"
                      textAnchor="end"
                      fontWeight={isZero ? 'bold' : 'normal'}
                    >
                      {level >= 0 ? `+$${level}` : `-$${Math.abs(level)}`}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Stock Price Gridlines */}
              {[0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15].map((multiplier) => {
                const p = Number((currentPrice * multiplier).toFixed(1));
                if (p < minPrice || p > maxPrice) return null;
                const x = scaleX(p);
                return (
                  <g key={p}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={svgHeight - padding.bottom}
                      stroke="#22252a"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={svgHeight - padding.bottom + 15}
                      fill="#8c8c8c"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      ${p}
                    </text>
                  </g>
                );
              })}

              {/* Shading Above / Below Zero for Expiration */}
              {showExpirationCurve && (
                <path d={profitAreaPath} fill="url(#profitGrad)" pointerEvents="none" />
              )}

              {/* Expiration Curve (T) */}
              {showExpirationCurve && (
                <path
                  d={expirationPath}
                  fill="none"
                  stroke="#43a047"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Today Curve (T+0) */}
              {showTodayCurve && (
                <path
                  d={todayPath}
                  fill="none"
                  stroke="#00d2ff"
                  strokeWidth="2"
                  strokeDasharray={timeElapsedDays > 0 ? '5 3' : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Unskewed Baseline Reference Curves (Flat-Vol / Zero-Skew Overlay) */}
              {showUnskewedOverlay && isSkewModelEnabled && (
                <>
                  {showExpirationCurve && unskewedExpirationPath && (
                    <path
                      d={unskewedExpirationPath}
                      fill="none"
                      stroke="#84cc16"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      strokeOpacity="0.75"
                    />
                  )}
                  {showTodayCurve && unskewedTodayPath && (
                    <path
                      d={unskewedTodayPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      strokeOpacity="0.75"
                    />
                  )}
                </>
              )}

              {/* Margin Requirement Curve Overlay (REQ) */}
              {showMarginCurve && marginCurvePath && (
                <g>
                  <path
                    d={marginCurvePath}
                    fill="none"
                    stroke="#ff9900"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Right-side Margin Axis Scale Markers */}
                  <text
                    x={svgWidth - padding.right + 6}
                    y={scaleMarginY(maxMarginInCurve)}
                    fill="#ff9900"
                    fontSize="8.5"
                    fontWeight="bold"
                  >
                    ${(maxMarginInCurve / 1000).toFixed(0)}k REQ
                  </text>
                  <text
                    x={svgWidth - padding.right + 6}
                    y={scaleMarginY(maxMarginInCurve * 0.5)}
                    fill="#ff9900"
                    fontSize="8"
                    opacity="0.8"
                  >
                    ${((maxMarginInCurve * 0.5) / 1000).toFixed(0)}k
                  </text>
                  <text
                    x={svgWidth - padding.right + 6}
                    y={scaleMarginY(0)}
                    fill="#ff9900"
                    fontSize="8"
                    opacity="0.6"
                  >
                    $0 MARGIN
                  </text>
                </g>
              )}

              {/* Breakeven Marker Lines */}
              {showBreakevens &&
                breakEvenLines.map((be) => (
                  <g key={be.price}>
                    <line
                      x1={be.x}
                      y1={padding.top}
                      x2={be.x}
                      y2={svgHeight - padding.bottom}
                      stroke="#ffd600"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <rect
                      x={be.x - 26}
                      y={svgHeight - padding.bottom + 4}
                      width="52"
                      height="15"
                      fill="#ffd600"
                      rx="2"
                    />
                    <text
                      x={be.x}
                      y={svgHeight - padding.bottom + 15}
                      fill="#000"
                      fontSize="9"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      BE ${be.price}
                    </text>
                  </g>
                ))}

              {/* Current Spot Price Vertical Benchmark */}
              <line
                x1={spotX}
                y1={padding.top}
                x2={spotX}
                y2={svgHeight - padding.bottom}
                stroke="#fff"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <rect
                x={spotX - 30}
                y={padding.top - 18}
                width="60"
                height="15"
                fill="#fff"
                rx="2"
              />
              <text
                x={spotX}
                y={padding.top - 7}
                fill="#000"
                fontSize="9"
                textAnchor="middle"
                fontWeight="900"
              >
                SPOT ${currentPrice.toFixed(2)}
              </text>

              {/* Active Strike Drag Ghost Line (Original Strike Baseline) */}
              {activeStrikeDrag && (
                <g>
                  <line
                    x1={scaleX(activeStrikeDrag.initialStrike)}
                    y1={padding.top}
                    x2={scaleX(activeStrikeDrag.initialStrike)}
                    y2={svgHeight - padding.bottom}
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                  <rect
                    x={scaleX(activeStrikeDrag.initialStrike) - 36}
                    y={padding.top - 18}
                    width="72"
                    height="15"
                    rx="2"
                    fill="#1e293b"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                  <text
                    x={scaleX(activeStrikeDrag.initialStrike)}
                    y={padding.top - 7}
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    WAS ${activeStrikeDrag.initialStrike.toFixed(2)}
                  </text>
                </g>
              )}

              {/* Interactive Draggable Strikes (Pins, Handles & Guidelines for Positions & Simulated Trades) */}
              {showDraggableStrikes &&
                activeOptionLegs.map((leg, idx) => {
                  const isThisDragged = activeStrikeDrag?.legId === leg.id;
                  const strikeToUse =
                    isThisDragged && activeStrikeDrag
                      ? activeStrikeDrag.currentStrike
                      : leg.strike;
                  if (strikeToUse < minPrice || strikeToUse > maxPrice) return null;
                  const x = scaleX(strikeToUse);
                  const isCall = leg.type === 'call';
                  const isBuy = leg.action === 'buy';

                  // High-contrast color styling
                  const color = isCall
                    ? isBuy
                      ? '#00e676'
                      : '#f97316'
                    : isBuy
                    ? '#00d2ff'
                    : '#ec4899';

                  const isPortfolioLeg =
                    sourceMode === 'portfolio' ||
                    portfolioPositions.some((p) => p.legs.some((l) => l.id === leg.id));

                  // Stagger top pill height if multiple legs share identical or close strikes
                  const staggerY = padding.top + 8 + (idx % 3) * 26;
                  const pillWidth = 86;
                  const pillHeight = 22;
                  const pillX = Math.max(
                    padding.left + 2,
                    Math.min(svgWidth - padding.right - pillWidth - 30, x - pillWidth / 2)
                  );

                  return (
                    <g key={`strike-pin-${leg.id}`} className="select-none">
                      {/* Glow halo when currently being dragged */}
                      {isThisDragged && (
                        <line
                          x1={x}
                          y1={padding.top}
                          x2={x}
                          y2={svgHeight - padding.bottom}
                          stroke={color}
                          strokeWidth="8"
                          strokeOpacity="0.3"
                        />
                      )}

                      {/* Vertical Strike Guideline */}
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={svgHeight - padding.bottom}
                        stroke={color}
                        strokeWidth={isThisDragged ? '2.5' : '1.5'}
                        strokeDasharray={isThisDragged ? undefined : '4 3'}
                        strokeOpacity={isThisDragged ? '1' : '0.8'}
                      />

                      {/* Top Strike Handle Pill (Interactive Drag Target) */}
                      <g
                        className="cursor-grab active:cursor-grabbing hover:brightness-125"
                        onPointerDown={(e) => handleStrikePointerDown(e, leg, isPortfolioLeg)}
                      >
                        {/* Connecting guide line from pill to vertical strike line */}
                        <line
                          x1={x}
                          y1={staggerY + pillHeight / 2}
                          x2={pillX + pillWidth / 2}
                          y2={staggerY + pillHeight / 2}
                          stroke={color}
                          strokeWidth="1"
                          strokeOpacity="0.5"
                        />

                        {/* Pill background */}
                        <rect
                          x={pillX}
                          y={staggerY}
                          width={pillWidth}
                          height={pillHeight}
                          rx="4"
                          fill="#0f172a"
                          stroke={color}
                          strokeWidth={isThisDragged ? '2.5' : '1.2'}
                        />

                        {/* Grip dots icon */}
                        <g transform={`translate(${pillX + 5}, ${staggerY + 5})`} fill={color} opacity="0.85">
                          <circle cx="1.5" cy="2" r="1" />
                          <circle cx="1.5" cy="6" r="1" />
                          <circle cx="1.5" cy="10" r="1" />
                          <circle cx="4.5" cy="2" r="1" />
                          <circle cx="4.5" cy="6" r="1" />
                          <circle cx="4.5" cy="10" r="1" />
                        </g>

                        {/* Action + Type badge */}
                        <text
                          x={pillX + 16}
                          y={staggerY + 14}
                          fill={color}
                          fontSize="8.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {isBuy ? '+' : '-'}{leg.contracts}{isCall ? 'C' : 'P'}
                        </text>

                        {/* Strike Value */}
                        <text
                          x={pillX + 44}
                          y={staggerY + 14}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="900"
                          fontFamily="monospace"
                        >
                          ${strikeToUse.toFixed(1)}
                        </text>

                        {/* Drag arrows indicator */}
                        <text
                          x={pillX + pillWidth - 7}
                          y={staggerY + 14}
                          fill={color}
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="end"
                          opacity="0.85"
                        >
                          ↔
                        </text>
                      </g>

                      {/* Step Down (-) and Step Up (+) quick buttons */}
                      <g transform={`translate(${pillX + pillWidth + 3}, ${staggerY})`}>
                        <g
                          className="cursor-pointer hover:brightness-150"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShiftStrikeStep(leg, 'down', isPortfolioLeg);
                          }}
                        >
                          <rect
                            x="0"
                            y="2"
                            width="11"
                            height="18"
                            rx="2"
                            fill="#1e293b"
                            stroke="#334155"
                            strokeWidth="0.8"
                          />
                          <text
                            x="5.5"
                            y="14"
                            fill="#cbd5e1"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            -
                          </text>
                        </g>
                        <g
                          className="cursor-pointer hover:brightness-150"
                          transform="translate(13, 0)"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShiftStrikeStep(leg, 'up', isPortfolioLeg);
                          }}
                        >
                          <rect
                            x="0"
                            y="2"
                            width="11"
                            height="18"
                            rx="2"
                            fill="#1e293b"
                            stroke="#334155"
                            strokeWidth="0.8"
                          />
                          <text
                            x="5.5"
                            y="14"
                            fill="#cbd5e1"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            +
                          </text>
                        </g>
                      </g>

                      {/* Bottom Strike Pointer on X-Axis */}
                      <g
                        className="cursor-grab active:cursor-grabbing hover:brightness-125"
                        onPointerDown={(e) => handleStrikePointerDown(e, leg, isPortfolioLeg)}
                      >
                        <polygon
                          points={`${x - 5},${svgHeight - padding.bottom} ${x + 5},${svgHeight - padding.bottom} ${x},${svgHeight - padding.bottom - 6}`}
                          fill={color}
                        />
                        <rect
                          x={x - 24}
                          y={svgHeight - padding.bottom + 2}
                          width="48"
                          height="15"
                          rx="2"
                          fill="#0f172a"
                          stroke={color}
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={svgHeight - padding.bottom + 13}
                          fill="#ffffff"
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          ${strikeToUse.toFixed(1)}
                        </text>
                      </g>
                    </g>
                  );
                })}

              {/* Interactive Hover Inspection Crosshair with Direct P/L Badges & Callout Tooltip */}
              {hoveredPoint && (() => {
                const hX = scaleX(hoveredPoint.price);
                const expY = scaleY(hoveredPoint.pnlExpiration);
                const t0Y = scaleY(hoveredPoint.pnlT0);
                const pctFromSpot = ((hoveredPoint.price - currentPrice) / currentPrice) * 100;
                const isExpProfitable = hoveredPoint.pnlExpiration >= 0;
                const isT0Profitable = hoveredPoint.pnlT0 >= 0;

                // Tooltip placement: left or right of crosshair based on position
                const tooltipWidth = 196;
                const tooltipHeight = 114;
                const showOnLeft = hX > svgWidth - padding.right - tooltipWidth - 20;
                const cardX = showOnLeft ? hX - tooltipWidth - 14 : hX + 14;
                const targetY = hoverCoords ? hoverCoords.svgY : (expY + t0Y) / 2;
                const cardY = Math.max(
                  padding.top + 4,
                  Math.min(svgHeight - padding.bottom - tooltipHeight - 4, targetY - tooltipHeight / 2)
                );

                // Badge offsets for Exp and T0 to avoid collision if they are close
                const isVerticallyClose = Math.abs(expY - t0Y) < 24;
                const expBadgeY = isVerticallyClose && expY > t0Y ? expY + 6 : expY - 14;
                const t0BadgeY = isVerticallyClose && expY > t0Y ? t0Y - 18 : t0Y + 6;
                const badgeX = hX > svgWidth - 120 ? hX - 86 : hX + 10;

                return (
                  <g key="hover-inspection-group" pointerEvents="none" className="select-none">
                    {/* Horizontal Guides to Y-Axis */}
                    <line
                      x1={padding.left}
                      y1={expY}
                      x2={hX}
                      y2={expY}
                      stroke="#43a047"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.6"
                    />
                    <line
                      x1={padding.left}
                      y1={t0Y}
                      x2={hX}
                      y2={t0Y}
                      stroke="#00d2ff"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.6"
                    />

                    {/* Y-Axis Highlight Badges */}
                    <g transform={`translate(${padding.left - 48}, ${expY - 8})`}>
                      <rect width="44" height="16" rx="2" fill="#0f291e" stroke="#43a047" strokeWidth="1" />
                      <text x="22" y="11" fill={isExpProfitable ? '#4ade80' : '#f87171'} fontSize="8" fontWeight="bold" textAnchor="middle">
                        {isExpProfitable ? '+' : ''}${Math.round(hoveredPoint.pnlExpiration)}
                      </text>
                    </g>
                    <g transform={`translate(${padding.left - 48}, ${t0Y - 8})`}>
                      <rect width="44" height="16" rx="2" fill="#0c2538" stroke="#00d2ff" strokeWidth="1" />
                      <text x="22" y="11" fill={isT0Profitable ? '#38bdf8' : '#f87171'} fontSize="8" fontWeight="bold" textAnchor="middle">
                        {isT0Profitable ? '+' : ''}${Math.round(hoveredPoint.pnlT0)}
                      </text>
                    </g>

                    {/* Vertical Crosshair Line */}
                    <line
                      x1={hX}
                      y1={padding.top}
                      x2={hX}
                      y2={svgHeight - padding.bottom}
                      stroke="#ff9900"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />

                    {/* Target Spot Price Top Tag */}
                    <g transform={`translate(${Math.max(padding.left, Math.min(svgWidth - padding.right - 90, hX - 45))}, ${padding.top - 20})`}>
                      <rect width="90" height="18" rx="3" fill="#181409" stroke="#ff9900" strokeWidth="1.2" />
                      <text x="45" y="12" fill="#ff9900" fontSize="8.5" fontWeight="900" textAnchor="middle">
                        ${hoveredPoint.price.toFixed(2)} ({pctFromSpot >= 0 ? '+' : ''}{pctFromSpot.toFixed(1)}%)
                      </text>
                    </g>

                    {/* Expiration Point: Pulse Halo & Glowing Circle */}
                    <circle cx={hX} cy={expY} r="7" fill="#43a047" opacity="0.3" />
                    <circle cx={hX} cy={expY} r="4.5" fill={isExpProfitable ? '#43a047' : '#ef4444'} stroke="#fff" strokeWidth="2" />

                    {/* Direct Expiration P/L Curve Tag */}
                    <g transform={`translate(${badgeX}, ${expBadgeY})`}>
                      <rect width="80" height="18" rx="3" fill="#0a1a12" stroke="#43a047" strokeWidth="1.2" opacity="0.95" />
                      <text x="6" y="8" fill="#86efac" fontSize="6.5" fontWeight="bold">EXP P&L</text>
                      <text x="6" y="15" fill={isExpProfitable ? '#4ade80' : '#f87171'} fontSize="9" fontWeight="900">
                        {isExpProfitable ? '+' : ''}${hoveredPoint.pnlExpiration.toFixed(1)}
                      </text>
                    </g>

                    {/* Today Point: Pulse Halo & Glowing Circle */}
                    <circle cx={hX} cy={t0Y} r="7" fill="#00d2ff" opacity="0.3" />
                    <circle cx={hX} cy={t0Y} r="4.5" fill={isT0Profitable ? '#00d2ff' : '#ef4444'} stroke="#fff" strokeWidth="2" />

                    {/* Direct Today (T+0) P/L Curve Tag */}
                    <g transform={`translate(${badgeX}, ${t0BadgeY})`}>
                      <rect width="80" height="18" rx="3" fill="#051928" stroke="#00d2ff" strokeWidth="1.2" opacity="0.95" />
                      <text x="6" y="8" fill="#7dd3fc" fontSize="6.5" fontWeight="bold">TODAY P&L</text>
                      <text x="6" y="15" fill={isT0Profitable ? '#38bdf8' : '#f87171'} fontSize="9" fontWeight="900">
                        {isT0Profitable ? '+' : ''}${hoveredPoint.pnlT0.toFixed(1)}
                      </text>
                    </g>

                    {/* PRIMARY HOVER P/L TOOLTIP CARD AT CURSOR POSITION */}
                    <g transform={`translate(${cardX}, ${cardY})`}>
                      {/* Connecting line to crosshair */}
                      <line
                        x1={showOnLeft ? tooltipWidth : 0}
                        y1={tooltipHeight / 2}
                        x2={showOnLeft ? tooltipWidth + 14 : -14}
                        y2={targetY - cardY}
                        stroke="#ff9900"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        opacity="0.75"
                      />

                      {/* Card Background */}
                      <rect
                        width={tooltipWidth}
                        height={tooltipHeight}
                        rx="6"
                        fill="#0b0f17"
                        stroke="#ff9900"
                        strokeWidth="1.5"
                        opacity="0.97"
                        filter="drop-shadow(0px 6px 14px rgba(0,0,0,0.85))"
                      />

                      {/* Header: Spot Target */}
                      <rect x="0" y="0" width={tooltipWidth} height="24" rx="6" fill="#171d28" />
                      <text x="10" y="16" fill="#ffd600" fontSize="10" fontWeight="900">
                        TARGET: ${hoveredPoint.price.toFixed(2)}
                      </text>
                      <text x={tooltipWidth - 10} y="16" fill="#94a3b8" fontSize="9.5" fontWeight="bold" textAnchor="end">
                        {pctFromSpot >= 0 ? '+' : ''}{pctFromSpot.toFixed(2)}%
                      </text>

                      {/* Row 1: Expiration P/L (Prominent) */}
                      <g transform="translate(10, 32)">
                        <rect x="0" y="0" width="10" height="10" rx="2" fill="#43a047" />
                        <text x="16" y="9" fill="#94a3b8" fontSize="8.5" fontWeight="bold">EXPIRATION P&L:</text>
                        <text
                          x={tooltipWidth - 20}
                          y="10"
                          fill={isExpProfitable ? '#00e676' : '#ff5252'}
                          fontSize="11"
                          fontWeight="900"
                          textAnchor="end"
                        >
                          {isExpProfitable ? '+' : ''}${hoveredPoint.pnlExpiration.toFixed(2)}
                        </text>
                      </g>

                      {/* Row 2: Today P/L (Prominent) */}
                      <g transform="translate(10, 52)">
                        <rect x="0" y="0" width="10" height="10" rx="2" fill="#00d2ff" />
                        <text x="16" y="9" fill="#94a3b8" fontSize="8.5" fontWeight="bold">TODAY (T+0) P&L:</text>
                        <text
                          x={tooltipWidth - 20}
                          y="10"
                          fill={isT0Profitable ? '#00e5ff' : '#ff5252'}
                          fontSize="11"
                          fontWeight="900"
                          textAnchor="end"
                        >
                          {isT0Profitable ? '+' : ''}${hoveredPoint.pnlT0.toFixed(2)}
                        </text>
                      </g>

                      <line x1="8" y1="70" x2={tooltipWidth - 8} y2="70" stroke="#1f2937" strokeWidth="1" />

                      {/* Row 3: Greeks at this price */}
                      <g transform="translate(10, 83)">
                        <text x="0" y="0" fill="#94a3b8" fontSize="8.5">
                          Δ: <tspan fill="#ffffff" fontWeight="bold">{hoveredPoint.delta.toFixed(2)}</tspan>
                        </text>
                        <text x="44" y="0" fill="#94a3b8" fontSize="8.5">
                          Γ: <tspan fill="#ffffff" fontWeight="bold">{hoveredPoint.gamma.toFixed(3)}</tspan>
                        </text>
                        <text x="92" y="0" fill="#94a3b8" fontSize="8.5">
                          Θ: <tspan fill="#ffffff" fontWeight="bold">${hoveredPoint.theta.toFixed(1)}</tspan>
                        </text>
                        <text x="140" y="0" fill="#94a3b8" fontSize="8.5">
                          V: <tspan fill="#ffffff" fontWeight="bold">${hoveredPoint.vega.toFixed(1)}</tspan>
                        </text>
                      </g>

                      {/* Row 4: Margin or Skew note if available */}
                      {hoveredMarginInfo ? (
                        <g transform="translate(10, 100)">
                          <text x="0" y="0" fill="#ff9900" fontSize="8" fontWeight="bold">
                            MARGIN REQ: ${Math.round(hoveredMarginInfo.marginBp).toLocaleString()}
                          </text>
                          <text x={tooltipWidth - 20} y="0" fill="#cbd5e1" fontSize="7.5" textAnchor="end">
                            (Δ {hoveredMarginInfo.deltaFromBase >= 0 ? '+' : ''}${Math.round(hoveredMarginInfo.deltaFromBase)})
                          </text>
                        </g>
                      ) : (
                        <g transform="translate(10, 100)">
                          <text x="0" y="0" fill="#64748b" fontSize="7.5">
                            Crosshair Lock · Instant Theo Mark Payoff
                          </text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Floating Hover Inspector HUD */}
          {hoveredPoint && (
            <div className="absolute top-14 right-6 bg-[#1a1e22]/95 border border-[var(--accent)] p-2.5 rounded shadow-xl pointer-events-none text-[11px] flex flex-col gap-1 min-w-[210px]">
              <div className="flex justify-between border-b border-[#3c3c3c] pb-1 font-bold">
                <span className="text-[var(--accent)]">TARGET SPOT:</span>
                <span className="text-white">
                  ${hoveredPoint.price.toFixed(2)} (
                  {(((hoveredPoint.price - currentPrice) / currentPrice) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--bull)]">P&L At Expiration:</span>
                <span className={`font-bold ${hoveredPoint.pnlExpiration >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                  {hoveredPoint.pnlExpiration >= 0 ? '+' : ''}${hoveredPoint.pnlExpiration.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#00d2ff]">P&L Today:</span>
                <span className={`font-bold ${hoveredPoint.pnlT0 >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                  {hoveredPoint.pnlT0 >= 0 ? '+' : ''}${hoveredPoint.pnlT0.toFixed(2)}
                </span>
              </div>

              {/* Skew Alpha Breakdown */}
              {isSkewModelEnabled && unskewedPayoffPoints && (
                <div className="border-t border-[#3c3c3c] pt-1 flex flex-col gap-0.5 text-[9px]">
                  {(() => {
                    const closestUnskewed =
                      unskewedPayoffPoints.find((u) => Math.abs(u.price - hoveredPoint.price) < 0.5) ||
                      unskewedPayoffPoints[0];
                    const diffT0 = closestUnskewed ? hoveredPoint.pnlT0 - closestUnskewed.pnlT0 : 0;
                    return (
                      <>
                        <div className="flex justify-between text-[#8c8c8c]">
                          <span>Flat-Vol Base (T+0):</span>
                          <span className="text-[#f59e0b] font-mono font-bold">
                            {closestUnskewed ? `${closestUnskewed.pnlT0 >= 0 ? '+' : ''}$${closestUnskewed.pnlT0.toFixed(2)}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#c084fc] font-bold">Skew Alpha (Δ):</span>
                          <span className={`font-mono font-bold ${diffT0 >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                            {diffT0 >= 0 ? '+' : ''}${diffT0.toFixed(2)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Hovered Spot Margin Requirement Metric */}
              {hoveredMarginInfo && (
                <div className="border-t border-[#3c3c3c] pt-1 flex flex-col gap-0.5 text-[9.5px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ff9900] font-bold flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-[#ff9900]" />
                      <span>MARGIN REQ:</span>
                    </span>
                    <span className="text-[#ff9900] font-mono font-black">
                      (${hoveredMarginInfo.marginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                  <div className="flex justify-between text-[8.5px]">
                    <span className="text-[#8c8c8c]">Margin Δ vs Spot:</span>
                    <span className={`font-mono font-bold ${hoveredMarginInfo.deltaFromBase > 0 ? 'text-[#ff9900]' : hoveredMarginInfo.deltaFromBase < 0 ? 'text-[#00e676]' : 'text-white'}`}>
                      {hoveredMarginInfo.deltaFromBase >= 0 ? '+' : ''}${hoveredMarginInfo.deltaFromBase.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1 border-t border-[#3c3c3c] pt-1 text-[9px] text-[#8c8c8c]">
                <div>Δ: <strong className="text-white">{hoveredPoint.delta.toFixed(2)}</strong></div>
                <div>Γ: <strong className="text-white">{hoveredPoint.gamma.toFixed(3)}</strong></div>
                <div>Θ: <strong className="text-white">${hoveredPoint.theta.toFixed(2)}</strong></div>
                <div>V: <strong className="text-white">${hoveredPoint.vega.toFixed(2)}</strong></div>
              </div>
            </div>
          )}

          {/* Bigger Picture Executive Strategy & Capital Profile Strip */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[10px]">
            <div className="bg-[#121417] border border-[#2d3339] p-2 rounded flex flex-col justify-between">
              <span className="text-[#8c8c8c] text-[9px]">RETURN ON RISK (RoR)</span>
              <span className="text-[var(--accent)] font-extrabold text-xs">
                {typeof analysis.maxProfit === 'number' && typeof analysis.maxLoss === 'number' && analysis.maxLoss > 0
                  ? `${((analysis.maxProfit / analysis.maxLoss) * 100).toFixed(1)}%`
                  : 'Open-Ended'}
              </span>
            </div>

            <div className="bg-[#121417] border border-[#2d3339] p-2 rounded flex flex-col justify-between">
              <span className="text-[#8c8c8c] text-[9px]">BREAKEVEN CORRIDOR</span>
              <span className="text-white font-bold text-xs truncate">
                {analysis.breakEvens.length >= 2
                  ? `$${analysis.breakEvens[0].toFixed(2)} - $${analysis.breakEvens[analysis.breakEvens.length - 1].toFixed(2)}`
                  : analysis.breakEvens.length === 1
                  ? `$${analysis.breakEvens[0].toFixed(2)}`
                  : 'N/A'}
              </span>
            </div>

            <div className="bg-[#121417] border border-[#2d3339] p-2 rounded flex flex-col justify-between">
              <span className="text-[#8c8c8c] text-[9px]">DOWNSIDE BUFFER</span>
              <span className="text-[#00d2ff] font-bold text-xs">
                {analysis.breakEvens.length > 0 && analysis.breakEvens[0] < currentPrice
                  ? `-${(((currentPrice - analysis.breakEvens[0]) / currentPrice) * 100).toFixed(1)}% cushion`
                  : 'At Market'}
              </span>
            </div>

            <div className="bg-[#121417] border border-[#2d3339] p-2 rounded flex flex-col justify-between">
              <span className="text-[#8c8c8c] text-[9px]">PROBABILITY OF PROFIT</span>
              <span className="text-[var(--bull)] font-extrabold text-xs">
                {analysis.probOfProfit}% POP
              </span>
            </div>

            <div className="bg-[#121417] border border-[#2d3339] p-2 rounded flex flex-col justify-between">
              <span className="text-[#8c8c8c] text-[9px]">DAILY THETA CASH FLOW</span>
              <span className={`font-bold text-xs ${analysis.totalTheta >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                {analysis.totalTheta >= 0 ? '+' : ''}${analysis.totalTheta.toFixed(2)} / day
              </span>
            </div>

            <div className="bg-[#121417] border border-[#2d3339] p-2 rounded flex flex-col justify-between">
              <span className="text-[#8c8c8c] text-[9px]">1-SIGMA CONFIDENCE (68.2%)</span>
              <span className="text-[#ffd600] font-bold text-xs truncate">
                ${lower1Sigma.toFixed(1)} - ${upper1Sigma.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            4. INTERACTIVE "WHAT-IF" SIMULATION CONTROLS DECK
        ======================================================== */}
        <div className="bg-[#181a1d] border-b border-[var(--border)] p-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
          {/* Slider 1: Days to Expiration Decay */}
          <div className="flex flex-col gap-1.5 bg-[#121417] p-2.5 rounded border border-[#2d3339]">
            <div className="flex justify-between items-center">
              <span className="text-[#8c8c8c] font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>TIME DECAY (DAYS PASSED):</span>
              </span>
              <span className="text-[var(--accent)] font-extrabold">+{timeElapsedDays} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(1, maxDte)}
              value={timeElapsedDays}
              onChange={(e) => setTimeElapsedDays(parseInt(e.target.value, 10))}
              className="accent-[var(--accent)] w-full cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#8c8c8c]">
              <button onClick={() => setTimeElapsedDays(0)} className="hover:text-white">Today (T+0)</button>
              <button onClick={() => setTimeElapsedDays(Math.min(maxDte, 7))} className="hover:text-white">+7d</button>
              <button onClick={() => setTimeElapsedDays(Math.min(maxDte, 14))} className="hover:text-white">+14d</button>
              <button onClick={() => setTimeElapsedDays(Math.min(maxDte, 30))} className="hover:text-white">+30d</button>
              <button onClick={() => setTimeElapsedDays(maxDte)} className="hover:text-white">Expiry (T)</button>
            </div>
          </div>

          {/* Slider 2: Implied Volatility Shock */}
          <div className="flex flex-col gap-1.5 bg-[#121417] p-2.5 rounded border border-[#2d3339]">
            <div className="flex justify-between items-center">
              <span className="text-[#8c8c8c] font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#00d2ff]" />
                <span>IMPLIED VOL SHIFT (IV CRUSH / SPIKE):</span>
              </span>
              <span className={`font-extrabold ${ivShiftPercent >= 0 ? 'text-[#00d2ff]' : 'text-[var(--bear)]'}`}>
                {ivShiftPercent >= 0 ? '+' : ''}{ivShiftPercent}% IV
              </span>
            </div>
            <input
              type="range"
              min="-25"
              max="25"
              value={ivShiftPercent}
              onChange={(e) => setIvShiftPercent(parseInt(e.target.value, 10))}
              className="accent-[#00d2ff] w-full cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#8c8c8c]">
              <button onClick={() => setIvShiftPercent(-15)} className="hover:text-white">-15% (Earnings Crush)</button>
              <button onClick={() => setIvShiftPercent(0)} className="hover:text-white">0% (Unchanged)</button>
              <button onClick={() => setIvShiftPercent(15)} className="hover:text-white">+15% (Vol Spike)</button>
            </div>
          </div>

          {/* Stepper 3: Underlying Spot Step Buttons */}
          <div className="flex flex-col gap-1.5 bg-[#121417] p-2.5 rounded border border-[#2d3339]">
            <div className="flex justify-between items-center">
              <span className="text-[#8c8c8c] font-bold flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-[var(--bull)]" />
                <span>SPOT PRICE STEP SIMULATOR:</span>
              </span>
              <span className="text-white font-extrabold">
                ${(currentPrice * (1 + priceShockPct / 100)).toFixed(2)} ({priceShockPct >= 0 ? '+' : ''}{priceShockPct}%)
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[-10, -5, 0, 5, 10].map((step) => (
                <button
                  key={step}
                  onClick={() => {
                    playKeyClick();
                    setPriceShockPct(step);
                  }}
                  className={`tos-btn py-1 text-[9px] ${
                    priceShockPct === step ? 'bg-[#ff9900] text-black font-extrabold' : ''
                  }`}
                >
                  {step === 0 ? 'SPOT' : `${step >= 0 ? '+' : ''}${step}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            4B. VOLATILITY SKEW ENGINE (CALENDARS & DOUBLE DIAGONALS)
        ======================================================== */}
        <div className="bg-[#121519] border-b border-[var(--border)] p-3 flex flex-col gap-2.5">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242b33] pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-[#c084fc] flex items-center gap-1.5 text-xs">
                <Sliders className="w-4 h-4 text-[#a855f7]" />
                <span>VOLATILITY SKEW ENGINE (CALENDAR &amp; DOUBLE DIAGONAL PROFILES)</span>
              </span>

              {/* Strategy Detection Badges */}
              {calendarDiagonalDetails?.isDoubleDiagonal ? (
                <span className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/50 font-black text-[9px] flex items-center gap-1 animate-pulse">
                  <span>★</span>
                  <span>DOUBLE DIAGONAL DETECTED: 4 LEGS / 2 EXPIRATIONS / ASYMMETRIC WINGS</span>
                </span>
              ) : calendarDiagonalDetails?.isDoubleCalendar ? (
                <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/50 font-black text-[9px] flex items-center gap-1">
                  <span>★</span>
                  <span>DOUBLE CALENDAR DETECTED: 4 LEGS / 2 EXPIRATIONS</span>
                </span>
              ) : calendarDiagonalDetails?.isCalendar ? (
                <span className="px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-500/50 font-black text-[9px] flex items-center gap-1">
                  <span>★</span>
                  <span>TIME CALENDAR SPREAD: HORIZONTAL SKEW ACTIVE</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-[#1e2228] text-[#8c8c8c] border border-[#333d48] font-bold text-[9px]">
                  MULTI-EXP VOLATILITY SURFACE CALIBRATOR
                </span>
              )}

              <span className="text-[10px] text-[#8c8c8c] hidden xl:inline">
                Model term structure contango/backwardation &amp; smile skew across strikes
              </span>
            </div>

            {/* Actions & Toggles */}
            <div className="flex items-center gap-2">
              {/* Master Skew Model Toggle */}
              <button
                onClick={() => {
                  playKeyClick();
                  setIsSkewModelEnabled(!isSkewModelEnabled);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-extrabold border transition-all flex items-center gap-1.5 ${
                  isSkewModelEnabled
                    ? 'bg-[#10b981]/20 text-[#34d399] border-[#10b981]/50 shadow-sm'
                    : 'bg-[#222830] text-[#8c8c8c] border-[#333d48] hover:text-white'
                }`}
                title="Toggle Skew Modeling on payoff curves"
              >
                <Zap className={`w-3 h-3 ${isSkewModelEnabled ? 'text-[#34d399]' : 'text-[#8c8c8c]'}`} />
                <span>{isSkewModelEnabled ? 'SKEW MODEL: ACTIVE' : 'SKEW MODEL: DISABLED (FLAT BSM)'}</span>
              </button>

              {/* Reset to Contango Button */}
              <button
                onClick={() => {
                  playKeyClick();
                  setSelectedSkewPresetKey('normalContango');
                  setSkewModel({ ...SKEW_MODEL_PRESETS.normalContango.config });
                  setIsSkewModelEnabled(true);
                }}
                className="tos-btn py-1 px-2 text-[9.5px] flex items-center gap-1 text-[#8c8c8c] hover:text-white"
                title="Reset to default Contango baseline (+3.5% Back IV)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET</span>
              </button>

              {/* Expand / Collapse Button */}
              <button
                onClick={() => {
                  playKeyClick();
                  setIsSkewPanelExpanded(!isSkewPanelExpanded);
                }}
                className="tos-btn py-1 px-2 text-[9.5px] flex items-center gap-1"
                title="Expand or collapse Volatility Skew controls"
              >
                {isSkewPanelExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{isSkewPanelExpanded ? 'COLLAPSE' : 'EXPAND SKEW DECK'}</span>
              </button>
            </div>
          </div>

          {/* Expanded Skew Modeler Controls */}
          {isSkewPanelExpanded && (
            <div className="flex flex-col gap-3">
              {/* Presets Quick Strip */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#0a0c0e] p-1.5 rounded border border-[#222830]">
                <span className="text-[9.5px] font-bold text-[#8c8c8c] flex items-center gap-1 mr-1">
                  <Sparkles className="w-3 h-3 text-[#ff9900]" />
                  <span>SKEW REGIME PRESETS:</span>
                </span>
                {Object.entries(SKEW_MODEL_PRESETS).map(([key, preset]) => {
                  const isSelected = selectedSkewPresetKey === key && isSkewModelEnabled;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        playKeyClick();
                        setSelectedSkewPresetKey(key);
                        setSkewModel({ ...preset.config });
                        setIsSkewModelEnabled(true);
                      }}
                      className={`px-2 py-1 rounded text-[9.5px] font-bold transition-all border ${
                        isSelected
                          ? 'bg-[#a855f7] text-white border-[#c084fc] shadow-sm font-extrabold'
                          : 'bg-[#161a1f] text-[#aaa] border-[#2a3038] hover:bg-[#20262e] hover:text-white'
                      }`}
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>

              {/* 6 Parameter Sliders & Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px]">
                {/* 1. Term Structure Skew */}
                <div className="bg-[#16191e] border border-[#2b333c] p-2.5 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>TERM SKEW (FRONT VS BACK):</span>
                    </span>
                    <span
                      className={`font-mono font-extrabold px-1.5 py-0.2 rounded text-[10.5px] ${
                        skewModel.calendarTermSkew > 0
                          ? 'bg-sky-950/60 text-sky-400 border border-sky-600/40'
                          : skewModel.calendarTermSkew < 0
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-600/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {skewModel.calendarTermSkew > 0 ? '+' : ''}{(skewModel.calendarTermSkew * 100).toFixed(1)}%{' '}
                      {skewModel.calendarTermSkew > 0 ? 'Contango' : skewModel.calendarTermSkew < 0 ? 'Inversion' : 'Flat'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-35"
                    max="35"
                    step="0.5"
                    value={Math.round(skewModel.calendarTermSkew * 1000) / 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) / 100;
                      setSkewModel((prev) => ({ ...prev, calendarTermSkew: val }));
                      setSelectedSkewPresetKey('custom');
                    }}
                    className="accent-[#38bdf8] w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] text-[#8c8c8c]">
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, calendarTermSkew: -0.18 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-18% Invert</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, calendarTermSkew: -0.05 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-5% Backw</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, calendarTermSkew: 0 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">0% Flat</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, calendarTermSkew: 0.035 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">+3.5% Norm</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, calendarTermSkew: 0.08 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">+8% Steep</button>
                  </div>
                  <div className="text-[8.5px] text-[#788596] leading-tight">
                    Horizontal spread: Back-month IV minus front-month IV. Crucial for calendar spread peak tent value.
                  </div>
                </div>

                {/* 2. Strike Skew Slope */}
                <div className="bg-[#16191e] border border-[#2b333c] p-2.5 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-[#c084fc]" />
                      <span>STRIKE SKEW SLOPE (dIV/dM):</span>
                    </span>
                    <span
                      className={`font-mono font-extrabold px-1.5 py-0.2 rounded text-[10.5px] ${
                        skewModel.strikeSkewSlope < 0
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-600/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {(skewModel.strikeSkewSlope * 100).toFixed(1)}% Slope
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="10"
                    step="0.5"
                    value={Math.round(skewModel.strikeSkewSlope * 1000) / 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) / 100;
                      setSkewModel((prev) => ({ ...prev, strikeSkewSlope: val }));
                      setSelectedSkewPresetKey('custom');
                    }}
                    className="accent-[#c084fc] w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] text-[#8c8c8c]">
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, strikeSkewSlope: -0.32 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-32% Crash</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, strikeSkewSlope: -0.20 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-20% DblDiag</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, strikeSkewSlope: -0.16 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-16% Equity</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, strikeSkewSlope: 0 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">0% Flat</button>
                  </div>
                  <div className="text-[8.5px] text-[#788596] leading-tight">
                    Vertical put skew: Negative slope elevates lower-strike put IV vs higher-strike call IV.
                  </div>
                </div>

                {/* 3. Smile Curvature */}
                <div className="bg-[#16191e] border border-[#2b333c] p-2.5 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-[#fbbf24]" />
                      <span>SMILE CURVATURE (CONVEXITY):</span>
                    </span>
                    <span className="font-mono font-extrabold px-1.5 py-0.2 rounded text-[10.5px] bg-amber-950/60 text-amber-400 border border-amber-600/40">
                      +{(skewModel.smileCurvature * 100).toFixed(1)}% Curvature
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="0.5"
                    value={Math.round(skewModel.smileCurvature * 1000) / 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) / 100;
                      setSkewModel((prev) => ({ ...prev, smileCurvature: val }));
                      setSelectedSkewPresetKey('custom');
                    }}
                    className="accent-[#fbbf24] w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] text-[#8c8c8c]">
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, smileCurvature: 0 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">0% Linear</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, smileCurvature: 0.06 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">6% Moderate</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, smileCurvature: 0.10 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">10% Pronounced</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, smileCurvature: 0.18 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">18% Deep</button>
                  </div>
                  <div className="text-[8.5px] text-[#788596] leading-tight">
                    Quadratic smile convexity: Boosts both far wings (OTM puts and OTM calls) for double diagonal outer strikes.
                  </div>
                </div>

                {/* 4. Post-Front Vol Shock */}
                <div className="bg-[#16191e] border border-[#2b333c] p-2.5 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#f43f5e]" />
                      <span>POST-FRONT VOL SHOCK (@ T_FRONT):</span>
                    </span>
                    <span
                      className={`font-mono font-extrabold px-1.5 py-0.2 rounded text-[10.5px] ${
                        skewModel.backMonthVolShock < 0
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-600/40'
                          : skewModel.backMonthVolShock > 0
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-600/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {skewModel.backMonthVolShock > 0 ? '+' : ''}{(skewModel.backMonthVolShock * 100).toFixed(1)}% Vol Shock
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="15"
                    step="0.5"
                    value={Math.round(skewModel.backMonthVolShock * 1000) / 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) / 100;
                      setSkewModel((prev) => ({ ...prev, backMonthVolShock: val }));
                      setSelectedSkewPresetKey('custom');
                    }}
                    className="accent-[#f43f5e] w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] text-[#8c8c8c]">
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, backMonthVolShock: -0.12 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-12% Crush</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, backMonthVolShock: -0.04 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-4% Decay</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, backMonthVolShock: 0 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">0% Unch</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, backMonthVolShock: 0.05 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">+5% Spike</button>
                  </div>
                  <div className="text-[8.5px] text-[#788596] leading-tight">
                    Vol shift applied to back-month options when front month expires. Critical for post-earnings calendar drops.
                  </div>
                </div>

                {/* 5. Double Diagonal Wing Bias */}
                <div className="bg-[#16191e] border border-[#2b333c] p-2.5 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#a855f7]" />
                      <span>DOUBLE DIAGONAL PUT WING BIAS:</span>
                    </span>
                    <span
                      className={`font-mono font-extrabold px-1.5 py-0.2 rounded text-[10.5px] ${
                        (skewModel.doubleDiagonalWingBias || 0) < 0
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-600/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {((skewModel.doubleDiagonalWingBias || 0) * 100).toFixed(1)}% Put Bias
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="10"
                    step="0.5"
                    value={Math.round((skewModel.doubleDiagonalWingBias || 0) * 1000) / 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) / 100;
                      setSkewModel((prev) => ({ ...prev, doubleDiagonalWingBias: val }));
                      setSelectedSkewPresetKey('custom');
                    }}
                    className="accent-[#a855f7] w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] text-[#8c8c8c]">
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, doubleDiagonalWingBias: -0.12 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-12% Heavy</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, doubleDiagonalWingBias: -0.06 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">-6% Moderate</button>
                    <button onClick={() => { setSkewModel((prev) => ({ ...prev, doubleDiagonalWingBias: 0 })); setSelectedSkewPresetKey('custom'); }} className="hover:text-white">0% Symmetric</button>
                  </div>
                  <div className="text-[8.5px] text-[#788596] leading-tight">
                    Asymmetric steepener for the put diagonal wing vs call diagonal wing in 4-leg double diagonals.
                  </div>
                </div>

                {/* 6. Skew Dynamics Model */}
                <div className="bg-[#16191e] border border-[#2b333c] p-2.5 rounded flex flex-col justify-between gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold flex items-center gap-1">
                      <Crosshair className="w-3.5 h-3.5 text-[#34d399]" />
                      <span>SKEW DYNAMICS MODEL:</span>
                    </span>
                    <span className="font-mono font-extrabold text-[10px] text-[#34d399]">
                      {skewModel.skewDynamics === 'stickyStrike' ? 'Sticky Strike' : 'Sticky Moneyness'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        playKeyClick();
                        setSkewModel((prev) => ({ ...prev, skewDynamics: 'stickyMoneyness' }));
                        setSelectedSkewPresetKey('custom');
                      }}
                      className={`px-2 py-1.5 rounded text-[9.5px] font-bold border transition-all text-center ${
                        skewModel.skewDynamics !== 'stickyStrike'
                          ? 'bg-[#10b981]/20 text-[#34d399] border-[#10b981]/60 font-extrabold shadow-sm'
                          : 'bg-[#111] text-[#888] border-[#2a3038] hover:text-white'
                      }`}
                      title="Volatility surface moves with spot price (Floating Delta Skew, Standard for Equities & Index options)"
                    >
                      Sticky Moneyness (Floating)
                    </button>
                    <button
                      onClick={() => {
                        playKeyClick();
                        setSkewModel((prev) => ({ ...prev, skewDynamics: 'stickyStrike' }));
                        setSelectedSkewPresetKey('custom');
                      }}
                      className={`px-2 py-1.5 rounded text-[9.5px] font-bold border transition-all text-center ${
                        skewModel.skewDynamics === 'stickyStrike'
                          ? 'bg-[#10b981]/20 text-[#34d399] border-[#10b981]/60 font-extrabold shadow-sm'
                          : 'bg-[#111] text-[#888] border-[#2a3038] hover:text-white'
                      }`}
                      title="Implied volatility remains fixed per strike price regardless of spot moves (Anchored Strike Skew)"
                    >
                      Sticky Strike (Fixed)
                    </button>
                  </div>
                  <div className="text-[8.5px] text-[#788596] leading-tight">
                    Institutional convention: Floating moneyness dynamically recalculates IV smile as stock moves along x-axis.
                  </div>
                </div>
              </div>

              {/* Live Skew Mathematical Diagnostics Strip */}
              <div className="bg-[#0b0e11] border border-[#202730] p-2.5 rounded grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[10px]">
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8c8c8c]">FRONT ATM BASE IV</span>
                  <span className="font-mono font-bold text-white">{(ticker.currentIV * 100).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8c8c8c]">BACK ATM MODELED IV</span>
                  <span className="font-mono font-bold text-[#38bdf8]">
                    {((ticker.currentIV + skewModel.calendarTermSkew) * 100).toFixed(1)}%
                    <span className="text-[8.5px] ml-1 opacity-80">
                      ({skewModel.calendarTermSkew >= 0 ? '+' : ''}{(skewModel.calendarTermSkew * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8c8c8c]">PUT WING (-5% OTM) IV</span>
                  <span className="font-mono font-bold text-[#c084fc]">
                    {((ticker.currentIV + (skewModel.strikeSkewSlope + (skewModel.doubleDiagonalWingBias || 0)) * -0.05 + skewModel.smileCurvature * 0.0025) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8c8c8c]">CALL WING (+5% OTM) IV</span>
                  <span className="font-mono font-bold text-[#fbbf24]">
                    {((ticker.currentIV + skewModel.strikeSkewSlope * 0.05 + skewModel.smileCurvature * 0.0025) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8c8c8c]">POST-FRONT VOL SHOCK</span>
                  <span className={`font-mono font-bold ${skewModel.backMonthVolShock <= 0 ? 'text-[#f87171]' : 'text-[#34d399]'}`}>
                    {skewModel.backMonthVolShock >= 0 ? '+' : ''}{(skewModel.backMonthVolShock * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-[#8c8c8c]">SKEW ALPHA AT SPOT</span>
                  <span className="font-mono font-bold text-[#34d399]">
                    {(() => {
                      if (!unskewedPayoffPoints || !payoffPoints.length) return '—';
                      const spotPt = payoffPoints.find((p) => Math.abs(p.price - currentPrice) < 1.0) || payoffPoints[0];
                      const unskewedPt = unskewedPayoffPoints.find((p) => Math.abs(p.price - currentPrice) < 1.0) || unskewedPayoffPoints[0];
                      const diff = spotPt && unskewedPt ? spotPt.pnlT0 - unskewedPt.pnlT0 : 0;
                      return `${diff >= 0 ? '+' : ''}$${diff.toFixed(2)}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            4C. PORTFOLIO MARGIN REQUIREMENTS & MARKET CONDITIONS STRESS ENGINE
        ======================================================== */}
        <div className="bg-[#101317] border-b border-[var(--border)] p-3 flex flex-col gap-3">
          {/* Top Control & Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222830] pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-[#ff9900] flex items-center gap-1.5 text-xs">
                <Shield className="w-4 h-4 text-[#ff9900]" />
                <span>PORTFOLIO MARGIN &amp; MARKET CONDITIONS ENGINE</span>
              </span>

              {/* Live Margin Health Status Pill */}
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-black border flex items-center gap-1 ${
                  portfolioMarginStress.marginCallRiskStatus === 'SAFE'
                    ? 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40'
                    : portfolioMarginStress.marginCallRiskStatus === 'CAUTION'
                    ? 'bg-[#ffd600]/15 text-[#ffd600] border-[#ffd600]/40'
                    : portfolioMarginStress.marginCallRiskStatus === 'CRITICAL_WARNING'
                    ? 'bg-[#ff9900]/15 text-[#ff9900] border-[#ff9900]/40'
                    : 'bg-[#ff334b]/20 text-[#ff334b] border-[#ff334b]/50 animate-pulse'
                }`}
              >
                {portfolioMarginStress.marginCallRiskStatus === 'SAFE' && <CheckCircle className="w-3 h-3" />}
                {portfolioMarginStress.marginCallRiskStatus === 'CAUTION' && <AlertTriangle className="w-3 h-3" />}
                {portfolioMarginStress.marginCallRiskStatus === 'CRITICAL_WARNING' && <AlertTriangle className="w-3 h-3" />}
                {portfolioMarginStress.marginCallRiskStatus === 'MARGIN_CALL' && <AlertTriangle className="w-3 h-3" />}
                <span>
                  {portfolioMarginStress.marginCallRiskStatus === 'SAFE' && 'MARGIN HEALTHY (BUFFER > 30%)'}
                  {portfolioMarginStress.marginCallRiskStatus === 'CAUTION' && 'MARGIN CAUTION (BUFFER 15-30%)'}
                  {portfolioMarginStress.marginCallRiskStatus === 'CRITICAL_WARNING' && 'CRITICAL WARNING (< 15% BUFFER)'}
                  {portfolioMarginStress.marginCallRiskStatus === 'MARGIN_CALL' && 'DEFICIT: MARGIN CALL TRIGGERED!'}
                </span>
              </span>

              {/* Capital Relief Badge if Portfolio Margin active */}
              {portfolioMarginStress.capitalReliefVsRegT !== undefined && portfolioMarginStress.capitalReliefVsRegT > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/40 text-[8.5px] font-bold">
                  ⚡ {portfolioMarginStress.capitalReliefVsRegT}% Capital Relief vs Reg-T
                </span>
              )}
            </div>

            {/* Scope & Model Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Scope Switcher */}
              <div className="flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#2a3038] text-[9.5px]">
                <button
                  onClick={() => {
                    playKeyClick();
                    setMarginScope('PORTFOLIO_ALL');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    marginScope === 'PORTFOLIO_ALL'
                      ? 'bg-white text-black font-extrabold'
                      : 'text-[#8c8c8c] hover:text-white'
                  }`}
                  title="Analyze margin requirement across ALL portfolio positions"
                >
                  FULL PORTFOLIO ({portfolioPositions.length})
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setMarginScope('PORTFOLIO_CURRENT');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    marginScope === 'PORTFOLIO_CURRENT'
                      ? 'bg-[var(--accent)] text-black font-extrabold'
                      : 'text-[#8c8c8c] hover:text-white'
                  }`}
                  title={`Analyze margin requirement for ${ticker.symbol} holdings`}
                >
                  {ticker.symbol} ONLY
                </button>
                {activeLegs.length > 0 && (
                  <button
                    onClick={() => {
                      playKeyClick();
                      setMarginScope('ACTIVE_TRADES');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      marginScope === 'ACTIVE_TRADES'
                        ? 'bg-[#00d2ff] text-black font-extrabold'
                        : 'text-[#8c8c8c] hover:text-white'
                    }`}
                    title="Analyze active simulated builder legs collateral"
                  >
                    BUILDER LEGS
                  </button>
                )}
              </div>

              {/* Margining Model Selector */}
              <div className="flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#2a3038] text-[9.5px]">
                <button
                  onClick={() => {
                    playKeyClick();
                    setMarginingModel('REG_T');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    marginingModel === 'REG_T'
                      ? 'bg-[#ff9900] text-black font-extrabold'
                      : 'text-[#8c8c8c] hover:text-white'
                  }`}
                  title="Standard FINRA Rule 4210 / US Reg-T margin rules"
                >
                  FINRA REG-T
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setMarginingModel('PORTFOLIO_MARGIN');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    marginingModel === 'PORTFOLIO_MARGIN'
                      ? 'bg-[#38bdf8] text-black font-extrabold'
                      : 'text-[#8c8c8c] hover:text-white'
                  }`}
                  title="Institutional OCC TIMS 10-point theoretical stress grid"
                >
                  PORTFOLIO MARGIN (PM)
                </button>
              </div>

              {/* Toggle 2D Stress Matrix */}
              <button
                onClick={() => {
                  playKeyClick();
                  setIsStressMatrixOpen(!isStressMatrixOpen);
                }}
                className={`px-2 py-1 rounded text-[9.5px] font-bold border flex items-center gap-1 transition-all ${
                  isStressMatrixOpen
                    ? 'bg-[#ff9900] text-black border-[#ff9900]'
                    : 'bg-[#181c22] text-[#ff9900] border-[#ff9900]/40 hover:bg-[#ff9900]/10'
                }`}
                title="Toggle 2D Price Shock × Volatility Shock Heatmap Matrix"
              >
                <span>2D STRESS MATRIX</span>
                {isStressMatrixOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {onNavigateToMacro && (
                <button
                  onClick={() => {
                    playKeyClick();
                    onNavigateToMacro();
                  }}
                  className="px-2 py-1 rounded text-[9.5px] font-bold border border-[#00e676]/40 bg-[#181c22] text-[#00e676] hover:bg-[#00e676]/15 hover:border-[#00e676] flex items-center gap-1 transition-all"
                  title="Open Institutional Global Macroeconomic Indicators & Central Bank Terminal"
                >
                  <Globe className="w-3 h-3 text-[#00e676]" />
                  <span>GLOBAL MACRO &gt;</span>
                </button>
              )}

              <button
                onClick={() => {
                  playKeyClick();
                  setIsMarginEngineExpanded(!isMarginEngineExpanded);
                }}
                className="text-[#8c8c8c] hover:text-white p-1"
                title="Collapse or expand margin engine"
              >
                {isMarginEngineExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {isMarginEngineExpanded && (
            <>
              {/* Quick Market Condition Presets Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8c8c8c] font-bold flex items-center gap-1">
                    <Activity className="w-3 h-3 text-[#38bdf8]" />
                    <span>MARKET CONDITION SCENARIOS (ONE-CLICK STRESS TEST):</span>
                  </span>
                  {(priceShockPct !== 0 || ivShiftPercent !== 0 || timeElapsedDays !== 0) && (
                    <button
                      onClick={() => {
                        playKeyClick();
                        setActiveMarketPresetId('baseline');
                        setPriceShockPct(0);
                        setIvShiftPercent(0);
                        setTimeElapsedDays(0);
                      }}
                      className="text-[9px] text-[#ff9900] hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>RESET TO BASELINE (0% / 0% IV)</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {MARKET_CONDITION_PRESETS.map((preset) => {
                    const isActive = activeMarketPresetId === preset.id;
                    const isAdverse = preset.priceShockPct < 0 || preset.ivShiftPct > 20;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          playKeyClick();
                          setActiveMarketPresetId(preset.id);
                          setPriceShockPct(preset.priceShockPct);
                          setIvShiftPercent(preset.ivShiftPct);
                          setTimeElapsedDays(preset.daysElapsed);
                        }}
                        className={`px-2 py-1 rounded text-[9.5px] font-mono transition-all flex items-center gap-1.5 border ${
                          isActive
                            ? 'bg-[#ff9900]/20 text-[#ff9900] border-[#ff9900] font-black shadow-md'
                            : isAdverse
                            ? 'bg-[#181a1f] text-[#d1d5db] border-[#2e343d] hover:border-[#ff9900]/50 hover:text-white'
                            : 'bg-[#181a1f] text-[#d1d5db] border-[#2e343d] hover:border-[#38bdf8]/50 hover:text-white'
                        }`}
                        title={preset.description}
                      >
                        <span className="font-bold">{preset.label}</span>
                        <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                          isActive ? 'bg-[#ff9900] text-black' : 'bg-[#222730] text-[#9ca3af]'
                        }`}>
                          {preset.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Market Condition Sliders */}
              <div className="bg-[#14181e] p-2.5 rounded border border-[#242b35] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                {/* Spot Price Shift Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#8c8c8c] font-bold">UNDERLYING SPOT SHIFT:</span>
                    <span className={`font-black ${priceShockPct > 0 ? 'text-[var(--bull)]' : priceShockPct < 0 ? 'text-[var(--bear)]' : 'text-white'}`}>
                      {priceShockPct >= 0 ? '+' : ''}{priceShockPct}% (${(currentPrice * (1 + priceShockPct / 100)).toFixed(2)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={priceShockPct}
                    onChange={(e) => {
                      setPriceShockPct(Number(e.target.value));
                      setActiveMarketPresetId('custom');
                    }}
                    className="w-full h-1.5 bg-[#262c35] rounded-lg appearance-none cursor-pointer accent-[#ff9900]"
                  />
                  <div className="flex justify-between text-[8px] text-[#6b7280]">
                    <span>-30% (Crash)</span>
                    <span>-15%</span>
                    <span>0% (Spot)</span>
                    <span>+15%</span>
                    <span>+30% (Rally)</span>
                  </div>
                </div>

                {/* IV Shift Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#8c8c8c] font-bold">IMPLIED VOLATILITY (IV) SHOCK:</span>
                    <span className={`font-black ${ivShiftPercent > 0 ? 'text-[#ff9900]' : ivShiftPercent < 0 ? 'text-[#38bdf8]' : 'text-white'}`}>
                      {ivShiftPercent >= 0 ? '+' : ''}{ivShiftPercent}% IV
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    step="5"
                    value={ivShiftPercent}
                    onChange={(e) => {
                      setIvShiftPercent(Number(e.target.value));
                      setActiveMarketPresetId('custom');
                    }}
                    className="w-full h-1.5 bg-[#262c35] rounded-lg appearance-none cursor-pointer accent-[#c084fc]"
                  />
                  <div className="flex justify-between text-[8px] text-[#6b7280]">
                    <span>-50% (Crush)</span>
                    <span>0% (Flat)</span>
                    <span>+35% (Spike)</span>
                    <span>+100% (Shock)</span>
                  </div>
                </div>

                {/* Time Decay (Days Elapsed) Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#8c8c8c] font-bold">TIME ELAPSED (THETA FORWARD):</span>
                    <span className="font-black text-[#00d2ff]">
                      T+{timeElapsedDays} Days ({timeElapsedDays === 0 ? 'Today' : `Forward +${timeElapsedDays}d`})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(30, maxDte)}
                    step="1"
                    value={timeElapsedDays}
                    onChange={(e) => {
                      setTimeElapsedDays(Number(e.target.value));
                      setActiveMarketPresetId('custom');
                    }}
                    className="w-full h-1.5 bg-[#262c35] rounded-lg appearance-none cursor-pointer accent-[#00d2ff]"
                  />
                  <div className="flex justify-between text-[8px] text-[#6b7280]">
                    <span>T+0 (Today)</span>
                    <span>T+7d</span>
                    <span>T+14d</span>
                    <span>T+{Math.max(30, maxDte)}d (Exp)</span>
                  </div>
                </div>
              </div>

              {/* 6-Card Comparison Dashboard (Base vs Stressed Under Market Conditions) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
                {/* 1. Initial Margin BP */}
                <div className="bg-[#161a20] border border-[#2a303a] rounded p-2.5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-[#ff9900] font-bold">INITIAL MARGIN BP</span>
                    {portfolioMarginStress.marginDeltaDollar !== 0 && (
                      <span className={`text-[8px] font-black px-1 rounded ${
                        portfolioMarginStress.marginDeltaDollar > 0
                          ? 'bg-[#ff9900]/20 text-[#ff9900]'
                          : 'bg-[#00e676]/20 text-[#00e676]'
                      }`}>
                        {portfolioMarginStress.marginDeltaDollar >= 0 ? '+' : ''}
                        {portfolioMarginStress.marginDeltaPercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className="text-base font-black text-[#ff9900] mt-1">
                    (${portfolioMarginStress.stressedInitialMarginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                  <div className="text-[8px] text-[#8c8c8c] mt-0.5 flex flex-col">
                    <span>Base: (${portfolioMarginStress.baseInitialMarginBp.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
                    <span className={portfolioMarginStress.marginDeltaDollar > 0 ? 'text-[#ff9900] font-bold' : 'text-[#00e676] font-bold'}>
                      Δ {portfolioMarginStress.marginDeltaDollar >= 0 ? '+' : ''}${portfolioMarginStress.marginDeltaDollar.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* 2. Maintenance Margin Threshold */}
                <div className="bg-[#161a20] border border-[#2a303a] rounded p-2.5 flex flex-col justify-between">
                  <span className="text-[9px] text-[#8c8c8c]">MAINTENANCE MARGIN</span>
                  <span className="text-base font-bold text-white mt-1">
                    ${portfolioMarginStress.stressedMaintenanceMarginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="text-[8px] text-[#8c8c8c] mt-0.5 flex flex-col">
                    <span>Base: ${portfolioMarginStress.baseMaintenanceMarginBp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span>75% FINRA liquidation line</span>
                  </div>
                </div>

                {/* 3. Net Liquidation & Stressed P&L */}
                <div className="bg-[#161a20] border border-[#2a303a] rounded p-2.5 flex flex-col justify-between">
                  <span className="text-[9px] text-[#38bdf8] font-bold">STRESSED NET LIQUIDITY</span>
                  <span className="text-base font-black text-white mt-1">
                    ${portfolioMarginStress.stressedNetLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="text-[8px] mt-0.5 flex flex-col">
                    <span className="text-[#8c8c8c]">Base: ${portfolioMarginStress.baseNetLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span className={`font-bold ${portfolioMarginStress.unrealizedStressPnL >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                      Mark Δ: {portfolioMarginStress.unrealizedStressPnL >= 0 ? '+' : ''}${portfolioMarginStress.unrealizedStressPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* 4. Margin Cushion & Health Buffer */}
                <div className="bg-[#161a20] border border-[#2a303a] rounded p-2.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-[#8c8c8c]">MARGIN CUSHION</span>
                    <span className={`text-[8.5px] font-black ${
                      portfolioMarginStress.stressedCushionPercent >= 30 ? 'text-[#00e676]' : portfolioMarginStress.stressedCushionPercent >= 15 ? 'text-[#ffd600]' : 'text-[#ff334b]'
                    }`}>
                      {portfolioMarginStress.stressedCushionPercent}%
                    </span>
                  </div>
                  <span className={`text-base font-black mt-1 ${
                    portfolioMarginStress.stressedCushionDollar > 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                  }`}>
                    ${portfolioMarginStress.stressedCushionDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="text-[8px] text-[#8c8c8c] mt-0.5 flex flex-col">
                    <span>Base Cushion: {portfolioMarginStress.baseCushionPercent}%</span>
                    <span>Equity above maintenance</span>
                  </div>
                </div>

                {/* 5. Options Buying Power */}
                <div className="bg-[#161a20] border border-[#2a303a] rounded p-2.5 flex flex-col justify-between">
                  <span className="text-[9px] text-[#8c8c8c]">AVAILABLE BUYING POWER</span>
                  <span className={`text-base font-bold mt-1 ${
                    portfolioMarginStress.stressedOptionsBuyingPower > 0 ? 'text-white' : 'text-[#ff334b]'
                  }`}>
                    ${portfolioMarginStress.stressedOptionsBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="text-[8px] text-[#8c8c8c] mt-0.5 flex flex-col">
                    <span>Base BP: ${portfolioMarginStress.baseOptionsBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span>Deployable capital buffer</span>
                  </div>
                </div>

                {/* 6. Distance to Margin Call */}
                <div className="bg-[#161a20] border border-[#2a303a] rounded p-2.5 flex flex-col justify-between">
                  <span className="text-[9px] text-[#8c8c8c]">DROP TOLERANCE</span>
                  <span className={`text-base font-black mt-1 ${
                    portfolioMarginStress.spyDropTolerancePct > 15 ? 'text-[#00e676]' : portfolioMarginStress.spyDropTolerancePct > 5 ? 'text-[#ffd600]' : 'text-[#ff334b]'
                  }`}>
                    -{portfolioMarginStress.spyDropTolerancePct}%
                  </span>
                  <div className="text-[8px] text-[#8c8c8c] mt-0.5 flex flex-col">
                    <span>Market sell-off tolerated</span>
                    <span>before liquidation threshold</span>
                  </div>
                </div>
              </div>

              {/* Collapsible 2D Market Condition Stress Matrix (Price Shocks × Vol Shocks) */}
              {isStressMatrixOpen && stressMatrixData && (
                <div className="bg-[#0f1216] border border-[#2b323c] rounded p-3 flex flex-col gap-2 font-mono text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222730] pb-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                      <BarChart2 className="w-3.5 h-3.5 text-[#ff9900]" />
                      <span>2D PORTFOLIO MARGIN STRESS MATRIX (HEATMAP)</span>
                    </span>
                    <span className="text-[9px] text-[#8c8c8c]">
                      Click any cell to immediately simulate that exact market condition across the portfolio &amp; chart!
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-[10px]">
                      <thead>
                        <tr className="border-b border-[#222730] bg-[#161a20] text-[#8c8c8c]">
                          <th className="py-1 px-2 text-left">VOL / SPOT</th>
                          {stressMatrixData.priceShocks.map((p) => (
                            <th key={p} className={`py-1 px-1.5 font-bold ${p === 0 ? 'text-white bg-[#222830]' : p < 0 ? 'text-[var(--bear)]' : 'text-[var(--bull)]'}`}>
                              {p >= 0 ? '+' : ''}{p}%
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2329]">
                        {stressMatrixData.volShocks.map((vShock, rowIdx) => (
                          <tr key={vShock} className="hover:bg-[#181d24]">
                            <td className="py-1.5 px-2 text-left font-bold bg-[#14181f] text-[#c084fc] border-r border-[#222730]">
                              {vShock >= 0 ? '+' : ''}{vShock}% IV
                            </td>
                            {stressMatrixData.matrix[rowIdx].map((cell) => {
                              const isCurrentCell = priceShockPct === cell.priceShockPct && ivShiftPercent === cell.ivShiftPct;
                              return (
                                <td
                                  key={cell.priceShockPct}
                                  onClick={() => {
                                    playKeyClick();
                                    setPriceShockPct(cell.priceShockPct);
                                    setIvShiftPercent(cell.ivShiftPct);
                                    setActiveMarketPresetId('custom');
                                  }}
                                  className={`py-1 px-1 cursor-pointer transition-all border ${
                                    isCurrentCell
                                      ? 'border-[#ff9900] ring-1 ring-[#ff9900] bg-[#ff9900]/20 font-black'
                                      : cell.status === 'MARGIN_CALL'
                                      ? 'bg-[#ff334b]/25 text-[#ff334b] border-[#ff334b]/30 hover:bg-[#ff334b]/40'
                                      : cell.status === 'CRITICAL_WARNING'
                                      ? 'bg-[#ff9900]/15 text-[#ff9900] border-[#ff9900]/30 hover:bg-[#ff9900]/30'
                                      : cell.status === 'CAUTION'
                                      ? 'bg-[#ffd600]/10 text-[#ffd600] border-[#ffd600]/20 hover:bg-[#ffd600]/25'
                                      : 'bg-[#12151a] text-white border-[#222830] hover:bg-[#1c222b]'
                                  }`}
                                  title={`Spot ${cell.priceShockPct}%, IV ${cell.ivShiftPct}%: Margin BP $${cell.marginBp.toLocaleString()}, Cushion ${cell.cushionPercent}%`}
                                >
                                  <div className="font-bold font-mono">
                                    ${(cell.marginBp / 1000).toFixed(1)}k
                                  </div>
                                  <div className="text-[8px] text-[#8c8c8c]">
                                    {cell.cushionPercent.toFixed(0)}% cush
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Position-Level Margin Sensitivity Attribution Table */}
              <div className="bg-[#12151a] border border-[#262c33] rounded p-2.5 flex flex-col gap-1.5 font-mono text-[10.5px]">
                <div className="flex items-center justify-between border-b border-[#222730] pb-1">
                  <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-[#00d2ff]" />
                    <span>POSITION MARGIN STRESS ATTRIBUTION ({portfolioMarginStress.positionAttributions.length} POSITIONS)</span>
                  </span>
                  <span className="text-[9px] text-[#8c8c8c]">
                    Observes individual position collateral expansion and tail-risk vulnerability
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#222730] text-[#8c8c8c] text-[9px] uppercase bg-[#0e1115]">
                        <th className="py-1 px-2">TICKER</th>
                        <th className="py-1 px-2">STRATEGY</th>
                        <th className="py-1 px-2 text-right">CONTRACTS</th>
                        <th className="py-1 px-2 text-right">BASE MARGIN BP</th>
                        <th className="py-1 px-2 text-right text-[#ff9900]">STRESSED MARGIN BP</th>
                        <th className="py-1 px-2 text-right">MARGIN EXPANSION (Δ)</th>
                        <th className="py-1 px-2">RULE APPLIED</th>
                        <th className="py-1 px-2 text-right">VULNERABILITY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2329]">
                      {portfolioMarginStress.positionAttributions.map((attr) => (
                        <tr key={attr.positionId} className="hover:bg-[#171c24]">
                          <td className="py-1 px-2 font-bold text-white">{attr.ticker}</td>
                          <td className="py-1 px-2 text-[#ccc]">{attr.strategyName}</td>
                          <td className="py-1 px-2 text-right text-[#aaa]">{attr.contracts}x</td>
                          <td className="py-1 px-2 text-right text-[#8c8c8c]">
                            (${attr.baseMarginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </td>
                          <td className="py-1 px-2 text-right font-black text-[#ff9900]">
                            (${attr.stressedMarginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </td>
                          <td className="py-1 px-2 text-right font-bold">
                            <span className={attr.marginDeltaDollar > 0 ? 'text-[#ff9900]' : attr.marginDeltaDollar < 0 ? 'text-[#00e676]' : 'text-[#8c8c8c]'}>
                              {attr.marginDeltaDollar >= 0 ? '+' : ''}${attr.marginDeltaDollar.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({attr.marginDeltaPercent >= 0 ? '+' : ''}{attr.marginDeltaPercent}%)
                            </span>
                          </td>
                          <td className="py-1 px-2">
                            <span className="px-1.5 py-0.2 rounded bg-[#1e2329] text-[#38bdf8] border border-[#334155] text-[8.5px] font-bold">
                              {attr.ruleLabel}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-right">
                            <span
                              className={`px-1.5 py-0.2 rounded font-black text-[8.5px] border cursor-help ${
                                attr.vulnerability === 'CRITICAL'
                                  ? 'bg-[#ff334b]/20 text-[#ff334b] border-[#ff334b]/40'
                                  : attr.vulnerability === 'HIGH'
                                  ? 'bg-[#ff9900]/20 text-[#ff9900] border-[#ff9900]/40'
                                  : attr.vulnerability === 'MEDIUM'
                                  ? 'bg-[#ffd600]/20 text-[#ffd600] border-[#ffd600]/40'
                                  : 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40'
                              }`}
                              title={attr.vulnerabilityReason}
                            >
                              {attr.vulnerability}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========================================================
            5. PORTFOLIO STOCKS & FUTURES INSPECTOR TRAY
        ======================================================== */}
        {(sourceMode === 'portfolio' || isPortfolioTrayExpanded) && (
          <div className="p-3 bg-[#15181c] border-b border-[var(--border)] flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a3038] pb-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#00d2ff] flex items-center gap-1.5 text-xs">
                  <Layers className="w-4 h-4" />
                  <span>PORTFOLIO STOCKS &amp; FUTURES POSITION BLOTTER</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[8.5px] font-extrabold border ${
                    sourceMode === 'portfolio'
                      ? 'bg-[#00d2ff]/20 text-[#00d2ff] border-[#00d2ff]/50'
                      : 'bg-[#222] text-[#8c8c8c] border-[#444]'
                  }`}
                >
                  {sourceMode === 'portfolio' ? 'ACTIVE PAYOFF ENGINE' : 'INSPECTION TRAY'}
                </span>
                <span className="text-[10px] text-[#8c8c8c] hidden md:inline">
                  Model underlying stock/futures delta &amp; risk curve
                </span>
              </div>

              {/* Category & Scope Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#2a3038] text-[9.5px]">
                  {(['ALL', 'STOCKS', 'FUTURES', 'OPTIONS'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        playKeyClick();
                        setPortfolioCategoryFilter(cat);
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        portfolioCategoryFilter === cat
                          ? cat === 'STOCKS'
                            ? 'bg-[#10b981] text-black font-extrabold'
                            : cat === 'FUTURES'
                            ? 'bg-[#ffd600] text-black font-extrabold'
                            : cat === 'OPTIONS'
                            ? 'bg-[#00d2ff] text-black font-extrabold'
                            : 'bg-white text-black font-extrabold'
                          : 'text-[#8c8c8c] hover:text-white'
                      }`}
                    >
                      {cat} (
                      {cat === 'STOCKS'
                        ? portfolioStats.stocksCount
                        : cat === 'FUTURES'
                        ? portfolioStats.futuresCount
                        : cat === 'OPTIONS'
                        ? portfolioStats.optionsCount
                        : portfolioStats.total}
                      )
                    </button>
                  ))}
                </div>

                <div className="flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#2a3038] text-[9.5px]">
                  <button
                    onClick={() => {
                      playKeyClick();
                      setPortfolioTickerFilter('ALL_TICKERS');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      portfolioTickerFilter === 'ALL_TICKERS'
                        ? 'bg-white text-black font-bold'
                        : 'text-[#8c8c8c] hover:text-white'
                    }`}
                  >
                    ALL TICKERS
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setPortfolioTickerFilter('CURRENT');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      portfolioTickerFilter === 'CURRENT'
                        ? 'bg-[var(--accent)] text-black font-bold'
                        : 'text-[#8c8c8c] hover:text-white'
                    }`}
                  >
                    {ticker.symbol} ONLY
                  </button>
                </div>

                {onOpenStockTrade && (
                  <button
                    onClick={() => {
                      playKeyClick();
                      onOpenStockTrade();
                    }}
                    className="px-2 py-0.5 bg-[#10b981]/20 hover:bg-[#10b981] hover:text-black text-[#34d399] font-bold rounded border border-[#10b981]/50 text-[9.5px] transition-all"
                  >
                    + Trade Ticket
                  </button>
                )}

                {onSeedPositions && (
                  <button
                    onClick={() => {
                      playKeyClick();
                      onSeedPositions();
                    }}
                    className="px-2 py-0.5 bg-[#252525] hover:bg-[#333] text-[#aaa] hover:text-white font-bold rounded border border-[#444] text-[9.5px] transition-all"
                    title="Seed sample stocks & futures (NVDA, AAPL, /ES, /CL)"
                  >
                    Seed Sample
                  </button>
                )}

                <button
                  onClick={() => {
                    playKeyClick();
                    setIsPortfolioTrayExpanded(!isPortfolioTrayExpanded);
                  }}
                  className="px-1.5 py-0.5 bg-[#1e2329] hover:bg-[#283038] text-[#8c8c8c] rounded text-[9.5px]"
                  title="Collapse tray"
                >
                  {isPortfolioTrayExpanded ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {/* Financial Aggregates Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div className="bg-[#0f1216] border border-[#262c33] rounded p-2 flex flex-col">
                <div className="flex items-center justify-between text-[10px] text-[#8c8c8c]">
                  <span className="flex items-center gap-1 text-[#10b981] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    STOCKS EXPOSURE
                  </span>
                  <span>{portfolioStats.stocksCount} pos</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-extrabold text-white font-mono text-[13px]">
                    ${portfolioAggregates.totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-bold font-mono ${portfolioAggregates.totalStockPnL >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                    {portfolioAggregates.totalStockPnL >= 0 ? '+' : ''}${portfolioAggregates.totalStockPnL.toFixed(2)}
                  </span>
                </div>
                <span className="text-[9.5px] text-[#8c8c8c] mt-0.5">
                  Total Delta: <strong className="text-[#ffd600]">{portfolioAggregates.totalStockDelta >= 0 ? '+' : ''}{portfolioAggregates.totalStockDelta.toFixed(0)} Δ</strong>
                </span>
              </div>

              <div className="bg-[#0f1216] border border-[#262c33] rounded p-2 flex flex-col">
                <div className="flex items-center justify-between text-[10px] text-[#8c8c8c]">
                  <span className="flex items-center gap-1 text-[#ffd600] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd600]" />
                    FUTURES NOTIONAL
                  </span>
                  <span>{portfolioStats.futuresCount} pos</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-extrabold text-white font-mono text-[13px]">
                    ${portfolioAggregates.totalFuturesNotional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-bold font-mono ${portfolioAggregates.totalFuturesPnL >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                    {portfolioAggregates.totalFuturesPnL >= 0 ? '+' : ''}${portfolioAggregates.totalFuturesPnL.toFixed(2)}
                  </span>
                </div>
                <span className="text-[9.5px] text-[#8c8c8c] mt-0.5">
                  Total Delta: <strong className="text-[#ffd600]">{portfolioAggregates.totalFuturesDelta >= 0 ? '+' : ''}{portfolioAggregates.totalFuturesDelta.toFixed(0)} Δ</strong>
                </span>
              </div>

              <div className="bg-[#0f1216] border border-[#262c33] rounded p-2 flex flex-col">
                <div className="flex items-center justify-between text-[10px] text-[#8c8c8c]">
                  <span className="flex items-center gap-1 text-[#00d2ff] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                    OPTIONS VALUE
                  </span>
                  <span>{portfolioStats.optionsCount} pos</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-extrabold text-white font-mono text-[13px]">
                    ${portfolioAggregates.totalOptionsMark.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-bold font-mono ${portfolioAggregates.totalOptionsPnL >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                    {portfolioAggregates.totalOptionsPnL >= 0 ? '+' : ''}${portfolioAggregates.totalOptionsPnL.toFixed(2)}
                  </span>
                </div>
                <span className="text-[9.5px] text-[#8c8c8c] mt-0.5">
                  Options Premium &amp; Greeks
                </span>
              </div>

              <div className="bg-[#0f1216] border border-[#262c33] rounded p-2 flex flex-col">
                <div className="flex items-center justify-between text-[10px] text-[#8c8c8c]">
                  <span className="flex items-center gap-1 text-[#c084fc] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                    TRADE IV &amp; EXPANSION
                  </span>
                  <span className={`text-[8.5px] px-1 py-0.2 rounded font-black border ${
                    portfolioAggregates.portfolioIvDelta >= 0
                      ? 'bg-[#a855f7]/20 text-[#d8b4fe] border-[#a855f7]/40'
                      : 'bg-[#0284c7]/20 text-[#38bdf8] border-[#0284c7]/40'
                  }`}>
                    {portfolioAggregates.portfolioIvDelta >= 0 ? '+' : ''}{(portfolioAggregates.portfolioIvDelta * 100).toFixed(1)}% Δ
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-extrabold text-[#f3e8ff] font-mono text-[13px]" title="Average IV when trades were executed vs Live Mark IV">
                    {(portfolioAggregates.avgEntryIV * 100).toFixed(1)}% <span className="text-[#8c8c8c] text-[10px]">→</span> {(portfolioAggregates.avgLiveIV * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-[9.5px] text-[#8c8c8c] mt-0.5">
                  Inception IV vs Live Mark
                </span>
              </div>

              <div className="bg-[#0f1216] border border-[#262c33] rounded p-2 flex flex-col">
                <div className="flex items-center justify-between text-[10px] text-[#8c8c8c]">
                  <span className="font-bold text-white">NET UNREALIZED P&amp;L</span>
                  <span>Total Portfolio</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className={`font-extrabold font-mono text-[14px] ${portfolioAggregates.netPnL >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                    {portfolioAggregates.netPnL >= 0 ? '+' : ''}${portfolioAggregates.netPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${
                    portfolioAggregates.netPnL >= 0
                      ? 'bg-[#10b981]/20 text-[#34d399] border-[#10b981]/40'
                      : 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/40'
                  }`}>
                    {portfolioAggregates.netPnL >= 0 ? 'PROFIT' : 'DRAWDOWN'}
                  </span>
                </div>
                <span className="text-[9.5px] text-[#8c8c8c] mt-0.5">
                  Real-time Mark-to-Market
                </span>
              </div>
            </div>

            {/* Positions Table / Empty Helper */}
            {visiblePortfolioPositions.length === 0 ? (
              <div className="bg-[#101215] p-4 rounded border border-[#262b32] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-[#ff9900]/10 border border-[#ff9900]/30 text-[#ff9900]">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      No open {portfolioCategoryFilter !== 'ALL' ? portfolioCategoryFilter.toLowerCase() : ''} positions for{' '}
                      {portfolioTickerFilter === 'CURRENT' ? ticker.symbol : 'portfolio'}.
                    </span>
                    <span className="text-[10px] text-[#8c8c8c]">
                      Stage a sample stock or futures position to immediately model underlying delta &amp; risk curve!
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddStockLeg('buy', 100)}
                    className="px-2.5 py-1 bg-[#10b981]/20 hover:bg-[#10b981] hover:text-black text-[#34d399] font-bold rounded border border-[#10b981]/50 text-[10px] transition-all"
                  >
                    + Stage 100 Shares Stock ({ticker.symbol})
                  </button>
                  <button
                    onClick={() => handleAddFuturesLeg('buy', 1)}
                    className="px-2.5 py-1 bg-[#ffd600]/20 hover:bg-[#ffd600] hover:text-black text-[#ffd600] font-bold rounded border border-[#ffd600]/50 text-[10px] transition-all"
                  >
                    + Stage 1 Future Contract
                  </button>
                  {onSeedPositions && (
                    <button
                      onClick={() => {
                        playKeyClick();
                        onSeedPositions();
                      }}
                      className="px-2.5 py-1 bg-[#ff9900]/20 hover:bg-[#ff9900] hover:text-black text-[#ff9900] font-bold rounded border border-[#ff9900]/50 text-[10px] transition-all"
                    >
                      + Seed Sample Positions
                    </button>
                  )}
                  {onOpenStockTrade && (
                    <button
                      onClick={() => {
                        playKeyClick();
                        onOpenStockTrade();
                      }}
                      className="px-2.5 py-1 bg-[#252525] hover:bg-[#333] text-white rounded border border-[#444] text-[10px] transition-all"
                    >
                      Trade Stock &gt;
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#2a3038] text-[#8c8c8c] text-[10px] uppercase bg-[#101215]">
                      <th className="py-1.5 px-2">MODEL</th>
                      <th className="py-1.5 px-2">ASSET</th>
                      <th className="py-1.5 px-2">STRATEGY / POSITION</th>
                      <th className="py-1.5 px-2">CONTRACTS / SHARES</th>
                      <th className="py-1.5 px-2 text-right">ENTRY COST</th>
                      <th className="py-1.5 px-2 text-right">CURRENT MARK</th>
                      <th className="py-1.5 px-2 text-right">UNREALIZED P&amp;L</th>
                      <th className="py-1.5 px-2 text-right">DELTA (Δ)</th>
                      <th className="py-1.5 px-2 text-right text-[#c084fc]">
                        <div>TRADE IV (ENTRY)</div>
                        <div className="text-[8px] text-[#a855f7] font-normal">AT TRADE · LIVE (Δ)</div>
                      </th>
                      <th className="py-1.5 px-2 text-right text-[#ff9900]">MARGIN BP (REQ)</th>
                      <th className="py-1.5 px-2 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2329] bg-[#121417]">
                    {visiblePortfolioPositions.map((pos) => {
                      const isEnabled = enabledPositionIds[pos.id] !== false;
                      const isStock = pos.legs.some((l) => l.type === 'stock') || pos.strategyName.toLowerCase().includes('stock');
                      const isFuture = pos.legs.some((l) => l.type === 'future') || pos.strategyName.toLowerCase().includes('future') || pos.ticker.startsWith('/');
                      
                      const assetBadge = isStock ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#10b981]/20 text-[#34d399] font-bold text-[8.5px] border border-[#10b981]/40">
                          STOCK
                        </span>
                      ) : isFuture ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#ffd600]/20 text-[#ffd600] font-bold text-[8.5px] border border-[#ffd600]/40">
                          /FUTURE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-[#00d2ff]/20 text-[#00d2ff] font-bold text-[8.5px] border border-[#00d2ff]/40">
                          OPTION
                        </span>
                      );

                      const deltaVal = pos.legs.reduce((acc, l) => {
                        const mult = l.multiplier !== undefined ? l.multiplier : (l.type === 'stock' ? 1 : 100);
                        const s = l.action === 'buy' ? 1 : -1;
                        if (l.type === 'stock' || l.type === 'future') return acc + s * mult * l.contracts;
                        return acc;
                      }, 0);

                      const spot = tickers?.[pos.ticker]?.price || (pos.legs[0]?.strike || 100);
                      const baseMargin = calculateDynamicPositionMargin(pos, spot, {
                        priceShockPct: 0,
                        ivShiftPct: 0,
                        daysElapsed: 0,
                        model: marginingModel,
                      });
                      const stressedMargin = calculateDynamicPositionMargin(pos, spot, {
                        priceShockPct,
                        ivShiftPct: ivShiftPercent,
                        daysElapsed: timeElapsedDays,
                        model: marginingModel,
                      });
                      const deltaDollar = stressedMargin.marginBp - baseMargin.marginBp;

                      // What IV was when trade was made
                      const entryIvVal = pos.entryIV !== undefined
                        ? pos.entryIV
                        : (pos.legs[0]?.iv && pos.legs[0].iv > 0)
                        ? pos.legs.reduce((acc, l) => acc + (l.iv || 0) * (l.contracts || 1), 0) / Math.max(1, pos.legs.reduce((acc, l) => acc + (l.contracts || 1), 0))
                        : (tickers?.[pos.ticker]?.currentIV || 0.25);

                      const liveIvVal = tickers?.[pos.ticker]?.currentIV || entryIvVal;
                      const ivDelta = liveIvVal - entryIvVal;

                      return (
                        <tr
                          key={pos.id}
                          className={`hover:bg-[#1a1f26] transition-colors ${
                            !isEnabled ? 'opacity-40' : ''
                          }`}
                        >
                          <td className="py-1.5 px-2">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => togglePositionCheckbox(pos.id)}
                              className="cursor-pointer accent-[#00d2ff]"
                              title="Include/exclude this position from Risk Profile payoff curve"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  playKeyClick();
                                  if (onSelectTicker) onSelectTicker(pos.ticker);
                                }}
                                className="font-bold text-white font-mono hover:text-[#00d2ff] hover:underline"
                                title={`Switch to ${pos.ticker}`}
                              >
                                {pos.ticker}
                              </button>
                              {assetBadge}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 font-bold text-white">{pos.strategyName}</td>
                          <td className="py-1.5 px-2 text-[#aaa]">
                            {isStock
                              ? `${pos.contracts} shares`
                              : isFuture
                              ? `${pos.contracts} contracts (${pos.legs[0]?.multiplier || 50}x)`
                              : `${pos.contracts} contracts (${pos.legs.length} legs)`}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-[#8c8c8c]">
                            ${Math.abs(pos.entryCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-white font-bold">
                            ${Math.abs(pos.currentMark).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold">
                            <span className={pos.unrealizedPnL >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}>
                              {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-[#ffd600]">
                            {deltaVal !== 0 ? `${deltaVal >= 0 ? '+' : ''}${deltaVal.toFixed(0)} Δ` : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono" title={`Implied Volatility when trade was executed: ${(entryIvVal * 100).toFixed(1)}% | Current Live IV: ${(liveIvVal * 100).toFixed(1)}% | Net IV Shift: ${ivDelta >= 0 ? '+' : ''}${(ivDelta * 100).toFixed(1)}% pts`}>
                            <div className="flex flex-col items-end">
                              <span className="font-extrabold text-[#f3e8ff] font-mono text-[11px] flex items-center gap-1">
                                <span className="text-[8px] text-[#c084fc] font-bold">ENTRY:</span>
                                {(entryIvVal * 100).toFixed(1)}%
                              </span>
                              <div className="flex items-center gap-1 text-[8.5px] mt-0.5">
                                <span className="text-[#8c8c8c]">NOW: {(liveIvVal * 100).toFixed(1)}%</span>
                                <span className={`px-1 py-0.2 rounded font-black text-[8px] ${
                                  Math.abs(ivDelta) < 0.001
                                    ? 'text-[#8c8c8c] bg-[#1e2329]'
                                    : ivDelta > 0
                                    ? 'text-[#c084fc] bg-[#a855f7]/20 border border-[#a855f7]/40'
                                    : 'text-[#38bdf8] bg-[#0284c7]/20 border border-[#0284c7]/40'
                                }`}>
                                  {ivDelta >= 0 ? '+' : ''}{(ivDelta * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-[#ff9900]" title="Margin Requirement for this position under active market conditions">
                            <div>
                              <span>(${stressedMargin.marginBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                              <div className="flex items-center justify-end gap-1 text-[8px] font-normal">
                                <span className="text-[#8c8c8c]">{stressedMargin.ruleLabel}</span>
                                {deltaDollar !== 0 && (
                                  <span className={deltaDollar > 0 ? 'text-[#ff9900] font-bold' : 'text-[#00e676] font-bold'}>
                                    (Δ {deltaDollar >= 0 ? '+' : ''}${deltaDollar.toFixed(0)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleModelPositionInRiskProfile(pos)}
                                className="px-2 py-0.5 rounded bg-[#00d2ff]/20 hover:bg-[#00d2ff] hover:text-black text-[#00d2ff] font-bold text-[9px] border border-[#00d2ff]/40 transition-all"
                                title="Plot this exact position's payoff curve and risk bands"
                              >
                                MODEL
                              </button>
                              <button
                                onClick={() => handleStagePositionLegsInBuilder(pos)}
                                className="px-1.5 py-0.5 rounded bg-[#ffd600]/20 hover:bg-[#ffd600] hover:text-black text-[#ffd600] font-bold text-[9px] border border-[#ffd600]/40 transition-all"
                                title="Copy legs to Strategy Builder to model options hedges"
                              >
                                + BUILDER
                              </button>
                              {onOpenStockTrade && (isStock || isFuture) && (
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    if (onSelectTicker && pos.ticker !== ticker.symbol) {
                                      onSelectTicker(pos.ticker);
                                    }
                                    onOpenStockTrade();
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-[#252525] hover:bg-[#333] text-white text-[9px] border border-[#444] transition-all"
                                  title="Open trading order ticket"
                                >
                                  TRADE
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

        {/* ========================================================
            6. LEGS BREAKDOWN & WHAT-IF CHECKLIST
        ======================================================== */}
        <div className={`p-3 ${showScenarioMatrix && !isSimulatedTradesExtended ? 'grid grid-cols-1 xl:grid-cols-3 gap-3' : 'flex flex-col gap-3'}`}>
          {/* Active Simulated Trades Table with Individual IV and Theoretical Price modeling */}
          <div className={`${showScenarioMatrix && !isSimulatedTradesExtended ? 'xl:col-span-2' : 'w-full'} bg-[#14171a] p-3 rounded border border-[var(--border)] flex flex-col gap-2 transition-all shadow-md`}>
            <div className="flex flex-wrap justify-between items-center border-b border-[#2d3339] pb-2 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-[var(--accent)] flex items-center gap-1.5 text-xs">
                  <Layers className="w-4 h-4" />
                  <span>POSITIONS &amp; SIMULATED TRADES ({allSourceLegs.length})</span>
                </span>
                {isSimulatedTradesExtended && (
                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black border bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/40 font-mono tracking-wide">
                    EXTENDED WINDOW ACTIVE
                  </span>
                )}
                {Object.keys(individualIvOverrides).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold border bg-[#a855f7]/20 text-[#c084fc] border-[#a855f7]/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{Object.keys(individualIvOverrides).length} LEGS WITH CUSTOM IV</span>
                  </span>
                )}
              </div>

              {/* Quick Sizing ("Bigger / Smaller"), Extended Window Toggles & Controls */}
              <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                {/* Sizing: Make Bigger and Smaller Stepper with % indicators */}
                <div className="flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#262c33] gap-0.5" title="Make position simulated trades bigger or smaller">
                  <span className="text-[#8c8c8c] px-1 font-bold">SIZE:</span>
                  <button
                    onClick={handleMakeSmaller}
                    title="Make smaller (step down font and row spacing)"
                    className="px-1.5 py-0.5 rounded font-bold bg-[#181a1d] hover:bg-[#25282f] text-[#8c8c8c] hover:text-white flex items-center gap-0.5 transition-all"
                  >
                    <Minus className="w-2.5 h-2.5" />
                    <span>A-</span>
                  </button>
                  {(['compact', 'normal', 'expanded', 'maximum'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        playKeyClick();
                        setSimulatedTradesSize(s);
                      }}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        simulatedTradesSize === s
                          ? s === 'maximum'
                            ? 'bg-[#00e5ff] text-black font-black shadow-sm'
                            : s === 'expanded'
                            ? 'bg-[var(--accent)] text-black font-black shadow-sm'
                            : 'bg-[#38bdf8] text-black font-black shadow-sm'
                          : 'bg-[#181a1d] text-[#8c8c8c] hover:text-white'
                      }`}
                      title={`Set size: ${s} (${s === 'compact' ? '80%' : s === 'normal' ? '100%' : s === 'expanded' ? '120%' : '140%'})`}
                    >
                      {s === 'compact' ? '80%' : s === 'normal' ? '100%' : s === 'expanded' ? '120%' : '140%'}
                    </button>
                  ))}
                  <button
                    onClick={handleMakeBigger}
                    title="Make bigger (step up font and row spacing)"
                    className="px-1.5 py-0.5 rounded font-bold bg-[#181a1d] hover:bg-[#25282f] text-[#8c8c8c] hover:text-white flex items-center gap-0.5 transition-all"
                  >
                    <span>A+</span>
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Vertical Height Controls (Expand / Collapse Viewport) */}
                <div className="flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#262c33] gap-0.5" title="Adjust blotter vertical height">
                  <span className="text-[#8c8c8c] px-1 font-bold">HEIGHT:</span>
                  {(['compact', 'standard', 'expanded'] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => {
                        playKeyClick();
                        setSimulatedTradesHeight(h);
                      }}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        simulatedTradesHeight === h
                          ? 'bg-[#38bdf8] text-black font-black shadow-sm'
                          : 'bg-[#181a1d] text-[#8c8c8c] hover:text-white'
                      }`}
                      title={h === 'compact' ? 'Compact height (300px)' : h === 'standard' ? 'Standard height (500px)' : 'Expanded full height'}
                    >
                      {h === 'compact' ? 'Compact' : h === 'standard' ? 'Standard' : 'Full'}
                    </button>
                  ))}
                </div>

                {/* Extended Window Full-Width Toggle */}
                <button
                  onClick={() => {
                    playKeyClick();
                    setIsSimulatedTradesExtended(!isSimulatedTradesExtended);
                  }}
                  title={isSimulatedTradesExtended ? "Collapse to compact column layout" : "Extend window to expansive full width"}
                  className={`px-2 py-0.5 rounded border font-extrabold flex items-center gap-1 transition-all ${
                    isSimulatedTradesExtended
                      ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-sm'
                      : 'bg-[#252525] hover:bg-[#333] text-[#aaa] border-[#444]'
                  }`}
                >
                  {isSimulatedTradesExtended ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  <span>{isSimulatedTradesExtended ? 'EXTENDED WINDOW' : 'EXTEND WINDOW'}</span>
                </button>

                {/* Extended 15-Columns View Toggle */}
                <button
                  onClick={() => {
                    playKeyClick();
                    setSimulatedTradesViewMode(simulatedTradesViewMode === 'extended' ? 'standard' : 'extended');
                  }}
                  title="Toggle between Extended Columns (with Gamma, Rho, Breakeven, Prob ITM) and Compact View"
                  className={`px-1.5 py-0.5 rounded border font-bold transition-all ${
                    simulatedTradesViewMode === 'extended'
                      ? 'bg-[#a855f7]/25 text-[#c084fc] border-[#a855f7]/50'
                      : 'bg-[#181a1d] text-[#8c8c8c] border-[#2c333a] hover:text-white'
                  }`}
                >
                  <span>{simulatedTradesViewMode === 'extended' ? '15 EXTENDED COLS' : '9 STANDARD COLS'}</span>
                </button>

                {/* Dedicated Pop-Out Extended Window Modal Button */}
                <button
                  onClick={() => {
                    playKeyClick();
                    setIsSimulatedTradesModalOpen(true);
                  }}
                  title="Pop out Position Simulated Trades in a dedicated full-screen window"
                  className="px-2 py-0.5 bg-[#1e232a] hover:bg-[#28303b] text-[#c084fc] hover:text-white rounded border border-[#a855f7]/40 flex items-center gap-1 font-bold transition-all shadow-sm"
                >
                  <ExternalLink className="w-3 h-3 text-[#c084fc]" />
                  <span>POP-OUT EXTENDED</span>
                </button>

                {/* Volatility Modeling Quick Shocks */}
                <div className="flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#262c33] gap-1">
                  <span className="text-[#8c8c8c] px-1 font-bold">Simulate IV:</span>
                  <button
                    onClick={handleApplyEarningsCrush}
                    title="Simulate immediate Post-Earnings Volatility Crush (-25% relative IV on option legs)"
                    className="px-1.5 py-0.5 bg-[#ef4444]/20 hover:bg-[#ef4444] hover:text-white text-[#f87171] font-bold rounded border border-[#ef4444]/40 flex items-center gap-1 transition-all"
                  >
                    <span>Crush (-25%)</span>
                  </button>
                  <button
                    onClick={handleApplyVolExpansion}
                    title="Simulate Event / Earnings Implied Volatility Expansion (+25% relative IV on option legs)"
                    className="px-1.5 py-0.5 bg-[#10b981]/20 hover:bg-[#10b981] hover:text-black text-[#34d399] font-bold rounded border border-[#10b981]/40 flex items-center gap-1 transition-all"
                  >
                    <span>Expand (+25%)</span>
                  </button>
                  {Object.keys(individualIvOverrides).length > 0 && (
                    <button
                      onClick={handleResetAllIndividualIvs}
                      title="Reset all individual leg IV overrides back to base market chain IV"
                      className="px-1.5 py-0.5 bg-[#a855f7]/20 hover:bg-[#a855f7] hover:text-white text-[#c084fc] font-bold rounded border border-[#a855f7]/40 flex items-center gap-1 transition-all"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset IVs</span>
                    </button>
                  )}
                </div>

                {/* Quick Underlying Stock & Futures Controls */}
                <div className="flex items-center gap-1">
                  <span className="text-[#8c8c8c]">Underlying:</span>
                  <button
                    onClick={() => handleAddStockLeg('buy', 100)}
                    title="Add 100 Shares Long Stock to Risk Profile"
                    className="px-1.5 py-0.5 bg-[#10b981]/20 hover:bg-[#10b981] hover:text-black text-[#34d399] font-bold rounded border border-[#10b981]/40"
                  >
                    +100 Shs
                  </button>
                  <button
                    onClick={() => handleAddStockLeg('sell', 100)}
                    title="Add 100 Shares Short Stock to Risk Profile"
                    className="px-1.5 py-0.5 bg-[#ef4444]/20 hover:bg-[#ef4444] hover:text-white text-[#f87171] font-bold rounded border border-[#ef4444]/40"
                  >
                    -100 Shs
                  </button>
                  <button
                    onClick={() => handleAddFuturesLeg('buy', 1)}
                    title="Add 1 Contract Long Futures to Risk Profile"
                    className="px-1.5 py-0.5 bg-[#ffd600]/20 hover:bg-[#ffd600] hover:text-black text-[#ffd600] font-bold rounded border border-[#ffd600]/40"
                  >
                    +1 Fut
                  </button>
                  <button
                    onClick={() => handleAddFuturesLeg('sell', 1)}
                    title="Add 1 Contract Short Futures to Risk Profile"
                    className="px-1.5 py-0.5 bg-[#f97316]/20 hover:bg-[#f97316] hover:text-black text-[#fb923c] font-bold rounded border border-[#f97316]/40"
                  >
                    -1 Fut
                  </button>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setShowScenarioMatrix(!showScenarioMatrix);
                    }}
                    title={showScenarioMatrix ? 'Hide scenario payoff matrix' : 'Show scenario payoff matrix'}
                    className={`px-1.5 py-0.5 rounded border transition-colors ${
                      showScenarioMatrix
                        ? 'bg-[var(--accent)] text-black font-extrabold border-[var(--accent)]'
                        : 'bg-[#252525] hover:bg-[#333] text-[#aaa] border-[#444]'
                    }`}
                  >
                    {showScenarioMatrix ? 'Hide Matrix' : 'Scenario Matrix'}
                  </button>
                  {allSourceLegs.length > 0 && onOpenStrategyExecution && (
                    <button
                      onClick={() => {
                        playKeyClick();
                        onOpenStrategyExecution();
                      }}
                      title="Execute Multi-Leg Strategy Order & View Complex Order Book (COB) Market Depth"
                      className="px-2 py-0.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold rounded flex items-center gap-1 transition-all shadow-sm"
                    >
                      <Zap className="w-2.5 h-2.5 text-black" />
                      <span>Execute / COB Depth</span>
                    </button>
                  )}
                  {allSourceLegs.length > 0 && (
                    <button
                      onClick={onClearLegs}
                      title="Clear All Staged Legs"
                      className="px-1.5 py-0.5 bg-[#252525] hover:bg-[#333] text-[#aaa] rounded border border-[#444]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {allSourceLegs.length === 0 ? (
              <div className="p-6 text-center text-[#8c8c8c] flex flex-col items-center gap-2">
                <span>No active legs loaded in Risk Profile.</span>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => handleAddStockLeg('buy', 100)}
                    className="px-2.5 py-1 bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/40 rounded font-bold text-[10px]"
                  >
                    + Add 100 Shares Stock
                  </button>
                  <button
                    onClick={() => handleAddFuturesLeg('buy', 1)}
                    className="px-2.5 py-1 bg-[#ffd600]/20 text-[#ffd600] border border-[#ffd600]/40 rounded font-bold text-[10px]"
                  >
                    + Add 1 Futures Contract
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPreset('Covered Call');
                      setSourceMode('preset');
                    }}
                    className="px-2.5 py-1 bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 rounded font-bold text-[10px]"
                  >
                    Load Covered Call Preset
                  </button>
                </div>
              </div>
            ) : (
              <div className={`overflow-x-auto no-scrollbar transition-all ${
                simulatedTradesHeight === 'compact' ? 'max-h-[300px]' : simulatedTradesHeight === 'expanded' ? 'max-h-none' : 'max-h-[520px]'
              } overflow-y-auto`}>
                <table className={`w-full text-left whitespace-nowrap transition-all ${sizeStyles.tableText}`}>
                  <thead>
                    <tr className="border-b border-[#262a30] text-[#8c8c8c] uppercase">
                      <th className={sizeStyles.headerPadding}>INC</th>
                      <th className={sizeStyles.headerPadding}>TYPE</th>
                      <th className={sizeStyles.headerPadding}>ACTION</th>
                      <th className={sizeStyles.headerPadding}>STRIKE / BASIS</th>
                      <th className={sizeStyles.headerPadding}>EXPIRY</th>
                      <th className={`${sizeStyles.headerPadding} text-right`}>MARK</th>
                      <th className={`${sizeStyles.headerPadding} text-center text-[#c084fc]`}>INDIVIDUAL IV (%)</th>
                      <th className={`${sizeStyles.headerPadding} text-right text-white`}>THEO PRICE</th>
                      <th className={`${sizeStyles.headerPadding} text-right`}>QTY / SIZE</th>
                      <th className={`${sizeStyles.headerPadding} text-right text-[#ff9900]`}>MARGIN BP ( )</th>
                      <th className={`${sizeStyles.headerPadding} text-right`}>DELTA (Δ)</th>
                      {simulatedTradesViewMode === 'extended' && (
                        <th className={`${sizeStyles.headerPadding} text-right text-[#a855f7]`}>GAMMA (Γ)</th>
                      )}
                      <th className={`${sizeStyles.headerPadding} text-right`}>VEGA (ν)</th>
                      <th className={`${sizeStyles.headerPadding} text-right`}>THETA (Θ)</th>
                      {simulatedTradesViewMode === 'extended' && (
                        <>
                          <th className={`${sizeStyles.headerPadding} text-right text-[#38bdf8]`}>RHO (ρ)</th>
                          <th className={`${sizeStyles.headerPadding} text-right text-emerald-400`}>BREAK-EVEN</th>
                          <th className={`${sizeStyles.headerPadding} text-right text-amber-300`}>PROB ITM</th>
                        </>
                      )}
                      <th className={`${sizeStyles.headerPadding} text-center`}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2227]">
                    {allSourceLegs.map((leg) => {
                      const isEnabled = enabledLegIds[leg.id] !== false;
                      const isStock = leg.type === 'stock';
                      const isFuture = leg.type === 'future';
                      const isOption = leg.type === 'call' || leg.type === 'put';

                      const baseIv = leg.iv;
                      const hasOverride = individualIvOverrides[leg.id] !== undefined;
                      const effectiveIv = hasOverride ? individualIvOverrides[leg.id] : baseIv;
                      const ivDiff = effectiveIv - baseIv;

                      // Compute theoretical values for this leg under simulated time, individual IV, and volatility skew
                      const theoData = isOption
                        ? calculateTheoreticalLeg(leg, currentPrice, timeElapsedDays, effectiveIv, undefined, activeSkewModel, frontDte)
                        : {
                            theoreticalPrice: currentPrice,
                            unrealizedPnL: (leg.action === 'buy' ? 1 : -1) * (currentPrice - leg.premium) * leg.contracts * (leg.multiplier || 1),
                            effectiveIV: 0,
                            delta: (leg.action === 'buy' ? 1 : -1) * leg.contracts * (leg.multiplier || (isFuture ? 50 : 1)),
                            gamma: 0,
                            theta: 0,
                            vega: 0,
                            rho: 0,
                            valueAtFrontExp: undefined as number | undefined,
                            strikeSkewAdj: undefined as number | undefined,
                            termSkewAdj: undefined as number | undefined,
                          };

                      const typeBadge = isStock ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#10b981]/20 text-[#34d399] font-bold text-[8.5px] border border-[#10b981]/40">
                          STOCK
                        </span>
                      ) : isFuture ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#ffd600]/20 text-[#ffd600] font-bold text-[8.5px] border border-[#ffd600]/40">
                          /FUTURE
                        </span>
                      ) : (
                        <span className="font-bold uppercase text-white">{leg.type}</span>
                      );

                      return (
                        <tr
                          key={leg.id}
                          className={`hover:bg-[#1a1e22] transition-colors ${
                            !isEnabled ? 'opacity-40 bg-[#0d0f12]' : ''
                          }`}
                        >
                          {/* Include Checkbox */}
                          <td className={sizeStyles.cellPadding}>
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleLegCheckbox(leg.id)}
                              className="cursor-pointer accent-[var(--accent)]"
                              title={isEnabled ? 'Included in simulated payoff profile' : 'Excluded from simulated payoff profile'}
                            />
                          </td>

                          {/* Type */}
                          <td className={sizeStyles.cellPadding}>{typeBadge}</td>

                          {/* Action */}
                          <td className={`${sizeStyles.cellPadding} font-bold uppercase`}>
                            <span
                              className={leg.action === 'buy' ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}
                            >
                              {leg.action}
                            </span>
                          </td>

                          {/* Strike / Basis */}
                          <td className={`${sizeStyles.cellPadding} font-extrabold text-[#ffd600]`}>
                            {isStock ? (
                              `Basis: $${leg.premium.toFixed(2)}`
                            ) : isFuture ? (
                              `Basis: $${leg.premium.toFixed(2)}`
                            ) : (
                              <div className="flex items-center gap-1 font-mono">
                                <button
                                  onClick={() => handleShiftStrike(leg, 'down')}
                                  title="Shift strike down (-)"
                                  className="w-3.5 h-3.5 flex items-center justify-center bg-[#222830] hover:bg-[#333d4a] text-[#8c8c8c] hover:text-white rounded text-[9px]"
                                >
                                  -
                                </button>
                                <span>${leg.strike.toFixed(2)}</span>
                                <button
                                  onClick={() => handleShiftStrike(leg, 'up')}
                                  title="Shift strike up (+)"
                                  className="w-3.5 h-3.5 flex items-center justify-center bg-[#222830] hover:bg-[#333d4a] text-[#8c8c8c] hover:text-white rounded text-[9px]"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Expiration */}
                          <td className={`${sizeStyles.cellPadding} text-[#8c8c8c]`}>
                            {leg.expiration}
                            {isOption && leg.dte > 0 ? (
                              <span className="text-[9.5px] text-[#666] ml-1">({leg.dte}d)</span>
                            ) : null}
                          </td>

                          {/* Initial Mark / Basis */}
                          <td className={`${sizeStyles.cellPadding} text-right font-bold text-white font-mono`}>
                            ${leg.premium.toFixed(2)}
                          </td>

                          {/* Individual Implied Volatility (IV) Stepper & Custom Input */}
                          <td className={sizeStyles.cellPadding}>
                            {isOption ? (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-1 font-mono">
                                  <button
                                    onClick={() => handleUpdateLegIv(leg, effectiveIv - 0.01)}
                                    title="Decrease individual IV (-1%)"
                                    className="w-4 h-4 flex items-center justify-center bg-[#222830] hover:bg-[#333d4a] text-white rounded text-[10px]"
                                  >
                                    -
                                  </button>
                                  <div className="relative flex items-center">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="1"
                                      max="500"
                                      value={Number((effectiveIv * 100).toFixed(1))}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                          handleUpdateLegIv(leg, val / 100);
                                        }
                                      }}
                                      className={`w-14 px-1 py-0.5 bg-[#090b0e] border rounded text-right text-[11px] font-bold font-mono ${
                                        hasOverride
                                          ? 'text-[#c084fc] border-[#a855f7] bg-[#a855f7]/10'
                                          : 'text-white border-[#2a3038] hover:border-[#444]'
                                      }`}
                                      title="Edit individual Implied Volatility (%) for this simulated trade"
                                    />
                                    <span className="text-[10px] text-[#8c8c8c] ml-0.5">%</span>
                                  </div>
                                  <button
                                    onClick={() => handleUpdateLegIv(leg, effectiveIv + 0.01)}
                                    title="Increase individual IV (+1%)"
                                    className="w-4 h-4 flex items-center justify-center bg-[#222830] hover:bg-[#333d4a] text-white rounded text-[10px]"
                                  >
                                    +
                                  </button>
                                  {hasOverride && (
                                    <button
                                      onClick={() => handleResetLegIv(leg.id, leg)}
                                      title={`Reset IV to base chain (${(baseIv * 100).toFixed(1)}%)`}
                                      className="p-0.5 text-[#a855f7] hover:text-white rounded hover:bg-[#a855f7]/30 transition-colors"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                {hasOverride && (
                                  <div className="text-[8.5px] text-center font-mono font-bold mt-0.5">
                                    <span className={ivDiff > 0 ? 'text-[#c084fc]' : 'text-[#f87171]'}>
                                      {ivDiff > 0 ? `+${(ivDiff * 100).toFixed(1)}% user` : `${(ivDiff * 100).toFixed(1)}% user`}
                                    </span>
                                  </div>
                                )}
                                {isOption && activeSkewModel && (
                                  <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5 text-[8px] font-mono">
                                    {theoData.strikeSkewAdj !== undefined && Math.abs(theoData.strikeSkewAdj) > 0.0005 && (
                                      <span
                                        className={`px-1 py-0.2 rounded border ${
                                          theoData.strikeSkewAdj > 0
                                            ? 'bg-purple-900/30 text-purple-300 border-purple-500/40'
                                            : 'bg-indigo-900/30 text-indigo-300 border-indigo-500/40'
                                        }`}
                                        title="Strike Skew (Moneyness Smile adjustment)"
                                      >
                                        {theoData.strikeSkewAdj > 0 ? '+' : ''}{(theoData.strikeSkewAdj * 100).toFixed(1)}% strike
                                      </span>
                                    )}
                                    {theoData.termSkewAdj !== undefined && Math.abs(theoData.termSkewAdj) > 0.0005 && (
                                      <span
                                        className={`px-1 py-0.2 rounded border ${
                                          theoData.termSkewAdj > 0
                                            ? 'bg-sky-900/30 text-sky-300 border-sky-500/40'
                                            : 'bg-rose-900/30 text-rose-300 border-rose-500/40'
                                        }`}
                                        title="Term Structure Skew (Contango/Inversion adjustment)"
                                      >
                                        {theoData.termSkewAdj > 0 ? '+' : ''}{(theoData.termSkewAdj * 100).toFixed(1)}% term
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#555] text-center block font-mono">—</span>
                            )}
                          </td>

                          {/* Modeled Theoretical Price */}
                          <td className={`${sizeStyles.cellPadding} text-right font-mono`}>
                            <div className="font-bold text-white">${theoData.theoreticalPrice.toFixed(2)}</div>
                            <div className={`text-[9px] font-bold ${theoData.unrealizedPnL >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                              {theoData.unrealizedPnL >= 0 ? '+' : ''}${theoData.unrealizedPnL.toFixed(2)}
                            </div>
                            {theoData.valueAtFrontExp !== undefined && (
                              <div
                                className="text-[8.5px] text-[#34d399] font-mono font-bold mt-0.5 truncate"
                                title="Modeled theoretical value of surviving back-month option at front-month expiration (accounting for skew and vol shock)"
                              >
                                @ T_front: ${theoData.valueAtFrontExp.toFixed(2)}
                              </div>
                            )}
                          </td>

                          {/* Quantity / Contracts */}
                          <td className={`${sizeStyles.cellPadding} text-right text-[#ccc] font-mono`}>
                            {isStock ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    const newQty = Math.max(10, leg.contracts - 50);
                                    onUpdateLeg({ ...leg, contracts: newQty });
                                  }}
                                  className="px-1 py-0.2 bg-[#252525] hover:bg-[#333] text-white rounded text-[9px]"
                                  title="Decrease shares (-50)"
                                >
                                  -
                                </button>
                                <span className="font-bold text-white min-w-[50px] text-center">
                                  {leg.contracts} shs
                                </span>
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    const newQty = leg.contracts + 50;
                                    onUpdateLeg({ ...leg, contracts: newQty });
                                  }}
                                  className="px-1 py-0.2 bg-[#252525] hover:bg-[#333] text-white rounded text-[9px]"
                                  title="Increase shares (+50)"
                                >
                                  +
                                </button>
                              </div>
                            ) : isFuture ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    const newQty = Math.max(1, leg.contracts - 1);
                                    onUpdateLeg({ ...leg, contracts: newQty });
                                  }}
                                  className="px-1 py-0.2 bg-[#252525] hover:bg-[#333] text-[#ffd600] rounded text-[9px]"
                                  title="Decrease contracts (-1)"
                                >
                                  -
                                </button>
                                <span className="font-bold text-[#ffd600] min-w-[50px] text-center">
                                  {leg.contracts} ct ({leg.multiplier || 50}x)
                                </span>
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    const newQty = leg.contracts + 1;
                                    onUpdateLeg({ ...leg, contracts: newQty });
                                  }}
                                  className="px-1 py-0.2 bg-[#252525] hover:bg-[#333] text-[#ffd600] rounded text-[9px]"
                                  title="Increase contracts (+1)"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    const newQty = Math.max(1, leg.contracts - 1);
                                    onUpdateLeg({ ...leg, contracts: newQty });
                                  }}
                                  className="px-1 py-0.2 bg-[#252525] hover:bg-[#333] text-white rounded text-[9px]"
                                  title="Decrease contracts (-1)"
                                >
                                  -
                                </button>
                                <span className="font-bold text-white min-w-[32px] text-center">
                                  {leg.contracts}x
                                </span>
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    const newQty = leg.contracts + 1;
                                    onUpdateLeg({ ...leg, contracts: newQty });
                                  }}
                                  className="px-1 py-0.2 bg-[#252525] hover:bg-[#333] text-white rounded text-[9px]"
                                  title="Increase contracts (+1)"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Margin Buying Power (BP) */}
                          <td className={`${sizeStyles.cellPadding} text-right font-mono font-bold text-[#ff9900]`} title="Initial Margin Buying Power Reduction for this leg">
                            {(() => {
                              let legBp = 0;
                              let rule = 'DEBIT';
                              if (isStock) {
                                legBp = currentPrice * leg.contracts * (leg.multiplier || 1) * 0.5;
                                rule = leg.action === 'buy' ? 'REG-T 50%' : 'SHORT 50%';
                              } else if (isFuture) {
                                legBp = leg.contracts * 12320;
                                rule = 'SPAN FUT';
                              } else if (leg.action === 'buy') {
                                legBp = leg.premium * 100 * leg.contracts;
                                rule = 'DEBIT 100%';
                              } else {
                                const mult = (leg.multiplier || 100) * leg.contracts;
                                const prem = leg.premium * mult;
                                if (leg.type === 'call') {
                                  const otm = Math.max(0, (leg.strike - currentPrice) * mult);
                                  legBp = Math.max(currentPrice * mult * 0.20 - otm + prem, currentPrice * mult * 0.10 + prem);
                                } else {
                                  const otm = Math.max(0, (currentPrice - leg.strike) * mult);
                                  legBp = Math.max(currentPrice * mult * 0.20 - otm + prem, leg.strike * mult * 0.10 + prem);
                                }
                                rule = 'RULE 4210';
                              }
                              return (
                                <div>
                                  <span>(${legBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                  <span className="block text-[8px] text-[#8c8c8c] font-normal">{rule}</span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Delta */}
                          <td className={`${sizeStyles.cellPadding} text-right font-mono font-bold`}>
                            <span className={theoData.delta >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}>
                              {theoData.delta >= 0 ? '+' : ''}{theoData.delta.toFixed(1)} Δ
                            </span>
                          </td>

                          {/* Gamma (Extended) */}
                          {simulatedTradesViewMode === 'extended' && (
                            <td className={`${sizeStyles.cellPadding} text-right font-mono text-[#a855f7]`}>
                              {theoData.gamma ? theoData.gamma.toFixed(3) : '0.000'}
                            </td>
                          )}

                          {/* Vega */}
                          <td className={`${sizeStyles.cellPadding} text-right font-mono text-[#00d2ff]`}>
                            {theoData.vega ? `${theoData.vega >= 0 ? '+' : ''}${theoData.vega.toFixed(2)}` : '0.00'}
                          </td>

                          {/* Theta */}
                          <td className={`${sizeStyles.cellPadding} text-right font-mono text-[#ffd600]`}>
                            {theoData.theta ? `${theoData.theta.toFixed(2)}` : '$0.00'}
                          </td>

                          {/* Rho (Extended) */}
                          {simulatedTradesViewMode === 'extended' && (
                            <td className={`${sizeStyles.cellPadding} text-right font-mono text-[#38bdf8]`}>
                              {theoData.rho ? theoData.rho.toFixed(2) : '0.00'}
                            </td>
                          )}

                          {/* Break-Even (Extended) */}
                          {simulatedTradesViewMode === 'extended' && (
                            <td className={`${sizeStyles.cellPadding} text-right font-mono text-emerald-400 font-bold`}>
                              {(() => {
                                const breakEven = isOption
                                  ? (leg.type === 'call' ? leg.strike + leg.premium : leg.strike - leg.premium)
                                  : leg.premium;
                                return `$${breakEven.toFixed(2)}`;
                              })()}
                            </td>
                          )}

                          {/* Probability ITM (Extended) */}
                          {simulatedTradesViewMode === 'extended' && (
                            <td className={`${sizeStyles.cellPadding} text-right font-mono text-amber-300 font-bold`}>
                              {(() => {
                                const probItm = isOption
                                  ? Math.min(99.9, Math.max(0.1, Math.abs(theoData.delta / Math.max(1, (leg.multiplier || 100) * leg.contracts)) * 100))
                                  : 100;
                                return `${probItm.toFixed(1)}%`;
                              })()}
                            </td>
                          )}

                          {/* Actions: Copy, Flip, Remove */}
                          <td className={`${sizeStyles.cellPadding} text-center`}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleDuplicateLeg(leg)}
                                title="Duplicate / Copy this simulated trade leg (+1)"
                                className="p-1 text-[#8c8c8c] hover:text-[#00e5ff] rounded hover:bg-[#00e5ff]/10 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleInvertLeg(leg)}
                                title="Invert Side (Buy <-> Sell)"
                                className="p-1 text-[#8c8c8c] hover:text-[#ffd600] rounded hover:bg-[#ffd600]/10 transition-colors"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                              {sourceMode === 'builder' ? (
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    onRemoveLeg(leg.id);
                                  }}
                                  title="Remove leg from strategy builder"
                                  className="p-1 text-[#8c8c8c] hover:text-[#ef4444] rounded hover:bg-[#ef4444]/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[#444] text-[9px] px-1">LOCK</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-[#262a30] bg-[#121417] text-[10px] font-mono">
                    <tr>
                      <td colSpan={5} className={`${sizeStyles.cellPadding} font-bold text-[#8c8c8c]`}>
                        <span className="text-[#38bdf8] font-black mr-2">NET STRATEGY COLLATERAL:</span>
                        <span className="text-white">Rule 4210 / FINRA Standard Portfolio Margin</span>
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-white`}>
                        ${analysis.netDebitCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-center text-[#c084fc] font-bold`}>
                        {allSourceLegs.length} LEGS
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-white`}>
                        —
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-white`}>
                        {allSourceLegs.reduce((sum, l) => sum + l.contracts, 0)}x
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-black text-[#ff9900]`}>
                        (${analysis.marginBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        <div className="text-[8px] text-[#8c8c8c] font-normal">
                          {analysis.marginType.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold ${analysis.totalDelta >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                        {analysis.totalDelta >= 0 ? '+' : ''}{analysis.totalDelta.toFixed(1)} Δ
                      </td>
                      {simulatedTradesViewMode === 'extended' && (
                        <td className={`${sizeStyles.cellPadding} text-right font-bold text-[#a855f7]`}>
                          {analysis.totalGamma.toFixed(3)} Γ
                        </td>
                      )}
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-[#00d2ff]`}>
                        ${analysis.totalVega.toFixed(2)}
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-[#ffd600]`}>
                        ${analysis.totalTheta.toFixed(2)}
                      </td>
                      {simulatedTradesViewMode === 'extended' && (
                        <>
                          <td className={`${sizeStyles.cellPadding} text-right font-bold text-[#38bdf8]`}>
                            ${analysis.totalRho.toFixed(2)}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-bold text-emerald-400`}>
                            {analysis.breakEvens && analysis.breakEvens.length > 0 ? `$${analysis.breakEvens[0].toFixed(2)}` : '—'}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-bold text-amber-300`}>
                            {analysis.probOfProfit}%
                          </td>
                        </>
                      )}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Scenario P&L Matrix Table (Hidden by default) */}
          {showScenarioMatrix && (
            <div className="bg-[#14171a] p-3 rounded border border-[var(--border)] flex flex-col gap-2 animate-in fade-in duration-150">
              <div className="flex justify-between items-center border-b border-[#2d3339] pb-2">
                <span className="font-extrabold text-[var(--accent)] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>SCENARIO PAYOFF MATRIX</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8c8c8c]">Discrete price outcome lookup</span>
                  <button
                    onClick={() => {
                      playKeyClick();
                      setShowScenarioMatrix(false);
                    }}
                    className="tos-btn py-0.5 px-2 text-[9.5px] flex items-center gap-1 text-[#8c8c8c] hover:text-white"
                    title="Hide scenario payoff matrix"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>HIDE MATRIX</span>
                  </button>
                </div>
              </div>

              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#262a30] text-[#8c8c8c] text-[10px] uppercase">
                    <th className="py-1 px-2">CHANGE %</th>
                    <th className="py-1 px-2">PRICE TARGET</th>
                    <th className="py-1 px-2 text-right">P&L TODAY</th>
                    <th className="py-1 px-2 text-right">P&L EXPIRY</th>
                    <th className="py-1 px-2 text-right">DELTA (Δ)</th>
                    <th className="py-1 px-2 text-right">THETA (Θ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2227]">
                  {scenarioRows.map((row) => {
                    const isAtm = row.stepPct === 0;
                    return (
                      <tr
                        key={row.stepPct}
                        className={`hover:bg-[#1a1e22] transition-colors ${
                          isAtm ? 'bg-[#222830] font-bold' : ''
                        }`}
                      >
                        <td
                          className={`py-1 px-2 font-bold ${
                            row.stepPct > 0
                              ? 'text-[var(--bull)]'
                              : row.stepPct < 0
                              ? 'text-[var(--bear)]'
                              : 'text-white'
                          }`}
                        >
                          {row.stepPct >= 0 ? `+${row.stepPct}%` : `${row.stepPct}%`}
                        </td>
                        <td className="py-1 px-2 font-mono text-white">${row.targetP.toFixed(2)}</td>
                        <td
                          className={`py-1 px-2 text-right font-bold ${
                            row.pnlToday >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'
                          }`}
                        >
                          {row.pnlToday >= 0 ? '+' : ''}${row.pnlToday.toFixed(2)}
                        </td>
                        <td
                          className={`py-1 px-2 text-right font-bold ${
                            row.pnlExp >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'
                          }`}
                        >
                          {row.pnlExp >= 0 ? '+' : ''}${row.pnlExp.toFixed(2)}
                        </td>
                        <td className="py-1 px-2 text-right text-[#8c8c8c]">{row.delta.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right text-[#ffd600]">${row.theta.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          7. DEDICATED POP-OUT EXTENDED SIMULATED TRADES WINDOW MODAL
      ======================================================== */}
      {isSimulatedTradesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-[#12161c] border-2 border-[#00e5ff]/50 rounded-lg shadow-[0_0_50px_rgba(0,229,255,0.25)] w-full max-w-[97vw] max-h-[95vh] flex flex-col overflow-hidden text-xs font-mono">
            {/* Modal Header */}
            <div className="bg-[#171e28] border-b border-[#253346] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-[#00e5ff]/15 border border-[#00e5ff]/40">
                  <Layers className="w-5 h-5 text-[#00e5ff]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-white tracking-wide">
                      {ticker.symbol} — POSITIONS &amp; SIMULATED TRADES
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/50 font-mono tracking-wider">
                      EXTENDED DETACHED WINDOW
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 font-mono">
                      FINRA RULE 4210 / REG-T
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8c8c8c] flex items-center gap-3 mt-0.5 flex-wrap">
                    <span>Active Legs: <b className="text-white">{allSourceLegs.length}</b></span>
                    <span>·</span>
                    <span>Net Debit/Credit: <b className="text-white">${analysis.netDebitCredit.toFixed(2)}</b></span>
                    <span>·</span>
                    <span>Total Margin BP: <b className="text-[#ff9900]">(${analysis.marginBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2 })})</b></span>
                  </div>
                </div>
              </div>

              {/* Modal Toolbar & Sizing Controls */}
              <div className="flex items-center gap-2 flex-wrap text-[9px]">
                {/* Sizing Stepper in Modal */}
                <div className="flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#262c33] gap-0.5" title="Make simulated trades bigger or smaller">
                  <span className="text-[#8c8c8c] px-1 font-bold">SIZE:</span>
                  <button
                    onClick={handleMakeSmaller}
                    className="px-1.5 py-0.5 rounded font-bold bg-[#181a1d] hover:bg-[#25282f] text-[#8c8c8c] hover:text-white flex items-center gap-0.5 transition-all"
                  >
                    <Minus className="w-2.5 h-2.5" />
                    <span>A-</span>
                  </button>
                  {(['compact', 'normal', 'expanded', 'maximum'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        playKeyClick();
                        setSimulatedTradesSize(s);
                      }}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        simulatedTradesSize === s
                          ? s === 'maximum'
                            ? 'bg-[#00e5ff] text-black font-black'
                            : s === 'expanded'
                            ? 'bg-[var(--accent)] text-black font-black'
                            : 'bg-[#38bdf8] text-black font-black'
                          : 'bg-[#181a1d] text-[#8c8c8c] hover:text-white'
                      }`}
                    >
                      {s === 'compact' ? '80%' : s === 'normal' ? '100%' : s === 'expanded' ? '120%' : '140%'}
                    </button>
                  ))}
                  <button
                    onClick={handleMakeBigger}
                    className="px-1.5 py-0.5 rounded font-bold bg-[#181a1d] hover:bg-[#25282f] text-[#8c8c8c] hover:text-white flex items-center gap-0.5 transition-all"
                  >
                    <span>A+</span>
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* 15 Cols vs 9 Cols */}
                <button
                  onClick={() => {
                    playKeyClick();
                    setSimulatedTradesViewMode(simulatedTradesViewMode === 'extended' ? 'standard' : 'extended');
                  }}
                  className={`px-2 py-1 rounded border font-bold ${
                    simulatedTradesViewMode === 'extended'
                      ? 'bg-[#a855f7]/25 text-[#c084fc] border-[#a855f7]/50'
                      : 'bg-[#181a1d] text-[#8c8c8c] border-[#2c333a] hover:text-white'
                  }`}
                >
                  {simulatedTradesViewMode === 'extended' ? '15 EXTENDED COLS' : '9 STANDARD COLS'}
                </button>

                {/* Volatility Simulation in Modal */}
                <div className="hidden lg:flex items-center bg-[#0d0f12] p-0.5 rounded border border-[#262c33] gap-1">
                  <span className="text-[#8c8c8c] px-1 font-bold">Simulate IV:</span>
                  <button
                    onClick={handleApplyEarningsCrush}
                    className="px-1.5 py-0.5 bg-[#ef4444]/20 hover:bg-[#ef4444] hover:text-white text-[#f87171] font-bold rounded border border-[#ef4444]/40"
                  >
                    Crush (-25%)
                  </button>
                  <button
                    onClick={handleApplyVolExpansion}
                    className="px-1.5 py-0.5 bg-[#10b981]/20 hover:bg-[#10b981] hover:text-black text-[#34d399] font-bold rounded border border-[#10b981]/40"
                  >
                    Expand (+25%)
                  </button>
                  {Object.keys(individualIvOverrides).length > 0 && (
                    <button
                      onClick={handleResetAllIndividualIvs}
                      className="px-1.5 py-0.5 bg-[#a855f7]/20 hover:bg-[#a855f7] hover:text-white text-[#c084fc] font-bold rounded border border-[#a855f7]/40 flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset IVs</span>
                    </button>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    playKeyClick();
                    setIsSimulatedTradesModalOpen(false);
                  }}
                  className="px-2 py-1 bg-[#252a32] hover:bg-[#ef4444] text-[#8c8c8c] hover:text-white rounded border border-[#3b4350] transition-colors flex items-center gap-1 font-bold cursor-pointer"
                  title="Close extended window modal"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>CLOSE</span>
                </button>
              </div>
            </div>

            {/* Modal Vital Risk Summary Deck */}
            <div className="bg-[#10141a] border-b border-[#222d3d] px-4 py-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[10.5px]">
              <div className="flex flex-col">
                <span className="text-[8.5px] text-[#8c8c8c]">STRATEGY</span>
                <span className="font-extrabold text-[var(--accent)] truncate">{analysis.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] text-[#8c8c8c]">INITIAL MARGIN BP</span>
                <span className="font-black text-[#ff9900]">(${analysis.marginBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] text-[#8c8c8c]">MAX PROFIT</span>
                <span className="font-bold text-[var(--bull)]">{typeof analysis.maxProfit === 'number' ? `$${analysis.maxProfit.toFixed(2)}` : 'Unlimited'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] text-[#8c8c8c]">MAX LOSS</span>
                <span className="font-bold text-[var(--bear)]">{typeof analysis.maxLoss === 'number' ? `$${analysis.maxLoss.toFixed(2)}` : 'Unlimited'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] text-[#8c8c8c]">NET DELTA</span>
                <span className={`font-bold ${analysis.totalDelta >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>{analysis.totalDelta >= 0 ? '+' : ''}{analysis.totalDelta.toFixed(1)} Δ</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] text-[#8c8c8c]">NET VEGA</span>
                <span className="font-bold text-[#00d2ff]">${analysis.totalVega.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] text-[#8c8c8c]">NET THETA</span>
                <span className="font-bold text-[#ffd600]">${analysis.totalTheta.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] text-[#8c8c8c]">PROB OF PROFIT</span>
                <span className="font-bold text-amber-300">{analysis.probOfProfit}%</span>
              </div>
            </div>

            {/* Modal Body: Scrollable Blotter Table */}
            <div className="flex-1 overflow-auto p-3">
              <div className="overflow-x-auto no-scrollbar">
                <table className={`w-full text-left whitespace-nowrap transition-all ${sizeStyles.tableText}`}>
                  <thead>
                    <tr className="border-b border-[#262a30] text-[#8c8c8c] uppercase">
                      <th className={sizeStyles.headerPadding}>INC</th>
                      <th className={sizeStyles.headerPadding}>TYPE</th>
                      <th className={sizeStyles.headerPadding}>ACTION</th>
                      <th className={sizeStyles.headerPadding}>STRIKE / BASIS</th>
                      <th className={sizeStyles.headerPadding}>EXPIRY</th>
                      <th className={`${sizeStyles.headerPadding} text-right`}>MARK</th>
                      <th className={`${sizeStyles.headerPadding} text-center text-[#c084fc]`}>INDIVIDUAL IV (%)</th>
                      <th className={`${sizeStyles.headerPadding} text-right text-white`}>THEO PRICE</th>
                      <th className={`${sizeStyles.headerPadding} text-right`}>QTY / SIZE</th>
                      <th className={`${sizeStyles.headerPadding} text-right text-[#ff9900]`}>MARGIN BP ( )</th>
                      <th className={`${sizeStyles.headerPadding} text-right`}>DELTA (Δ)</th>
                      {simulatedTradesViewMode === 'extended' && (
                        <th className={`${sizeStyles.headerPadding} text-right text-[#a855f7]`}>GAMMA (Γ)</th>
                      )}
                      <th className={`${sizeStyles.headerPadding} text-right`}>VEGA (ν)</th>
                      <th className={`${sizeStyles.headerPadding} text-right`}>THETA (Θ)</th>
                      {simulatedTradesViewMode === 'extended' && (
                        <>
                          <th className={`${sizeStyles.headerPadding} text-right text-[#38bdf8]`}>RHO (ρ)</th>
                          <th className={`${sizeStyles.headerPadding} text-right text-emerald-400`}>BREAK-EVEN</th>
                          <th className={`${sizeStyles.headerPadding} text-right text-amber-300`}>PROB ITM</th>
                        </>
                      )}
                      <th className={`${sizeStyles.headerPadding} text-center`}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2227]">
                    {allSourceLegs.map((leg) => {
                      const isEnabled = enabledLegIds[leg.id] !== false;
                      const isStock = leg.type === 'stock';
                      const isFuture = leg.type === 'future';
                      const isOption = leg.type === 'call' || leg.type === 'put';

                      const baseIv = leg.iv;
                      const hasOverride = individualIvOverrides[leg.id] !== undefined;
                      const effectiveIv = hasOverride ? individualIvOverrides[leg.id] : baseIv;
                      const ivDiff = effectiveIv - baseIv;

                      const theoData = isOption
                        ? calculateTheoreticalLeg(leg, currentPrice, timeElapsedDays, effectiveIv, undefined, activeSkewModel, frontDte)
                        : {
                            theoreticalPrice: currentPrice,
                            unrealizedPnL: (leg.action === 'buy' ? 1 : -1) * (currentPrice - leg.premium) * leg.contracts * (leg.multiplier || 1),
                            effectiveIV: 0,
                            delta: (leg.action === 'buy' ? 1 : -1) * leg.contracts * (leg.multiplier || (isFuture ? 50 : 1)),
                            gamma: 0,
                            theta: 0,
                            vega: 0,
                            rho: 0,
                            valueAtFrontExp: undefined as number | undefined,
                            strikeSkewAdj: undefined as number | undefined,
                            termSkewAdj: undefined as number | undefined,
                          };

                      const typeBadge = isStock ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#10b981]/20 text-[#34d399] font-bold text-[8.5px] border border-[#10b981]/40">
                          STOCK
                        </span>
                      ) : isFuture ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#ffd600]/20 text-[#ffd600] font-bold text-[8.5px] border border-[#ffd600]/40">
                          /FUTURE
                        </span>
                      ) : (
                        <span className="font-bold uppercase text-white">{leg.type}</span>
                      );

                      return (
                        <tr
                          key={leg.id}
                          className={`hover:bg-[#1a1e22] transition-colors ${
                            !isEnabled ? 'opacity-40 bg-[#0d0f12]' : ''
                          }`}
                        >
                          <td className={sizeStyles.cellPadding}>
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleLegCheckbox(leg.id)}
                              className="cursor-pointer accent-[var(--accent)]"
                            />
                          </td>
                          <td className={sizeStyles.cellPadding}>{typeBadge}</td>
                          <td className={`${sizeStyles.cellPadding} font-bold uppercase`}>
                            <span className={leg.action === 'buy' ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}>
                              {leg.action}
                            </span>
                          </td>
                          <td className={`${sizeStyles.cellPadding} font-extrabold text-[#ffd600]`}>
                            {isStock ? (
                              `Basis: $${leg.premium.toFixed(2)}`
                            ) : isFuture ? (
                              `Basis: $${leg.premium.toFixed(2)}`
                            ) : (
                              <div className="flex items-center gap-1 font-mono">
                                <button
                                  onClick={() => handleShiftStrike(leg, 'down')}
                                  className="w-3.5 h-3.5 flex items-center justify-center bg-[#222830] hover:bg-[#333d4a] text-[#8c8c8c] hover:text-white rounded text-[9px]"
                                >
                                  -
                                </button>
                                <span>${leg.strike.toFixed(2)}</span>
                                <button
                                  onClick={() => handleShiftStrike(leg, 'up')}
                                  className="w-3.5 h-3.5 flex items-center justify-center bg-[#222830] hover:bg-[#333d4a] text-[#8c8c8c] hover:text-white rounded text-[9px]"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-[#8c8c8c]`}>
                            {leg.expiration}
                            {isOption && leg.dte > 0 ? (
                              <span className="text-[9.5px] text-[#666] ml-1">({leg.dte}d)</span>
                            ) : null}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-bold text-white font-mono`}>
                            ${leg.premium.toFixed(2)}
                          </td>
                          <td className={sizeStyles.cellPadding}>
                            {isOption ? (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-1 font-mono">
                                  <button
                                    onClick={() => handleUpdateLegIv(leg, effectiveIv - 0.01)}
                                    className="w-4 h-4 flex items-center justify-center bg-[#222830] hover:bg-[#333d4a] text-white rounded text-[10px]"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="500"
                                    value={Number((effectiveIv * 100).toFixed(1))}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val)) handleUpdateLegIv(leg, val / 100);
                                    }}
                                    className="w-14 px-1 py-0.5 bg-[#090b0e] border rounded text-right text-[11px] font-bold font-mono text-white border-[#2a3038]"
                                  />
                                  <button
                                    onClick={() => handleUpdateLegIv(leg, effectiveIv + 0.01)}
                                    className="w-4 h-4 flex items-center justify-center bg-[#222830] hover:bg-[#333d4a] text-white rounded text-[10px]"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[#555] text-center block font-mono">—</span>
                            )}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-mono`}>
                            <div className="font-bold text-white">${theoData.theoreticalPrice.toFixed(2)}</div>
                            <div className={`text-[9px] font-bold ${theoData.unrealizedPnL >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                              {theoData.unrealizedPnL >= 0 ? '+' : ''}${theoData.unrealizedPnL.toFixed(2)}
                            </div>
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right text-[#ccc] font-mono`}>
                            {isStock ? `${leg.contracts} shs` : isFuture ? `${leg.contracts} ct` : `${leg.contracts}x`}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-mono font-bold text-[#ff9900]`}>
                            {(() => {
                              let legBp = 0;
                              let rule = 'DEBIT';
                              if (isStock) {
                                legBp = currentPrice * leg.contracts * (leg.multiplier || 1) * 0.5;
                                rule = leg.action === 'buy' ? 'REG-T 50%' : 'SHORT 50%';
                              } else if (isFuture) {
                                legBp = leg.contracts * 12320;
                                rule = 'SPAN FUT';
                              } else if (leg.action === 'buy') {
                                legBp = leg.premium * 100 * leg.contracts;
                                rule = 'DEBIT 100%';
                              } else {
                                const mult = (leg.multiplier || 100) * leg.contracts;
                                const prem = leg.premium * mult;
                                if (leg.type === 'call') {
                                  const otm = Math.max(0, (leg.strike - currentPrice) * mult);
                                  legBp = Math.max(currentPrice * mult * 0.20 - otm + prem, currentPrice * mult * 0.10 + prem);
                                } else {
                                  const otm = Math.max(0, (currentPrice - leg.strike) * mult);
                                  legBp = Math.max(currentPrice * mult * 0.20 - otm + prem, leg.strike * mult * 0.10 + prem);
                                }
                                rule = 'RULE 4210';
                              }
                              return (
                                <div>
                                  <span>(${legBp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                  <span className="block text-[8px] text-[#8c8c8c] font-normal">{rule}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-mono font-bold`}>
                            <span className={theoData.delta >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}>
                              {theoData.delta >= 0 ? '+' : ''}{theoData.delta.toFixed(1)} Δ
                            </span>
                          </td>
                          {simulatedTradesViewMode === 'extended' && (
                            <td className={`${sizeStyles.cellPadding} text-right font-mono text-[#a855f7]`}>
                              {theoData.gamma ? theoData.gamma.toFixed(3) : '0.000'}
                            </td>
                          )}
                          <td className={`${sizeStyles.cellPadding} text-right font-mono text-[#00d2ff]`}>
                            {theoData.vega ? `${theoData.vega >= 0 ? '+' : ''}${theoData.vega.toFixed(2)}` : '0.00'}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-mono text-[#ffd600]`}>
                            {theoData.theta ? `${theoData.theta.toFixed(2)}` : '$0.00'}
                          </td>
                          {simulatedTradesViewMode === 'extended' && (
                            <>
                              <td className={`${sizeStyles.cellPadding} text-right font-mono text-[#38bdf8]`}>
                                {theoData.rho ? theoData.rho.toFixed(2) : '0.00'}
                              </td>
                              <td className={`${sizeStyles.cellPadding} text-right font-mono text-emerald-400 font-bold`}>
                                {(() => {
                                  const breakEven = isOption
                                    ? (leg.type === 'call' ? leg.strike + leg.premium : leg.strike - leg.premium)
                                    : leg.premium;
                                  return `$${breakEven.toFixed(2)}`;
                                })()}
                              </td>
                              <td className={`${sizeStyles.cellPadding} text-right font-mono text-amber-300 font-bold`}>
                                {(() => {
                                  const probItm = isOption
                                    ? Math.min(99.9, Math.max(0.1, Math.abs(theoData.delta / Math.max(1, (leg.multiplier || 100) * leg.contracts)) * 100))
                                    : 100;
                                  return `${probItm.toFixed(1)}%`;
                                })()}
                              </td>
                            </>
                          )}
                          <td className={`${sizeStyles.cellPadding} text-center`}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleDuplicateLeg(leg)}
                                title="Duplicate Leg"
                                className="p-1 text-[#8c8c8c] hover:text-[#00e5ff] rounded hover:bg-[#00e5ff]/10"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleInvertLeg(leg)}
                                title="Invert Side"
                                className="p-1 text-[#8c8c8c] hover:text-[#ffd600] rounded hover:bg-[#ffd600]/10"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                              {sourceMode === 'builder' ? (
                                <button
                                  onClick={() => {
                                    playKeyClick();
                                    onRemoveLeg(leg.id);
                                  }}
                                  title="Remove Leg"
                                  className="p-1 text-[#8c8c8c] hover:text-[#ef4444] rounded hover:bg-[#ef4444]/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[#444] text-[9px] px-1">LOCK</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-[#262a30] bg-[#121417] text-[10px] font-mono">
                    <tr>
                      <td colSpan={5} className={`${sizeStyles.cellPadding} font-bold text-[#8c8c8c]`}>
                        <span className="text-[#38bdf8] font-black mr-2">NET STRATEGY COLLATERAL:</span>
                        <span className="text-white">Rule 4210 / FINRA Standard Portfolio Margin</span>
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-white`}>
                        ${analysis.netDebitCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-center text-[#c084fc] font-bold`}>
                        {allSourceLegs.length} LEGS
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-white`}>
                        —
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-white`}>
                        {allSourceLegs.reduce((sum, l) => sum + l.contracts, 0)}x
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-black text-[#ff9900]`}>
                        (${analysis.marginBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        <div className="text-[8px] text-[#8c8c8c] font-normal">
                          {analysis.marginType.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold ${analysis.totalDelta >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>
                        {analysis.totalDelta >= 0 ? '+' : ''}{analysis.totalDelta.toFixed(1)} Δ
                      </td>
                      {simulatedTradesViewMode === 'extended' && (
                        <td className={`${sizeStyles.cellPadding} text-right font-bold text-[#a855f7]`}>
                          {analysis.totalGamma.toFixed(3)} Γ
                        </td>
                      )}
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-[#00d2ff]`}>
                        ${analysis.totalVega.toFixed(2)}
                      </td>
                      <td className={`${sizeStyles.cellPadding} text-right font-bold text-[#ffd600]`}>
                        ${analysis.totalTheta.toFixed(2)}
                      </td>
                      {simulatedTradesViewMode === 'extended' && (
                        <>
                          <td className={`${sizeStyles.cellPadding} text-right font-bold text-[#38bdf8]`}>
                            ${analysis.totalRho.toFixed(2)}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-bold text-emerald-400`}>
                            {analysis.breakEvens && analysis.breakEvens.length > 0 ? `$${analysis.breakEvens[0].toFixed(2)}` : '—'}
                          </td>
                          <td className={`${sizeStyles.cellPadding} text-right font-bold text-amber-300`}>
                            {analysis.probOfProfit}%
                          </td>
                        </>
                      )}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer Bar */}
            <div className="bg-[#171e28] border-t border-[#253346] px-4 py-2.5 flex items-center justify-between text-[10px] text-[#8c8c8c]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[#ff9900]">
                  <Shield className="w-3.5 h-3.5 text-[#ff9900]" />
                  <span>Rule 4210 Margin Approved: (${analysis.marginBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
                </span>
                <span>·</span>
                <span>All legs synchronized with live BSM theoretical valuation model</span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenStrategyExecution && (
                  <button
                    onClick={() => {
                      playKeyClick();
                      setIsSimulatedTradesModalOpen(false);
                      onOpenStrategyExecution();
                    }}
                    className="px-2.5 py-1 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold rounded flex items-center gap-1 transition-all"
                  >
                    <Zap className="w-3 h-3 text-black" />
                    <span>EXECUTE MULTI-LEG ORDER</span>
                  </button>
                )}
                <button
                  onClick={() => setIsSimulatedTradesModalOpen(false)}
                  className="px-3 py-1 bg-[#222832] hover:bg-[#333d4d] text-white rounded font-bold border border-[#3b475a] transition-colors"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PORTFOLIO BETA WEIGHTING MODAL OVERLAY */}
      {isBetaWeightingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-150">
          <div className="bg-[#090d16] border-2 border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden text-[#e2e8f0]">
            <div className="bg-[#0f172a] px-4 py-3 border-b border-[#1e293b] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#38bdf8]" />
                <span className="font-mono font-black text-sm text-white">PORTFOLIO BETA WEIGHTING &amp; SYSTEMATIC RISK ANALYZER</span>
              </div>
              <button
                onClick={() => setIsBetaWeightingModalOpen(false)}
                className="p-1 rounded bg-[#1e293b] hover:bg-[#ff334b]/20 text-[#8b9bb4] hover:text-[#ff334b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(96vh-60px)]">
              <PortfolioBetaWeightingView
                positions={portfolioPositions}
                tickers={tickers}
                onSelectTicker={(sym) => {
                  setIsBetaWeightingModalOpen(false);
                  if (onSelectTicker) onSelectTicker(sym);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
