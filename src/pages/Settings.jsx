import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  Settings as SettingsIcon,
  CreditCard,
  Cpu,
  Bell,
  ShieldAlert,
  Save,
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for settings (REMOVED hourlyRate, kept penaltyFee)
  const [config, setConfig] = useState({
    penaltyFee: 150,
    gracePeriod: 15,
    sensorThreshold: 50,
    refreshRate: 5,
    maintenanceMode: false,
    alertOffline: true,
    alertViolations: true,
  });

  // REAL-TIME LISTENER: Fetch and sync settings from Firestore
  useEffect(() => {
    const docRef = doc(db, "system", "settings");

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          // If data exists in Firebase, it overrides the default 150 here!
          setConfig(docSnap.data());
        } else {
          console.log("No existing settings found, using defaults.");
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching live settings:", error);
        toast.error("Failed to connect to live settings.");
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Saving configuration...");

    try {
      const docRef = doc(db, "system", "settings");
      await setDoc(docRef, config, { merge: true });
      toast.success("Settings updated successfully!", { id: toastId });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to update settings.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : Number(value),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20 text-slate-500 font-bold">
        Loading live system settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-royalBlue tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-gold" /> System Configuration
          </h2>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-1">
            Manage campus parking rules, IoT hardware calibration, and alerts.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-70"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab("general")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === "general"
                ? "bg-royalBlue text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Rules & Penalties
          </button>
          <button
            onClick={() => setActiveTab("hardware")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === "hardware"
                ? "bg-royalBlue text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100"
            }`}
          >
            <Cpu className="w-4 h-4" /> IoT & Sensors
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === "notifications"
                ? "bg-royalBlue text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100"
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === "security"
                ? "bg-rose-600 text-white shadow-md"
                : "bg-white text-rose-600 hover:bg-rose-50 border border-rose-100"
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> System Control
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 min-h-100">
            {/* GENERAL SETTINGS */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">
                  Rules & Penalties Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hourly rate removed. Only Penalty Fee remains! */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Violation Penalty Fee (₱)
                    </label>
                    <input
                      type="number"
                      name="penaltyFee"
                      value={config.penaltyFee}
                      onChange={handleChange}
                      className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      Fee charged to unauthorized vehicles.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Exit Grace Period (Minutes)
                    </label>
                    <input
                      type="number"
                      name="gracePeriod"
                      value={config.gracePeriod}
                      onChange={handleChange}
                      className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-royalBlue/20 focus:border-royalBlue transition-all"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      Time allowed to leave after a reservation ends.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* HARDWARE SETTINGS */}
            {activeTab === "hardware" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">
                  IoT Sensor Calibration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Detection Threshold (cm)
                    </label>
                    <input
                      type="number"
                      name="sensorThreshold"
                      value={config.sensorThreshold}
                      onChange={handleChange}
                      className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-royalBlue/20 focus:border-royalBlue transition-all"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      Distance at which a vehicle is considered "Parked".
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Polling Rate (Seconds)
                    </label>
                    <input
                      type="number"
                      name="refreshRate"
                      value={config.refreshRate}
                      onChange={handleChange}
                      className="w-full text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-royalBlue/20 focus:border-royalBlue transition-all"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      How often sensors send data to Firebase.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS SETTINGS */}
            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">
                  Admin Alert Preferences
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Offline Sensor Alerts
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Notify me when a sensor drops connection for &gt; 5
                        mins.
                      </p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="alertOffline"
                        checked={config.alertOffline}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Unauthorized Parking Alerts
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Notify me immediately of parking violations.
                      </p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="alertViolations"
                        checked={config.alertViolations}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* SECURITY/SYSTEM SETTINGS */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-xl font-extrabold text-rose-600 border-b border-rose-100 pb-4">
                  System Controls
                </h3>

                <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-rose-800">
                        System Maintenance Mode
                      </h4>
                      <p className="text-xs text-rose-600/80 font-medium mt-1">
                        Activating this will prevent users from making new
                        reservations while you perform physical maintenance on
                        the parking lot.
                      </p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        name="maintenanceMode"
                        checked={config.maintenanceMode}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-rose-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
