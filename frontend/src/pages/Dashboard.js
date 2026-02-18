import React, { useEffect, useState } from "react";
import { getPortfolioSummary, getPortfolioPL } from "../api/portfolioApi"; // Using your backend endpoints
import { Star, TrendingUp, TrendingDown, RefreshCcw, Edit2, Trash2 } from "lucide-react";

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary] = useState({ totalInvested: 0, currentValue: 0, totalProfitLoss: 0, profitLossPercent: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 1. Fetch data strictly from your Backend API
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      // Run both backend calls in parallel for speed
      const [summaryRes, plRes] = await Promise.all([
        getPortfolioSummary(),
        getPortfolioPL()
      ]);

      // Your backend returns exactly what we need!
      if (summaryRes.data) {
        setSummary({
          totalInvested: summaryRes.data.totalInvested || 0,
          currentValue: summaryRes.data.currentValue || 0,
          totalProfitLoss: summaryRes.data.totalProfitLoss || 0,
          profitLossPercent: summaryRes.data.profitLossPercent || 0
        });
      }

      if (plRes.data) {
        setPortfolio(plRes.data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching dashboard data from backend:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Run once on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Formatters
  const formatINR = (value) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

  // Helper to guess a symbol for the coin image (since backend only gives assetName)
  const guessSymbol = (name) => {
    const map = { 'bitcoin': 'btc', 'ethereum': 'eth', 'tether': 'usdt', 'ripple': 'xrp', 'binance coin': 'bnb', 'cardano': 'ada', 'solana': 'sol', 'dogecoin': 'doge' };
    const lowerName = (name || "").toLowerCase().trim();
    return map[lowerName] || lowerName.substring(0, 3);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", color: "#718096" }}>
        <h3><RefreshCcw className="spinner" size={20} style={{ display: "inline", marginRight: "10px" }} /> Loading your live dashboard...</h3>
      </div>
    );
  }

  const isOverallProfit = summary.totalProfitLoss >= 0;

  return (
    <>
      {/* Vanilla CSS styling injected safely for the Dashboard layout */}
      <style>{`
        .dashboard-container { max-width: 1100px; margin: 0 auto; padding: 30px 20px; font-family: 'Inter', sans-serif; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
        .dashboard-header h2 { margin-bottom: 5px; text-align: left; color: #1a202c;}
        .header-titles p { color: #718096; font-size: 0.95rem; margin: 0;}
        .header-actions { display: flex; align-items: center; gap: 15px; }
        .last-updated { font-size: 0.85rem; color: #a0aec0; }
        .refresh-btn { display: flex; align-items: center; gap: 8px; background-color: white !important; color: #4a5568 !important; border: 1px solid #cbd5e0; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: 0.2s;}
        .refresh-btn:hover { background-color: #f7fafc !important; }
        .refresh-btn.refreshing svg { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .summary-card h4 { font-size: 0.85rem; color: #718096; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-card h3 { font-size: 1.75rem; color: #2d3748; margin: 0; }
        .trend-value { display: flex; align-items: center; gap: 8px; font-size: 1.5rem; font-weight: 700; }
        .profit-bg { background-color: #f0fff4; border-color: #c6f6d5; }
        .loss-bg { background-color: #fff5f5; border-color: #fed7d7; }
        .text-green { color: #38a169 !important; }
        .text-red { color: #e53e3e !important; }
        .text-muted { color: #a0aec0; font-size: 0.85rem; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .fw-bold { font-weight: 600; }
        .w-8 { width: 40px; }
        .table-container { background: white; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow-x: auto; }
        .crypto-table { width: 100%; border-collapse: collapse; white-space: nowrap; text-align: left; }
        .crypto-table th { background-color: #f8fafc; padding: 16px; font-size: 0.75rem; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
        .crypto-table td { padding: 16px; border-bottom: 1px solid #edf2f7; vertical-align: middle; }
        .crypto-row { transition: background-color 0.2s; }
        .crypto-row:hover { background-color: #f8fafc; }
        .crypto-row:last-child td { border-bottom: none; }
        .asset-info { display: flex; align-items: center; gap: 15px; }
        .asset-icon { width: 36px; height: 36px; border-radius: 50%; }
        .asset-fallback-icon { width: 36px; height: 36px; border-radius: 50%; background-color: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .asset-names { display: flex; flex-direction: column; }
        .asset-names strong { color: #2d3748; font-size: 1.05rem; text-transform: capitalize;}
        .asset-names span { color: #a0aec0; font-size: 0.8rem; text-transform: uppercase; margin-top: 2px; }
        .actions-cell { display: flex; justify-content: center; gap: 8px; opacity: 0; transition: opacity 0.2s; }
        .crypto-row:hover .actions-cell { opacity: 1; }
        .icon-btn { padding: 8px !important; background: transparent !important; box-shadow: none !important; border: none; cursor: pointer; border-radius: 6px; }
        .icon-btn.edit-btn { color: #3182ce !important; }
        .icon-btn.edit-btn:hover { background-color: #ebf4ff !important; }
        .icon-btn.delete-btn { color: #e53e3e !important; }
        .icon-btn.delete-btn:hover { background-color: #fff5f5 !important; }
        .star-icon { color: #cbd5e0; cursor: pointer; transition: color 0.2s; }
        .star-icon:hover { color: #ecc94b; }
        .spinner { animation: spin 1s linear infinite; margin-right: 10px; }
      `}</style>

      <div className="dashboard-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="header-titles">
            <h2>Summary</h2>
            <p>Real-time market tracking</p>
          </div>
          <div className="header-actions">
            <span className="last-updated">
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "..."}
            </span>
            <button
              onClick={fetchDashboardData}
              className={`refresh-btn ${isRefreshing ? "refreshing" : ""}`}
              disabled={isRefreshing}
            >
              <RefreshCcw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="summary-cards">
          <div className="summary-card">
            <h4>Total Invested</h4>
            <h3>{formatINR(summary.totalInvested)}</h3>
          </div>
          <div className="summary-card">
            <h4>Current Value</h4>
            <h3>{formatINR(summary.currentValue)}</h3>
          </div>
          <div className={`summary-card ${isOverallProfit ? "profit-bg" : "loss-bg"}`}>
            <h4 className={isOverallProfit ? "text-green" : "text-red"}>Total Profit / Loss</h4>
            <h3 className={isOverallProfit ? "text-green" : "text-red"}>
              {isOverallProfit ? "+" : ""}{formatINR(summary.totalProfitLoss)}
            </h3>
          </div>
          <div className="summary-card">
            <h4>Profit / Loss %</h4>
            <div className={`trend-value ${isOverallProfit ? "text-green" : "text-red"}`}>
              {isOverallProfit ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {Math.abs(summary.profitLossPercent).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* PORTFOLIO ASSETS TABLE */}
        <div className="table-container">
          <table className="crypto-table">
            <thead>
              <tr>
                <th className="text-center w-8"></th>
                <th>Asset</th>
                <th className="text-right">Market Price</th>
                {/* Removed 24h Change header as your backend /pl doesn't supply it */}
                <th className="text-right">Holdings</th>
                <th className="text-right">Profit/Loss</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '40px' }}>
                    No assets in your portfolio. Add some to get started!
                  </td>
                </tr>
              ) : (
                portfolio.map((asset, index) => {
                  const isProfit = asset.profitLoss >= 0;
                  const symbol = guessSymbol(asset.assetName);
                  
                  // Using assetName as key since your backend /pl doesn't return the DB 'id'
                  const keyId = asset.id || asset.assetName || index;

                  return (
                    <tr key={keyId} className="crypto-row">
                      <td className="text-center">
                        <Star size={16} className="star-icon" />
                      </td>

                      <td>
                        <div className="asset-info">
                          <img 
                            src={`https://assets.coincap.io/assets/icons/${symbol}@2x.png`} 
                            alt={asset.assetName} 
                            className="asset-icon"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="asset-fallback-icon" style={{ display: 'none' }}>
                            {asset.assetName ? asset.assetName[0].toUpperCase() : '?'}
                          </div>
                          
                          <div className="asset-names">
                            <strong>{asset.assetName}</strong>
                            <span>{symbol.toUpperCase()}</span>
                          </div>
                        </div>
                      </td>

                      <td className="text-right fw-bold">
                        {formatINR(asset.currentPrice)}
                      </td>

                      <td className="text-right">
                        <div className="fw-bold">{formatINR(asset.currentValue)}</div>
                        <div className="text-muted">
                          {asset.quantity} {symbol.toUpperCase()}
                        </div>
                      </td>

                      <td className="text-right">
                        <div className={`fw-bold ${isProfit ? "text-green" : "text-red"}`}>
                          {isProfit ? "+" : ""}{formatINR(asset.profitLoss)}
                        </div>
                        <div className={isProfit ? "text-green" : "text-red"}>
                          {isProfit ? "+" : ""}{(asset.profitLossPercent || 0).toFixed(2)}%
                        </div>
                      </td>

                      <td className="actions-cell">
                        <button className="icon-btn edit-btn" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn delete-btn" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Dashboard;