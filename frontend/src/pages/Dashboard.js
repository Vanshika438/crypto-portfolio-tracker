import React, { useEffect, useState } from "react";
import { getPortfolioSummary, getPortfolioPL } from "../api/holdingApi";
import { Star, TrendingUp, TrendingDown, RefreshCcw, Edit2, Trash2 } from "lucide-react";

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary] = useState({
    totalInvested: 0,
    currentValue: 0,
    totalProfitLoss: 0,
    profitLossPercent: 0
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 🔥 Fetch strictly from backend
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [summaryRes, plRes] = await Promise.all([
        getPortfolioSummary(),
        getPortfolioPL()
      ]);

      if (summaryRes?.data) {
        setSummary({
          totalInvested: summaryRes.data.totalInvested || 0,
          currentValue: summaryRes.data.currentValue || 0,
          totalProfitLoss: summaryRes.data.totalProfitLoss || 0,
          profitLossPercent: summaryRes.data.profitLossPercent || 0
        });
      }

      if (plRes?.data) {
        setPortfolio(plRes.data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatINR = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(value || 0);

  const guessSymbol = (name) => {
    const map = {
      bitcoin: "btc",
      ethereum: "eth",
      tether: "usdt",
      ripple: "xrp",
      "binance coin": "bnb",
      cardano: "ada",
      solana: "sol",
      dogecoin: "doge"
    };
    const lower = (name || "").toLowerCase().trim();
    return map[lower] || lower.substring(0, 3);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center text-slate-400">
        <RefreshCcw className="animate-spin mr-2" size={18} />
        Loading dashboard...
      </div>
    );
  }

  const isOverallProfit = summary.totalProfitLoss >= 0;

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-200">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Summary</h2>
            <p className="text-slate-400 text-sm mt-1">Real-time market tracking</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 font-medium">
              Last updated: {lastUpdated?.toLocaleTimeString()}
            </span>

            <button
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60 shadow-md"
            >
              <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card title="Total Invested" value={formatINR(summary.totalInvested)} />
          <Card title="Current Value" value={formatINR(summary.currentValue)} />

          <div className={`p-6 rounded-xl border ${
            isOverallProfit
              ? "bg-emerald-900/10 border-emerald-800/40"
              : "bg-red-900/10 border-red-800/40"
          }`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
              isOverallProfit ? "text-emerald-500" : "text-red-500"
            }`}>
              Total Profit / Loss
            </h4>
            <h3 className={`text-2xl font-bold ${
              isOverallProfit ? "text-emerald-400" : "text-red-400"
            }`}>
              {isOverallProfit ? "+" : ""}
              {formatINR(summary.totalProfitLoss)}
            </h3>
          </div>

          <Card
            title="Profit / Loss %"
            value={
              <div className={`flex items-center gap-2 font-bold ${
                isOverallProfit ? "text-emerald-400" : "text-red-400"
              }`}>
                {isOverallProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {Math.abs(summary.profitLossPercent).toFixed(2)}%
              </div>
            }
          />
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto w-full pb-10">
          <table className="min-w-full text-sm text-left whitespace-nowrap">
            <thead className="text-slate-400 text-xs font-semibold border-y border-slate-800/60 bg-slate-900/40">
              <tr>
                <th className="px-4 py-4 w-10"></th>
                <th className="px-4 py-4">Asset</th>
                <th className="px-4 py-4 text-right">Market Price</th>
                <th className="px-4 py-4 text-right">Holdings</th>
                <th className="px-4 py-4 text-right">Profit/Loss</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {portfolio.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-slate-500 py-10">
                    No assets in your portfolio.
                  </td>
                </tr>
              ) : (
                portfolio.map((asset, index) => {
                  const isProfit = asset.profitLoss >= 0;
                  const symbol = guessSymbol(asset.assetName);
                  const keyId = asset.id || asset.assetName || index;

                  return (
                    <tr
                      key={keyId}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition"
                    >
                      <td className="px-4 py-4 text-center">
                        <Star size={16} className="text-slate-600 hover:text-yellow-500 cursor-pointer transition-colors" />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://assets.coincap.io/assets/icons/${symbol}@2x.png`}
                            alt={asset.assetName}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              e.target.src =
                                "https://via.placeholder.com/32?text=" +
                                symbol.toUpperCase();
                            }}
                          />
                          <div>
                            <div className="font-bold text-white capitalize">
                              {asset.assetName}
                            </div>
                            <div className="text-xs text-slate-500 uppercase">
                              {symbol}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-white">
                        {formatINR(asset.currentPrice)}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="font-semibold text-white">
                          {formatINR(asset.currentValue)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {asset.quantity} {symbol.toUpperCase()}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className={`font-semibold ${
                          isProfit ? "text-emerald-500" : "text-red-500"
                        }`}>
                          {isProfit ? "+" : ""}
                          {formatINR(asset.profitLoss)}
                        </div>
                        <div className={`text-xs ${
                          isProfit ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {isProfit ? "+" : ""}
                          {(asset.profitLossPercent || 0).toFixed(2)}%
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition">
                            <Edit2 size={16} />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

const Card = ({ title, value }) => (
  <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-xl shadow-sm">
    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
      {title}
    </h4>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
);

export default Dashboard;