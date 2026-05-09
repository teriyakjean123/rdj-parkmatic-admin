import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  Check,
  Mail,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Send,
  X,
} from "lucide-react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import emailjs from "@emailjs/browser";

export default function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // EmailJS States
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 1. Fetch ALL real-time SUPPORT TICKETS
  useEffect(() => {
    const ticketsRef = collection(db, "support_tickets");
    const unsubscribe = onSnapshot(ticketsRef, (snapshot) => {
      const fetchedTickets = snapshot.docs.map((doc) => {
        const data = doc.data();
        let timeString = "Recently";
        let rawTimeVal = 0;

        if (data.timestamp?.toDate) {
          const dateObj = data.timestamp.toDate();
          timeString =
            dateObj.toLocaleDateString() +
            " " +
            dateObj.toLocaleTimeString([], {
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
          message: data.message || "No detailed message provided by the user.",
        };
      });

      fetchedTickets.sort((a, b) => b.rawTime - a.rawTime);
      setTickets(fetchedTickets);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Action: Send EmailJS Reply
  const handleSendReply = async (ticket) => {
    if (!replyText.trim()) return;
    setIsSending(true);

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          to_email: ticket.user,
          subject: `Re: ParkMatic Support - ${ticket.issue}`,
          name: ticket.user.split("@")[0],
          time: new Date().toLocaleString(),
          message: replyText,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );

      alert(`Reply successfully sent to ${ticket.user}!`);

      setReplyText("");
      setReplyingId(null);

      // Automatically resolve ticket after replying
      await handleResolveTicket(ticket.id);
    } catch (err) {
      console.error("EmailJS Error:", err);
      alert("Failed to send reply. Check console for details.");
    } finally {
      setIsSending(false);
    }
  };

  // 3. Action: Update a ticket to "Resolved"
  const handleResolveTicket = async (ticketId) => {
    try {
      const ticketRef = doc(db, "support_tickets", ticketId);
      await updateDoc(ticketRef, { status: "Resolved" });

      if (replyingId === ticketId) {
        setReplyingId(null);
        setReplyText("");
      }
    } catch (err) {
      alert("Error resolving ticket: " + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/"
              className="text-gray-400 hover:text-royalBlue transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-2xl md:text-3xl font-extrabold text-royalBlue tracking-tight flex items-center gap-2">
              <Ticket className="w-8 h-8" />
              Support Center
            </h2>
          </div>
          <p className="text-sm md:text-base text-gray-500 font-medium ml-7">
            Manage, resolve, and reply to user inquiries.
          </p>
        </div>

        {/* Quick Stats Badge */}
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-bold uppercase">Pending</p>
            <p className="text-lg font-extrabold text-amber-600">
              {tickets.filter((t) => t.status !== "Resolved").length}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-bold uppercase">
              Resolved
            </p>
            <p className="text-lg font-extrabold text-green-600">
              {tickets.filter((t) => t.status === "Resolved").length}
            </p>
          </div>
        </div>
      </header>

      {/* Ticket List */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400 font-medium animate-pulse">
          Loading tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700">Inbox Zero!</h3>
          <p className="text-gray-500">
            There are no support tickets in the system.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`bg-white rounded-xl shadow-sm border p-5 transition-colors ${
                ticket.status === "Resolved"
                  ? "border-green-200 bg-green-50/30"
                  : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-gray-800">
                  {ticket.issue}
                </h3>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    ticket.status === "Resolved"
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 font-medium">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" /> {ticket.user}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {ticket.time}
                </span>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 text-sm text-gray-700">
                {ticket.message}
              </div>

              {/* In-App Reply UI */}
              {replyingId === ticket.id ? (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-royalBlue mb-2">
                    Replying to {ticket.user}
                  </label>
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-md p-3 mb-3 focus:ring-2 focus:ring-royalBlue/20 outline-none resize-none"
                    rows="4"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response here..."
                    autoFocus
                  ></textarea>
                  <div className="flex gap-2 justify-end">
                    <button
                      disabled={isSending}
                      onClick={() => {
                        setReplyingId(null);
                        setReplyText("");
                      }}
                      className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isSending || !replyText.trim()}
                      onClick={() => handleSendReply(ticket)}
                      className="flex items-center gap-2 px-4 py-1.5 bg-royalBlue text-white text-sm font-bold rounded-md hover:bg-blue-800 disabled:bg-gray-400 transition-colors"
                    >
                      {isSending ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setReplyingId(ticket.id);
                      setReplyText(
                        `Hi there,\n\nRegarding your recent ticket: "${ticket.issue}"...\n\n`,
                      );
                    }}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Write Reply
                  </button>

                  {ticket.status !== "Resolved" && (
                    <button
                      onClick={() => handleResolveTicket(ticket.id)}
                      className="flex items-center gap-2 bg-royalBlue text-white hover:bg-blue-800 px-4 py-2 rounded-lg text-sm font-bold transition-colors ml-auto"
                    >
                      <Check className="w-4 h-4" />
                      Mark Resolved
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
