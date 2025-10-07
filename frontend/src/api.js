
// src/api.js
const BASE_URL = "http://localhost:5001";

export async function askQuestion(question, profile = {}) {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, profile }),
  });
  if (!res.ok) throw new Error(`ask failed: ${res.status}`);
  return await res.json(); // { suggestion, categories }
}

export async function fetchCategories() {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error(`categories failed: ${res.status}`);
  return await res.json(); // [ "Business Casual", ... ]
}
