import api from "./axios";

export const loginUser = (data) => {
  return api.post("/auth/login", data);
};

export const registerUser = (data) => {
  return api.post("/auth/register", data);
};

export const getCurrentUser = () => {
  return api.get("/user/me");
};

