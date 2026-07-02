import { Risk, Stock } from "../types";

export const marginToFairValue = (stock: Stock) =>
  ((stock.morningstarFairValue - stock.lastPrice) / stock.lastPrice) * 100;

export const upsideToBullish = (stock: Stock) =>
  ((stock.bullishPrice - stock.lastPrice) / stock.lastPrice) * 100;

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value);

export const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export const riskRank = (risk: Risk) => ({ Low: 1, Medium: 2, High: 3 })[risk];

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
