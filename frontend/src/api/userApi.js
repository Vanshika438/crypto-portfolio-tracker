import api from "./axios";

export const getProfile = () => {
  return api.get("/user/me");
};
