import { Suspense } from "react";
import AuthContent from "./AuthContent";

// useSearchParams() must be inside a Suspense boundary in Next.js App Router
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4"
          style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }} />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
