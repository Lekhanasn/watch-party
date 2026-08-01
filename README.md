# 🎬 Watch Party - Real-Time Video Streaming Platform

A full-stack web application that enables users to watch videos together in real time with synchronized playback, live chat, and interactive features. The platform also supports subscription plans, controlled downloads, multilingual comments, and personalized user experience.

---

## 🚀 Live Demo

**Frontend (Vercel):**
https://watch-party-puce-seven.vercel.app

**Backend (Render):**
https://watch-party-backend-pwrb.onrender.com

---

## 📂 GitHub Repository

https://github.com/Lekhanasn/watch-party

---

# 📌 Features

### 🎥 Watch Party
- Create and join watch party rooms
- Real-time synchronized video playback
- Live participant management
- Video calling support
- Screen sharing support
- Session recording (optional)
- Mute/Unmute microphone
- Camera On/Off
- Leave call functionality

### 💬 Live Chat
- Real-time messaging using Socket.IO
- Participant communication during watch sessions

### 📥 Video Downloads
- Free users can download one video per day
- Premium users can download multiple videos
- Download history stored in user profile
- Download restrictions for free users

### 💳 Subscription Plans
- Free
- Bronze
- Silver
- Gold

Subscription upgrade with Razorpay Test Payment Integration.

### ▶️ Custom Video Player
- Play/Pause
- Volume Control
- Full Screen
- Forward 10 seconds
- Rewind 10 seconds
- Video Duration
- Current Playback Time
- Loading Indicator
- Next Video Option

### 🎨 Personalized Theme
- Light Theme (10 AM – 12 PM IST)
- Dark Theme (Default)
- Manual Theme Switching
- Theme saved in user profile

### 🔒 Security
- OTP verification for new devices or locations
- Secure authentication
- Protected user sessions

### 🌍 Smart Comments
- Multi-language comments
- Comment translation
- Like/Dislike comments
- Report comments
- Spam detection
- Abusive word filtering
- Repeated special character detection

---

# 🛠️ Technologies Used

## Frontend
- React.js
- JavaScript (ES6)
- HTML5
- CSS3
- Axios
- Socket.IO Client

## Backend
- Node.js
- Express.js
- Socket.IO

## Tools
- Git
- GitHub
- VS Code

## Deployment
- Vercel (Frontend)
- Render (Backend)

---

# 📁 Project Structure

```
watch-party
│
├── client
│   ├── public
│   ├── src
│   │   ├── assets
│   │   ├── components
│   │   ├── hooks
│   │   ├── pages
│   │   ├── services
│   │   ├── styles
│   │   └── utils
│   ├── package.json
│   └── README.md
│
├── server
│   ├── data
│   ├── server.js
│   └── package.json
│
└── package.json
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/Lekhanasn/watch-party.git
```

## Frontend

```bash
cd client
npm install
npm start
```

Runs on:

```
http://localhost:3000
```

---

## Backend

```bash
cd server
npm install
node server.js
```

Runs on:

```
http://localhost:5000
```

---

# 🌐 Deployment

### Frontend

Hosted on **Vercel**

### Backend

Hosted on **Render**

---

# 📷 Main Modules

- Home
- Create Party
- Join Party
- Watch Room
- Profile
- Live Chat
- Downloads
- Subscription
- Custom Video Player

---

# 🔮 Future Enhancements

- AI Video Recommendation
- Voice Search
- Cloud Recording
- Mobile Application
- Push Notifications
- Watch History Analytics

---

# 👩‍💻 Developed By

**Lekhana S N**

Information Science and Engineering

Vidya Vikas Institute of Engineering and Technology

---

# 📄 License

This project is developed for educational and internship purposes.
