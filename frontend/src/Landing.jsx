import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
   TOKENS
───────────────────────────────────────────── */
const C = {
  cream: "#FAFAF7",
  white: "#FFFFFF",
  surface: "#F4F2EE",
  border: "#E5E1DA",
  borderLight: "#EDE9E3",
  text: "#141210",
  textSecondary: "#3D3830",
  textMuted: "#7A7268",
  textLight: "#AEA89E",
  burgundy: "#8B1A2E",
  burgundyMid: "#A02035",
  burgundyLight: "#BC3448",
  burgundySoft: "rgba(139,26,46,0.07)",
  burgundyBorder: "rgba(139,26,46,0.18)",
  gold: "#C49A3C",
  goldSoft: "rgba(196,154,60,0.12)",
};

const FONT = {
  display: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
  serif: "'Cormorant Garamond', Georgia, serif",
  body: "'DM Sans', 'Source Sans 3', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'IBM Plex Mono', monospace",
};

/* ─────────────────────────────────────────────
   SCROLL REVEAL HOOK
───────────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─────────────────────────────────────────────
   MEDICAL ILLUSTRATION . hand-crafted SVG
───────────────────────────────────────────── */
function MedicalIllustration() {
  return (
    <svg
      viewBox="0 0 520 440"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8F5F0" />
          <stop offset="100%" stopColor="#EDE8E0" />
        </linearGradient>
        <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5DEC8" />
          <stop offset="100%" stopColor="#E8C9A8" />
        </linearGradient>
        <linearGradient id="coatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0EDE8" />
        </linearGradient>
        <linearGradient id="burgundyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9B1F33" />
          <stop offset="100%" stopColor="#7A1525" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F0EDE8" />
          <stop offset="100%" stopColor="#E8E3DC" />
        </linearGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#00000015" />
        </filter>
        <filter id="subtleShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#00000010" />
        </filter>
        <clipPath id="screenClip">
          <rect x="280" y="148" width="180" height="120" rx="4" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="520" height="440" fill="url(#bgGrad)" />

      {/* Subtle grid pattern */}
      {Array.from({ length: 18 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={i * 28}
          x2="520"
          y2={i * 28}
          stroke="#E0DBD3"
          strokeWidth="0.5"
          opacity="0.6"
        />
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={i * 28}
          y1="0"
          x2={i * 28}
          y2="440"
          stroke="#E0DBD3"
          strokeWidth="0.5"
          opacity="0.6"
        />
      ))}

      {/* ── Desk surface ── */}
      <rect x="0" y="330" width="520" height="110" fill="#EAE5DC" />
      <rect x="0" y="330" width="520" height="3" fill="#D8D2C8" />

      {/* ── Laptop ── */}
      <g filter="url(#softShadow)">
        {/* Screen back */}
        <rect x="272" y="140" width="196" height="136" rx="8" fill="#D8D3CA" />
        {/* Screen face */}
        <rect x="278" y="146" width="184" height="124" rx="6" fill="#2A2520" />
        {/* Screen content */}
        <rect
          x="283"
          y="151"
          width="174"
          height="114"
          rx="4"
          fill="url(#screenGrad)"
          clipPath="url(#screenClip)"
        />

        {/* Chat interface mockup on screen */}
        <rect
          x="286"
          y="154"
          width="168"
          height="18"
          rx="3"
          fill="#8B1A2E"
          opacity="0.9"
        />
        <text
          x="370"
          y="167"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize="7"
          fill="white"
          fontWeight="600"
        >
          GeriAssist
        </text>

        {/* Chat bubbles */}
        <rect x="320" y="178" width="130" height="14" rx="4" fill="#F0EDE8" />
        <text
          x="329"
          y="188"
          fontFamily="sans-serif"
          fontSize="6.5"
          fill="#3D3830"
        >
          What are fall risk factors?
        </text>

        <rect x="286" y="198" width="148" height="22" rx="4" fill="white" />
        <rect x="290" y="202" width="100" height="4" rx="2" fill="#E0DBD3" />
        <rect x="290" y="210" width="80" height="4" rx="2" fill="#E0DBD3" />

        <rect
          x="286"
          y="226"
          width="80"
          height="10"
          rx="3"
          fill="#8B1A2E"
          opacity="0.15"
        />
        <text
          x="291"
          y="234"
          fontFamily="sans-serif"
          fontSize="6"
          fill="#8B1A2E"
          fontWeight="600"
        >
          View Source ↗
        </text>

        {/* Laptop base */}
        <rect x="252" y="276" width="236" height="10" rx="5" fill="#C8C3BA" />
        <rect x="272" y="274" width="196" height="4" rx="2" fill="#D8D3CA" />
      </g>

      {/* ── Research papers stack ── */}
      <g filter="url(#subtleShadow)">
        <rect
          x="48"
          y="265"
          width="140"
          height="68"
          rx="4"
          fill="white"
          transform="rotate(-4, 48, 265)"
        />
        <rect
          x="52"
          y="258"
          width="140"
          height="68"
          rx="4"
          fill="#F8F5F0"
          transform="rotate(-1, 52, 258)"
        />
        <rect x="56" y="252" width="140" height="68" rx="4" fill="white" />
        {/* Paper lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x="68"
            y={264 + i * 9}
            width={88 + (i % 3) * 16}
            height="3"
            rx="1.5"
            fill="#E8E3DC"
          />
        ))}
        {/* Red accent line */}
        <rect
          x="68"
          y="264"
          width="30"
          height="3"
          rx="1.5"
          fill="#8B1A2E"
          opacity="0.5"
        />
        <rect
          x="56"
          y="256"
          width="140"
          height="8"
          rx="4"
          fill="#8B1A2E"
          opacity="0.08"
        />
        <text
          x="76"
          y="262"
          fontFamily="sans-serif"
          fontSize="6.5"
          fill="#8B1A2E"
          fontWeight="700"
          opacity="0.7"
        >
          PEER-REVIEWED RESEARCH
        </text>
      </g>

      {/* ── Caregiver (left figure) ── */}
      {/* Head */}
      <ellipse cx="148" cy="82" rx="26" ry="28" fill="url(#skinGrad)" />
      {/* Hair — dark, pulled back */}
      <path d="M122 74 Q148 48 174 74 L172 68 Q148 42 124 68Z" fill="#3D2E22" />
      <path d="M122 74 Q118 80 120 88 Q122 76 126 74Z" fill="#3D2E22" />
      <path d="M174 74 Q178 80 176 88 Q174 76 170 74Z" fill="#3D2E22" />
      {/* Face features */}
      <ellipse cx="140" cy="84" rx="2.5" ry="3" fill="#C4956A" opacity="0.4" />
      <ellipse cx="156" cy="84" rx="2.5" ry="3" fill="#C4956A" opacity="0.4" />
      <path
        d="M141 94 Q148 99 155 94"
        stroke="#C4956A"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Lab coat body */}
      <path
        d="M114 108 Q114 100 148 98 Q182 100 182 108 L186 230 Q186 238 178 238 L118 238 Q110 238 110 230Z"
        fill="url(#coatGrad)"
        stroke="#E8E3DC"
        strokeWidth="1"
      />
      {/* Coat collar */}
      <path
        d="M140 98 L132 120 L148 114 L164 120 L156 98Z"
        fill="white"
        stroke="#E8E3DC"
        strokeWidth="0.5"
      />
      {/* Stethoscope */}
      <path
        d="M136 118 Q128 138 128 155 Q128 165 138 165 Q148 165 148 155 Q148 148 156 138 Q160 132 162 120"
        stroke="#3D3830"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="138" cy="165" r="7" fill="#3D3830" />
      <circle cx="138" cy="165" r="4" fill="#8B1A2E" opacity="0.7" />
      {/* Coat pocket + pen */}
      <rect
        x="120"
        y="148"
        width="28"
        height="22"
        rx="3"
        fill="#F0EDE8"
        stroke="#E8E3DC"
        strokeWidth="1"
      />
      <rect
        x="128"
        y="143"
        width="3"
        height="14"
        rx="1.5"
        fill="#8B1A2E"
        opacity="0.8"
      />
      {/* Arms */}
      <path
        d="M114 130 Q90 155 92 195 Q93 210 105 215"
        stroke="url(#skinGrad)"
        strokeWidth="22"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M182 130 Q206 155 204 195"
        stroke="url(#skinGrad)"
        strokeWidth="22"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right hand holding clipboard */}
      <rect
        x="196"
        y="190"
        width="44"
        height="56"
        rx="5"
        fill="white"
        filter="url(#subtleShadow)"
      />
      <rect x="208" y="185" width="20" height="10" rx="3" fill="#D8D3CA" />
      <rect x="201" y="202" width="34" height="3" rx="1.5" fill="#E8E3DC" />
      <rect x="201" y="210" width="28" height="3" rx="1.5" fill="#E8E3DC" />
      <rect x="201" y="218" width="32" height="3" rx="1.5" fill="#E8E3DC" />
      <rect
        x="201"
        y="226"
        width="20"
        height="3"
        rx="1.5"
        fill="#8B1A2E"
        opacity="0.4"
      />
      {/* ID badge */}
      <rect
        x="140"
        y="200"
        width="26"
        height="18"
        rx="3"
        fill="#8B1A2E"
        opacity="0.9"
      />
      <circle cx="153" cy="206" r="4" fill="white" opacity="0.3" />
      <rect
        x="144"
        y="213"
        width="18"
        height="2"
        rx="1"
        fill="white"
        opacity="0.5"
      />

      {/* ── Older adult (right figure, seated) ── */}
      {/* Chair back */}
      <rect x="340" y="180" width="8" height="110" rx="4" fill="#D8D3CA" />
      <rect x="388" y="180" width="8" height="110" rx="4" fill="#D8D3CA" />
      <rect x="340" y="178" width="56" height="10" rx="4" fill="#C8C3BA" />
      {/* Head */}
      <ellipse cx="368" cy="108" rx="25" ry="27" fill="url(#skinGrad)" />
      {/* White hair */}
      <path
        d="M343 100 Q368 74 393 100 L391 94 Q368 68 345 94Z"
        fill="#E8E3DC"
      />
      <path d="M343 100 Q340 106 342 115 Q344 104 348 102Z" fill="#D8D3CA" />
      <path d="M393 100 Q396 106 394 115 Q392 104 388 102Z" fill="#D8D3CA" />
      {/* Face */}
      <path
        d="M358 98 Q360 96 362 98"
        stroke="#C4956A"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M374 98 Q376 96 378 98"
        stroke="#C4956A"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M360 116 Q368 121 376 116"
        stroke="#C4956A"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Wrinkle lines */}
      <path
        d="M354 104 Q356 102 358 104"
        stroke="#D4A882"
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M378 104 Q380 102 382 104"
        stroke="#D4A882"
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
      {/* Body — casual sweater */}
      <path
        d="M336 134 Q336 126 368 124 Q400 126 400 134 L403 240 Q403 248 395 248 L341 248 Q333 248 333 240Z"
        fill="#8B9DBB"
        opacity="0.7"
      />
      {/* Sweater details */}
      <path
        d="M360 124 L352 144 L368 138 L384 144 L376 124Z"
        fill="#7A8CAA"
        opacity="0.7"
      />
      {/* Seated legs */}
      <rect
        x="342"
        y="244"
        width="24"
        height="60"
        rx="8"
        fill="#5C6B82"
        opacity="0.6"
      />
      <rect
        x="370"
        y="244"
        width="24"
        height="60"
        rx="8"
        fill="#5C6B82"
        opacity="0.6"
      />
      {/* Feet */}
      <ellipse cx="354" cy="308" rx="14" ry="7" fill="#3D3830" opacity="0.6" />
      <ellipse cx="382" cy="308" rx="14" ry="7" fill="#3D3830" opacity="0.6" />
      {/* Left arm resting on chair */}
      <path
        d="M336 148 Q318 170 318 200"
        stroke="#E8C9A8"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right arm reaching toward caregiver */}
      <path
        d="M400 148 Q415 165 418 185"
        stroke="#E8C9A8"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
      {/* Book / magazine on lap */}
      <rect
        x="344"
        y="228"
        width="50"
        height="34"
        rx="3"
        fill="#FAFAF7"
        stroke="#E8E3DC"
        strokeWidth="1"
      />
      <rect
        x="344"
        y="228"
        width="50"
        height="6"
        rx="3"
        fill="#8B1A2E"
        opacity="0.15"
      />
      <rect x="348" y="240" width="42" height="3" rx="1.5" fill="#E8E3DC" />
      <rect x="348" y="248" width="34" height="3" rx="1.5" fill="#E8E3DC" />
      <rect x="348" y="256" width="38" height="3" rx="1.5" fill="#E8E3DC" />

      {/* ── Connection arc between figures ── */}
      <path
        d="M205 170 Q280 140 330 168"
        stroke="#8B1A2E"
        strokeWidth="1.5"
        strokeDasharray="6 5"
        fill="none"
        opacity="0.25"
      />
      <circle cx="205" cy="170" r="3" fill="#8B1A2E" opacity="0.3" />
      <circle cx="330" cy="168" r="3" fill="#8B1A2E" opacity="0.3" />

      {/* ── Floating data nodes ── */}
      {[
        { x: 58, y: 48, r: 14, label: "NIA" },
        { x: 108, y: 32, r: 12, label: "CDC" },
        { x: 158, y: 44, r: 13, label: "WHO" },
        { x: 210, y: 28, r: 14, label: "PMC" },
      ].map(({ x, y, r, label }) => (
        <g key={label}>
          <circle
            cx={x}
            cy={y}
            r={r}
            fill="white"
            stroke={C.border}
            strokeWidth="1"
            filter="url(#subtleShadow)"
          />
          <text
            x={x}
            y={y + 3}
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="6.5"
            fill="#8B1A2E"
            fontWeight="700"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Connection lines from nodes to laptop */}
      {[
        [58, 48],
        [108, 32],
        [158, 44],
        [210, 28],
      ].map(([x, y], i) => (
        <line
          key={i}
          x1={x}
          y1={y + 14}
          x2={300 + i * 10}
          y2={146}
          stroke="#8B1A2E"
          strokeWidth="0.75"
          strokeDasharray="4 3"
          opacity="0.18"
        />
      ))}

      {/* ── Decorative corner ornament ── */}
      <rect
        x="456"
        y="24"
        width="48"
        height="48"
        rx="4"
        fill="white"
        stroke="#E8E3DC"
        strokeWidth="1"
        opacity="0.8"
      />
      <text
        x="480"
        y="42"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="10"
        fill="#8B1A2E"
        fontWeight="700"
        opacity="0.8"
      >
        ◈
      </text>
      <text
        x="480"
        y="56"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="6"
        fill="#7A7268"
        opacity="0.8"
      >
        AGENTIC
      </text>
      <text
        x="480"
        y="64"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontSize="6"
        fill="#7A7268"
        opacity="0.8"
      >
        RAG
      </text>

      {/* ── Bottom label ── */}
      <text
        x="260"
        y="428"
        textAnchor="middle"
        fontFamily="'DM Sans', sans-serif"
        fontSize="10.5"
        fill="#AEA89E"
        letterSpacing="0.06em"
      >
        Connecting clinical knowledge with compassionate care
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────── */
function Counter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal();
  useEffect(() => {
    if (!visible) return;
    const duration = 1800;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, target]);
  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────
   SECTION REVEAL WRAPPER
───────────────────────────────────────────── */
function Reveal({ children, delay = 0, style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIVE PRODUCT DEMO — animated hero widget
───────────────────────────────────────────── */
const DEMO_SEQUENCE = [
  {
    query: "What are the main risk factors for falls in elderly patients?",
    mode: "Agent RAG",
    steps: [
      {
        round: "R1",
        action: "search",
        query: "fall risk factors elderly patients",
        chunks: 5,
      },
      {
        round: "R1",
        action: "search",
        query: "geriatric fall prevention literature",
        chunks: 4,
      },
      { round: "R2", action: "eval", confidence: 0.85, sufficient: true },
    ],
    metrics: {
      latency: "14.2s",
      chunks: 9,
      tokens: "4,812",
      confidence: "85%",
    },
    answer:
      "The main risk factors for falls in elderly patients are multifactorial, spanning both intrinsic and extrinsic domains. Key intrinsic factors include muscle weakness, gait and balance disorders, previous fall history, cognitive impairment, and polypharmacy. Extrinsic factors include environmental hazards, poor lighting, and sedative medications.",
    sources: [
      { title: "CDC STEADI Coordinated Care Plan", num: 1 },
      { title: "PMC Falls In Older Adults — A Practical Approach", num: 2 },
      { title: "WHO Active Ageing Policy Framework", num: 3 },
    ],
  },
  {
    query: "How should caregivers manage behavioral symptoms in dementia?",
    mode: "Agent RAG",
    steps: [
      {
        round: "R1",
        action: "search",
        query: "behavioral symptoms dementia caregiver management",
        chunks: 5,
      },
      {
        round: "R1",
        action: "search",
        query: "BPSD non-pharmacological interventions",
        chunks: 3,
      },
      { round: "R2", action: "eval", confidence: 0.85, sufficient: true },
    ],
    metrics: {
      latency: "16.8s",
      chunks: 8,
      tokens: "5,204",
      confidence: "85%",
    },
    answer:
      "Caregivers should prioritize non-pharmacological approaches first. This includes identifying behavioral triggers, maintaining structured daily routines, using validation therapy, and ensuring adequate pain management. Environmental modifications and caregiver education are strongly recommended by the NIA and WHO guidelines.",
    sources: [
      { title: "NIA Alzheimer's Caregiving Guide", num: 1 },
      { title: "PMC Neuropsychiatric Symptoms In Dementia", num: 2 },
      { title: "WHO Dementia Action Plan 2017-2025", num: 3 },
    ],
  },
];

function LiveDemo() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState("start");
  const [typedQuery, setTypedQuery] = useState("");
  const [stepsDone, setStepsDone] = useState([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [shownAnswer, setShownAnswer] = useState("");
  const [shownSources, setShownSources] = useState([]);
  const [cycleCount, setCycleCount] = useState(0);

  const demo = DEMO_SEQUENCE[demoIdx];

  // Kick off on mount
  useEffect(() => {
    const t = setTimeout(() => setPhase("typing"), 1000);
    return () => clearTimeout(t);
  }, []);

  // Master sequencer
  useEffect(() => {
    const d = DEMO_SEQUENCE[demoIdx];
    let t;

    if (phase === "idle" || phase === "start") {
      if (phase === "idle") {
        setTypedQuery("");
        setStepsDone([]);
        setShowMetrics(false);
        setShownAnswer("");
        setShownSources([]);
      }
      t = setTimeout(() => setPhase("typing"), phase === "idle" ? 900 : 0);
    } else if (phase === "typing") {
      const full = d.query;
      if (typedQuery.length < full.length) {
        t = setTimeout(
          () => setTypedQuery(full.slice(0, typedQuery.length + 1)),
          typedQuery.length === 0 ? 200 : 30 + Math.random() * 20,
        );
      } else {
        t = setTimeout(() => setPhase("searching"), 700);
      }
    } else if (phase === "searching") {
      const nextIdx = stepsDone.length;
      if (nextIdx < d.steps.length) {
        const delay = nextIdx === 0 ? 500 : 1000;
        t = setTimeout(() => {
          const next = d.steps[nextIdx];
          setStepsDone((prev) => {
            const updated = [...prev, next];
            // If this was the last step, schedule transition to answering
            if (updated.length === d.steps.length) {
              setTimeout(() => {
                setShowMetrics(true);
                setPhase("answering");
              }, 900);
            }
            return updated;
          });
        }, delay);
      }
    } else if (phase === "answering") {
      const full = d.answer;
      if (shownAnswer.length < full.length) {
        const chunk = 4 + Math.floor(Math.random() * 4);
        t = setTimeout(
          () => setShownAnswer(full.slice(0, shownAnswer.length + chunk)),
          20,
        );
      } else {
        t = setTimeout(() => setPhase("sources"), 500);
      }
    } else if (phase === "sources") {
      const nextSource = shownSources.length;
      if (nextSource < d.sources.length) {
        t = setTimeout(
          () => setShownSources((prev) => [...prev, d.sources[nextSource]]),
          350,
        );
      } else {
        t = setTimeout(() => setPhase("pause"), 3500);
      }
    } else if (phase === "pause") {
      t = setTimeout(() => {
        setTypedQuery("");
        setStepsDone([]);
        setShowMetrics(false);
        setShownAnswer("");
        setShownSources([]);
        setDemoIdx((prev) => (prev + 1) % DEMO_SEQUENCE.length);
        setCycleCount((c) => c + 1);
        setTimeout(() => setPhase("typing"), 100);
      }, 1400);
    }

    return () => clearTimeout(t);
  }, [phase, typedQuery, stepsDone, shownAnswer, shownSources, demoIdx]);

  const showAnswer =
    phase === "answering" || phase === "sources" || phase === "pause";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        background:
          "linear-gradient(145deg, #1A0F0F 0%, #0F0A0A 40%, #0A0D14 100%)",
        boxShadow:
          "0 4px 8px rgba(0,0,0,0.12), 0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)",
        minHeight: 520,
      }}
    >
      {/* Atmospheric glow effects */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -40,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,26,46,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: -20,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(30,50,80,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "30%",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(196,154,60,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Grain texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />

      {/* Header bar */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: "#8B1A2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              color: "white",
              fontFamily: "Georgia, serif",
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              fontFamily: "Georgia, serif",
              letterSpacing: "-0.01em",
            }}
          >
            GeriAssist
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#8B1A2E",
              fontFamily: "monospace",
              background: "rgba(139,26,46,0.2)",
              border: "1px solid rgba(139,26,46,0.3)",
              padding: "3px 8px",
              borderRadius: 3,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Agent RAG
          </div>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#2D7A4F",
              animation: "livePulse 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: "20px 20px 24px" }}>
        {/* Query card */}
        <div
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "16px 18px",
            marginBottom: 16,
            backdropFilter: "blur(8px)",
            transition: "border-color 0.3s",
            borderColor:
              phase === "typing"
                ? "rgba(139,26,46,0.5)"
                : "rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 10,
            }}
          >
            Clinical Query
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.6,
              fontFamily: "Georgia, serif",
              minHeight: 44,
            }}
          >
            {typedQuery}
            {phase === "typing" && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 16,
                  background: "#8B1A2E",
                  marginLeft: 1,
                  verticalAlign: "text-bottom",
                  animation: "blink 1s step-end infinite",
                }}
              />
            )}
          </div>
          {typedQuery.length > 0 && phase !== "typing" && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "monospace",
                  background: "rgba(255,255,255,0.05)",
                  padding: "3px 8px",
                  borderRadius: 3,
                }}
              >
                Enter ↵
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(139,26,46,0.8)",
                  fontFamily: "monospace",
                  background: "rgba(139,26,46,0.12)",
                  border: "1px solid rgba(139,26,46,0.25)",
                  padding: "3px 8px",
                  borderRadius: 3,
                }}
              >
                ⟳ Agentic Search
              </div>
            </div>
          )}
        </div>

        {/* Agent trace / searching */}
        {stepsDone.length > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.3)",
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              Agent Trace
            </div>
            {stepsDone.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: i < stepsDone.length - 1 ? 8 : 0,
                  animation: "stepIn 0.3s ease-out both",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      step.action === "search"
                        ? "#8B1A2E"
                        : step.sufficient
                          ? "#2D7A4F"
                          : "#A0722A",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    fontFamily: "monospace",
                    minWidth: 20,
                  }}
                >
                  {step.round}
                </span>
                {step.action === "search" ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.55)",
                      fontFamily: "monospace",
                    }}
                  >
                    {step.query.slice(0, 42)}
                    {step.query.length > 42 ? "…" : ""}{" "}
                    <span style={{ color: "rgba(255,255,255,0.25)" }}>
                      → {step.chunks} chunks
                    </span>
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: step.sufficient ? "#2D7A4F" : "#A0722A",
                      fontWeight: 600,
                    }}
                  >
                    confidence {step.confidence} {step.sufficient ? "✓" : "✗"}
                  </span>
                )}
              </div>
            ))}

            {/* Progress bar while searching */}
            {(phase === "searching" || phase === "answering") &&
              !showMetrics && (
                <div
                  style={{
                    marginTop: 12,
                    height: 2,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #8B1A2E, #BC3448)",
                      borderRadius: 1,
                      animation:
                        "progressBar 2s ease-in-out infinite alternate",
                    }}
                  />
                </div>
              )}
          </div>
        )}

        {/* Metrics bar */}
        {showMetrics && (
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 16,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              overflow: "hidden",
              animation: "fadeSlideIn 0.4s ease-out both",
            }}
          >
            {[
              { v: demo.metrics.latency, l: "Latency", c: "#A0722A" },
              { v: demo.metrics.chunks, l: "Chunks", c: "#8B1A2E" },
              {
                v: demo.metrics.tokens,
                l: "Tokens",
                c: "rgba(255,255,255,0.6)",
              },
              { v: demo.metrics.confidence, l: "Confidence", c: "#2D7A4F" },
            ].map(({ v, l, c }, i) => (
              <div
                key={l}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRight:
                    i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: c,
                    fontFamily: "monospace",
                    lineHeight: 1,
                  }}
                >
                  {v}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginTop: 4,
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Answer card */}
        {showAnswer && (
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10,
              padding: "16px 18px",
              marginBottom: shownSources.length > 0 ? 12 : 0,
              animation: "fadeSlideIn 0.4s ease-out both",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: "#8B1A2E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "white",
                }}
              >
                G
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "Georgia, serif",
                }}
              >
                GeriAssist Agent
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "#8B1A2E",
                  fontFamily: "monospace",
                  background: "rgba(139,26,46,0.15)",
                  border: "1px solid rgba(139,26,46,0.25)",
                  padding: "2px 6px",
                  borderRadius: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Agentic
              </span>
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.75,
                fontFamily: "Georgia, serif",
                margin: 0,
              }}
            >
              {shownAnswer}
              {phase === "answering" && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 14,
                    background: "rgba(255,255,255,0.5)",
                    marginLeft: 1,
                    verticalAlign: "text-bottom",
                    animation: "blink 0.8s step-end infinite",
                  }}
                />
              )}
            </p>
          </div>
        )}

        {/* Sources */}
        {shownSources.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {shownSources.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  animation: "fadeSlideIn 0.3s ease-out both",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#8B1A2E",
                    fontFamily: "monospace",
                    minWidth: 14,
                  }}
                >
                  {s.num}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: "monospace",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.title}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(139,26,46,0.6)",
                    flexShrink: 0,
                  }}
                >
                  ↗
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div
        style={{
          padding: "10px 20px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {DEMO_SEQUENCE.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === demoIdx ? 20 : 6,
                height: 3,
                borderRadius: 2,
                background:
                  i === demoIdx ? "#8B1A2E" : "rgba(255,255,255,0.15)",
                transition: "all 0.4s ease",
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.2)",
            fontFamily: "monospace",
            letterSpacing: "0.08em",
          }}
        >
          LIVE DEMO ·{" "}
          {cycleCount > 0
            ? `${cycleCount} cycle${cycleCount > 1 ? "s" : ""}`
            : "initializing"}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN LANDING
───────────────────────────────────────────── */
export default function Landing({ onEnterChat }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        color: C.text,
        fontFamily: FONT.body,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; color: inherit; }

        /* ── Entrance animations ── */
        @keyframes heroIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes heroImgIn { from { opacity: 0; transform: translateX(24px) scale(0.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity:0.4; transform: scale(1); } 50% { opacity:1; transform: scale(1.05); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes dashDraw { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }

        .hero-text { animation: heroIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hero-text-2 { animation: heroIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both; }
        .hero-text-3 { animation: heroIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.22s both; }
        .hero-text-4 { animation: heroIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.32s both; }
        .hero-text-5 { animation: heroIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.42s both; }
        .hero-img { animation: heroImgIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
        .float-anim { animation: float 4s ease-in-out infinite; }

        /* ── Nav ── */
        .nav-link { transition: color 0.2s; }
        .nav-link:hover { color: ${C.text} !important; }

        /* ── Buttons ── */
        .btn-primary {
          background: ${C.burgundy};
          color: white;
          border: none;
          padding: 13px 32px;
          border-radius: 3px;
          font-size: 14px;
          font-weight: 600;
          font-family: ${FONT.body};
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.01em;
        }
        .btn-primary:hover {
          background: ${C.burgundyMid};
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(139,26,46,0.25);
        }
        .btn-secondary {
          background: transparent;
          color: ${C.textSecondary};
          border: 1.5px solid ${C.border};
          padding: 12px 28px;
          border-radius: 3px;
          font-size: 14px;
          font-weight: 500;
          font-family: ${FONT.body};
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .btn-secondary:hover {
          border-color: ${C.burgundy};
          color: ${C.burgundy};
          transform: translateY(-1px);
        }

        /* ── Cards ── */
        .feat-card {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, border-color 0.2s;
        }
        .feat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.08);
          border-color: rgba(139,26,46,0.2) !important;
        }

        /* ── Chips ── */
        .chip {
          transition: all 0.2s;
          cursor: pointer;
        }
        .chip:hover {
          border-color: ${C.burgundy} !important;
          color: ${C.burgundy} !important;
          background: ${C.burgundySoft} !important;
          transform: translateY(-2px);
        }

        /* ── Footer links ── */
        .footer-link { transition: color 0.15s; }
        .footer-link:hover { color: ${C.text} !important; }

        /* ── Live demo animations ── */
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes livePulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes stepIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes progressBar { from{width:15%} to{width:85%} }

        /* ── Pipeline node ── */
        .pipeline-node {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pipeline-node:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.cream}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; padding: 48px 20px 40px !important; }
          .hero-demo { display: none !important; }
          .hero-h1 { font-size: 42px !important; }
          .hero-h2 { font-size: 20px !important; }
          .hero-stats { grid-template-columns: repeat(3, 1fr) !important; gap: 0 !important; }
          .about-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .examples-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .arch-pipeline { flex-direction: column !important; }
          .arch-arrow { transform: rotate(90deg) !important; }
          .section-pad { padding: 56px 20px !important; }
          .nav-links { display: none !important; }
          .nav-inner { padding: 0 20px !important; }
          .cta-h2 { font-size: 34px !important; }
          .footer-inner { flex-direction: column !important; gap: 12px !important; text-align: center !important; padding: 20px !important; }
        }
        @media (max-width: 480px) {
          .hero-h1 { font-size: 34px !important; }
          .section-h2 { font-size: 26px !important; }
          .hero-stats { grid-template-columns: 1fr !important; gap: 12px !important; border-top: none !important; }
          .hero-stats > div { border-right: none !important; padding-left: 0 !important; padding-right: 0 !important; border-bottom: 1px solid #E5E1DA; padding-bottom: 12px; }
        }
      `}</style>

      {/* ══════════════════════════════════
          NAV
      ══════════════════════════════════ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? "rgba(250,250,247,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled
            ? `1px solid ${C.border}`
            : "1px solid transparent",
          transition: "all 0.4s ease",
        }}
      >
        <div
          className="nav-inner"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 40px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: C.burgundy,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 800,
                color: "white",
                fontFamily: FONT.display,
                letterSpacing: "-0.02em",
              }}
            >
              G
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: FONT.display,
                color: C.text,
                letterSpacing: "-0.02em",
              }}
            >
              GeriAssist
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div
              className="nav-links"
              style={{ display: "flex", alignItems: "center", gap: 32 }}
            >
              {[
                ["Features", "#features"],
                ["Architecture", "#architecture"],
              ].map(([l, h]) => (
                <a
                  key={l}
                  href={h}
                  className="nav-link"
                  style={{
                    fontSize: 13.5,
                    color: C.textMuted,
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                  }}
                >
                  {l}
                </a>
              ))}
              <div style={{ width: 1, height: 16, background: C.border }} />
              <button
                onClick={onEnterChat}
                className="btn-primary"
                style={{ padding: "8px 22px", fontSize: 13 }}
              >
                Open Chat →
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════
          HERO
      ══════════════════════════════════ */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          paddingTop: 60,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(139,26,46,0.04) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(196,154,60,0.04) 0%, transparent 60%)`,
            pointerEvents: "none",
          }}
        />

        {/* Decorative vertical line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 80,
            bottom: 80,
            width: 1,
            background: `linear-gradient(to bottom, transparent, ${C.border}, transparent)`,
            opacity: 0.5,
          }}
        />

        <div
          className="hero-grid"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "80px 40px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* ── Left ── */}
          <div>
            {/* Label */}
            <div
              className="hero-text"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 1.5,
                  background: C.burgundy,
                  opacity: 0.6,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.burgundy,
                  fontFamily: FONT.mono,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  opacity: 0.85,
                }}
              >
                Geriatric Clinical Intelligence
              </span>
            </div>

            {/* Headline */}
            <h1
              className="hero-text-2 hero-h1"
              style={{
                fontFamily: FONT.display,
                fontSize: 62,
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                color: C.text,
                marginBottom: 8,
              }}
            >
              GeriAssist
            </h1>
            <h2
              className="hero-text-3 hero-h2"
              style={{
                fontFamily: FONT.serif,
                fontSize: 26,
                fontWeight: 400,
                fontStyle: "italic",
                color: C.burgundy,
                marginBottom: 28,
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
              }}
            >
              AI Clinical Knowledge Assistant
              <br />
              for Geriatric Care
            </h2>

            <p
              className="hero-text-4"
              style={{
                fontSize: 16.5,
                color: C.textSecondary,
                lineHeight: 1.8,
                marginBottom: 44,
                maxWidth: 460,
                fontWeight: 300,
              }}
            >
              Evidence-based answers powered by peer-reviewed research and
              retrieval-augmented generation. Designed for clinicians,
              caregivers, and researchers who need grounded, citable knowledge .
              fast.
            </p>

            {/* CTAs */}
            <div
              className="hero-text-5"
              style={{ display: "flex", gap: 14, marginBottom: 56 }}
            >
              <button onClick={onEnterChat} className="btn-primary">
                Try GeriAssist
              </button>
            </div>

            {/* Stats */}
            <div
              className="hero-text-5 hero-stats"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 0,
                paddingTop: 32,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              {[
                { n: 1963, suffix: "+", label: "Research Papers" },
                { n: 34872, suffix: "", label: "Vector Embeddings" },
                { n: 5, suffix: "", label: "Data Sources" },
              ].map(({ n, suffix, label }, i) => (
                <div
                  key={label}
                  style={{
                    paddingRight: i < 2 ? 24 : 0,
                    borderRight: i < 2 ? `1px solid ${C.border}` : "none",
                    paddingLeft: i > 0 ? 24 : 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      fontFamily: FONT.display,
                      color: C.text,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    <Counter target={n} suffix={suffix} />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textMuted,
                      marginTop: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right — Live product demo ── */}
          <div className="hero-img hero-demo">
            <LiveDemo />
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: 0.4,
            animation: "pulse 2.5s ease-in-out infinite",
          }}
        >
          <div style={{ width: 1, height: 40, background: C.textMuted }} />
          <span
            style={{
              fontSize: 10,
              fontFamily: FONT.mono,
              color: C.textMuted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            scroll
          </span>
        </div>
      </section>

      {/* ══════════════════════════════════
          ABOUT
      ══════════════════════════════════ */}
      <section
        className="section-pad"
        style={{
          borderTop: `1px solid ${C.border}`,
          background: C.white,
          padding: "96px 40px",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div
            className="about-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 72,
              alignItems: "center",
            }}
          >
            <Reveal>
              <div
                style={{
                  width: 40,
                  height: 2,
                  background: C.burgundy,
                  marginBottom: 20,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.burgundy,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontFamily: FONT.mono,
                  marginBottom: 24,
                }}
              >
                About
              </div>
              <h2
                style={{
                  fontFamily: FONT.display,
                  fontSize: 38,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: C.text,
                  lineHeight: 1.15,
                  marginBottom: 24,
                }}
              >
                Built for geriatric
                <br />
                clinical knowledge
              </h2>
              <p
                style={{
                  fontSize: 17,
                  color: C.textSecondary,
                  lineHeight: 1.85,
                  fontWeight: 300,
                }}
              >
                GeriAssist helps caregivers, clinicians, and researchers quickly
                access evidence-based knowledge about geriatric care. The system
                retrieves peer-reviewed research papers and generates grounded
                responses with citations, drawing from NIA, CDC, WHO, PubMed,
                and CORE open-access archives.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div
                style={{
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  overflow: "hidden",
                  boxShadow:
                    "0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.06)",
                }}
              >
                <MedicalIllustration />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          FEATURES
      ══════════════════════════════════ */}
      <section
        id="features"
        className="section-pad"
        style={{ padding: "96px 40px", background: C.cream }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 1,
                  background: C.burgundy,
                  opacity: 0.5,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.burgundy,
                  fontFamily: FONT.mono,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                }}
              >
                Features
              </span>
              <div
                style={{
                  width: 24,
                  height: 1,
                  background: C.burgundy,
                  opacity: 0.5,
                }}
              />
            </div>
            <h2
              style={{
                fontFamily: FONT.display,
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: C.text,
                lineHeight: 1.1,
              }}
            >
              How GeriAssist works
            </h2>
          </Reveal>

          <div
            className="feat-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 28,
            }}
          >
            {[
              {
                num: "01",
                icon: "◈",
                title: "Evidence-Based Answers",
                desc: "Powered by peer-reviewed medical literature retrieved from a curated geriatric research corpus spanning NIA, CDC, WHO, PubMed, and CORE.",
              },
              {
                num: "02",
                icon: "⌖",
                title: "Citation-Grounded Responses",
                desc: "Every answer includes verifiable sources with direct links to the underlying research. No hallucinations, no ungrounded claims.",
              },
              {
                num: "03",
                icon: "⟳",
                title: "Dual Retrieval Modes",
                desc: "Supports Standard RAG (single retrieval pass) and Agent RAG (multi-step agentic search) for deeper evidence discovery on complex queries.",
              },
            ].map((f, i) => (
              <Reveal key={f.num} delay={i * 0.1}>
                <div
                  className="feat-card"
                  style={{
                    padding: "36px 32px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.white,
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: C.burgundySoft,
                        border: `1px solid ${C.burgundyBorder}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        color: C.burgundy,
                        fontFamily: FONT.mono,
                      }}
                    >
                      {f.icon}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.border,
                        fontFamily: FONT.mono,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {f.num}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: FONT.display,
                      color: C.text,
                      marginBottom: 14,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14.5,
                      color: C.textMuted,
                      lineHeight: 1.75,
                      fontWeight: 300,
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          EXAMPLE QUESTIONS
      ══════════════════════════════════ */}
      <section
        className="section-pad"
        style={{
          padding: "96px 40px",
          background: C.white,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div
            className="examples-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr",
              gap: 80,
              alignItems: "center",
            }}
          >
            <Reveal>
              <div
                style={{
                  width: 40,
                  height: 2,
                  background: C.burgundy,
                  marginBottom: 20,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.burgundy,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontFamily: FONT.mono,
                  marginBottom: 20,
                }}
              >
                Example Queries
              </div>
              <h2
                style={{
                  fontFamily: FONT.display,
                  fontSize: 38,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: C.text,
                  lineHeight: 1.15,
                  marginBottom: 20,
                }}
              >
                Ask clinical questions,
                <br />
                get cited answers
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: C.textMuted,
                  lineHeight: 1.75,
                  fontWeight: 300,
                  marginBottom: 32,
                }}
              >
                Click any question to open it in the chat interface.
              </p>
              <button onClick={onEnterChat} className="btn-primary">
                Start asking →
              </button>
            </Reveal>

            <Reveal delay={0.15}>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[
                  "What medications should be avoided in older adults?",
                  "What are the main risk factors for falls in elderly patients?",
                  "How should caregivers manage behavioral symptoms in dementia?",
                  "What is the WHO Decade of Healthy Ageing?",
                ].map((q, i) => (
                  <div
                    key={i}
                    className="chip"
                    onClick={onEnterChat}
                    style={{
                      padding: "16px 22px",
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                      background: C.cream,
                      fontSize: 14.5,
                      color: C.textSecondary,
                      fontWeight: 400,
                      lineHeight: 1.4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span>{q}</span>
                    <span
                      style={{
                        color: C.textLight,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      →
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          ARCHITECTURE
      ══════════════════════════════════ */}
      <section
        id="architecture"
        className="section-pad"
        style={{
          padding: "96px 40px",
          background: C.cream,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 1,
                  background: C.burgundy,
                  opacity: 0.5,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.burgundy,
                  fontFamily: FONT.mono,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                }}
              >
                Architecture
              </span>
              <div
                style={{
                  width: 24,
                  height: 1,
                  background: C.burgundy,
                  opacity: 0.5,
                }}
              />
            </div>
            <h2
              style={{
                fontFamily: FONT.display,
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: C.text,
                lineHeight: 1.1,
              }}
            >
              The retrieval pipeline
            </h2>
          </Reveal>

          {/* Pipeline */}
          <Reveal delay={0.1}>
            <div
              className="arch-pipeline"
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                overflowX: "auto",
                marginBottom: 40,
              }}
            >
              {[
                {
                  icon: "▤",
                  label: "Medical Documents",
                  sub: "NIA · CDC · WHO\nPMC · CORE",
                },
                {
                  icon: "⊕",
                  label: "Embedding Model",
                  sub: "text-embedding\n-3-small",
                },
                { icon: "⊞", label: "Vector Database", sub: "FAISS\nAWS RDS" },
                {
                  icon: "⟳",
                  label: "Agentic Retriever",
                  sub: "Standard RAG\nAgent RAG",
                },
                {
                  icon: "◈",
                  label: "LLM Response",
                  sub: "GPT-4o-mini\n+ Citations",
                },
              ].map((step, i, arr) => (
                <div
                  key={step.label}
                  style={{ display: "flex", alignItems: "center", flex: 1 }}
                >
                  <div
                    className="pipeline-node"
                    style={{
                      flex: 1,
                      padding: "24px 16px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: C.white,
                      textAlign: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      minWidth: 140,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: C.burgundySoft,
                        border: `1px solid ${C.burgundyBorder}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        color: C.burgundy,
                        fontFamily: FONT.mono,
                        margin: "0 auto 14px",
                      }}
                    >
                      {step.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        marginBottom: 6,
                        fontFamily: FONT.display,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: C.textMuted,
                        fontFamily: FONT.mono,
                        lineHeight: 1.6,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {step.sub}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        padding: "0 10px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          color: C.textLight,
                          fontFamily: FONT.mono,
                        }}
                      >
                        →
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>

          {/* Tech stack */}
          <Reveal delay={0.2}>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {[
                "FastAPI",
                "PostgreSQL (AWS RDS)",
                "AWS S3",
                "FAISS",
                "OpenAI API",
                "Docker",
                "React 19",
              ].map((t) => (
                <span
                  key={t}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    border: `1px solid ${C.border}`,
                    fontSize: 12,
                    fontFamily: FONT.mono,
                    color: C.textMuted,
                    background: C.white,
                    letterSpacing: "0.02em",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════
          CTA
      ══════════════════════════════════ */}
      <section
        style={{
          padding: "100px 40px",
          background: C.burgundy,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative element */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 140,
            fontSize: 120,
            color: "rgba(255,255,255,0.04)",
            fontFamily: FONT.mono,
            lineHeight: 1,
          }}
        >
          ◈
        </div>

        <Reveal style={{ textAlign: "center", position: "relative" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontFamily: FONT.mono,
              marginBottom: 24,
            }}
          >
            Ready to begin
          </div>
          <h2
            className="cta-h2"
            style={{
              fontFamily: FONT.display,
              fontSize: 52,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              marginBottom: 20,
            }}
          >
            Explore geriatric
            <br />
            knowledge, today.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.65)",
              marginBottom: 44,
              fontWeight: 300,
              lineHeight: 1.7,
            }}
          >
            1,963+ peer-reviewed documents indexed and ready to query.
          </p>
          <button
            onClick={onEnterChat}
            style={{
              padding: "15px 44px",
              borderRadius: 3,
              border: "none",
              background: "white",
              color: C.burgundy,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: FONT.body,
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            Try GeriAssist
          </button>
        </Reveal>
      </section>

      {/* ══════════════════════════════════
          FOOTER
      ══════════════════════════════════ */}
      <footer
        className="footer-inner"
        style={{
          padding: "28px 40px",
          borderTop: `1px solid ${C.border}`,
          background: C.cream,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: C.burgundy,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              color: "white",
              fontFamily: FONT.display,
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: C.textMuted,
              fontFamily: FONT.body,
            }}
          >
            GeriAssist · Built by Mama Thomas
          </span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            ["GitHub", "https://github.com/Mama-Thomas/geriassist-rag-aws"],
            ["LinkedIn", "https://www.linkedin.com/in/mama-thomas-89b0a321b"],
          ].map(([l, h]) => (
            <a
              key={l}
              href={h}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
              style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}
            >
              {l} ↗
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
