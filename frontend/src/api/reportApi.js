import api from "./axios";

export const getReportSummary = () => api.get("/report/summary");

export const downloadCsv = () =>
  api.get("/report/export/csv", { responseType: "blob" });

export const getTaxSummary=()=> api.get("/report/tax");