import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ShieldCheck, Mail, Lock } from "lucide-react"; // Added dashboard-style icons

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role;

        if (userRole === "admin" || userRole === "super_admin") {
          localStorage.setItem("adminRole", userRole);
          navigate("/");
        } else {
          await auth.signOut();
          setError("Access Denied: You do not have administrator privileges.");
        }
      } else {
        await auth.signOut();
        setError("Access Denied: User profile not found.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Invalid admin email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      {/* Matched AdminCard styling: shadow-sm, border-slate-100, and a border highlight */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-[#0033A0] w-full max-w-sm transition-all duration-300 hover:shadow-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-blue-50 p-3 rounded-xl mb-4">
            <ShieldCheck className="w-8 h-8 text-[#0033A0]" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#0033A0] tracking-tight">
            ISAT-U
          </h1>
          {/* Matched AdminCard subtitle typography */}
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mt-1">
            ParkMatic Secure Access
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-5 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              {/* Matched Dashboard Textarea styling */}
              <input
                type="email"
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0] transition-colors"
                placeholder="admin@isatu.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0] transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0033A0] text-white font-semibold py-2.5 rounded-lg hover:bg-blue-800 transition-colors shadow-sm text-sm mt-2 disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Authenticating...
              </>
            ) : (
              "Login to Dashboard"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
