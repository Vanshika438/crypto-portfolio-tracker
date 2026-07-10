import React, { useEffect, useState, useCallback, useRef } from "react";
import { getPortfolioPL, getPortfolioSummary } from "../api/holdingApi";
import {
  RefreshCcw,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
  "#f97316", "#84cc16", "#a855f7", "#0ea5e9",
  "#e11d48", "#65a30d", "#0891b2", "#7c3aed"
];

// ── Custom donut center label ─────────────────────────────────────────────────
const DonutCenter = ({ viewBox, total, hovered, formatINR }) => {
  const { cx, cy } = viewBox;
  const label  = hovered ? hovered.name : "Total";
  const amount = hovered ? formatINR(hovered.value) : formatINR(total);
  const pct    = hovered ? `${hovered.percent}%` : "";
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={500}>
        {label}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700}>
        {amount}
      </text>
      {pct && (
        <text x={cx} y={cy + 24} textAnchor="middle" fill="#6366f1" fontSize={10}>
          {pct}
        </text>
      )}
    </g>
  );
};

const Portfolio = () => {
  const [portfolio,     setPortfolio]     = useState([]);
  const [summary,       setSummary]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [sortKey,       setSortKey]       = useState("value");
  const [sortDir,       setSortDir]       = useState("desc");
  const [activeSlice,   setActiveSlice]   = useState(null);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const tableRef = useRef(null);
  const rowRefs  = useRef({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setChartsLoading(true);
    try {
      const [plRes, summaryRes] = await Promise.all([
        getPortfolioPL(),
        getPortfolioSummary(),
      ]);
      setPortfolio(plRes.data || []);
      setSummary(summaryRes.data || null);
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setLoading(false);
      setTimeout(() => setChartsLoading(false), 300);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatINR = (v) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 2,
    }).format(v || 0);

  const totalValue = portfolio.reduce(
    (sum, a) => sum + parseFloat(a.currentValue || 0), 0
  );

  const allocationData = portfolio
    .filter((a) => parseFloat(a.currentValue || 0) > 0)
    .map((a) => ({
      name:              a.assetName,
      value:             parseFloat(parseFloat(a.currentValue || 0).toFixed(2)),
      percent:           totalValue > 0
        ? ((parseFloat(a.currentValue || 0) / totalValue) * 100).toFixed(1)
        : "0.0",
      profitLoss:        parseFloat(a.profitLoss || 0),
      profitLossPercent: parseFloat(a.profitLossPercent || 0),
      invested:          parseFloat(a.investedValue || 0),
    }))
    .sort((a, b) => b.value - a.value);

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown size={11} className="ml-1 text-slate-600" />;
    return sortDir === "asc"
      ? <ChevronUp size={11} className="ml-1 text-indigo-400" />
      : <ChevronDown size={11} className="ml-1 text-indigo-400" />;
  };

  // Filtered + sorted for the table
  const filteredData = allocationData
    .filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice()
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const top6       = allocationData.slice(0, 6);
  const others     = allocationData.slice(6);
  const otherValue = others.reduce((s, a) => s + a.value, 0);
  const otherPct   = totalValue > 0 ? ((otherValue / totalValue) * 100).toFixed(1) : "0.0";

  const pieData = otherValue > 0
    ? [...top6, { name: "Others", value: parseFloat(otherValue.toFixed(2)), percent: otherPct }]
    : top6;

  const barData = allocationData.slice(0, 8).map((a) => ({
    name:     a.name,
    Current:  parseFloat(a.value.toFixed(0)),
    Invested: parseFloat(a.invested.toFixed(0)),
    percent:  parseFloat(a.percent),
  }));

  const profitAssets = allocationData.filter((a) => a.profitLoss > 0).length;
  const lossAssets   = allocationData.filter((a) => a.profitLoss < 0).length;
  const isOverallProfit = (summary?.totalProfitLoss || 0) >= 0;

  // ── Donut click → scroll + highlight ──────────────────────────────────────
  const handlePieClick = (data) => {
    if (!data || data.name === "Others") return;
    setHighlightedRow(data.name);
    const rowEl = rowRefs.current[data.name];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setHighlightedRow(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="animate-pulse bg-slate-800 rounded-lg h-7 w-32 mb-2" />
              <div className="animate-pulse bg-slate-800 rounded-lg h-4 w-48" />
            </div>
            <div className="animate-pulse bg-slate-800 rounded-lg h-9 w-24" />
          </div>
          {/* Summary cards skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-800 rounded-xl h-24" />
            ))}
          </div>
          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="animate-pulse bg-slate-800 rounded-xl h-64" />
            <div className="animate-pulse bg-slate-800 rounded-xl h-64" />
          </div>
          <div className="animate-pulse bg-slate-800 rounded-xl h-64 mb-8" />
          <div className="animate-pulse bg-slate-800 rounded-xl h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <PieIcon className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Portfolio</h2>
              <p className="text-slate-400 text-sm">
                {allocationData.length} assets · Total {formatINR(totalValue)}
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Total Invested</p>
            <p className="text-xl font-bold text-white">{formatINR(summary?.totalInvested)}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Current Value</p>
            <p className="text-xl font-bold text-white">{formatINR(summary?.currentValue)}</p>
          </div>
          <div className={`rounded-xl p-5 border ${isOverallProfit ? "bg-emerald-900/10 border-emerald-800/40" : "bg-red-900/10 border-red-800/40"}`}>
            <p className={`text-xs uppercase tracking-wider mb-2 ${isOverallProfit ? "text-emerald-500" : "text-red-500"}`}>Total P&L</p>
            <p className={`text-xl font-bold flex items-center gap-1 ${isOverallProfit ? "text-emerald-400" : "text-red-400"}`}>
              {isOverallProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {isOverallProfit ? "+" : ""}{formatINR(summary?.totalProfitLoss)}
            </p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Assets</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-semibold text-emerald-400">↑ {profitAssets} profit</span>
              <span className="text-xs font-semibold text-red-400">↓ {lossAssets} loss</span>
            </div>
            <p className="text-xl font-bold text-white mt-1">{allocationData.length} total</p>
          </div>
        </div>

        {/* Donut Chart + Top Holdings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Donut Chart */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Allocation by Value</h3>
            <p className="text-xs text-slate-500 mb-4">Click a slice to highlight asset in the table</p>
            {chartsLoading ? (
              <div className="h-52 flex items-center justify-center">
                <RefreshCcw size={20} className="animate-spin text-slate-600" />
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      onClick={handlePieClick}
                      onMouseEnter={(_, index) => setActiveSlice(pieData[index])}
                      onMouseLeave={() => setActiveSlice(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="transparent"
                          opacity={activeSlice && activeSlice.name !== entry.name ? 0.5 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [formatINR(value), name]}
                      contentStyle={{
                        backgroundColor: "#111827",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                      <DonutCenter
                        viewBox={{ cx: "50%", cy: "50%" }}
                        total={totalValue}
                        hovered={activeSlice}
                        formatINR={formatINR}
                      />
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
              {pieData.map((entry, index) => (
                <button
                  key={entry.name}
                  onClick={() => handlePieClick(entry)}
                  className="flex items-center gap-1.5 hover:opacity-80 transition"
                >
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-slate-400">
                    {entry.name} <span className="text-slate-500">{entry.percent}%</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Top Holdings ranked list */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Top Holdings</h3>
            <p className="text-xs text-slate-500 mb-4">Ranked by current value</p>
            <div className="space-y-3">
              {top6.map((asset, index) => (
                <div
                  key={asset.name}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
                  onClick={() => handlePieClick(asset)}
                >
                  <span className="text-xs text-slate-600 font-bold w-4 text-right shrink-0">{index + 1}</span>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm font-semibold text-white w-14 shrink-0">{asset.name}</span>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${asset.percent}%`, backgroundColor: COLORS[index % COLORS.length] }}
                    />
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className="text-xs font-semibold text-white">{formatINR(asset.value)}</p>
                    <p className="text-xs text-slate-500">{asset.percent}%</p>
                  </div>
                </div>
              ))}
              {others.length > 0 && (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
                  <span className="text-xs text-slate-600 w-4 text-right shrink-0">—</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0" />
                  <span className="text-xs text-slate-400 w-14 shrink-0">+{others.length} more</span>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-slate-600" style={{ width: `${otherPct}%` }} />
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <p className="text-xs font-semibold text-slate-400">{formatINR(otherValue)}</p>
                    <p className="text-xs text-slate-500">{otherPct}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bar Chart — Invested vs Current */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-white mb-1">Value Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Invested vs current value per asset (top 8)</p>
          {chartsLoading ? (
            <div className="h-52 flex items-center justify-center">
              <RefreshCcw size={20} className="animate-spin text-slate-600" />
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(v) => {
                      if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                      if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
                      return `₹${v.toLocaleString("en-IN")}`;
                    }}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatINR(value), name]}
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", color: "#94a3b8", paddingTop: "8px" }}
                  />
                  <Bar dataKey="Invested" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Current" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Full Allocation Table */}
        <div ref={tableRef} className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-white">Full Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">All holdings with P&L and allocation</p>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search asset..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-400 text-xs font-semibold bg-slate-900/40">
                <tr>
                  {[
                    { label: "#", key: null },
                    { label: "Asset", key: "name" },
                    { label: "Current Value", key: "value", right: true },
                    { label: "Allocation", key: "percent", right: true },
                    { label: "P&L (INR)", key: "profitLoss", right: true },
                    { label: "P&L %", key: "profitLossPercent", right: true },
                  ].map(({ label, key, right }) => (
                    <th
                      key={label}
                      onClick={key ? () => handleSort(key) : undefined}
                      className={`px-5 py-3 ${right ? "text-right" : "text-left"} ${key ? "cursor-pointer select-none hover:text-slate-200 transition" : ""}`}
                    >
                      <span className="inline-flex items-center">
                        {label}
                        {key && <SortIcon col={key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((asset, index) => {
                  const isProfit = asset.profitLoss >= 0;
                  const colorIndex = allocationData.findIndex((a) => a.name === asset.name);
                  const isHighlighted = highlightedRow === asset.name;
                  return (
                    <tr
                      key={asset.name}
                      ref={(el) => { rowRefs.current[asset.name] = el; }}
                      className={`border-t border-slate-800/60 transition-all duration-300 ${
                        isHighlighted
                          ? "bg-indigo-500/20 border-indigo-500/30"
                          : "hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="px-5 py-3 text-slate-500 text-xs">{index + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[colorIndex % COLORS.length] }}
                          />
                          <span className="font-semibold text-white">{asset.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-white">{formatINR(asset.value)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-700/50 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${asset.percent}%`,
                                backgroundColor: COLORS[colorIndex % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-slate-400 text-xs w-10 text-right">{asset.percent}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                        {isProfit ? "+" : ""}{formatINR(asset.profitLoss)}
                      </td>
                      <td className={`px-5 py-3 text-right text-xs font-semibold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                        {isProfit ? "+" : ""}{asset.profitLossPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-sm">
                      No assets match "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Portfolio; 