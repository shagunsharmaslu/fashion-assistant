from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import sqlite3, json, os, re
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-2.5-flash"  # or "gemini-2.5-pro"
DEFAULT_CATEGORIES = ["Business Casual", "Smart casual", "Minimal", "Streetwear", "Formal"]

def init_db():
    conn = sqlite3.connect("fashion.db")
    c = conn.cursor()
    c.execute(
        """CREATE TABLE IF NOT EXISTS fashion_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            question TEXT,
            suggestion TEXT,
            categories_json TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    conn.commit()
    conn.close()
init_db()

def extract_json(text: str):
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    m = re.search(r"(\{(?:[^{}]|(?1))*\})", text, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return None

def build_prompt(question, profile):
    # Ask for EXACTLY 3 suggestions as an array
    return f"""
You are a fashion assistant that provides personalized outfit recommendations.

User traits: {json.dumps(profile, ensure_ascii=False)}
Question: {question}

Return ONLY valid JSON with this exact schema:
{{
  "suggestions": [
    {{
      "title": "short catchy title",
      "suggestion": "concise outfit description (2-4 sentences, bullet-like, no emojis)",
      "categories": {{
        "event": "Business Casual",
        "season": "Fall",
        "style": "Minimalist",
        "user_traits": {{"body_type": "Athletic", "skin_tone": "Warm"}}
      }}
    }},
    ... 2 more (total 3)
  ]
}}
- Exactly 3 items in "suggestions".
- No extra keys, no markdown, no text outside JSON.
""".strip()

def persist_suggestion(question: str, sug: dict):
    """Store each suggestion row; main_category uses categories.event or 'Uncategorized'."""
    try:
        categories = sug.get("categories") or {}
        main_category = categories.get("event") or "Uncategorized"
        conn = sqlite3.connect("fashion.db")
        c = conn.cursor()
        c.execute(
            "INSERT INTO fashion_data (category, question, suggestion, categories_json) VALUES (?, ?, ?, ?)",
            (main_category, question, sug.get("suggestion", ""), json.dumps(categories, ensure_ascii=False)),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

@app.route("/ask", methods=["POST"])
def ask():
    data = request.json or {}
    question = data.get("question", "")
    profile = data.get("profile", {})
    if not question:
        return jsonify({"error": "Missing question"}), 400

    prompt = build_prompt(question, profile)

    # Default triple suggestions if model fails
    fallback = {
        "suggestions": [
            {
                "title": "Smart-casual base",
                "suggestion": "Black slim denim, charcoal crew knit, clean white leather sneakers, and a light trench. Add a slim belt and a compact crossbody.",
                "categories": {"event": "Smart casual", "season": "Fall", "style": "Minimal", "user_traits": {}},
            },
            {
                "title": "Dinner-ready",
                "suggestion": "Dark chinos, cream ribbed polo, suede loafers, and a navy overshirt. Finish with a subtle metal watch.",
                "categories": {"event": "Dinner", "season": "Fall", "style": "Smart casual", "user_traits": {}},
            },
            {
                "title": "Street polish",
                "suggestion": "Grey pleated trousers, black tee, cropped bomber, and retro runners. Socks just visible; tote or mini backpack.",
                "categories": {"event": "Casual", "season": "Fall", "style": "Streetwear", "user_traits": {}},
            },
        ]
    }

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        resp = model.generate_content(prompt)
        parsed = extract_json(resp.text or "") or {}

        suggestions = parsed.get("suggestions")
        if not isinstance(suggestions, list) or len(suggestions) == 0:
            suggestions = fallback["suggestions"]
        else:
            # If the model returned more/less than 3, normalize to 3
            suggestions = suggestions[:3] if len(suggestions) >= 3 else (suggestions + fallback["suggestions"])[:3]

        # Persist each suggestion
        for sug in suggestions:
            persist_suggestion(question, sug)

        return jsonify({"suggestions": suggestions})

    except Exception as e:
        # Graceful fallback
        for sug in fallback["suggestions"]:
            persist_suggestion(question, sug)
        return jsonify({"suggestions": fallback["suggestions"], "error": str(e)}), 200

@app.route("/categories", methods=["GET"])
def categories():
    conn = sqlite3.connect("fashion.db")
    c = conn.cursor()
    c.execute("SELECT DISTINCT category FROM fashion_data ORDER BY category ASC")
    rows = [r[0] for r in c.fetchall()]
    conn.close()
    return jsonify(rows if rows else DEFAULT_CATEGORIES)

@app.route("/history/<category>", methods=["GET"])
def history(category):
    conn = sqlite3.connect("fashion.db")
    c = conn.cursor()
    c.execute(
        "SELECT question, suggestion, categories_json, timestamp FROM fashion_data WHERE category=? ORDER BY id ASC",
        (category,),
    )
    rows = c.fetchall()
    conn.close()
    history = [
        {
            "question": r[0],
            "suggestion": r[1],
            "categories": json.loads(r[2]) if r[2] else {},
            "timestamp": r[3],
        }
        for r in rows
    ]
    return jsonify(history)

if __name__ == "__main__":
    app.run(port=5001, debug=True)
