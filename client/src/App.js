import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import CreateParty from "./pages/CreateParty";
import JoinParty from "./pages/JoinParty";
import WatchRoom from "./pages/WatchRoom";
import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/create" element={<CreateParty />} />

        <Route path="/join" element={<JoinParty />} />

        <Route path="/room" element={<WatchRoom />} />

        <Route path="/profile" element={<Profile />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;