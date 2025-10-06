import React from "react";

export default function Closet({ savedLooks = [] }) {
  return (
    <div className="closet">
      <h2>✨ My Closet</h2>
      {savedLooks.length === 0 ? (
        <p className="closet-empty">
          No saved looks yet. Ask for outfit ideas to get started!
        </p>
      ) : (
        <ul className="closet-list">
          {savedLooks.map((look, idx) => (
            <li key={idx} className="closet-item">
              <strong>Look {idx + 1}:</strong> {look}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
