import React, { useEffect, useState } from "react";
import {
  getMyPortfolio,
  addAsset,
  deleteAsset,
  updateAsset,
} from "../api/portfolioApi";

const Portfolio = () => {
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({
    coinName: "",
    quantity: "",
    buyPrice: "",
  });

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await getMyPortfolio();
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

      setForm({ coinName: "", quantity: "", buyPrice: "" });
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
    <div>
      <h2>My Portfolio</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="coinName"
          placeholder="Coin Name"
          value={form.coinName}
          onChange={handleChange}
        />
        <input
          name="quantity"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
        />
        <input
          name="buyPrice"
          placeholder="Buy Price"
          value={form.buyPrice}
          onChange={handleChange}
        />

        <button type="submit">
          {editingId ? "Update Asset" : "Add Asset"}
        </button>
      </form>

      <hr />

      {assets.map((asset) => (
        <div key={asset.id}>
          <h4>{asset.coinName}</h4>
          <p>Quantity: {asset.quantity}</p>
          <p>Buy Price: ₹{asset.buyPrice}</p>

          <button onClick={() => handleEdit(asset)}>
            Edit
          </button>

          <button onClick={() => handleDelete(asset.id)}>
            Delete
          </button>

          <hr />
        </div>
      ))}
    </div>
  );
};

export default Portfolio;
