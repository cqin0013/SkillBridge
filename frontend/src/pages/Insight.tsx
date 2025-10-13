// English comments only inside code:
// Insight placeholder with two cards.

export default function Insight() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-semibold">Insights</h1>
      <p className="mt-3 text-ink-soft">Key trends and highlights generated from your data.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-ink">Top Occupations</h3>
          <p className="mt-2 text-sm text-ink-soft">Placeholder for a chart or list.</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-ink">Regional Comparison</h3>
          <p className="mt-2 text-sm text-ink-soft">Another placeholder component.</p>
        </div>
      </div>
    </div>
  )
}
