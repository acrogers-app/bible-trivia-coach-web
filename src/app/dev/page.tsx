import { loadTriviaPack, loadReadingPlan } from '@/lib/data';
import { randomQuestions, todaysReadingDay } from '@/lib/quizLogic';

export default async function DevPage() {
  const pack = await loadTriviaPack();
  const plan = await loadReadingPlan();

  const questions = randomQuestions({
    pack,
    count: 5,
    sourceType: 'scripture',
  });

  const today = todaysReadingDay(plan);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h1 className="text-2xl font-bold mb-2">Dev quiz preview</h1>
          <p className="text-sm text-slate-600">
            This page is just to prove the web app can read your JSON pack and
            apply the random question logic.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Today&apos;s reading</h2>
          {today ? (
            <p className="text-sm text-slate-700">
              <span className="font-medium">{today.title}</span> —{' '}
              {today.start} – {today.end}
            </p>
          ) : (
            <p className="text-sm text-slate-500">No reading plan data.</p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sample questions</h2>
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-2"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Question {idx + 1} • {q.category} • {q.difficulty}
              </p>
              <p className="font-medium">{q.text}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {q.options.map((opt, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span>{opt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
