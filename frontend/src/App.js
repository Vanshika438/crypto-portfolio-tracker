import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthPage from "./auth/AuthPage";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Exchange from "./pages/Exchange";
import "./App.css"
function App() {
  return (
    <><Navbar /><Routes>
      <Route path="/" element={<AuthPage />} />

      <Route path="/exchange"
        element={<ProtectedRoute>
          <Exchange />
        </ProtectedRoute>} />
      
    </Routes></>
  );
}

export default App;