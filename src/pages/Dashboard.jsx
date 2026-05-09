import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Car,
  AlertTriangle,
  CheckCircle2,
  Users,
  Megaphone,
  Ticket,
  BarChart3,
  Cpu,
  WifiOff,
  Map as MapIcon,
  Check,
  Search,
} from "lucide-react";
import AdminCard from "../components/AdminCard.jsx";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Dashboard() {
  const [slots, setSlots] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [chartData, setChartData] = useState([]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    parked: 0,
    available: 0,
    violations: 0,
    onlineCount: 0,
    offlineCount: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const slotsRef = collection(db, "parking_slots");
    const unsubscribe = onSnapshot(slotsRef, (snapshot) => {
      let parkedCount = 0;
      let availableCount = 0;
      let violationCount = 0;
      let onlineCount = 0;
      let offlineCount = 0;

      const fetchedSlots = snapshot.docs.map((doc) => {
        const data = doc.data();
        const statusVal = data.status || 0;

        let statusText = "UNKNOWN";
        if (statusVal === 0) {
          statusText = "AVAILABLE";
          availableCount++;
        } else if (statusVal === 1) {
          statusText = "OCCUPIED";
          parkedCount++;
        } else if (statusVal === 2) {
          statusText = "RESERVED";
          parkedCount++;
        } else if (statusVal === 3) {
          statusText = "UNAUTHORIZED";
          violationCount++;
        }

        const isOnline = data.isOnline !== undefined ? data.isOnline : true;
        if (isOnline) onlineCount++;
        else offlineCount++;

        return {
          id: doc.id.replace("slot_", "").toUpperCase(),
          rawId: doc.id,
          status: statusText,
          distance: data.distance ? `${data.distance} cm` : "N/A",
          isOnline: isOnline,
        };
      });

      fetchedSlots.sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true }),
      );
      setSlots(fetchedSlots);
      setStats((prev) => ({
        ...prev,
        parked: parkedCount,
        available: availableCount,
        violations: violationCount,
        onlineCount,
        offlineCount,
      }));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      setStats((prev) => ({ ...prev, totalUsers: snapshot.size }));
    });
    return () => unsubscribe();
  }, []);

  // 3. Fetch real-time SUPPORT TICKETS
  useEffect(() => {
    const ticketsRef = collection(db, "support_tickets");
    const unsubscribe = onSnapshot(ticketsRef, (snapshot) => {
      const fetchedTickets = snapshot.docs.map((doc) => {
        const data = doc.data();
        let timeString = "Recently";
        let rawTimeVal = 0;

        if (data.timestamp?.toDate) {
          const dateObj = data.timestamp.toDate();
          timeString = dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          rawTimeVal = dateObj.getTime();
        }

        return {
          id: doc.id,
          issue: data.subject || "No Subject",
          user: data.userEmail || "Unknown User",
          userId: data.userId || "N/A",
          status: data.status || "Pending",
          time: timeString,
          rawTime: rawTimeVal,
        };
      });

      fetchedTickets.sort((a, b) => b.rawTime - a.rawTime);
      setTickets(fetchedTickets);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const historyRef = collection(db, "parking_history");

    const q = query(
      historyRef,
      where("timestamp", ">=", Timestamp.fromDate(startOfToday)),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setChartData([
          { time: "6 AM", vehicles: 0 },
          { time: "9 AM", vehicles: 0 },
          { time: "12 PM", vehicles: 0 },
          { time: "3 PM", vehicles: 0 },
          { time: "6 PM", vehicles: 0 },
          { time: "9 PM", vehicles: 0 },
        ]);
        return;
      }

      const hourlyData = {
        "6 AM": 0,
        "9 AM": 0,
        "12 PM": 0,
        "3 PM": 0,
        "6 PM": 0,
        "9 PM": 0,
      };

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.toDate) {
          const hour = data.timestamp.toDate().getHours();

          if (hour >= 5 && hour < 8) hourlyData["6 AM"]++;
          else if (hour >= 8 && hour < 11) hourlyData["9 AM"]++;
          else if (hour >= 11 && hour < 14) hourlyData["12 PM"]++;
          else if (hour >= 14 && hour < 17) hourlyData["3 PM"]++;
          else if (hour >= 17 && hour < 20) hourlyData["6 PM"]++;
          else if (hour >= 20 || hour < 5) hourlyData["9 PM"]++;
        }
      });

      const formattedChartData = Object.keys(hourlyData).map((key) => ({
        time: key,
        vehicles: hourlyData[key],
      }));

      setChartData(formattedChartData);
    });

    return () => unsubscribe();
  }, []);

  const handleResolveTicket = async (ticketId) => {
    const toastId = toast.loading("Resolving ticket...");
    try {
      const ticketRef = doc(db, "support_tickets", ticketId);
      await updateDoc(ticketRef, { status: "Resolved" });
      toast.success("Ticket marked as resolved!", { id: toastId });
    } catch (err) {
      toast.error("Error resolving ticket: " + err.message, { id: toastId });
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcement.trim()) {
      toast.error("Please enter both a title and a message.");
      return;
    }
    setIsSending(true);
    const toastId = toast.loading("Broadcasting announcement...");
    try {
      await addDoc(collection(db, "notifications"), {
        title: announcementTitle.trim(),
        is_seen: false,
        message: announcement.trim(),
        type: "global",
        user_uid: "ALL",
        timestamp: serverTimestamp(),
      });

      setAnnouncementTitle("");
      setAnnouncement("");
      toast.success("Announcement sent to all users!", { id: toastId });
    } catch (err) {
      toast.error("Failed to send: " + err.message, { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  const filteredSlots = slots.filter((slot) => {
    const query = searchQuery.toLowerCase();
    return (
      slot.id.toLowerCase().includes(query) ||
      slot.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-royalBlue tracking-tight">
            System Overview
          </h2>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-1">
            Real-time status of the RDJ ParkMatic environment.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200/50 shadow-sm transition-all hover:bg-emerald-100">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
          </span>
          IoT Sensors Active
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <AdminCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          highlightColor="border-b-blue-500"
        />
        <AdminCard
          title="Currently Parked"
          value={stats.parked}
          icon={Car}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          highlightColor="border-b-gold"
        />
        <AdminCard
          title="Available Slots"
          value={stats.available}
          icon={CheckCircle2}
          valueColor="text-emerald-600"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          highlightColor="border-b-emerald-500"
        />
        <AdminCard
          title="Active Violations"
          value={stats.violations}
          icon={AlertTriangle}
          valueColor="text-rose-600"
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          highlightColor="border-b-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-96">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-bold text-royalBlue flex items-center gap-2 whitespace-nowrap">
                <Cpu className="w-5 h-5 text-gold" /> Live Sensor Status
              </h3>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-56 md:w-64 group">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-royalBlue" />
                  <input
                    type="text"
                    placeholder="Filter slots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-royalBlue/20 focus:border-royalBlue outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <Link
                  to="/map"
                  className="flex items-center gap-2 bg-royalBlue text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-blue-800 transition-all shadow-sm hover:shadow shrink-0"
                >
                  <MapIcon className="w-4 h-4" /> Full Map
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredSlots.length === 0 ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Search className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="font-medium">No slots match your search.</p>
                </div>
              ) : (
                filteredSlots.map((slot) => (
                  <div
                    key={slot.rawId}
                    className={`p-4 rounded-xl border flex flex-col gap-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default ${
                      slot.status === "AVAILABLE"
                        ? "bg-emerald-50/50 border-emerald-200/60 hover:border-emerald-300"
                        : slot.status === "UNAUTHORIZED"
                          ? "bg-rose-50/50 border-rose-200/60 hover:border-rose-300"
                          : "bg-amber-50/50 border-amber-200/60 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 text-lg">
                        Slot {slot.id}
                      </span>
                      {slot.isOnline ? (
                        <div className="bg-emerald-100 p-1 rounded-full">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="bg-slate-100 p-1 rounded-full">
                          <WifiOff className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <p
                      className={`text-xs font-black uppercase tracking-wider ${
                        slot.status === "AVAILABLE"
                          ? "text-emerald-700"
                          : slot.status === "UNAUTHORIZED"
                            ? "text-rose-700"
                            : "text-amber-700"
                      }`}
                    >
                      {slot.status}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${slot.status === "AVAILABLE" ? "w-0" : "w-full bg-slate-400"}`}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono font-bold">
                        {slot.distance}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-80 flex flex-col">
            <h3 className="text-lg font-bold text-royalBlue flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-gold" /> Peak Parking Hours
            </h3>

            <div className="flex-1 w-full relative min-h-0">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f1f5f9" }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="vehicles"
                      fill="#1e3a8a"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          {/* --------------------------------- */}
        </div>

        {/* Right: Tickets & Announcements */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col min-h-64">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-royalBlue flex items-center gap-2">
                <Ticket className="w-5 h-5 text-gold" /> Recent Tickets
              </h3>
              <Link
                to="/support"
                className="text-xs font-bold text-royalBlue bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Manage All
              </Link>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-88 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {tickets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
                  <p className="font-medium text-sm">Inbox Zero!</p>
                </div>
              ) : (
                tickets.slice(0, 4).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1 pr-2">
                        {ticket.issue}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${
                          ticket.status === "Resolved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mb-3">
                      {ticket.user} <span className="mx-1">•</span>{" "}
                      {ticket.time}
                    </p>
                    {ticket.status !== "Resolved" && (
                      <button
                        onClick={() => handleResolveTicket(ticket.id)}
                        className="text-[11px] flex items-center gap-1.5 text-royalBlue font-bold bg-white px-2.5 py-1.5 rounded border border-slate-200 hover:border-royalBlue/50 hover:bg-blue-50 transition-all w-fit"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Resolved
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-royalBlue flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-gold" /> Broadcast Message
            </h3>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Announcement Title"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-royalBlue/20 focus:border-royalBlue outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
              <div className="relative">
                <textarea
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3.5 pb-12 focus:ring-2 focus:ring-royalBlue/20 focus:border-royalBlue outline-none resize-none transition-all placeholder:text-slate-400"
                  rows="3"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Type an announcement to all users..."
                ></textarea>
                <button
                  disabled={
                    isSending ||
                    !announcement.trim() ||
                    !announcementTitle.trim()
                  }
                  onClick={handleSendAnnouncement}
                  className="absolute bottom-2 right-2 bg-royalBlue text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-800 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSending ? "Sending..." : "Send Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
