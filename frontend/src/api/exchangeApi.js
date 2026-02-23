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