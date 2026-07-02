export interface MarketPrice {
  ticker: string;
  price: number;
  asOf: string;
  source: "Yahoo Finance";
  label: "Live" | "Latest close";
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        marketState?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: unknown;
  };
}

export async function fetchLatestMarketPrice(ticker: string): Promise<MarketPrice> {
  const symbol = ticker.trim().toUpperCase();
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`Could not fetch ${symbol}`);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const timestamps = result?.timestamp ?? [];
  const latestCloseIndex = findLatestFiniteIndex(closes);
  const latestClose = latestCloseIndex >= 0 ? closes[latestCloseIndex] : undefined;
  const regularMarketPrice = result?.meta?.regularMarketPrice;
  const fallbackPrice = result?.meta?.previousClose;
  const price = firstFinite(regularMarketPrice, latestClose, fallbackPrice);

  if (price == null) {
    throw new Error(`No price returned for ${symbol}`);
  }

  const timestamp =
    latestCloseIndex >= 0 && timestamps[latestCloseIndex]
      ? new Date(timestamps[latestCloseIndex] * 1000).toISOString()
      : new Date().toISOString();

  return {
    ticker: symbol,
    price,
    asOf: timestamp,
    source: "Yahoo Finance",
    label: result?.meta?.marketState === "REGULAR" ? "Live" : "Latest close"
  };
}

function findLatestFiniteIndex(values: Array<number | null>) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (typeof values[index] === "number" && Number.isFinite(values[index])) return index;
  }
  return -1;
}

function firstFinite(...values: Array<number | null | undefined>) {
  return values.find((value): value is number => typeof value === "number" && Number.isFinite(value));
}
