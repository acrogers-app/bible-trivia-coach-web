import Stripe from "stripe";

export const runtime = "nodejs";

// One-time $2.99 "Bible Coach Pro" unlock. Account-less: success is verified
// server-side (/api/checkout/verify) and mirrored to a local entitlement flag.
// Dormant until env is set — returns 503 { error: "not_configured" } so the
// pricing UI can show "coming soon" instead of a broken button.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_BIBLE_COACH;

  if (!secret || !price) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  if (process.env.VERCEL_ENV === "production" && secret.startsWith("sk_test_")) {
    console.warn(
      "[stripe] WARNING: TEST secret key in production — checkouts open as Sandbox and charge no real money."
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.headers.get("origin") ||
    "https://biblestudy.webeuseful.com";

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Shared Stripe account: tag the app so foreign webhooks (e.g.
      // AssistantNotes) never mint a license for a Bible Coach sale.
      metadata: { app: "bible" },
      // Per-app bank-statement descriptor: shows "WEBEUSEFUL* BIBLECOACH".
      // (Suffix kept ≤10 chars so account descriptor + suffix stays ≤22.)
      payment_intent_data: { statement_descriptor_suffix: "BIBLECOACH", metadata: { app: "bible" } },
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/unlock/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "checkout_failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
