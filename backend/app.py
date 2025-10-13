from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import sqlite3, json, os, re
import urllib.parse as up
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
    """Best-effort: raw JSON, ```json fenced```, or first balanced object."""
    if not text:
        return None
    # try direct
    try:
        return json.loads(text)
    except Exception:
        pass
    # try ```json ... ```
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # try first balanced { ... }
    m = re.search(r"(\{(?:[^{}]|(?1))*\})", text, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return None

# simple https URL guard
_URL_RE = re.compile(r"^https://[^\s]+$", re.IGNORECASE)

def _sanitize_links(links):
    """Keep at most 3 valid https links with short titles/sources."""
    out = []
    if isinstance(links, list):
        for l in links:
            if not isinstance(l, dict):
                continue
            title = (l.get("title") or "Shop").strip()
            url = (l.get("url") or "").strip()
            source = (l.get("source") or "").strip()
            if _URL_RE.match(url):
                out.append({"title": title[:60], "url": url, "source": source[:60]})
            if len(out) >= 3:
                break
    return out

def build_shop_links(sug: dict) -> list:
    """
    Deterministic, reliable retailer SEARCH links based on the suggestion.
    This avoids LLM-hallucinated deep links that 404.
    """
    title = (sug.get("title") or "").strip()
    desc = (sug.get("suggestion") or "").strip()
    cats = sug.get("categories") or {}
    query_bits = [
        title,
        cats.get("style") or "",
        cats.get("event") or "",
        cats.get("season") or "",
    ]
    q = " ".join([b for b in query_bits if b]).strip()
    if not q:
        q = " ".join(desc.split()[:8]) or "stylish outfit"
    q_enc = up.quote_plus(q)

    return [
        {"title": "ASOS", "source": "ASOS", "url": f"https://www.asos.com/search/?q={q_enc}"},
        {"title": "Zara", "source": "Zara", "url": f"https://www.zara.com/us/en/search?searchTerm={q_enc}"},
        {"title": "Uniqlo", "source": "Uniqlo", "url": f"https://www.uniqlo.com/us/en/search?q={q_enc}"},
        {"title": "Nordstrom", "source": "Nordstrom", "url": f"https://www.nordstrom.com/sr?keyword={q_enc}"},
        {"title": "Amazon", "source": "Amazon", "url": f"https://www.amazon.com/s?k={q_enc}"},
        {"title": "Google Shopping", "source": "Google", "url": f"https://www.google.com/search?tbm=shop&q={q_enc}"},
    ][:3]  # keep top 3 for brevity

def build_prompt(question, profile):
    # EXACTLY 3 items, each with 1–3 links (we will still sanitize)
    return f"""
You are a fashion assistant that provides personalized outfit recommendations.

User traits: {json.dumps(profile, ensure_ascii=False)}
Question: {question}

Return ONLY valid JSON with this exact schema (NO markdown, NO extra text):
{{
  "suggestions": [
    {{
      "title": "short catchy title",
      "suggestion": "concise outfit description (2-4 sentences, no emojis)",
      "categories": {{
        "event": "Business Casual",
        "season": "Fall",
        "style": "Minimalist",
        "user_traits": {{"body_type": "Athletic", "skin_tone": "Warm"}}
      }},
      "links": [
        {{
          "title": "Item name or page",
          "url": "https://example.com/product",
          "source": "Brand or retailer"
        }}
      ]
    }},
    ... 2 more (total EXACTLY 3)
  ]
}}

Rules:
- Exactly 3 suggestions.
- Provide 1–3 realistic https links per suggestion. Prefer reputable brands/retailers and general product/category pages if unsure.
- Titles short; descriptions concise.
""".strip()

def persist_suggestion(question: str, sug: dict):
    """
    Store each suggestion. We keep `links` inside categories_json to avoid a DB migration.
    """
    try:
        categories = sug.get("categories") or {}
        links = _sanitize_links(sug.get("links", []))
        if links:
            categories = {**categories, "links": links}

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
        # best effort; do not crash on DB issues
        pass

@app.route("/ask", methods=["POST"])
def ask():
    data = request.json or {}
    question = data.get("question", "")
    profile = data.get("profile", {})
    if not question:
        return jsonify({"error": "Missing question"}), 400

    prompt = build_prompt(question, profile)

    fallback = {
        "suggestions": [
            {
                "title": "Smart-casual base",
                "suggestion": "Black slim denim, charcoal crew knit, clean white leather sneakers, and a light trench. Add a slim belt and a compact crossbody.",
                "categories": {"event": "Smart casual", "season": "Fall", "style": "Minimal", "user_traits": {}},
                "links": []
            },
            {
                "title": "Dinner-ready",
                "suggestion": "Dark chinos, cream ribbed polo, suede loafers, and a navy overshirt. Finish with a subtle metal watch.",
                "categories": {"event": "Dinner", "season": "Fall", "style": "Smart casual", "user_traits": {}},
                "links": []
            },
            {
                "title": "Street polish",
                "suggestion": "Grey pleated trousers, black tee, cropped bomber, and retro runners. Socks just visible; tote or mini backpack.",
                "categories": {"event": "Casual", "season": "Fall", "style": "Streetwear", "user_traits": {}},
                "links": []
            },
        ]
    }

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        resp = model.generate_content(prompt)
        parsed = extract_json(getattr(resp, "text", "") or "") or {}

        suggestions = parsed.get("suggestions")
        if not isinstance(suggestions, list) or len(suggestions) == 0:
            suggestions = fallback["suggestions"]
        else:
            # normalize to exactly 3
            if len(suggestions) < 3:
                suggestions = (suggestions + fallback["suggestions"])[:3]
            elif len(suggestions) > 3:
                suggestions = suggestions[:3]

        clean_out = []
        for sug in suggestions:
            s = dict(sug) if isinstance(sug, dict) else {}

            # 1) sanitize model-provided links
            good_links = _sanitize_links(s.get("links", []))

            # 2) if none survived, build reliable retailer search links
            if not good_links:
                good_links = _sanitize_links(build_shop_links(s))

            s["links"] = good_links

            # persist what we return
            persist_suggestion(question, s)
            clean_out.append({
                "title": s.get("title", "Suggested look"),
                "suggestion": s.get("suggestion", ""),
                "categories": s.get("categories") or {},
                "links": s.get("links") or [],
            })

        return jsonify({"suggestions": clean_out})

    except Exception as e:
        # Fallback; still persist, and attach deterministic links
        final = []
        for sug in fallback["suggestions"]:
            s = dict(sug)
            s["links"] = _sanitize_links(build_shop_links(s))
            persist_suggestion(question, s)
            final.append(s)
        return jsonify({"suggestions": final, "error": str(e)}), 200

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
    history = []
    for r in rows:
        cats = json.loads(r[2]) if r[2] else {}
        history.append({
            "question": r[0],
            "suggestion": r[1],
            "categories": cats,  # may include "links"
            "timestamp": r[3],
        })
    return jsonify(history)

if __name__ == "__main__":
    app.run(port=5001, debug=True)
