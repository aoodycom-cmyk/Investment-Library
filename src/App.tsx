import {
  ArrowDownToLine,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  LineChart,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  marginToFairValue,
  upsideToBullish
} from "./lib/calculations";
import { exportToCsv, exportToExcel, exportToPdf } from "./lib/exporters";
import { fetchLatestMarketPrice } from "./lib/marketData";
import { localStockRepository } from "./lib/storage";
import { Conviction, Decision, Filters, Risk, Stock, ValuationSource } from "./types";

const decisions: Decision[] = ["Strong Buy", "Buy", "Watch", "Hold", "Avoid", "Trim"];
const convictions: Conviction[] = ["Low", "Medium", "High"];
const risks: Risk[] = ["Low", "Medium", "High"];
const valuationSources: ValuationSource[] = ["Morningstar", "DCF", "My Estimate"];

const scoreLabels: Array<[keyof Stock["scores"], string]> = [
  ["financialQuality", "Financial Quality"],
  ["growth", "Growth"],
  ["moat", "Moat"],
  ["valuation", "Valuation"],
  ["management", "Management"],
  ["balanceSheet", "Balance Sheet"],
  ["profitability", "Profitability"],
  ["capitalAllocation", "Capital Allocation"]
];

const emptyStock = (): Stock => ({
  id: crypto.randomUUID(),
  ticker: "",
  companyName: "",
  sector: "",
  industry: "",
  owned: false,
  lastPrice: 0,
  priceUpdatedAt: new Date().toISOString(),
  morningstarFairValue: 0,
  valuationSource: "Morningstar",
  bearPrice: 0,
  neutralPrice: 0,
  bullishPrice: 0,
  decision: "Watch",
  conviction: "Medium",
  risk: "Medium",
  starRating: 4,
  scores: {
    financialQuality: 80,
    growth: 80,
    moat: 80,
    valuation: 80,
    management: 80,
    balanceSheet: 80,
    profitability: 80,
    capitalAllocation: 80
  },
  thesis: "",
  whyItCanWin: "",
  competitiveAdvantage: "",
  growthDrivers: "",
  keyRisks: "",
  bearCase: "",
  bullCase: "",
  entryPlan: "",
  exitTrigger: "",
  notes: "",
  positiveCatalysts: "",
  negativeCatalysts: "",
  upcomingEarnings: "",
  macroRisks: "",
  aiTrends: "",
  industryNews: "",
  journal: [],
  lastUpdated: new Date().toISOString().slice(0, 10)
});

export function App() {
  const [stocks, setStocks] = useState<Stock[]>(() => localStockRepository.list());
  const [selectedId, setSelectedId] = useState(stocks[0]?.id ?? "");
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [priceRefreshMessage, setPriceRefreshMessage] = useState("Prices update automatically on open.");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    owned: "All",
    decision: "All",
    risk: "All",
    conviction: "All",
    sector: "All",
    industry: "All",
    sort: "Highest upside to bullish"
  });

  useEffect(() => {
    localStockRepository.save(stocks);
  }, [stocks]);

  const sectors = useMemo(() => unique(stocks.map((stock) => stock.sector).filter(Boolean)), [stocks]);
  const industries = useMemo(() => unique(stocks.map((stock) => stock.industry).filter(Boolean)), [stocks]);

  const filteredStocks = useMemo(() => {
    const riskOrder = { High: 3, Medium: 2, Low: 1 };
    return stocks
      .filter((stock) => {
        const search = `${stock.ticker} ${stock.companyName} ${stock.sector} ${stock.industry}`.toLowerCase();
        return (
          search.includes(query.toLowerCase()) &&
          (filters.owned === "All" ||
            (filters.owned === "Owned" && stock.owned) ||
            (filters.owned === "Not Owned" && !stock.owned)) &&
          (filters.decision === "All" || computeDecision(stock) === filters.decision) &&
          (filters.risk === "All" || stock.risk === filters.risk) &&
          (filters.conviction === "All" || stock.conviction === filters.conviction) &&
          (filters.sector === "All" || stock.sector === filters.sector) &&
          (filters.industry === "All" || stock.industry === filters.industry)
        );
      })
      .sort((a, b) => {
        if (filters.sort === "Highest margin to fair value") return marginToFairValue(b) - marginToFairValue(a);
        if (filters.sort === "Highest risk") return riskOrder[b.risk] - riskOrder[a.risk];
        if (filters.sort === "Recently updated") {
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        }
        return upsideToBullish(b) - upsideToBullish(a);
      });
  }, [filters, query, stocks]);

  const selectedStock =
    stocks.find((stock) => stock.id === selectedId) ?? filteredStocks[0] ?? stocks[0];

  const kpis = useMemo(() => {
    const bestUpside = maxBy(stocks, upsideToBullish);
    const lastPriceUpdated = maxBy(stocks, (stock) => new Date(stock.priceUpdatedAt).getTime());
    const averageMargin =
      stocks.length === 0
        ? 0
        : stocks.reduce((total, stock) => total + marginToFairValue(stock), 0) / stocks.length;

    return [
      {
        label: "Total Stocks",
        labelAr: "إجمالي الأسهم",
        value: stocks.length,
        detail: "Reference library",
        detailAr: "مكتبة المتابعة",
        icon: BarChart3
      },
      {
        label: "Owned Stocks",
        labelAr: "الأسهم المملوكة",
        value: stocks.filter((stock) => stock.owned).length,
        detail: "Current holdings",
        detailAr: "المراكز الحالية",
        icon: CheckCircle2
      },
      {
        label: "Buy Candidates",
        labelAr: "فرص شراء",
        value: stocks.filter((stock) => ["Strong Buy", "Buy"].includes(computeDecision(stock))).length,
        detail: "Action list",
        detailAr: "قائمة القرار",
        icon: Sparkles
      },
      {
        label: "Avg. Margin",
        labelAr: "متوسط هامش الأمان",
        value: formatPercent(averageMargin),
        detail: safetyLabel(averageMargin),
        detailAr: safetyLabelAr(averageMargin),
        icon: ShieldAlert
      },
      {
        label: "Highest Upside",
        labelAr: "أعلى عائد محتمل",
        value: bestUpside ? `${bestUpside.ticker} ${formatPercent(upsideToBullish(bestUpside))}` : "-",
        detail: "Bull case",
        detailAr: "السيناريو المتفائل",
        icon: LineChart
      },
      {
        label: "Prices Updated",
        labelAr: "تحديث الأسعار",
        value: lastPriceUpdated ? formatDate(lastPriceUpdated.priceUpdatedAt) : "-",
        detail: "Yahoo / close",
        detailAr: "آخر إغلاق",
        icon: BookOpen
      }
    ];
  }, [stocks]);

  const refreshPrices = useCallback(
    async (silent = false) => {
      if (stocks.length === 0 || isRefreshingPrices) return;
      setIsRefreshingPrices(true);
      if (!silent) setPriceRefreshMessage("Updating market prices...");

      const results = await Promise.allSettled(
        stocks.map(async (stock) => ({
          id: stock.id,
          marketPrice: await fetchLatestMarketPrice(stock.ticker)
        }))
      );

      const updates = new Map<string, { price: number; asOf: string; label: string }>();
      const failed: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          updates.set(result.value.id, {
            price: result.value.marketPrice.price,
            asOf: result.value.marketPrice.asOf,
            label: result.value.marketPrice.label
          });
        } else {
          failed.push(stocks[index]?.ticker ?? "Unknown");
        }
      });

      if (updates.size > 0) {
        setStocks((current) =>
          current.map((stock) => {
            const update = updates.get(stock.id);
            return update
              ? {
                  ...stock,
                  lastPrice: Number(update.price.toFixed(2)),
                  priceUpdatedAt: update.asOf,
                  decision: computeDecision({ ...stock, lastPrice: update.price })
                }
              : stock;
          })
        );
      }

      const statusText =
        updates.size === stocks.length
          ? "Prices updated from latest market data."
          : updates.size > 0
            ? `Updated ${updates.size}; ${failed.join(", ")} failed.`
            : "Could not update prices. Try again later.";

      setPriceRefreshMessage(statusText);
      setIsRefreshingPrices(false);
    },
    [isRefreshingPrices, stocks]
  );

  useEffect(() => {
    if (stocks.some((stock) => isPriceStale(stock.priceUpdatedAt))) {
      void refreshPrices(true);
    }
    // Run only on first load so refreshing prices does not loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsertStock = (stock: Stock) => {
    const now = new Date().toISOString().slice(0, 10);
    const previous = stocks.find((item) => item.id === stock.id);
    const journal =
      previous && JSON.stringify(previous) !== JSON.stringify(stock)
        ? [
            {
              id: crypto.randomUUID(),
              date: now,
              title: "Updated research memo",
              reason: "Saved valuation, score, catalyst, or thesis changes."
            },
            ...stock.journal
          ]
        : stock.journal;
    const normalized = {
      ...stock,
      ticker: stock.ticker.trim().toUpperCase(),
      companyName: stock.companyName.trim(),
      sector: stock.sector.trim() || "Unclassified",
      industry: stock.industry.trim() || "Unclassified",
      decision: computeDecision(stock),
      journal,
      lastUpdated: now
    };

    setStocks((current) => {
      const exists = current.some((item) => item.id === normalized.id);
      return exists
        ? current.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...current];
    });
    setSelectedId(normalized.id);
    setEditingStock(null);
  };

  const deleteStock = (id: string) => {
    setStocks((current) => current.filter((stock) => stock.id !== id));
    if (selectedId === id) setSelectedId(stocks.find((stock) => stock.id !== id)?.id ?? "");
  };

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
        <header className="sticky top-0 z-30 -mx-4 border-b border-white/8 bg-[#070b12]/88 px-4 pb-4 pt-3 backdrop-blur-2xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/70">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
                Private Research
              </div>
              <h1 className="text-[27px] font-semibold leading-tight tracking-normal text-white sm:text-4xl">
                Investment Library
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="icon-button"
                disabled={isRefreshingPrices}
                onClick={() => void refreshPrices(false)}
                title="Update prices"
              >
                <RefreshCw className={isRefreshingPrices ? "animate-spin" : ""} size={18} />
                <span className="hidden sm:inline">Update Prices</span>
              </button>
              <button className="primary-button" onClick={() => setEditingStock(emptyStock())}>
                <Plus size={19} />
                <span className="hidden sm:inline">Add Stock</span>
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">{priceRefreshMessage}</p>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <div className="kpi-card" key={kpi.label}>
              <div className="flex items-center justify-between gap-3">
                <BilingualLabel label={kpi.label} labelAr={kpi.labelAr} />
                <kpi.icon className="text-slate-500" size={17} />
              </div>
              <p className="mt-3 truncate text-xl font-semibold text-white">{kpi.value}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{kpi.detail}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-600" dir="rtl">{kpi.detailAr}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)]">
          <div className="space-y-4">
            <Toolbar
              query={query}
              setQuery={setQuery}
              filters={filters}
              setFilters={setFilters}
              sectors={sectors}
              industries={industries}
              exportStocks={filteredStocks}
            />

            <div className="space-y-3 lg:hidden">
              {filteredStocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  active={selectedStock?.id === stock.id}
                  onSelect={() => setSelectedId(stock.id)}
                />
              ))}
            </div>

            <DesktopTable stocks={filteredStocks} selectedId={selectedStock?.id} onSelect={setSelectedId} />
          </div>

          {selectedStock && (
            <StockDetail
              stock={selectedStock}
              onEdit={() => setEditingStock(selectedStock)}
              onDelete={() => deleteStock(selectedStock.id)}
            />
          )}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090f19]/92 px-4 py-3 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button className="icon-button flex-1" onClick={() => exportToCsv(filteredStocks)}>
            <Download size={17} /> CSV
          </button>
          <button className="icon-button flex-1" onClick={() => exportToExcel(filteredStocks)}>
            <FileSpreadsheet size={17} /> Excel
          </button>
          <button className="icon-button flex-1" onClick={() => exportToPdf(filteredStocks)}>
            <ArrowDownToLine size={17} /> PDF
          </button>
        </div>
      </nav>

      {editingStock && (
        <StockForm stock={editingStock} onCancel={() => setEditingStock(null)} onSave={upsertStock} />
      )}
    </main>
  );
}

function Toolbar({
  query,
  setQuery,
  filters,
  setFilters,
  sectors,
  industries,
  exportStocks
}: {
  query: string;
  setQuery: (query: string) => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  sectors: string[];
  industries: string[];
  exportStocks: Stock[];
}) {
  return (
    <div className="glass-panel p-3">
      <label className="search-box h-12">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stocks" />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <Select value={filters.owned} onChange={(owned) => setFilters({ ...filters, owned })}>
          {["All", "Owned", "Not Owned"].map((option) => <option key={option}>{option}</option>)}
        </Select>
        <Select value={filters.decision} onChange={(decision) => setFilters({ ...filters, decision })}>
          {["All", ...decisions].map((option) => <option key={option}>{option}</option>)}
        </Select>
        <Select value={filters.conviction} onChange={(conviction) => setFilters({ ...filters, conviction })}>
          {["All", ...convictions].map((option) => <option key={option}>{option}</option>)}
        </Select>
        <Select value={filters.risk} onChange={(risk) => setFilters({ ...filters, risk })}>
          {["All", ...risks].map((option) => <option key={option}>{option}</option>)}
        </Select>
        <Select value={filters.sector} onChange={(sector) => setFilters({ ...filters, sector })}>
          {["All", ...sectors].map((option) => <option key={option}>{option}</option>)}
        </Select>
        <Select value={filters.industry} onChange={(industry) => setFilters({ ...filters, industry })}>
          {["All", ...industries].map((option) => <option key={option}>{option}</option>)}
        </Select>
        <Select value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })}>
          {["Highest upside to bullish", "Highest margin to fair value", "Highest risk", "Recently updated"].map(
            (option) => <option key={option}>{option}</option>
          )}
        </Select>
      </div>
      <div className="mt-3 hidden gap-2 lg:flex">
        <button className="icon-button" onClick={() => exportToCsv(exportStocks)}>
          <Download size={17} /> CSV
        </button>
        <button className="icon-button" onClick={() => exportToExcel(exportStocks)}>
          <FileSpreadsheet size={17} /> Excel
        </button>
        <button className="icon-button" onClick={() => exportToPdf(exportStocks)}>
          <ArrowDownToLine size={17} /> PDF
        </button>
      </div>
    </div>
  );
}

function StockCard({ stock, active, onSelect }: { stock: Stock; active: boolean; onSelect: () => void }) {
  const margin = marginToFairValue(stock);
  return (
    <button className={`stock-card text-left ${active ? "active" : ""}`} onClick={onSelect}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">{stock.ticker}</h2>
            {stock.owned && <Badge className="owned">Owned</Badge>}
          </div>
          <p className="mt-1 max-w-[220px] truncate text-sm text-slate-400">{stock.companyName}</p>
        </div>
        <ChevronRight className="mt-1 text-slate-500" size={20} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat label="Price" labelAr="السعر" value={formatCurrency(stock.lastPrice)} />
        <MiniStat label="Intrinsic" labelAr="القيمة" value={formatCurrency(stock.morningstarFairValue)} />
        <MiniStat label="Margin" labelAr="الهامش" value={formatPercent(margin)} tone={margin >= 0 ? "green" : "red"} />
      </div>
      <p className="mt-3 text-xs text-slate-500">Price updated {formatPriceUpdated(stock.priceUpdatedAt)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <DecisionBadge margin={margin} />
        <Badge className={decisionClass(computeDecision(stock))}>{computeDecision(stock)}</Badge>
        <Badge className={riskClass(stock.risk)}>{stock.risk} Risk</Badge>
        <Badge className={convictionClass(stock.conviction)}>{stock.conviction} Conviction</Badge>
      </div>
    </button>
  );
}

function DesktopTable({
  stocks,
  selectedId,
  onSelect
}: {
  stocks: Stock[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="glass-panel hidden overflow-hidden lg:block">
      <div className="border-b border-white/10 p-4">
        <h2 className="text-base font-semibold text-white">Watchlist</h2>
        <p className="text-sm text-slate-500">Expanded table for desktop review</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1420px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              {["Ticker", "Company", "Owned", "Current Price", "Price Updated", "Intrinsic Value", "Source", "Margin", "Bear", "Neutral", "Bull", "Upside", "Decision", "Conviction", "Risk", "Last Updated"].map((header) => (
                <th className="px-4 py-3 font-medium" key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const margin = marginToFairValue(stock);
              return (
                <tr
                  className={`cursor-pointer border-b border-white/[0.06] transition hover:bg-white/[0.045] ${selectedId === stock.id ? "bg-cyan-400/[0.055]" : ""}`}
                  key={stock.id}
                  onClick={() => onSelect(stock.id)}
                >
                  <td className="px-4 py-4 font-semibold text-white">{stock.ticker}</td>
                  <td className="px-4 py-4 text-slate-300">{stock.companyName}</td>
                  <td className="px-4 py-4">{stock.owned ? <Badge className="owned">Yes</Badge> : "No"}</td>
                  <td className="px-4 py-4 font-mono">{formatCurrency(stock.lastPrice)}</td>
                  <td className="px-4 py-4 text-slate-400">{formatPriceUpdated(stock.priceUpdatedAt)}</td>
                  <td className="px-4 py-4 font-mono">{formatCurrency(stock.morningstarFairValue)}</td>
                  <td className="px-4 py-4 text-slate-400">{stock.valuationSource}</td>
                  <td className="px-4 py-4"><DecisionBadge margin={margin} /></td>
                  <td className="px-4 py-4 font-mono">{formatCurrency(stock.bearPrice)}</td>
                  <td className="px-4 py-4 font-mono">{formatCurrency(stock.neutralPrice)}</td>
                  <td className="px-4 py-4 font-mono">{formatCurrency(stock.bullishPrice)}</td>
                  <td className="px-4 py-4 font-mono text-emerald-300">{formatPercent(upsideToBullish(stock))}</td>
                  <td className="px-4 py-4"><Badge className={decisionClass(computeDecision(stock))}>{computeDecision(stock)}</Badge></td>
                  <td className="px-4 py-4"><Badge className={convictionClass(stock.conviction)}>{stock.conviction}</Badge></td>
                  <td className="px-4 py-4"><Badge className={riskClass(stock.risk)}>{stock.risk}</Badge></td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(stock.lastUpdated)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockDetail({ stock, onEdit, onDelete }: { stock: Stock; onEdit: () => void; onDelete: () => void }) {
  const margin = marginToFairValue(stock);
  const upside = upsideToBullish(stock);
  const overall = Math.round(
    Object.values(stock.scores).reduce((sum, score) => sum + score, 0) / Object.values(stock.scores).length
  );

  return (
    <article className="space-y-4">
      <section className="detail-hero">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {stock.sector} / {stock.industry}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{stock.companyName}</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <span className="font-mono text-cyan-100">{stock.ticker}</span>
              <span>{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={index < stock.starRating ? "inline fill-amber-300 text-amber-300" : "inline text-slate-700"} size={13} />)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="square-button" onClick={onEdit} title="Edit stock"><Pencil size={17} /></button>
            <button className="square-button danger" onClick={onDelete} title="Delete stock"><Trash2 size={17} /></button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge className={decisionClass(computeDecision(stock))}>{computeDecision(stock)}</Badge>
          <Badge className={convictionClass(stock.conviction)}>{stock.conviction} Conviction</Badge>
          <Badge className={riskClass(stock.risk)}>{stock.risk} Risk</Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <HeroStat
            label="Current Price"
            labelAr="السعر الحالي"
            value={formatCurrency(stock.lastPrice)}
            meta={`Yahoo / ${formatPriceUpdated(stock.priceUpdatedAt)}`}
          />
          <HeroStat
            label="Intrinsic Value"
            labelAr="القيمة العادلة"
            value={formatCurrency(stock.morningstarFairValue)}
            meta={stock.valuationSource}
          />
          <HeroStat label="Margin of Safety" labelAr="هامش الأمان" value={formatPercent(margin)} tone={margin >= 0 ? "green" : "red"} />
          <HeroStat label="Upside" labelAr="العائد المحتمل" value={formatPercent(upside)} tone={upside >= 0 ? "green" : "red"} />
        </div>
      </section>

      <section className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Valuation Range</h3>
          <DecisionBadge margin={margin} />
        </div>
        <ValuationBar stock={stock} />
      </section>

      <section className="glass-panel p-4">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="section-title">Overall Quality</h3>
            <p className="mt-1 text-sm text-slate-500">Composite investment score</p>
          </div>
          <p className="text-3xl font-semibold text-white">{overall}<span className="text-sm text-slate-500"> /100</span></p>
        </div>
        <div className="mt-5 space-y-3">
          {scoreLabels.map(([key, label]) => <ScoreBar key={key} label={label} value={stock.scores[key]} />)}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <MemoSection title="Investment Thesis" body={stock.thesis} />
        <MemoSection title="Why It Can Win" body={stock.whyItCanWin} />
        <MemoSection title="Competitive Advantage" body={stock.competitiveAdvantage} />
        <MemoSection title="Growth Drivers" body={stock.growthDrivers} />
        <MemoSection title="Key Risks" body={stock.keyRisks} />
        <MemoSection title="Bear Case" body={stock.bearCase} />
        <MemoSection title="Bull Case" body={stock.bullCase} />
        <MemoSection title="Entry Plan" body={stock.entryPlan} />
        <MemoSection title="Review Trigger" body={stock.exitTrigger} />
        <MemoSection title="Notes" body={stock.notes} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <MemoSection title="Positive Catalysts" body={stock.positiveCatalysts} />
        <MemoSection title="Negative Catalysts" body={stock.negativeCatalysts} />
        <MemoSection title="Upcoming Earnings" body={stock.upcomingEarnings} />
        <MemoSection title="Macro Risks" body={stock.macroRisks} />
        <MemoSection title="AI Trends" body={stock.aiTrends} />
        <MemoSection title="Industry News" body={stock.industryNews} />
      </section>

      <section className="glass-panel p-4">
        <h3 className="section-title">Investment Journal</h3>
        <div className="mt-4 space-y-4">
          {stock.journal.length === 0 ? (
            <p className="text-sm text-slate-500">Edits will appear here automatically.</p>
          ) : (
            stock.journal.map((entry) => (
              <div className="timeline-item" key={entry.id}>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{formatDate(entry.date)}</p>
                <p className="mt-1 font-semibold text-white">{entry.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{entry.reason}</p>
              </div>
            ))
          )}
        </div>
        <p className="mt-5 border-t border-white/10 pt-4 text-sm text-slate-500">
          Memo updated {formatDate(stock.lastUpdated)} / Price updated {formatPriceUpdated(stock.priceUpdatedAt)}
        </p>
      </section>
    </article>
  );
}

function StockForm({ stock, onCancel, onSave }: { stock: Stock; onCancel: () => void; onSave: (stock: Stock) => void }) {
  const [draft, setDraft] = useState(stock);
  const setField = <K extends keyof Stock>(key: K, value: Stock[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setScore = (key: keyof Stock["scores"], value: number) =>
    setDraft((current) => ({ ...current, scores: { ...current.scores, [key]: value } }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form className="modal-panel max-h-[94vh] w-full max-w-5xl overflow-y-auto" onSubmit={submit}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d1422]/95 p-5 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-white">{stock.ticker ? `Edit ${stock.ticker}` : "Add Stock"}</h2>
            <p className="text-sm text-slate-500">Autosaves to your local research library.</p>
          </div>
          <button className="square-button" type="button" onClick={onCancel} title="Close"><X size={18} /></button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Ticker"><input required value={draft.ticker} onChange={(event) => setField("ticker", event.target.value)} /></Field>
          <Field label="Company"><input required value={draft.companyName} onChange={(event) => setField("companyName", event.target.value)} /></Field>
          <Field label="Sector"><input value={draft.sector} onChange={(event) => setField("sector", event.target.value)} /></Field>
          <Field label="Industry"><input value={draft.industry} onChange={(event) => setField("industry", event.target.value)} /></Field>
          <Field label="Owned">
            <select value={draft.owned ? "Yes" : "No"} onChange={(event) => setField("owned", event.target.value === "Yes")}>
              <option>Yes</option><option>No</option>
            </select>
          </Field>
          <Field label="Source">
            <select value={draft.valuationSource} onChange={(event) => setField("valuationSource", event.target.value as ValuationSource)}>
              {valuationSources.map((option) => <option key={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Auto Decision">
            <div className="readonly-decision">
              <Badge className={decisionClass(computeDecision(draft))}>{computeDecision(draft)}</Badge>
              <span>Calculated from current price vs fair value</span>
            </div>
          </Field>
          <Field label="Morningstar rating">
            <input min="1" max="5" type="number" value={draft.starRating} onChange={(event) => setField("starRating", Number(event.target.value))} />
          </Field>
          {[
            ["Current price", "lastPrice"],
            ["Morningstar fair value", "morningstarFairValue"],
            ["Conservative / Bear", "bearPrice"],
            ["Base / Neutral", "neutralPrice"],
            ["Optimistic / Bull", "bullishPrice"]
          ].map(([label, key]) => (
            <Field label={label} key={key}>
              <input min="0" step="0.01" type="number" value={draft[key as keyof Stock] as number} onChange={(event) => setField(key as keyof Stock, Number(event.target.value) as never)} />
            </Field>
          ))}
          <Field label="Conviction">
            <select value={draft.conviction} onChange={(event) => setField("conviction", event.target.value as Conviction)}>
              {convictions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Risk">
            <select value={draft.risk} onChange={(event) => setField("risk", event.target.value as Risk)}>
              {risks.map((option) => <option key={option}>{option}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          {scoreLabels.map(([key, label]) => (
            <Field label={label} key={key}>
              <input min="0" max="100" type="range" value={draft.scores[key]} onChange={(event) => setScore(key, Number(event.target.value))} />
            </Field>
          ))}
        </div>

        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          {[
            ["Investment Thesis", "thesis"],
            ["Why It Can Win", "whyItCanWin"],
            ["Competitive Advantage", "competitiveAdvantage"],
            ["Growth Drivers", "growthDrivers"],
            ["Key Risks", "keyRisks"],
            ["Bear Case", "bearCase"],
            ["Bull Case", "bullCase"],
            ["Entry Plan", "entryPlan"],
            ["Review Trigger", "exitTrigger"],
            ["Notes", "notes"],
            ["Positive Catalysts", "positiveCatalysts"],
            ["Negative Catalysts", "negativeCatalysts"],
            ["Upcoming Earnings", "upcomingEarnings"],
            ["Macro Risks", "macroRisks"],
            ["AI Trends", "aiTrends"],
            ["Industry News", "industryNews"]
          ].map(([label, key]) => (
            <Field label={label} key={key}>
              <textarea rows={4} value={draft[key as keyof Stock] as string} onChange={(event) => setField(key as keyof Stock, event.target.value as never)} />
            </Field>
          ))}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-[#0d1422]/95 p-5 backdrop-blur">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" type="submit"><CheckCircle2 size={18} /> Save</button>
        </div>
      </form>
    </div>
  );
}

function ValuationBar({ stock }: { stock: Stock }) {
  const min = Math.min(stock.bearPrice, stock.lastPrice);
  const max = Math.max(stock.bullishPrice, stock.morningstarFairValue, stock.lastPrice);
  const position = ((stock.lastPrice - min) / Math.max(max - min, 1)) * 100;
  return (
    <div className="mt-6">
      <div className="valuation-track">
        <span className="valuation-marker current" style={{ left: `${clamp(position, 2, 98)}%` }}>
          <span>{formatCurrency(stock.lastPrice)}</span>
        </span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <RangeLabel label="Bear" value={stock.bearPrice} />
        <RangeLabel label="Neutral" value={stock.neutralPrice} />
        <RangeLabel label="Fair Value" value={stock.morningstarFairValue} />
        <RangeLabel label="Bull" value={stock.bullishPrice} />
      </div>
    </div>
  );
}

function Select<T extends string>({ value, onChange, children }: { value: T; onChange: (value: T) => void; children: ReactNode }) {
  return <select className="control" value={value} onChange={(event) => onChange(event.target.value as T)}>{children}</select>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

function BilingualLabel({ label, labelAr }: { label: string; labelAr: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-600" dir="rtl">{labelAr}</p>
    </div>
  );
}

function DecisionBadge({ margin }: { margin: number }) {
  return <Badge className={safetyClass(margin)}>{safetyLabel(margin)}</Badge>;
}

function HeroStat({
  label,
  labelAr,
  value,
  meta,
  tone
}: {
  label: string;
  labelAr: string;
  value: string;
  meta?: string;
  tone?: "green" | "red";
}) {
  return (
    <div className="hero-stat">
      <p>{label}</p>
      <em dir="rtl">{labelAr}</em>
      <strong className={tone === "green" ? "text-emerald-300" : tone === "red" ? "text-red-300" : ""}>{value}</strong>
      {meta && <span>{meta}</span>}
    </div>
  );
}

function MiniStat({ label, labelAr, value, tone }: { label: string; labelAr: string; value: string; tone?: "green" | "red" }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.13em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-600" dir="rtl">{labelAr}</p>
      <p className={`mt-1 font-mono text-sm font-semibold ${tone === "green" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-white"}`}>{value}</p>
    </div>
  );
}

function RangeLabel({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-white">{formatCurrency(value)}</p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-400">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-200" style={{ width: `${clamp(value, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function MemoSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="glass-panel p-4">
      <h3 className="section-title">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{body || "No notes yet."}</p>
    </section>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function maxBy<T>(items: T[], getter: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (!best || getter(item) > getter(best) ? item : best), null);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isPriceStale(priceUpdatedAt: string) {
  const updatedAt = new Date(priceUpdatedAt).getTime();
  if (!Number.isFinite(updatedAt)) return true;
  return Date.now() - updatedAt > 12 * 60 * 60 * 1000;
}

function formatPriceUpdated(priceUpdatedAt: string) {
  const updatedAt = new Date(priceUpdatedAt);
  if (Number.isNaN(updatedAt.getTime())) return "not updated";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(updatedAt);
}

function safetyLabel(margin: number) {
  if (margin > 40) return "Undervalued";
  if (margin >= 20) return "Buy Zone";
  if (margin >= 10) return "Watch";
  if (margin >= 0) return "Fair Value";
  return "Overvalued";
}

function safetyLabelAr(margin: number) {
  if (margin > 40) return "أقل من القيمة";
  if (margin >= 20) return "منطقة شراء";
  if (margin >= 10) return "للمراقبة";
  if (margin >= 0) return "قيمة عادلة";
  return "أعلى من القيمة";
}

function computeDecision(stock: Stock): Decision {
  const margin = marginToFairValue(stock);
  if (margin > 40) return "Strong Buy";
  if (margin >= 20) return "Buy";
  if (margin >= 10) return "Watch";
  if (margin >= 0) return "Hold";
  return stock.owned ? "Trim" : "Avoid";
}

function safetyClass(margin: number) {
  if (margin > 40) return "emerald";
  if (margin >= 20) return "green";
  if (margin >= 10) return "amber";
  if (margin >= 0) return "slate";
  return "red";
}

function decisionClass(decision: Decision) {
  return {
    "Strong Buy": "emerald",
    Buy: "green",
    Watch: "amber",
    Hold: "slate",
    Avoid: "red",
    Trim: "orange"
  }[decision];
}

function riskClass(risk: Risk) {
  return { High: "red", Medium: "amber", Low: "green" }[risk];
}

function convictionClass(conviction: Conviction) {
  return { High: "emerald", Medium: "cyan", Low: "slate" }[conviction];
}
