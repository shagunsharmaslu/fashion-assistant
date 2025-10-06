from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import sqlite3, json, os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask + CORS
app = Flask(__name__)
CORS(app)

# Initialize OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize SQLite
def init_db():
    conn = sqlite3.connect("fashion.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS fashion_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT,
                    question TEXT,
                    suggestion TEXT,
                    categories_json TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )''')
    conn.commit()
    conn.close()

init_db()

@app.route("/ask", methods=["POST"])
def ask():
    data = request.json
    question = data.get("question", "")
    profile = data.get("profile", {})

    if not question:
        return jsonify({"error": "Missing question"}), 400

    prompt = f"""
You are a fashion assistant that provides personalized outfit recommendations.
User traits: {json.dumps(profile)}
Question: {question}

Respond in JSON with:
1. "suggestion": text answer
2. "categories": structured tags like:
{{
  "event": "Business Casual",
  "season": "Fall",
  "style": "Minimalist",
  "user_traits": {{
    "body_type": "Athletic",
    "skin_tone": "Warm"
  }}
}}
    """

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )

    text = completion.choices[0].message.content

    try:
        result = json.loads(text)
    except:
        result = {"suggestion": text, "categories": {}}

    # Extract main category
    main_category = result.get("categories", {}).get("event", "Uncategorized")

    conn = sqlite3.connect("fashion.db")
    c = conn.cursor()
    c.execute(
        "INSERT INTO fashion_data (category, question, suggestion, categories_json) VALUES (?, ?, ?, ?)",
        (main_category, question, result["suggestion"], json.dumps(result["categories"]))
    )
    conn.commit()
    conn.close()

    return jsonify(result)

@app.route("/categories", methods=["GET"])
def categories():
    conn = sqlite3.connect("fashion.db")
    c = conn.cursor()
    c.execute("SELECT DISTINCT category FROM fashion_data ORDER BY category ASC")
    rows = [r[0] for r in c.fetchall()]
    conn.close()
    return jsonify(rows)

@app.route("/history/<category>", methods=["GET"])
def history(category):
    conn = sqlite3.connect("fashion.db")
    c = conn.cursor()
    c.execute("SELECT question, suggestion, categories_json, timestamp FROM fashion_data WHERE category=? ORDER BY id ASC", (category,))
    rows = c.fetchall()
    conn.close()
    history = [
        {
            "question": r[0],
            "suggestion": r[1],
            "categories": json.loads(r[2]) if r[2] else {},
            "timestamp": r[3]
        } for r in rows
    ]
    return jsonify(history)

if __name__ == "__main__":
    app.run(port=5001, debug=True)
