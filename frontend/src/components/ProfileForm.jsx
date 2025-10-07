import React, { useState } from "react";

export default function ProfileForm({ onSave }) {
  const [form, setForm] = useState({
    bodyType: "",
    skinTone: "",
    gender: "",
    height: "",
    preferredStyle: "",
    avoid: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      onSave?.(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000); // fade the check
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0 }}>🧍‍♀️ Your Style Profile</h2>
        {saved && (
          <span style={{
            fontSize: 12, padding: "2px 8px", borderRadius: 999,
            background: "#eaf7ef", color: "#1f8f55", border: "1px solid #c9e8d3"
          }}>
            ✓ Saved
          </span>
        )}
      </div>

      <p className="helper-text">
        Tell me a bit about yourself — I’ll personalize your looks just for you ✨
      </p>

      <input
        name="bodyType"
        placeholder="Describe your body type (e.g., athletic, curvy, petite)"
        value={form.bodyType}
        onChange={handleChange}
      />
      <input
        name="skinTone"
        placeholder="What’s your skin tone? (e.g., warm, cool, neutral)"
        value={form.skinTone}
        onChange={handleChange}
      />
      <input
        name="gender"
        placeholder="How do you identify?"
        value={form.gender}
        onChange={handleChange}
      />
      <input
        name="height"
        placeholder="Your height (e.g., 5'8, 170cm)"
        value={form.height}
        onChange={handleChange}
      />
      <input
        name="preferredStyle"
        placeholder="What’s your go-to style? (e.g., chic, streetwear, classic)"
        value={form.preferredStyle}
        onChange={handleChange}
      />
      <input
        name="avoid"
        placeholder="Anything you prefer to avoid?"
        value={form.avoid}
        onChange={handleChange}
      />

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save My Style"}
      </button>
    </form>
  );
}
