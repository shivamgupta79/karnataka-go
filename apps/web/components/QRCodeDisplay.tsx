"use client";
import { useEffect, useRef, useState } from "react";
import { encodeQR } from "@/lib/qr";
import type { QRPayload } from "@/lib/qr";
import { generateQR } from "@/lib/qrcode";

interface QRCodeDisplayProps {
  payload: QRPayload;
  size?: number;
}

/**
 * Renders the user's QR code fully client-side: the signed token is built with
 * encodeQR, the module matrix is produced by the local encoder (lib/qrcode),
 * and the image is drawn onto a <canvas>. The payload never leaves the browser
 * (no third-party QR API), and the download button works because the canvas is
 * same-origin.
 */
export default function QRCodeDisplay({ payload, size = 220 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setReady(false);
    encodeQR(payload)
      .then((token) => {
        if (cancelled) return;
        const { matrix } = generateQR(token);
        drawMatrix(canvasRef.current, matrix, size);
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to generate QR code");
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  function downloadQR() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "karnatakago-qr.png";
    a.click();
  }

  if (error)
    return (
      <p className="text-sm" style={{ color: "var(--color-silk)" }}>
        {error}
      </p>
    );

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-xl border flex items-center justify-center overflow-hidden"
        style={{ borderColor: "var(--color-temple-2)", width: size, height: size }}
      >
        {!ready && (
          <div
            className="w-full h-full animate-pulse"
            style={{ background: "var(--color-temple-2)" }}
          />
        )}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          style={{ display: ready ? "block" : "none" }}
          aria-label="Your KarnatakaGo QR code"
        />
      </div>
      <p className="text-xs opacity-50 max-w-[220px] text-center leading-snug">
        Only works on KarnatakaGo. Refresh the page to get a fresh code.
      </p>
      <button
        onClick={downloadQR}
        disabled={!ready}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80 disabled:opacity-40"
        style={{
          borderColor: "var(--color-forest)",
          color: "var(--color-forest)",
        }}
      >
        ⬇ Download QR
      </button>
    </div>
  );
}

/** Draw a QR module matrix to a canvas with a 4-module quiet zone. */
function drawMatrix(
  canvas: HTMLCanvasElement | null,
  matrix: boolean[][],
  displaySize: number
): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const n = matrix.length;
  const quiet = 4; // modules of quiet zone on every side
  const total = n + quiet * 2;
  const pixel = displaySize / total;
  // Light background for the whole code (including quiet zone).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, displaySize, displaySize);
  // Dark modules.
  ctx.fillStyle = "#000000";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          Math.floor((c + quiet) * pixel),
          Math.floor((r + quiet) * pixel),
          Math.ceil(pixel),
          Math.ceil(pixel)
        );
      }
    }
  }
}
