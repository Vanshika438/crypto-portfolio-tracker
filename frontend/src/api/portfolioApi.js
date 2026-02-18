import api from "./axios";

export const getMyPortfolio = () => {
  return api.get("/portfolio/my");
};

export const addAsset = (data) => {
  return api.post("/portfolio/add", data);
};

export const updateAsset = (id, data) => {
  return api.put(`/portfolio/update/${id}`, data);
};

export const deleteAsset = (id) => {
  return api.delete(`/portfolio/delete/${id}`);
};

export const getPortfolioPL = () => {
  return api.get("/portfolio/pl");
};

export const getPortfolioSummary = () => {
  return api.get("/portfolio/summary");
};
