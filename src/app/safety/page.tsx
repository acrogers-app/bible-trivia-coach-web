import type { Metadata } from 'next';
import Link from 'next/link';
import BackLink from '../../components/BackLink';
import SafetyContactForm from './SafetyContactForm';

export const metadata: Metadata = {
  title: 'Child Safety — Bible Study Coach',
  description:
    'How Bible Study Coach keeps kids and families safe: no accounts, no messaging between users, no personal information needed for reading or quizzes, scripture-sourced content, and a Family Mode for parents.',
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

export default function SafetyPage() {
  return (
    <div className="btc-root" style={{ backgroundColor: 'var(--btc-elevated)' }}>
      <main className="btc-card">
        <BackLink />
        <h1 style={{ fontSize: 'var(--btc-heading-xl)', marginBottom: 4 }}>
          🔒 Child Safety
        </h1>
        <p style={{ ...textStyle, color: 'var(--btc-text-muted)' }}>
          Bible Study Coach — for parents, teachers, and church leaders
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>The short version</h2>
          <p style={textStyle}>
            Bible Study Coach has no accounts, no chat, no messaging, and no
            social features, so other users cannot message a child through the
            app. Reading, listening, and quizzes need no personal information.
            The one exception is the optional contact form at the bottom of this
            page: whatever is typed into it, a free-text message and, if
            entered, an email address, is sent to us.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Can anyone contact my child?</h2>
          <p style={textStyle}>
            <strong>Not other users.</strong> There is no messaging, chat,
            comments, or friend lists between users. Family Night multiplayer is
            pass-and-play on one device in the same room — nothing is shared
            online. The contact form sends a message to us only; if an email
            address is included, we can reply to it.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>What information is collected?</h2>
          <ul style={listStyle}>
            <li>No accounts or sign-in</li>
            <li>No real names — the optional display name stays on the device</li>
            <li>No age, location, contacts, photos, or advertising identifiers</li>
            <li>Progress, streaks, and scores are stored only on your device</li>
          </ul>
          <p style={textStyle}>
            The app currently sends no quiz statistics. Data leaves the device
            only to fetch Scripture or the home-page study total from our
            servers, when someone uses the contact form below, when Pro is
            bought on the website, or when Pro is bought in the iPhone app
            (Apple handles that purchase). Each of these requests also carries standard
            technical information that any web server receives, such as the
            device&apos;s IP address. The contact form sends four things to our
            server at dashboard.webeuseful.com: your message, the email address
            you enter (optional), a label saying it came from this page, and
            the time it was sent. See the{' '}
            <Link href="/privacy">full privacy policy</Link> for details.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Content safety</h2>
          <p style={textStyle}>
            All Bible content is sourced directly from scripture. Quiz questions
            are written in advance, reviewed, and shipped with the app — nothing
            is generated live while your child plays, and there is no chat-style
            AI in the app.
          </p>
          <p style={textStyle}>
            Questions avoid speculative or denomination-specific claims and stick
            to what is clear from the biblical text. The Coach character only
            encourages — never shames, pressures, or guilts.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Family Mode</h2>
          <p style={textStyle}>
            Parents and teachers can turn on <strong>Family Mode</strong> in
            Settings. It shows a visible &ldquo;Family Mode — Child Safe&rdquo;
            banner, and turning it off in Settings asks for the 4-digit parent
            PIN chosen when enabling it. The PIN is a simple lock against casual
            changes, not strong security: it is stored on the device in a form
            that someone with access to the app&apos;s data could work out, and
            deleting the app also turns Family Mode off.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Who receives data?</h2>
          <p style={textStyle}>
            The app shows no ads and contains no advertising code or
            advertising identifiers. To run the app, some data is sent
            to service providers: our website&apos;s hosting provider (Vercel),
            which receives every request to the website, such as loading a
            page, fetching Scripture (including from the iPhone app), or
            starting a website purchase, along with the standard request
            information described above; our
            dashboard server for contact-form messages and the study total;
            Stripe for purchases on the website; and Apple for purchases in the
            iPhone app. The{' '}
            <Link href="/privacy">privacy policy</Link> lists what each one
            receives.
            {/* OPEN (counsel): whether and how to characterize this under sale/sharing laws (e.g. CCPA/CPRA, GDPR); no such claim is made here. */}
            {/* OPEN (Allen/counsel): how providers may use this data and how long it is kept;
                the dashboard server code is not in this repo. */}
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>For churches and classrooms</h2>
          <p style={textStyle}>
            Some things to know before recommending the app to your congregation
            or class: it works without accounts, its reading and quiz features
            need no personal information, and it works offline once loaded.
            Teachers can enable Family Mode on shared devices before handing
            them out.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Questions?</h2>
          <p style={textStyle}>
            Send us a question or concern using the form below. If you include
            an email address, we can reply.
          </p>
          <SafetyContactForm />
        </section>
      </main>
    </div>
  );
}
