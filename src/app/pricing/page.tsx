"use client";

import { useState } from "react";
import Link from "next/link";
import { useIsPro } from "@/lib/pro";
import { useIsIosNative, purchasePro, restorePro } from "@/lib/iap";

export default function PricingPage() {
  const pro = useIsPro();
  const ios = useIsIosNative();
  const [status, setStatus] = useState<"idle" | "loading" | "soon" | "error" | "restoring">("idle");

  async function unlock() {
    setStatus("loading");
    try {
      // Inside the iOS app, Apple requires StoreKit — not Stripe.
      if (ios) {
        await purchasePro(); // sets Pro on success; user-cancel is a no-op
        setStatus("idle");
        return;
      }
      const res = await fetch("/api/checkout", { method: "POST" });
      if (res.status === 503) {
        setStatus("soon");
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  async function restore() {
    setStatus("restoring");
    try {
      await restorePro(); // sets Pro if a prior purchase is found
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "32px 18px 64px",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--btc-accent-deep)" }}>
        Bible Coach Pro
      </h1>
      <p className="btc-text-muted" style={{ marginTop: 6, fontSize: 15 }}>
        Bible study is a daily habit. Unlock everything once — no subscription.
      </p>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          marginTop: 24,
        }}
      >
        {/* Free */}
        <section
          style={{
            padding: 20,
            borderRadius: 18,
            border: "1px solid var(--btc-accent-border)",
            background: "transparent",
            color: "inherit",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18 }}>Free</div>
          <div style={{ fontSize: 30, fontWeight: 800, margin: "6px 0" }}>$0</div>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.9, fontSize: 14 }}>
            <li>1 reading plan</li>
            <li>Daily verse + daily challenge</li>
            <li>Core trivia packs</li>
          </ul>
        </section>

        {/* Pro */}
        <section
          style={{
            padding: 20,
            borderRadius: 18,
            border: "2px solid var(--btc-accent-deep)",
            background: "var(--btc-accent-soft)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -12,
              right: 16,
              background: "var(--btc-accent-deep)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
            }}
          >
            MOST POPULAR
          </span>
          <div style={{ fontWeight: 800, fontSize: 18, color: "var(--btc-accent-deep)" }}>
            Pro
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, margin: "6px 0" }}>
            $2.99 <span style={{ fontSize: 14, fontWeight: 600 }}>one-time</span>
          </div>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.9, fontSize: 14 }}>
            <li>Everything in Free</li>
            <li>All reading plans &amp; difficulty levels</li>
            <li>Unlimited challenges</li>
            <li>Family game history</li>
            <li>Offline access</li>
          </ul>

          {pro ? (
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--btc-accent-deep)",
                color: "#fff",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              ✓ Pro unlocked — thank you!
            </div>
          ) : (
            <button
              onClick={unlock}
              disabled={status === "loading" || status === "restoring"}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "13px 16px",
                borderRadius: 12,
                border: "none",
                background: "var(--btc-accent-deep)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: status === "loading" ? "default" : "pointer",
              }}
            >
              {status === "loading" ? "Starting checkout…" : "Unlock Pro — $2.99"}
            </button>
          )}

          {/* Apple requires a restore path for non-consumable purchases. */}
          {ios && !pro && (
            <button
              onClick={restore}
              disabled={status === "loading" || status === "restoring"}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                color: "var(--btc-accent-deep)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {status === "restoring" ? "Restoring…" : "Restore purchase"}
            </button>
          )}

          {status === "soon" && (
            <p className="btc-text-muted" style={{ marginTop: 10, fontSize: 13 }}>
              Pro checkout is launching shortly — check back soon.
            </p>
          )}
          {status === "error" && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#b91c1c" }}>
              Something went wrong. Please try again.
            </p>
          )}
          <p className="btc-text-muted" style={{ marginTop: 10, fontSize: 12 }}>
            {ios ? (
              "No subscription — a one-time purchase through the App Store."
            ) : (
              <>
                No subscription. Also available on the{" "}
                <a
                  href="https://apps.apple.com/app/id6788610253"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--btc-accent-deep)" }}
                >
                  iOS App Store
                </a>
                .
              </>
            )}
          </p>
        </section>
      </div>

      <div style={{ marginTop: 28 }}>
        <Link href="/play" style={{ color: "var(--btc-accent-deep)", fontWeight: 600 }}>
          ← Back to Bible Coach
        </Link>
      </div>
    </main>
  );
}
