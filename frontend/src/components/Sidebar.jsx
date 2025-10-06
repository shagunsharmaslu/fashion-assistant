import React from "react";

export default function Sidebar({ categories }) {
  return (
    <div className="category-section">
      <h2>📂 Categories</h2>
      {categories.length === 0 ? (
        <p className="empty-text">No categories yet</p>
      ) : (
        <ul>
          {categories.map((cat, idx) => (
            <li key={idx} className="category-item">
              {cat}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
