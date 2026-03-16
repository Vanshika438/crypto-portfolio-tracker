import { useAuth } from "../context/AuthContext";
import { User, Mail, Calendar } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-500/20 mb-4">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
          <p className="text-slate-400 text-sm mt-1">Crypto Portfolio Tracker</p>
        </div>

        {/* Info Cards */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/50 rounded-xl px-5 py-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
              <User size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                Full Name
              </p>
              <p className="text-white font-semibold">{user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/50 rounded-xl px-5 py-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Mail size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                Email Address
              </p>
              <p className="text-white font-semibold">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/50 rounded-xl px-5 py-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                Member Since
              </p>
              <p className="text-white font-semibold">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;