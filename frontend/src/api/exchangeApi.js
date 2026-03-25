import axios from "./axios";

export const getExchanges = async () => {
  const response = await axios.get("/exchange");
  return response.data;
};

export const getConnectedExchanges = async () => {
  const response = await axios.get("/exchange/connected");
  return response.data;
};

export const connectExchange = async (exchangeData) => {
  const response = await axios.post("/exchange/connect", exchangeData);
  return response.data;
};

export const syncExchange = async (exchangeId) => {
  const response = await axios.post("/exchange/sync", {
    exchangeId: exchangeId.toString(),
  });
  return response.data;
};

export const disconnectExchange = async (exchangeId) => {
  const response = await axios.delete(`/exchange/${exchangeId}`);
  return response.data;
};