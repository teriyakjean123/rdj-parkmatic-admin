import { useState, useEffect } from "react";
import { auth, db } from "../firebase"; // <-- MAKE SURE 'db' IS IMPORTED HERE
import {
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore"; // <-- IMPORT FIRESTORE TOOLS
import toast from "react-hot-toast";
import { UserCircle, Mail, ShieldCheck, Save, KeyRound } from "lucide-react";

export default function Profile() {
  const [displayName, setDisplayName] = useState(
    auth.currentUser?.displayName || "",
  );
  const [userEmail, setUserEmail] = useState(auth.currentUser?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email || "");

        // 1. Set whatever name Firebase Auth has initially
        if (user.displayName) {
          setDisplayName(user.displayName);
        }

        // 2. Fetch the REAL data from your Firestore "users" collection
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // Pull the name from your database (checking common field names)
            const databaseName =
              userData.name || userData.displayName || userData.firstName || "";
            if (databaseName) {
              setDisplayName(databaseName);
            }
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return toast.error("Name cannot be empty");

    setIsSaving(true);
    const toastId = toast.loading("Updating profile...");

    try {
      // 1. Update Firebase Auth System
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
      });

      // 2. Update Firestore Database to keep everything in sync
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        userDocRef,
        {
          displayName: displayName.trim(),
          name: displayName.trim(), // Saving as 'name' too, just in case your app relies on it
        },
        { merge: true },
      );

      toast.success("Profile updated perfectly!", { id: toastId });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error("Failed to update: " + error.message, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userEmail) return toast.error("No email found to send reset link.");

    setIsResetting(true);
    const toastId = toast.loading("Sending password reset email...");

    try {
      await sendPasswordResetEmail(auth, userEmail);
      toast.success("Reset link sent! Please check your email inbox.", {
        id: toastId,
      });
    } catch (error) {
      toast.error("Failed to send reset email: " + error.message, {
        id: toastId,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-royalBlue tracking-tight">
          Admin Profile
        </h2>
        <p className="text-sm md:text-base text-slate-500 font-medium mt-1">
          Manage your personal account settings and security.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-24 bg-linear-to-r from-royalBlue to-blue-600"></div>
        <div className="px-6 pb-6 relative">
          <div className="absolute -top-12 left-6 w-24 h-24 bg-white rounded-full p-1.5 shadow-md">
            <div className="w-full h-full bg-gold text-royalBlue rounded-full flex items-center justify-center font-black text-3xl">
              {displayName ? displayName.substring(0, 2).toUpperCase() : "AD"}
            </div>
          </div>

          <div className="pt-16">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Display Name Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <UserCircle className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-royalBlue/20 focus:border-royalBlue outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email (Read Only) */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={userEmail}
                    placeholder="Fetching email..."
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Managed securely by
                  Firebase
                </p>
              </div>

              {/* Password Reset Section */}
              <div className="pt-6 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Security
                </label>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-500">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Change Password
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        A secure reset link will be sent to your email.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isResetting || !userEmail}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 hover:text-royalBlue transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isResetting ? "Sending..." : "Send Link"}
                  </button>
                </div>
              </div>

              {/* Save Profile Button */}
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-royalBlue text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
