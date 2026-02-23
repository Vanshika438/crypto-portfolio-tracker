import React, { useState } from "react";
import { connectExchange } from "../api/exchangeApi";

const Exchange = () => {
  const [formData, setFormData] = useState({
    exchangeId: "",
    apiKey: "",
    apiSecret: "",
    label: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await connectExchange(formData);
      setMessage("Exchange connected successfully!");
    } catch (error) {
    console.log(error.response); 

    setMessage(
      error.response?.data || 
      error.response?.data?.message || 
      "Error connecting exchange"
    );
  };
}

 return (
  <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
    <div className="w-full max-w-md bg-[#1e293b] rounded-2xl shadow-xl p-8">
      
      <h2 className="text-2xl font-semibold text-white mb-6 text-center">
        Connect Exchange
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <input
          name="exchangeId"
          placeholder="Exchange ID"
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          name="apiKey"
          placeholder="API Key"
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          name="apiSecret"
          placeholder="API Secret"
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          name="label"
          placeholder="Label (e.g., Binance Main)"
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition duration-200 text-white font-semibold"
        >
          Connect Exchange
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-center text-sm ${
            message.includes("success")
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  </div>
);
};

export default Exchange;