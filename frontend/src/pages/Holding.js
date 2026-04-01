import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Wallet, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import {
  getMyHoldings,
  addAsset,
  deleteAsset,
  updateAsset,
} from "../api/holdingApi";
import { SkeletonTable } from "../components/Skeleton";

const EMPTY_FORM = { assetName: "", quantity: "", buyPrice: "" };
const PAGE_SIZE = 8;

const Holding = () => {
  const location = useLocation();

  const [assets, setAssets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  // ── replaced alert() with inline error ──
  const [formError, setFormError]   = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { fetchPortfolio(); }, []);

  useEffect(() => {
    if (location.state?.editAsset) {
      const asset = location.state.editAsset;
      setForm({ assetName: asset.assetName, quantity: asset.quantity, buyPrice: asset.buyPrice });
      setEditingId(asset.id);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.state]);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const res = await getMyHoldings();
      setAssets(res.data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      if (editingId) {
        await updateAsset(editingId, form);
      } else {
        await addAsset(form);
      }
      resetForm();
      fetchPortfolio();
    } catch (err) {
      console.error(err);
      // ── inline error instead of alert() ──
      setFormError(err.response?.data?.error || "Failed to save asset. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (asset) => {
    setForm({ assetName: asset.assetName, quantity: asset.quantity, buyPrice: asset.buyPrice });
    setEditingId(asset.id);
    setFormError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this asset from your portfolio?")) return;
    try {
      await deleteAsset(id);
      fetchPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setFormError("");
  };

  const formatINR = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v || 0);

  const totalInvested = assets.reduce(
    (sum, a) => sum + parseFloat(a.buyPrice || 0) * parseFloat(a.quantity || 0), 0
  );

  // ── Pagination ──
  const totalPages = Math.ceil(assets.length / PAGE_SIZE);
  const pagedAssets = assets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (page) => setCurrentPage(page);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="animate-pulse bg-slate-800 rounded-lg h-7 w-36 mb-2" />
              <div className="animate-pulse bg-slate-800 rounded-lg h-4 w-48" />
            </div>
            <div className="animate-pulse bg-slate-800 rounded-lg h-9 w-28" />
          </div>
          <SkeletonTable rows={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <Wallet className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">My Holdings</h2>
              <p className="text-slate-400 text-sm">
                {assets.length} asset{assets.length !== 1 ? "s" : ""} · Total invested {formatINR(totalInvested)}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_FORM); setFormError(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
          >
            <Plus size={16} />
            Add Asset
          </button>
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">
                {editingId ? "Edit Asset" : "Add New Asset"}
              </h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            {/* ── Inline error banner (replaces alert()) ── */}
            {formError && (
              <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Coin Symbol *</label>
                  <input
                    type="text"
                    placeholder="e.g. BTC"
                    value={form.assetName}
                    onChange={(e) => setForm({ ...form, assetName: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Buy Price (INR) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="₹0.00"
                    value={form.buyPrice}
                    onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-500"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-60 transition"
                >
                  {submitting ? "Saving..." : editingId ? "Update Asset" : "Add Asset"}
                </button>
                <button type="button" onClick={resetForm} className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Holdings Table */}
        {assets.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 border border-slate-700/50 rounded-2xl">
            <Wallet size={40} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 font-semibold mb-1">No holdings yet</p>
            <p className="text-slate-500 text-sm mb-5">Add your first crypto asset to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
            >
              <Plus size={16} /> Add First Asset
            </button>
          </div>
        ) : (
          <>
            {/* ── Pagination header ── */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">
                {assets.length > PAGE_SIZE
                  ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, assets.length)} of ${assets.length} assets`
                  : `${assets.length} asset${assets.length !== 1 ? "s" : ""}`}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} onClick={() => handlePageChange(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${page === currentPage ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-400 text-xs font-semibold border-y border-slate-800/60 bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-3 text-left">Asset</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Buy Price (INR)</th>
                    <th className="px-4 py-3 text-right">Total Invested</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAssets.map((asset) => {
                    const totalInvestedAsset = parseFloat(asset.buyPrice || 0) * parseFloat(asset.quantity || 0);
                    return (
                      <tr key={asset.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300 uppercase">
                              {asset.assetName?.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-white">{asset.assetName}</p>
                              <p className="text-xs text-slate-500 uppercase">{asset.assetName?.toLowerCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-white font-semibold">{parseFloat(asset.quantity).toFixed(6)}</td>
                        <td className="px-4 py-4 text-right text-slate-300">{formatINR(asset.buyPrice)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-white">{formatINR(totalInvestedAsset)}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleEdit(asset)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(asset.id)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-red-400 transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-700/60 bg-slate-800/20">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Total ({assets.length} assets)
                    </td>
                    <td colSpan={2} />
                    <td className="px-4 py-3 text-right font-bold text-white">{formatINR(totalInvested)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── Bottom pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/60">
                <span className="text-xs text-slate-500">Page {currentPage} of {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronLeft size={13} /> Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} onClick={() => handlePageChange(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${page === currentPage ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Holding;