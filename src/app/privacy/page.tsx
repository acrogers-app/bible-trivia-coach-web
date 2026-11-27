import type { Metadata } from 'next';
import Link from 'next/link';
import BackLink from '../../components/BackLink';

export const metadata: Metadata = {
  title: 'Privacy Policy — Bible Study Coach',
  description:
    'How Bible Study Coach handles your data: your progress stays on your device, there are no accounts, and the app sends only what each feature needs.',
};

const sectionStyle = { marginTop: 28 } as const;
const headingStyle = {
  fontSize: 'var(--btc-heading-md)',
  color: 'var(--btc-text-main)',
  marginBottom: 8,
} as const;
const textStyle = {
  color: 'var(--btc-text-main)',
  fontSize: 'var(--btc-body-size)',
  lineHeight: 1.6,
  margin: '0 0 10px',
} as const;
const listStyle = {
  color: 'var(--btc-text-main)',
  fontSize: 'var(--btc-body-size)',
  lineHeight: 1.6,
  margin: '0 0 10px',
  paddingLeft: 22,
} as const;

export default function PrivacyPage() {
  return (
    <div className="btc-root" style={{ backgroundColor: 'var(--btc-elevated)' }}>
      <main className="btc-card">
        <BackLink />
        <h1 style={{ fontSize: 'var(--btc-heading-xl)', marginBottom: 4 }}>
          Privacy Policy
        </h1>
        <p style={{ ...textStyle, color: 'var(--btc-text-muted)' }}>
          {/* OPEN (Allen/counsel): REQUIRED before publishing: update the effective date below to the publish date of this version. */}
          Bible Study Coach · Effective July 8, 2026
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>The short version</h2>
          <p style={textStyle}>
            Bible Study Coach is designed to work without knowing who you are.
            There are no accounts, no sign-in, and no ads. Your name, streaks,
            and scores stay on your device. Data leaves your device only when a
            feature needs it: fetching Scripture or the home-page study total
            from our servers, sending a message through the contact form, or
            buying Pro. Each is described below.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>What stays on your device</h2>
          <p style={textStyle}>
            The app stores your progress locally so it can encourage you along
            the way:
          </p>
          <ul style={listStyle}>
            <li>The display name you optionally enter (shown only to you)</li>
            <li>Reading streaks, best scores, and lifetime totals</li>
            <li>Questions you missed, so you can practice them again</li>
            <li>Daily reading and challenge completion dates</li>
            <li>App settings (reader voice, speed, and preferences)</li>
            <li>Whether you have unlocked Pro</li>
            <li>
              Your Family Mode PIN, if you set one. It is stored in a scrambled
              form, but that form is not strong protection: anyone with access
              to the app&apos;s stored data could work out a 4-digit PIN.
            </li>
          </ul>
          <p style={textStyle}>
            None of this is transmitted to us or anyone else. Deleting the app
            (or clearing your browser data on the web) removes it permanently.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Quiz analytics</h2>
          <p style={textStyle}>
            Quiz analytics are currently turned off in the app, so it sends no
            quiz results. Your answers and scores stay on your device.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>What the app doesn&apos;t ask for</h2>
          <ul style={listStyle}>
            <li>No accounts or passwords</li>
            <li>No email address, unless you choose to give one (see below)</li>
            <li>No advertising identifiers, and no advertising code in the app</li>
            <li>No access to your location, contacts, photos, or files</li>
          </ul>
          <p style={textStyle}>
            Data that is sent to service providers to run the app is described
            below.
            {/* OPEN (counsel): whether and how to characterize this under sale/sharing laws (e.g. CCPA/CPRA, GDPR); no such claim is made here. */}
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Contact form</h2>
          <p style={textStyle}>
            If you send a message through the form on our Child Safety page,
            the app sends four things to our server at dashboard.webeuseful.com:
            your message, the email address you enter (optional), a label saying
            it came from this page, and the time it was sent. This lets us read
            your message; if you include an email address, we can reply. Like any web
            server, it also receives standard request information such as your
            IP address. Please don&apos;t include anyone else&apos;s personal
            information.
            {/* OPEN (Allen/counsel): how long messages and request logs are kept, and how deletion requests are handled. */}
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Buying Pro</h2>
          <p style={textStyle}>
            In the iPhone app, purchases are handled by Apple. We do not
            receive your payment details or Apple ID; the app only stores on
            your device that Pro is unlocked.
          </p>
          <p style={textStyle}>
            On the website, checkout is handled by{' '}
            <a href="https://stripe.com/privacy">Stripe</a>, which collects your
            email address and payment details. Your email address is kept with
            the purchase record in our Stripe account; we never see your card
            number. We do not currently send emails after a purchase.
            {/* Checked 2026-11-26 only (recheck the release deployment before publishing): production had no EMAILS_ENABLED or RESEND_API_KEY, so welcome emails
                are off (src/lib/welcomeEmail.ts). Before turning them on, disclose Resend here. */}
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Daily reminder</h2>
          <p style={textStyle}>
            If you turn on the optional daily reminder, the notification is
            scheduled entirely on your device. There are no push notifications
            and no remote messaging service involved.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Service providers</h2>
          <p style={textStyle}>
            Scripture passages and daily readings are fetched from our own
            server, hosted on <a href="https://vercel.com">Vercel</a>. Like any
            web server, it receives standard request information, such as IP
            addresses, when it delivers content. Our server code uses the IP
            address only to count requests, to prevent abuse.
            {/* Checked 2026-11-26 only (recheck the release deployment before publishing): production had no RATELIMIT_JWT, so the count stays in the server's memory
                and is not sent to Supabase (src/lib/rateLimit.ts). If that is configured, disclose Supabase here.
                OPEN (Allen): how long Vercel keeps request logs, and what Vercel itself does with them.
                Verified 2026-11-26: the only IP use in src/ is the rate limiter (src/lib/rateLimit.ts). */}
            {' '}The home page
            also loads a public study total from dashboard.webeuseful.com,
            which sees the same standard request information.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Children</h2>
          <p style={textStyle}>
            Bible Study Coach is made for all ages, including families
            playing together. The app has no accounts, and reading, listening,
            and quizzes need no personal information. The optional contact form
            is different: it sends a free-text message and, if one is entered,
            an email address. Children should ask a parent before using the
            contact form or buying Pro.
            {/* OPEN (counsel): children's-privacy (COPPA/GDPR-K) wording for the contact form. */}
            {' '}See our{' '}
            <Link href="/safety">Child Safety page</Link> for a plain-language guide
            for parents and teachers.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Deleting your data</h2>
          <p style={textStyle}>
            Local data: delete the app, or clear site data in your browser.
            Contact-form messages and web purchase records: email us at the
            address below.
            {/* OPEN (Allen/counsel): what we delete on request and what must be kept (e.g. payment records). */}
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Changes to this policy</h2>
          <p style={textStyle}>
            If we ever change how the app handles data, we will update this
            page and the effective date above before the change takes effect.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Contact</h2>
          {/* OPEN (counsel): name the legal entity responsible for this data (controller) and its address. */}
          <p style={textStyle}>
            Questions or concerns? Email{' '}
            <a href="mailto:allen@webeuseful.com">
              allen@webeuseful.com
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
