import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  LayoutDashboard,
  Users,
  Map,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  UserCircle,
} from "lucide-react";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // <-- 1. IMPORT FIRESTORE TOOLS
import { auth, db } from "./firebase"; // <-- 2. ADD 'db' HERE

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [displayName, setDisplayName] = useState(""); // <-- 3. ADD STATE FOR NAME
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Parking Map", path: "/map", icon: Map },
    { name: "User Management", path: "/users", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  // --- 4. UPDATE LISTENER TO FETCH FROM FIRESTORE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Fallback to Auth name first
        setDisplayName(user.displayName || "");

        // Then grab the real name from Firestore
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const databaseName =
              userData.name || userData.displayName || userData.firstName || "";
            if (databaseName) {
              setDisplayName(databaseName);
            }
          }
        } catch (error) {
          console.error("Error fetching user data for sidebar:", error);
        }
      } else {
        setDisplayName("");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGlobalSearch = (e) => {
    if (e.key === "Enter" && globalSearch.trim() !== "") {
      navigate(`/users?q=${encodeURIComponent(globalSearch.trim())}`);
      setGlobalSearch("");
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setShowProfileMenu(false);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      setShowLogoutModal(false);
      navigate("/login");
    } catch (error) {
      toast.error("Failed to log out: " + error.message);
    }
  };

  // --- 5. USE THE NEW FIRESTORE DISPLAY NAME HERE ---
  const userEmail = currentUser?.email || "Loading...";
  const userName = displayName || "Admin User";
  const userInitials = displayName
    ? displayName.substring(0, 2).toUpperCase()
    : "AD";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-800">
      <Toaster position="bottom-right" reverseOrder={false} />

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Confirm Logout
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">
              Are you sure you want to log out of the ParkMatic Admin Panel?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200 rounded-xl transition-colors"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-royalBlue text-white shadow-2xl
        transform transition-transform duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div>
            <h1 className="text-3xl font-black text-gold tracking-tighter">
              RDJ
            </h1>
            <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold mt-1">
              ParkMatic Admin
            </p>
          </div>
          <button
            className="md:hidden text-white/70 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-gold font-bold shadow-inner"
                    : "text-blue-100 font-medium hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "text-gold" : "text-blue-200"}`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="relative m-4">
          {showProfileMenu && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-xl shadow-xl overflow-hidden text-slate-800 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-slate-100">
              <Link
                to="/profile"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <UserCircle className="w-4 h-4 text-royalBlue" />
                Edit Profile
              </Link>
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          )}

          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`w-full p-4 border-t border-white/10 rounded-xl flex items-center gap-3 text-left transition-colors ${showProfileMenu ? "bg-white/10" : "bg-white/5 hover:bg-white/10"}`}
          >
            <div className="w-10 h-10 shrink-0 rounded-full bg-gold flex items-center justify-center text-royalBlue font-black text-lg">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">
                {userName}
              </p>
              <p className="text-xs font-medium text-blue-200 truncate">
                {userEmail}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-royalBlue"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-royalBlue/20 focus-within:border-royalBlue transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search plates, users... (Press Enter)"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={handleGlobalSearch}
                className="bg-transparent border-none outline-none ml-2 text-sm font-medium w-64 placeholder-slate-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-royalBlue transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold flex items-center justify-center text-royalBlue font-bold text-sm md:hidden">
              {userInitials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
