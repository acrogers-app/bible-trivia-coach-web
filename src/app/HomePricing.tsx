"use client";

import { useState } from "react";
import { useIsPro } from "@/lib/pro";

/**
 * Landing-page pricing section. The Unlock button starts Stripe Checkout
 * directly (same /api/checkout the /pricing page uses) — one click, no
 * intermediate page.
 */
export default function HomePricing() {
  const pro = useIsPro();
  const [status, setStatus] = useState<"idle" | "loading" | "soon" | "error">("idle");

  async function unlock() {
    setStatus("loading");
    try {
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

  return (
    <section
      style={{
        marginTop: 26,
        paddingTop: 18,
        borderTop: "1px solid var(--btc-border)",
      }}
    >
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--btc-ink)",
          marginBottom: 4,
          textAlign: "center",
        }}
      >
        Simple pricing. No surprises.
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "var(--btc-text-subtle)",
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        Free to study every day. Pay once for everything. No subscription ever.
      </p>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {/* Free */}
        <div
          style={{
            padding: 18,
            borderRadius: 16,
            border: "1px solid var(--btc-accent-border)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16 }}>Free</div>
          <div style={{ fontSize: 28, fontWeight: 800, margin: "4px 0" }}>$0</div>
          <p style={{ fontSize: 12, color: "var(--btc-text-muted)", margin: 0 }}>
            Forever. No account needed.
          </p>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.8, fontSize: 13 }}>
            <li>1 reading plan</li>
            <li>Daily verse + daily challenge</li>
            <li>Core trivia packs</li>
          </ul>
        </div>

        {/* Pro */}
        <div
          style={{
            padding: 18,
            borderRadius: 16,
            border: "2px solid var(--btc-accent-deep)",
            background: "var(--btc-accent-soft)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -11,
              right: 14,
              background: "var(--btc-accent-deep)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
            }}
          >
            PAY ONCE
          </span>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--btc-accent-deep)" }}>
            Bible Coach Pro
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, margin: "4px 0" }}>
            $2.99 <span style={{ fontSize: 13, fontWeight: 600 }}>one-time</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--btc-text-muted)", margin: 0 }}>
            Pay once. Own it forever.
          </p>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.8, fontSize: 13 }}>
            <li>All reading plans &amp; difficulty levels</li>
            <li>Unlimited challenges</li>
            <li>Family game history</li>
            <li>Offline access</li>
          </ul>

          {pro ? (
            <div
              style={{
                marginTop: 14,
                padding: "11px 14px",
                borderRadius: 12,
                background: "var(--btc-accent-deep)",
                color: "#fff",
                fontWeight: 700,
                textAlign: "center",
                fontSize: 14,
              }}
            >
              ✓ Pro unlocked — thank you!
            </div>
          ) : (
            <button
              onClick={unlock}
              disabled={status === "loading"}
              style={{
                marginTop: 14,
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "none",
                background: "var(--btc-accent-deep)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: status === "loading" ? "default" : "pointer",
              }}
            >
              {status === "loading" ? "Starting checkout…" : "Unlock Pro — $2.99"}
            </button>
          )}

          {status === "soon" && (
            <p className="btc-text-muted" style={{ marginTop: 8, fontSize: 12 }}>
              Pro checkout is launching shortly — check back soon.
            </p>
          )}
          {status === "error" && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>
              Something went wrong. Please try again.
            </p>
          )}
          <p
            className="btc-text-muted"
            style={{ marginTop: 8, fontSize: 11, textAlign: "center" }}
          >
            Secure one-time checkout by Stripe. Also on the{" "}
            <a
              href="https://apps.apple.com/app/id6788610253"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--btc-accent-deep)" }}
            >
              iOS App Store
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
