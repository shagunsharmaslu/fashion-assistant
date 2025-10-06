import React, { useState } from "react";
import { askQuestion } from "../api";

const stylePrompts = [
  "What should I wear to a dinner date?",
  "Outfit ideas for a job interview?",
  "Beach day looks?",
  "Chic outfit for a brunch?",
  "Comfy airport style?",
  "What colors suit my skin tone?",
];

export default function ChatBox({ profile, onSaveLook }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMsg = { role: "user", content: question };
    setMessages((m) => [...m, userMsg]);

    const res = await askQuestion(question, profile);
    const botMsg = { role: "assistant", content: res.suggestion };
    setMessages((m) => [...m, botMsg]);
    setQuestion("");
  };

  const handlePromptClick = (prompt) => {
    setQuestion(prompt);
  };

  return (
    <div className="chat-container">
      <div className="prompt-bar">
        {stylePrompts.map((p, idx) => (
          <button key={idx} className="prompt-btn" onClick={() => handlePromptClick(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.role === "user" ? "user-message" : "assistant-message"}`}
          >
            {msg.content}
            {msg.role === "assistant" && (
              <button
                className="save-look-btn"
                onClick={() => onSaveLook(msg.content)}
              >
                💾 Save to Closet
              </button>
            )}
          </div>
        ))}
      </div>

      <form className="chat-input-bar" onSubmit={handleAsk}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask me anything — 'What should I wear to a wedding?' 💬"
        />
        <button type="submit" className="btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
