import type { Metadata } from 'next';
import SafetyContactForm from './SafetyContactForm';

export const metadata: Metadata = {
  title: 'Child Safety — Bible Study Coach',
  description:
    'How Bible Study Coach keeps kids and families safe: no accounts, no messaging, no data collection from children, scripture-sourced content, and a Family Mode for parents.',
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
    <div className="btc-root" style={{ backgroundColor: '#f3f4f6' }}>
      <main className="btc-card">
        <h1 style={{ fontSize: 'var(--btc-heading-xl)', marginBottom: 4 }}>
          🔒 Child Safety
        </h1>
        <p style={{ ...textStyle, color: 'var(--btc-text-muted)' }}>
          Bible Study Coach — for parents, teachers, and church leaders
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>The short version</h2>
          <p style={textStyle}>
            Bible Study Coach has no accounts, no chat, no social features, and
            collects no personal information — from anyone, of any age. A child
            using this app cannot be contacted, found, or profiled through it.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Can anyone contact my child?</h2>
          <p style={textStyle}>
            <strong>No.</strong> There is no messaging, chat, comments, friend
            lists, or any communication feature in the app. Family Night
            multiplayer is pass-and-play on one device in the same room — nothing
            is shared online.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>What information is collected?</h2>
          <ul style={listStyle}>
            <li>No accounts, sign-in, or email addresses</li>
            <li>No real names — the optional display name stays on the device</li>
            <li>No age, location, contacts, photos, or advertising identifiers</li>
            <li>Progress, streaks, and scores are stored only on your device</li>
          </ul>
          <p style={textStyle}>
            The only data that can leave the device is anonymous quiz statistics
            (which questions are too hard or confusing), and parents can switch
            those off entirely with <strong>Family Mode</strong> in Settings or the
            analytics toggle. See the{' '}
            <a href="/privacy">full privacy policy</a> for details.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Content safety</h2>
          <p style={textStyle}>
            All Bible content is sourced directly from scripture. Quiz questions
            are written in advance, reviewed, and shipped with the app — nothing
            is generated live while your child plays, and there is no chat-style
            AI in the app. AI features only answer questions about Biblical
            content and will not engage with off-topic requests.
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
            Settings. It switches off all analytics, shows a visible
            &ldquo;Family Mode — Child Safe&rdquo; banner, and can only be turned
            off again with the parent PIN chosen when enabling it.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Is data sold or shared?</h2>
          <p style={textStyle}>
            <strong>Never.</strong> There are no ads, no data brokers, and no
            selling or sharing of data — there is no personal data to sell.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>For churches and classrooms</h2>
          <p style={textStyle}>
            The app is safe to recommend to your congregation or class: it works
            without accounts, requires no personal information from children, and
            works offline once loaded. Teachers can enable Family Mode on shared
            devices before handing them out.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Questions?</h2>
          <p style={textStyle}>
            Send us your question or concern — our safety team reads every
            message and reviews it within 48 hours.
          </p>
          <SafetyContactForm />
        </section>
      </main>
    </div>
  );
}
