import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthPage from "./auth/AuthPage";
import Dashboard from "./pages/Dashboard";
import Holding from "./pages/Holding";
import Profile from "./pages/Profile";
import RiskAlerts from "./pages/RiskAlerts";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Exchange from "./pages/Exchange";
import "./App.css";
function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<AuthPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/holding"
          element={
            <ProtectedRoute>
              <Holding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exchange"
          element={
            <ProtectedRoute>
              <Exchange />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
        path="/risk"
        element={
          <ProtectedRoute>
            <RiskAlerts />
          </ProtectedRoute>
        }
      />
      </Routes>
      
    </>
  );
}

export default App;
