import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { getUnreadCount } from "../api/riskApi";
import { Menu, X, LogOut } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = () =>
      getUnreadCount().then((res) => setUnreadAlerts(res.data.unread)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 300000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => { logout(); navigate("/"); };

  const navLinks = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/holding",   label: "Holdings"  },
    { path: "/trades",    label: "Trades"    },
    { path: "/report",    label: "Reports"   },
    { path: "/exchange",  label: "Exchange"  },
    { path: "/risk",      label: "Risk Alerts", badge: unreadAlerts },
    { path: "/profile",   label: "Profile"   },
    { path: "/portfolio", label: "Portfolio" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <div
            onClick={() => navigate("/")}
            className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent cursor-pointer shrink-0"
          >
            BlockfolioX
          </div>

          {/* Desktop Nav */}
          {user && (
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map(({ path, label, badge }) => (
                <Link
                  key={path}
                  to={path}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    isActive(path)
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  {label}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </Link>
              ))}

              <button
                onClick={handleLogout}
                className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white transition"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          )}

          {/* Mobile menu button */}
          {user && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && user && (
        <div className="lg:hidden border-t border-slate-800/60 bg-slate-950/98 px-4 py-3 space-y-1">
          {navLinks.map(({ path, label, badge }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={`relative flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                isActive(path)
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {label}
              {badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                  {badge}
                </span>
              )}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white mt-2 transition"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;