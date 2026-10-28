import { Suspense } from "react";
import AuthContent from "./AuthContent";
import KarnatakaShowcase from "./KarnatakaShowcase";

export default function AuthPage() {
  return (
    <div className="auth-page-root">
      {/* ── Left panel — Karnataka visual showcase ── */}
      <div className="auth-left-panel">
        <KarnatakaShowcase />
      </div>

      {/* ── Right panel — auth form ── */}
      <div className="auth-right-panel">
        <Suspense fallback={
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4"
              style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }} />
          </div>
        }>
          <AuthContent />
        </Suspense>
      </div>
    </div>
  );
}
