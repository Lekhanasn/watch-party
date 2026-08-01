const express = require("express");
const cors = require("cors");
const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const PORT = 5000;
const DATA_DIR = path.join(__dirname, "data");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
const INVOICES_DIR = path.join(DATA_DIR, "invoices");

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify({ subscriptions: {} }, null, 2));
}

// Create HTTP server
const server = http.createServer(app);

// Store participants in each room
const rooms = {};
const downloadHistory = {};
let subscriptions = loadSubscriptions();

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
    ],
    methods: ["GET", "POST"],
  },
});

const planCatalog = {
  free: {
    key: "free",
    name: "Free",
    price: 0,
    downloadLimit: 1,
    watchTimeLimitMinutes: 60,
    canAccessPremiumVideos: false,
    canDownload: true,
    adFree: false,
    features: ["Limited video access", "1 download per day", "Standard viewing"],
  },
  bronze: {
    key: "bronze",
    name: "Bronze",
    price: 499,
    downloadLimit: 3,
    watchTimeLimitMinutes: 180,
    canAccessPremiumVideos: true,
    canDownload: true,
    adFree: false,
    features: ["Premium video access", "3 downloads per day", "Extended watch time"],
  },
  silver: {
    key: "silver",
    name: "Silver",
    price: 799,
    downloadLimit: 5,
    watchTimeLimitMinutes: 300,
    canAccessPremiumVideos: true,
    canDownload: true,
    adFree: false,
    features: ["Premium video access", "5 downloads per day", "Longer watch sessions"],
  },
  gold: {
    key: "gold",
    name: "Gold",
    price: 1299,
    downloadLimit: 10,
    watchTimeLimitMinutes: 480,
    canAccessPremiumVideos: true,
    canDownload: true,
    adFree: true,
    features: ["Premium video access", "10 downloads per day", "Ad-free viewing", "Extended watch time"],
  },
};

function normalizePlan(plan) {
  if (!plan) return "free";
  const normalized = `${plan}`.trim().toLowerCase();
  return normalized in planCatalog ? normalized : "free";
}

function getPlanDetails(plan) {
  return planCatalog[normalizePlan(plan)] || planCatalog.free;
}

function loadSubscriptions() {
  try {
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.subscriptions || {};
  } catch (error) {
    return {};
  }
}

function saveSubscriptions() {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify({ subscriptions }, null, 2));
}

function buildInvoice(subscription) {
  const invoiceId = `INV-${Date.now()}`;
  const content = [
    "Watch Party Subscription Invoice",
    `Invoice ID: ${invoiceId}`,
    `Customer: ${subscription.name || subscription.userId}`,
    `Email: ${subscription.email || "n/a"}`,
    `Plan: ${subscription.plan}`,
    `Amount: ₹${subscription.amount}`,
    `Payment ID: ${subscription.paymentId}`,
    `Order ID: ${subscription.orderId}`,
    `Status: ${subscription.status}`,
    `Issued At: ${subscription.startedAt}`,
    "",
    "Thank you for upgrading your Watch Party plan.",
  ].join("\n");

  const filePath = path.join(INVOICES_DIR, `${subscription.userId}-${invoiceId}.txt`);
  fs.writeFileSync(filePath, content);

  return { invoiceId, filePath, content };
}

function sendConfirmationEmail(subscription, invoice) {
  console.log(`[EMAIL] Confirmation email queued for ${subscription.email || subscription.userId}`);
  console.log(`[EMAIL] Plan: ${subscription.plan}`);
  console.log(`[EMAIL] Invoice: ${invoice.filePath}`);
  return true;
}

// --------------------
// API Routes
// --------------------

app.get("/", (req, res) => {
  res.send("Watch Party Server is Running...");
});

app.get("/create-room", (req, res) => {
  const roomId = Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase();

  res.json({ roomId });
});

app.get("/plans", (req, res) => {
  const plans = Object.values(planCatalog).map((plan) => ({
    value: plan.key,
    label: plan.name,
    price: plan.price,
    features: plan.features,
  }));

  res.json({ plans });
});

app.get("/subscriptions", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId query parameter." });
  }

  const subscription = subscriptions[userId] || null;
  res.json({
    subscription: subscription
      ? {
          ...subscription,
          plan: normalizePlan(subscription.plan),
        }
      : {
          userId,
          plan: "free",
          status: "active",
        },
  });
});

app.post("/subscription/checkout", (req, res) => {
  const { userId, plan, name, email } = req.body;
  const selectedPlan = normalizePlan(plan);
  const planDetails = getPlanDetails(selectedPlan);

  if (!userId) {
    return res.status(400).json({ message: "A user ID is required to start checkout." });
  }

  const order = {
    id: `order_${Date.now()}`,
    amount: planDetails.price * 100,
    currency: "INR",
    receipt: `${userId}-${Date.now()}`,
    key: process.env.RAZORPAY_KEY_ID || "rzp_test_demo_key",
  };

  res.json({
    order,
    amount: planDetails.price,
    currency: "INR",
    plan: selectedPlan,
    testMode: true,
    message: `Test checkout prepared for ${planDetails.name} plan.`,
    customer: { name, email },
  });
});

app.post("/subscription/upgrade", (req, res) => {
  const { userId, plan, name, email, paymentId, orderId, amount, gateway = "razorpay-test" } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "A user ID is required to upgrade the plan." });
  }

  const normalizedPlan = normalizePlan(plan);
  const planDetails = getPlanDetails(normalizedPlan);
  const now = new Date().toISOString();

  const subscription = {
    userId,
    name: name || userId,
    email: email || "",
    plan: normalizedPlan,
    status: "active",
    amount: Number(amount || planDetails.price),
    paymentId: paymentId || `test-payment-${Date.now()}`,
    orderId: orderId || `order-${Date.now()}`,
    gateway,
    startedAt: now,
    updatedAt: now,
  };

  subscriptions[userId] = subscription;
  saveSubscriptions();

  const invoice = buildInvoice(subscription);
  sendConfirmationEmail(subscription, invoice);

  res.json({
    success: true,
    subscription,
    invoice,
    invoicePath: path.relative(__dirname, invoice.filePath),
    message: `Your plan was upgraded to ${planDetails.name}. A confirmation invoice was generated.`,
  });
});

app.post("/download-video", (req, res) => {
  const { userId, plan, videoId, videoUrl, videoTitle } = req.body;

  if (!userId || !plan || !videoId) {
    return res.status(400).json({ message: "Missing required download metadata." });
  }

  const normalizedPlan = normalizePlan(plan);
  const planDetails = getPlanDetails(normalizedPlan);
  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];
  const userHistory = downloadHistory[userId] || [];
  const todaysDownloads = userHistory.filter((item) => item.downloadDate.startsWith(todayKey));

  if (todaysDownloads.length >= planDetails.downloadLimit) {
    return res.status(403).json({
      message: planDetails.downloadLimit > 1
        ? `You have reached your daily ${planDetails.name.toLowerCase()} download limit.`
        : "Free users can download only one video per day.",
    });
  }

  const downloadRecord = {
    userId,
    plan: normalizedPlan,
    videoId,
    videoUrl,
    videoTitle,
    downloadDate: now.toISOString(),
    dailyCount: todaysDownloads.length + 1,
  };

  downloadHistory[userId] = [downloadRecord, ...userHistory];

  const fakeFileContents = `Downloaded video: ${videoTitle} (${videoUrl})\nDownloaded by: ${userId}\nPlan: ${normalizedPlan}\nDate: ${downloadRecord.downloadDate}`;
  const fileName = `${videoTitle || videoId}-watch-party-download.txt`;

  res.json({
    fileName,
    fileContents: fakeFileContents,
    download: downloadRecord,
  });
});

app.get("/downloads", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId query parameter." });
  }

  res.json({ downloads: downloadHistory[userId] || [] });
});

// --------------------
// Socket.IO
// --------------------

io.on("connection", (socket) => {
  console.log("================================");
  console.log("User Connected:", socket.id);
  console.log("================================");

  // --------------------
  // Join Room
  // --------------------
  socket.on("join-room", (roomId, userName) => {
    socket.join(roomId);

    socket.roomId = roomId;
    socket.userName = userName;

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    if (!rooms[roomId].some((user) => user.socketId === socket.id)) {
      rooms[roomId].push({ socketId: socket.id, name: userName });
    }

    console.log(`${userName} joined room ${roomId}`);

    io.to(roomId).emit("participants", rooms[roomId]);
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      name: userName,
    });
  });

  // --------------------
  // Chat
  // --------------------
  socket.on("send-message", (data) => {
    console.log("Chat:", data);

    io.to(data.roomId).emit("receive-message", data);
  });

  // --------------------
  // Share Video
  // --------------------
  socket.on("share-video", (data) => {
    console.log("================================");
    console.log("VIDEO SHARED");
    console.log("Room :", data.roomId);
    console.log("URL  :", data.videoUrl);
    console.log("================================");

    io.to(data.roomId).emit("video-shared", data.videoUrl);
  });

  // --------------------
  // Play Video
  // --------------------
  socket.on("video-play", (roomId) => {
    console.log("▶ Video Play :", roomId);

    socket.to(roomId).emit("remote-play");
  });

  // --------------------
  // Pause Video
  // --------------------
  socket.on("video-pause", (roomId) => {
    console.log("⏸ Video Pause :", roomId);

    socket.to(roomId).emit("remote-pause");
  });

  // --------------------
  // Video Call Signaling
  // --------------------
  socket.on("call-offer", ({ to, offer }) => {
    io.to(to).emit("call-offer", {
      from: socket.id,
      name: socket.userName,
      offer,
    });
  });

  socket.on("call-answer", ({ to, answer }) => {
    io.to(to).emit("call-answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("leave-room", (roomId) => {
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId] = rooms[roomId].filter((user) => user.socketId !== socket.id);

    io.to(roomId).emit("participants", rooms[roomId]);
    socket.to(roomId).emit("user-left", { socketId: socket.id });
    socket.leave(roomId);
  });

  // --------------------
  // Disconnect
  // --------------------
  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    const userName = socket.userName;

    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((user) => user.socketId !== socket.id);

      io.to(roomId).emit("participants", rooms[roomId]);
      socket.to(roomId).emit("user-left", { socketId: socket.id });

      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }

    console.log("User Disconnected:", socket.id);
  });
});

function findAvailablePort(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;

    const tryPort = () => {
      if (currentPort >= startPort + maxAttempts) {
        reject(new Error(`No available port found between ${startPort} and ${startPort + maxAttempts - 1}`));
        return;
      }

      const tester = net.createServer();

      tester.once("error", (err) => {
        tester.close();

        if (err.code === "EADDRINUSE") {
          currentPort += 1;
          tryPort();
        } else {
          reject(err);
        }
      });

      tester.once("listening", () => {
        tester.close(() => resolve(currentPort));
      });

      tester.listen(currentPort, "127.0.0.1");
    };

    tryPort();
  });
}

async function startServer(port) {
  const forceFixed = String(process.env.FORCE_FIXED_PORT || process.env.FIXED_PORT || "").toLowerCase() === "true";
  const initialPort = Number(port || 5000);

  if (forceFixed) {
    server.listen(initialPort, () => {
      console.log(`Server is running on port ${initialPort}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${initialPort} is already in use and FORCE_FIXED_PORT is set. Exiting.`);
        process.exit(1);
      }

      console.error("Server failed to start:", error);
      process.exit(1);
    });

    return;
  }

  try {
    const availablePort = await findAvailablePort(initialPort, 10);
    server.listen(availablePort, () => {
      console.log(`Server is running on port ${availablePort}`);
    });
  } catch (error) {
    console.error("Failed to find an available port for the server:", error);
    process.exit(1);
  }
}

startServer(Number(process.env.PORT || 5000));