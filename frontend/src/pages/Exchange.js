import React, { useEffect, useState } from "react";
import { ShieldAlert, Link as LinkIcon, Loader2 } from "lucide-react";
import {
  getExchanges,
  connectExchange,
  syncExchange,
} from "../api/exchangeApi";
const Exchange = () => {
  const [formData, setFormData] = useState({
    exchangeId: "",
    apiKey: "",
    apiSecret: "",
    label: "",
  });

  const [exchanges, setExchanges] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectedExchanges, setConnectedExchanges] = useState([]);
  // Fetch exchanges from backend
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const data = await getExchanges();

        if (Array.isArray(data)) {
          setConnectedExchanges(data);
        } else {
          setExchanges(data.availableExchanges || []);
          setConnectedExchanges(data.connectedExchanges || []);
        }

      } catch (error) {
        console.error("Error fetching exchanges:", error);
      }
    };

    fetchExchanges();
  }, []);


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      await connectExchange({
        ...formData,
        exchangeId: Number(formData.exchangeId),
      });

      setMessage("Exchange connected successfully!");

      setFormData({
        exchangeId: "",
        apiKey: "",
        apiSecret: "",
        label: "",
      });

      // refresh connected exchanges
      const data = await getExchanges();
      setConnectedExchanges(data.connectedExchanges || []);

    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        error.response?.data ||
        "Error connecting exchange"
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
            <LinkIcon className="text-indigo-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white text-center">
            Connect Exchange
          </h2>
          <p className="text-slate-400 text-sm mt-2 text-center">
            Sync your portfolio automatically via API
          </p>
        </div>

        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Use <strong className="text-amber-400">Read-Only</strong> API keys.
            Never enable withdrawal permissions.
          </p>
        </div>

        {connectedExchanges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">
              Connected Exchanges
            </h3>

            <div className="space-y-2">
              {connectedExchanges.map((ex) => (
                <div
                  key={ex.id}
                  className="flex justify-between items-center bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {ex.label}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {ex.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 text-xs font-medium">
                      Connected
                    </span>

                    <button
                      onClick={() => syncExchange(ex.id)}
                      className="text-indigo-400 text-xs hover:text-indigo-300"
                    >
                      Sync
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            name="exchangeId"
            value={formData.exchangeId}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>
              Select Exchange
            </option>
            {exchanges.map((exchange) => {
              const isConnected = connectedExchanges.some(
                (ex) => ex.exchangeId === exchange.id
              );

              return (
                <option
                  key={exchange.id}
                  value={exchange.id}
                  disabled={isConnected}
                >
                  {exchange.name} {isConnected ? "(Connected)" : ""}
                </option>
              );
            })}
          </select>

          <input
            name="label"
            value={formData.label}
            placeholder="Label (e.g., Binance Main)"
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            name="apiKey"
            value={formData.apiKey}
            placeholder="API Key"
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            name="apiSecret"
            type="password"
            value={formData.apiSecret}
            placeholder="API Secret"
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex justify-center items-center disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Connecting...
              </>
            ) : (
              "Connect Exchange"
            )}
          </button>
        </form>

        {message && (
          <div
            className={`mt-6 p-3 rounded-lg text-center text-sm font-medium border ${message.toLowerCase().includes("success")
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Exchange;