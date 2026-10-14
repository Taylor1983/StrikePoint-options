import { Position, Ticker, MarginHealthMetrics } from '../types/options';
import { getPositionMarginMetrics } from '../components/PositionsPortfolioView';
import { calculatePortfolioMarginInterest } from './marginInterest';

/**
 * Calculates real-time Margin Health, FINRA Rule 4210 Compliance, and Margin Interest & Borrow Costs
 */
export function calculateMarginHealth(
  cashBalance: number,
  positions: Position[],
  tickers?: Record<string, Ticker>,
  currency: 'USD' | 'CAD' = 'USD'
): MarginHealthMetrics {
  const currentMarkTotal = positions.reduce((sum, p) => sum + p.currentMark, 0);
  const netLiquidity = Math.max(1, cashBalance + currentMarkTotal);

  let initialMarginReq = 0;
  let grossNotionalExposure = 0;

  positions.forEach((pos) => {
    const spot = tickers?.[pos.ticker]?.price || (pos.legs[0]?.strike || 100);
    const { marginBp } = getPositionMarginMetrics(pos, spot);
    initialMarginReq += marginBp;

    // Gross Notional Exposure
    pos.legs.forEach((leg) => {
      const mult = leg.multiplier || (leg.type === 'stock' ? 1 : 100);
      grossNotionalExposure += spot * leg.contracts * mult;
    });
  });

  // FINRA Rule 4210 standard Maintenance Margin requirement (75% of initial requirement)
  const maintenanceMarginReq = Number((initialMarginReq * 0.75).toFixed(2));
  const optionsBuyingPower = Math.max(0, cashBalance - initialMarginReq);

  // Margin Cushion: dollar amount of equity available above maintenance requirement
  const marginCushionDollar = netLiquidity - maintenanceMarginReq;
  const marginCushionPercent = Number(((marginCushionDollar / netLiquidity) * 100).toFixed(1));

  // Leverage ratio
  const leverageRatio = Number((grossNotionalExposure / netLiquidity).toFixed(2));

  // Health score (0 - 100)
  let healthScore = 100;
  let status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' = 'EXCELLENT';
  let statusColor = '#00e676';

  if (maintenanceMarginReq === 0) {
    healthScore = 100;
    status = 'EXCELLENT';
    statusColor = '#00e676';
  } else if (marginCushionPercent >= 60) {
    healthScore = Math.min(100, Math.round(80 + (marginCushionPercent - 60) * 0.5));
    status = 'EXCELLENT';
    statusColor = '#00e676';
  } else if (marginCushionPercent >= 30) {
    healthScore = Math.round(60 + (marginCushionPercent - 30) * (20 / 30));
    status = 'GOOD';
    statusColor = '#38bdf8';
  } else if (marginCushionPercent >= 15) {
    healthScore = Math.round(40 + (marginCushionPercent - 15) * (20 / 15));
    status = 'WARNING';
    statusColor = '#ffd600';
  } else {
    healthScore = Math.max(0, Math.round(Math.max(0, marginCushionPercent) * (39 / 15)));
    status = 'CRITICAL';
    statusColor = '#ff334b';
  }

  // Estimated drop in SPY before a maintenance margin call
  const effectiveLeverage = Math.max(1, leverageRatio);
  const spyDropTolerancePct = Number((Math.max(0, marginCushionPercent) / effectiveLeverage).toFixed(1));

  const spyPrice = tickers?.['SPY']?.price || 568.25;
  const liquidationSpyPrice = Number((spyPrice * (1 - spyDropTolerancePct / 100)).toFixed(2));

  const now = new Date();
  const telemetryTimestamp = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');

  const isMarginCall = marginCushionDollar <= 0;
  const isWarning = marginCushionPercent < 25;

  const marginInterestSummary = calculatePortfolioMarginInterest(cashBalance, positions, tickers, currency);

  return {
    healthScore,
    status,
    statusColor,
    netLiquidity: Number(netLiquidity.toFixed(2)),
    initialMarginReq: Number(initialMarginReq.toFixed(2)),
    maintenanceMarginReq,
    marginCushionDollar: Number(marginCushionDollar.toFixed(2)),
    marginCushionPercent,
    optionsBuyingPower: Number(optionsBuyingPower.toFixed(2)),
    grossNotionalExposure: Number(grossNotionalExposure.toFixed(2)),
    leverageRatio,
    spyDropTolerancePct,
    liquidationSpyPrice,
    telemetryTimestamp,
    isMarginCall,
    isWarning,
    marginInterestSummary,
  };
}
