// English comments only inside code:
// Simple footer with site links.

export default function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="container flex h-16 flex-col items-center justify-center gap-2 text-sm text-ink-soft lg:h-20 lg:flex-row lg:justify-between">
        <p>© {new Date().getFullYear()} SkillBridge. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <a href="#privacy" className="hover:text-ink">Privacy</a>
          <a href="#terms" className="hover:text-ink">Terms</a>
          <a href="#contact" className="hover:text-ink">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
