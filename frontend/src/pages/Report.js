import React, { useEffect, useState } from "react";
import {
  FileDown,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getReportSummary, downloadCsv, getTaxSummary } from "../api/reportApi";
import { SkeletonCard, SkeletonTable } from "../components/Skeleton";

// ── Tiny SVG sparkline ────────────────────────────────────────────────────────
const Sparkline = ({ data, positive }) => {
  if (!data || data.length < 2) return null;
  const w = 56, h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const color = positive ? "#34d399" : "#f87171";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
};

// ── Gain % color by magnitude ────────────────────────────────────────────────
const gainColor = (pct) => {
  const p = parseFloat(pct);
  if (p >= 100) return "text-emerald-300";
  if (p >= 50)  return "text-emerald-400";
  if (p >= 10)  return "text-emerald-500";
  if (p >= 0)   return "text-emerald-600";
  if (p >= -10) return "text-red-500";
  if (p >= -50) return "text-red-400";
  return "text-red-300";
};

const CURRENT_YEAR = new Date().getFullYear();
const FY_OPTIONS = [
  { label: `FY ${CURRENT_YEAR}-${String(CURRENT_YEAR + 1).slice(-2)}`, value: CURRENT_YEAR },
  { label: `FY ${CURRENT_YEAR - 1}-${String(CURRENT_YEAR).slice(-2)}`, value: CURRENT_YEAR - 1 },
  { label: `FY ${CURRENT_YEAR - 2}-${String(CURRENT_YEAR - 1).slice(-2)}`, value: CURRENT_YEAR - 2 },
];

const Report = () => {
  const [summary,     setSummary]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [taxSummary,  setTaxSummary]  = useState(null);
  const [taxLoading,  setTaxLoading]  = useState(false);
  const [taxOpen,     setTaxOpen]     = useState(false);
  const [selectedFY,  setSelectedFY]  = useState(CURRENT_YEAR);
  const [stickyVisible, setStickyVisible] = useState(false);
  const summaryRef = React.useRef(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  // Sticky summary cards observer
  useEffect(() => {
    const el = summaryRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await getReportSummary();
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to fetch report:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxSummary = async () => {
    setTaxLoading(true);
    try {
      const res = await getTaxSummary({ fy: selectedFY });
      setTaxSummary(res.data);
      setTaxOpen(true);
    } catch (err) {
      console.error("Tax summary failed:", err);
    } finally {
      setTaxLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await downloadCsv();
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", "blockfoliox_report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  const formatINR = (v) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(v || 0);

  const formatUSD = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(v || 0);

  const PriceBadge = ({ inr, usd, label }) => {
    const valInr = parseFloat(inr);
    const valUsd = parseFloat(usd);
    if (valInr === 0 && valUsd === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700/60 text-slate-400 border border-slate-600/40">
          No price
        </span>
      );
    }
    return <span className="text-white">{label === "inr" ? formatINR(valInr) : formatUSD(valUsd)}</span>;
  };

  const handlePdf = () => {
    const printWindow = window.open("", "_blank");
    const usdRate     = parseFloat(usdToInr).toFixed(2);

    const unrealizedRows = unrealizedBreakdown
      .map((row) => {
        const gain    = parseFloat(row.unrealizedGainInr);
        const color   = gain >= 0 ? "#16a34a" : "#dc2626";
        const priceInr = parseFloat(row.currentPriceInr) === 0 ? "N/A" : formatINR(row.currentPriceInr);
        const priceUsd = parseFloat(row.currentPriceUsd) === 0 ? "N/A" : formatUSD(row.currentPriceUsd);
        return `
        <tr>
          <td style="font-weight:600">${row.symbol}</td>
          <td>${parseFloat(row.quantity).toFixed(4)}</td>
          <td>${formatINR(row.avgCostInr)}</td>
          <td>${priceInr}</td>
          <td style="color:#64748b">${priceUsd}</td>
          <td style="color:${color};font-weight:600">${gain >= 0 ? "+" : ""}${formatINR(gain)}</td>
          <td style="color:${color}">${gain >= 0 ? "+" : ""}${formatUSD(row.unrealizedGainUsd)}</td>
          <td style="color:${color};font-weight:600">${gain >= 0 ? "+" : ""}${parseFloat(row.gainPercent).toFixed(2)}%</td>
        </tr>`;
      })
      .join("");

    const realizedRows = realizedBreakdown
      .filter((row) => parseFloat(row.realizedGainInr) !== 0)
      .map((row) => {
        const gain  = parseFloat(row.realizedGainInr);
        const color = gain >= 0 ? "#16a34a" : "#dc2626";
        return `
        <tr>
          <td style="font-weight:600">${row.symbol}</td>
          <td style="color:${color};font-weight:600">${gain >= 0 ? "+" : ""}${formatINR(gain)}</td>
          <td style="color:${color}">${gain >= 0 ? "+" : ""}${formatUSD(row.realizedGainUsd)}</td>
        </tr>`;
      })
      .join("");

    const noRealized =
      realizedBreakdown.filter((r) => parseFloat(r.realizedGainInr) !== 0).length === 0
        ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:20px">No realized gains yet.</td></tr>`
        : realizedRows;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BlockfolioX — P&L Report</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:#1e293b; padding:40px; background:#fff; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:2px solid #e2e8f0; }
          .brand { font-size:26px; font-weight:800; color:#4f46e5; letter-spacing:-0.5px; }
          .brand span { color:#7c3aed; }
          .report-title { font-size:13px; color:#64748b; margin-top:4px; }
          .meta { text-align:right; font-size:12px; color:#64748b; line-height:1.8; }
          .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
          .card { border-radius:10px; padding:16px; border:1px solid #e2e8f0; }
          .card.neutral { background:#f8fafc; }
          .card.profit  { background:#f0fdf4; border-color:#bbf7d0; }
          .card.loss    { background:#fef2f2; border-color:#fecaca; }
          .card-label   { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; }
          .card-inr     { font-size:17px; font-weight:800; color:#1e293b; }
          .card.profit .card-inr { color:#16a34a; }
          .card.loss   .card-inr { color:#dc2626; }
          .card-usd     { font-size:12px; color:#94a3b8; margin-top:4px; }
          .section { page-break-inside:avoid; margin-bottom:28px; }
          .section-title { font-size:14px; font-weight:700; color:#1e293b; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; }
          table { width:100%; border-collapse:collapse; font-size:12px; }
          thead tr { background:#f1f5f9; }
          th { padding:9px 12px; text-align:left; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.04em; border-bottom:2px solid #e2e8f0; }
          th:not(:first-child) { text-align:right; }
          td { padding:9px 12px; border-bottom:1px solid #f1f5f9; color:#334155; }
          td:not(:first-child) { text-align:right; }
          tr:last-child td { border-bottom:none; }
          .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; }
          @media print { body { padding:20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Blockfolio<span>X</span></div>
            <div class="report-title">Crypto Portfolio — P&L Report</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${new Date().toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" })}</div>
            <div><strong>Time:</strong> ${new Date().toLocaleTimeString("en-IN")}</div>
            <div><strong>USD/INR Rate:</strong> ₹${usdRate}</div>
          </div>
        </div>
        <div class="summary-grid">
          <div class="card neutral"><div class="card-label">Total Invested</div><div class="card-inr">${formatINR(investedInr)}</div><div class="card-usd">${formatUSD(investedInr / usdToInr)}</div></div>
          <div class="card neutral"><div class="card-label">Current Value</div><div class="card-inr">${formatINR(currentInr)}</div><div class="card-usd">${formatUSD(currentInr / usdToInr)}</div></div>
          <div class="card ${unrealizedInr >= 0 ? "profit" : "loss"}"><div class="card-label">Unrealized Gain</div><div class="card-inr">${unrealizedInr >= 0 ? "+" : ""}${formatINR(unrealizedInr)}</div><div class="card-usd">${unrealizedInr >= 0 ? "+" : ""}${formatUSD(unrealizedUsd)}</div></div>
          <div class="card ${realizedInr >= 0 ? "profit" : "loss"}"><div class="card-label">Realized Gain (FIFO)</div><div class="card-inr">${realizedInr >= 0 ? "+" : ""}${formatINR(realizedInr)}</div><div class="card-usd">${realizedInr >= 0 ? "+" : ""}${formatUSD(realizedUsd)}</div></div>
        </div>
        <div class="section">
          <div class="section-title">Unrealized Gains — Current Holdings</div>
          <table>
            <thead><tr><th>Symbol</th><th>Quantity</th><th>Avg Cost (INR)</th><th>Current Price (INR)</th><th>Current Price (USD)</th><th>Gain (INR)</th><th>Gain (USD)</th><th>Gain %</th></tr></thead>
            <tbody>${unrealizedRows}</tbody>
          </table>
        </div>
        <div class="section">
          <div class="section-title">Realized Gains — FIFO Calculation</div>
          <table>
            <thead><tr><th>Symbol</th><th>Realized Gain (INR)</th><th>Realized Gain (USD)</th></tr></thead>
            <tbody>${noRealized}</tbody>
          </table>
        </div>
        <div class="footer">
          <span>BlockfolioX — Crypto Portfolio Tracker</span>
          <span>This report is for informational purposes only and does not constitute financial advice.</span>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse bg-slate-800 rounded-lg h-7 w-32 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="animate-pulse bg-slate-800 rounded-lg h-5 w-48 mb-4" />
          <SkeletonTable rows={8} />
        </div>
      </div>
    );
  }

  const realized   = summary?.realized   || {};
  const unrealized = summary?.unrealized || {};
  const usdToInr   = summary?.usdToInrRate || 83.5;

  const realizedInr   = parseFloat(realized.totalRealizedInr   || 0);
  const realizedUsd   = parseFloat(realized.totalRealizedUsd   || 0);
  const unrealizedInr = parseFloat(unrealized.totalUnrealizedInr || 0);
  const unrealizedUsd = parseFloat(unrealized.totalUnrealizedUsd || 0);
  const investedInr   = parseFloat(unrealized.totalInvestedInr  || 0);
  const currentInr    = parseFloat(unrealized.totalCurrentInr   || 0);

  const unrealizedBreakdown = unrealized.breakdown || [];
  const realizedBreakdown   = realized.breakdown   || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">

      {/* ── Sticky mini summary bar ──────────────────────────────────────────── */}
      <div className={`fixed top-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-4 py-2 transition-all duration-300 ${stickyVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-sm">
          <span className="font-bold text-white flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-400" /> P&L Report
          </span>
          <div className="flex gap-6 text-xs">
            <span className="text-slate-400">Invested <span className="text-white font-semibold">{formatINR(investedInr)}</span></span>
            <span className="text-slate-400">Value <span className="text-white font-semibold">{formatINR(currentInr)}</span></span>
            <span className="text-slate-400">Unrealized <span className={`font-semibold ${unrealizedInr >= 0 ? "text-emerald-400" : "text-red-400"}`}>{unrealizedInr >= 0 ? "+" : ""}{formatINR(unrealizedInr)}</span></span>
            <span className="text-slate-400">Realized <span className={`font-semibold ${realizedInr >= 0 ? "text-emerald-400" : "text-red-400"}`}>{realizedInr >= 0 ? "+" : ""}{formatINR(realizedInr)}</span></span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart2 size={22} className="text-indigo-400" />
              P&L Report
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              USD/INR Rate: ₹{parseFloat(usdToInr).toFixed(2)}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={fetchSummary} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition">
              <RefreshCcw size={15} /> Refresh
            </button>
            <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white transition disabled:opacity-60">
              <FileDown size={15} />
              {downloading ? "Downloading..." : "Export CSV"}
            </button>
            <button onClick={handlePdf} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition">
              <FileText size={15} /> Export PDF
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div ref={summaryRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <SummaryCard title="Total Invested" inr={formatINR(investedInr)} usd={formatUSD(investedInr / usdToInr)} icon={<DollarSign size={18} className="text-slate-400" />} neutral />
          <SummaryCard title="Current Value" inr={formatINR(currentInr)} usd={formatUSD(currentInr / usdToInr)} icon={<DollarSign size={18} className="text-indigo-400" />} neutral />
          <SummaryCard
            title="Unrealized Gain"
            inr={formatINR(unrealizedInr)}
            usd={formatUSD(unrealizedUsd)}
            icon={unrealizedInr >= 0 ? <TrendingUp size={18} className="text-emerald-400" /> : <TrendingDown size={18} className="text-red-400" />}
            positive={unrealizedInr >= 0}
          />
          <SummaryCard
            title="Realized Gain"
            inr={formatINR(realizedInr)}
            usd={formatUSD(realizedUsd)}
            icon={realizedInr >= 0 ? <TrendingUp size={18} className="text-emerald-400" /> : <TrendingDown size={18} className="text-red-400" />}
            positive={realizedInr >= 0}
          />
        </div>

        {/* ── Unrealized Gains Table ── */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-white mb-4">Unrealized Gains — Current Holdings</h3>
          {unrealizedBreakdown.length === 0 ? (
            <p className="text-slate-500 text-sm">No holdings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-400 text-xs font-semibold border-y border-slate-800/60 bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Avg Cost (INR)</th>
                    <th className="px-4 py-3 text-right">Current Price (INR)</th>
                    <th className="px-4 py-3 text-right">Current Price (USD)</th>
                    <th className="px-4 py-3 text-right">Gain (INR)</th>
                    <th className="px-4 py-3 text-right">Gain (USD)</th>
                    <th className="px-4 py-3 text-right">Gain %</th>
                    <th className="px-4 py-3 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {unrealizedBreakdown.map((row) => {
                    const gain = parseFloat(row.unrealizedGainInr);
                    const pct  = parseFloat(row.gainPercent);
                    // Build a mock sparkline from avg cost → current price with 7 pts
                    const start  = parseFloat(row.avgCostInr);
                    const end    = parseFloat(row.currentPriceInr) || start;
                    const spark  = Array.from({ length: 7 }, (_, i) => {
                      const t = i / 6;
                      return start + (end - start) * t + (Math.random() - 0.5) * Math.abs(end - start) * 0.15;
                    });
                    return (
                      <tr key={row.symbol} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-bold text-white">{row.symbol}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{parseFloat(row.quantity).toFixed(4)}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{formatINR(row.avgCostInr)}</td>
                        <td className="px-4 py-3 text-right">
                          <PriceBadge inr={row.currentPriceInr} usd={row.currentPriceUsd} label="inr" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PriceBadge inr={row.currentPriceInr} usd={row.currentPriceUsd} label="usd" />
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {gain >= 0 ? "+" : ""}{formatINR(gain)}
                        </td>
                        <td className={`px-4 py-3 text-right ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {gain >= 0 ? "+" : ""}{formatUSD(row.unrealizedGainUsd)}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${gainColor(pct)}`}>
                          {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <Sparkline data={spark} positive={gain >= 0} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Realized Gains Table ── */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-white mb-4">Realized Gains — FIFO Calculation</h3>
          {realizedBreakdown.filter((r) => parseFloat(r.realizedGainInr) !== 0).length === 0 ? (
            <p className="text-slate-500 text-sm">No realized gains yet. Add sell trades to see FIFO calculations.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-400 text-xs font-semibold border-y border-slate-800/60 bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3 text-right">Realized Gain (INR)</th>
                    <th className="px-4 py-3 text-right">Realized Gain (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {realizedBreakdown
                    .filter((row) => parseFloat(row.realizedGainInr) !== 0)
                    .map((row) => {
                      const gain = parseFloat(row.realizedGainInr);
                      return (
                        <tr key={row.symbol} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-bold text-white">{row.symbol}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {gain >= 0 ? "+" : ""}{formatINR(gain)}
                          </td>
                          <td className={`px-4 py-3 text-right ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {gain >= 0 ? "+" : ""}{formatUSD(row.realizedGainUsd)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Tax Hints — Accordion ── */}
        <div className="border border-amber-700/40 rounded-xl overflow-hidden">
          {/* Accordion header */}
          <button
            onClick={() => {
              if (!taxSummary) fetchTaxSummary();
              else setTaxOpen((o) => !o);
            }}
            className="w-full flex items-center justify-between px-6 py-4 bg-amber-900/10 hover:bg-amber-900/20 transition"
            disabled={taxLoading}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🧾</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-amber-300">Tax Hints — India</p>
                <p className="text-xs text-slate-400 mt-0.5">30% flat rate · Section 194S TDS</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* FY Selector */}
              <select
                value={selectedFY}
                onChange={(e) => { setSelectedFY(Number(e.target.value)); setTaxSummary(null); setTaxOpen(false); }}
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {FY_OPTIONS.map((fy) => (
                  <option key={fy.value} value={fy.value}>{fy.label}</option>
                ))}
              </select>
              {taxLoading
                ? <RefreshCcw size={16} className="text-amber-400 animate-spin" />
                : taxOpen
                  ? <ChevronUp size={16} className="text-amber-400" />
                  : <ChevronDown size={16} className="text-amber-400" />
              }
            </div>
          </button>

          {/* Accordion body */}
          {taxOpen && taxSummary && (
            <div className="px-6 pb-6 pt-4 bg-amber-900/10">
              {/* Tax Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <TaxCard label="Total Realized Gain" value={formatINR(taxSummary.totalRealizedGainInr)} sub="Subject to 30% tax" />
                <TaxCard label="Tax Payable @ 30%" value={formatINR(taxSummary.totalTaxPayableInr)} highlight />
                <TaxCard label="TDS Already Deducted" value={formatINR(taxSummary.totalTdsDeductedInr)} sub="Section 194S (1%)" />
                <TaxCard label="Net Tax Still Due" value={formatINR(taxSummary.netTaxAfterTdsInr)} sub="After TDS credit" highlight />
              </div>

              {/* Legal badges */}
              <div className="flex flex-wrap gap-2 mb-5 text-xs">
                <span className="px-3 py-1 rounded-full bg-amber-800/40 text-amber-300 border border-amber-700/40">{taxSummary.taxRate}</span>
                <span className="px-3 py-1 rounded-full bg-amber-800/40 text-amber-300 border border-amber-700/40">{taxSummary.tdsRate}</span>
              </div>

              {/* Per-symbol breakdown */}
              {taxSummary.breakdown?.filter((r) => parseFloat(r.totalGainInr) !== 0).length > 0 && (
                <div className="overflow-x-auto mb-5">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-400 text-xs font-semibold border-y border-amber-800/40">
                      <tr>
                        <th className="px-4 py-3 text-left">Symbol</th>
                        <th className="px-4 py-3 text-right">Realized Gain (INR)</th>
                        <th className="px-4 py-3 text-right">Tax @ 30% (INR)</th>
                        <th className="px-4 py-3 text-right">TDS Deducted (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxSummary.breakdown
                        .filter((r) => parseFloat(r.totalGainInr) !== 0)
                        .map((row) => (
                          <tr key={row.symbol} className="border-b border-amber-900/30 hover:bg-amber-900/10">
                            <td className="px-4 py-3 font-bold text-white">{row.symbol}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${parseFloat(row.totalGainInr) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {formatINR(row.totalGainInr)}
                            </td>
                            <td className="px-4 py-3 text-right text-amber-300 font-semibold">{formatINR(row.taxPayableInr)}</td>
                            <td className="px-4 py-3 text-right text-slate-400">{formatINR(row.tdsDeductedInr)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-slate-500 italic border-t border-amber-800/30 pt-4">⚠️ {taxSummary.disclaimer}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const SummaryCard = ({ title, inr, usd, icon, positive, neutral }) => (
  <div className={`p-5 rounded-xl border ${
    neutral
      ? "bg-slate-800/40 border-slate-700/50"
      : positive
        ? "bg-emerald-900/10 border-emerald-800/40"
        : "bg-red-900/10 border-red-800/40"
  }`}>
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      {icon}
    </div>
    <p className={`text-xl font-bold ${neutral ? "text-white" : positive ? "text-emerald-400" : "text-red-400"}`}>{inr}</p>
    <p className="text-sm text-slate-500 mt-0.5">{usd}</p>
  </div>
);

const TaxCard = ({ label, value, sub, highlight }) => (
  <div className={`p-4 rounded-xl border ${highlight ? "bg-amber-900/20 border-amber-700/50" : "bg-slate-800/40 border-slate-700/40"}`}>
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-lg font-bold ${highlight ? "text-amber-300" : "text-white"}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

export default Report;