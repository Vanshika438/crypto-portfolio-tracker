import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  Link as LinkIcon,
  Loader2,
  RefreshCcw,
  Trash2,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  getExchanges,
  connectExchange,
  syncExchange,
  disconnectExchange,
  getConnectedExchanges,
} from "../api/exchangeApi";

const Exchange = () => {
  const [allExchanges, setAllExchanges] = useState([]);
  const [connectedExchanges, setConnectedExchanges] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    exchangeId: "",
    apiKey: "",
    apiSecret: "",
    label: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  const fetchAll = useCallback(async () => {
  try {
    const [all, connected] = await Promise.all([
      getExchanges(),
      getConnectedExchanges(),
    ]);
    const allList       = Array.isArray(all)       ? all       : [];
    const connectedList = Array.isArray(connected) ? connected : [];
    setAllExchanges(allList);
    setConnectedExchanges(connectedList);
  } catch (err) {
    console.error("Failed to fetch exchanges:", err);
  }
}, []);

useEffect(() => {
  fetchAll();
}, [fetchAll]);

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setShowForm(false);
    setFormData({ exchangeId: "", apiKey: "", apiSecret: "", label: "" });
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await connectExchange({
        ...formData,
        exchangeId: Number(formData.exchangeId),
      });
      showMsg("Exchange connected successfully!", "success");
      resetForm();
      fetchAll();
    } catch (err) {
      showMsg(
        err.response?.data?.message ||
          err.response?.data ||
          "Failed to connect exchange",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (exchangeId) => {
    setSyncingId(exchangeId);
    try {
      await syncExchange(exchangeId);
      showMsg("Holdings synced successfully!", "success");
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.error || "Sync failed", "error");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (exchangeId) => {
    if (
      !window.confirm(
        "Disconnect this exchange? This will remove the stored API key.",
      )
    )
      return;
    try {
      await disconnectExchange(exchangeId);
      showMsg("Exchange disconnected.", "success");
      fetchAll();
    } catch (err) {
      showMsg("Failed to disconnect.", "error");
    }
  };

  const connectedExchangeIds = connectedExchanges.map((c) => c.exchangeId);
  const availableExchanges = allExchanges.filter(
    (ex) => !connectedExchangeIds.includes(ex.id),
  );

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 text-white">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <LinkIcon className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Exchanges</h2>
              <p className="text-slate-400 text-sm">
                Manage your connected exchanges
              </p>
            </div>
          </div>
          {!showForm && availableExchanges.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
            >
              <Plus size={16} />
              Add Exchange
            </button>
          )}
        </div>

        {/* Security Warning */}
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Use <strong className="text-amber-400">Read-Only</strong> API keys
            only. Never enable withdrawal or trading permissions.
          </p>
        </div>

        {/* Connected Exchanges */}
        {connectedExchanges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Connected ({connectedExchanges.length})
            </h3>
            <div className="space-y-3">
              {connectedExchanges.map((ex) => (
                <div
                  key={ex.apiKeyId}
                  className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-xl px-5 py-4 hover:border-slate-600/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {ex.label || ex.exchangeName}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {ex.exchangeName} · Connected{" "}
                        {new Date(ex.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Active
                    </span>
                    <button
                      onClick={() => handleSync(ex.exchangeId)}
                      disabled={syncingId === ex.exchangeId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:text-white hover:bg-indigo-600 border border-indigo-500/30 transition disabled:opacity-60"
                    >
                      <RefreshCcw
                        size={12}
                        className={
                          syncingId === ex.exchangeId ? "animate-spin" : ""
                        }
                      />
                      {syncingId === ex.exchangeId ? "Syncing..." : "Sync"}
                    </button>
                    <button
                      onClick={() => handleDisconnect(ex.exchangeId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-white hover:bg-red-600 border border-red-500/30 transition"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state — nothing connected */}
        {connectedExchanges.length === 0 && !showForm && (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-2xl mb-6">
            <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LinkIcon size={24} className="text-slate-500" />
            </div>
            <p className="text-slate-400 font-semibold mb-1">
              No exchanges connected
            </p>
            <p className="text-slate-500 text-sm mb-5">
              Connect your exchange to sync holdings automatically
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
            >
              <Plus size={16} />
              Connect Exchange
            </button>
          </div>
        )}

        {/* Connect Form */}
        {showForm && availableExchanges.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">
                Connect New Exchange
              </h3>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  Exchange *
                </label>
                <select
                  name="exchangeId"
                  value={formData.exchangeId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="" disabled>
                    Select Exchange
                  </option>
                  {availableExchanges.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  Label *
                </label>
                <input
                  name="label"
                  value={formData.label}
                  placeholder="e.g. Binance Main"
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  API Key *
                </label>
                <input
                  name="apiKey"
                  value={formData.apiKey}
                  placeholder="Paste your API key"
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  API Secret *
                </label>
                <input
                  name="apiSecret"
                  type="password"
                  value={formData.apiSecret}
                  placeholder="Paste your API secret"
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex justify-center items-center gap-2 disabled:opacity-70 transition text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />{" "}
                      Connecting...
                    </>
                  ) : (
                    <>
                      <LinkIcon size={15} /> Connect
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* All exchanges already connected */}
        {showForm && availableExchanges.length === 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6 text-center">
            <p className="text-slate-400 text-sm">
              All available exchanges are already connected.
            </p>
            <button
              onClick={resetForm}
              className="mt-3 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold"
            >
              Close
            </button>
          </div>
        )}

        {/* Connect Another Exchange button */}
        {connectedExchanges.length > 0 &&
          !showForm &&
          availableExchanges.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <Plus size={16} />
              Connect Another Exchange
            </button>
          )}

        {/* Message */}
        {message.text && (
          <div
            className={`mt-4 p-3 rounded-xl text-center text-sm font-medium border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default Exchange;
