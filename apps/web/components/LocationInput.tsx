"use client";
import { useEffect, useRef, useState } from "react";
import { autocompleteLocations, type KnownLocation } from "@/lib/locations";

interface Props {
  label: string;
  icon: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export default function LocationInput({ label, icon, placeholder, value, onChange }: Props) {
  const [query, setQuery]      = useState(value);
  const [suggestions, setSugg] = useState<KnownLocation[]>([]);
  const [open, setOpen]        = useState(false);
  const [highlighted, setHl]   = useState(0);
  const containerRef           = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  function handleInput(val: string) {
    setQuery(val);
    onChange(val);
    const matches = autocompleteLocations(val);
    setSugg(matches);
    setOpen(matches.length > 0);
    setHl(0);
  }

  function pick(loc: KnownLocation) {
    setQuery(loc.name);
    onChange(loc.name);
    setSugg([]);
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHl((h) => Math.min(h + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHl((h) => Math.max(h - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); if (suggestions[highlighted]) pick(suggestions[highlighted]); }
    if (e.key === "Escape")    { setOpen(false); }
  }

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="form-label">
        <span>{icon} {label}</span>
        <input
          type="text"
          className="field"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          onKeyDown={handleKey}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </label>

      {open && suggestions.length > 0 && (
        <ul role="listbox" className="location-dropdown">
          {suggestions.map((loc, i) => (
            <li
              key={loc.id}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={() => pick(loc)}
              onMouseEnter={() => setHl(i)}
              className={`location-option${i === highlighted ? " location-option--active" : ""}`}
            >
              {/* Custom pin icon — no emoji rendering differences */}
              <svg viewBox="0 0 16 20" className="location-pin" aria-hidden="true">
                <path d="M8 0C4.686 0 2 2.686 2 6c0 4.5 6 14 6 14s6-9.5 6-14c0-3.314-2.686-6-6-6zm0 8.5A2.5 2.5 0 1 1 8 3.5a2.5 2.5 0 0 1 0 5z"
                  fill="currentColor"/>
              </svg>
              <span className="location-name">{loc.name}</span>
              <span className="location-state">{loc.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
