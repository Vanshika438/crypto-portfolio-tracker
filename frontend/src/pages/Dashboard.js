import React, { useEffect, useState, useCallback, useRef } from "react";
import { getPortfolioSummary, getPortfolioPL } from "../api/holdingApi";
import { syncExchange } from "../api/exchangeApi";
import { fetchCharts as fetchMarketCharts } from "../api/cryptoApi";
import { Star, TrendingUp, TrendingDown, RefreshCcw, Edit2, Trash2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

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
  const [charts, setCharts] = useState({});
  const [coinImages, setCoinImages] = useState({});
  const hasLoadedChartsRef = useRef(false);
  const exchangeId = 1;
  const [selectedCoin, setSelectedCoin] = useState(null);


  const guessSymbol = (name) => {
    const map = {
      bitcoin: "bitcoin",
      btc: "bitcoin",
      ethereum: "ethereum",
      eth: "ethereum",
      tether: "tether",
      usdt: "tether",
      ripple: "ripple",
      xrp: "ripple",
      "binance coin": "binancecoin",
      bnb: "binancecoin",
      cardano: "cardano",
      ada: "cardano",
      solana: "solana",
      sol: "solana",
      dogecoin: "dogecoin",
      doge: "dogecoin",
      matic: "matic-network",
      polygon: "matic-network"
    };

    const lower = (name || "").toLowerCase().trim();
    return map[lower] || lower;
  };

  const toCoincapSymbol = (name) => {
    const map = {
      bitcoin: "btc",
      btc: "btc",
      ethereum: "eth",
      eth: "eth",
      tether: "usdt",
      usdt: "usdt",
      ripple: "xrp",
      xrp: "xrp",
      "binance coin": "bnb",
      binancecoin: "bnb",
      bnb: "bnb",
      cardano: "ada",
      ada: "ada",
      solana: "sol",
      sol: "sol",
      dogecoin: "doge",
      doge: "doge"
    };
    const lower = (name || "").toLowerCase().trim();
    return map[lower] || lower.slice(0, 4);
  };

  const fetchCharts = useCallback(async (coins) => {
    try {
      const chartData = {};
      const imageData = {};
      const marketData = await fetchMarketCharts();

      const marketById = {};
      const marketRows = Array.isArray(marketData) ? marketData : [];

      marketRows.forEach((coin) => {
        if (coin?.id) {
          marketById[coin.id.toLowerCase()] = coin;
        }
      });

      for (const coin of coins) {
        const coinId = guessSymbol(coin.assetName);
        const symbol = toCoincapSymbol(coin.assetName);

        const marketItem = marketById[coinId];
        const prices = marketItem?.sparkline_in_7d?.price ?? [];

        chartData[coinId] = prices
          .map((value, index) => ({ time: index, value: Number(value) }))
          .filter((point) => Number.isFinite(point.value));

        imageData[coinId] =
          marketItem?.image ||
          `https://assets.coincap.io/assets/icons/${symbol}@2x.png`;
      }

      setCharts(chartData);
      setCoinImages(imageData);
      return true;
    } catch (err) {
      console.error("Chart error", err);
      return false;
    }
  }, []);
  const fetchDashboardData = useCallback(async () => {
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
        await fetchCharts(plRes.data);
        hasLoadedChartsRef.current = true;
      }
      setLastUpdated(new Date());

    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchCharts]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatINR = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(value || 0);

  const formatQuantity = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(4) : "0.0000";
  };


  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncExchange(exchangeId);
      await fetchDashboardData();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
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
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 shadow-md"
          >
            <RefreshCcw size={16} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync Exchange"}
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card title="Total Invested" value={formatINR(summary.totalInvested)} />
          <Card title="Current Value" value={formatINR(summary.currentValue)} />

          <div className={`p-6 rounded-xl border ${isOverallProfit
            ? "bg-emerald-900/10 border-emerald-800/40"
            : "bg-red-900/10 border-red-800/40"
            }`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isOverallProfit ? "text-emerald-500" : "text-red-500"
              }`}>
              Total Profit / Loss
            </h4>
            <h3 className={`text-2xl font-bold ${isOverallProfit ? "text-emerald-400" : "text-red-400"
              }`}>
              {isOverallProfit ? "+" : ""}
              {formatINR(summary.totalProfitLoss)}
            </h3>
          </div>

          <Card
            title="Profit / Loss %"
            value={
              <div className={`flex items-center gap-2 font-bold ${isOverallProfit ? "text-emerald-400" : "text-red-400"
                }`}>
                {isOverallProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {Math.abs(summary.profitLossPercent).toFixed(2)}%
              </div>
            }
          />
        </div>

        <div className="overflow-x-auto w-full pb-10">
          <table className="min-w-full text-sm text-left whitespace-nowrap">

            <thead className="text-slate-400 text-xs font-semibold border-y border-slate-800/60 bg-slate-900/40">
              <tr>
                <th className="px-4 py-4 w-10"></th>
                <th className="px-4 py-4">Asset</th>
                <th className="px-4 py-4 text-right w-36">Market Price</th>
                <th className="px-4 py-4 text-right w-44">Holdings</th>
                <th className="px-4 py-4 text-right w-40">Profit/Loss</th>
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
                  const coinId = guessSymbol(asset.assetName);
                  const symbol = toCoincapSymbol(asset.assetName);
                  const keyId = asset.id || asset.assetName || index;

                  return (
                    <React.Fragment key={keyId}>

                      {/* MAIN ROW */}
                      <tr
                        onClick={() =>
                          setSelectedCoin(
                            selectedCoin?.assetName === asset.assetName ? null : asset
                          )
                        }
                        className="border-b border-slate-800/60 hover:bg-slate-800/40 transition cursor-pointer"
                      >

                        {/* ⭐ */}
                        <td className="px-4 py-4 text-center">
                          <Star
                            size={16}
                            className="text-slate-600 hover:text-yellow-500"
                          />
                        </td>

                        {/* ASSET */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                coinImages[coinId] ||
                                `https://assets.coincap.io/assets/icons/${symbol}@2x.png`
                              }
                              alt={asset.assetName}
                              className="w-8 h-8 rounded-full bg-slate-800"
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
                            {formatQuantity(asset.quantity)} {symbol.toUpperCase()}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className={`font-semibold ${isProfit ? "text-emerald-500" : "text-red-500"}`}>
                            {isProfit ? "+" : ""}
                            {formatINR(asset.profitLoss)}
                          </div>

                          <div className={`text-xs ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                            {isProfit ? "+" : ""}
                            {(asset.profitLossPercent || 0).toFixed(2)}%
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400">
                              <Edit2 size={16} />
                            </button>

                            <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>

                      </tr>

                      {/* EXPANDABLE CHART */}
                      {selectedCoin?.assetName === asset.assetName && (
                        <tr>
                          <div className="flex items-center justify-between px-6 pb-3 text-xs text-slate-400 font-semibold">
                            <span>Last 7 Days</span>
                          </div>
                          <td colSpan="6" className="bg-slate-900/60 px-6 py-6">
                            <div className="h-56 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={charts[coinId] || []}>
                                  <YAxis hide domain={["dataMin", "dataMax"]} />
                                  <Line
                                    type="linear"
                                    dataKey="value"
                                    stroke={isProfit ? "#22c55e" : "#ef4444"}
                                    strokeWidth={2}
                                    dot={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </td>
                        </tr>
                      )}

                    </React.Fragment>
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
