// Inline SVG icons for each transport mode — no external deps needed.

export type TransportMode = "car" | "bike" | "bus" | "train" | "taxi" | "mix";

export const TRANSPORT_META: Record<
  TransportMode,
  { label: string; desc: string; icon: React.ReactNode }
> = {
  car: {
    label: "Car",
    desc: "Private car",
    icon: (
      <svg viewBox="0 0 48 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-6">
        <rect x="4" y="10" width="40" height="13" rx="3" fill="currentColor" opacity=".18"/>
        <path d="M8 10 L13 3 H35 L40 10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        <rect x="4" y="10" width="40" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="13" cy="24" r="4" fill="currentColor"/>
        <circle cx="35" cy="24" r="4" fill="currentColor"/>
        <circle cx="13" cy="24" r="2" fill="white" opacity=".6"/>
        <circle cx="35" cy="24" r="2" fill="white" opacity=".6"/>
        <rect x="15" y="4" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="25" y="4" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
  bike: {
    label: "Bike",
    desc: "Motorcycle / scooter",
    icon: (
      <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-6">
        <circle cx="10" cy="22" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="38" cy="22" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="10" cy="22" r="3" fill="currentColor" opacity=".4"/>
        <circle cx="38" cy="22" r="3" fill="currentColor" opacity=".4"/>
        <path d="M24 8 L30 8 L38 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 8 L18 18 L10 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 8 L24 14 L30 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M20 5 L28 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="24" cy="8" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  bus: {
    label: "Bus",
    desc: "KSRTC / state bus",
    icon: (
      <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-6">
        <rect x="4" y="4" width="40" height="22" rx="3" fill="currentColor" opacity=".15"/>
        <rect x="4" y="4" width="40" height="22" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="4" y1="14" x2="44" y2="14" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="8"  y="6"  width="7" height="6" rx="1" fill="currentColor" opacity=".4"/>
        <rect x="17" y="6"  width="7" height="6" rx="1" fill="currentColor" opacity=".4"/>
        <rect x="26" y="6"  width="7" height="6" rx="1" fill="currentColor" opacity=".4"/>
        <rect x="35" y="6"  width="5" height="6" rx="1" fill="currentColor" opacity=".4"/>
        <circle cx="13" cy="28" r="4" fill="currentColor"/>
        <circle cx="35" cy="28" r="4" fill="currentColor"/>
        <circle cx="13" cy="28" r="2" fill="white" opacity=".6"/>
        <circle cx="35" cy="28" r="2" fill="white" opacity=".6"/>
        <rect x="2" y="16" width="3" height="6" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="43" y="16" width="3" height="6" rx="1" fill="currentColor" opacity=".5"/>
      </svg>
    ),
  },
  train: {
    label: "Train",
    desc: "Indian Railways",
    icon: (
      <svg viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-6">
        <rect x="8" y="2" width="32" height="24" rx="4" fill="currentColor" opacity=".15"/>
        <rect x="8" y="2" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="12" y="6"  width="10" height="8" rx="1.5" fill="currentColor" opacity=".4"/>
        <rect x="26" y="6"  width="10" height="8" rx="1.5" fill="currentColor" opacity=".4"/>
        <line x1="8" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="15" cy="30" r="4" fill="currentColor"/>
        <circle cx="33" cy="30" r="4" fill="currentColor"/>
        <circle cx="15" cy="30" r="2" fill="white" opacity=".6"/>
        <circle cx="33" cy="30" r="2" fill="white" opacity=".6"/>
        <line x1="15" y1="26" x2="15" y2="22" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="33" y1="26" x2="33" y2="22" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="4" y1="34" x2="44" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="10" y1="34" x2="10" y2="30" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="24" y1="34" x2="24" y2="30" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="38" y1="34" x2="38" y2="30" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="24" cy="14" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  taxi: {
    label: "Taxi",
    desc: "Cab / auto",
    icon: (
      <svg viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-6">
        <rect x="4" y="11" width="40" height="13" rx="3" fill="currentColor" opacity=".18"/>
        <path d="M9 11 L14 4 H34 L39 11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        <rect x="4" y="11" width="40" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="16" y="4" width="16" height="3" rx="1" fill="currentColor" opacity=".7"/>
        <circle cx="13" cy="25" r="4" fill="currentColor"/>
        <circle cx="35" cy="25" r="4" fill="currentColor"/>
        <circle cx="13" cy="25" r="2" fill="white" opacity=".6"/>
        <circle cx="35" cy="25" r="2" fill="white" opacity=".6"/>
        <rect x="15" y="5" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="24" y="5" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="20" y="13" width="8" height="3" rx="1" fill="currentColor" opacity=".5"/>
      </svg>
    ),
  },
  mix: {
    label: "Mix",
    desc: "Car + bus + train + state bus + rental Motorcycle / scooter",
    icon: (
      <svg viewBox="0 0 52 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-6">
        {/* mini car */}
        <path d="M2 14 L5 9 H16 L19 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="2" y="14" width="17" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".1"/>
        <circle cx="7"  cy="23" r="3" fill="currentColor"/>
        <circle cx="16" cy="23" r="3" fill="currentColor"/>
        {/* mini bus */}
        <rect x="22" y="8" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".1"/>
        <line x1="22" y1="15" x2="36" y2="15" stroke="currentColor" strokeWidth="1"/>
        <rect x="24" y="10" width="4" height="4" rx=".5" fill="currentColor" opacity=".4"/>
        <rect x="30" y="10" width="4" height="4" rx=".5" fill="currentColor" opacity=".4"/>
        <circle cx="27" cy="23" r="3" fill="currentColor"/>
        <circle cx="33" cy="23" r="3" fill="currentColor"/>
        {/* mini train */}
        <rect x="38" y="7" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".1"/>
        <rect x="40" y="9"  width="4" height="5" rx=".5" fill="currentColor" opacity=".4"/>
        <rect x="46" y="9"  width="2" height="5" rx=".5" fill="currentColor" opacity=".4"/>
        <circle cx="42" cy="23" r="3" fill="currentColor"/>
        <circle cx="47" cy="23" r="3" fill="currentColor"/>
      </svg>
    ),
  },
};
