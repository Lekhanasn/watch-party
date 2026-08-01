// File saved without BOM
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../services/socket";
import api from "../services/api";
import YouTube from "react-youtube";
import { canAccessPremiumVideos, getDownloadLimit, getPlanDetails, getWatchTimeLimitMinutes, normalizePlan } from "../utils/subscriptionPlans";
import { getInitialTheme, getRegionLabel, requiresOtpVerification } from "../utils/themeHelpers";
import { isSafeComment, translateComment } from "../utils/commentModeration";

function WatchRoom() {
  const location = useLocation();
  const navigate = useNavigate();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const roomId = location.state?.roomId || query.get("roomId") || "";
  const name = location.state?.name || query.get("name") || "";
  const initialPlan = location.state?.plan || query.get("plan") || localStorage.getItem("watchPartyPlan") || "free";
  const initialUserId = location.state?.userId || query.get("userId") || localStorage.getItem("watchPartyUserId") || "";

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [loadingLocalMedia, setLoadingLocalMedia] = useState(false);
  const [plan, setPlan] = useState(normalizePlan(initialPlan));
  const [userId, setUserId] = useState(initialUserId);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [downloadLimit, setDownloadLimit] = useState(getDownloadLimit(initialPlan));
  const [theme, setTheme] = useState(() => localStorage.getItem("watchPartyTheme") || getInitialTheme(localStorage.getItem("watchPartyRegion") || "Asia/Kolkata"));
  const [region] = useState(localStorage.getItem("watchPartyRegion") || "Asia/Kolkata");
  const [deviceId, setDeviceId] = useState(localStorage.getItem("watchPartyDeviceId") || "default-device");
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpEmail, setOtpEmail] = useState(localStorage.getItem("watchPartyEmail") || "");
  const [otpSent, setOtpSent] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentLanguage, setCommentLanguage] = useState("en");
  const [comments, setComments] = useState([
    {
      id: 1,
      username: "Ava",
      text: "Great experience!",
      timestamp: "2 min ago",
      location: "Optional",
      likes: 3,
      dislikes: 0,
      reports: 0,
      status: "visible",
    },
  ]);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerRef = useRef(null);
  const isRemoteAction = useRef(false);
  const videoContainerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const peerConnectionsRef = useRef({});
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const normalizedPlan = normalizePlan(plan);
  const planDetails = getPlanDetails(normalizedPlan);
  const watchTimeLimit = getWatchTimeLimitMinutes(normalizedPlan);
  const hasPremiumAccess = canAccessPremiumVideos(normalizedPlan);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!roomId || !name) {
      navigate("/", { replace: true });
      return;
    }

    const id = userId || localStorage.getItem("watchPartyUserId") || `user_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const selectedPlan = normalizePlan(plan || localStorage.getItem("watchPartyPlan") || "free");

    localStorage.setItem("watchPartyUserId", id);
    localStorage.setItem("watchPartyPlan", selectedPlan);
    localStorage.setItem("watchPartyName", name);
    localStorage.setItem("watchPartyRegion", region);
    localStorage.setItem("watchPartyDeviceId", deviceId);

    setUserId(id);
    setPlan(selectedPlan);
    setDownloadLimit(getDownloadLimit(selectedPlan));

    const deviceFingerprint = `${navigator.userAgent.slice(0, 16)}-${Date.now()}`;
    const storedDeviceId = localStorage.getItem("watchPartyDeviceId") || "default-device";
    const storedRegion = localStorage.getItem("watchPartyRegion") || "Asia/Kolkata";
    const nextDeviceId = storedDeviceId || deviceFingerprint;
    setDeviceId(nextDeviceId);
    localStorage.setItem("watchPartyDeviceId", nextDeviceId);

    const requiresVerification = requiresOtpVerification({
      currentDevice: nextDeviceId,
      storedDevice: storedDeviceId,
      currentRegion: region,
      storedRegion,
    });

    setOtpRequired(requiresVerification);
    setOtpVerified(!requiresVerification);
    setTheme(getInitialTheme(region));

    socket.emit("join-room", roomId, name);
    fetchDownloads(id);

    return () => {
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      setRemoteStreams({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, name, navigate]);

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleParticipants = (users) => {
      setParticipants(users);
    };

    const handleVideoShared = (url) => {
      const cleanedUrl = url.trim();
      let id = "";

      if (cleanedUrl.includes("watch?v=")) {
        id = cleanedUrl.split("watch?v=")[1].split("&")[0];
      } else if (cleanedUrl.includes("youtu.be/")) {
        id = cleanedUrl.split("youtu.be/")[1].split("?")[0];
      } else if (cleanedUrl.length === 11) {
        id = cleanedUrl;
      }

      setVideoId(id);
    };

    const handleRemotePlay = () => {
      isRemoteAction.current = true;
      if (playerRef.current) {
        playerRef.current.playVideo();
      }
    };

    const handleRemotePause = () => {
      isRemoteAction.current = true;
      if (playerRef.current) {
        playerRef.current.pauseVideo();
      }
    };

    const handleCallOffer = async ({ from, offer }) => {
      const stream = await ensureLocalStream();
      if (!stream) return;

      const pc = createPeerConnection(from, stream);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call-answer", { to: from, answer });
    };

    const handleCallAnswer = async ({ from, answer }) => {
      const pc = peerConnectionsRef.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(answer);
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      if (!pc) return;
      await pc.addIceCandidate(candidate);
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("participants", handleParticipants);
    socket.on("video-shared", handleVideoShared);
    socket.on("remote-play", handleRemotePlay);
    socket.on("remote-pause", handleRemotePause);
    socket.on("call-offer", handleCallOffer);
    socket.on("call-answer", handleCallAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("participants", handleParticipants);
      socket.off("video-shared", handleVideoShared);
      socket.off("remote-play", handleRemotePlay);
      socket.off("remote-pause", handleRemotePause);
      socket.off("call-offer", handleCallOffer);
      socket.off("call-answer", handleCallAnswer);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [roomId, name]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isInCall || !localStream) {
      return;
    }

    const otherParticipants = participants.filter((user) => user.socketId !== socket.id);

    otherParticipants.forEach((user) => {
      if (!peerConnectionsRef.current[user.socketId]) {
        createOffer(user.socketId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, isInCall, localStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("watchPartyTheme");
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const fallbackTheme = getInitialTheme(localStorage.getItem("watchPartyRegion") || "Asia/Kolkata");
      setTheme(fallbackTheme);
      localStorage.setItem("watchPartyTheme", fallbackTheme);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!videoPlaying) return;

    const timer = window.setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        setDuration(playerRef.current.getDuration() || 0);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [videoPlaying]);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([socketId, stream]) => {
      const video = remoteVideoRefs.current[socketId];
      if (video && video.srcObject !== stream) {
        video.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const ensureLocalStream = async () => {
    if (localStream) {
      return localStream;
    }
    return await initializeMedia();
  };

  const createPeerConnection = (remoteSocketId, stream = localStream) => {
    if (peerConnectionsRef.current[remoteSocketId]) {
      return peerConnectionsRef.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection();

    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => ({
          ...prev,
          [remoteSocketId]: event.streams[0],
        }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setIsInCall(true);
      }

      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[remoteSocketId];
          return next;
        });
      }
    };

    peerConnectionsRef.current[remoteSocketId] = pc;
    return pc;
  };

  const initializeMedia = async () => {
    try {
      setLoadingLocalMedia(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Unable to acquire media:", error);
      alert("Unable to access camera and microphone.");
      return null;
    } finally {
      setLoadingLocalMedia(false);
    }
  };

  const createOffer = async (remoteSocketId) => {
    const stream = await ensureLocalStream();
    if (!stream) {
      return;
    }

    const pc = createPeerConnection(remoteSocketId, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call-offer", { to: remoteSocketId, offer });
  };

  const startCall = async () => {
    const stream = localStream || (await initializeMedia());
    if (!stream) return;

    setIsInCall(true);

    participants
      .filter((user) => user.socketId !== socket.id)
      .forEach((user) => {
        if (!peerConnectionsRef.current[user.socketId]) {
          createOffer(user.socketId);
        }
      });
  };

  const leaveCall = () => {
    Object.values(peerConnectionsRef.current).forEach((pc) => {
      pc.close();
    });

    peerConnectionsRef.current = {};
    setIsInCall(false);
    setRemoteStreams({});

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    socket.emit("leave-room", roomId);
    navigate("/", { replace: true });
  };

  const toggleMute = () => {
    if (!localStream) return;
    const enabled = !isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    if (!localStream) return;
    const enabled = !cameraOn;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setCameraOn(!cameraOn);
  };

  const shareScreen = async () => {
    if (!localStream) {
      alert("Start your camera before sharing the screen.");
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        screenStream.addTrack(audioTracks[0]);
      }

      setLocalStream(screenStream);

      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });
    } catch (error) {
      console.error("Screen share failed:", error);
      alert("Unable to share screen.");
    }
  };

  const startRecording = () => {
    if (!localStream) {
      alert("Start your camera or share screen before recording.");
      return;
    }

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(localStream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      setRecordingUrl(URL.createObjectURL(blob));
      setIsRecording(false);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
  };

  const sendMessage = () => {
    if (message.trim() === "") return;

    const payload = {
      roomId,
      user: name,
      message,
      timestamp: new Date().toISOString(),
    };

    socket.emit("send-message", payload);
    setMessage("");
  };

  const loadVideo = () => {
    if (videoUrl.trim() === "") {
      alert("Please enter a YouTube URL or video ID.");
      return;
    }

    socket.emit("share-video", {
      roomId,
      videoUrl,
    });

    setVideoUrl("");
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration() || 0);
    setLoadingVideo(false);
  };

  const onPlayerStateChange = (event) => {
    if (isRemoteAction.current) {
      isRemoteAction.current = false;
      return;
    }

    if (event.data === 1) {
      setVideoPlaying(true);
      setLoadingVideo(false);
      socket.emit("video-play", roomId);
    } else if (event.data === 2) {
      setVideoPlaying(false);
      socket.emit("video-pause", roomId);
    } else if (event.data === 3) {
      setLoadingVideo(true);
    }
  };

  const playPauseVideo = () => {
    if (!playerRef.current) return;
    if (videoPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const seekVideo = (seconds) => {
    if (!playerRef.current) return;
    const current = playerRef.current.getCurrentTime() || 0;
    playerRef.current.seekTo(Math.max(0, current + seconds), true);
  };

  const setVolumeLevel = (nextValue) => {
    if (!playerRef.current) return;
    playerRef.current.setVolume(nextValue);
    setVolume(nextValue);
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoContainerRef.current.requestFullscreen();
    }
  };

  const formatTime = (value) => {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleGesture = (direction) => {
    if (direction === "forward") {
      seekVideo(10);
    } else {
      seekVideo(-10);
    }
  };

  const handleDoubleTap = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const middle = rect.width / 2;
    if (clickX > middle) {
      handleGesture("forward");
    } else {
      handleGesture("rewind");
    }
  };

  const handleOtpSend = () => {
    if (!otpEmail.trim()) {
      setMessage("Enter an email address to receive the test OTP.");
      return;
    }

    localStorage.setItem("watchPartyEmail", otpEmail);
    setOtpSent(true);
    setMessage(`A test OTP was prepared for ${otpEmail}. Use code 123456.`);
  };

  const handleOtpVerify = () => {
    if (otpCode.trim() === "123456") {
      setOtpVerified(true);
      setOtpRequired(false);
      setMessage("OTP verified. You can continue safely.");
    } else {
      setMessage("Invalid OTP. Please use the test code 123456.");
    }
  };

  const handleCommentSubmit = () => {
    if (!commentDraft.trim()) return;
    const safe = isSafeComment(commentDraft);
    const newComment = {
      id: Date.now(),
      username: name || "Guest",
      text: safe ? commentDraft : "Comment blocked for safety",
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      location: showLocation ? region : "Optional",
      likes: 0,
      dislikes: 0,
      reports: 0,
      status: safe ? "visible" : "blocked",
    };

    setComments((prev) => [newComment, ...prev]);
    setCommentDraft("");
    setMessage(safe ? "Comment posted." : "Comment was blocked because it matched the safety filters.");
  };

  const toggleCommentReaction = (id, type) => {
    setComments((prev) => prev.map((comment) => comment.id === id ? { ...comment, [type]: comment[type] + 1 } : comment));
  };

  const reportComment = (id) => {
    setComments((prev) => prev.map((comment) => {
      if (comment.id !== id) return comment;
      const nextReports = comment.reports + 1;
      return {
        ...comment,
        reports: nextReports,
        status: nextReports >= 1 ? "flagged" : comment.status,
      };
    }));
    setMessage("Comment flagged for review.");
  };

  const fetchDownloads = async (id) => {
    if (!id) {
      return;
    }

    try {
      const response = await api.get(`/downloads`, {
        params: { userId: id },
      });
      setDownloadHistory(response.data.downloads || []);
    } catch (error) {
      console.error("Unable to load download history:", error);
    }
  };

  const downloadSharedVideo = async () => {
    if (!videoId) {
      alert("No video loaded to download.");
      return;
    }

    if (!userId) {
      alert("User ID is missing; please refresh or rejoin the room.");
      return;
    }

    try {
      const payload = {
        userId,
        plan: normalizedPlan,
        videoId,
        videoUrl: videoId ? `https://youtu.be/${videoId}` : "",
        videoTitle: videoId,
      };

      const response = await api.post("/download-video", payload);
      const { fileName, fileContents, download } = response.data;

      const blob = new Blob([fileContents], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      setDownloadStatus(`Downloaded ${download.videoId} successfully.`);
      setDownloadHistory((prev) => [download, ...prev]);
    } catch (error) {
      const message = error.response?.data?.message || "Download failed.";
      setDownloadStatus(message);
    }
  };

  const remoteStreamEntries = Object.entries(remoteStreams);

  const themeStyles = theme === "light"
    ? {
        background: "#f8fafc",
        color: "#0f172a",
        card: "#ffffff",
        border: "#dbe4f0",
        surface: "#f1f5f9",
        muted: "#64748b",
        inputBg: "#ffffff",
        inputText: "#0f172a",
        accent: "#2563eb",
        accentText: "#ffffff",
      }
    : {
        background: "#020617",
        color: "#f8fafc",
        card: "#111827",
        border: "#334155",
        surface: "#0f172a",
        muted: "#94a3b8",
        inputBg: "#0f172a",
        inputText: "#f8fafc",
        accent: "#38bdf8",
        accentText: "#082f49",
      };

  return (
    <div style={{ width: "min(100%, 1200px)", margin: "24px auto", fontFamily: "Inter, Arial, sans-serif", background: themeStyles.background, color: themeStyles.color, padding: "24px", borderRadius: "20px", border: `1px solid ${themeStyles.border}`, boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1>🎬 Watch Party</h1>
          <p style={{ margin: "4px 0" }}>Theme: {theme === "light" ? "Light" : "Dark"} • Region: {getRegionLabel(region)}</p>
        </div>
        <div>
          <button onClick={() => {
            const nextTheme = theme === "light" ? "dark" : "light";
            setTheme(nextTheme);
            localStorage.setItem("watchPartyTheme", nextTheme);
          }} style={{ padding: "8px 12px", marginRight: "8px", borderRadius: "999px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, color: themeStyles.color, cursor: "pointer" }}>
            Toggle {theme === "light" ? "Dark" : "Light"} Theme
          </button>
          <button onClick={() => setShowLocation((prev) => !prev)} style={{ padding: "8px 12px", borderRadius: "999px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, color: themeStyles.color, cursor: "pointer" }}>
            {showLocation ? "Hide" : "Show"} Location
          </button>
        </div>
      </div>
      <h3>Room: {roomId}</h3>
      <h4>Welcome, {name}</h4>

      <hr />

      <div style={{ padding: "14px 16px", borderRadius: "14px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, marginTop: "8px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "8px" }}>👥 Participants</h3>
        <ul style={{ margin: 0, paddingLeft: "18px", display: "grid", gap: "6px" }}>
          {participants.map((user) => (
            <li key={user.socketId} style={{ color: themeStyles.color }}>
              {user.socketId === socket.id ? "🟢 You" : "🟠 Guest"} {user.name}
            </li>
          ))}
        </ul>
      </div>

      <hr />

      <h3>💬 Chat</h3>
      <div
        style={{
          height: "260px",
          border: `1px solid ${themeStyles.border}`,
          borderRadius: "14px",
          overflowY: "auto",
          padding: "12px",
          background: themeStyles.card,
          boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.08)",
        }}
      >
        {messages.map((msg, index) => {
          const isOwnMessage = msg.user === name;
          return (
            <div key={index} style={{ display: "flex", justifyContent: isOwnMessage ? "flex-end" : "flex-start", marginBottom: "8px" }}>
              <div style={{ maxWidth: "80%", padding: "10px 12px", borderRadius: "14px", background: isOwnMessage ? themeStyles.accent : themeStyles.surface, color: isOwnMessage ? themeStyles.accentText : themeStyles.color }}>
                <div style={{ fontSize: "12px", opacity: 0.75, marginBottom: "2px" }}>{msg.user}</div>
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.message}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${themeStyles.border}`, background: themeStyles.inputBg, color: themeStyles.inputText }}
        />
        <button onClick={sendMessage} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: themeStyles.accent, color: themeStyles.accentText, cursor: "pointer" }}>
          Send
        </button>
      </div>

      <hr />

      <h3>🎥 Watch Together</h3>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Paste YouTube URL or video ID"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", minWidth: "260px", borderRadius: "10px", border: `1px solid ${themeStyles.border}`, background: themeStyles.inputBg, color: themeStyles.inputText }}
        />
        <button onClick={loadVideo} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: themeStyles.accent, color: themeStyles.accentText, cursor: "pointer" }}>
          Load Video
        </button>
      </div>

      {otpRequired && !otpVerified && (
        <div style={{ marginTop: "12px", padding: "12px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, color: themeStyles.color, borderRadius: "10px" }}>
          <h4>Extra security check</h4>
          <p>We detected a new device or region. Enter your email and request the test OTP to continue.</p>
          <input value={otpEmail} onChange={(event) => setOtpEmail(event.target.value)} placeholder="Email address" style={{ padding: "8px 10px", marginRight: "8px", marginBottom: "8px", borderRadius: "10px", border: `1px solid ${themeStyles.border}`, background: themeStyles.inputBg, color: themeStyles.inputText }} />
          <button onClick={handleOtpSend} style={{ marginRight: "8px", padding: "8px 12px", borderRadius: "10px", border: "none", background: themeStyles.accent, color: themeStyles.accentText, cursor: "pointer" }}>Send OTP</button>
          <input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} placeholder="Enter OTP" style={{ padding: "8px 10px", marginRight: "8px", borderRadius: "10px", border: `1px solid ${themeStyles.border}`, background: themeStyles.inputBg, color: themeStyles.inputText }} />
          <button onClick={handleOtpVerify} style={{ padding: "8px 12px", borderRadius: "10px", border: "none", background: themeStyles.accent, color: themeStyles.accentText, cursor: "pointer" }}>Verify</button>
          {otpSent && <p style={{ marginTop: "8px", color: themeStyles.muted }}>OTP sent to {otpEmail} (demo mode: 123456)</p>}
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
        <div style={{ flex: "1 1 300px" }}>
          <h3>📹 Call Controls</h3>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            <button
              onClick={initializeMedia}
              disabled={!!localStream || loadingLocalMedia}
              style={{ margin: "0", padding: "8px 12px", borderRadius: "999px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, color: themeStyles.color, cursor: "pointer" }}
            >
              {loadingLocalMedia ? "Starting..." : "Start Camera"}
            </button>
            <button
              onClick={shareScreen}
              disabled={!localStream}
              style={{ margin: "0", padding: "8px 12px", borderRadius: "999px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, color: themeStyles.color, cursor: "pointer" }}
            >
              Share Screen
            </button>
            <button
              onClick={toggleMute}
              disabled={!localStream}
              style={{ margin: "0", padding: "8px 12px", borderRadius: "999px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, color: themeStyles.color, cursor: "pointer" }}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={toggleCamera}
              disabled={!localStream}
              style={{ margin: "0", padding: "8px 12px", borderRadius: "999px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, color: themeStyles.color, cursor: "pointer" }}
            >
              {cameraOn ? "Camera Off" : "Camera On"}
            </button>
            <button
              onClick={startCall}
              disabled={isInCall}
              style={{ margin: "0", padding: "8px 12px", borderRadius: "999px", border: "none", background: themeStyles.accent, color: themeStyles.accentText, cursor: "pointer" }}
            >
              Join Call
            </button>
            <button onClick={leaveCall} style={{ margin: "0", padding: "8px 12px", borderRadius: "999px", border: "none", background: "#dc2626", color: "#fff", cursor: "pointer" }}>
              Leave Party
            </button>
          </div>

          <div style={{ marginTop: "18px", padding: "12px", borderRadius: "12px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card }}>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!localStream}
              style={{ padding: "8px 12px", borderRadius: "999px", border: "none", background: themeStyles.accent, color: themeStyles.accentText, cursor: "pointer" }}
            >
              {isRecording ? "Stop Recording" : "Record Session"}
            </button>
            {recordingUrl && (
              <div style={{ marginTop: "10px" }}>
                <a href={recordingUrl} download="watch-party-recording.webm" style={{ color: themeStyles.accent }}>
                  Download Recording
                </a>
              </div>
            )}
          </div>

          <div style={{ marginTop: "16px" }}>
            <button onClick={() => navigate("/profile")} style={{ padding: "10px 16px", borderRadius: "999px", border: "none", background: themeStyles.accent, color: themeStyles.accentText, cursor: "pointer" }}>
              View Profile
            </button>
          </div>
        </div>

        <div style={{ flex: "2 1 540px", minWidth: "320px" }}>
          {videoId ? (
            <div ref={videoContainerRef} onDoubleClick={handleDoubleTap} style={{ border: `1px solid ${themeStyles.border}`, borderRadius: "10px", padding: "8px", background: themeStyles.card }}>
              <YouTube
                key={videoId}
                videoId={videoId}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
                opts={{
                  width: "100%",
                  height: "400",
                  playerVars: {
                    autoplay: 0,
                  },
                }}
              />
              <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={playPauseVideo}>{videoPlaying ? "Pause" : "Play"}</button>
                <button onClick={() => seekVideo(-10)}>⏪ 10s</button>
                <button onClick={() => seekVideo(10)}>⏩ 10s</button>
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  🔊
                  <input type="range" min="0" max="100" value={volume} onChange={(event) => setVolumeLevel(Number(event.target.value))} />
                </label>
                <button onClick={toggleFullscreen}>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</button>
                <span>{loadingVideo ? "Loading..." : videoPlaying ? "Playing" : "Paused"}</span>
                <span>Current: {formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <div style={{ marginTop: "6px", fontSize: "12px", opacity: 0.8 }}>
                Tip: double-tap the player to skip forward or rewind by 10 seconds on mobile.
              </div>
              <div style={{ marginTop: "8px" }}>
                <button onClick={() => setVideoId("")}>Next Video</button>
              </div>
            </div>
          ) : (
            <div
              style={{
                minHeight: "400px",
                border: `1px solid ${themeStyles.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme === "light" ? "#666" : "#ccc",
                background: themeStyles.card,
              }}
            >
              Waiting for a shared YouTube video...
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
        <div style={{ minWidth: "320px", padding: "12px", borderRadius: "14px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card }}>
          <h4 style={{ marginTop: 0 }}>Local Video</h4>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", borderRadius: "10px", border: `1px solid ${themeStyles.border}` }}
          />
        </div>

        {remoteStreamEntries.map(([socketId, stream]) => (
          <div key={socketId} style={{ minWidth: "320px", padding: "12px", borderRadius: "14px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card }}>
            <h4 style={{ marginTop: 0 }}>Remote Video</h4>
            <video
              ref={(element) => {
                if (element) {
                  remoteVideoRefs.current[socketId] = element;
                }
              }}
              autoPlay
              playsInline
              style={{ width: "100%", borderRadius: "10px", border: `1px solid ${themeStyles.border}` }}
            />
          </div>
        ))}
      </div>

      <hr />

      <div style={{ marginTop: "20px", padding: "15px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, borderRadius: "16px" }}>
        <h3>💬 Comments</h3>
        <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${themeStyles.border}`, background: themeStyles.inputBg, color: themeStyles.inputText }} placeholder="Write a comment in your language" />
        <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
          <select value={commentLanguage} onChange={(event) => setCommentLanguage(event.target.value)} style={{ padding: "8px 10px", borderRadius: "10px", border: `1px solid ${themeStyles.border}`, background: themeStyles.inputBg, color: themeStyles.inputText }}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
          </select>
          <button onClick={handleCommentSubmit} style={{ padding: "8px 12px", borderRadius: "10px", border: "none", background: themeStyles.accent, color: themeStyles.accentText, cursor: "pointer" }}>Post Comment</button>
        </div>
        <div style={{ marginTop: "12px" }}>
          {comments.map((comment) => {
            const translatedText = translateComment(comment.text, commentLanguage);
            return (
              <div key={comment.id} style={{ borderTop: `1px solid ${themeStyles.border}`, padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <strong>{comment.username}</strong>
                  <span>{comment.timestamp}</span>
                </div>
                <p style={{ margin: "6px 0" }}>{translatedText}</p>
                {showLocation && <p style={{ fontSize: "12px", opacity: 0.7 }}>{getRegionLabel(region)}</p>}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => toggleCommentReaction(comment.id, "likes")}>👍 {comment.likes}</button>
                  <button onClick={() => toggleCommentReaction(comment.id, "dislikes")}>👎 {comment.dislikes}</button>
                  <button onClick={() => reportComment(comment.id)}>Report</button>
                </div>
                {comment.status === "flagged" && <p style={{ color: "#f59e0b" }}>Reported for review</p>}
                {comment.status === "blocked" && <p style={{ color: "#dc2626" }}>Blocked for safety</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: "20px", padding: "15px", border: `1px solid ${themeStyles.border}`, background: themeStyles.card, borderRadius: "16px" }}>
        <h3>📥 Downloads</h3>
        <p>
          Plan: <strong>{planDetails.name}</strong> | Daily limit: <strong>{downloadLimit}</strong> | Watch time: <strong>{watchTimeLimit} min</strong>
        </p>
        {!hasPremiumAccess && (
          <p style={{ color: "#b45309" }}>Upgrade to unlock premium videos, longer watch sessions, and richer download limits.</p>
        )}
        <button onClick={downloadSharedVideo} disabled={!videoId} style={{ marginBottom: "10px" }}>
          Download Shared Video
        </button>
        {downloadStatus && <p style={{ color: downloadStatus.includes("failed") ? "red" : "green" }}>{downloadStatus}</p>}

        <h4>Download History</h4>
        {downloadHistory.length === 0 ? (
          <p>No downloads yet.</p>
        ) : (
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Date</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Video</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Plan</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {downloadHistory.map((item, index) => (
                  <tr key={index}>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{new Date(item.downloadDate).toLocaleString()}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.videoTitle}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.plan}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{item.dailyCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default WatchRoom;
