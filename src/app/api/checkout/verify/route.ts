import Stripe from "stripe";
import { sendWelcomeEmail } from "@/lib/welcomeEmail";

export const runtime = "nodejs";

// Server-side purchase verification. The client calls this after returning from
// Stripe with a session_id; only a genuinely paid session unlocks Pro.
export async function GET(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return Response.json({ paid: false, error: "not_configured" }, { status: 503 });
  }

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return Response.json({ paid: false, error: "missing_session_id" }, { status: 400 });
  }

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // Bind to this app: the shared Stripe account delivers other apps' sessions
    // here too, so a paid session from ANOTHER app must NOT unlock Bible Coach.
    // Requires metadata.app === "bible" (see SHARED_STRIPE_ACCOUNT_RULES.md).
    const paid =
      session.payment_status === "paid" && session.metadata?.app === "bible";
    if (paid) {
      // Welcome email (gated + idempotent per session; never blocks the unlock).
      await sendWelcomeEmail({
        to: session.customer_details?.email,
        sessionId,
      }).catch(() => {});
    }
    return Response.json({ paid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "verify_failed";
    return Response.json({ paid: false, error: message }, { status: 500 });
  }
}
