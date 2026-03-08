import axios from "./axios";

export const connectExchange = async (exchangeData) => {
    const response = await axios.post("/exchange/connect", exchangeData, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json"
        }
    });
    return response.data;
};

export const syncExchange = async (exchangeId) => {
  const response = await axios.post(
    "/exchange/sync",
    {
      exchangeId: exchangeId.toString(), // important
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
