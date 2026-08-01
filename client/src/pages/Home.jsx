import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "980px", width: "100%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "24px", padding: "32px", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 320px" }}>
            <p style={{ margin: 0, letterSpacing: "0.25em", textTransform: "uppercase", fontSize: "12px", opacity: 0.8 }}>Premium watch experience</p>
            <h1 style={{ fontSize: "44px", margin: "8px 0", lineHeight: 1.1 }}>🎬 Watch Party</h1>
            <h2 style={{ fontSize: "28px", margin: "0 0 8px", lineHeight: 1.2 }}>Movies, live chats, and shared playback</h2>
            <p style={{ fontSize: "18px", lineHeight: 1.6, opacity: 0.95 }}>
              Create a room, invite friends, stream together, and enjoy synced playback with plans, downloads, and comment moderation built in.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
              <button onClick={() => navigate("/create")} style={{ padding: "12px 18px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700 }}>
                Create Party
              </button>
              <button onClick={() => navigate("/join")} style={{ padding: "12px 18px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                Join Party
              </button>
              <button onClick={() => navigate("/profile")} style={{ padding: "12px 18px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                Profile
              </button>
            </div>
          </div>
          <div style={{ flex: "1 1 320px", background: "rgba(255,255,255,0.16)", borderRadius: "18px", padding: "20px" }}>
            <h3 style={{ marginTop: 0 }}>Why people love it</h3>
            <ul style={{ paddingLeft: "18px", lineHeight: 1.8 }}>
              <li>Real-time chat and synced video controls</li>
              <li>Flexible plans from Free to Gold</li>
              <li>Safe comments, downloads, and profile themes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;