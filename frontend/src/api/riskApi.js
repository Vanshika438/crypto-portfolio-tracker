import api from "./axios";

export const getAlerts = () => api.get("/risk/alerts");

export const getUnreadAlerts = () => api.get("/risk/alerts/unread");

export const getUnreadCount = () => api.get("/risk/alerts/count");

export const markAlertSeen = (id) => api.patch(`/risk/alerts/${id}/seen`);

export const markAllSeen = () => api.patch("/risk/alerts/seen-all");

export const triggerScan = () => api.post("/risk/scan");

export const getWatchlist = () => api.get("/risk/watchlist");

export const addToWatchlist = (assetSymbol, note = "") =>
  api.post("/risk/watchlist", { assetSymbol, note });

export const removeFromWatchlist = (id) =>
  api.delete(`/risk/watchlist/${id}`);