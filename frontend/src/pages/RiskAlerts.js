import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCcw,
  Bell,
  BellOff,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import {
  getAlerts,
  markAlertSeen,
  markAllSeen,
  triggerScan,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../api/riskApi";

const ALERT_COLORS = {
  RUGPULL_WARNING: {
    bg: "bg-red-900/20",
    border: "border-red-800/40",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300",
  },
  CONTRACT_RISK: {
    bg: "bg-orange-900/20",
    border: "border-orange-800/40",
    text: "text-orange-400",
    badge: "bg-orange-500/20 text-orange-300",
  },
  LOW_MARKET_CAP: {
    bg: "bg-yellow-900/20",
    border: "border-yellow-800/40",
    text: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  HIGH_VOLATILITY: {
    bg: "bg-amber-900/20",
    border: "border-amber-800/40",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
  },
  NOT_ON_COINGECKO: {
    bg: "bg-purple-900/20",
    border: "border-purple-800/40",
    text: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-300",
  },
  WATCHLIST_FLAG: {
    bg: "bg-blue-900/20",
    border: "border-blue-800/40",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
  },
  NEWS: {
    bg: "bg-slate-800/40",
    border: "border-slate-700/40",
    text: "text-slate-400",
    badge: "bg-slate-500/20 text-slate-300",
  },
};

const ALERT_LABELS = {
  RUGPULL_WARNING: "Rugpull Warning",
  CONTRACT_RISK: "Contract Risk",
  LOW_MARKET_CAP: "Low Market Cap",
  HIGH_VOLATILITY: "High Volatility",
  NOT_ON_COINGECKO: "Not on CoinGecko",
  WATCHLIST_FLAG: "Watchlist Flag",
  NEWS: "News",
};

const RiskAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState("alerts");
  const [filterType, setFilterType] = useState("ALL");
  const [showUnread, setShowUnread] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const isSeen = (val) =>
    val === true || val === 1 || val === "0x01" || val === "\u0001";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, watchlistRes] = await Promise.all([
        getAlerts(),
        getWatchlist(),
      ]);
      setAlerts(alertsRes.data);
      setWatchlist(watchlistRes.data);
    } catch (err) {
      console.error("Failed to fetch risk data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await triggerScan();
      setAlerts(res.data);
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const formatDetails = (details) => {
    return details.replace(
      /0x[a-fA-F0-9]{40}/g,
      (match) => `${match.slice(0, 8)}...${match.slice(-4)}`,
    );
  };
  const handleMarkSeen = async (id) => {
    try {
      await markAlertSeen(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, seen: true } : a)),
      );
    } catch (err) {
      console.error("Mark seen failed:", err);
    }
  };

  const handleMarkAllSeen = async () => {
    try {
      await markAllSeen();
      setAlerts((prev) => prev.map((a) => ({ ...a, seen: true })));
    } catch (err) {
      console.error("Mark all seen failed:", err);
    }
  };

  const handleAddWatchlist = async (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    setAdding(true);
    try {
      await addToWatchlist(newSymbol.trim().toUpperCase(), newNote.trim());
      setNewSymbol("");
      setNewNote("");
      const res = await getWatchlist();
      setWatchlist(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add to watchlist");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveWatchlist = async (id) => {
    try {
      await removeFromWatchlist(id);
      setWatchlist((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  const alertTypes = ["ALL", ...Object.keys(ALERT_LABELS)];

  const filteredAlerts = alerts.filter((a) => {
    if (showUnread && isSeen(a.seen)) return false;
    if (filterType !== "ALL" && a.alertType !== filterType) return false;
    return true;
  });

  const unreadCount = alerts.filter((a) => !isSeen(a.seen)).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <RefreshCcw className="animate-spin mr-2" size={18} />
        Loading risk data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <ShieldAlert size={22} className="text-red-400 shrink-0" />
              Risk & Scam Alerts
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`
                : "All alerts reviewed"}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllSeen}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <BellOff size={15} />
                Mark all read
              </button>
            )}
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-60"
            >
              <RefreshCcw
                size={15}
                className={scanning ? "animate-spin" : ""}
              />
              {scanning ? "Scanning..." : "Scan Now"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800">
          {["alerts", "watchlist"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab === "alerts"
                ? `Alerts ${alerts.length > 0 ? `(${alerts.length})` : ""}`
                : "Watchlist"}
            </button>
          ))}
        </div>

        {/* ALERTS TAB */}
        {activeTab === "alerts" && (
          <div>
            {/* Filters */}
            {/* Filters */}
            <div className="overflow-x-auto pb-2 mb-6">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setShowUnread(!showUnread)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                    showUnread
                      ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  <Bell size={12} />
                  Unread only
                </button>

                {alertTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                      filterType === type
                        ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50"
                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {type === "ALL" ? "All" : ALERT_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert List */}
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <ShieldCheck size={48} className="mb-4 text-emerald-600" />
                <p className="text-lg font-semibold text-slate-400">
                  No alerts found
                </p>
                <p className="text-sm mt-1">
                  {showUnread
                    ? "All alerts have been reviewed."
                    : "Run a scan to check your portfolio."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const colors =
                    ALERT_COLORS[alert.alertType] || ALERT_COLORS.NEWS;
                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-4 transition ${colors.bg} ${colors.border} ${
                        !isSeen(alert.seen)
                          ? "ring-1 ring-indigo-500/30"
                          : "opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <ShieldAlert
                            size={18}
                            className={`mt-0.5 shrink-0 ${colors.text}`}
                          />
                          <div className="min-w-0 flex-1">
                            {/* Badge row — wraps on mobile */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-white text-sm">
                                {alert.assetSymbol}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}
                              >
                                {ALERT_LABELS[alert.alertType]}
                              </span>
                              {!isSeen(alert.seen) && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                                  New
                                </span>
                              )}
                            </div>
                            {/* Details — breaks long contract addresses */}
                            <p className="text-sm text-slate-300 leading-relaxed break-all">
                              {formatDetails(alert.details)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(alert.createdAt).toLocaleString(
                                "en-IN",
                              )}
                            </p>
                          </div>
                        </div>

                        {!isSeen(alert.seen) && (
                          <button
                            onClick={() => handleMarkSeen(alert.id)}
                            className="shrink-0 p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition"
                            title="Mark as read"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WATCHLIST TAB */}
        {activeTab === "watchlist" && (
          <div>
            {/* Add to watchlist form */}
            <form
              onSubmit={handleAddWatchlist}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-6"
            >
              <h3 className="text-sm font-semibold text-slate-300 mb-4">
                Add token to watchlist
              </h3>
              <div className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Symbol (e.g. BTC)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  className="flex-1 min-w-[140px] px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 min-w-[200px] px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={adding}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-60 transition"
                >
                  <Plus size={16} />
                  {adding ? "Adding..." : "Add"}
                </button>
              </div>
            </form>

            {/* Watchlist items */}
            {watchlist.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <ShieldAlert
                  size={40}
                  className="mx-auto mb-4 text-slate-600"
                />
                <p className="text-slate-400 font-semibold">
                  No tokens on watchlist
                </p>
                <p className="text-sm mt-1">
                  Add tokens above to monitor them for risk.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {watchlist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-xl px-5 py-4"
                  >
                    <div>
                      <p className="font-bold text-white">{item.assetSymbol}</p>
                      {item.note && (
                        <p className="text-sm text-slate-400 mt-0.5">
                          {item.note}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Added{" "}
                        {new Date(item.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveWatchlist(item.id)}
                      className="p-2 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskAlerts;
