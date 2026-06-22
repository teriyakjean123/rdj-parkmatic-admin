import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users as UsersIcon,
  Search,
  Shield,
  MoreVertical,
  ShieldAlert,
  UserCheck,
  Copy,
  Check,
  ChevronRight,
  Edit2,
  Ban,
  Trash2,
  X,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [copiedId, setCopiedId] = useState(null);

  const [activeMenu, setActiveMenu] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: null,
    user: null,
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    student_number: "",
    employee_number: "",
    mobile_number: "",
  });

  const [selectedRole, setSelectedRole] = useState("Student");
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate();

  // 🛡️ DYNAMIC AUTHENTICATED SESSION STATE
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // 1. Listen for the logged-in user dynamically
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setCurrentUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch all users from Firestore
  useEffect(() => {
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const fetchedUsers = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));
      setUsers(fetchedUsers);
    });
    return () => unsubscribe();
  }, []);

  // 3. Dynamically determine the logged-in user's role based on the fetched data
  useEffect(() => {
    if (currentUserId && users.length > 0) {
      const loggedInRecord = users.find((u) => u.uid === currentUserId);
      if (loggedInRecord) {
        // Normalize role to lowercase with underscores to prevent mismatch errors
        const role = (loggedInRecord.role || "student")
          .toLowerCase()
          .replace(" ", "_");
        setCurrentUserRole(role);
      }
    }
  }, [currentUserId, users]);

  // Global click listener to safely close menus on outside clicks
  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const getDynamicID = (user) => {
    const autoParkId = user.uid
      ? user.uid.length >= 10
        ? user.uid.substring(0, 10).toUpperCase()
        : user.uid.toUpperCase()
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

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    const idInfo = getDynamicID(user);
    return (
      (user.name || "").toLowerCase().includes(q) ||
      (user.email || "").toLowerCase().includes(q) ||
      (idInfo.value || "").toLowerCase().includes(q) ||
      (idInfo.autoParkId || "").toLowerCase().includes(q)
    );
  });

  const handleViewUser = (userId) => {
    navigate(`/users/${userId}`);
  };

  const handleCopy = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMenuAction = (e, actionType, user) => {
    e.stopPropagation();
    setActiveMenu(null);

    if (actionType === "edit") {
      setEditFormData({
        name: user.name || "",
        student_number: user.student_number || "",
        employee_number: user.employee_number || "",
        mobile_number: user.mobile_number || "",
      });
    }

    if (actionType === "role") {
      setSelectedRole(user.role || "Student");
    }

    setModalConfig({ isOpen: true, type: actionType, user: user });
  };

  const executeAction = async () => {
    if (!modalConfig.user) return;

    if (modalConfig.user.uid === currentUserId) {
      alert(
        "Unauthorized Action: You cannot alter your own administrative privilege profile.",
      );
      setModalConfig({ isOpen: false, type: null, user: null });
      return;
    }

    // Normalize target user's role to check permissions accurately
    const targetRole = (modalConfig.user.role || "student")
      .toLowerCase()
      .replace(" ", "_");

    // 🔒 Prevent Super Admin from modifying another Super Admin
    if (currentUserRole === "super_admin" && targetRole === "super_admin") {
      alert(
        "Unauthorized Action: Super Administrators cannot modify fellow Super Administrator accounts.",
      );
      setModalConfig({ isOpen: false, type: null, user: null });
      return;
    }

    // 🔒 Prevent Admin from modifying Admins and Super Admins
    if (
      currentUserRole === "admin" &&
      (targetRole === "super_admin" || targetRole === "admin")
    ) {
      alert(
        "Unauthorized Action: Administrators cannot modify other administrator accounts.",
      );
      setModalConfig({ isOpen: false, type: null, user: null });
      return;
    }

    setIsProcessing(true);

    try {
      const userRef = doc(db, "users", modalConfig.user.uid);

      if (modalConfig.type === "edit") {
        const updatePayload = {
          name: editFormData.name,
          student_number:
            editFormData.student_number.trim() === ""
              ? "N/A"
              : editFormData.student_number,
          employee_number:
            editFormData.employee_number.trim() === ""
              ? "N/A"
              : editFormData.employee_number,
          mobile_number:
            editFormData.mobile_number.trim() === ""
              ? "N/A"
              : editFormData.mobile_number,
        };
        await updateDoc(userRef, updatePayload);
      } else if (modalConfig.type === "role") {
        await updateDoc(userRef, { role: selectedRole });
      } else if (modalConfig.type === "suspend") {
        const isCurrentlySuspended = modalConfig.user.status === "suspended";
        const newStatus = isCurrentlySuspended ? "active" : "suspended";
        await updateDoc(userRef, { status: newStatus });
      } else if (modalConfig.type === "delete") {
        await deleteDoc(userRef);
      }

      setModalConfig({ isOpen: false, type: null, user: null });
    } catch (error) {
      console.error("Error executing action:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch ((role || "").toLowerCase().replace(" ", "_")) {
      case "super_admin":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-blue-100 text-blue-700";
      case "faculty":
        return "bg-emerald-100 text-emerald-700";
      case "administrative_staff":
        return "bg-teal-100 text-teal-700";
      case "visitor":
        return "bg-amber-100 text-amber-700";
      case "student":
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getModalSubmitBtnStyle = () => {
    const baseClasses =
      "px-4 py-2 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2";
    if (modalConfig.type === "delete")
      return `${baseClasses} bg-red-600 hover:bg-red-700 shadow-red-600/20`;
    if (modalConfig.type === "suspend")
      return `${baseClasses} bg-amber-600 hover:bg-amber-700 shadow-amber-600/20`;
    return `${baseClasses} bg-royalBlue hover:bg-blue-700 shadow-royalBlue/20`;
  };

  // Find the actual logged-in user record dynamically
  const loggedInUserRecord = users.find((u) => u.uid === currentUserId);

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-royalBlue tracking-tight flex items-center gap-2">
            <UsersIcon className="w-8 h-8 text-gold" />
            User Management
          </h2>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-1">
            Real-time control over all registered AutoPark accounts.
          </p>
        </div>

        {/* 👤 CURRENT LOGGED IN USER MINI-CARD */}
        {loggedInUserRecord && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3 shadow-inner max-w-sm">
            {loggedInUserRecord.profile_image ? (
              <img
                src={loggedInUserRecord.profile_image}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-royalBlue/20"
                alt=""
              />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-purple-100 text-purple-700 border border-purple-300 shadow-sm">
                {loggedInUserRecord.name
                  ? loggedInUserRecord.name.charAt(0).toUpperCase()
                  : "A"}
              </div>
            )}
            <div className="pr-2">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-slate-800 leading-none">
                  {loggedInUserRecord.name || "Loading..."}
                </p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-extrabold tracking-wide uppercase bg-purple-600 text-white shadow-sm">
                  You
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {loggedInUserRecord.email}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* SEARCH CONTROL BAR */}
      <div className="flex justify-end">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-royalBlue/20 focus:border-royalBlue outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* USERS DIRECTORY TABLE CONTAINER */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible">
        <div className="overflow-x-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">ID Information</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const idInfo = getDynamicID(user);

                // Normalizing roles dynamically to handle casing differences in Firebase
                const normalizedRole = (user.role || "student")
                  .toLowerCase()
                  .replace(" ", "_");
                const isTargetAdmin =
                  normalizedRole === "admin" ||
                  normalizedRole === "super_admin";
                const isSelf = user.uid === currentUserId;

                // 🛡️ MODIFIED: Restrict modifying privileges dynamically
                const canModifyThisUser =
                  !isSelf &&
                  ((currentUserRole === "super_admin" &&
                    normalizedRole !== "super_admin") ||
                    (currentUserRole === "admin" &&
                      normalizedRole !== "super_admin" &&
                      normalizedRole !== "admin"));

                return (
                  <tr
                    key={user.uid}
                    onClick={() => handleViewUser(user.uid)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors group ${isTargetAdmin ? "bg-blue-50/20 hover:bg-blue-50/50" : ""} ${user.status === "suspended" ? "opacity-60 bg-slate-50" : ""} ${isSelf ? "bg-purple-50/10 hover:bg-purple-50/30" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.profile_image ? (
                          <img
                            src={user.profile_image}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            alt=""
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${isTargetAdmin ? "border-royalBlue bg-blue-100 text-royalBlue" : "border-slate-200 bg-slate-100 text-slate-600"}`}
                          >
                            {user.name
                              ? user.name.charAt(0).toUpperCase()
                              : "U"}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                            {user.name}
                            {isTargetAdmin && (
                              <UserCheck className="w-3 h-3 text-royalBlue" />
                            )}
                            {isSelf && (
                              <span className="text-[9px] px-1 rounded-sm bg-purple-100 text-purple-700 font-extrabold uppercase">
                                You
                              </span>
                            )}
                            {user.status === "suspended" && (
                              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 font-bold uppercase tracking-wider">
                                Suspended
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-slate-600 font-bold">
                            {idInfo.value}
                          </span>
                          <button
                            onClick={(e) => handleCopy(e, idInfo.value)}
                            className="text-slate-400 hover:text-royalBlue transition-colors p-1 -m-1 rounded"
                            title="Copy ID"
                          >
                            {copiedId === idInfo.value ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                          {idInfo.label}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadgeStyle(user.role)}`}
                      >
                        {normalizedRole === "super_admin" ? (
                          <ShieldAlert className="w-3 h-3" />
                        ) : normalizedRole === "admin" ? (
                          <Shield className="w-3 h-3" />
                        ) : null}
                        {(user.role || "Student").toUpperCase()}
                      </span>
                    </td>

                    <td className="px-6 py-4 relative">
                      <div className="flex items-center justify-end gap-2">
                        {canModifyThisUser ? (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(
                                  activeMenu === user.uid ? null : user.uid,
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${activeMenu === user.uid ? "bg-blue-100 text-royalBlue" : "text-slate-400 hover:text-royalBlue hover:bg-blue-50"}`}
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {activeMenu === user.uid && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1"
                              >
                                <button
                                  onClick={(e) =>
                                    handleMenuAction(e, "edit", user)
                                  }
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4 text-slate-400" />{" "}
                                  Edit Details
                                </button>

                                {currentUserRole === "super_admin" && (
                                  <button
                                    onClick={(e) =>
                                      handleMenuAction(e, "role", user)
                                    }
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Shield className="w-4 h-4 text-blue-500" />{" "}
                                    Manage Role
                                  </button>
                                )}

                                <div className="h-px bg-slate-100 my-1"></div>
                                <button
                                  onClick={(e) =>
                                    handleMenuAction(e, "suspend", user)
                                  }
                                  className="w-full px-4 py-2 text-left text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  <Ban className="w-4 h-4 text-amber-500" />
                                  {user.status === "suspended"
                                    ? "Unsuspend Account"
                                    : "Suspend Account"}
                                </button>
                                <button
                                  onClick={(e) =>
                                    handleMenuAction(e, "delete", user)
                                  }
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />{" "}
                                  Delete User
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-royalBlue transition-colors group-hover:translate-x-1" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ACTION MODAL --- */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 capitalize">
                {modalConfig.type} User
              </h3>
              <button
                onClick={() =>
                  setModalConfig({ isOpen: false, type: null, user: null })
                }
                disabled={isProcessing}
                className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-slate-600">
              {modalConfig.type === "edit" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-royalBlue bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Student Number
                    </label>
                    <input
                      type="text"
                      value={
                        editFormData.student_number === "N/A"
                          ? ""
                          : editFormData.student_number
                      }
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          student_number: e.target.value,
                        })
                      }
                      placeholder="Leave blank if N/A"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-royalBlue bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Employee Number
                    </label>
                    <input
                      type="text"
                      value={
                        editFormData.employee_number === "N/A"
                          ? ""
                          : editFormData.employee_number
                      }
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          employee_number: e.target.value,
                        })
                      }
                      placeholder="Leave blank if N/A"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-royalBlue bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Mobile Number (Visitors)
                    </label>
                    <input
                      type="text"
                      value={
                        editFormData.mobile_number === "N/A"
                          ? ""
                          : editFormData.mobile_number
                      }
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          mobile_number: e.target.value,
                        })
                      }
                      placeholder="Leave blank if N/A"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-royalBlue bg-slate-50"
                    />
                  </div>
                </div>
              )}

              {modalConfig.type === "role" && (
                <div className="space-y-4">
                  <p>
                    Change access level for{" "}
                    <strong className="text-slate-800">
                      {modalConfig.user?.name}
                    </strong>
                    .
                  </p>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Select Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-slate-50"
                    >
                      <option value="Student">Student</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Administrative Staff">
                        Administrative Staff
                      </option>
                      <option value="Visitor">Visitor</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                </div>
              )}

              {modalConfig.type === "delete" && (
                <p>
                  Permanently delete{" "}
                  <strong className="text-slate-800">
                    {modalConfig.user?.name}
                  </strong>
                  ? This action cannot be undone.
                </p>
              )}

              {modalConfig.type === "suspend" && (
                <p>
                  Do you want to{" "}
                  {modalConfig.user?.status === "suspended"
                    ? "unsuspend"
                    : "suspend"}{" "}
                  <strong className="text-slate-800">
                    {modalConfig.user?.name}
                  </strong>
                  ?
                </p>
              )}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() =>
                  setModalConfig({ isOpen: false, type: null, user: null })
                }
                disabled={isProcessing}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={isProcessing}
                className={getModalSubmitBtnStyle()}
              >
                {isProcessing ? "Processing..." : `Confirm ${modalConfig.type}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
