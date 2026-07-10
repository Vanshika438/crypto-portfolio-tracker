import React, { useEffect, useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  X,
  StickyNote,
} from "lucide-react";
import {
  getTrades,
  addTrade,
  updateTrade,
  deleteTrade,
  syncBinanceTrades,
} from "../api/tradeApi";
import { SkeletonTable } from "../components/Skeleton";

const EMPTY_FORM = {
  assetSymbol: "",
  type: "BUY",
  quantity: "",
  priceInr: "",
  priceUsd: "",
  feeInr: "",
  feeUsd: "",
  exchange: "",
  notes: "",
  executedAt: new Date().toISOString().slice(0, 16),
};

const USD_TO_INR = 83.5; // fallback rate; ideally pass live rate as prop

const Trades = ({ usdToInrRate }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [sortKey, setSortKey] = useState("executedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [toasts, setToasts] = useState([]);
  const [hoveredNote, setHoveredNote] = useState(null);
  const undoTimers = useRef({});

  const liveRate = usdToInrRate || USD_TO_INR;

  useEffect(() => {
    fetchTrades();
    return () => Object.values(undoTimers.current).forEach(clearTimeout);
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await getTrades();
      setTrades(res.data);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Toast / undo helpers ───────────────────────────────────────────────────
  const addToast = (id, message, onUndo) => {
    setToasts((prev) => [...prev, { id, message, onUndo }]);
    undoTimers.current[id] = setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    clearTimeout(undoTimers.current[id]);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const handleInrChange = (val) => {
    const inr = parseFloat(val);
    setForm((f) => ({
      ...f,
      priceInr: val,
      priceUsd: isNaN(inr) ? "" : (inr / liveRate).toFixed(4),
    }));
  };

  const handleUsdChange = (val) => {
    const usd = parseFloat(val);
    setForm((f) => ({
      ...f,
      priceUsd: val,
      priceInr: isNaN(usd) ? "" : (usd * liveRate).toFixed(2),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity),
        priceInr: parseFloat(form.priceInr),
        priceUsd: parseFloat(form.priceUsd),
        feeInr: form.feeInr ? parseFloat(form.feeInr) : 0,
        feeUsd: form.feeUsd ? parseFloat(form.feeUsd) : 0,
        executedAt: form.executedAt + ":00",
      };

      if (editingId) {
        await updateTrade(editingId, payload);
      } else {
        await addTrade(payload);
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      fetchTrades();
    } catch (err) {
      console.error("Failed to save trade:", err);
      alert(err.response?.data?.error || "Failed to save trade");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (trade) => {
    setForm({
      assetSymbol: trade.assetSymbol,
      type: trade.type,
      quantity: trade.quantity,
      priceInr: trade.priceInr,
      priceUsd: trade.priceUsd,
      feeInr: trade.feeInr || "",
      feeUsd: trade.feeUsd || "",
      exchange: trade.exchange || "",
      notes: trade.notes || "",
      executedAt: trade.executedAt?.slice(0, 16) || "",
    });
    setEditingId(trade.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    // Optimistic remove
    const trade = trades.find((t) => t.id === id);
    setTrades((prev) => prev.filter((t) => t.id !== id));

    const toastId = `del-${id}-${Date.now()}`;
    let undone = false;

    addToast(toastId, `Trade deleted`, async () => {
      undone = true;
      removeToast(toastId);
      setTrades((prev) => {
        const exists = prev.find((t) => t.id === id);
        return exists ? prev : [...prev, trade].sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
      });
    });

    undoTimers.current[toastId] = setTimeout(async () => {
      if (!undone) {
        try {
          await deleteTrade(id);
        } catch (err) {
          console.error("Delete failed:", err);
          setTrades((prev) => [...prev, trade].sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt)));
        }
      }
      removeToast(toastId);
    }, 5000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncBinanceTrades();
      alert(res.data.message);
      fetchTrades();
    } catch (err) {
      alert(err.response?.data?.error || "Binance sync failed. Check your API keys.");
    } finally {
      setSyncing(false);
    }
  };

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-slate-600 ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-indigo-400 ml-1" />
      : <ChevronDown size={12} className="text-indigo-400 ml-1" />;
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
      maximumFractionDigits: 4,
    }).format(v || 0);

  // ── Filtered + sorted trades ───────────────────────────────────────────────
  const filtered = (filter === "ALL" ? trades : trades.filter((t) => t.type === filter))
    .slice()
    .sort((a, b) => {
      let va, vb;
      if (sortKey === "executedAt") {
        va = new Date(a.executedAt);
        vb = new Date(b.executedAt);
      } else if (sortKey === "totalInr") {
        va = a.quantity * a.priceInr;
        vb = b.quantity * b.priceInr;
      } else if (sortKey === "priceInr" || sortKey === "quantity") {
        va = parseFloat(a[sortKey]);
        vb = parseFloat(b[sortKey]);
      } else {
        va = (a[sortKey] || "").toString().toLowerCase();
        vb = (b[sortKey] || "").toString().toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  // ── Summary row ────────────────────────────────────────────────────────────
  const totalBuyInr = trades.filter((t) => t.type === "BUY").reduce((s, t) => s + t.quantity * t.priceInr, 0);
  const totalSellInr = trades.filter((t) => t.type === "SELL").reduce((s, t) => s + t.quantity * t.priceInr, 0);
  const netInr = totalBuyInr - totalSellInr;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="animate-pulse bg-slate-800 rounded-lg h-7 w-40 mb-2" />
              <div className="animate-pulse bg-slate-800 rounded-lg h-4 w-24" />
            </div>
            <div className="flex gap-3">
              <div className="animate-pulse bg-slate-800 rounded-lg h-9 w-32" />
              <div className="animate-pulse bg-slate-800 rounded-lg h-9 w-28" />
            </div>
          </div>
          <SkeletonTable rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8 relative">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ArrowUpDown size={22} className="text-indigo-400" />
              Trade History
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {trades.length} trade{trades.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-60"
            >
              <RefreshCcw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync Binance"}
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              <Plus size={15} />
              Add Trade
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Bought</p>
            <p className="text-base font-bold text-emerald-400">{formatINR(totalBuyInr)}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Sold</p>
            <p className="text-base font-bold text-red-400">{formatINR(totalSellInr)}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Net Invested</p>
            <p className={`text-base font-bold ${netInr >= 0 ? "text-white" : "text-red-400"}`}>{formatINR(netInr)}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {["ALL", "BUY", "SELL"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                filter === f
                  ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {f === "ALL"
                ? `All (${trades.length})`
                : f === "BUY"
                  ? `Buys (${trades.filter((t) => t.type === "BUY").length})`
                  : `Sells (${trades.filter((t) => t.type === "SELL").length})`}
            </button>
          ))}
        </div>

        {/* Trades Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <ArrowUpDown size={40} className="mx-auto mb-4 text-slate-700" />
            <p className="text-slate-400 font-semibold">No trades yet</p>
            <p className="text-sm mt-1">Add your first trade or sync from Binance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-slate-400 text-xs font-semibold border-y border-slate-800/60 bg-slate-900/40">
                <tr>
                  {[
                    { label: "Date", key: "executedAt" },
                    { label: "Symbol", key: "assetSymbol" },
                    { label: "Type", key: "type" },
                    { label: "Quantity", key: "quantity", right: true },
                    { label: "Price (INR)", key: "priceInr", right: true },
                    { label: "Price (USD)", key: null, right: true },
                    { label: "Total (INR)", key: "totalInr", right: true },
                    { label: "Exchange", key: null },
                    { label: "Actions", key: null, center: true },
                  ].map(({ label, key, right, center }) => (
                    <th
                      key={label}
                      onClick={key ? () => handleSort(key) : undefined}
                      className={`px-4 py-3 whitespace-nowrap ${key ? "cursor-pointer select-none hover:text-slate-200 transition" : ""} ${right ? "text-right" : center ? "text-center" : ""}`}
                    >
                      <span className="inline-flex items-center justify-end">
                        {label}
                        {key && <SortIcon col={key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => {
                  const isBuy = trade.type === "BUY";
                  const totalInr = (trade.quantity * trade.priceInr).toFixed(2);

                  return (
                    <tr
                      key={trade.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition"
                    >
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(trade.executedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 font-bold text-white">{trade.assetSymbol}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {isBuy ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {parseFloat(trade.quantity).toFixed(6)}
                      </td>
                      <td className="px-4 py-3 text-right text-white">{formatINR(trade.priceInr)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{formatUSD(trade.priceUsd)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">{formatINR(totalInr)}</td>
                      <td className="px-4 py-3 text-slate-400">
                        <div className="flex items-center gap-1">
                          {trade.exchange || "—"}
                          {trade.notes && (
                            <div className="relative">
                              <button
                                onMouseEnter={() => setHoveredNote(trade.id)}
                                onMouseLeave={() => setHoveredNote(null)}
                                className="p-1 text-slate-600 hover:text-indigo-400 transition"
                              >
                                <StickyNote size={12} />
                              </button>
                              {hoveredNote === trade.id && (
                                <div className="absolute z-50 bottom-full left-0 mb-2 w-52 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-300 shadow-xl whitespace-normal">
                                  {trade.notes}
                                  <div className="absolute top-full left-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-600" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(trade)}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(trade.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary footer */}
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-900/60">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Totals ({filtered.length} trades)
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300 font-semibold text-sm">
                    {filtered.reduce((s, t) => s + parseFloat(t.quantity), 0).toFixed(4)}
                  </td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 text-right text-white font-bold text-sm">
                    {formatINR(filtered.reduce((s, t) => s + t.quantity * t.priceInr, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-over panel ─────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-slate-900 border-l border-slate-700/60 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          showForm ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60 sticky top-0 bg-slate-900 z-10">
          <h3 className="text-lg font-bold text-white">
            {editingId ? "Edit Trade" : "Add Trade"}
          </h3>
          <button
            onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Symbol *</label>
              <input
                type="text"
                placeholder="e.g. BTC"
                value={form.assetSymbol}
                onChange={(e) => setForm({ ...form, assetSymbol: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Quantity *</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Price (INR) *
                <span className="ml-1 text-indigo-400 font-normal">(auto-converts)</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="₹0.00"
                value={form.priceInr}
                onChange={(e) => handleInrChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Price (USD) *
                <span className="ml-1 text-indigo-400 font-normal">(auto-converts)</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="$0.00"
                value={form.priceUsd}
                onChange={(e) => handleUsdChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date & Time *</label>
            <input
              type="datetime-local"
              value={form.executedAt}
              onChange={(e) => setForm({ ...form, executedAt: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fee (INR)</label>
              <input
                type="number"
                step="any"
                placeholder="₹0.00"
                value={form.feeInr}
                onChange={(e) => setForm({ ...form, feeInr: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fee (USD)</label>
              <input
                type="number"
                step="any"
                placeholder="$0.00"
                value={form.feeUsd}
                onChange={(e) => setForm({ ...form, feeUsd: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Exchange</label>
            <input
              type="text"
              placeholder="e.g. Binance"
              value={form.exchange}
              onChange={(e) => setForm({ ...form, exchange: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <input
              type="text"
              placeholder="Optional note"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-60 transition"
            >
              {submitting ? "Saving..." : editingId ? "Update Trade" : "Add Trade"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* ── Undo toasts ───────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 shadow-xl text-sm text-white pointer-events-auto animate-in slide-in-from-bottom-4"
          >
            <span className="text-slate-300">{toast.message}</span>
            {toast.onUndo && (
              <button
                onClick={toast.onUndo}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition underline underline-offset-2"
              >
                Undo
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-white transition ml-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trades;