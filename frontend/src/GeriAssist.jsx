import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0a0f1a",
  surface: "#111827",
  surfaceHover: "#1a2235",
  border: "#1e293b",
  borderActive: "#3b82f6",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#475569",
  accent: "#3b82f6",
  accentGlow: "rgba(59, 130, 246, 0.15)",
  accentSoft: "rgba(59, 130, 246, 0.08)",
  green: "#10b981",
  greenSoft: "rgba(16, 185, 129, 0.1)",
  amber: "#f59e0b",
  amberSoft: "rgba(245, 158, 11, 0.1)",
  red: "#ef4444",
  redSoft: "rgba(239, 68, 68, 0.1)",
};



// ── Markdown renderer ──
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.trim()) { elements.push(<div key={key++} style={{ height: 12 }} />); continue; }

    const parts = [];
    let remaining = line;
    let partKey = 0;
    while (remaining.includes("**")) {
      const start = remaining.indexOf("**");
      if (start > 0) parts.push(<span key={partKey++}>{remaining.slice(0, start)}</span>);
      remaining = remaining.slice(start + 2);
      const end = remaining.indexOf("**");
      if (end === -1) { parts.push(<span key={partKey++}>**{remaining}</span>); remaining = ""; break; }
      parts.push(<strong key={partKey++} style={{ color: COLORS.text, fontWeight: 600 }}>{remaining.slice(0, end)}</strong>);
      remaining = remaining.slice(end + 2);
    }
    if (remaining) parts.push(<span key={partKey++}>{remaining}</span>);

    if (line.startsWith("### ")) {
      elements.push(<div key={key++} style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginTop: 16, marginBottom: 6 }}>{line.replace("### ", "")}</div>);
    } else if (/^\d+\.\s/.test(line.trim())) {
      elements.push(
        <div key={key++} style={{ paddingLeft: 8, marginBottom: 4, display: "flex", gap: 8 }}>
          <span style={{ color: COLORS.accent, fontWeight: 600, flexShrink: 0 }}>{line.trim().match(/^\d+\./)[0]}</span>
          <span>{parts.length > 1 ? parts : line.trim().replace(/^\d+\.\s*/, "")}</span>
        </div>
      );
    } else if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      elements.push(
        <div key={key++} style={{ paddingLeft: 16, marginBottom: 4, display: "flex", gap: 8 }}>
          <span style={{ color: COLORS.accent }}>•</span>
          <span>{parts.length > 1 ? parts : line.trim().replace(/^[-•]\s*/, "")}</span>
        </div>
      );
    } else {
      elements.push(<div key={key++} style={{ marginBottom: 4 }}>{parts.length > 1 ? parts : line}</div>);
    }
  }
  return elements;
}

// ── Typing indicator ──
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 6, padding: "20px 0", alignItems: "center" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, #8b5cf6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>G</div>
      <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
        {[0, 1, 2].map(i => (<div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.textMuted, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />))}
      </div>
      <style>{`@keyframes pulse { 0%,80%,100% { opacity:0.3; transform:scale(0.8); } 40% { opacity:1; transform:scale(1.2); } }`}</style>
    </div>
  );
}

// ── Citations panel with dedup, sequential numbering, and PDF links ──
function CitationsPanel({ citations }) {
  const [expandedSource, setExpandedSource] = useState(null);
  if (!citations?.length) return null;

  // Group by source, filter test docs
  const grouped = {};
  citations.forEach((c) => {
    const name = c.source;
    if (name.toLowerCase().includes("test doc") || name.toLowerCase().includes("test_doc")) return;
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(c);
  });

  const sources = Object.entries(grouped);
  if (!sources.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
        Sources ({sources.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sources.map(([sourceName, snippets], sourceIndex) => {
          const isExpanded = expandedSource === sourceName;
          const pdfUrl = snippets[0]?.pdf_url || null;
          return (
            <div key={sourceName} style={{ background: COLORS.accentSoft, border: `1px solid ${isExpanded ? COLORS.accent : COLORS.border}`, borderRadius: 8, overflow: "hidden", transition: "all 0.2s ease" }}>
              <div
                onClick={() => setExpandedSource(isExpanded ? null : sourceName)}
                style={{ padding: "10px 14px", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.parentElement.style.borderColor = COLORS.accent; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.parentElement.style.borderColor = COLORS.border; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: COLORS.accent, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                      {sourceIndex + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>{sourceName}</span>
                    {snippets.length > 1 && (
                      <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                        ({snippets.length} refs)
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, color: COLORS.accent, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", padding: "2px 8px", borderRadius: 4, border: `1px solid ${COLORS.accent}30`, transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = COLORS.accentGlow; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        View Source ↗
                      </a>
                    )}
                    <span style={{ fontSize: 11, color: COLORS.textMuted, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${COLORS.border}`, marginTop: 0, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {snippets.map((s, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", paddingLeft: 8, borderLeft: `2px solid ${COLORS.accent}30` }}>
                      {s.snippet}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Metric badge ──
function MetricBadge({ label, value, color = COLORS.textMuted }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 16px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, minWidth: 80 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
      <span style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
    </div>
  );
}

// ── Agent trace ──
function AgentTrace({ metadata }) {
  if (!metadata?.steps) return null;
  return (
    <div style={{ marginTop: 16, padding: 16, background: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Agent Trace</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {metadata.steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, background: step.action === "search" ? COLORS.accent : step.is_sufficient ? COLORS.green : COLORS.amber }}>
              {step.action === "search" ? "S" : "E"}
            </span>
            <span style={{ color: COLORS.textMuted }}>R{step.round}</span>
            {step.action === "search" ? (
              <span style={{ color: COLORS.text }}>
                Search: <span style={{ color: COLORS.accent }}>"{step.query?.slice(0, 50)}{step.query?.length > 50 ? "..." : ""}"</span>
                <span style={{ color: COLORS.textDim, marginLeft: 8 }}>→ {step.new_chunks_added} new chunks</span>
              </span>
            ) : (
              <span style={{ color: step.is_sufficient ? COLORS.green : COLORS.amber }}>
                Evaluate: confidence {step.confidence} {step.is_sufficient ? "✓ sufficient" : "✗ insufficient"}
              </span>
            )}
          </div>
        ))}
      </div>
      {metadata.routing_plan && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}`, fontSize: 12, color: COLORS.textDim, fontFamily: "'DM Sans', sans-serif" }}>
          <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>Router:</span> {metadata.routing_plan.category} · {metadata.routing_plan.complexity}
        </div>
      )}
    </div>
  );
}

// ── Follow-up suggestions ──
function FollowUpSuggestions({ question, result, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    if (!result?.answer) return;
    const q = question.toLowerCase();
    const followUps = [];
    if (q.includes("fall") || q.includes("steadi")) {
      followUps.push("What exercises can reduce fall risk?", "How should medications be reviewed for fall prevention?", "What home modifications prevent falls?");
    } else if (q.includes("dementia") || q.includes("alzheimer")) {
      followUps.push("What caregiver resources are available?", "How does dementia affect fall risk?", "What are non-drug interventions for dementia?");
    } else if (q.includes("medication") || q.includes("medicine")) {
      followUps.push("What is polypharmacy and why is it risky?", "What does the Beers Criteria recommend?", "How should medication reviews be conducted?");
    } else if (q.includes("exercise") || q.includes("physical")) {
      followUps.push("What balance exercises are recommended?", "How does exercise reduce fall risk?", "What are the WHO guidelines on physical activity for older adults?");
    } else if (q.includes("depression") || q.includes("mental")) {
      followUps.push("How does depression affect fall risk?", "What are signs of isolation in older adults?", "What treatments exist for depression in older adults?");
    } else if (q.includes("blood pressure") || q.includes("pain") || q.includes("sleep")) {
      followUps.push("How does this condition affect fall risk?", "What are non-drug management options?", "What medications should be avoided?");
    } else if (q.includes("who") || q.includes("policy") || q.includes("ageing")) {
      followUps.push("What is integrated care for older people?", "What are age-friendly environments?", "What is the role of ageism in health outcomes?");
    } else {
      followUps.push("What are common fall risk factors for older adults?", "What does the CDC STEADI program recommend?", "How can caregivers support healthy aging?");
    }
    setSuggestions(followUps.slice(0, 3));
  }, [question, result]);

  if (!suggestions.length || !result) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Follow-up Questions</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => onSelect(s)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.accentSoft, color: COLORS.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
          >{s}</button>
        ))}
      </div>
    </div>
  );
}

function IconButton({ label, icon, onClick, isCopy }) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setClicked(false);
      }}
    >
      <button
        onClick={() => {
          onClick();
          if (isCopy) {
            setClicked(true);
            setTimeout(() => setClicked(false), 1500);
          }
        }}
        style={{
          padding: 6,
          borderRadius: 6,
          border: "none",
          background: hovered ? COLORS.surfaceHover : "transparent",
          color: clicked
            ? COLORS.green
            : hovered
              ? COLORS.text
              : COLORS.textDim,
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
        }}
      >
        {icon}
      </button>
      {hovered && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "4px 8px",
            borderRadius: 4,
            background: COLORS.text,
            color: COLORS.bg,
            fontSize: 11,
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {clicked ? "Copied!" : label}
        </div>
      )}
    </div>
  );
}
// ── Answer block ──
function AnswerBlock({ result, mode, onRegenerate }) {
  if (!result) return null;
  const isAgent = mode === "agent";
  return (
    <div style={{ animation: "fadeIn 0.4s ease-out", marginTop: 24 }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}
      >
        <MetricBadge
          label="Latency"
          value={`${(result.latency_ms / 1000).toFixed(1)}s`}
          color={result.latency_ms < 10000 ? COLORS.green : COLORS.amber}
        />
        <MetricBadge
          label="Chunks"
          value={result.chunks_used}
          color={COLORS.accent}
        />
        <MetricBadge
          label="Tokens"
          value={result.tokens_used?.toLocaleString()}
        />
        {isAgent && result.sufficiency_confidence != null && (
          <MetricBadge
            label="Confidence"
            value={`${Math.round(result.sufficiency_confidence * 100)}%`}
            color={
              result.sufficiency_confidence >= 0.7 ? COLORS.green : COLORS.amber
            }
          />
        )}
      </div>
      <div
        style={{
          background: COLORS.surface,
          borderRadius: 12,
          border: `1px solid ${COLORS.border}`,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.accent}, #8b5cf6)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.text,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            GeriAssist{isAgent ? " Agent" : ""}
          </span>
          {isAgent && (
            <span
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(139, 92, 246, 0.15)",
                color: "#a78bfa",
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              AGENTIC
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.8,
            color: COLORS.text,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {renderMarkdown(result.answer)}
        </div>
        {/* Copy + Retry */}
        <div style={{ display: "flex", gap: 2, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
          <IconButton
            label="Copy"
            isCopy={true}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
            onClick={() => navigator.clipboard.writeText(result.answer.replace(/\*\*/g, ""))}
          />
          <IconButton
            label="Retry"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
            onClick={onRegenerate}
          />
        </div>
      </div>
      <CitationsPanel citations={result.citations} />
      {isAgent && result.agent_metadata && (
        <AgentTrace metadata={result.agent_metadata} />
      )}
    </div>
  );
}

// ── Stats panel ──
function StatsPanel({ stats }) {
  if (!stats) return null;
  const items = [
    { label: "Documents", value: stats.documents, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { label: "Chunks", value: stats.chunks?.toLocaleString(), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { label: "Vectors", value: stats.vectors?.toLocaleString(), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { label: "Queries", value: stats.queries_logged, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {items.map(({ label, value, icon }) => (
        <div key={label} style={{ background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: COLORS.textDim }}>{icon}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
            <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const EXAMPLE_QUESTIONS = [
  "What are the main risk factors for falls in elderly patients?",
  "How should caregivers manage behavioral symptoms in dementia?",
  "What medications should be avoided in older adults?",
  "What is the WHO Decade of Healthy Ageing?",
  "How can chronic pain be managed in older adults?",
  "What exercise recommendations exist for adults over 65?",
];

export default function GeriAssist() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("agent");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ agent: null, standard: null });
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  const API = "http://localhost:8000";
  const currentResult = results[mode];

  useEffect(() => {
    fetch(`${API}/stats`).then(r => r.json()).then(setStats).catch(() => {});
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (overrideQuestion) => {
    const q = (overrideQuestion || question).trim();
    if (!q || loading) return;
    if (overrideQuestion) setQuestion(overrideQuestion);
    setLoading(true);
    setError(null);

    const endpoint = mode === "agent" ? "/query/agent" : "/query";
    try {
      const res = await fetch(`${API}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, top_k: 5 }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Query failed"); }
      const data = await res.json();
      setResults(prev => ({ ...prev, [mode]: data }));
      setHistory(prev => [{ question: q, mode, timestamp: new Date() }, ...prev.slice(0, 9)]);
      fetch(`${API}/stats`).then(r => r.json()).then(setStats).catch(() => {});
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleFollowUp = (followUpQuestion) => {
    setQuestion(followUpQuestion);
    setTimeout(() => handleSubmit(followUpQuestion), 100);
  };

  return (
    <div
      style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 24px",
          position: "relative",
        }}
      >
        <header
          style={{ paddingTop: 48, paddingBottom: 40, textAlign: "center" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${COLORS.accent}, #8b5cf6)`,
                boxShadow: `0 0 30px ${COLORS.accentGlow}`,
                fontSize: 20,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              G
            </div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                margin: 0,
                fontFamily: "'Playfair Display', serif",
                letterSpacing: "-0.02em",
                background: `linear-gradient(135deg, ${COLORS.text}, ${COLORS.accent})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              GeriAssist
            </h1>
          </div>
          <p
            style={{
              fontSize: 14,
              color: COLORS.textMuted,
              margin: 0,
              fontFamily: "'DM Sans', sans-serif",
              maxWidth: 500,
              marginInline: "auto",
              lineHeight: 1.6,
            }}
          >
            Geriatric Clinical Knowledge System | Retrieval-Augmented Generation
            with Agentic Search
          </p>
        </header>

        {stats && <StatsPanel stats={stats} />}

        <div
          style={{
            marginTop: 24,
            background: COLORS.surface,
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 14,
              background: COLORS.bg,
              borderRadius: 8,
              padding: 3,
              width: "fit-content",
            }}
          >
            {[
              { key: "agent", label: "Agent RAG" },
              { key: "standard", label: "Standard RAG" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                  background: mode === key ? COLORS.accent : "transparent",
                  color: mode === key ? "#fff" : COLORS.textMuted,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask a geriatric clinical question..."
              rows={2}
              style={{
                flex: 1,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "12px 16px",
                color: COLORS.text,
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                resize: "none",
                outline: "none",
                lineHeight: 1.6,
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
              onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !question.trim()}
              style={{
                padding: "0 24px",
                borderRadius: 10,
                border: "none",
                cursor: loading ? "wait" : "pointer",
                background: loading
                  ? COLORS.textDim
                  : `linear-gradient(135deg, ${COLORS.accent}, #8b5cf6)`,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: loading ? "none" : `0 4px 20px ${COLORS.accentGlow}`,
                transition: "all 0.2s",
                opacity: !question.trim() ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "Searching..." : "Ask →"}
            </button>
          </div>
          <div
            style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}
          >
            {EXAMPLE_QUESTIONS.slice(0, 4).map((eq, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuestion(eq);
                  inputRef.current?.focus();
                }}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.border}`,
                  background: "transparent",
                  color: COLORS.textDim,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.accent;
                  e.currentTarget.style.color = COLORS.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.color = COLORS.textDim;
                }}
              >
                {eq.length > 45 ? eq.slice(0, 45) + "..." : eq}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: COLORS.redSoft,
              borderRadius: 10,
              border: `1px solid rgba(239,68,68,0.2)`,
              fontSize: 13,
              color: COLORS.red,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {error}
          </div>
        )}
        {loading && <TypingIndicator />}
        <AnswerBlock
          result={currentResult}
          mode={mode}
          onRegenerate={() => handleSubmit()}
        />
        <FollowUpSuggestions
          question={question}
          result={currentResult}
          onSelect={handleFollowUp}
        />

        {history.length > 0 && !loading && (
          <div
            style={{
              marginTop: 40,
              paddingTop: 24,
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Recent Queries
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuestion(h.question);
                    setMode(h.mode);
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid transparent",
                    borderRadius: 8,
                    padding: "8px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.surfaceHover;
                    e.currentTarget.style.borderColor = COLORS.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: COLORS.textMuted,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {h.question.slice(0, 70)}
                    {h.question.length > 70 ? "..." : ""}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: COLORS.textDim,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background:
                        h.mode === "agent"
                          ? "rgba(139,92,246,0.1)"
                          : COLORS.accentSoft,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {h.mode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <footer
          style={{
            textAlign: "center",
            padding: "48px 0 32px",
            fontSize: 11,
            color: COLORS.textDim,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          GeriAssist v0.1.0 ·{" "}
          {stats
            ? `${stats.documents} documents · ${stats.vectors?.toLocaleString()} vectors`
            : "Loading..."}{" "}
          · FastAPI + FAISS + OpenAI · Built by Mama Thomas
        </footer>
      </div>
    </div>
  );
}
