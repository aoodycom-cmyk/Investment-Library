export type Decision = "Strong Buy" | "Buy" | "Watch" | "Hold" | "Avoid" | "Trim";
export type Conviction = "Low" | "Medium" | "High";
export type Risk = "Low" | "Medium" | "High";
export type ValuationSource = "Morningstar" | "DCF" | "My Estimate";

export interface InvestmentScores {
  financialQuality: number;
  growth: number;
  moat: number;
  valuation: number;
  management: number;
  balanceSheet: number;
  profitability: number;
  capitalAllocation: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  reason: string;
}

export interface Stock {
  id: string;
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  owned: boolean;
  lastPrice: number;
  priceUpdatedAt: string;
  morningstarFairValue: number;
  valuationSource: ValuationSource;
  bearPrice: number;
  neutralPrice: number;
  bullishPrice: number;
  decision: Decision;
  conviction: Conviction;
  risk: Risk;
  starRating: number;
  scores: InvestmentScores;
  thesis: string;
  whyItCanWin: string;
  competitiveAdvantage: string;
  growthDrivers: string;
  keyRisks: string;
  bearCase: string;
  bullCase: string;
  entryPlan: string;
  exitTrigger: string;
  notes: string;
  positiveCatalysts: string;
  negativeCatalysts: string;
  upcomingEarnings: string;
  macroRisks: string;
  aiTrends: string;
  industryNews: string;
  journal: JournalEntry[];
  lastUpdated: string;
}

export type OwnedFilter = "All" | "Owned" | "Not Owned";
export type SortMode =
  | "Highest upside to bullish"
  | "Highest margin to fair value"
  | "Highest risk"
  | "Recently updated";

export interface Filters {
  owned: OwnedFilter;
  decision: "All" | Decision;
  risk: "All" | Risk;
  conviction: "All" | Conviction;
  sector: string;
  industry: string;
  sort: SortMode;
}
