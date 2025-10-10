// src/pages/Feedback.tsx
/**
 * Feedback page (internal form)
 *
 * Features:
 * - Required validation (message, category, consent)
 * - Optional email validation
 * - Submitting state + aria-live announcements
 * - Focus first invalid field on submit
 * - Lightweight anti-spam honeypot (hidden field)
 *
 * Styling:
 * - Tailwind utility classes and your design tokens (ink/primary/border)
 * - Inputs use rounded-full (except textarea)
 *
 * Replace the `mockSubmit` with your real API call when backend is ready.
 */

import * as React from "react"
import Button from "../components/ui/Button"

type Category = "Bug" | "Feature request" | "Idea" | "Other"

// Define the form data type
type FormState = {
  name: string
  email: string
  category: Category | ""
  message: string
  consent: boolean
  website: string // honeypot field
}

type Errors = Partial<Record<keyof FormState, string>>

// Mock API function to simulate form submission
function mockSubmit(payload: FormState): Promise<void> {
  void payload
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(), 900)
  })
}

// Simple email validation function
function isValidEmail(value: string): boolean {
  return !!value && /\S+@\S+\.\S+/.test(value)
}

export default function FeedbackPage() {
  // Initialize form state
  const [state, setState] = React.useState<FormState>({
    name: "",
    email: "",
    category: "",
    message: "",
    consent: false,
    website: "",
  })

  const [errors, setErrors] = React.useState<Errors>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<string>("")

  // Refs for focusing first invalid field
  const nameRef = React.useRef<HTMLInputElement | null>(null)
  const emailRef = React.useRef<HTMLInputElement | null>(null)
  const categoryRef = React.useRef<HTMLSelectElement | null>(null)
  const messageRef = React.useRef<HTMLTextAreaElement | null>(null)
  const consentRef = React.useRef<HTMLInputElement | null>(null)

  // Validate inputs and return error messages
  const validate = (s: FormState): Errors => {
    const errs: Errors = {}
    if (!s.category) errs.category = "Please choose a category."
    if (!s.message.trim()) errs.message = "Please describe your feedback."
    if (s.email && !isValidEmail(s.email)) errs.email = "Please provide a valid email."
    if (!s.consent) errs.consent = "Please confirm you agree to our privacy notice."
    if (s.website.trim()) errs.website = "Spam detected."
    return errs
  }

  // Focus first invalid field
  const focusFirstError = (errs: Errors) => {
    if (errs.category && categoryRef.current) return categoryRef.current.focus()
    if (errs.message && messageRef.current) return messageRef.current.focus()
    if (errs.email && emailRef.current) return emailRef.current.focus()
    if (errs.consent && consentRef.current) return consentRef.current.focus()
    if (nameRef.current) nameRef.current.focus()
  }

  // Handle form submission
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(false)
    setStatusMsg("")

    const errs = validate(state)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs)
      return
    }

    setSubmitting(true)
    setStatusMsg("Sending feedback…")

    try {
      await mockSubmit(state)
      setSubmitted(true)
      setStatusMsg("Thanks! Your feedback has been received.")
      // Reset form
      setState({
        name: "",
        email: "",
        category: "",
        message: "",
        consent: false,
        website: "",
      })
    } catch {
      setStatusMsg("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Page heading */}
      <header>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-ink">Send Feedback</h1>
        <p className="mt-3 text-ink-soft">
          We value your input. Tell us what works well and what could be improved.
        </p>
      </header>

      {/* Live region for screen readers */}
      <p aria-live="polite" className="sr-only">{statusMsg}</p>

      <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
        {/* Name */}
        <div>
          <label htmlFor="fb-name" className="block text-sm font-medium text-ink">Name (optional)</label>
          <input
            id="fb-name"
            ref={nameRef}
            type="text"
            autoComplete="name"
            value={state.name}
            onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
            className="mt-2 h-11 w-full rounded-full border border-border px-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="Your name"
            disabled={submitting}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="fb-email" className="block text-sm font-medium text-ink">Email (optional)</label>
          <input
            id="fb-email"
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={state.email}
            onChange={(e) => setState((p) => ({ ...p, email: e.target.value }))}
            aria-invalid={!!errors.email || undefined}
            aria-describedby={errors.email ? "fb-email-err" : undefined}
            className="mt-2 h-11 w-full rounded-full border border-border px-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="you@example.com"
            disabled={submitting}
          />
          {errors.email && (
            <p id="fb-email-err" className="mt-2 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="fb-category" className="block text-sm font-medium text-ink">Category *</label>
          <select
            id="fb-category"
            ref={categoryRef}
            value={state.category}
            onChange={(e) => setState((p) => ({ ...p, category: e.target.value as Category }))}
            aria-invalid={!!errors.category || undefined}
            aria-describedby={errors.category ? "fb-category-err" : undefined}
            className="mt-2 h-11 w-full rounded-full border border-border px-4 outline-none bg-white focus-visible:ring-2 focus-visible:ring-primary/40"
            disabled={submitting}
          >
            <option value="">Select a category…</option>
            <option value="Bug">Bug</option>
            <option value="Feature request">Feature request</option>
            <option value="Idea">Idea</option>
            <option value="Other">Other</option>
          </select>
          {errors.category && (
            <p id="fb-category-err" className="mt-2 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="fb-message" className="block text-sm font-medium text-ink">Message *</label>
          <textarea
            id="fb-message"
            ref={messageRef}
            value={state.message}
            onChange={(e) => setState((p) => ({ ...p, message: e.target.value }))}
            aria-invalid={!!errors.message || undefined}
            aria-describedby={errors.message ? "fb-message-err" : undefined}
            className="mt-2 min-h-[140px] w-full rounded-2xl border border-border p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="Describe the issue or your idea…"
            disabled={submitting}
          />
          {errors.message && (
            <p id="fb-message-err" className="mt-2 text-sm text-red-600">{errors.message}</p>
          )}
        </div>

        {/* Consent */}
        <div className="flex items-start gap-3">
          <input
            id="fb-consent"
            ref={consentRef}
            type="checkbox"
            checked={state.consent}
            onChange={(e) => setState((p) => ({ ...p, consent: e.target.checked }))}
            aria-invalid={!!errors.consent || undefined}
            aria-describedby={errors.consent ? "fb-consent-err" : undefined}
            className="mt-1 h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            disabled={submitting}
          />
          <label htmlFor="fb-consent" className="text-sm text-ink">
            I agree that my feedback may be stored and processed to improve the product.
          </label>
        </div>
        {errors.consent && (
          <p id="fb-consent-err" className="text-sm text-red-600">{errors.consent}</p>
        )}

        {/* Honeypot (hidden anti-spam) */}
        <div aria-hidden="true" className="hidden">
          <label htmlFor="fb-website">Website</label>
          <input
            id="fb-website"
            type="text"
            value={state.website}
            onChange={(e) => setState((p) => ({ ...p, website: e.target.value }))}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            size="lg"
            variant="primary"
            loading={submitting}
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Sending…" : "Submit feedback"}
          </Button>

          {submitted && !submitting && (
            <p className="mt-3 text-sm text-green-700">
              Your feedback was submitted successfully.
            </p>
          )}
        </div>
      </form>
    </main>
  )
}
