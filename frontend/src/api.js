export async function askQuestion(question, profile) {
  const res = await fetch("http://localhost:5001/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, profile }),
  });
  return res.json();
}
