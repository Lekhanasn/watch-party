import { io } from "socket.io-client";

const configuredSocketUrl = process.env.REACT_APP_SOCKET_URL?.trim();
const candidateSocketUrls = [
  configuredSocketUrl,
  "http://localhost:5000",
  "http://localhost:5001",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5001",
].filter(Boolean);

let socket = null;

const createSocket = (url) => io(url, {
  reconnection: false,
  transports: ["websocket", "polling"],
});

const connectWithFallback = (index = 0) => {
  const targetUrl = candidateSocketUrls[index];
  if (!targetUrl) {
    return createSocket(candidateSocketUrls[0]);
  }

  const instance = createSocket(targetUrl);

  instance.on("connect_error", () => {
    const nextIndex = index + 1;
    if (candidateSocketUrls[nextIndex]) {
      instance.close();
      socket = connectWithFallback(nextIndex);
    }
  });

  return instance;
};

socket = connectWithFallback();

export default socket;