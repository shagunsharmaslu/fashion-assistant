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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <h2>🧍‍♀️ Your Style Profile</h2>
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
      <button type="submit" className="btn-primary">
        Save My Style
      </button>
    </form>
  );
}
