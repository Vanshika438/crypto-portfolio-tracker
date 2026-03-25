import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPortfolioSummary,
  getPortfolioPL,
  deleteAsset,
} from "../api/holdingApi";
import { syncExchange } from "../api/exchangeApi";
import { fetchCharts as fetchMarketCharts } from "../api/cryptoApi";
import {
  Star,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();

  const [portfolio, setPortfolio]         = useState([]);
  const [summary, setSummary]             = useState({
    totalInvested: 0,
    currentValue: 0,
    totalProfitLoss: 0,
    profitLossPercent: 0,
  });
  const [loading, setLoading]             = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated]     = useState(null);
  const [charts, setCharts]               = useState({});
  const [coinImages, setCoinImages]       = useState({});
  const [selectedCoin, setSelectedCoin]   = useState(null);
  const [isSyncing, setIsSyncing]         = useState(false);
  const hasLoadedChartsRef                = useRef(false);
  const exchangeId                        = 1;

  // ── Symbol helpers ──────────────────────────────────────────────────────────
  const guessSymbol = (name) => {
    const map = {
      bitcoin: "bitcoin", btc: "bitcoin",
      ethereum: "ethereum", eth: "ethereum",
      tether: "tether", usdt: "tether",
      ripple: "ripple", xrp: "ripple",
      "binance coin": "binancecoin", bnb: "binancecoin",
      cardano: "cardano", ada: "cardano",
      solana: "solana", sol: "solana",
      dogecoin: "dogecoin", doge: "dogecoin",
      matic: "matic-network", polygon: "matic-network",
    };
    return map[(name || "").toLowerCase().trim()] || (name || "").toLowerCase();
  };

  const toCoincapSymbol = (name) => {
    const map = {
      bitcoin: "btc", btc: "btc",
      ethereum: "eth", eth: "eth",
      tether: "usdt", usdt: "usdt",
      ripple: "xrp", xrp: "xrp",
      "binance coin": "bnb", binancecoin: "bnb", bnb: "bnb",
      cardano: "ada", ada: "ada",
      solana: "sol", sol: "sol",
      dogecoin: "doge", doge: "doge",
      matic: "matic", polygon: "matic", "matic-network": "matic",
      polkadot: "dot", dot: "dot",
      litecoin: "ltc", ltc: "ltc",
      avalanche: "avax", avax: "avax",
      chainlink: "link", link: "link",
      cosmos: "atom", atom: "atom",
      uniswap: "uni", uni: "uni",
      tron: "trx", trx: "trx",
    };
    return map[(name || "").toLowerCase().trim()] || (name || "").toLowerCase();
  };

  // ── Total portfolio area chart data ────────────────────────────────────────
  const totalPortfolioData = React.useMemo(() => {
    if (!portfolio.length || Object.keys(charts).length === 0) return [];

    const numPoints = 168;
    const now = Date.now();
    const interval = (7 * 24 * 60 * 60 * 1000) / numPoints;
    const startTime = now - 7 * 24 * 60 * 60 * 1000;
    const unified = [];

    for (let i = 0; i <= numPoints; i++) {
      const targetTime = startTime + i * interval;
      let total = 0;

      portfolio.forEach((asset) => {
        const coinId   = guessSymbol(asset.assetName);
        const quantity = Number(asset.quantity || 0);
        const coinChart = charts[coinId] || [];
        if (!coinChart.length) return;

        let closest = coinChart[0].value;
        let minDiff = Math.abs(coinChart[0].time - targetTime);
        for (let j = 1; j < coinChart.length; j++) {
          const diff = Math.abs(coinChart[j].time - targetTime);
          if (diff < minDiff) { minDiff = diff; closest = coinChart[j].value; }
        }
        total += closest * quantity;
      });

      unified.push({ time: targetTime, value: Number(total.toFixed(2)) });
    }
    return unified;
  }, [portfolio, charts]);

  const portfolioTrendPositive = React.useMemo(() => {
    if (totalPortfolioData.length < 2) return true;
    return totalPortfolioData[totalPortfolioData.length - 1].value >=
           totalPortfolioData[0].value;
  }, [totalPortfolioData]);

  // ── Chart fetching ──────────────────────────────────────────────────────────
  const fetchCharts = useCallback(async (coins) => {
    try {
      const chartData  = {};
      const imageData  = {};
      const marketData = await fetchMarketCharts();
      const marketRows = Array.isArray(marketData) ? marketData : [];

      const marketById = {};
      marketRows.forEach((coin) => {
        if (coin?.id) marketById[coin.id.toLowerCase()] = coin;
      });

      for (const coin of coins) {
        const coinId     = guessSymbol(coin.assetName);
        const symbol     = toCoincapSymbol(coin.assetName);
        const marketItem = marketById[coinId];
        const rawPrices  = marketItem?.sparkline_in_7d?.price ?? [];

        let multiplier = 1;
        if (rawPrices.length > 0 && marketItem?.current_price) {
          multiplier = marketItem.current_price / rawPrices[rawPrices.length - 1];
        }

        const now      = Date.now();
        const interval = (7 * 24 * 60 * 60 * 1000) / rawPrices.length;

        chartData[coinId] = rawPrices
          .map((value, index) => ({
            time:  now - (rawPrices.length - 1 - index) * interval,
            value: Number((value * multiplier).toFixed(2)),
          }))
          .filter((p) => Number.isFinite(p.value));

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

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [summaryRes, plRes] = await Promise.all([
        getPortfolioSummary(),
        getPortfolioPL(),
      ]);

      if (summaryRes?.data) {
        setSummary({
          totalInvested:     summaryRes.data.totalInvested     || 0,
          currentValue:      summaryRes.data.currentValue      || 0,
          totalProfitLoss:   summaryRes.data.totalProfitLoss   || 0,
          profitLossPercent: summaryRes.data.profitLossPercent || 0,
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

  // ── Handlers ────────────────────────────────────────────────────────────────
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

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this asset from portfolio?")) return;
    try {
      await deleteAsset(id);
      await fetchDashboardData();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Navigate to Holdings page and pre-open edit form for this asset
  const handleEdit = (e, asset) => {
    e.stopPropagation();
    navigate("/holding", { state: { editAsset: asset } });
  };

  // ── Formatters ───────────────────────────────────────────────────────────────
  const formatINR = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const formatQuantity = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(4) : "0.0000";
  };

  const formatTooltip = (value) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

  // ── Loading state ────────────────────────────────────────────────────────────
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

        {/* TOTAL PORTFOLIO CHART */}
        <div className="mb-10 bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Total Portfolio Value</h3>
            <div className={`text-sm font-semibold ${portfolioTrendPositive ? "text-emerald-400" : "text-red-400"}`}>
              {portfolioTrendPositive ? "▲ 7D Growth" : "▼ 7D Decline"}
            </div>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={totalPortfolioData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={portfolioTrendPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={portfolioTrendPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  formatter={(value) => formatINR(value)}
                  labelFormatter={(label) => new Date(label).toLocaleString("en-IN")}
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={portfolioTrendPositive ? "#22c55e" : "#ef4444"}
                  strokeWidth={2.5}
                  fill="url(#portfolioGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card title="Total Invested"   value={formatINR(summary.totalInvested)} />
          <Card title="Current Value"    value={formatINR(summary.currentValue)} />
          <div className={`p-6 rounded-xl border ${isOverallProfit ? "bg-emerald-900/10 border-emerald-800/40" : "bg-red-900/10 border-red-800/40"}`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isOverallProfit ? "text-emerald-500" : "text-red-500"}`}>
              Total Profit / Loss
            </h4>
            <h3 className={`text-2xl font-bold ${isOverallProfit ? "text-emerald-400" : "text-red-400"}`}>
              {isOverallProfit ? "+" : ""}{formatINR(summary.totalProfitLoss)}
            </h3>
          </div>
          <Card
            title="Profit / Loss %"
            value={
              <div className={`flex items-center gap-2 font-bold ${isOverallProfit ? "text-emerald-400" : "text-red-400"}`}>
                {isOverallProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {Math.abs(summary.profitLossPercent).toFixed(2)}%
              </div>
            }
          />
        </div>

        {/* ASSETS TABLE */}
        <div className="overflow-x-auto w-full pb-10">
          <table className="min-w-full text-sm text-left whitespace-nowrap">
            <thead className="text-slate-400 text-xs font-semibold border-y border-slate-800/60 bg-slate-900/40">
              <tr>
                <th className="px-4 py-4 w-10" />
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
                  const coinId   = guessSymbol(asset.assetName);
                  const symbol   = toCoincapSymbol(asset.assetName);
                  const keyId    = asset.id || asset.assetName || index;

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
                        <td className="px-4 py-4 text-center">
                          <Star size={16} className="text-slate-600 hover:text-yellow-500" />
                        </td>

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
                              <div className="font-bold text-white capitalize">{asset.assetName}</div>
                              <div className="text-xs text-slate-500 uppercase">{symbol}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-white">
                          {parseFloat(asset.currentPrice) === 0
                            ? <span className="text-slate-500 text-xs">N/A</span>
                            : formatINR(asset.currentPrice)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="font-semibold text-white">{formatINR(asset.currentValue)}</div>
                          <div className="text-xs text-slate-500">
                            {formatQuantity(asset.quantity)} {symbol.toUpperCase()}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className={`font-semibold ${isProfit ? "text-emerald-500" : "text-red-500"}`}>
                            {isProfit ? "+" : ""}{formatINR(asset.profitLoss)}
                          </div>
                          <div className={`text-xs ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                            {isProfit ? "+" : ""}{(asset.profitLossPercent || 0).toFixed(2)}%
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={(e) => handleEdit(e, asset)}
                              title="Edit asset"
                              className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, asset.id)}
                              title="Delete asset"
                              className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDABLE SPARKLINE */}
                      {selectedCoin?.assetName === asset.assetName && (
                        <tr>
                          <td colSpan="6" className="bg-slate-900/60 px-6 py-6">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-xs text-slate-400 font-semibold">Past History</span>
                              <span className="px-3 py-1 text-xs rounded-full bg-indigo-600 text-white">7D</span>
                            </div>
                            <div className="h-56 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts[coinId] || []}>
                                  <defs>
                                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.4} />
                                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
                                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" vertical={false} />
                                  <XAxis
                                    dataKey="time"
                                    type="number"
                                    scale="time"
                                    domain={["dataMin", "dataMax"]}
                                    stroke="#64748b"
                                    tick={{ fontSize: 11 }}
                                    minTickGap={40}
                                    tickFormatter={(tick) =>
                                      new Date(tick).toLocaleDateString("en-IN", {
                                        month: "short",
                                        day: "numeric",
                                      })
                                    }
                                  />
                                  <YAxis
                                    stroke="#64748b"
                                    tick={{ fontSize: 11 }}
                                    domain={["dataMin", "dataMax"]}
                                    tickFormatter={(v) => {
                                      if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
                                      if (v >= 100000)   return `₹${(v / 100000).toFixed(2)}L`;
                                      return `₹${v.toLocaleString("en-IN")}`;
                                    }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "#111827",
                                      border: "1px solid #374151",
                                      borderRadius: "8px",
                                      color: "#fff",
                                    }}
                                    labelStyle={{ color: "#94a3b8" }}
                                    formatter={(value) => formatTooltip(value)}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isProfit ? "#22c55e" : "#ef4444"}
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill={isProfit ? "url(#colorGreen)" : "url(#colorRed)"}
                                    dot={false}
                                    activeDot={{ r: 5, fill: isProfit ? "#22c55e" : "#ef4444", stroke: "#fff" }}
                                  />
                                </AreaChart>
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
    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h4>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
);

export default Dashboard;