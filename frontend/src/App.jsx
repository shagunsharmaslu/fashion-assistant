import React, { useState, useEffect } from "react";
import ChatBox from "./components/ChatBox";
import ProfileForm from "./components/ProfileForm";
import Closet from "./components/Closet";
import Sidebar from "./components/Sidebar";
import "./index.css";

function App() {
  const [profile, setProfile] = useState({});
  const [categories, setCategories] = useState([]);
  const [closet, setCloset] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5001/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch(() => console.log("No categories yet"));
  }, []);

  const handleSaveToCloset = (look) => {
    setCloset((prev) => [...prev, look]);
  };

  return (
    <div className="app-container">
      {/* LEFT PANEL */}
      <aside className="sidebar">
        <h1 className="app-title">👗 Fashion Stylist</h1>

        <div className="sidebar-section">
          <ProfileForm onSave={setProfile} />
        </div>

        <div className="sidebar-section">
          <Closet savedLooks={closet} />
        </div>

        <div className="sidebar-section">
          <Sidebar categories={categories} />
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <main className="chat-panel">
        <ChatBox profile={profile} onSaveLook={handleSaveToCloset} />
      </main>
    </div>
  );
}

export default App;
