import { Stock } from "../types";

export const mockStocks: Stock[] = [
  {
    id: "nvda",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    sector: "Technology",
    industry: "Semiconductors",
    owned: true,
    lastPrice: 198,
    priceUpdatedAt: "2026-07-02T00:00:00.000Z",
    morningstarFairValue: 280,
    valuationSource: "Morningstar",
    bearPrice: 220,
    neutralPrice: 240,
    bullishPrice: 320,
    decision: "Buy",
    conviction: "High",
    risk: "Medium",
    starRating: 5,
    scores: {
      financialQuality: 96,
      growth: 94,
      moat: 98,
      valuation: 82,
      management: 89,
      balanceSheet: 92,
      profitability: 97,
      capitalAllocation: 88
    },
    thesis:
      "A core AI infrastructure compounder with exceptional pricing power, strong ecosystem lock-in, and durable demand from hyperscale compute cycles.",
    whyItCanWin:
      "CUDA, accelerated networking, full-stack systems, and developer adoption make NVIDIA difficult to displace even as custom silicon improves.",
    competitiveAdvantage:
      "Full-stack hardware, networking, software, and developer tooling create switching costs that pure chip competitors cannot easily replicate.",
    growthDrivers:
      "Blackwell adoption, inference workloads, sovereign AI, networking attach rates, and expanding enterprise AI deployment.",
    keyRisks:
      "AI capex digestion, export restrictions, customer concentration, gross margin normalization, and competitive pressure from in-house accelerators.",
    bearCase:
      "Hyperscaler digestion lowers near-term orders, export limits bite, and gross margins normalize faster than expected.",
    bullCase:
      "Blackwell demand and inference adoption extend the upgrade cycle while software and networking deepen the moat.",
    entryPlan:
      "Add only when the margin to fair value is compelling or during broad market dislocations that do not impair the long-term AI infrastructure thesis.",
    exitTrigger:
      "Review if data center growth decelerates materially, margins structurally compress, or the moat shifts away from CUDA-led software lock-in.",
    notes:
      "Continue tracking AI server backlog, Blackwell adoption, inference demand, and hyperscaler capex commentary.",
    positiveCatalysts: "Blackwell ramp, stronger inference demand, enterprise AI adoption, networking growth.",
    negativeCatalysts: "Export restrictions, capex pause, margin pressure, custom accelerator share gains.",
    upcomingEarnings: "Monitor data center growth, supply constraints, gross margin commentary, and backlog quality.",
    macroRisks: "Semiconductor cycle, rates, hyperscaler capex discipline, geopolitical controls.",
    aiTrends: "Inference scaling, sovereign AI, AI factories, accelerated networking.",
    industryNews: "Track GPU lead times, competitor accelerator announcements, and foundry supply updates.",
    journal: [
      {
        id: "nvda-july-2026",
        date: "2026-07-02",
        title: "Raised fair value",
        reason: "Blackwell demand and networking attach rates look stronger than the prior base case."
      }
    ],
    lastUpdated: "2026-07-02"
  },
  {
    id: "crwv",
    ticker: "CRWV",
    companyName: "CoreWeave, Inc.",
    sector: "Technology",
    industry: "AI Infrastructure",
    owned: false,
    lastPrice: 91,
    priceUpdatedAt: "2026-07-02T00:00:00.000Z",
    morningstarFairValue: 120,
    valuationSource: "My Estimate",
    bearPrice: 115,
    neutralPrice: 140,
    bullishPrice: 220,
    decision: "Watch",
    conviction: "Medium",
    risk: "High",
    starRating: 4,
    scores: {
      financialQuality: 72,
      growth: 93,
      moat: 74,
      valuation: 86,
      management: 78,
      balanceSheet: 58,
      profitability: 66,
      capitalAllocation: 70
    },
    thesis:
      "A focused AI cloud infrastructure platform with strong exposure to GPU demand and potentially attractive economics if utilization remains high.",
    whyItCanWin:
      "Specialized GPU capacity, speed of deployment, and AI-native customer demand can support premium growth versus general cloud platforms.",
    competitiveAdvantage:
      "Purpose-built GPU cloud capacity and fast deployment cycles can create an execution edge for AI-native customers.",
    growthDrivers:
      "GPU rental demand, enterprise AI workloads, model training bursts, inference growth, and long-term contracts.",
    keyRisks:
      "Leverage, customer concentration, GPU supply cycles, hyperscaler competition, and the risk that current AI demand proves more cyclical than expected.",
    bearCase:
      "Utilization falls, debt pressure rises, and hyperscaler competition compresses returns on GPU infrastructure.",
    bullCase:
      "AI demand remains durable, utilization stays high, and contracted capacity compounds faster than market expectations.",
    entryPlan:
      "Wait for clearer public reporting history, evidence of durable utilization, and a price that compensates for balance sheet and concentration risk.",
    exitTrigger:
      "Reassess if utilization weakens, debt service pressure rises, or contract quality deteriorates versus the growth narrative.",
    notes:
      "Watch revenue durability, customer mix, capex funding, and GPU fleet monetization.",
    positiveCatalysts: "Large customer wins, durable utilization, lower funding costs, stronger AI infrastructure demand.",
    negativeCatalysts: "Debt concerns, customer churn, lower utilization, accelerated hyperscaler competition.",
    upcomingEarnings: "Focus on utilization, contracted backlog, capex funding, gross margin, and concentration.",
    macroRisks: "Rates, capital availability, AI capex cycles, and GPU supply/demand normalization.",
    aiTrends: "GPU cloud demand, model training intensity, inference infrastructure, AI-native cloud buyers.",
    industryNews: "Track AI cloud pricing, NVIDIA supply, hyperscaler capex, and private market GPU capacity.",
    journal: [
      {
        id: "crwv-july-2026",
        date: "2026-07-02",
        title: "Added to watchlist",
        reason: "Upside is attractive, but leverage and utilization durability need more evidence."
      }
    ],
    lastUpdated: "2026-07-02"
  }
];
