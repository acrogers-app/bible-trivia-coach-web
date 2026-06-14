export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <h1 className="text-3xl font-bold">Bible Trivia Coach (Web)</h1>
        <p className="text-slate-600">
          Welcome to the early web version of Bible Trivia Coach. We&apos;re still
          wiring up the full experience, but you can preview the quiz content now.
        </p>
        <a
          href="/dev"
          className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700 transition"
        >
          Open quiz preview
        </a>
      </div>
    </main>
  );
}
