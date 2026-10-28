"use client";
import { useEffect, useRef, useState } from "react";
import { verifyQR } from "@/lib/qr";

interface ScannedUser {
  uid: string;
  name: string;
  username?: string;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface QRScannerProps {
  onClose: () => void;
  /** Optional: called with the raw verified QR token string instead of doing a
   *  profile lookup. Used when the scanner is opened from the chat page to
   *  connect to another user (the chat page handles the lookup + navigation). */
  onVerified?: (token: string) => void;
}

export default function QRScanner({ onClose, onVerified }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<ScannedUser | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera as a visual aid — the browser has no built-in QR-decode
  // capability without a library. To scan a KarnatakaGo QR:
  //   1. Open your phone camera app and point it at the QR code.
  //   2. Your camera app will show the QR text; copy it.
  //   3. Paste it into the text area below and tap Verify QR.
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraActive(true);
      })
      .catch(() => {
        if (!cancelled)
          setCameraError(
            "Camera not available — use your phone's camera app to read the QR, then paste the text below."
          );
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function handlePaste() {
    const text = pasteText.trim();
    if (!text) return;
    setScanning(true);
    setScanError(null);
    setResult(null);

    const verification = await verifyQR(text);
    if (!verification.ok) {
      setScanError(verification.error);
      setScanning(false);
      return;
    }

    // If caller wants the raw token (e.g. chat page connect flow), hand it off
    if (onVerified) {
      setScanning(false);
      onVerified(text);
      return;
    }

    const { uid } = verification.payload;
    try {
      const res = await fetch(
        `/api/profile/lookup/${encodeURIComponent(uid)}`
      );
      if (!res.ok) {
        setScanError("User not found");
        setScanning(false);
        return;
      }
      const data = (await res.json()) as ScannedUser;
      setResult(data);
    } catch {
      setScanError("Network error — try again");
    }
    setScanning(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card p-5 max-w-sm w-full mx-4 relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 opacity-50 hover:opacity-100 text-lg"
          aria-label="Close scanner"
        >
          ✕
        </button>
        <h2 className="font-bold text-lg" style={{ color: "var(--color-forest)" }}>
          📷 Scan QR Code
        </h2>

        {/* Camera preview — visual aid to frame the QR; not a decoder */}
        {!cameraError ? (
          <div
            className="rounded-xl overflow-hidden bg-black relative"
            style={{ aspectRatio: "1/1" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-4 text-center">
                Starting camera…
              </div>
            )}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="border-2 border-white/70 rounded-lg"
                  style={{ width: "60%", aspectRatio: "1/1" }}
                />
              </div>
            )}
            <div
              className="absolute bottom-0 inset-x-0 text-center text-white/80 text-xs py-2"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              Use your camera app to read the QR, then paste the text below
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-4 text-sm text-center"
            style={{ background: "var(--color-saffron-3)" }}
          >
            {cameraError}
          </div>
        )}

        {/* Paste path — the primary (and only) verification path */}
        <div className="space-y-2">
          <p className="text-xs font-medium opacity-70">
            Paste the QR code text to verify:
          </p>
          <textarea
            className="field text-xs"
            rows={3}
            placeholder="KGOAPP:v1:…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            aria-label="Paste QR code text"
          />
          <button
            onClick={handlePaste}
            disabled={scanning || !pasteText.trim()}
            className="submit-btn text-sm py-2"
          >
            {scanning ? "Verifying…" : "Verify QR"}
          </button>
        </div>

        {scanError && (
          <div className="alert-error text-sm">{scanError}</div>
        )}

        {result && (
          <div
            className="card p-4 space-y-1 border-2"
            style={{ borderColor: "var(--color-forest)" }}
          >
            <p className="font-bold">{result.name}</p>
            {result.username && (
              <p className="text-xs opacity-60">@{result.username}</p>
            )}
            {result.email && <p className="text-xs">📧 {result.email}</p>}
            {result.phone && <p className="text-xs">📱 {result.phone}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
