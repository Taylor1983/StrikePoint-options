export interface OpecIvTimelinePoint {
  dayOffset: number; // e.g. -15, -10, -5, -3, -2, -1, 0, 1, 2, 3, 5
  dayLabel: string;  // e.g. "-15d", "-10d", "-5d", "-2d", "-1d", "Day 0 (Decision)", "+1d", "+3d", "+5d"
  date: string;
  iv: number;        // Implied Volatility (in %, e.g. 42.5)
  wtiPrice: number;  // /CL spot price (USD/bbl)
  callSkewIv: number;// 25-delta call IV (in %)
  putSkewIv: number; // 25-delta put IV (in %)
  ovxIndex: number;  // CBOE Crude Oil Volatility Index
  straddlePrice: number; // Price of ATM front-month straddle
  commentary: string;
}

export interface OpecMeetingEvent {
  id: string;
  name: string;
  type: 'ONOMM' | 'JMMC' | 'EXTRAORDINARY' | 'EIA_INVENTORY' | 'IEA_REPORT';
  typeLabel: string;
  date: string;
  decisionTime: string;
  location: string;
  status: 'upcoming' | 'completed';
  daysToEvent: number; // positive = days until upcoming, negative = days past
  quotaAction: string;
  policySummary: string;
  keyDrivers: string[];
  // Spot Price reaction
  wtiSpotBefore: number;
  wtiSpotAfter?: number;
  wtiChangeDollar?: number;
  wtiChangePct?: number;
  // Implied Volatility Metrics
  iv15dPrior: number; // IV at -15 days
  ivPeakPreMeeting: number; // Peak IV right before decision (Day -1 or Day 0 AM)
  ivPostMeeting: number; // IV after announcement settles (Day +1)
  ivRunUpPts: number; // ivPeakPreMeeting - iv15dPrior
  ivCrushPts: number; // ivPostMeeting - ivPeakPreMeeting (negative)
  ivCrushPct: number; // (ivCrushPts / ivPeakPreMeeting) * 100
  // Straddle & Expected Move
  impliedMovePct: number; // Expected move priced into straddle
  realizedMovePct?: number; // Actual move over the event window
  straddleWinner?: 'SHORT_CRUSH' | 'LONG_STRADDLE' | 'NEUTRAL';
  ivTimeline: OpecIvTimelinePoint[];
  skewOrientation: 'CALL_SKEW_ELEVATED' | 'PUT_SKEW_ELEVATED' | 'SYMMETRIC';
  recommendedStrategies: {
    name: string;
    description: string;
    rationale: string;
    legs: string;
    riskProfile: 'Defined Risk' | 'High Vega Exposure' | 'Theta Positive';
  }[];
}

export interface OpecIvAggregateStats {
  avgPreMeetingRunUpPts: number; // e.g. +7.4 vol pts
  avgPreMeetingRunUpPct: number; // e.g. +22.8%
  avgPostMeetingCrushPts: number; // e.g. -11.2 vol pts
  avgPostMeetingCrushPct: number; // e.g. -27.5%
  avgImpliedMovePct: number;     // e.g. ±5.2%
  avgRealizedMovePct: number;    // e.g. ±3.6%
  shortStraddleWinRate: number;  // e.g. 69.2%
  totalMeetingsAnalyzed: number;
  currentOvx: number;
  currentOvxPercentile: number;
  currentWtiSpot: number;
  nextMeetingDate: string;
  daysToNextMeeting: number;
}

export const OPEC_AGGREGATE_STATS: OpecIvAggregateStats = {
  avgPreMeetingRunUpPts: 7.8,
  avgPreMeetingRunUpPct: 24.3,
  avgPostMeetingCrushPts: -10.9,
  avgPostMeetingCrushPct: -26.8,
  avgImpliedMovePct: 5.4,
  avgRealizedMovePct: 3.8,
  shortStraddleWinRate: 71.4,
  totalMeetingsAnalyzed: 14,
  currentOvx: 38.6,
  currentOvxPercentile: 58,
  currentWtiSpot: 68.45,
  nextMeetingDate: 'Oct 02, 2026',
  daysToNextMeeting: 2,
};

export const OPEC_MEETINGS_DATA: OpecMeetingEvent[] = [
  {
    id: 'opec-2026-10-jmmc',
    name: '57th Meeting of the Joint Ministerial Monitoring Committee (JMMC)',
    type: 'JMMC',
    typeLabel: 'OPEC+ JMMC Review',
    date: 'Oct 02, 2026',
    decisionTime: '13:00 CEST (07:00 EDT)',
    location: 'Videoconference (Vienna Secretariat Host)',
    status: 'upcoming',
    daysToEvent: 2,
    quotaAction: 'Production Quota Review & 2.2 mb/d Cut Roll-Over Assessment',
    policySummary:
      'The 8 core OPEC+ nations (Saudi Arabia, Russia, Iraq, UAE, Kuwait, Kazakhstan, Algeria, Oman) evaluate oil demand trends and compliance with pledged compensation cuts. Consensus expects voluntary cuts of 2.2 mb/d to remain firmly in place.',
    keyDrivers: [
      'Sluggish Chinese refining margins vs. US SPR refilling demand',
      'Geopolitical risk premium in Persian Gulf & Red Sea shipping lanes',
      'Strict scrutiny of Iraq and Kazakhstan historical quota overproduction',
      'Fed rate cuts and dollar index softening supporting commodity carry',
    ],
    wtiSpotBefore: 68.45,
    iv15dPrior: 29.4,
    ivPeakPreMeeting: 38.6,
    ivPostMeeting: 30.5,
    ivRunUpPts: 9.2,
    ivCrushPts: -8.1,
    ivCrushPct: -21.0,
    impliedMovePct: 5.6,
    skewOrientation: 'CALL_SKEW_ELEVATED',
    recommendedStrategies: [
      {
        name: 'Calendar Spread (Sell Front / Buy Back)',
        description: 'Sell front-month OCT $70 Call (IV 39.2%), Buy DEC $70 Call (IV 31.5%).',
        rationale: 'Front-month options carry the bloated OPEC risk premium. Post-meeting IV collapse crushes the short leg while the back-month leg retains value.',
        legs: 'Short 1x OCT /CL Call + Long 1x DEC /CL Call',
        riskProfile: 'Defined Risk',
      },
      {
        name: 'Iron Condor (Play Overpriced Implied Move)',
        description: 'Sell 64 Put / 73 Call Strangle, Buy 61 Put / 76 Call Wings.',
        rationale: 'Implied move is ±$3.85 (5.6%). Historical JMMC meetings realize moves of only ±$1.90. Volatility crush ensures rapid premium decay.',
        legs: 'Buy 61P, Sell 64P, Sell 73C, Buy 76C',
        riskProfile: 'Defined Risk',
      },
      {
        name: 'Reverse Risk Reversal (Supply Cut Surprise Hedge)',
        description: 'Buy OTM $72 Call, funded by Selling OTM $64 Put.',
        rationale: 'Asymmetric exposure to a surprise unilateral Saudi reduction or deeper quota discipline.',
        legs: 'Long 72C + Short 64P',
        riskProfile: 'High Vega Exposure',
      },
    ],
    ivTimeline: [
      { dayOffset: -15, dayLabel: '-15d', date: 'Sep 17', iv: 29.4, wtiPrice: 66.80, callSkewIv: 28.9, putSkewIv: 30.2, ovxIndex: 28.5, straddlePrice: 3.10, commentary: 'Baseline volatility ahead of schedule release; standard contango pricing' },
      { dayOffset: -12, dayLabel: '-12d', date: 'Sep 20', iv: 30.8, wtiPrice: 67.15, callSkewIv: 30.5, putSkewIv: 31.3, ovxIndex: 29.8, straddlePrice: 3.25, commentary: 'OPEC delegates hint at steady quotas; market begins pricing event window' },
      { dayOffset: -10, dayLabel: '-10d', date: 'Sep 22', iv: 32.2, wtiPrice: 67.50, callSkewIv: 32.8, putSkewIv: 32.0, ovxIndex: 31.4, straddlePrice: 3.42, commentary: 'Commodity desk macro hedges initiate; IV starts steepening upward' },
      { dayOffset: -7, dayLabel: '-7d', date: 'Sep 25', iv: 34.0, wtiPrice: 66.90, callSkewIv: 35.1, putSkewIv: 33.6, ovxIndex: 33.2, straddlePrice: 3.58, commentary: 'Call skew flips positive as Middle East logistics headlines emerge' },
      { dayOffset: -5, dayLabel: '-5d', date: 'Sep 27', iv: 35.8, wtiPrice: 67.60, callSkewIv: 37.4, putSkewIv: 34.8, ovxIndex: 35.0, straddlePrice: 3.70, commentary: 'Front-week option open interest jumps +28% in 70 and 72 strikes' },
      { dayOffset: -3, dayLabel: '-3d', date: 'Sep 29', iv: 37.1, wtiPrice: 68.10, callSkewIv: 39.2, putSkewIv: 35.5, ovxIndex: 36.8, straddlePrice: 3.80, commentary: 'Heavy institutional volume in short-dated /CL Straddles bidding up ATM vol' },
      { dayOffset: -2, dayLabel: '-2d', date: 'Sep 30 (Today)', iv: 38.6, wtiPrice: 68.45, callSkewIv: 41.0, putSkewIv: 36.8, ovxIndex: 38.6, straddlePrice: 3.85, commentary: 'Current Market: Peak anticipation; implied daily move ±2.4% going into final sessions' },
      { dayOffset: -1, dayLabel: '-1d (Proj)', date: 'Oct 01', iv: 40.5, wtiPrice: 68.90, callSkewIv: 43.5, putSkewIv: 38.0, ovxIndex: 40.2, straddlePrice: 3.95, commentary: 'Projected eve-of-meeting peak IV; market fully prices headline uncertainty' },
      { dayOffset: 0, dayLabel: 'Day 0 (Decision)', date: 'Oct 02', iv: 36.0, wtiPrice: 69.50, callSkewIv: 37.0, putSkewIv: 35.0, ovxIndex: 35.5, straddlePrice: 3.10, commentary: 'Decision released 13:00 CEST: Immediate post-press-release volatility deflation begins' },
      { dayOffset: 1, dayLabel: '+1d (Crush)', date: 'Oct 03', iv: 30.5, wtiPrice: 69.20, callSkewIv: 30.8, putSkewIv: 30.4, ovxIndex: 30.0, straddlePrice: 2.45, commentary: 'Full IV Crush realized: Front-month ATM options shed ~8.1 vol pts (-21%)' },
      { dayOffset: 3, dayLabel: '+3d', date: 'Oct 05', iv: 28.8, wtiPrice: 68.80, callSkewIv: 28.6, putSkewIv: 29.2, ovxIndex: 28.2, straddlePrice: 2.20, commentary: 'Volatility normalizes back to 30-day realized baseline' },
    ],
  },
  {
    id: 'opec-2024-06-37th',
    name: '37th OPEC and non-OPEC Ministerial Meeting (ONOMM)',
    type: 'ONOMM',
    typeLabel: 'Ministerial Summit',
    date: 'Jun 02, 2024',
    decisionTime: '15:30 CEST',
    location: 'Riyadh / Vienna Hybrid',
    status: 'completed',
    daysToEvent: -120,
    quotaAction: 'Extended 2.2 mb/d voluntary cuts until end of Q3 2024, with gradual phaseout plan',
    policySummary:
      'Agreed to extend full 3.66 mb/d cuts to end of 2025 and extend the additional 2.2 mb/d voluntary cuts by 8 producers until end of September 2024, after which cuts would be gradually restored on monthly basis depending on market conditions.',
    keyDrivers: [
      'Macro demand worries in OECD nations and rising non-OPEC Americas supply',
      'UAE baseline quota raised by 300 kb/d to 3.519 mb/d for 2025',
      'Complex unwinding schedule created initial confusion in algorithmic trading desks',
    ],
    wtiSpotBefore: 77.00,
    wtiSpotAfter: 73.25,
    wtiChangeDollar: -3.75,
    wtiChangePct: -4.87,
    iv15dPrior: 26.5,
    ivPeakPreMeeting: 37.8,
    ivPostMeeting: 27.2,
    ivRunUpPts: 11.3,
    ivCrushPts: -10.6,
    ivCrushPct: -28.0,
    impliedMovePct: 4.8,
    realizedMovePct: 4.87,
    straddleWinner: 'SHORT_CRUSH',
    skewOrientation: 'PUT_SKEW_ELEVATED',
    recommendedStrategies: [
      {
        name: 'Short Front-Month Straddle',
        description: 'Sold $77 Straddle for $4.30. Post-crush liquidation value was $2.85.',
        rationale: 'Massive pre-meeting IV inflation of +11.3 pts evaporated within 18 hours of formal communique.',
        legs: 'Short 77C + Short 77P',
        riskProfile: 'Theta Positive',
      },
    ],
    ivTimeline: [
      { dayOffset: -15, dayLabel: '-15d', date: 'May 18, 2024', iv: 26.5, wtiPrice: 79.50, callSkewIv: 26.2, putSkewIv: 27.0, ovxIndex: 25.8, straddlePrice: 3.20, commentary: 'Initial baseline; markets quiet' },
      { dayOffset: -10, dayLabel: '-10d', date: 'May 23, 2024', iv: 29.2, wtiPrice: 78.10, callSkewIv: 29.0, putSkewIv: 30.1, ovxIndex: 28.4, straddlePrice: 3.50, commentary: 'Speculation on hybrid vs in-person format adds uncertainty' },
      { dayOffset: -5, dayLabel: '-5d', date: 'May 28, 2024', iv: 33.4, wtiPrice: 77.80, callSkewIv: 33.1, putSkewIv: 34.5, ovxIndex: 32.6, straddlePrice: 3.90, commentary: 'Funds accumulate downside put hedges; put skew expands' },
      { dayOffset: -2, dayLabel: '-2d', date: 'May 31, 2024', iv: 36.5, wtiPrice: 77.20, callSkewIv: 35.8, putSkewIv: 38.2, ovxIndex: 35.7, straddlePrice: 4.15, commentary: 'Pre-weekend risk off positioning; options bid aggressively' },
      { dayOffset: -1, dayLabel: '-1d', date: 'Jun 01, 2024', iv: 37.8, wtiPrice: 77.00, callSkewIv: 37.0, putSkewIv: 39.8, ovxIndex: 37.1, straddlePrice: 4.30, commentary: 'Eve of meeting peak IV; implied move reaches ±$3.70' },
      { dayOffset: 0, dayLabel: 'Day 0', date: 'Jun 02, 2024', iv: 32.0, wtiPrice: 75.80, callSkewIv: 31.5, putSkewIv: 33.5, ovxIndex: 31.8, straddlePrice: 3.40, commentary: 'Communique released outlining phaseout; sell-off starts' },
      { dayOffset: 1, dayLabel: '+1d', date: 'Jun 03, 2024', iv: 27.2, wtiPrice: 73.25, callSkewIv: 27.0, putSkewIv: 28.5, ovxIndex: 27.0, straddlePrice: 2.85, commentary: 'IV Crush of -10.6 pts (-28%); spot drops on unwinding schedule concerns' },
      { dayOffset: 3, dayLabel: '+3d', date: 'Jun 05, 2024', iv: 25.8, wtiPrice: 74.10, callSkewIv: 25.5, putSkewIv: 26.8, ovxIndex: 25.4, straddlePrice: 2.50, commentary: 'Stabilization as Saudi Energy Minister clarifies phaseout is conditional' },
      { dayOffset: 5, dayLabel: '+5d', date: 'Jun 07, 2024', iv: 24.9, wtiPrice: 75.50, callSkewIv: 24.8, putSkewIv: 25.6, ovxIndex: 24.6, straddlePrice: 2.30, commentary: 'Normal trading range restored' },
    ],
  },
  {
    id: 'opec-2023-04-surprise',
    name: 'Extraordinary Voluntary Cut Announcement (Surprise Action)',
    type: 'EXTRAORDINARY',
    typeLabel: 'Surprise Quota Action',
    date: 'Apr 02, 2023',
    decisionTime: '17:00 Riyadh (Weekend announcement)',
    location: 'Coordinated Diplomatic Statements',
    status: 'completed',
    daysToEvent: -545,
    quotaAction: 'Surprise 1.66 mb/d Voluntary Production Cut',
    policySummary:
      'Saudi Arabia announced 500,000 bpd voluntary reduction, joined by Iraq (211k), UAE (144k), Kuwait (128k), Kazakhstan (78k), Algeria (48k), Oman (40k), and Russia extending 500k bpd cut to year-end. Total cuts reached ~1.66 million bpd.',
    keyDrivers: [
      'Proactive retaliation against speculative short sellers betting on banking crisis contagion',
      'Followed collapse of Silicon Valley Bank and Credit Suisse which pushed WTI briefly to $64',
      'Weekend timing caught global commodity markets completely flat-footed',
    ],
    wtiSpotBefore: 75.67,
    wtiSpotAfter: 80.42,
    wtiChangeDollar: 4.75,
    wtiChangePct: 6.28,
    iv15dPrior: 38.2,
    ivPeakPreMeeting: 34.5, // Note: Surprise event had lower pre-event IV, followed by immediate post-gap volatility surge!
    ivPostMeeting: 46.8,
    ivRunUpPts: -3.7,
    ivCrushPts: 12.3, // Inverse crush: IV exploded higher because of weekend surprise gap!
    ivCrushPct: 35.6,
    impliedMovePct: 3.4,
    realizedMovePct: 6.28,
    straddleWinner: 'LONG_STRADDLE',
    skewOrientation: 'CALL_SKEW_ELEVATED',
    recommendedStrategies: [
      {
        name: 'Long OTM Call Spread (Outsized Realized Move)',
        description: 'Long $78 / $84 Call Spreads gained +340% at Monday open.',
        rationale: 'Surprise weekend announcement blew past implied move band (+6.28% vs ±3.4% implied), generating huge gamma profits.',
        legs: 'Long 78C + Short 84C',
        riskProfile: 'Defined Risk',
      },
    ],
    ivTimeline: [
      { dayOffset: -10, dayLabel: '-10d', date: 'Mar 23, 2023', iv: 39.5, wtiPrice: 69.80, callSkewIv: 38.0, putSkewIv: 42.0, ovxIndex: 39.2, straddlePrice: 3.80, commentary: 'Post-banking turmoil recovery; put skew heavy' },
      { dayOffset: -5, dayLabel: '-5d', date: 'Mar 28, 2023', iv: 36.2, wtiPrice: 73.20, callSkewIv: 35.5, putSkewIv: 37.8, ovxIndex: 36.0, straddlePrice: 3.50, commentary: 'Oil rallies; volatility contracting as calm returns' },
      { dayOffset: -2, dayLabel: '-2d', date: 'Mar 31, 2023', iv: 34.5, wtiPrice: 75.67, callSkewIv: 34.0, putSkewIv: 35.8, ovxIndex: 34.2, straddlePrice: 3.35, commentary: 'Friday close with no anticipation of any major policy change' },
      { dayOffset: 0, dayLabel: 'Sun (Surprise)', date: 'Apr 02, 2023', iv: 34.5, wtiPrice: 75.67, callSkewIv: 34.0, putSkewIv: 35.8, ovxIndex: 34.2, straddlePrice: 3.35, commentary: 'Weekend shock: 1.66 mb/d surprise cut announced across wire services' },
      { dayOffset: 1, dayLabel: 'Mon (Gap Up)', date: 'Apr 03, 2023', iv: 46.8, wtiPrice: 80.42, callSkewIv: 52.0, putSkewIv: 41.5, ovxIndex: 45.9, straddlePrice: 5.10, commentary: 'Massive $5 gap at globex open; Call skew skyrockets as shorts scramble to cover' },
      { dayOffset: 3, dayLabel: '+3d', date: 'Apr 05, 2023', iv: 41.2, wtiPrice: 80.70, callSkewIv: 44.5, putSkewIv: 38.0, ovxIndex: 40.5, straddlePrice: 4.40, commentary: 'Price consolidates around $80; IV slowly softens' },
      { dayOffset: 5, dayLabel: '+5d', date: 'Apr 07, 2023', iv: 36.5, wtiPrice: 80.70, callSkewIv: 38.0, putSkewIv: 35.5, ovxIndex: 36.1, straddlePrice: 3.80, commentary: 'Vol premium recedes as new price baseline is established' },
    ],
  },
  {
    id: 'opec-2023-06-35th',
    name: '35th OPEC and non-OPEC Ministerial Meeting (Saudi Lollipop Cut)',
    type: 'ONOMM',
    typeLabel: 'Ministerial Summit',
    date: 'Jun 04, 2023',
    decisionTime: '18:00 CEST',
    location: 'Vienna Headquarters, Austria',
    status: 'completed',
    daysToEvent: -482,
    quotaAction: 'Saudi Arabia 1.0 mb/d Unilateral Voluntary "Lollipop" Reduction',
    policySummary:
      'Official quotas extended through end of 2024. Saudi Prince Abdulaziz bin Salman announced a standalone, unilateral 1.0 mb/d cut for July ("Saudi lollipop"), while African member baselines (Angola, Nigeria) were adjusted downward.',
    keyDrivers: [
      'Standoff with African producers regarding reduced baseline quotas',
      'Warning to speculative short-sellers ("Ouch" warning)',
      'High IV run-up in the 7 days prior driven by heated negotiation leaks',
    ],
    wtiSpotBefore: 71.74,
    wtiSpotAfter: 73.15,
    wtiChangeDollar: 1.41,
    wtiChangePct: 1.97,
    iv15dPrior: 32.0,
    ivPeakPreMeeting: 44.5,
    ivPostMeeting: 33.1,
    ivRunUpPts: 12.5,
    ivCrushPts: -11.4,
    ivCrushPct: -25.6,
    impliedMovePct: 5.8,
    realizedMovePct: 1.97,
    straddleWinner: 'SHORT_CRUSH',
    skewOrientation: 'CALL_SKEW_ELEVATED',
    recommendedStrategies: [
      {
        name: 'Short ATM Straddle (Classic Vol Crush Trade)',
        description: 'Sold $72 Straddle into Friday close at $4.65; closed at $2.90 on Monday.',
        rationale: 'Implied move was 5.8%, but actual move was only 1.97%. Massive 11.4 vol pt crush yielded 37% gain on the straddle premium.',
        legs: 'Short 72C + Short 72P',
        riskProfile: 'Theta Positive',
      },
    ],
    ivTimeline: [
      { dayOffset: -15, dayLabel: '-15d', date: 'May 20, 2023', iv: 32.0, wtiPrice: 71.50, callSkewIv: 31.8, putSkewIv: 32.5, ovxIndex: 31.5, straddlePrice: 3.30, commentary: 'Early baseline' },
      { dayOffset: -10, dayLabel: '-10d', date: 'May 25, 2023', iv: 34.8, wtiPrice: 72.80, callSkewIv: 35.2, putSkewIv: 34.8, ovxIndex: 34.0, straddlePrice: 3.65, commentary: 'Saudi Energy Minister warns short sellers to "watch out"' },
      { dayOffset: -5, dayLabel: '-5d', date: 'May 30, 2023', iv: 38.6, wtiPrice: 69.40, callSkewIv: 39.5, putSkewIv: 38.2, ovxIndex: 38.0, straddlePrice: 4.10, commentary: 'Conflicting Russian comments cause volatility whipsaws' },
      { dayOffset: -2, dayLabel: '-2d', date: 'Jun 02, 2023', iv: 42.5, wtiPrice: 70.10, callSkewIv: 44.5, putSkewIv: 41.0, ovxIndex: 41.8, straddlePrice: 4.45, commentary: 'Delegates arrive in Vienna; intense off-camera huddles leak to press' },
      { dayOffset: -1, dayLabel: '-1d', date: 'Jun 03, 2023', iv: 44.5, wtiPrice: 71.74, callSkewIv: 47.0, putSkewIv: 42.5, ovxIndex: 43.9, straddlePrice: 4.65, commentary: 'Peak IV reached as marathon negotiations extend late into Saturday night' },
      { dayOffset: 0, dayLabel: 'Day 0', date: 'Jun 04, 2023', iv: 38.0, wtiPrice: 73.50, callSkewIv: 39.0, putSkewIv: 37.0, ovxIndex: 37.5, straddlePrice: 3.70, commentary: 'Sunday announcement of 1 mb/d Saudi unilateral cut' },
      { dayOffset: 1, dayLabel: '+1d', date: 'Jun 05, 2023', iv: 33.1, wtiPrice: 73.15, callSkewIv: 33.5, putSkewIv: 33.0, ovxIndex: 32.5, straddlePrice: 2.90, commentary: 'Textbook IV crush: -11.4 pts down (-25.6%). Spot fades from initial $75 pre-market high' },
      { dayOffset: 3, dayLabel: '+3d', date: 'Jun 07, 2023', iv: 30.5, wtiPrice: 72.50, callSkewIv: 30.2, putSkewIv: 31.0, ovxIndex: 30.0, straddlePrice: 2.60, commentary: 'Crush settles, baseline restored' },
    ],
  },
  {
    id: 'opec-2022-10-33rd',
    name: '33rd OPEC and non-OPEC Ministerial Meeting (2.0 mb/d Quota Cut)',
    type: 'ONOMM',
    typeLabel: 'Ministerial Summit',
    date: 'Oct 05, 2022',
    decisionTime: '15:00 CEST',
    location: 'Vienna Headquarters, Austria',
    status: 'completed',
    daysToEvent: -725,
    quotaAction: '2.0 mb/d Official Production Target Cut',
    policySummary:
      'Largest quota cut since the 2020 pandemic. OPEC+ ministers agreed to reduce headline production quotas by 2 million bpd to defend oil prices against global recession fears and US interest rate hikes.',
    keyDrivers: [
      'First fully in-person Vienna meeting since March 2020',
      'Geopolitical friction with White House releasing SPR crude reserves',
      'Dramatic call skew expansion as traders braced for sharp supply contraction',
    ],
    wtiSpotBefore: 86.52,
    wtiSpotAfter: 89.40,
    wtiChangeDollar: 2.88,
    wtiChangePct: 3.33,
    iv15dPrior: 36.8,
    ivPeakPreMeeting: 51.4,
    ivPostMeeting: 38.9,
    ivRunUpPts: 14.6,
    ivCrushPts: -12.5,
    ivCrushPct: -24.3,
    impliedMovePct: 6.2,
    realizedMovePct: 3.33,
    straddleWinner: 'SHORT_CRUSH',
    skewOrientation: 'CALL_SKEW_ELEVATED',
    recommendedStrategies: [
      {
        name: 'Front-Month Bear/Bull Iron Condor',
        description: 'Captured high IV on both wings; pocketed entire theta and vega decay.',
        rationale: 'Massive 14.6 pt IV run-up created extreme option pricing relative to 3.3% realized spot move.',
        legs: 'Short 82P/92C, Long 76P/98C',
        riskProfile: 'Defined Risk',
      },
    ],
    ivTimeline: [
      { dayOffset: -15, dayLabel: '-15d', date: 'Sep 20, 2022', iv: 36.8, wtiPrice: 84.00, callSkewIv: 36.0, putSkewIv: 38.0, ovxIndex: 36.2, straddlePrice: 4.80, commentary: 'Pre-meeting baseline' },
      { dayOffset: -10, dayLabel: '-10d', date: 'Sep 25, 2022', iv: 40.5, wtiPrice: 80.20, callSkewIv: 40.0, putSkewIv: 42.5, ovxIndex: 40.0, straddlePrice: 5.20, commentary: 'Recession worries push spot down, but ministers signal major action' },
      { dayOffset: -5, dayLabel: '-5d', date: 'Sep 30, 2022', iv: 44.8, wtiPrice: 82.50, callSkewIv: 46.0, putSkewIv: 44.0, ovxIndex: 44.2, straddlePrice: 5.75, commentary: 'Reports emerge of potential 1-2M bpd cut' },
      { dayOffset: -2, dayLabel: '-2d', date: 'Oct 03, 2022', iv: 48.5, wtiPrice: 83.60, callSkewIv: 52.0, putSkewIv: 46.5, ovxIndex: 48.0, straddlePrice: 6.20, commentary: 'Call skew accelerates aggressively as delegates arrive in Vienna' },
      { dayOffset: -1, dayLabel: '-1d', date: 'Oct 04, 2022', iv: 51.4, wtiPrice: 86.52, callSkewIv: 56.5, putSkewIv: 48.0, ovxIndex: 51.0, straddlePrice: 6.60, commentary: 'Peak IV reached: Front-month ATM options price ±6.2% expected move' },
      { dayOffset: 0, dayLabel: 'Day 0', date: 'Oct 05, 2022', iv: 43.5, wtiPrice: 87.76, callSkewIv: 46.0, putSkewIv: 41.5, ovxIndex: 43.0, straddlePrice: 5.10, commentary: 'Official 2M bpd cut confirmed. Press conference at 15:00 CEST' },
      { dayOffset: 1, dayLabel: '+1d', date: 'Oct 06, 2022', iv: 38.9, wtiPrice: 89.40, callSkewIv: 40.0, putSkewIv: 38.0, ovxIndex: 38.5, straddlePrice: 4.30, commentary: 'IV collapse of -12.5 pts (-24.3%); price rallies smoothly' },
      { dayOffset: 3, dayLabel: '+3d', date: 'Oct 08, 2022', iv: 36.2, wtiPrice: 92.60, callSkewIv: 36.5, putSkewIv: 36.0, ovxIndex: 35.8, straddlePrice: 3.90, commentary: 'Normalized volatility curve' },
    ],
  },
  {
    id: 'eia-weekly-crude',
    name: 'Weekly EIA Petroleum Status Report (US Inventories)',
    type: 'EIA_INVENTORY',
    typeLabel: 'Weekly Inventory Catalyst',
    date: 'Oct 01, 2026',
    decisionTime: '10:30 EDT (Every Wednesday)',
    location: 'US Energy Information Administration (Washington, D.C.)',
    status: 'upcoming',
    daysToEvent: 1,
    quotaAction: 'US Commercial Crude Storage, Cushing Stocks & Refiner Utilization',
    policySummary:
      'Consensus expects commercial crude build of +1.4M barrels, with gasoline drawdown of -1.1M barrels and Cushing hub stocks holding flat near seasonal medians.',
    keyDrivers: [
      'Strategic Petroleum Reserve (SPR) replenishment pace',
      'Gulf Coast export shipments and refinery maintenance turnaround schedules',
      'Immediate intraday 15-minute IV spike followed by rapid decay',
    ],
    wtiSpotBefore: 68.45,
    iv15dPrior: 31.0,
    ivPeakPreMeeting: 34.2,
    ivPostMeeting: 30.8,
    ivRunUpPts: 3.2,
    ivCrushPts: -3.4,
    ivCrushPct: -9.9,
    impliedMovePct: 2.1,
    skewOrientation: 'SYMMETRIC',
    recommendedStrategies: [
      {
        name: '0-1 DTE Short Strangle Scalp',
        description: 'Sell 67 Put / 70 Call 15 minutes before 10:30 EDT; buy back at 11:00 EDT.',
        rationale: 'Quick 3-4 vol pt crush over the 30-minute release window.',
        legs: 'Short 67P + Short 70C',
        riskProfile: 'Theta Positive',
      },
    ],
    ivTimeline: [
      { dayOffset: -2, dayLabel: '-2d', date: 'Sep 29', iv: 31.0, wtiPrice: 68.10, callSkewIv: 31.2, putSkewIv: 31.0, ovxIndex: 30.5, straddlePrice: 1.80, commentary: 'Early week baseline' },
      { dayOffset: -1, dayLabel: '-1d (API Release)', date: 'Sep 30 16:30', iv: 32.5, wtiPrice: 68.30, callSkewIv: 32.8, putSkewIv: 32.4, ovxIndex: 32.0, straddlePrice: 1.95, commentary: 'American Petroleum Institute (API) private survey published' },
      { dayOffset: 0, dayLabel: 'Day 0 (10:30 AM)', date: 'Oct 01 10:30', iv: 34.2, wtiPrice: 68.45, callSkewIv: 34.5, putSkewIv: 34.0, ovxIndex: 33.8, straddlePrice: 2.10, commentary: 'Peak intra-week IV right before official DOE/EIA print' },
      { dayOffset: 1, dayLabel: '+1d', date: 'Oct 02', iv: 30.8, wtiPrice: 68.60, callSkewIv: 31.0, putSkewIv: 30.8, ovxIndex: 30.5, straddlePrice: 1.65, commentary: 'Data digested; focus transfers to OPEC+ JMMC meeting' },
    ],
  },
];

/**
 * Calculates theoretical expected price move for an event given IV and DTE
 */
export function calculateOpecExpectedMove(spotPrice: number, iv: number, dte: number = 2): {
  dollarMove: number;
  pctMove: number;
  upperTarget: number;
  lowerTarget: number;
} {
  const t = Math.max(0.005, dte / 365);
  const dollarMove = spotPrice * iv * Math.sqrt(t);
  const pctMove = (dollarMove / spotPrice) * 100;
  return {
    dollarMove: Number(dollarMove.toFixed(2)),
    pctMove: Number(pctMove.toFixed(2)),
    upperTarget: Number((spotPrice + dollarMove).toFixed(2)),
    lowerTarget: Number((spotPrice - dollarMove).toFixed(2)),
  };
}
