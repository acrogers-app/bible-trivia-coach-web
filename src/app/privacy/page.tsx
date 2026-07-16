import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Bible Study Coach',
  description:
    'How Bible Study Coach handles your data: everything important stays on your device, and quiz analytics are anonymous and optional.',
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
    <div className="btc-root" style={{ backgroundColor: '#f3f4f6' }}>
      <main className="btc-card">
        <h1 style={{ fontSize: 'var(--btc-heading-xl)', marginBottom: 4 }}>
          Privacy Policy
        </h1>
        <p style={{ ...textStyle, color: 'var(--btc-text-muted)' }}>
          Bible Study Coach · Effective July 8, 2026
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>The short version</h2>
          <p style={textStyle}>
            Bible Study Coach is designed to work without knowing who you are.
            There are no accounts, no sign-in, and no ads. Your name, streaks,
            and scores stay on your device. The only data that ever leaves your
            device is anonymous quiz statistics — and you can turn those off in
            Settings.
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
          </ul>
          <p style={textStyle}>
            None of this is transmitted to us or anyone else. Deleting the app
            (or clearing your browser data on the web) removes it permanently.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Anonymous quiz analytics</h2>
          <p style={textStyle}>
            To learn which questions are too hard, too easy, or confusing, the
            app sends anonymous quiz results to our server: a random session
            ID, the quiz title, which questions were answered correctly or
            incorrectly, and the related Scripture references.
          </p>
          <p style={textStyle}>
            These reports contain no name, email, device identifier, or
            location — the random session ID is not connected to you and
            resets with every quiz session. We use{' '}
            <a href="https://langfuse.com">Langfuse</a> to aggregate these
            statistics.
          </p>
          <p style={textStyle}>
            You can turn analytics off any time in <strong>Settings</strong>,
            and the app respects that choice immediately.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>What we never collect</h2>
          <ul style={listStyle}>
            <li>No accounts, passwords, or email addresses</li>
            <li>No advertising or advertising identifiers</li>
            <li>No location data</li>
            <li>No contacts, photos, or files</li>
            <li>No selling or sharing of data with data brokers — ever</li>
          </ul>
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
            web server, it briefly processes standard request information
            (such as IP addresses) to deliver content; we do not use this to
            identify or profile you. Anonymous analytics are processed by
            Langfuse as described above.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Children</h2>
          <p style={textStyle}>
            Bible Study Coach is made for all ages, including families
            playing together. Because we collect no personal information from
            anyone, we collect none from children either.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Deleting your data</h2>
          <p style={textStyle}>
            Local data: delete the app, or clear site data in your browser.
            Analytics: because reports are anonymous, they cannot be traced
            back to you — there is nothing linking them to your identity that
            we could look up or delete.
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
          <p style={textStyle}>
            Questions or concerns? Email{' '}
            <a href="mailto:allen.webeuseful@gmail.com">
              allen.webeuseful@gmail.com
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
