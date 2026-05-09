import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User as UserIcon, Car, Clock } from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

// Helper function to safely format Firebase Timestamps
const formatTime = (timestamp) => {
  if (!timestamp) return null;
  // Check if it's a Firebase Timestamp object (has the toDate method)
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleString(); // e.g., "4/10/2026, 6:15:00 PM"
  }
  // Fallback just in case it's already a string
  return timestamp;
};

export default function UserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [parkingHistory, setParkingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullUserDetails = async () => {
      try {
        setLoading(true);

        // 1. Fetch User Profile Data
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData({ id: userSnap.id, ...userSnap.data() });
        } else {
          console.log("No such user!");
        }

        // 2. Fetch Vehicles
        const vehiclesRef = collection(db, "users", userId, "vehicles");
        const vehicleSnap = await getDocs(vehiclesRef);

        const fetchedVehicles = vehicleSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(fetchedVehicles);

        // 3. Fetch Parking History
        const historyRef = collection(db, "parking_history");
        const qHistory = query(historyRef, where("user_uid", "==", userId));
        const historySnap = await getDocs(qHistory);

        // Map over the documents and format the timestamps before saving to state
        const fetchedHistory = historySnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            check_in_time: formatTime(data.check_in_time),
            check_out_time: formatTime(data.check_out_time),
          };
        });

        setParkingHistory(fetchedHistory);
      } catch (error) {
        console.error("Error fetching user details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchFullUserDetails();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
        Loading user data...
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500 font-medium">User not found.</p>
        <button
          onClick={() => navigate("/users")}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          Go Back
        </button>
      </div>
    );
  }

  // --- DYNAMIC ID DETECTOR FOR USER DETAILS ---
  const getDynamicID = (user) => {
    // Note: In UserDetails we fetch the doc and set its 'id' to user.id
    const autoParkId = user.id
      ? user.id.length >= 10
        ? user.id.substring(0, 10).toUpperCase()
        : user.id.toUpperCase()
      : "N/A";

    if (user.employee_number && user.employee_number !== "N/A") {
      return { label: "Employee ID", value: user.employee_number, autoParkId };
    }
    if (user.student_number && user.student_number !== "N/A") {
      return { label: "Student ID", value: user.student_number, autoParkId };
    }
    if (user.mobile_number && user.mobile_number !== "N/A") {
      return { label: "Mobile Number", value: user.mobile_number, autoParkId };
    }

    return { label: "AutoPark ID", value: autoParkId, autoParkId };
  };

  const idInfo = getDynamicID(userData);

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Navigation */}
      <header className="flex items-center gap-4">
        <button
          onClick={() => navigate("/users")}
          className="p-2 text-slate-400 hover:text-royalBlue hover:bg-blue-50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-royalBlue tracking-tight flex items-center gap-2">
            User Profile
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Viewing details for {userData.name || "Unknown"}
          </p>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Identity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
              <UserIcon className="w-5 h-5 text-gold" />
              <h3 className="font-bold text-slate-800">Identity Details</h3>
            </div>

            <div className="flex flex-col items-center mb-6">
              {userData.profile_image ? (
                <img
                  src={userData.profile_image}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-2xl font-bold border-4 border-slate-50 shadow-sm">
                  {userData.name ? userData.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <h4 className="mt-3 text-lg font-bold text-slate-800">
                {userData.name}
              </h4>
              <p className="text-sm text-slate-500">{userData.email}</p>
              <span className="mt-2 inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                {userData.role ? userData.role.replace("_", " ") : "User"}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">AutoPark ID</span>
                <span className="font-mono font-bold text-slate-700">
                  {idInfo.autoParkId}
                </span>
              </div>

              {/* Only show the specific ID field if it's not relying on just the generic AutoPark ID */}
              {idInfo.label !== "AutoPark ID" && (
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">{idInfo.label}</span>
                  <span className="font-medium text-slate-700">
                    {idInfo.value}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Vehicles & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicles Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-royalBlue" />
                <h3 className="font-bold text-slate-800">
                  Registered Vehicles
                </h3>
              </div>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                {vehicles.length} Total
              </span>
            </div>

            {vehicles.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No vehicles registered for this user yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="p-4 border border-slate-100 bg-slate-50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        {vehicle.plate || "Unknown Plate"}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {vehicle.model || "Vehicle"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parking History Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
              <Clock className="w-5 h-5 text-slate-600" />
              <h3 className="font-bold text-slate-800">
                Recent Parking History
              </h3>
            </div>

            {parkingHistory.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No parking history available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      <th className="pb-3 font-medium">Vehicle</th>
                      <th className="pb-3 font-medium">Check In</th>
                      <th className="pb-3 font-medium">Check Out</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {parkingHistory.map((session) => (
                      <tr key={session.id}>
                        <td className="py-3 font-mono text-slate-800">
                          {session.plate || "N/A"}
                          <div className="text-xs text-slate-400 font-sans">
                            {session.model}
                          </div>
                        </td>
                        <td className="py-3 text-green-600 font-medium text-xs">
                          {session.check_in_time || "--:--"}
                        </td>
                        <td className="py-3 text-slate-500 text-xs">
                          {session.check_out_time || "Ongoing"}
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${session.status === "completed" ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-700"}`}
                          >
                            {session.status || "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
