"use client";

import { useEffect, useState } from "react";

/**
 * Portfolio cross-promo: live combined downloads+visits total across the whole
 * Webeuseful portfolio, fetched from the Command Center public API. Same
 * endpoint, 1h localStorage cache, and hidden-on-error behavior as the hub
 * sites. Renders nothing until a valid number arrives, so a failed/unreachable
 * API simply shows no line rather than a placeholder or broken text.
 */
const API = "https://dashboard.webeuseful.com/api/public-totals";
const LS_KEY = "weu_totals_v1";
const MAX_AGE = 3600000; // 1 hour

function readFreshCache(): number | null {
  try {
    const cached = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (
      cached &&
      typeof cached.n === "number" &&
      Date.now() - cached.t < MAX_AGE
    ) {
      return cached.n;
    }
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

export function LiveTotalPromo() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = readFreshCache();
    if (cached !== null) {
      Promise.resolve().then(() => {
        if (!cancelled) setTotal(cached);
      });
      return () => {
        cancelled = true;
      };
    }

    fetch(API, { mode: "cors" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const n = d.total_combined;
        if (typeof n === "number" && n > 0) {
          setTotal(n);
          try {
            localStorage.setItem(LS_KEY, JSON.stringify({ n, t: Date.now() }));
          } catch {
            /* storage unavailable — non-fatal */
          }
        }
      })
      .catch(() => {
        /* API unreachable — stay hidden */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (total === null || total <= 0) return null;

  const floored = Math.floor(total / 10) * 10;
  return (
    <p
      style={{
        fontSize: 13,
        color: "var(--btc-text-muted)",
        textAlign: "center",
        margin: "4px 0 18px",
      }}
    >
      <a
        href="https://apps.webeuseful.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--btc-text-mid)" }}
      >
        Part of a growing portfolio — {floored.toLocaleString()}+ combined
        downloads &amp; visits across iOS and web ↗
      </a>
    </p>
  );
}
