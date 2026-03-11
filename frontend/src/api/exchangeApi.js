import axios from "./axios";

// Get list of exchanges (available + connected)
export const getExchanges = async () => {
  const response = await axios.get("/exchange", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return response.data;
};

// Connect new exchange
export const connectExchange = async (exchangeData) => {
  const response = await axios.post("/exchange/connect", exchangeData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

// Sync exchange holdings
export const syncExchange = async (exchangeId) => {
  const response = await axios.post(
    "/exchange/sync",
    {
      exchangeId: exchangeId.toString(),
    },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

// Optional (recommended)
export const disconnectExchange = async (exchangeId) => {
  const response = await axios.delete(`/exchange/${exchangeId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return response.data;
};