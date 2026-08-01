// Watch Party create page
// File saved without BOM
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function CreateParty() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState(localStorage.getItem("watchPartyPlan") || "free");
  const [userId, setUserId] = useState(() => localStorage.getItem("watchPartyUserId") || "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const ensureUserId = () => {
    if (userId) {
      return userId;
    }

    const id = `user_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    localStorage.setItem("watchPartyUserId", id);
    setUserId(id);
    return id;
  };

  const createRoom = async () => {
    if (name.trim() === "") {
      alert("Please enter your name before creating a room.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.get("/create-room");
      setRoomId(response.data.roomId);
    } catch (error) {
      console.error(error);
      alert("Unable to create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const enterRoom = () => {
    if (!roomId) return;

    const id = ensureUserId();
    localStorage.setItem("watchPartyPlan", plan);
    localStorage.setItem("watchPartyName", name);

    navigate(`/room?roomId=${roomId}&name=${encodeURIComponent(name)}&plan=${plan}&userId=${id}`, {
      state: {
        roomId,
        name,
        plan,
        userId: id,
      },
    });
  };

  const inviteLink = roomId ? `${window.location.origin}/join?roomId=${roomId}` : "";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "760px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "24px", padding: "32px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <h1 style={{ marginTop: 0, marginBottom: "8px" }}>Create Watch Party</h1>
        <p style={{ marginTop: 0, fontSize: "16px", opacity: 0.95 }}>Generate a room and share the invite link with friends.</p>

        <div style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
          <input
            type="text"
            placeholder="Enter Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.9)", color: "#0f172a" }}
          />

          <label style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}>Select Plan:</span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.95)", color: "#0f172a" }}
            >
              <option value="free">Free</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
          </label>

          <button onClick={createRoom} disabled={loading || !name.trim()} style={{ padding: "12px 18px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, background: "#fbbf24", color: "#111827" }}>
            {loading ? "Generating..." : "Generate Room ID"}
          </button>
        </div>

        {roomId && (
          <div style={{ marginTop: "24px", padding: "18px", borderRadius: "16px", background: "rgba(255,255,255,0.18)" }}>
            <h2 style={{ marginTop: 0 }}>Room ID</h2>
            <h3 style={{ margin: "4px 0 10px" }}>{roomId}</h3>
            <p style={{ marginBottom: "8px" }}>Invite link:</p>
            <code style={{ display: "block", margin: "10px auto", wordBreak: "break-all", maxWidth: "600px", background: "rgba(15,23,42,0.35)", padding: "10px", borderRadius: "8px" }}>
              {inviteLink}
            </code>
            <button onClick={enterRoom} style={{ marginTop: "10px", padding: "10px 16px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, background: "#38bdf8", color: "#082f49" }}>
              Enter Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateParty;
