import api from "./axios";

export const fetchCharts = async () => {
  try {
    const response = await api.get("/crypto/market");
    return response?.data || [];
  } catch (err) {
    console.error("Error fetching chart:", err);
    return [];
  }
};
