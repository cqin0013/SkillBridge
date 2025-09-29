// English comments only inside code:
// Simple footer with site links.

export default function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="container flex h-16 flex-col items-center justify-center gap-2 text-sm text-ink-soft lg:h-20 lg:flex-row lg:justify-between">
        <p>© {new Date().getFullYear()} StrangerThinks. </p>
      </div>
    </footer>
  )
}
