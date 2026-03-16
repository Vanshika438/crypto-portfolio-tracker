import api from "./axios";

export const getTrades = () => api.get("/trades");

export const addTrade = (data) => api.post("/trades", data);

export const updateTrade = (id, data) => api.put(`/trades/${id}`, data);

export const deleteTrade = (id) => api.delete(`/trades/${id}`);

export const syncBinanceTrades = () => api.post("/trades/sync/binance");