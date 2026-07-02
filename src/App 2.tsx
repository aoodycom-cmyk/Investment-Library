import {
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  LineChart,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  marginToFairValue,
  riskRank,
  upsideToBullish
} from "./lib/calculations";
import { exportToCsv, exportToPdf } from "./lib/exporters";
import { localStockRepository } from "./lib/storage";
import { Conviction, Decision, Filters, Risk, Stock } from "./types";

const decisions: Decision[] = ["Buy", "Watch", "Hold", "Avoid", "Trim"];
const convictions: Conviction[] = ["Low", "Medium", "High"];
const risks: Risk[] = ["Low", "Medium", "High"];

const emptyStock = (): Stock => ({
  id: crypto.randomUUID(),
  ticker: "",
  companyName: "",
  owned: false,
  lastPrice: 0,
  morningstarFairValue: 0,
  bearPrice: 0,
  neutralPrice: 0,
  bullishPrice: 0,
  decision: "Watch",
  conviction: "Medium",
  risk: "Medium",
  thesis: "",
  whyItCanWin: "",
  keyRisks: "",
  entryPlan: "",
  exitTrigger: "",
  notes: "",
  lastUpdated: new Date().toISOString().slice(0, 10)
});

const badgeStyles = {
  owned: "border-sky-400/30 bg-sky-400/12 text-sky-200",
  Buy: "border-emerald-400/30 bg-emerald-400/12 text-emerald-200",
  Watch: "border-amber-300/30 bg-amber-300/12 text-amber-100",
  Hold: "border-slate-400/30 bg-slate-400/12 text-slate-200",
  Avoid: "border-red-400/30 bg-red-400/12 text-red-200",
  Trim: "border-orange-400/30 bg-orange-400/12 text-orange-200",
  High: "border-red-400/30 bg-red-400/12 text-red-200",
  Medium: "border-amber-300/30 bg-amber-300/12 text-amber-100",
  Low: "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
};

export function App() {
  const [stocks, setStocks] = useState<Stock[]>(() => localStockRepository.list());
  const [selectedId, setSelectedId] = useState(stocks[0]?.id ?? "");
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    owned: "All",
    decision: "All",
    risk: "All",
    conviction: "All",
    sort: "Highest upside to bullish"
  });

  useEffect(() => {
    localStockRepository.save(stocks);
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    const riskOrder = { High: 3, Medium: 2, Low: 1 };
    return stocks
      .filter((stock) => {
        const matchesQuery =
          stock.ticker.toLowerCase().includes(query.toLowerCase()) ||
          stock.companyName.toLowerCase().includes(query.toLowerCase());
        const matchesOwned =
          filters.owned === "All" ||
          (filters.owned === "Owned" && stock.owned) ||
          (filters.owned === "Not Owned" && !stock.owned);
        const matchesDecision = filters.decision === "All" || stock.decision === filters.decision;
        const matchesRisk = filters.risk === "All" || stock.risk === filters.risk;
        const matchesConviction =
          filters.conviction === "All" || stock.conviction === filters.conviction;
        return matchesQuery && matchesOwned && matchesDecision && matchesRisk && matchesConviction;
      })
      .sort((a, b) => {
        if (filters.sort === "Highest margin to fair value") {
          return marginToFairValue(b) - marginToFairValue(a);
        }
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
    const bestUpside = stocks.reduce<Stock | null>(
      (best, stock) => (!best || upsideToBullish(stock) > upsideToBullish(best) ? stock : best),
      null
    );
    const highestRisk = stocks.reduce<Stock | null>(
      (highest, stock) => (!highest || riskRank(stock.risk) > riskRank(highest.risk) ? stock : highest),
      null
    );
    const lastUpdated = stocks.reduce(
      (latest, stock) => (stock.lastUpdated > latest ? stock.lastUpdated : latest),
      stocks[0]?.lastUpdated ?? new Date().toISOString().slice(0, 10)
    );
    return [
      { label: "Total Stocks", value: stocks.length, detail: "Research library", icon: BarChart3 },
      {
        label: "Owned Stocks",
        value: stocks.filter((stock) => stock.owned).length,
        detail: "Current holdings",
        icon: CheckCircle2
      },
      {
        label: "Best Upside",
        value: bestUpside ? `${bestUpside.ticker} ${formatPercent(upsideToBullish(bestUpside))}` : "-",
        detail: "To bullish case",
        icon: LineChart
      },
      {
        label: "Highest Risk",
        value: highestRisk ? `${highestRisk.ticker} ${highestRisk.risk}` : "-",
        detail: "Risk monitor",
        icon: ShieldAlert
      },
      { label: "Last Updated", value: formatDate(lastUpdated), detail: "Latest note", icon: FileText }
    ];
  }, [stocks]);

  const upsertStock = (stock: Stock) => {
    const normalized = {
      ...stock,
      ticker: stock.ticker.trim().toUpperCase(),
      companyName: stock.companyName.trim(),
      lastUpdated: new Date().toISOString().slice(0, 10)
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
    <main className="min-h-screen bg-[#080d16] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
              Research Watchlist
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
              Investment reference library
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Track valuation ranges, ownership status, thesis quality, risk, and review triggers after
              your deeper valuation work is complete.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="icon-button" onClick={() => exportToCsv(filteredStocks)} title="Export CSV">
              <Download size={18} />
              <span>CSV</span>
            </button>
            <button className="icon-button" onClick={() => exportToPdf(filteredStocks)} title="Export PDF">
              <ArrowDownToLine size={18} />
              <span>PDF</span>
            </button>
            <button className="primary-button" onClick={() => setEditingStock(emptyStock())}>
              <Plus size={18} />
              <span>Add Stock</span>
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <div className="panel p-4" key={kpi.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  {kpi.label}
                </p>
                <kpi.icon className="text-slate-500" size={18} />
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">{kpi.value}</p>
              <p className="mt-1 text-sm text-slate-500">{kpi.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(400px,0.85fr)]">
          <div className="panel overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-white/10 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Dashboard</h2>
                <p className="text-sm text-slate-500">{filteredStocks.length} stocks in current view</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[190px_130px_130px_130px_210px]">
                <label className="search-box sm:col-span-2 xl:col-span-1">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search ticker"
                  />
                </label>
                <Select value={filters.owned} onChange={(owned) => setFilters({ ...filters, owned })}>
                  {["All", "Owned", "Not Owned"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
                <Select
                  value={filters.decision}
                  onChange={(decision) => setFilters({ ...filters, decision })}
                >
                  {["All", ...decisions].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
                <Select value={filters.risk} onChange={(risk) => setFilters({ ...filters, risk })}>
                  {["All", ...risks].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
                <Select value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })}>
                  {[
                    "Highest upside to bullish",
                    "Highest margin to fair value",
                    "Highest risk",
                    "Recently updated"
                  ].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-slate-500">
                    {[
                      "Stock",
                      "Owned",
                      "Last Price",
                      "Morningstar Fair Value",
                      "Margin to Fair Value %",
                      "Bear Case Price",
                      "Neutral Case Price",
                      "Bullish Case Price",
                      "Upside to Bullish %",
                      "Decision",
                      "Conviction",
                      "Risk",
                      "Last Updated"
                    ].map((header) => (
                      <th className="px-4 py-3 font-medium" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock) => (
                    <tr
                      className={`cursor-pointer border-b border-white/[0.06] transition hover:bg-white/[0.045] ${
                        selectedStock?.id === stock.id ? "bg-sky-400/[0.055]" : ""
                      }`}
                      key={stock.id}
                      onClick={() => setSelectedId(stock.id)}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">{stock.ticker}</div>
                        <div className="max-w-[190px] truncate text-xs text-slate-500">
                          {stock.companyName}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {stock.owned ? <Badge className={badgeStyles.owned}>Yes</Badge> : <span>No</span>}
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-200">
                        {formatCurrency(stock.lastPrice)}
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-200">
                        {formatCurrency(stock.morningstarFairValue)}
                      </td>
                      <MetricCell value={marginToFairValue(stock)} />
                      <td className="px-4 py-4 font-mono text-slate-300">{formatCurrency(stock.bearPrice)}</td>
                      <td className="px-4 py-4 font-mono text-slate-300">
                        {formatCurrency(stock.neutralPrice)}
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-300">
                        {formatCurrency(stock.bullishPrice)}
                      </td>
                      <MetricCell value={upsideToBullish(stock)} />
                      <td className="px-4 py-4">
                        <Badge className={badgeStyles[stock.decision]}>{stock.decision}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={badgeStyles[stock.conviction]}>{stock.conviction}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={badgeStyles[stock.risk]}>{stock.risk}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-400">{formatDate(stock.lastUpdated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {editingStock && (
        <StockForm stock={editingStock} onCancel={() => setEditingStock(null)} onSave={upsertStock} />
      )}
    </main>
  );
}

function StockDetail({
  stock,
  onEdit,
  onDelete
}: {
  stock: Stock;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const margin = marginToFairValue(stock);
  const upside = upsideToBullish(stock);

  return (
    <aside className="panel h-fit overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Stock Detail
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{stock.ticker}</h2>
            <p className="mt-1 text-sm text-slate-400">{stock.companyName}</p>
          </div>
          <div className="flex gap-2">
            <button className="square-button" onClick={onEdit} title="Edit stock">
              <Pencil size={17} />
            </button>
            <button className="square-button danger" onClick={onDelete} title="Delete stock">
              <Trash2 size={17} />
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Current Price" value={formatCurrency(stock.lastPrice)} />
          <Stat label="Fair Value" value={formatCurrency(stock.morningstarFairValue)} />
          <Stat label="Margin of Safety" value={formatPercent(margin)} tone={margin >= 0 ? "green" : "red"} />
          <Stat label="Upside to Bullish" value={formatPercent(upside)} tone={upside >= 0 ? "green" : "red"} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 p-5">
        <ValuationCard label="Bear" value={stock.bearPrice} tone="red" />
        <ValuationCard label="Neutral" value={stock.neutralPrice} tone="amber" />
        <ValuationCard label="Bullish" value={stock.bullishPrice} tone="green" />
      </div>

      <div className="space-y-4 px-5 pb-5">
        <MemoSection title="My Investment Thesis" body={stock.thesis} />
        <MemoSection title="Why It Can Win" body={stock.whyItCanWin} />
        <MemoSection title="Key Risks" body={stock.keyRisks} />
        <MemoSection title="Entry Plan" body={stock.entryPlan} />
        <MemoSection title="Exit or Review Trigger" body={stock.exitTrigger} />
        <MemoSection title="Notes" body={stock.notes} />
        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-500">
          <span>Last updated</span>
          <span>{formatDate(stock.lastUpdated)}</span>
        </div>
      </div>
    </aside>
  );
}

function StockForm({
  stock,
  onCancel,
  onSave
}: {
  stock: Stock;
  onCancel: () => void;
  onSave: (stock: Stock) => void;
}) {
  const [draft, setDraft] = useState(stock);
  const setField = <K extends keyof Stock>(key: K, value: Stock[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form className="panel max-h-[92vh] w-full max-w-5xl overflow-y-auto" onSubmit={submit}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d1422]/95 p-5 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {stock.ticker ? `Edit ${stock.ticker}` : "Add Stock"}
            </h2>
            <p className="text-sm text-slate-500">Update valuation, decision, risk, and memo notes.</p>
          </div>
          <button className="square-button" type="button" onClick={onCancel} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Ticker">
            <input required value={draft.ticker} onChange={(event) => setField("ticker", event.target.value)} />
          </Field>
          <Field label="Company name">
            <input
              required
              value={draft.companyName}
              onChange={(event) => setField("companyName", event.target.value)}
            />
          </Field>
          <Field label="Owned">
            <select
              value={draft.owned ? "Yes" : "No"}
              onChange={(event) => setField("owned", event.target.value === "Yes")}
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="Decision">
            <select value={draft.decision} onChange={(event) => setField("decision", event.target.value as Decision)}>
              {decisions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
          {[
            ["Last price", "lastPrice"],
            ["Morningstar fair value", "morningstarFairValue"],
            ["Bear price", "bearPrice"],
            ["Neutral price", "neutralPrice"],
            ["Bullish price", "bullishPrice"]
          ].map(([label, key]) => (
            <Field label={label} key={key}>
              <input
                min="0"
                step="0.01"
                type="number"
                value={draft[key as keyof Stock] as number}
                onChange={(event) => setField(key as keyof Stock, Number(event.target.value) as never)}
              />
            </Field>
          ))}
          <Field label="Conviction">
            <select
              value={draft.conviction}
              onChange={(event) => setField("conviction", event.target.value as Conviction)}
            >
              {convictions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Risk">
            <select value={draft.risk} onChange={(event) => setField("risk", event.target.value as Risk)}>
              {risks.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          {[
            ["Thesis", "thesis"],
            ["Why it can win", "whyItCanWin"],
            ["Key risks", "keyRisks"],
            ["Entry plan", "entryPlan"],
            ["Exit/review trigger", "exitTrigger"],
            ["Notes", "notes"]
          ].map(([label, key]) => (
            <Field label={label} key={key}>
              <textarea
                rows={4}
                value={draft[key as keyof Stock] as string}
                onChange={(event) => setField(key as keyof Stock, event.target.value as never)}
              />
            </Field>
          ))}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-[#0d1422]/95 p-5 backdrop-blur">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            <CheckCircle2 size={18} />
            Save Stock
          </button>
        </div>
      </form>
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  children
}: {
  value: T;
  onChange: (value: T) => void;
  children: React.ReactNode;
}) {
  return (
    <select className="control" value={value} onChange={(event) => onChange(event.target.value as T)}>
      {children}
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

function MetricCell({ value }: { value: number }) {
  return (
    <td className={`px-4 py-4 font-mono font-semibold ${value >= 0 ? "text-emerald-300" : "text-red-300"}`}>
      {formatPercent(value)}
    </td>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const toneClass = tone === "green" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-white";
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 font-mono text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ValuationCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "green";
}) {
  const colors = {
    red: "border-red-400/20 bg-red-400/[0.055] text-red-200",
    amber: "border-amber-300/20 bg-amber-300/[0.055] text-amber-100",
    green: "border-emerald-400/20 bg-emerald-400/[0.055] text-emerald-200"
  };
  return (
    <div className={`rounded-md border p-3 ${colors[tone]}`}>
      <p className="text-xs uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-3 font-mono text-xl font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function MemoSection({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <p className="mt-2 rounded-md border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-slate-300">
        {body || "No notes yet."}
      </p>
    </section>
  );
}
