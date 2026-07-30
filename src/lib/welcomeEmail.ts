/**
 * Welcome email for Bible Study Coach Pro buyers, via the Resend REST API.
 *
 * Safety gates:
 *   - RESEND_API_KEY missing        → skipped (reported, never throws)
 *   - EMAILS_ENABLED !== "true"     → dry-run log only (nothing sent)
 *   - Idempotency-Key per checkout session → success-page revisits can't
 *     double-send within Resend's dedup window.
 */

const ICON = "https://biblestudy.webeuseful.com/icons/icon-192x192.png"; // verified live 2026-07-30

function welcomeHtml(): string {
  return `
  <div style="background:#faf5ff;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="background:#ffffff;border-radius:12px;margin:0 auto;max-width:560px;overflow:hidden;">
      <div style="background:#3b0764;padding:28px 40px;text-align:left;">
        <img src="${ICON}" width="48" height="48" alt="Bible Study Coach" style="border-radius:10px;display:block;" />
        <p style="color:#ffffff;font-size:22px;font-weight:800;margin:12px 0 0;">Welcome to Bible Study Coach!</p>
        <p style="color:#d8b4fe;font-size:13px;margin:4px 0 0;">Study deeper, every day.</p>
      </div>
      <div style="padding:32px 40px;color:#1f2937;font-size:16px;line-height:1.6;">
        <p style="margin:0 0 16px;"><strong>Pro</strong> is unlocked. Thanks for supporting an indie developer — one-time purchase, no subscription, yours forever.</p>
        <p style="margin:0 0 8px;"><strong>What you just unlocked:</strong></p>
        <ul style="margin:0 0 20px;padding-left:20px;">
          <li>Every quiz pack and study plan</li>
          <li>Full coach features</li>
          <li>Everything we add to Pro later</li>
        </ul>
        <a href="https://biblestudy.webeuseful.com" style="background:#7c3aed;border-radius:10px;color:#ffffff;display:inline-block;font-weight:700;padding:12px 24px;text-decoration:none;">Start studying →</a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#6b7280;font-size:14px;margin:0;">Questions? Just reply to this email — it goes straight to a human.</p>
      </div>
      <p style="color:#6b7280;font-size:13px;padding:0 40px 32px;margin:0;">Bible Study Coach by Webeuseful · <a href="https://biblestudy.webeuseful.com" style="color:#7c3aed;">biblestudy.webeuseful.com</a></p>
    </div>
  </div>`;
}

export async function sendWelcomeEmail({
  to,
  sessionId,
}: {
  to: string | null | undefined;
  sessionId: string;
}): Promise<{ sent?: boolean; skipped?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: "RESEND_API_KEY not set" };
  if (process.env.EMAILS_ENABLED !== "true") {
    console.log(`[email] DRY RUN (EMAILS_ENABLED != "true") — would send Bible welcome to ${to}`);
    return { skipped: "EMAILS_ENABLED not true" };
  }
  if (!to) return { skipped: "no customer email on session" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `bible-welcome-${sessionId}`,
      },
      body: JSON.stringify({
        from: "Bible Study Coach <noreply@webeuseful.com>",
        to: [to],
        reply_to: "allen.webeuseful@gmail.com",
        subject: "Welcome to Bible Study Coach!",
        html: welcomeHtml(),
      }),
    });
    if (!res.ok) {
      console.error("[email] resend rejected:", res.status, (await res.text()).slice(0, 200));
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { sent: false };
  }
}
