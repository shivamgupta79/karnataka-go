"use client";
import { useState } from "react";

interface ShareModalProps {
  title: string;
  url: string;
  text?: string;
  onClose: () => void;
}

export default function ShareModal({ title, url, text, onClose }: ShareModalProps) {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function shareWhatsApp() {
    const shareText = text ?? `${title}\n${url}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank");
  }

  function shareInstagram() {
    const igUrl =
      "instagram-stories://share?backgroundTopColor=%231a6b47&backgroundBottomColor=%23f59e0b";

    // Use a visibilitychange listener to detect whether the deep-link
    // successfully switched apps. If the page stays visible after the
    // timeout, the deep-link failed (desktop / unsupported device) and we
    // fall back to clipboard. If the page is hidden the Instagram app opened
    // and we cancel the fallback.
    let fallbackFired = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function onVisibilityChange() {
      if (document.hidden) {
        // Deep-link opened the app — suppress the clipboard fallback
        clearTimeout(timeoutId);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    timeoutId = setTimeout(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (!document.hidden && !fallbackFired) {
        fallbackFired = true;
        navigator.clipboard.writeText(url).then(() => {
          showToast("Link copied — paste in Instagram");
        });
      }
    }, 1500);

    window.location.href = igUrl;
  }

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      showToast("Copied!");
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card p-6 max-w-sm w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-forest)" }}>
          Share
        </h2>
        <p className="text-sm opacity-60 mb-5 pr-6 truncate">{title}</p>

        <div className="flex flex-col gap-3">
          {/* WhatsApp */}
          <button
            onClick={shareWhatsApp}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white flex items-center gap-3 transition-opacity hover:opacity-90"
            style={{ background: "#25D366" }}
          >
            <span className="text-xl">💬</span>
            Share on WhatsApp
          </button>

          {/* Instagram */}
          <button
            onClick={shareInstagram}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white flex items-center gap-3 transition-opacity hover:opacity-90"
            style={{ background: "var(--color-saffron-2)" }}
          >
            <span className="text-xl">📸</span>
            Share on Instagram
          </button>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold border flex items-center gap-3 transition-all hover:opacity-80"
            style={{
              borderColor: "var(--color-temple-2)",
              color: "var(--color-forest)",
            }}
          >
            <span className="text-xl">🔗</span>
            Copy link
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="mt-4 rounded-lg px-4 py-2 text-sm text-center font-semibold"
            style={{ background: "var(--color-forest-3)", color: "var(--color-forest)" }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
