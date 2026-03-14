import { useState, useEffect, useRef } from "react";

// ── Design: Editorial Clinical ──
// White background, burgundy accents, no gradients, no shadows
// Typography: Cormorant Garamond (display) + Source Sans 3 (body) + IBM Plex Mono (data)

const C = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F3F0",
  border: "#E8E4DF",
  borderHover: "#8B2332",
  text: "#1A1A1A",
  textSecondary: "#4A4A4A",
  textMuted: "#8A8A8A",
  textLight: "#B0A8A0",
  burgundy: "#8B2332",
  burgundyLight: "#A93545",
  burgundySoft: "rgba(139, 35, 50, 0.06)",
  burgundyBorder: "rgba(139, 35, 50, 0.15)",
  white: "#FFFFFF",
  green: "#2D7A4F",
  greenSoft: "rgba(45, 122, 79, 0.08)",
  amber: "#A0722A",
  amberSoft: "rgba(160, 114, 42, 0.08)",
  red: "#9B2C2C",
};

const FONT = {
  display: "'Cormorant Garamond', Georgia, serif",
  body: "'Source Sans 3', 'Source Sans Pro', sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
};

// ── Markdown renderer ──
function Md({ text }) {
  if (!text) return null;

  // Process bold in a string
  function bold(str) {
    const parts = [];
    let rem = str,
      pk = 0;
    while (rem.includes("**")) {
      const s = rem.indexOf("**");
      if (s > 0) parts.push(<span key={pk++}>{rem.slice(0, s)}</span>);
      rem = rem.slice(s + 2);
      const e = rem.indexOf("**");
      if (e === -1) {
        parts.push(<span key={pk++}>**{rem}</span>);
        rem = "";
        break;
      }
      parts.push(
        <strong key={pk++} style={{ fontWeight: 600, color: C.text }}>
          {rem.slice(0, e)}
        </strong>,
      );
      rem = rem.slice(e + 2);
    }
    if (rem) parts.push(<span key={pk++}>{rem}</span>);
    return parts.length > 1 ? parts : str;
  }

  const lines = text.split("\n");
  const els = [];
  let k = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      els.push(<div key={k++} style={{ height: 10 }} />);
      continue;
    }

    // Heading
    if (trimmed.startsWith("### ")) {
      els.push(
        <div
          key={k++}
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: C.text,
            marginTop: 20,
            marginBottom: 6,
            fontFamily: FONT.body,
          }}
        >
          {bold(trimmed.slice(4))}
        </div>,
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^\d+\./)[0];
      const rest = trimmed.replace(/^\d+\.\s*/, "");
      els.push(
        <div
          key={k++}
          style={{ display: "flex", gap: 10, marginBottom: 3, paddingLeft: 4 }}
        >
          <span
            style={{
              color: C.burgundy,
              fontWeight: 600,
              fontFamily: FONT.mono,
              fontSize: 13,
              flexShrink: 0,
              minWidth: 20,
            }}
          >
            {num}
          </span>
          <span style={{ flex: 1 }}>{bold(rest)}</span>
        </div>,
      );
    }
    // Bullet (handles "- ", "• ", "●- ", "● - ", etc.)
    else if (/^[●•\-]\s*[-●•]?\s*/.test(trimmed)) {
      const rest = trimmed.replace(/^[●•\-]\s*[-●•]?\s*/, "");
      els.push(
        <div
          key={k++}
          style={{ display: "flex", gap: 10, marginBottom: 3, paddingLeft: 12 }}
        >
          <span style={{ color: C.burgundy, fontSize: 5, marginTop: 9 }}>
            ●
          </span>
          <span style={{ flex: 1 }}>{bold(rest)}</span>
        </div>,
      );
    }
    // Plain text
    else {
      els.push(
        <div key={k++} style={{ marginBottom: 3 }}>
          {bold(trimmed)}
        </div>,
      );
    }
  }
  return <>{els}</>;
}

// ── Typing indicator ──
function Typing() {
  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        padding: "24px 0",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: C.burgundy,
          fontFamily: FONT.body,
          fontWeight: 600,
          marginRight: 8,
        }}
      >
        GeriAssist
      </span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: C.burgundy,
            animation: `dot 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes dot { 0%,80%,100% { opacity:0.2 } 40% { opacity:1 } }`}</style>
    </div>
  );
}

// ── Icon button with tooltip ──
function IconBtn({ label, icon, onClick, isCopy }) {
  const [hov, setHov] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => {
        setHov(false);
        setDone(false);
      }}
    >
      <button
        onClick={() => {
          onClick();
          if (isCopy) {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }
        }}
        style={{
          padding: 5,
          borderRadius: 4,
          border: "none",
          background: hov ? C.surfaceAlt : "transparent",
          color: done ? C.green : hov ? C.text : C.textMuted,
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
        }}
      >
        {icon}
      </button>
      {hov && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "3px 7px",
            borderRadius: 3,
            background: C.text,
            color: C.white,
            fontSize: 10,
            fontFamily: FONT.body,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {done ? "Copied!" : label}
        </div>
      )}
    </div>
  );
}

// ── Citations ──
function Sources({ citations }) {
  const [open, setOpen] = useState(null);
  if (!citations?.length) return null;

  const grouped = {};
  citations.forEach((c) => {
    const n = c.source;
    if (
      n.toLowerCase().includes("test doc") ||
      n.toLowerCase().includes("test_doc")
    )
      return;
    if (!grouped[n]) grouped[n] = [];
    grouped[n].push(c);
  });

  const items = Object.entries(grouped);
  if (!items.length) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 10,
          fontFamily: FONT.body,
        }}
      >
        Sources ({items.length})
      </div>
      {items.map(([name, snips], i) => {
        const isOpen = open === name;
        const pdfUrl = snips[0]?.pdf_url || null;
        return (
          <div
            key={name}
            style={{
              borderTop: `1px solid ${C.border}`,
              transition: "all 0.2s",
            }}
          >
            <div
              onClick={() => setOpen(isOpen ? null : name)}
              style={{
                padding: "10px 0",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    color: C.burgundy,
                    fontWeight: 600,
                    minWidth: 16,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: FONT.body,
                    color: C.text,
                    fontWeight: 500,
                  }}
                >
                  {name}
                </span>
                {snips.length > 1 && (
                  <span
                    style={{
                      fontSize: 10,
                      color: C.textMuted,
                      fontFamily: FONT.mono,
                    }}
                  >
                    ({snips.length})
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 11,
                      color: C.burgundy,
                      textDecoration: "none",
                      fontFamily: FONT.body,
                      fontWeight: 500,
                      borderBottom: `1px solid ${C.burgundyBorder}`,
                      paddingBottom: 1,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = C.burgundy)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = C.burgundyBorder)
                    }
                  >
                    View Source ↗
                  </a>
                )}
                <span
                  style={{
                    fontSize: 10,
                    color: C.textLight,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform 0.2s",
                  }}
                >
                  ▾
                </span>
              </div>
            </div>
            {isOpen && (
              <div style={{ paddingBottom: 12, paddingLeft: 26 }}>
                {snips.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 12,
                      color: C.textSecondary,
                      lineHeight: 1.7,
                      fontFamily: FONT.body,
                      marginBottom: 6,
                      paddingLeft: 10,
                      borderLeft: `2px solid ${C.burgundyBorder}`,
                    }}
                  >
                    {s.snippet}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Metric ──
function Stat({ label, value, accent }) {
  return (
    <div style={{ textAlign: "center", minWidth: 70 }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: accent || C.text,
          fontFamily: FONT.mono,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: FONT.body,
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Agent trace ──
function Trace({ metadata }) {
  if (!metadata?.steps) return null;
  return (
    <div
      style={{
        marginTop: 20,
        padding: "16px 0",
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 10,
          fontFamily: FONT.body,
        }}
      >
        Agent Trace
      </div>
      {metadata.steps.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontFamily: FONT.mono,
            marginBottom: 4,
            color: C.textSecondary,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              flexShrink: 0,
              background:
                s.action === "search"
                  ? C.burgundy
                  : s.is_sufficient
                    ? C.green
                    : C.amber,
            }}
          />
          <span style={{ color: C.textMuted, minWidth: 20 }}>R{s.round}</span>
          {s.action === "search" ? (
            <span>
              {s.query?.slice(0, 55)}
              {s.query?.length > 55 ? "…" : ""}{" "}
              <span style={{ color: C.textMuted }}>
                → {s.new_chunks_added} new
              </span>
            </span>
          ) : (
            <span style={{ color: s.is_sufficient ? C.green : C.amber }}>
              confidence {s.confidence} {s.is_sufficient ? "✓" : "✗"}
            </span>
          )}
        </div>
      ))}
      {metadata.routing_plan && (
        <div
          style={{
            fontSize: 11,
            color: C.textMuted,
            fontFamily: FONT.body,
            marginTop: 8,
          }}
        >
          Router: {metadata.routing_plan.category} ·{" "}
          {metadata.routing_plan.complexity}
        </div>
      )}
    </div>
  );
}

// ── Follow-ups ──
function FollowUps({ question, result, onSelect, apiBase }) {
  const [sug, setSug] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!result?.answer || !question) return;
    setSug([]);
    setLoading(true);
    fetch(`${apiBase}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer: result.answer }),
    })
      .then((r) => r.json())
      .then((data) => setSug(data.suggestions || []))
      .catch(() => setSug([]))
      .finally(() => setLoading(false));
  }, [question, result]);

  if (!result) return null;

  if (loading) return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: FONT.body }}>
        Follow-up
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[120, 160, 140].map((w, i) => (
          <div key={i} style={{ height: 28, width: w, borderRadius: 4, background: C.surfaceAlt, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  if (!sug.length) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: FONT.body }}>
        Follow-up
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sug.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            style={{ padding: "5px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.white, color: C.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: FONT.body, transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.burgundy; e.currentTarget.style.color = C.burgundy; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Answer block ──
function Answer({ result, mode, onRetry }) {
  if (!result) return null;
  const isAgent = mode === "agent";
  return (
    <div style={{ animation: "fadeUp 0.3s ease-out", marginTop: 28 }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Metrics */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 20,
          padding: "12px 0",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <Stat
          label="Latency"
          value={`${(result.latency_ms / 1000).toFixed(1)}s`}
          accent={result.latency_ms < 10000 ? C.green : C.amber}
        />
        <Stat label="Chunks" value={result.chunks_used} accent={C.burgundy} />
        <Stat label="Tokens" value={result.tokens_used?.toLocaleString()} />
        {isAgent && result.sufficiency_confidence != null && (
          <Stat
            label="Confidence"
            value={`${Math.round(result.sufficiency_confidence * 100)}%`}
            accent={result.sufficiency_confidence >= 0.7 ? C.green : C.amber}
          />
        )}
      </div>

      {/* Response */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: C.burgundy,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: C.white,
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.text,
              fontFamily: FONT.body,
            }}
          >
            GeriAssist{isAgent ? " Agent" : ""}
          </span>
          {isAgent && (
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 3,
                border: `1px solid ${C.burgundyBorder}`,
                color: C.burgundy,
                fontWeight: 600,
                fontFamily: FONT.mono,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Agentic
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.85,
            color: C.textSecondary,
            fontFamily: FONT.body,
          }}
        >
          <Md text={result.answer} />
        </div>

        {/* Copy + Retry */}
        <div
          style={{
            display: "flex",
            gap: 2,
            marginTop: 14,
            paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <IconBtn
            label="Copy"
            isCopy
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            }
            onClick={() =>
              navigator.clipboard.writeText(result.answer.replace(/\*\*/g, ""))
            }
          />
          <IconBtn
            label="Retry"
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            }
            onClick={onRetry}
          />
        </div>
      </div>

      <Sources citations={result.citations} />
      {isAgent && result.agent_metadata && (
        <Trace metadata={result.agent_metadata} />
      )}
    </div>
  );
}

// ── Example questions ──
const EXAMPLES = [
  "What are the main risk factors for falls in elderly patients?",
  "How should caregivers manage behavioral symptoms in dementia?",
  "What medications should be avoided in older adults?",
  "What is the WHO Decade of Healthy Ageing?",
];

// ── Main ──
export default function GeriAssist() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("agent");
  const [loading, setLoading] = useState(false);
  const [thread, setThread] = useState([]); // [{id, question, mode, result, error}]
  const [stats, setStats] = useState(null);
  const ref = useRef(null);
  const bottomRef = useRef(null);

  const API = "http://localhost:8000";

  useEffect(() => {
    fetch(`${API}/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    ref.current?.focus();
  }, []);

  // Scroll to bottom whenever thread updates or loading changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, loading]);

  const submit = async (override) => {
    const text = (override || q).trim();
    if (!text || loading) return;
    setQ("");
    setLoading(true);
    const entryMode = mode;
    const id = Date.now();
    // Add pending entry immediately so user sees their question
    setThread((p) => [...p, { id, question: text, mode: entryMode, result: null, error: null }]);
    const ep = entryMode === "agent" ? "/query/agent" : "/query";
    try {
      const res = await fetch(`${API}${ep}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, top_k: 5 }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Failed");
      }
      const data = await res.json();
      setThread((p) => p.map((entry) => entry.id === id ? { ...entry, result: data } : entry));
      fetch(`${API}/stats`).then((r) => r.json()).then(setStats).catch(() => {});
    } catch (e) {
      setThread((p) => p.map((entry) => entry.id === id ? { ...entry, error: e.message } : entry));
    } finally {
      setLoading(false);
    }
  };

  const clearThread = () => setThread([]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, overflow: "hidden" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div style={{ flexShrink: 0, maxWidth: 740, width: "100%", margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <header
          style={{
            paddingTop: 56,
            paddingBottom: 32,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                background: C.burgundy,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                color: C.white,
              }}
            >
              G
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                margin: 0,
                fontFamily: FONT.display,
                color: C.text,
                letterSpacing: "-0.01em",
              }}
            >
              GeriAssist
            </h1>
          </div>
          <p
            style={{
              fontSize: 13,
              color: C.textMuted,
              margin: 0,
              fontFamily: FONT.body,
              lineHeight: 1.5,
            }}
          >
            Geriatric Clinical Knowledge System · Retrieval-Augmented Generation
            with Agentic Search
          </p>
        </header>

        {/* Stats bar */}
        {stats && (
          <div
            style={{
              display: "flex",
              gap: 24,
              padding: "16px 0",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {[
              { l: "research papers indexed", v: stats.documents },
              { l: "text chunks", v: stats.chunks?.toLocaleString() },
              { l: "vector embeddings", v: stats.vectors?.toLocaleString() },
              { l: "queries processed", v: stats.queries_logged },
            ].map(({ l, v }) => (
              <div key={l}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: FONT.mono,
                    color: C.text,
                  }}
                >
                  {v}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: C.textMuted,
                    marginLeft: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontFamily: FONT.body,
                  }}
                >
                  {l}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>{/* end static top */}

      {/* ── Scrollable messages area ── */}
      <div style={{ flex: 1, overflowY: "auto", maxWidth: 740, width: "100%", margin: "0 auto", padding: "0 24px 20px" }}>

        {/* ── Conversation thread ── */}
        {thread.length > 0 && (
          <div style={{ marginTop: 32 }}>
            {thread.map((entry, idx) => {
              const isLast = idx === thread.length - 1;
              return (
                <div
                  key={entry.id}
                  style={{
                    marginBottom: 40,
                    paddingBottom: 40,
                    borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                    animation: "fadeUp 0.3s ease-out",
                  }}
                >
                  {/* User question bubble */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        background: C.surfaceAlt,
                        border: `1px solid ${C.border}`,
                        borderRadius: "8px 8px 2px 8px",
                        padding: "10px 14px",
                        fontSize: 14,
                        fontFamily: FONT.body,
                        color: C.text,
                        lineHeight: 1.5,
                      }}
                    >
                      {entry.question}
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 9,
                          color: C.textLight,
                          fontFamily: FONT.mono,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {entry.mode === "agent" ? "Agent RAG" : "Standard RAG"}
                      </div>
                    </div>
                  </div>

                  {/* Answer or loading */}
                  {!entry.result && !entry.error && isLast && loading ? (
                    <Typing />
                  ) : entry.error ? (
                    <div
                      style={{
                        padding: "10px 14px",
                        border: `1px solid ${C.burgundyBorder}`,
                        borderRadius: 4,
                        fontSize: 13,
                        color: C.red,
                        fontFamily: FONT.body,
                        background: C.burgundySoft,
                      }}
                    >
                      {entry.error}
                    </div>
                  ) : entry.result ? (
                    <>
                      <Answer
                        result={entry.result}
                        mode={entry.mode}
                        onRetry={() => submit(entry.question)}
                      />
                      {isLast && (
                        <FollowUps
                          question={entry.question}
                          result={entry.result}
                          onSelect={(s) => submit(s)}
                          apiBase={API}
                        />
                      )}
                    </>
                  ) : null}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Empty state */}
        {thread.length === 0 && !loading && (
          <div
            style={{
              marginTop: 48,
              textAlign: "center",
              color: C.textLight,
              fontFamily: FONT.body,
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>◈</div>
            Ask a geriatric clinical question to begin
          </div>
        )}

        {/* Clear thread */}
        {thread.length > 0 && !loading && (
          <div style={{ textAlign: "center", marginTop: 8, marginBottom: 16 }}>
            <button
              onClick={clearThread}
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                fontSize: 12,
                color: C.textSecondary,
                fontFamily: FONT.body,
                cursor: "pointer",
                padding: "6px 14px",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.burgundy; e.currentTarget.style.color = C.burgundy; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
            >
              ↺ Clear conversation
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px 0 24px", fontSize: 11, color: C.textLight, fontFamily: FONT.body }}>
          GeriAssist v0.1.0 ·{" "}
          {stats ? `${stats.documents} documents · ${stats.vectors?.toLocaleString()} vectors` : "…"}{" "}
          · FastAPI + FAISS + OpenAI · Built by Mama Thomas
        </div>
      </div>{/* end scrollable messages */}

      {/* ── Fixed bottom input bar ── */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, background: C.bg, padding: "14px 0 0" }}>
        <div style={{ maxWidth: 740, margin: "0 auto", padding: "0 24px 16px" }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
            {["agent", "standard"].map((key) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  padding: "6px 14px",
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: mode === key ? 700 : 500,
                  fontFamily: FONT.body,
                  transition: "all 0.15s",
                  borderRadius: key === "agent" ? "4px 0 0 4px" : "0 4px 4px 0",
                  marginLeft: key === "standard" ? -1 : 0,
                  background: mode === key ? C.burgundy : C.white,
                  color: mode === key ? C.white : C.textSecondary,
                  borderColor: mode === key ? C.burgundy : C.border,
                  zIndex: mode === key ? 1 : 0,
                  position: "relative",
                  letterSpacing: mode === key ? "0.01em" : 0,
                }}
              >
                {key === "agent" ? "Agent RAG (multi-step)" : "Standard RAG (single step)"}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div style={{ display: "flex", gap: 10 }}>
            <textarea
              ref={ref}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask a geriatric clinical question…"
              rows={2}
              style={{
                flex: 1,
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: "10px 14px",
                color: C.text,
                fontSize: 14,
                fontFamily: FONT.body,
                resize: "none",
                outline: "none",
                lineHeight: 1.6,
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.burgundy)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            <button
              onClick={() => submit()}
              disabled={loading || !q.trim()}
              style={{
                padding: "0 20px",
                borderRadius: 4,
                border: `1px solid ${C.burgundy}`,
                cursor: loading ? "wait" : "pointer",
                background: C.burgundy,
                color: C.white,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: FONT.body,
                transition: "all 0.15s",
                opacity: !q.trim() ? 0.4 : 1,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = C.burgundyLight; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.burgundy)}
            >
              {loading ? "Searching…" : "Ask"}
            </button>
          </div>

          {/* Example chips — only before conversation starts */}
          {thread.length === 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setQ(ex); ref.current?.focus(); }}
                  style={{ padding: "3px 9px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.white, color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: FONT.body, transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.burgundy; e.currentTarget.style.color = C.burgundy; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                >
                  {ex.length > 48 ? ex.slice(0, 48) + "…" : ex}
                </button>
              ))}
            </div>
          )}

          {/* Tip text */}
          <p style={{ margin: "8px 0 0", fontSize: 11, color: C.textLight, fontFamily: FONT.body, textAlign: "center" }}>
            Tip: Each question is answered independently. Include the topic again in follow-up questions for best results.
          </p>
        </div>
      </div>
    </div>
  );
}
