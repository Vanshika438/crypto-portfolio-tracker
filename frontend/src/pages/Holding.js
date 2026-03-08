import React, { useEffect, useState } from "react";
import {
  getMyHoldings,
  addAsset,
  deleteAsset,
  updateAsset,
} from "../api/holdingApi";

const Holding = () => {
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({
    assetName: "",
    quantity: "",
    buyPrice: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await getMyHoldings();
      setAssets(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateAsset(editingId, form);
        setEditingId(null);
      } else {
        await addAsset(form);
      }

      setForm({ assetName: "", quantity: "", buyPrice: "" });
      fetchPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (asset) => {
    setForm(asset);
    setEditingId(asset.id);
  };

  const handleDelete = async (id) => {
    await deleteAsset(id);
    fetchPortfolio();
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">My Holdings</h2>
          <p className="mt-2 text-sm text-slate-400">
            Manage your crypto assets from one place.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-700/70 bg-slate-800/60 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <input
              name="assetName"
              type="text"
              placeholder="Coin Name"
              value={form.assetName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              name="quantity"
              type="number"
              placeholder="Quantity"
              value={form.quantity}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              name="buyPrice"
              type="number"
              placeholder="Buy Price"
              value={form.buyPrice}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />

            <div className="mt-2 md:col-span-3">
              <button
                type="submit"
                className={`w-full rounded-lg px-6 py-2.5 font-semibold transition md:w-auto ${
                  editingId
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {editingId ? "Update Asset" : "Add Asset"}
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {assets.length === 0 && (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-center text-slate-300 md:col-span-2">
              No holdings yet. Add your first asset above.
            </div>
          )}

          {assets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-5 shadow-lg transition hover:-translate-y-0.5 hover:border-indigo-500/60 hover:shadow-indigo-500/20"
            >
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-800/60 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold uppercase text-indigo-300">
                  {(asset.assetName || "?").slice(0, 2)}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Coin Name
                  </p>
                  <h4 className="text-lg font-bold text-white">
                    {asset.assetName || "Unknown Coin"}
                  </h4>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Quantity
                  </p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {asset.quantity}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Buy Price
                  </p>
                  <p className="mt-1 text-base font-semibold text-emerald-400">
                    Rs {asset.buyPrice}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(asset)}
                  className="flex-1 rounded-lg border border-indigo-500/50 bg-indigo-500/20 py-2 font-semibold text-indigo-200 transition hover:bg-indigo-500/35 hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="flex-1 rounded-lg border border-rose-500/50 bg-rose-500/20 py-2 font-semibold text-rose-200 transition hover:bg-rose-500/35 hover:text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Holding;
