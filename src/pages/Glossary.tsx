// English comments only inside code:
// 404 page rendered inside the layout.

import { Link } from "react-router-dom"

export default function Glossary() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-ink-soft">Page not found</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-white">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
