import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
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

const Trades = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrades();
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this trade?")) return;
    try {
      await deleteTrade(id);
      fetchTrades();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncBinanceTrades();
      alert(res.data.message);
      fetchTrades();
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Binance sync failed. Check your API keys.",
      );
    } finally {
      setSyncing(false);
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

  const filtered =
    filter === "ALL" ? trades : trades.filter((t) => t.type === filter);

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
    <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">
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
                setShowForm(!showForm);
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

        {/* Add / Edit Form */}
        {showForm && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-5">
              {editingId ? "Edit Trade" : "Add Trade"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BTC"
                    value={form.assetSymbol}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assetSymbol: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Type *
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Price (INR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="₹0.00"
                    value={form.priceInr}
                    onChange={(e) =>
                      setForm({ ...form, priceInr: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="$0.00"
                    value={form.priceUsd}
                    onChange={(e) =>
                      setForm({ ...form, priceUsd: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.executedAt}
                    onChange={(e) =>
                      setForm({ ...form, executedAt: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Fee (INR)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="₹0.00"
                    value={form.feeInr}
                    onChange={(e) =>
                      setForm({ ...form, feeInr: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Fee (USD)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="$0.00"
                    value={form.feeUsd}
                    onChange={(e) =>
                      setForm({ ...form, feeUsd: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Exchange
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Binance"
                    value={form.exchange}
                    onChange={(e) =>
                      setForm({ ...form, exchange: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs text-slate-400 mb-1 block">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Optional note"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-60 transition"
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Update Trade"
                      : "Add Trade"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

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
            <p className="text-sm mt-1">
              Add your first trade or sync from Binance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-slate-400 text-xs font-semibold border-y border-slate-800/60 bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Price (INR)</th>
                  <th className="px-4 py-3 text-right">Price (USD)</th>
                  <th className="px-4 py-3 text-right">Total (INR)</th>
                  <th className="px-4 py-3">Exchange</th>
                  <th className="px-4 py-3 text-center">Actions</th>
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
                      <td className="px-4 py-3 font-bold text-white">
                        {trade.assetSymbol}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {isBuy ? (
                            <TrendingUp size={11} />
                          ) : (
                            <TrendingDown size={11} />
                          )}
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {parseFloat(trade.quantity).toFixed(6)}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {formatINR(trade.priceInr)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {formatUSD(trade.priceUsd)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {formatINR(totalInr)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {trade.exchange || "—"}
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trades;