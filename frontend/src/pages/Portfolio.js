import React, { useEffect, useState, useCallback } from "react";
import { getPortfolioPL, getPortfolioSummary } from "../api/holdingApi";
import { RefreshCcw, PieChart as PieIcon, TrendingUp, TrendingDown } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
  "#f97316", "#84cc16", "#a855f7", "#0ea5e9",
  "#e11d48", "#65a30d", "#0891b2", "#7c3aed"
];

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatINR = (v) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 2,
    }).format(v || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <RefreshCcw className="animate-spin mr-2" size={18} />
        Loading portfolio...
      </div>
    );
  }

  const totalValue = portfolio.reduce(
    (sum, a) => sum + parseFloat(a.currentValue || 0), 0
  );

  const allocationData = portfolio
    .filter((a) => parseFloat(a.currentValue || 0) > 0)
    .map((a) => ({
      name:    a.assetName,
      value:   parseFloat(parseFloat(a.currentValue || 0).toFixed(2)),
      percent: totalValue > 0
        ? ((parseFloat(a.currentValue || 0) / totalValue) * 100).toFixed(1)
        : "0.0",
      profitLoss:        parseFloat(a.profitLoss || 0),
      profitLossPercent: parseFloat(a.profitLossPercent || 0),
      invested:          parseFloat(a.investedValue || 0),
    }))
    .sort((a, b) => b.value - a.value);

  const top6   = allocationData.slice(0, 6);
  const others = allocationData.slice(6);
  const otherValue = others.reduce((s, a) => s + a.value, 0);
  const otherPct   = totalValue > 0
    ? ((otherValue / totalValue) * 100).toFixed(1) : "0.0";

  const pieData = otherValue > 0
    ? [...top6, { name: "Others", value: parseFloat(otherValue.toFixed(2)), percent: otherPct }]
    : top6;

  const barData = allocationData.slice(0, 8).map((a) => ({
    name:    a.name,
    value:   parseFloat(a.value.toFixed(0)),
    percent: parseFloat(a.percent),
  }));

  const profitAssets = allocationData.filter((a) => a.profitLoss > 0).length;
  const lossAssets   = allocationData.filter((a) => a.profitLoss < 0).length;

  const isOverallProfit = (summary?.totalProfitLoss || 0) >= 0;

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
          <div className={`rounded-xl p-5 border ${
            isOverallProfit ? "bg-emerald-900/10 border-emerald-800/40" : "bg-red-900/10 border-red-800/40"
          }`}>
            <p className={`text-xs uppercase tracking-wider mb-2 ${
              isOverallProfit ? "text-emerald-500" : "text-red-500"
            }`}>Total P&L</p>
            <p className={`text-xl font-bold flex items-center gap-1 ${
              isOverallProfit ? "text-emerald-400" : "text-red-400"
            }`}>
              {isOverallProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {isOverallProfit ? "+" : ""}{formatINR(summary?.totalProfitLoss)}
            </p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Assets</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-semibold text-emerald-400">
                ↑ {profitAssets} profit
              </span>
              <span className="text-xs font-semibold text-red-400">
                ↓ {lossAssets} loss
              </span>
            </div>
            <p className="text-xl font-bold text-white mt-1">{allocationData.length} total</p>
          </div>
        </div>

        {/* Donut Chart + Top Holdings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Donut Chart */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Allocation by Value</h3>
            <p className="text-xs text-slate-500 mb-4">Donut shows % of each asset in total portfolio</p>
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
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="transparent"
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
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-slate-400">
                    {entry.name} <span className="text-slate-500">{entry.percent}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Holdings ranked list */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Top Holdings</h3>
            <p className="text-xs text-slate-500 mb-4">Ranked by current value</p>
            <div className="space-y-3">
              {top6.map((asset, index) => (
                <div key={asset.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 font-bold w-4 text-right shrink-0">
                    {index + 1}
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-semibold text-white w-14 shrink-0">
                    {asset.name}
                  </span>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${asset.percent}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
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

        {/* Bar Chart — Value per asset */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-white mb-1">Value Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Current value per asset (top 8)</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
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
                  formatter={(value) => [formatINR(value), "Value"]}
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full Allocation Table */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-white">Full Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">All holdings with P&L and allocation</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-400 text-xs font-semibold bg-slate-900/40">
                <tr>
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Asset</th>
                  <th className="px-5 py-3 text-right">Current Value</th>
                  <th className="px-5 py-3 text-right">Allocation</th>
                  <th className="px-5 py-3 text-right">P&L (INR)</th>
                  <th className="px-5 py-3 text-right">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {allocationData.map((asset, index) => {
                  const isProfit = asset.profitLoss >= 0;
                  return (
                    <tr key={asset.name}
                      className="border-t border-slate-800/60 hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3 text-slate-500 text-xs">{index + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-semibold text-white">{asset.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-white">
                        {formatINR(asset.value)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-700/50 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${asset.percent}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-slate-400 text-xs w-10 text-right">
                            {asset.percent}%
                          </span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${
                        isProfit ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {isProfit ? "+" : ""}{formatINR(asset.profitLoss)}
                      </td>
                      <td className={`px-5 py-3 text-right text-xs font-semibold ${
                        isProfit ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {isProfit ? "+" : ""}{asset.profitLossPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Portfolio;