import { ExpirationOptionChain, Ticker } from '../types/options';
import { calculateBSM } from './blackScholes';

export interface SurfacePoint {
  strike: number;
  moneyness: number; // K / S * 100
  dte: number;
  timeToExpiry: number; // in years (T)
  iv: number; // implied volatility (e.g. 0.28)
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  skewSlope: number; // dIV / dMoneyness
  termSlope: number; // dIV / dDTE
}

export interface MarketKnotPoint {
  strike: number;
  moneyness: number;
  dte: number;
  formattedDate: string;
  iv: number;
  type: 'call' | 'put' | 'atm';
  volume: number;
  openInterest: number;
  x: number; // normalized [-1, 1]
  y: number; // normalized [0, 1]
  z: number; // normalized [-1, 1]
}

export interface SurfaceGridData {
  strikes: number[];
  moneynessList: number[];
  dtes: number[];
  // grid[dteIndex][strikeIndex]
  grid: SurfacePoint[][];
  minIV: number;
  maxIV: number;
  avgIV: number;
  minStrike: number;
  maxStrike: number;
  minDte: number;
  maxDte: number;
  marketKnots: MarketKnotPoint[];
  atmTermCurve: { dte: number; iv: number; formattedDate: string }[];
}

export interface SurfaceShocks {
  parallelBump: number; // e.g. +0.02 (+2% IV)
  skewTwist: number; // multiplier e.g. 1.2 (+20% steeper put skew)
  termInversion: number; // e.g. +0.05 (+5% front month spike)
}

/**
 * Builds a dense, interpolated 3D volatility surface grid from the actual market chains
 */
export function generate3DVolatilitySurface(
  ticker: Ticker,
  chains: ExpirationOptionChain[],
  shocks: SurfaceShocks = { parallelBump: 0, skewTwist: 1.0, termInversion: 0 },
  gridResX: number = 32, // number of strike samples
  gridResZ: number = 24  // number of DTE samples
): SurfaceGridData {
  const spot = ticker.price;
  const validChains = chains && chains.length > 0 ? chains : [];

  // Determine DTE range
  const sortedChains = [...validChains].sort((a, b) => a.dte - b.dte);
  const minChainDte = sortedChains[0]?.dte || 7;
  const maxChainDte = sortedChains[sortedChains.length - 1]?.dte || 180;

  // Discrete DTE sample nodes (denser at front months where skew changes rapidly)
  const dtes: number[] = [];
  for (let j = 0; j < gridResZ; j++) {
    // Non-linear power distribution to give higher resolution to front month tenors
    const tFrac = Math.pow(j / (gridResZ - 1), 1.35);
    const d = Math.round(minChainDte + tFrac * (maxChainDte - minChainDte));
    if (!dtes.includes(d)) {
      dtes.push(d);
    }
  }
  // Ensure we include every exact market expiration DTE
  sortedChains.forEach((c) => {
    if (!dtes.includes(c.dte)) {
      dtes.push(c.dte);
    }
  });
  dtes.sort((a, b) => a - b);

  // Strike / Moneyness range: 75% to 125% of spot
  const minMoneyness = 76;
  const maxMoneyness = 124;
  const moneynessList: number[] = [];
  const strikes: number[] = [];

  for (let i = 0; i < gridResX; i++) {
    const m = minMoneyness + (i / (gridResX - 1)) * (maxMoneyness - minMoneyness);
    moneynessList.push(Number(m.toFixed(1)));
    strikes.push(Number(((m / 100) * spot).toFixed(2)));
  }

  // Extract raw market knot points for rendering on top of the surface
  const marketKnots: MarketKnotPoint[] = [];
  sortedChains.forEach((c) => {
    const isFront = c.dte <= 30;
    // Sample key strikes
    const combinedContracts = [
      ...c.puts.filter((p) => p.strike < spot * 0.99).slice(-5),
      ...c.calls.filter((call) => call.strike >= spot * 0.99).slice(0, 5),
    ];

    combinedContracts.forEach((contract) => {
      const m = (contract.strike / spot) * 100;
      if (m >= minMoneyness && m <= maxMoneyness) {
        const isPut = contract.strike < spot;
        marketKnots.push({
          strike: contract.strike,
          moneyness: Number(m.toFixed(1)),
          dte: c.dte,
          formattedDate: c.formattedDate,
          iv: contract.iv,
          type: Math.abs(m - 100) < 1.5 ? 'atm' : isPut ? 'put' : 'call',
          volume: contract.volume,
          openInterest: contract.openInterest,
          x: 0,
          y: 0,
          z: 0,
        });
      }
    });
  });

  // Calculate ATM Term Structure Curve
  const atmTermCurve = sortedChains.map((c) => {
    const atmCall = c.calls.reduce((prev, curr) =>
      Math.abs(curr.strike - spot) < Math.abs(prev.strike - spot) ? curr : prev
    );
    return {
      dte: c.dte,
      iv: atmCall.iv,
      formattedDate: c.formattedDate,
    };
  });

  // Interpolation helper: get IV from nearest market chains
  const getInterpolatedIV = (strike: number, dte: number): number => {
    const moneyness = (strike / spot) * 100;
    const T = Math.max(0.01, dte / 365);

    // Find bounding chains
    let prevChain = sortedChains[0];
    let nextChain = sortedChains[sortedChains.length - 1];

    for (let k = 0; k < sortedChains.length; k++) {
      if (sortedChains[k].dte <= dte) {
        prevChain = sortedChains[k];
      }
      if (sortedChains[k].dte >= dte) {
        nextChain = sortedChains[k];
        break;
      }
    }

    const getChainIV = (c: ExpirationOptionChain, targetStrike: number): number => {
      // Find closest call/put
      const isPut = targetStrike < spot;
      const pool = isPut ? c.puts : c.calls;
      if (!pool || pool.length === 0) return c.avgIV;

      // Find two nearest strikes
      let lower = pool[0];
      let upper = pool[pool.length - 1];

      for (let i = 0; i < pool.length; i++) {
        if (pool[i].strike <= targetStrike) lower = pool[i];
        if (pool[i].strike >= targetStrike) {
          upper = pool[i];
          break;
        }
      }

      if (lower.strike === upper.strike) {
        return lower.iv;
      }
      const weight = (targetStrike - lower.strike) / (upper.strike - lower.strike);
      return lower.iv + weight * (upper.iv - lower.iv);
    };

    let baseIV: number;
    if (prevChain.dte === nextChain.dte) {
      baseIV = getChainIV(prevChain, strike);
    } else {
      const iv1 = getChainIV(prevChain, strike);
      const iv2 = getChainIV(nextChain, strike);
      // Interpolate along sqrt(time) as per standard stochastic volatility decay
      const w = (Math.sqrt(dte) - Math.sqrt(prevChain.dte)) / (Math.sqrt(nextChain.dte) - Math.sqrt(prevChain.dte) || 1);
      baseIV = iv1 + Math.max(0, Math.min(1, w)) * (iv2 - iv1);
    }

    // Apply Institutional Shocks (Parallel, Skew Twist, Term Inversion)
    // Skew twist increases OTM put steepness:
    const mDist = (100 - moneyness) / 100; // positive for OTM puts
    const skewEffect = mDist * (shocks.skewTwist - 1.0) * 0.22;

    // Term inversion shock: front month event spike decays with sqrt(T)
    const termInversionEffect = shocks.termInversion * Math.max(0, 1 - Math.sqrt(dte / 90));

    // Parallel bump
    const bumpedIV = baseIV + shocks.parallelBump + skewEffect + termInversionEffect;

    // Minimum boundary safeguard
    return Math.max(0.04, Number(bumpedIV.toFixed(4)));
  };

  let minIV = Infinity;
  let maxIV = -Infinity;
  let sumIV = 0;
  let totalPoints = 0;

  // Build 2D grid matrix
  const grid: SurfacePoint[][] = [];

  for (let j = 0; j < dtes.length; j++) {
    const dte = dtes[j];
    const T = Math.max(0.01, dte / 365);
    const row: SurfacePoint[] = [];

    for (let i = 0; i < strikes.length; i++) {
      const strike = strikes[i];
      const moneyness = moneynessList[i];
      const iv = getInterpolatedIV(strike, dte);

      minIV = Math.min(minIV, iv);
      maxIV = Math.max(maxIV, iv);
      sumIV += iv;
      totalPoints++;

      // Compute Black-Scholes Greeks at this node
      const isCall = strike >= spot;
      const bsm = calculateBSM(spot, strike, T, iv, isCall ? 'call' : 'put');

      // Local derivatives estimation
      const dM = 1.0;
      const ivPlus = getInterpolatedIV(strike * (1 + 0.01), dte);
      const ivMinus = getInterpolatedIV(strike * (1 - 0.01), dte);
      const skewSlope = (ivPlus - ivMinus) / 2;

      const dtePlus = getInterpolatedIV(strike, Math.min(maxChainDte, dte + 5));
      const dteMinus = getInterpolatedIV(strike, Math.max(minChainDte, dte - 5));
      const termSlope = (dtePlus - dteMinus) / 10;

      row.push({
        strike,
        moneyness,
        dte,
        timeToExpiry: T,
        iv,
        greeks: {
          delta: bsm.greeks.delta,
          gamma: bsm.greeks.gamma,
          theta: bsm.greeks.theta,
          vega: bsm.greeks.vega,
        },
        skewSlope,
        termSlope,
      });
    }
    grid.push(row);
  }

  const avgIV = totalPoints > 0 ? sumIV / totalPoints : ticker.currentIV;

  return {
    strikes,
    moneynessList,
    dtes,
    grid,
    minIV,
    maxIV,
    avgIV,
    minStrike: strikes[0],
    maxStrike: strikes[strikes.length - 1],
    minDte: dtes[0],
    maxDte: dtes[dtes.length - 1],
    marketKnots,
    atmTermCurve,
  };
}

/**
 * Institutional Colormaps for 3D Surface Heatmap
 */
export type ColorMapId = 'bloomberg' | 'turbo' | 'cyberpunk' | 'viridis' | 'icefire';

export function getSurfaceColor(t: number, colormap: ColorMapId): { r: number; g: number; b: number; hex: string } {
  const clampT = Math.max(0, Math.min(1, t));

  let r = 0;
  let g = 0;
  let b = 0;

  switch (colormap) {
    case 'bloomberg': {
      // Dark Blue -> Dark Amber -> Glowing Bloomberg Gold -> Intense Coral Red
      if (clampT < 0.3) {
        const f = clampT / 0.3;
        r = Math.floor(10 + f * 50);
        g = Math.floor(25 + f * 70);
        b = Math.floor(70 + f * 50);
      } else if (clampT < 0.65) {
        const f = (clampT - 0.3) / 0.35;
        r = Math.floor(60 + f * 195);
        g = Math.floor(95 + f * 60);
        b = Math.floor(120 - f * 110);
      } else if (clampT < 0.88) {
        const f = (clampT - 0.65) / 0.23;
        r = 255;
        g = Math.floor(155 - f * 40);
        b = Math.floor(10 - f * 10);
      } else {
        const f = (clampT - 0.88) / 0.12;
        r = 255;
        g = Math.floor(115 - f * 75);
        b = Math.floor(f * 50);
      }
      break;
    }
    case 'turbo': {
      // Turbo colormap approximation
      const x = clampT;
      r = Math.floor(Math.sin(Math.PI * (x - 0.25)) * 127 + 128);
      g = Math.floor(Math.sin(Math.PI * x) * 127 + 128);
      b = Math.floor(Math.sin(Math.PI * (x + 0.25)) * 127 + 128);
      break;
    }
    case 'cyberpunk': {
      // Deep Violet (#240046) -> Electric Magenta (#ff007f) -> Neon Cyan (#00f5d4)
      if (clampT < 0.5) {
        const f = clampT / 0.5;
        r = Math.floor(36 + f * 219);
        g = Math.floor(0 + f * 0);
        b = Math.floor(70 + f * 57);
      } else {
        const f = (clampT - 0.5) / 0.5;
        r = Math.floor(255 - f * 255);
        g = Math.floor(f * 245);
        b = Math.floor(127 + f * 85);
      }
      break;
    }
    case 'viridis': {
      // Viridis: Deep purple -> Emerald -> Bright lime yellow
      const x = clampT;
      r = Math.floor(Math.max(0, Math.min(255, 68 + x * 187)));
      g = Math.floor(Math.max(0, Math.min(255, 1 + x * 231)));
      b = Math.floor(Math.max(0, Math.min(255, 84 + (1 - x) * 120)));
      break;
    }
    case 'icefire': {
      // Cold Ice Blue (#00b4d8) -> Neutral (#48cae4) -> Burning Orange Red (#f72585)
      if (clampT < 0.5) {
        const f = clampT / 0.5;
        r = Math.floor(0 + f * 70);
        g = Math.floor(180 + f * 22);
        b = Math.floor(216 + f * 12);
      } else {
        const f = (clampT - 0.5) / 0.5;
        r = Math.floor(70 + f * 177);
        g = Math.floor(202 - f * 165);
        b = Math.floor(228 - f * 95);
      }
      break;
    }
  }

  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  return { r, g, b, hex };
}
