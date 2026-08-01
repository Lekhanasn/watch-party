// Watch Party join page
// File saved without BOM
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function JoinParty() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [userId, setUserId] = useState(() => localStorage.getItem("watchPartyUserId") || "");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const queryRoom = searchParams.get("roomId");
    if (queryRoom) {
      setRoomId(queryRoom.toUpperCase());
    }
  }, [searchParams]);

  const ensureUserId = () => {
    if (userId) {
      return userId;
    }

    const id = `user_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    localStorage.setItem("watchPartyUserId", id);
    setUserId(id);
    return id;
  };

  const joinRoom = () => {
    const trimmedRoom = roomId.trim().toUpperCase();
    const trimmedName = name.trim();

    if (trimmedRoom === "" || trimmedName === "") {
      alert("Please fill all fields");
      return;
    }

    const id = ensureUserId();
    localStorage.setItem("watchPartyPlan", plan);
    localStorage.setItem("watchPartyName", trimmedName);

    navigate(`/room?roomId=${trimmedRoom}&name=${encodeURIComponent(trimmedName)}&plan=${plan}&userId=${id}`, {
      state: {
        roomId: trimmedRoom,
        name: trimmedName,
        plan,
        userId: id,
      },
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "760px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "24px", padding: "32px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <h1 style={{ marginTop: 0, marginBottom: "8px" }}>Join Watch Party</h1>
        <p style={{ marginTop: 0, fontSize: "16px", opacity: 0.95 }}>Enter the room ID and your display name to join.</p>

        <div style={{ display: "grid", gap: "14px", marginTop: "20px" }}>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.9)", color: "#0f172a" }}
          />

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

          <button onClick={joinRoom} style={{ padding: "12px 18px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, background: "#38bdf8", color: "#082f49" }}>
            Join Party
          </button>
        </div>
      </div>
    </div>
  );
}

export default JoinParty;
