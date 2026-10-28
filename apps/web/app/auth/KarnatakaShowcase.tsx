"use client";
import { useEffect, useState } from "react";

// ── Karnataka landmark data ───────────────────────────────────────────────────
const CARDS = [
  {
    id: "mysore-palace",
    name: "Mysore Palace",
    region: "Mysuru",
    tag: "Royal Heritage",
    tagColor: "#d97706",
    desc: "One of the most visited monuments in India, illuminated by 100,000 bulbs every Sunday.",
    emoji: "👑",
    bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
    accent: "#e94560",
    illustration: <MysurePalaceSVG />,
  },
  {
    id: "hampi",
    name: "Hampi",
    region: "Ballari",
    tag: "UNESCO World Heritage",
    tagColor: "#7c3aed",
    desc: "Ancient ruins of the Vijayanagara Empire — boulders, temples and bazaars frozen in time.",
    emoji: "🏛",
    bg: "linear-gradient(135deg, #2d1b00 0%, #5a3200 40%, #8b5e3c 100%)",
    accent: "#f59e0b",
    illustration: <HampiSVG />,
  },
  {
    id: "coorg",
    name: "Coorg Coffee Hills",
    region: "Kodagu",
    tag: "Nature & Coffee",
    tagColor: "#065f46",
    desc: "Misty hills blanketed in coffee and spice estates. Scotland of India.",
    emoji: "☕",
    bg: "linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 100%)",
    accent: "#bbf7d0",
    illustration: <CoorgSVG />,
  },
  {
    id: "gokarna",
    name: "Gokarna Beach",
    region: "Uttara Kannada",
    tag: "Beaches & Coast",
    tagColor: "#0369a1",
    desc: "Sacred town with pristine Om Beach, Half Moon Beach and ancient Mahabaleshwar temple.",
    emoji: "🏖",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #075985 40%, #0ea5e9 100%)",
    accent: "#fef3c7",
    illustration: <GokarnaBeachSVG />,
  },
  {
    id: "udupi",
    name: "Udupi Cuisine",
    region: "Udupi",
    tag: "Food & Culture",
    tagColor: "#92400e",
    desc: "Birthplace of the iconic Masala Dosa. Temple town where vegetarian food is an art form.",
    emoji: "🍛",
    bg: "linear-gradient(135deg, #3b0764 0%, #6b21a8 40%, #9333ea 100%)",
    accent: "#fde68a",
    illustration: <UdupiSVG />,
  },
  {
    id: "jog-falls",
    name: "Jog Falls",
    region: "Shivamogga",
    tag: "Waterfalls",
    tagColor: "#155e75",
    desc: "India's second highest plunge waterfall — 253 metres of raw monsoon power.",
    emoji: "💧",
    bg: "linear-gradient(135deg, #0a192f 0%, #0d3b5e 40%, #1e5f8e 100%)",
    accent: "#7dd3fc",
    illustration: <JogFallsSVG />,
  },
  {
    id: "badami",
    name: "Badami Caves",
    region: "Bagalkot",
    tag: "Cave Temples",
    tagColor: "#b45309",
    desc: "6th-century rock-cut cave temples of the Chalukyas carved from red sandstone cliffs.",
    emoji: "⛰",
    bg: "linear-gradient(135deg, #431407 0%, #7c2d12 40%, #b45309 100%)",
    accent: "#fef9c3",
    illustration: <BadamiSVG />,
  },
  {
    id: "kabini",
    name: "Kabini Wildlife",
    region: "Mysuru",
    tag: "Wildlife",
    tagColor: "#15803d",
    desc: "Elephants at the river bank at dusk. Tigers, leopards and the famed Black Panther.",
    emoji: "🐘",
    bg: "linear-gradient(135deg, #052e16 0%, #14532d 40%, #365314 100%)",
    accent: "#fef08a",
    illustration: <KabiniSVG />,
  },
];

// ── SVG Illustrations ─────────────────────────────────────────────────────────

function MysurePalaceSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden>
      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <circle key={i} cx={10 + i * 15} cy={10 + (i % 5) * 8} r="1"
          fill="white" opacity={0.4 + (i % 3) * 0.2} />
      ))}
      {/* Ground */}
      <rect x="0" y="160" width="320" height="40" fill="#0a0a1a" opacity="0.8" />
      {/* Main palace body */}
      <rect x="60" y="90" width="200" height="75" fill="#c9a227" opacity="0.9" />
      {/* Central dome */}
      <ellipse cx="160" cy="88" rx="28" ry="22" fill="#e94560" />
      <rect x="147" y="68" width="26" height="22" fill="#e94560" />
      <polygon points="160,50 150,68 170,68" fill="#f59e0b" />
      {/* Side towers */}
      <rect x="62" y="70" width="30" height="95" fill="#b8882a" />
      <ellipse cx="77" cy="68" rx="15" ry="12" fill="#e94560" />
      <polygon points="77,52 70,68 84,68" fill="#f59e0b" />
      <rect x="228" y="70" width="30" height="95" fill="#b8882a" />
      <ellipse cx="243" cy="68" rx="15" ry="12" fill="#e94560" />
      <polygon points="243,52 236,68 250,68" fill="#f59e0b" />
      {/* Arches row */}
      {[80, 105, 130, 155, 180, 205, 230].map((x, i) => (
        <path key={i} d={`M${x},165 Q${x + 10},145 ${x + 20},165`}
          fill="none" stroke="#0f3460" strokeWidth="2" />
      ))}
      {/* Windows */}
      {[90, 130, 170, 210].map((x, i) => (
        <rect key={i} x={x} y="100" width="16" height="20" rx="8"
          fill="#1a1a2e" stroke="#f59e0b" strokeWidth="1" />
      ))}
      {/* Lights */}
      {[68, 83, 98, 113, 128, 143, 158, 173, 188, 203, 218, 233, 248].map((x, i) => (
        <circle key={i} cx={x} cy="162" r="2.5" fill="#fbbf24" opacity="0.9" />
      ))}
      {/* Reflection */}
      <rect x="0" y="160" width="320" height="40" fill="url(#reflect)" opacity="0.3" />
      <defs>
        <linearGradient id="reflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a227" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function HampiSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden>
      {/* Sky */}
      <rect x="0" y="0" width="320" height="130" fill="#8b5e3c" opacity="0.3" />
      {/* Boulders bg */}
      {[20, 60, 100, 200, 240, 280].map((x, i) => (
        <ellipse key={i} cx={x} cy={140 + (i % 2) * 15} rx={25 + i * 3} ry={20 + i * 2}
          fill="#6b4c2a" opacity={0.6 + i * 0.05} />
      ))}
      {/* Virupaksha tower */}
      <rect x="130" y="40" width="60" height="120" fill="#c49a4f" />
      <rect x="120" y="55" width="80" height="10" fill="#a07830" />
      <rect x="125" y="45" width="70" height="12" fill="#b08840" />
      <rect x="132" y="33" width="56" height="12" fill="#c49a4f" />
      <rect x="136" y="25" width="48" height="10" fill="#a07830" />
      <rect x="140" y="18" width="40" height="9" fill="#b08840" />
      <rect x="144" y="12" width="32" height="8" fill="#c49a4f" />
      <rect x="148" y="7" width="24" height="7" fill="#a07830" />
      <polygon points="160,0 153,7 167,7" fill="#e4a027" />
      {/* Doors and windows */}
      {[143, 157].map((x, i) => (
        <rect key={i} x={x} y="120" width="14" height="20" rx="7" fill="#2d1b00" />
      ))}
      {/* Pillared hall */}
      <rect x="80" y="120" width="160" height="40" fill="#b8914a" />
      {[90, 110, 130, 150, 170, 190, 210].map((x, i) => (
        <rect key={i} x={x} y="100" width="8" height="60" fill="#9a7535" />
      ))}
      {/* Ground */}
      <rect x="0" y="155" width="320" height="45" fill="#3d1f00" />
      {/* Rocks on ground */}
      {[30, 80, 240, 290].map((x, i) => (
        <ellipse key={i} cx={x} cy="158" rx={15 + i * 2} ry={10}
          fill="#5a3200" />
      ))}
    </svg>
  );
}

function CoorgSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden>
      {/* Misty sky */}
      <rect x="0" y="0" width="320" height="200" fill="#0a3320" opacity="0.4" />
      {/* Mountains */}
      <polygon points="0,120 80,40 160,120" fill="#0d4726" />
      <polygon points="80,120 180,30 280,120" fill="#0f5530" />
      <polygon points="160,120 260,50 320,100 320,120" fill="#0d4726" />
      {/* Mist layer */}
      <rect x="0" y="100" width="320" height="20" fill="white" opacity="0.15" />
      <rect x="0" y="110" width="320" height="15" fill="white" opacity="0.1" />
      {/* Coffee plants rows */}
      {[130, 145, 158, 170, 182].map((y, row) => (
        <g key={row}>
          {[...Array(10)].map((_, i) => (
            <g key={i} transform={`translate(${15 + i * 30 + (row % 2) * 15},${y})`}>
              <ellipse cx="0" cy="0" rx="10" ry="6" fill="#16a34a" />
              <circle cx="-4" cy="-2" r="2" fill="#dc2626" opacity="0.8" />
              <circle cx="3" cy="1" r="2" fill="#dc2626" opacity="0.8" />
            </g>
          ))}
        </g>
      ))}
      {/* Path */}
      <path d="M100,200 Q130,170 160,155 Q190,140 220,200"
        fill="none" stroke="#4b5320" strokeWidth="6" opacity="0.6" />
      {/* Plantation house */}
      <rect x="130" y="118" width="60" height="35" fill="#713f12" />
      <polygon points="125,120 160,100 195,120" fill="#a16207" />
      <rect x="148" y="130" width="12" height="18" fill="#3b1f00" />
      <rect x="135" y="122" width="10" height="10" fill="#fef3c7" opacity="0.5" />
      <rect x="175" y="122" width="10" height="10" fill="#fef3c7" opacity="0.5" />
      {/* Fireflies */}
      {[50, 100, 200, 250, 80, 270].map((x, i) => (
        <circle key={i} cx={x} cy={90 + (i % 4) * 12} r="1.5"
          fill="#bbf7d0" opacity="0.7" />
      ))}
    </svg>
  );
}

function GokarnaBeachSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c4a6e" />
          <stop offset="60%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="140" fill="url(#sky)" />
      {/* Sun */}
      <circle cx="260" cy="40" r="22" fill="#fbbf24" opacity="0.9" />
      <circle cx="260" cy="40" r="28" fill="#fbbf24" opacity="0.2" />
      {/* Clouds */}
      <ellipse cx="80" cy="30" rx="30" ry="12" fill="white" opacity="0.4" />
      <ellipse cx="100" cy="25" rx="20" ry="10" fill="white" opacity="0.4" />
      {/* Sea */}
      <rect x="0" y="125" width="320" height="75" fill="url(#sea)" />
      {/* Waves */}
      <path d="M0,130 Q40,122 80,130 Q120,138 160,130 Q200,122 240,130 Q280,138 320,130"
        fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
      <path d="M0,140 Q40,132 80,140 Q120,148 160,140 Q200,132 240,140 Q280,148 320,140"
        fill="none" stroke="white" strokeWidth="1.5" opacity="0.35" />
      {/* Beach sand */}
      <ellipse cx="160" cy="155" rx="200" ry="30" fill="#fde68a" />
      {/* Rocks */}
      <ellipse cx="30" cy="145" rx="20" ry="12" fill="#1e293b" />
      <ellipse cx="290" cy="148" rx="18" ry="10" fill="#1e293b" />
      {/* Temple silhouette */}
      <rect x="130" y="90" width="12" height="35" fill="#1e293b" opacity="0.8" />
      <polygon points="136,82 130,90 142,90" fill="#1e293b" opacity="0.8" />
      <rect x="136" y="125" width="40" height="20" fill="#1e293b" opacity="0.8" />
      {/* Palm trees */}
      <line x1="50" y1="155" x2="55" y2="95" stroke="#713f12" strokeWidth="4" />
      <ellipse cx="50" cy="90" rx="20" ry="10" fill="#15803d" />
      <ellipse cx="63" cy="85" rx="15" ry="8" fill="#16a34a" />
      <line x1="270" y1="155" x2="265" y2="98" stroke="#713f12" strokeWidth="4" />
      <ellipse cx="270" cy="92" rx="20" ry="10" fill="#15803d" />
      <ellipse cx="257" cy="87" rx="15" ry="8" fill="#16a34a" />
      {/* Boat */}
      <path d="M155,138 Q175,132 195,138 L190,145 L160,145 Z" fill="#7c3aed" />
      <line x1="175" y1="135" x2="175" y2="118" stroke="#4b5563" strokeWidth="1.5" />
      <path d="M175,118 L190,125 L175,132" fill="#f3f4f6" opacity="0.8" />
    </svg>
  );
}

function UdupiSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden>
      {/* Background */}
      <rect x="0" y="0" width="320" height="200" fill="#1a0533" />
      {/* Decorative rangoli-like border */}
      {[...Array(8)].map((_, i) => (
        <circle key={i} cx={20 + i * 40} cy="180" r="4"
          fill="#f59e0b" opacity={0.6 + (i % 2) * 0.3} />
      ))}
      {/* Temple gopura */}
      <rect x="110" y="60" width="100" height="100" fill="#7c3aed" />
      {/* Gopura tiers */}
      {[0, 1, 2, 3, 4].map((tier) => (
        <g key={tier}>
          <rect x={110 + tier * 6} y={60 - tier * 12} width={100 - tier * 12}
            height={14} fill={`hsl(${270 + tier * 10},60%,${40 + tier * 5}%)`} />
          {[...Array(4 - tier)].map((_, j) => (
            <circle key={j} cx={125 + tier * 6 + j * 22} cy={60 - tier * 12 + 7}
              r="3" fill="#fbbf24" />
          ))}
        </g>
      ))}
      <polygon points="160,0 153,8 167,8" fill="#f59e0b" />
      {/* Dosa on banana leaf */}
      <ellipse cx="80" cy="155" rx="55" ry="20" fill="#15803d" />
      <ellipse cx="80" cy="150" rx="40" ry="10" fill="#d97706" />
      {/* Dosa curl */}
      <path d="M50,148 Q65,140 80,148 Q95,156 110,148"
        fill="none" stroke="#92400e" strokeWidth="2" />
      {/* Chutneys */}
      <circle cx="148" cy="152" r="10" fill="#15803d" opacity="0.9" />
      <circle cx="165" cy="155" r="8" fill="#dc2626" opacity="0.9" />
      {/* Steaming coffee */}
      <ellipse cx="230" cy="160" rx="20" ry="8" fill="#6b4226" />
      <ellipse cx="230" cy="155" rx="18" ry="6" fill="#92400e" />
      <path d="M225,145 Q222,135 225,125" fill="none" stroke="white"
        strokeWidth="1.5" opacity="0.5" />
      <path d="M230,143 Q227,133 230,123" fill="none" stroke="white"
        strokeWidth="1.5" opacity="0.5" />
      <path d="M235,145 Q232,135 235,125" fill="none" stroke="white"
        strokeWidth="1.5" opacity="0.5" />
      {/* Floating spices */}
      {["🌶", "🫚", "🌿"].map((s, i) => (
        <text key={i} x={15 + i * 15} y={100 + i * 20} fontSize="16" opacity="0.4">{s}</text>
      ))}
      {/* Lamps */}
      {[40, 270].map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy="170" rx="8" ry="3" fill="#d97706" />
          <path d={`M${x},170 Q${x + 3},162 ${x + 5},155`}
            fill="none" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx={x + 5} cy="153" r="3" fill="#fef3c7" opacity="0.9" />
        </g>
      ))}
    </svg>
  );
}

function JogFallsSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden>
      {/* Sky */}
      <rect x="0" y="0" width="320" height="80" fill="#0a2d4a" />
      {/* Clouds */}
      <ellipse cx="60" cy="25" rx="35" ry="15" fill="white" opacity="0.15" />
      <ellipse cx="250" cy="35" rx="28" ry="12" fill="white" opacity="0.12" />
      {/* Cliff walls */}
      <rect x="0" y="0" width="100" height="200" fill="#1e3a2f" />
      <rect x="220" y="0" width="100" height="200" fill="#1e3a2f" />
      {/* Rocky texture on cliffs */}
      {[20, 40, 60, 80].map((y, i) => (
        <path key={i} d={`M0,${y} Q30,${y - 5} 60,${y + 3} Q80,${y + 6} 100,${y}`}
          fill="none" stroke="#2d5a3d" strokeWidth="1.5" opacity="0.6" />
      ))}
      {[20, 40, 60, 80].map((y, i) => (
        <path key={i} d={`M220,${y} Q250,${y - 4} 280,${y + 4} Q300,${y + 6} 320,${y}`}
          fill="none" stroke="#2d5a3d" strokeWidth="1.5" opacity="0.6" />
      ))}
      {/* Main waterfall streams */}
      {[115, 135, 155, 175].map((x, i) => (
        <rect key={i} x={x} y="0" width={8 + i} height="145"
          fill="white" opacity={0.6 - i * 0.08}
          rx="4" />
      ))}
      {/* Waterfall spray/mist */}
      <ellipse cx="160" cy="148" rx="70" ry="18" fill="white" opacity="0.3" />
      <ellipse cx="160" cy="152" rx="55" ry="12" fill="#7dd3fc" opacity="0.4" />
      {/* Plunge pool */}
      <ellipse cx="160" cy="162" rx="65" ry="20" fill="#0284c7" opacity="0.8" />
      {/* Water ripples */}
      {[1, 2, 3].map((r) => (
        <ellipse key={r} cx="160" cy="163" rx={20 + r * 12} ry={5 + r * 2}
          fill="none" stroke="white" strokeWidth="1" opacity={0.4 - r * 0.1} />
      ))}
      {/* Vegetation on cliffs */}
      {[30, 50, 70, 250, 270, 290].map((x, i) => (
        <ellipse key={i} cx={x} cy={60 + (i % 3) * 20} rx="12" ry="7"
          fill="#16a34a" opacity="0.7" />
      ))}
      {/* Rainbow */}
      <path d="M105,155 Q160,110 215,155" fill="none"
        stroke="#a855f7" strokeWidth="2" opacity="0.4" />
      <path d="M108,158 Q160,115 212,158" fill="none"
        stroke="#3b82f6" strokeWidth="2" opacity="0.3" />
    </svg>
  );
}

function BadamiSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden>
      {/* Warm sandstone sky */}
      <rect x="0" y="0" width="320" height="110" fill="#7c2d12" opacity="0.5" />
      {/* Sun */}
      <circle cx="270" cy="35" r="20" fill="#fbbf24" opacity="0.8" />
      {/* Cliff face */}
      <rect x="0" y="80" width="140" height="120" fill="#b45309" />
      <rect x="180" y="70" width="140" height="130" fill="#92400e" />
      {/* Rock texture */}
      {[85, 100, 115, 130].map((y, i) => (
        <path key={i} d={`M0,${y} Q35,${y - 4} 70,${y + 3} Q105,${y + 5} 140,${y}`}
          fill="none" stroke="#78350f" strokeWidth="2" opacity="0.7" />
      ))}
      {/* Cave entrance left */}
      <path d="M30,80 Q70,50 110,80 L110,130 L30,130 Z" fill="#1c0a00" />
      {/* Cave entrance right */}
      <path d="M195,70 Q230,42 265,70 L265,125 L195,125 Z" fill="#1c0a00" />
      {/* Carved pillars left cave */}
      {[45, 63, 81].map((x, i) => (
        <g key={i}>
          <rect x={x} y="85" width="9" height="45" fill="#d97706" opacity="0.8" />
          <rect x={x - 2} y="83" width="13" height="5" fill="#f59e0b" opacity="0.9" />
          <rect x={x - 2} y="127" width="13" height="5" fill="#f59e0b" opacity="0.9" />
        </g>
      ))}
      {/* Carved deity silhouette */}
      <ellipse cx="70" cy="100" rx="10" ry="14" fill="#92400e" opacity="0.8" />
      <circle cx="70" cy="88" r="7" fill="#92400e" opacity="0.8" />
      {/* Lake / Agastya tirtha */}
      <rect x="0" y="170" width="320" height="30" fill="#0369a1" opacity="0.7" />
      <path d="M0,172 Q80,165 160,172 Q240,179 320,172"
        fill="none" stroke="#7dd3fc" strokeWidth="2" opacity="0.5" />
      {/* Reflection */}
      <rect x="25" y="172" width="9" height="25" fill="#d97706" opacity="0.3" />
      <rect x="193" y="172" width="9" height="25" fill="#d97706" opacity="0.3" />
    </svg>
  );
}

function KabiniSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden>
      {/* Sunset sky */}
      <defs>
        <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2e0a" />
          <stop offset="50%" stopColor="#365314" />
          <stop offset="100%" stopColor="#4a7c1a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="200" fill="url(#sunset)" />
      {/* Setting sun */}
      <circle cx="240" cy="50" r="25" fill="#f59e0b" opacity="0.85" />
      <circle cx="240" cy="50" r="32" fill="#f59e0b" opacity="0.2" />
      {/* Sun rays */}
      {[0, 30, 60, 90, 120, 150, 210, 240, 270, 300, 330].map((angle, i) => (
        <line key={i}
          x1={240 + Math.cos(angle * Math.PI / 180) * 34}
          y1={50 + Math.sin(angle * Math.PI / 180) * 34}
          x2={240 + Math.cos(angle * Math.PI / 180) * 44}
          y2={50 + Math.sin(angle * Math.PI / 180) * 44}
          stroke="#fde68a" strokeWidth="2" opacity="0.5" />
      ))}
      {/* Trees / jungle silhouette */}
      {[0, 25, 50, 75, 100, 200, 225, 250, 275, 300].map((x, i) => (
        <g key={i}>
          <rect x={x + 4} y={80 + (i % 3) * 8} width="6"
            height={60 - (i % 3) * 8} fill="#052e16" />
          <ellipse cx={x + 7} cy={75 + (i % 3) * 8} rx={14 + (i % 2) * 4}
            ry={18 + (i % 2) * 4} fill="#052e16" />
        </g>
      ))}
      {/* River */}
      <path d="M0,148 Q80,138 160,148 Q240,158 320,148 L320,200 L0,200 Z"
        fill="#0369a1" opacity="0.75" />
      {/* River shimmer */}
      {[1, 2, 3].map((i) => (
        <path key={i}
          d={`M${i * 80},${152 + i * 2} Q${i * 80 + 40},${147 + i * 2} ${i * 80 + 80},${152 + i * 2}`}
          fill="none" stroke="#7dd3fc" strokeWidth="1.5" opacity={0.4 - i * 0.1} />
      ))}
      {/* Elephant silhouette */}
      <g transform="translate(30,125)">
        <ellipse cx="40" cy="22" rx="35" ry="22" fill="#1c2710" />
        <circle cx="14" cy="10" r="14" fill="#1c2710" />
        <path d="M5,20 Q0,35 8,42 Q12,48 10,55" fill="none"
          stroke="#1c2710" strokeWidth="6" strokeLinecap="round" />
        <rect x="18" y="38" width="8" height="18" rx="3" fill="#1c2710" />
        <rect x="30" y="40" width="8" height="16" rx="3" fill="#1c2710" />
        <rect x="44" y="40" width="8" height="16" rx="3" fill="#1c2710" />
        <rect x="56" y="38" width="8" height="18" rx="3" fill="#1c2710" />
        <path d="M70,25 Q80,20 75,28" fill="none"
          stroke="#1c2710" strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* Deer silhouette small */}
      <g transform="translate(220,138)">
        <ellipse cx="15" cy="12" rx="12" ry="8" fill="#1c2710" />
        <ellipse cx="5" cy="5" rx="6" ry="7" fill="#1c2710" />
        <line x1="3" y1="0" x2="0" y2="-6" stroke="#1c2710" strokeWidth="2" />
        <line x1="7" y1="-1" x2="9" y2="-7" stroke="#1c2710" strokeWidth="2" />
      </g>
      {/* Birds */}
      {[100, 130, 160].map((x, i) => (
        <path key={i} d={`M${x},${30 + i * 8} Q${x + 5},${25 + i * 8} ${x + 10},${30 + i * 8}`}
          fill="none" stroke="#1c2710" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function KarnatakaShowcase() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % CARDS.length);
        setAnimating(false);
      }, 400);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const card = CARDS[active];

  function goTo(i: number) {
    if (i === active) return;
    setAnimating(true);
    setTimeout(() => { setActive(i); setAnimating(false); }, 300);
  }

  return (
    <div className="karnataka-showcase" style={{ background: card.bg }}>
      {/* ── Illustration ── */}
      <div
        className="showcase-illustration"
        style={{ opacity: animating ? 0 : 1, transition: "opacity 0.4s ease" }}
      >
        {card.illustration}
      </div>

      {/* ── Gradient overlay ── */}
      <div className="showcase-overlay" />

      {/* ── Content ── */}
      <div
        className="showcase-content"
        style={{ opacity: animating ? 0 : 1, transition: "opacity 0.4s ease, transform 0.4s ease",
          transform: animating ? "translateY(12px)" : "translateY(0)" }}
      >
        {/* Brand */}
        <div className="showcase-brand">
          <span className="text-2xl">🌿</span>
          <span>KarnatakaGo</span>
        </div>

        {/* Tag */}
        <span className="showcase-tag" style={{ background: card.tagColor + "33", color: card.accent,
          border: `1px solid ${card.tagColor}66` }}>
          {card.emoji} {card.tag}
        </span>

        {/* Title + region */}
        <h2 className="showcase-title">{card.name}</h2>
        <p className="showcase-region">📍 {card.region}, Karnataka</p>

        {/* Description */}
        <p className="showcase-desc">{card.desc}</p>

        {/* Dots navigation */}
        <div className="showcase-dots">
          {CARDS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="showcase-dot"
              style={{
                width: i === active ? "24px" : "8px",
                background: i === active ? card.accent : "rgba(255,255,255,0.35)",
              }}
              aria-label={`Go to ${CARDS[i].name}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="showcase-progress-bg">
          <div
            key={active}
            className="showcase-progress-bar"
            style={{ background: card.accent }}
          />
        </div>
      </div>
    </div>
  );
}
