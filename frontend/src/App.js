import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthPage from "./auth/AuthPage";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css"
function App() {
  return (
    <><Navbar /><Routes>
      <Route path="/" element={<AuthPage />} />

      <Route
        path="/dashboard"
        element={<ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>} />

      <Route
        path="/portfolio"
        element={<ProtectedRoute>
          <Portfolio />
        </ProtectedRoute>} />

      <Route
        path="/profile"
        element={<ProtectedRoute>
          <Profile />
        </ProtectedRoute>} />
    </Routes></>
  );
}

export default App;
