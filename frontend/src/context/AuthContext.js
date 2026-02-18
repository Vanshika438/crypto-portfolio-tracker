import { createContext, useState, useEffect, useContext } from "react";

import { loginUser, registerUser, getCurrentUser } from "../api/authApi";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await getCurrentUser();
          setUser(response.data);
        } catch (err) {
          
          localStorage.removeItem("token");
        }
      }
    };
    loadUser();
  }, []);

  const login = async (data) => {

    
    const response = await loginUser(data);
    const token = response.data.token;

    localStorage.setItem("token", token);

    const userResponse = await getCurrentUser();
    setUser(userResponse.data);
  };

  const register = async (data) => {
    const response = await registerUser(data);
    const token = response.data.token;

    localStorage.setItem("token", token);

    const userResponse = await getCurrentUser();
    setUser(userResponse.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
