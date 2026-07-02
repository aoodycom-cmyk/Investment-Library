export interface MarketPrice {
  ticker: string;
  price: number;
  asOf: string;
  source: "Twelve Data" | "Yahoo Finance";
  label: "Live" | "Latest close";
}

interface TwelveDataQuoteResponse {
  symbol?: string;
  close?: string;
  previous_close?: string;
  datetime?: string;
  is_market_open?: boolean;
  status?: string;
  message?: string;
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
  const twelveDataKey = import.meta.env.VITE_TWELVE_DATA_API_KEY as string | undefined;

  if (twelveDataKey) {
    try {
      return await fetchTwelveDataPrice(symbol, twelveDataKey);
    } catch (error) {
      console.warn(`Twelve Data failed for ${symbol}; falling back to Yahoo Finance`, error);
    }
  }

  return fetchYahooPrice(symbol);
}

async function fetchTwelveDataPrice(symbol: string, apiKey: string): Promise<MarketPrice> {
  const response = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`Could not fetch ${symbol} from Twelve Data`);
  }

  const payload = (await response.json()) as TwelveDataQuoteResponse;

  if (payload.status === "error") {
    throw new Error(payload.message ?? `Twelve Data returned an error for ${symbol}`);
  }

  const price = firstFinite(Number(payload.close), Number(payload.previous_close));

  if (price == null) {
    throw new Error(`No Twelve Data price returned for ${symbol}`);
  }

  return {
    ticker: payload.symbol ?? symbol,
    price,
    asOf: parseTwelveDataDate(payload.datetime),
    source: "Twelve Data",
    label: payload.is_market_open ? "Live" : "Latest close"
  };
}

async function fetchYahooPrice(symbol: string): Promise<MarketPrice> {
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

function parseTwelveDataDate(value?: string) {
  if (!value) return new Date().toISOString();
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
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
