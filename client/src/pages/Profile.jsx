import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getInitialTheme } from "../utils/themeHelpers";
import { getPlanDetails, getPlanOptions, normalizePlan } from "../utils/subscriptionPlans";

function Profile() {
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState("free");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState(() => getInitialTheme(localStorage.getItem("watchPartyRegion") || "Asia/Kolkata"));
  const navigate = useNavigate();

  const currentPlanDetails = getPlanDetails(plan);

  useEffect(() => {
    const storedUserId = localStorage.getItem("watchPartyUserId");
    const storedPlan = localStorage.getItem("watchPartyPlan") || "free";
    const storedName = localStorage.getItem("watchPartyName") || "";
    const storedEmail = localStorage.getItem("watchPartyEmail") || "";
    const storedTheme = localStorage.getItem("watchPartyTheme") || getInitialTheme(localStorage.getItem("watchPartyRegion") || "Asia/Kolkata");

    setUserId(storedUserId || "");
    setPlan(normalizePlan(storedPlan));
    setName(storedName);
    setEmail(storedEmail);
    setTheme(storedTheme);

    api
      .get("/plans")
      .then((response) => {
        setPlans(response.data.plans || []);
      })
      .catch((error) => {
        console.error("Unable to load subscription plans", error);
      });

    if (storedUserId) {
      setLoading(true);
      api
        .get("/downloads", { params: { userId: storedUserId } })
        .then((response) => {
          setDownloadHistory(response.data.downloads || []);
        })
        .catch((error) => {
          console.error("Unable to load downloads", error);
        })
        .finally(() => setLoading(false));

      api
        .get("/subscriptions", { params: { userId: storedUserId } })
        .then((response) => {
          const subscriptionPlan = normalizePlan(response.data.subscription?.plan || storedPlan);
          setPlan(subscriptionPlan);
          localStorage.setItem("watchPartyPlan", subscriptionPlan);
        })
        .catch((error) => {
          console.error("Unable to load subscription", error);
        });
    }
  }, []);

  const planOptions = plans.length ? plans : getPlanOptions();

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.body.appendChild(script);
    });

  const handleUpgrade = async (selectedPlan) => {
    if (!userId) {
      setMessage("Create or join a room first so your subscription can be saved.");
      return;
    }

    setUpgrading(true);
    setMessage("");

    try {
      const checkoutResponse = await api.post("/subscription/checkout", {
        userId,
        plan: selectedPlan,
        name,
        email,
      });

      const { order, amount } = checkoutResponse.data;

      const disableRazorpay = process.env.REACT_APP_DISABLE_RAZORPAY === "true";
      let paymentResult = null;

      if (disableRazorpay) {
        console.info("Razorpay checkout disabled by configuration. Using demo payment.");
        setMessage("Razorpay checkout is disabled. Simulating local payment.");
        paymentResult = { paymentId: `test-payment-${Date.now()}` };
      } else {
        await loadRazorpayScript();

        if (window.Razorpay) {
          try {
            paymentResult = await new Promise((resolve, reject) => {
              const options = {
                key: order.key,
                amount: order.amount,
                currency: order.currency,
                name: "Watch Party",
                description: `Upgrade to ${getPlanDetails(selectedPlan).name}`,
                order_id: order.id,
                handler: (response) => resolve(response),
                prefill: {
                  name: name || "Guest",
                  email: email || "guest@example.com",
                },
                theme: {
                  color: "#2563eb",
                },
                modal: {
                  ondismiss: () => reject(new Error("Payment cancelled")),
                },
              };

              const rzp = new window.Razorpay(options);
              rzp.open();
            });
          } catch (err) {
            console.warn("Razorpay flow failed or was dismissed; falling back to demo payment.", err);
            if (window.confirm("Razorpay payment failed or was cancelled. Continue with demo payment?")) {
              paymentResult = { paymentId: `test-payment-${Date.now()}` };
              setMessage("Payment was not completed. Continuing with a simulated payment.");
            } else {
              setMessage("Payment cancelled. Upgrade aborted.");
              setUpgrading(false);
              return;
            }
          }
        } else {
          console.warn("Razorpay checkout script failed to load; falling back to test payment.");
          if (window.confirm("Razorpay checkout is unavailable. Continue with demo payment?")) {
            paymentResult = { paymentId: `test-payment-${Date.now()}` };
            setMessage("Razorpay checkout is unavailable; using demo payment.");
          } else {
            setMessage("Demo payment cancelled. Upgrade aborted.");
            setUpgrading(false);
            return;
          }
        }
      }

      const upgradeResponse = await api.post("/subscription/upgrade", {
        userId,
        plan: selectedPlan,
        name,
        email,
        paymentId: paymentResult.razorpay_payment_id || paymentResult.paymentId,
        orderId: order.id,
        amount,
      });

      const updatedPlan = normalizePlan(upgradeResponse.data.subscription?.plan || selectedPlan);
      localStorage.setItem("watchPartyPlan", updatedPlan);
      localStorage.setItem("watchPartyEmail", email);
      setPlan(updatedPlan);
      setMessage(upgradeResponse.data.message || `Your plan was upgraded to ${getPlanDetails(updatedPlan).name}.`);
    } catch (error) {
      console.error("Unable to complete upgrade", error);
      setMessage(error.message || "Unable to complete upgrade right now.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "#fff", padding: "24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gap: "18px" }}>
        <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "24px", padding: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
          <h1 style={{ marginTop: 0, marginBottom: "8px" }}>User Profile</h1>
          {!userId ? (
            <div>
              <p>No profile found yet. Join or create a watch party first.</p>
              <button onClick={() => navigate("/")} style={{ padding: "10px 16px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, background: "#38bdf8", color: "#082f49" }}>
                Go Home
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.16)" }}>
                <p><strong>User:</strong> {name || "Guest"}</p>
                <p><strong>Plan:</strong> {currentPlanDetails.name}</p>
                <p><strong>Benefits:</strong> {currentPlanDetails.features.join(" • ")}</p>
                <p><strong>User ID:</strong> {userId}</p>
              </div>

              <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.16)" }}>
                <h2 style={{ marginTop: 0 }}>Theme Preference</h2>
                <label style={{ display: "block", marginBottom: "8px" }}>
                  Preferred theme
                  <select
                    value={theme}
                    onChange={(event) => {
                      const nextTheme = event.target.value;
                      setTheme(nextTheme);
                      localStorage.setItem("watchPartyTheme", nextTheme);
                      setMessage(`Theme saved as ${nextTheme}.`);
                    }}
                    style={{ display: "block", width: "220px", padding: "10px 12px", marginTop: "6px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.95)", color: "#0f172a" }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
              </div>

              <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.16)" }}>
                <h2 style={{ marginTop: 0 }}>Upgrade Your Plan</h2>
                <label style={{ display: "block", marginBottom: "8px" }}>
                  Email for invoice
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    style={{ display: "block", width: "280px", padding: "10px 12px", marginTop: "6px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.95)", color: "#0f172a" }}
                  />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  {planOptions.map((planOption) => {
                    const details = getPlanDetails(planOption.value);
                    const isCurrent = plan === planOption.value;
                    return (
                      <div key={planOption.value} style={{ border: "1px solid rgba(255,255,255,0.22)", borderRadius: "14px", padding: "14px", background: isCurrent ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.12)" }}>
                        <h3>{details.name}</h3>
                        <p style={{ fontSize: "24px", margin: "4px 0" }}>₹{details.price}</p>
                        <ul style={{ paddingLeft: "18px", margin: "8px 0" }}>
                          {details.features.map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>
                        <button onClick={() => handleUpgrade(planOption.value)} disabled={upgrading || isCurrent} style={{ padding: "10px 14px", width: "100%", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, background: isCurrent ? "#cbd5e1" : "#fbbf24", color: "#111827" }}>
                          {isCurrent ? "Current Plan" : upgrading ? "Processing..." : `Upgrade to ${details.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {message && <p style={{ marginTop: "12px", color: message.includes("Unable") ? "#fecaca" : "#d1fae5" }}>{message}</p>}
              </div>

              <div style={{ marginBottom: "20px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.16)" }}>
                <h2 style={{ marginTop: 0 }}>Downloads</h2>
                {loading ? (
                  <p>Loading downloads...</p>
                ) : downloadHistory.length === 0 ? (
                  <p>No downloads yet.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "8px" }}>Date</th>
                          <th style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "8px" }}>Video</th>
                          <th style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "8px" }}>Plan</th>
                          <th style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "8px" }}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {downloadHistory.map((item, index) => (
                          <tr key={index}>
                            <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "8px" }}>{new Date(item.downloadDate).toLocaleString()}</td>
                            <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "8px" }}>{item.videoTitle || item.videoId}</td>
                            <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "8px" }}>{item.plan}</td>
                            <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "8px" }}>{item.dailyCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button onClick={() => navigate("/")} style={{ padding: "10px 16px", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, background: "#fbbf24", color: "#111827" }}>
                Back to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
