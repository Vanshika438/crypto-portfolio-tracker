import api from "./axios";

export const getMyHoldings = () => {
  return api.get("/holding/my");
};

export const addAsset = (data) => {
  return api.post("/holding/add", data);
};

export const updateAsset = (id, data) => {
  return api.put(`/holding/update/${id}`, data);
};

export const deleteAsset = (id) => {
  return api.delete(`/holding/delete/${id}`);
};

export const getPortfolioPL = () => {
  return api.get("/holding/pl");
};

export const getPortfolioSummary = () => {
  return api.get("/holding/summary");
};

