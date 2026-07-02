import { mockStocks } from "../data/mockStocks";
import { Stock } from "../types";

const STORAGE_KEY = "investment-research-watchlist-v3";

export interface StockRepository {
  list(): Stock[];
  save(stocks: Stock[]): void;
}

export const localStockRepository: StockRepository = {
  list() {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return mockStocks;

    try {
      return (JSON.parse(raw) as Partial<Stock>[]).map(enrichStock);
    } catch {
      return mockStocks;
    }
  },
  save(stocks) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
  }
};

function enrichStock(stock: Partial<Stock>): Stock {
  const fallback = mockStocks.find((item) => item.id === stock.id) ?? mockStocks[0];
  return {
    ...fallback,
    ...stock,
    sector: stock.sector ?? fallback.sector ?? "Unclassified",
    industry: stock.industry ?? fallback.industry ?? "Unclassified",
    valuationSource: stock.valuationSource ?? fallback.valuationSource ?? "Morningstar",
    starRating: stock.starRating ?? fallback.starRating ?? 4,
    scores: { ...fallback.scores, ...stock.scores },
    journal: stock.journal ?? fallback.journal ?? [],
    positiveCatalysts: stock.positiveCatalysts ?? fallback.positiveCatalysts ?? "",
    negativeCatalysts: stock.negativeCatalysts ?? fallback.negativeCatalysts ?? "",
    upcomingEarnings: stock.upcomingEarnings ?? fallback.upcomingEarnings ?? "",
    macroRisks: stock.macroRisks ?? fallback.macroRisks ?? "",
    aiTrends: stock.aiTrends ?? fallback.aiTrends ?? "",
    industryNews: stock.industryNews ?? fallback.industryNews ?? "",
    competitiveAdvantage: stock.competitiveAdvantage ?? fallback.competitiveAdvantage ?? "",
    growthDrivers: stock.growthDrivers ?? fallback.growthDrivers ?? "",
    bearCase: stock.bearCase ?? fallback.bearCase ?? "",
    bullCase: stock.bullCase ?? fallback.bullCase ?? ""
  } as Stock;
}
