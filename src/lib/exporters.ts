import jsPDF from "jspdf";
import { marginToFairValue, upsideToBullish } from "./calculations";
import { Stock } from "../types";

const csvHeaders = [
  "Ticker",
  "Company",
  "Owned",
  "Current Price",
  "Intrinsic Value",
  "Source",
  "Margin to Fair Value %",
  "Bear Case Price",
  "Neutral Case Price",
  "Bullish Case Price",
  "Upside to Bullish %",
  "Decision",
  "Conviction",
  "Risk",
  "Last Updated"
];

const escapeCsv = (value: string | number | boolean) =>
  `"${String(value).replaceAll('"', '""')}"`;

export function exportToCsv(stocks: Stock[]) {
  const rows = stocks.map((stock) => [
    stock.ticker,
    stock.companyName,
    stock.owned ? "Yes" : "No",
    stock.lastPrice,
    stock.morningstarFairValue,
    stock.valuationSource,
    marginToFairValue(stock).toFixed(1),
    stock.bearPrice,
    stock.neutralPrice,
    stock.bullishPrice,
    upsideToBullish(stock).toFixed(1),
    stock.decision,
    stock.conviction,
    stock.risk,
    stock.lastUpdated
  ]);
  const csv = [csvHeaders, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `stock-watchlist-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportToExcel(stocks: Stock[]) {
  const headers = [
    "Ticker",
    "Company",
    "Owned",
    "Current Price",
    "Intrinsic Value",
    "Source",
    "Margin",
    "Decision",
    "Conviction",
    "Risk"
  ];
  const rows = stocks
    .map(
      (stock) => `
        <tr>
          <td>${stock.ticker}</td>
          <td>${stock.companyName}</td>
          <td>${stock.owned ? "Yes" : "No"}</td>
          <td>${stock.lastPrice}</td>
          <td>${stock.morningstarFairValue}</td>
          <td>${stock.valuationSource}</td>
          <td>${marginToFairValue(stock).toFixed(1)}%</td>
          <td>${stock.decision}</td>
          <td>${stock.conviction}</td>
          <td>${stock.risk}</td>
        </tr>`
    )
    .join("");
  const workbook = `
    <html><head><meta charset="UTF-8" /></head><body>
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, `stock-watchlist-${new Date().toISOString().slice(0, 10)}.xls`);
}

export function exportToPdf(stocks: Stock[]) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  pdf.setFillColor(12, 18, 32);
  pdf.rect(0, 0, 842, 595, "F");
  pdf.setTextColor(235, 241, 248);
  pdf.setFontSize(18);
  pdf.text("Investment Research Watchlist", 40, 44);
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Generated ${new Date().toLocaleDateString()}`, 40, 62);

  let y = 96;
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  ["Ticker", "Owned", "Price", "Intrinsic", "Margin", "Bullish", "Upside", "Decision", "Risk"].forEach(
    (header, index) => pdf.text(header, 40 + index * 84, y)
  );
  y += 18;

  stocks.forEach((stock) => {
    if (y > 550) {
      pdf.addPage("a4", "landscape");
      pdf.setFillColor(12, 18, 32);
      pdf.rect(0, 0, 842, 595, "F");
      y = 46;
    }
    pdf.setTextColor(226, 232, 240);
    [
      stock.ticker,
      stock.owned ? "Yes" : "No",
      `$${stock.lastPrice}`,
      `$${stock.morningstarFairValue}`,
      `${marginToFairValue(stock).toFixed(1)}%`,
      `$${stock.bullishPrice}`,
      `${upsideToBullish(stock).toFixed(1)}%`,
      stock.decision,
      stock.risk
    ].forEach((value, index) => pdf.text(value, 40 + index * 84, y));
    y += 24;
  });

  pdf.save(`stock-watchlist-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
