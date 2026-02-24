import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const linkClasses = (path) =>
    `block px-4 py-2 rounded-lg text-sm font-medium transition ${
      location.pathname === path
        ? "bg-indigo-500/20 text-indigo-400"
        : "text-slate-300 hover:text-white hover:bg-slate-800"
    }`;

  return (
    <nav className="bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent cursor-pointer"
        >
          BlockfolioX
        </div>

        {/* Desktop Links */}
        {user && (
          <div className="hidden md:flex items-center space-x-3">
            <Link to="/dashboard" className={linkClasses("/dashboard")}>
              Dashboard
            </Link>
            <Link to="/portfolio" className={linkClasses("/portfolio")}>
              Portfolio
            </Link>
            <Link to="/profile" className={linkClasses("/profile")}>
              Profile
            </Link>
            <Link to="/exchange" className={linkClasses("/exchange")}>
              Connect Exchange
            </Link>

            <button
              onClick={handleLogout}
              className="ml-3 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold transition shadow-md"
            >
              Logout
            </button>
          </div>
        )}

        {/* Mobile Menu Button */}
        {user && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-slate-300"
          >
            ☰
          </button>
        )}
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && user && (
        <div className="md:hidden px-6 pb-4 space-y-2">
          <Link to="/dashboard" className={linkClasses("/dashboard")}>
            Dashboard
          </Link>
          <Link to="/portfolio" className={linkClasses("/portfolio")}>
            Portfolio
          </Link>
          <Link to="/profile" className={linkClasses("/profile")}>
            Profile
          </Link>
          <Link to="/exchange" className={linkClasses("/exchange")}>
            Connect Exchange
          </Link>

          <button
            onClick={handleLogout}
            className="w-full mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;