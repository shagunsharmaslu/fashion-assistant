import React from "react";

export default function Closet({ savedLooks = [], onClearAll }) {
  const canClear = savedLooks.length > 0;

  return (
    <div className="closet">
      <div className="closet-head">
        <h2>✨ My Closet</h2>
        <button
          type="button"
          className="link-btn"
          onClick={onClearAll}
          disabled={!canClear}
          title={canClear ? "Remove all saved looks" : "Nothing to clear"}
        >
          Clear all
        </button>
      </div>

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
