import React, { useEffect, useRef, useState } from "react";
import ChatBox from "./components/ChatBox"; // optional
import ProfileForm from "./components/ProfileForm";
import Closet from "./components/Closet";
import Sidebar from "./components/Sidebar";
import "./index.css";

/* ---------- Demo fits ---------- */
const DEMO_FITS = [
  {
    title: "Brunch in spring",
    body:
      "Lightwash straight jeans, white tee, pastel cardigan, and low-profile sneakers. Add a straw tote and thin gold hoops.",
    tags: ["Brunch", "Spring", "Pastel"],
    match: Math.floor(86 + Math.random() * 10),
    _demo: true,
  },
  {
    title: "Tech office casual",
    body:
      "Tapered chinos, breathable knit polo, minimalist trainers, and a lightweight overshirt. Finish with a slim backpack.",
    tags: ["Office", "Smart casual", "Comfort"],
    match: Math.floor(86 + Math.random() * 10),
    _demo: true,
  },
  {
    title: "Night out minimal",
    body:
      "All-black: straight trousers, mock-neck top, cropped jacket, and sleek boots. One statement ring to elevate.",
    tags: ["Night out", "Minimal", "Monochrome"],
    match: Math.floor(86 + Math.random() * 10),
    _demo: true,
  },
  {
    title: "Rainy day street",
    body:
      "Water-resistant shell, relaxed hoodie, cargo pants, and retro runners. Beanie + crossbody for utility.",
    tags: ["Streetwear", "Rain-ready", "Casual"],
    match: Math.floor(86 + Math.random() * 10),
    _demo: true,
  },
  {
    title: "Date dinner chic",
    body:
      "Dark denim, silk/satin blouse, heeled sandals, and a tailored blazer. Delicate pendant to polish the look.",
    tags: ["Date", "Chic", "Evening"],
    match: Math.floor(86 + Math.random() * 10),
    _demo: true,
  },
];

function App() {
  const [profile, setProfile] = useState({});
  const [categories, setCategories] = useState([]);
  const [closet, setCloset] = useState([]); // save text bodies for now
  const [loading, setLoading] = useState(false);

  // query + filters
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    style: "Smart casual",
    occasion: "Dinner",
    season: "Fall",
  });

  // suggestions
  const [suggestions, setSuggestions] = useState(() => DEMO_FITS);

  // right rail
  const [items, setItems] = useState([]);
  const [railTab, setRailTab] = useState("closet"); // "closet" | "saved"
  const fileInputRef = useRef(null);

  // favs (by index)
  const [favs, setFavs] = useState(new Set());

  useEffect(() => {
    fetch("http://localhost:5001/categories")
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => console.log("No categories yet"));
  }, []);

  /* ---- API response -> UI cards ----
     Expect: /ask returns { suggestions: [{title, suggestion, categories, links?}] }
  */
  const cardsFromSuggestions = (arr) =>
    (arr || []).map((s) => {
      const cats = s?.categories || {};
      const linksRaw = Array.isArray(s?.links) ? s.links : [];
      const links = linksRaw
        .filter((l) => l && typeof l.url === "string")
        .slice(0, 3)
        .map((l) => ({
          title: l.title || "Shop",
          url: l.url,
          source: l.source || "",
        }));

      return {
        title: s?.title || (cats?.style ? `${cats.style} pick` : "Suggested look"),
        body: s?.suggestion || "—",
        tags: [cats?.event, cats?.season, cats?.style].filter(Boolean),
        links,
        match: Math.floor(82 + Math.random() * 14),
      };
    });

  // Fetch 3 suggestions (replace demo with AI)
  const handleSend = async () => {
    const prompt =
      query ||
      `Suggest three outfits. Style: ${filters.style}, Occasion: ${filters.occasion}, Season: ${filters.season}`;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, profile }),
      });
      const data = await res.json();
      const arr = Array.isArray(data?.suggestions) ? data.suggestions : [];

      if (arr.length > 0) {
        const newCards = cardsFromSuggestions(arr);
        setSuggestions(newCards); // REPLACE defaults with AI
      } else {
        handleSendLocalTriplet(); // replace with local
      }
    } catch (e) {
      console.error(e);
      handleSendLocalTriplet(); // replace on error
    } finally {
      setLoading(false);
    }
  };

  // Local fallback that also replaces
  const handleSendLocalTriplet = () => {
    const local = [
      {
        title: `${filters.style} base`,
        suggestion: `Clean ${filters.style.toLowerCase()} for ${filters.occasion.toLowerCase()} in ${filters.season.toLowerCase()}: black denim, charcoal knit, white sneakers.`,
        categories: { event: filters.occasion, season: filters.season, style: filters.style },
        links: [],
      },
      {
        title: "Elevated layers",
        suggestion:
          "Dark chinos, ribbed polo, suede loafers, light jacket; metal watch to finish.",
        categories: { event: filters.occasion, season: filters.season, style: filters.style },
        links: [],
      },
      {
        title: "Textured minimal",
        suggestion:
          "Tonal tee, pleated trouser, cropped jacket, retro runners; small crossbody.",
        categories: { event: filters.occasion, season: filters.season, style: "Minimal" },
        links: [],
      },
    ];
    const newCards = cardsFromSuggestions(local);
    setSuggestions(newCards);
  };

  // save a look (as text) into closet
  const handleSaveToCloset = (look) => setCloset((prev) => [look, ...prev]);

  // uploads
  const onUploadPhotosClick = () => fileInputRef.current?.click();
  const onFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    const newItems = files.map((f) => ({
      id: crypto.randomUUID(),
      label: f.name,
      imageUrl: URL.createObjectURL(f),
    }));
    setItems((prev) => [...newItems, ...prev]);
    if (e.target) e.target.value = "";
  };

  // clear uploads
  const onClearAll = () => setItems([]);

  // favs
  const toggleFav = (idx) =>
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  return (
    <div className="app-ui">
      {/* Top bar */}
      <header className="ux-header">
        <div className="ux-brand">
          <span className="ux-logo">💃</span>
          <span className="ux-title">Your Personal Stylist</span>
        </div>
        <div className="ux-actions">
          <span className="ux-chip">Gemini</span>
        </div>
      </header>

      <div className="ux-body">
        {/* MAIN LEFT */}
        <section className="ux-main">
          {/* Query Bar */}
          <div className="query-row">
            <input
              className="query-input"
              placeholder='e.g., "going for party, suggest some outfit"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {/* Status message */}
            {loading && (
              <div className="status-bar" role="status" aria-live="polite">
                <span className="dot-pulse" /> Fetching your style…
              </div>
            )}

            <div className="query-pickers">
              <Dropdown
                label="Style"
                value={filters.style}
                onChange={(v) => setFilters((f) => ({ ...f, style: v }))}
                options={["Smart casual", "Minimal", "Streetwear", "Preppy"]}
              />
              <Dropdown
                label="Occasion"
                value={filters.occasion}
                onChange={(v) => setFilters((f) => ({ ...f, occasion: v }))}
                options={["Dinner", "Office", "Date", "Party"]}
              />
              <Dropdown
                label="Season"
                value={filters.season}
                onChange={(v) => setFilters((f) => ({ ...f, season: v }))}
                options={["Fall", "Winter", "Spring", "Summer"]}
              />
              <button
                type="button"
                className="btn send"
                onClick={handleSend}
                disabled={loading}
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </div>

          {/* Upload strip */}
          <div className="upload-strip">
            <div>
              <div className="u-title">Upload your closet</div>
            </div>
            <div className="u-actions">
              <button type="button" className="btn ghost" onClick={onUploadPhotosClick}>
                ⬆️ Upload photos
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={onFilesSelected}
            />
          </div>

          {/* Suggestions grid */}
          <h3 className="section-h">Suggestions</h3>
          <div className="card-grid">
            {suggestions.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : suggestions.map((s, i) => (
                  <SuggestionCard
                    key={`${s.title}-${i}`}
                    title={s.title}
                    body={s.body}
                    tags={s.tags}
                    links={s.links || []}
                    match={s.match}
                    onSave={() => handleSaveToCloset(s.body)}
                    onFav={() => toggleFav(i)}
                    favActive={favs.has(i)}
                  />
                ))}
          </div>
        </section>

        {/* RIGHT RAIL */}
        <aside className="ux-rail">
          <div className="rail-card">
            <div className="tabs">
              <button
                type="button"
                className={`tab ${railTab === "closet" ? "active" : ""}`}
                onClick={() => setRailTab("closet")}
              >
                Your closet
              </button>
            </div>

            {railTab === "closet" ? (
              <>
                <div className="items-head">
                  <div className="items-title">Items</div>
                  <button type="button" className="link-btn" onClick={onClearAll}>
                    Clear all
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="empty">No items yet. Upload photos</div>
                ) : (
                  <ul className="items-list">
                    {items.map((it) => (
                      <li key={it.id} className="item-row">
                        {it.imageUrl ? <img src={it.imageUrl} alt={it.label} /> : <span className="dot" />}
                        <span className="item-label">{it.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : null}
          </div>

          {/* Profile + Summary */}
          <div className="rail-card">
            <ProfileForm onSave={setProfile} />
            <h3 style={{ marginTop: 0 }}>Profile Summary</h3>
            {Object.keys(profile).length === 0 ? (
              <p className="empty">No profile saved yet.</p>
            ) : (
              <ul
                style={{
                  padding: 0,
                  listStyle: "none",
                  margin: 0,
                  display: "grid",
                  gap: 6,
                }}
              >
                <li><strong>Body type:</strong> {profile.bodyType || "-"}</li>
                <li><strong>Skin tone:</strong> {profile.skinTone || "-"}</li>
                <li><strong>Gender:</strong> {profile.gender || "-"}</li>
                <li><strong>Height:</strong> {profile.height || "-"}</li>
                <li><strong>Preferred style:</strong> {profile.preferredStyle || "-"}</li>
                <li><strong>Avoid:</strong> {profile.avoid || "-"}</li>
              </ul>
            )}
          </div>

          <div className="rail-card">
            <Closet savedLooks={closet} onClearAll={() => setCloset([])} />
          </div>

          <div className="rail-card">
            <Sidebar categories={categories} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---- helpers ---- */
function Dropdown({ label, value, onChange, options }) {
  return (
    <label className="dd">
      <span>{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SkeletonCard() {
  return (
    <div className="s-card">
      {/* <div className="s-media" />  <-- removed the gray placeholder */}
      <div className="s-line" />
      <div className="s-line short" />
    </div>
  );
}

function SuggestionCard({
  title,
  body,
  tags = [],
  links = [],
  match = 90,
  onSave,
  onFav,
  favActive,
}) {
  return (
    <div className="sugg-card">
      {/* removed: <div className="media" /> */}

      <div className="sugg-body">
        <div className="sugg-title-row">
          <div className="sugg-title">{title}</div>
          <div className="badge">{match}% match</div>
        </div>

        <div className="sugg-desc">{body}</div>

        {links.length > 0 && (
          <div className="buy-row">
            <div className="buy-label">Where to buy:</div>
            <ul className="buy-links">
              {links.map((l, i) => (
                <li key={i}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={l.source ? `${l.title} • ${l.source}` : l.title}
                  >
                    {l.title || "Shop"}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="tag-row">
          {tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>

        <div className="cta-row">
          <button
            type="button"
            className="btn ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSave && onSave();
            }}
          >
            ⛉ Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
