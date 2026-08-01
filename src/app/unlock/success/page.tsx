"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { setPro } from "@/lib/pro";

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  // No session_id → fail from the first render (no effect-time setState).
  const [state, setState] = useState<"verifying" | "ok" | "fail">(
    sessionId ? "verifying" : "fail"
  );

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.paid) {
          setPro(true);
          setState("ok");
        } else {
          setState("fail");
        }
      })
      .catch(() => active && setState("fail"));
    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "56px 20px", textAlign: "center" }}>
      {state === "verifying" && (
        <p className="btc-text-muted" style={{ fontSize: 16 }}>Confirming your purchase…</p>
      )}
      {state === "ok" && (
        <>
          <div style={{ fontSize: 44 }}>🎉</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--btc-accent-deep)", marginTop: 8 }}>
            Pro unlocked!
          </h1>
          <p className="btc-text-muted" style={{ marginTop: 8, fontSize: 15 }}>
            Thank you for supporting Bible Coach. Everything is unlocked on this device.
          </p>
          <Link
            href="/play"
            style={{
              display: "inline-block",
              marginTop: 22,
              padding: "12px 24px",
              borderRadius: 12,
              background: "var(--btc-accent-deep)",
              color: "#fff",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Start studying →
          </Link>
        </>
      )}
      {state === "fail" && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>Couldn&apos;t confirm purchase</h1>
          <p className="btc-text-muted" style={{ marginTop: 8, fontSize: 15 }}>
            If you were charged, contact allen@webeuseful.com and we&apos;ll sort it out.
          </p>
          <Link href="/pricing" style={{ display: "inline-block", marginTop: 20, color: "var(--btc-accent-deep)", fontWeight: 600 }}>
            ← Back to pricing
          </Link>
        </>
      )}
    </main>
  );
}

export default function UnlockSuccessPage() {
  return (
    <Suspense fallback={<main style={{ padding: 56, textAlign: "center" }} />}>
      <SuccessInner />
    </Suspense>
  );
}
