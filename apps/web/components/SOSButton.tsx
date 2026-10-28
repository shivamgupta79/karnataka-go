"use client";
import { useState } from "react";

export default function SOSButton() {
  const [open, setOpen]     = useState(false);
  const [locMsg, setLocMsg] = useState("");

  function shareLocation() {
    if (!navigator.geolocation) { setLocMsg("Location not available on this device."); return; }
    setLocMsg("Getting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Notify admin dashboard
        fetch("/api/sos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lat, lng, message: "SOS — location shared via WhatsApp" }),
        }).catch(() => {});
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        const waText  = `🚨 EMERGENCY — I need help!\nMy live location: ${mapsUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");
        setLocMsg("");
      },
      () => setLocMsg("Could not get location. Share manually."),
      { timeout: 10000 }
    );
  }

  return (
    <>
      {/* Floating SOS button */}
      <button
        onClick={() => {
          setOpen(true);
          // Notify admin that SOS was opened (no location yet)
          fetch("/api/sos", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: "SOS button opened" }),
          }).catch(() => {});
        }}
        aria-label="Emergency SOS"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full text-white font-extrabold text-sm shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ background: "#c0152e", boxShadow: "0 4px 20px rgba(192,21,46,0.5)" }}
      >
        SOS
      </button>

      {/* SOS modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold" style={{ color: "#c0152e" }}>🚨 Emergency</h2>
              <button onClick={() => setOpen(false)} className="opacity-50 hover:opacity-100 text-xl leading-none">×</button>
            </div>

            <p className="text-sm opacity-70">In case of emergency, use the options below. Stay calm.</p>

            {/* Call 112 */}
            <a href="tel:112"
              className="flex items-center gap-3 w-full rounded-xl px-4 py-3.5 font-bold text-white text-sm"
              style={{ background: "#c0152e" }}>
              <span className="text-xl">📞</span>
              <span>Call 112 — National Emergency</span>
            </a>

            {/* Women helpline */}
            <a href="tel:1091"
              className="flex items-center gap-3 w-full rounded-xl px-4 py-3.5 font-bold text-white text-sm"
              style={{ background: "#7c3aed" }}>
              <span className="text-xl">👩</span>
              <span>Call 1091 — Women Helpline</span>
            </a>

            {/* Police */}
            <a href="tel:100"
              className="flex items-center gap-3 w-full rounded-xl px-4 py-3.5 font-bold text-white text-sm"
              style={{ background: "#0369a1" }}>
              <span className="text-xl">🚔</span>
              <span>Call 100 — Police</span>
            </a>

            {/* Share location via WhatsApp */}
            <button onClick={shareLocation}
              className="flex items-center gap-3 w-full rounded-xl px-4 py-3.5 font-bold text-white text-sm"
              style={{ background: "#25D366" }}>
              <span className="text-xl">📍</span>
              <span>Share my location via WhatsApp</span>
            </button>

            {locMsg && <p className="text-xs opacity-70 text-center">{locMsg}</p>}

            <p className="text-xs opacity-50 text-center">
              KSRTC breakdown: 1800-599-0066 · Tourist helpline: 1800-425-0087
            </p>
          </div>
        </div>
      )}
    </>
  );
}
