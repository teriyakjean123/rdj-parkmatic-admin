import { useRef, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { MapPin, ShieldAlert, Wrench } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --- FIREBASE IMPORTS (Updated for Direct Firestore Access) ---
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase.js";

// --- FIX FOR LEAFLET MARKER ICONS IN REACT ---
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;
// ---------------------------------------------

export default function ParkingMap() {
  const mapRef = useRef(null);
  const [slots, setSlots] = useState([]);
  const [isOverriding, setIsOverriding] = useState(false);

  // ISAT-U Coordinates
  const isatuCoordinates = [10.715278, 122.565833];

  useEffect(() => {
    const slotsRef = collection(db, "parking_slots");

    const unsubscribe = onSnapshot(slotsRef, (snapshot) => {
      const fetchedSlots = snapshot.docs.map((doc) => {
        const data = doc.data();
        let lat = 0;
        let lng = 0;

        // Clean, direct coordinate assignment
        if (data.location && typeof data.location.latitude !== "undefined") {
          lat = data.location.latitude;
          lng = data.location.longitude;
        } else {
          // Adjusted fallbacks so they do not overlap
          if (doc.id === "slot_1") {
            lat = 10.71515;
            lng = 122.5658;
          } else if (doc.id === "slot_2") {
            lat = 10.71525;
            lng = 122.5658;
          } else if (doc.id === "slot_3") {
            lat = 10.71535;
            lng = 122.5658;
          }
        }

        return {
          id: doc.id,
          status: data.status || 0,
          position: [lat, lng],
        };
      });

      setSlots(fetchedSlots);
    });

    return () => unsubscribe();
  }, []);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(isatuCoordinates, 18, {
        duration: 1.5,
      });
    }
  };

  // --- NEW DIRECT FIRESTORE OVERRIDE LOGIC ---
  const handleOverrideSlot = async (slotId, newStatus) => {
    const actionName = newStatus === 0 ? "FORCE CLEAR" : "SET TO MAINTENANCE";

    if (
      !window.confirm(
        `Are you sure you want to ${actionName} ${slotId.toUpperCase()}?`,
      )
    ) {
      return;
    }

    setIsOverriding(true);
    try {
      // Point directly to the specific parking slot document
      const slotRef = doc(db, "parking_slots", slotId);

      // Update the document directly
      await updateDoc(slotRef, {
        status: newStatus,
        current_user_uid: null,
        current_user_name: null,
        current_plate: null,
        current_vehicle_model: null,
        active_trip_id: null,
        last_override_by: "Admin_Dashboard", // Hardcoded identifier since we bypassed auth context
        override_timestamp: serverTimestamp(),
      });

      alert(`Successfully updated ${slotId}!`);
    } catch (error) {
      console.error("Failed to override slot:", error);
      alert("Error overriding slot. Check console.");
    } finally {
      setIsOverriding(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 0:
        return { text: "AVAILABLE", color: "bg-green-500" };
      case 1:
        return { text: "OCCUPIED", color: "bg-red-500" };
      case 2:
        return { text: "RESERVED", color: "bg-orange-500" };
      case 3:
        return { text: "UNAUTHORIZED", color: "bg-purple-500" };
      case 4:
        return { text: "MAINTENANCE", color: "bg-slate-800" };
      default:
        return { text: "UNKNOWN", color: "bg-gray-500" };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-[85vh]">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-royalBlue">Live Campus Map</h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time geolocation of parking slots via OpenStreetMap.
          </p>
        </div>

        <button
          onClick={handleRecenter}
          className="flex items-center gap-2 bg-royalBlue hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <MapPin className="w-4 h-4" />
          Recenter Map
        </button>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border-2 border-gray-200 relative z-0">
        <MapContainer
          center={isatuCoordinates}
          zoom={18}
          scrollWheelZoom={true}
          ref={mapRef}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {slots.map((slot) => {
            const { text, color } = getStatusDisplay(slot.status);

            if (slot.position[0] === 0) return null;

            return (
              <Marker key={slot.id} position={slot.position}>
                <Popup>
                  <div className="text-center w-40">
                    <p className="font-bold text-lg mb-1 capitalize">
                      {slot.id.replace("_", " ")}
                    </p>
                    <p
                      className={`text-xs font-bold px-3 py-1 rounded-full text-white inline-block ${color}`}
                    >
                      {text}
                    </p>

                    <div className="mt-4 border-t pt-3 flex flex-col gap-2">
                      {slot.status !== 0 && (
                        <button
                          onClick={() => handleOverrideSlot(slot.id, 0)}
                          disabled={isOverriding}
                          className="flex items-center justify-center gap-1 w-full bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          {isOverriding ? "Updating..." : "Force Clear"}
                        </button>
                      )}

                      {slot.status !== 4 && (
                        <button
                          onClick={() => handleOverrideSlot(slot.id, 4)}
                          disabled={isOverriding}
                          className="flex items-center justify-center gap-1 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          <Wrench className="w-3 h-3" />
                          {isOverriding ? "Updating..." : "Maintenance"}
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
