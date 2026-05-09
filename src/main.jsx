import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ParkingMap from "./pages/ParkingMap.jsx";
import TicketManager from "./pages/TicketManager.jsx";
import Users from "./users/Users.jsx";
import UserDetails from "./users/UserDetails.jsx";
import Settings from "./pages/Settings.jsx";
import Profile from "./pages/Profile.jsx"; // <-- 1. IMPORT THE NEW PROFILE PAGE HERE
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />, // Public route
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "map",
        element: <ParkingMap />,
      },
      {
        path: "support",
        element: <TicketManager />,
      },
      {
        path: "users",
        element: <Users />,
      },
      {
        path: "users/:userId",
        element: <UserDetails />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      // <-- 2. ADD THE PROFILE ROUTE HERE -->
      {
        path: "profile",
        element: <Profile />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
