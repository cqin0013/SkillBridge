// English comments only inside code:
// Analyzer placeholder. Replace the card with your actual UI.

export default function Analyzer() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-semibold">Analyzer</h1>
      <p className="mt-3 text-ink-soft">
        Run analyses, compare regions, and export insights from here.
      </p>

      <section className="mt-8 rounded-xl border border-border bg-white p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-ink">Input A</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Type something..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Input B</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Type something else..."
            />
          </div>
        </div>

        <div className="mt-6">
          <button className="rounded-md bg-primary px-4 py-2 text-white shadow-sm hover:opacity-90">
            Run Analysis
          </button>
        </div>
      </section>
    </div>
  )
}
