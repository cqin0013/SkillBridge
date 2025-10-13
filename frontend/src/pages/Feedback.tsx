// src/pages/Feedback.tsx
/**
 * Feedback page (internal form)
 *
 * Features:
 * - Required validation (message, category, consent)
 * - Optional email validation
 * - Autofill current URL (read-only)
 * - Submitting state + aria-live announcements
 * - Focus first invalid field on submit
 * - Lightweight anti-spam honeypot (hidden field)
 * - Optional image attachment preview (client-side only)
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

type FormState = {
  name: string
  email: string
  category: Category | ""
  pageUrl: string
  message: string
  consent: boolean
  // Anti-spam honeypot: real users won't fill this (hidden)
  website: string
  // Optional local attachment (e.g., screenshot)
  file?: File
}

type Errors = Partial<Record<keyof FormState, string>>

// Simulated async submit; replace with a real API call (fetch/axios) later.
function mockSubmit(payload: FormState): Promise<void> {
    void payload;   
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(), 900)
  })
}

// Simple email validation (not perfect but OK for client-side checks)
function isValidEmail(value: string): boolean {
  return !!value && /\S+@\S+\.\S+/.test(value)
}

export default function FeedbackPage() {
  // Prefill current location for convenience
  const initialUrl =
    typeof window !== "undefined" ? window.location.href : ""

  const [state, setState] = React.useState<FormState>({
    name: "",
    email: "",
    category: "",
    pageUrl: initialUrl,
    message: "",
    consent: false,
    website: "",
    file: undefined,
  })

  const [errors, setErrors] = React.useState<Errors>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<string>("")

  // Refs for focusing the first invalid field after submit
  const nameRef = React.useRef<HTMLInputElement | null>(null)
  const emailRef = React.useRef<HTMLInputElement | null>(null)
  const categoryRef = React.useRef<HTMLSelectElement | null>(null)
  const messageRef = React.useRef<HTMLTextAreaElement | null>(null)
  const consentRef = React.useRef<HTMLInputElement | null>(null)

  // Validate and return error map
  const validate = (s: FormState): Errors => {
    const errs: Errors = {}
    if (!s.category) errs.category = "Please choose a category."
    if (!s.message.trim()) errs.message = "Please describe your feedback."
    if (s.email && !isValidEmail(s.email)) errs.email = "Please provide a valid email."
    if (!s.consent) errs.consent = "Please confirm you agree to our privacy notice."
    // Honeypot: if filled, treat as spam (don't show error to real users)
    if (s.website.trim()) errs.website = "Spam detected."
    // Optional file size limit (e.g., 3 MB)
    if (s.file && s.file.size > 3 * 1024 * 1024) errs.file = "Attachment is too large (max 3 MB)."
    return errs
  }

  // Focus the first error field
  const focusFirstError = (errs: Errors) => {
    if (errs.category && categoryRef.current) { categoryRef.current.focus(); return }
    if (errs.message && messageRef.current) { messageRef.current.focus(); return }
    if (errs.email && emailRef.current) { emailRef.current.focus(); return }
    if (errs.consent && consentRef.current) { consentRef.current.focus(); return }
    if (nameRef.current) nameRef.current.focus()
  }

  // Handle file selection (optional)
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.currentTarget.files?.[0]
    setState((prev) => ({ ...prev, file: f }))
    // Clear any file-related error on change
    setErrors((prev) => ({ ...prev, file: undefined }))
  }

  // Submit handler
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
      // Replace with real API request (e.g., POST /api/feedback)
      await mockSubmit(state)
      setSubmitted(true)
      setStatusMsg("Thanks! Your feedback has been received.")
      // Reset form except pageUrl
      setState((prev) => ({
        ...prev,
        name: "",
        email: "",
        category: "",
        message: "",
        consent: false,
        website: "",
        file: undefined,
      }))
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

      {/* Live region for submit status */}
      <p aria-live="polite" className="sr-only">
        {statusMsg}
      </p>

      <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
        {/* Name (optional) */}
        <div>
          <label htmlFor="fb-name" className="block text-sm font-medium text-ink">Name (optional)</label>
          <input
            id="fb-name"
            ref={nameRef}
            type="text"
            autoComplete="name"
            value={state.name}
            onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
            className="
              mt-2 h-11 w-full rounded-full border border-border px-4 outline-none
              focus-visible:ring-2 focus-visible:ring-primary/40
            "
            placeholder="Your name"
            disabled={submitting}
          />
        </div>

        {/* Email (optional but recommended for follow-up) */}
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
            className="
              mt-2 h-11 w-full rounded-full border border-border px-4 outline-none
              focus-visible:ring-2 focus-visible:ring-primary/40
            "
            placeholder="you@example.com"
            disabled={submitting}
          />
          {errors.email && (
            <p id="fb-email-err" className="mt-2 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Category (required) */}
        <div>
          <label htmlFor="fb-category" className="block text-sm font-medium text-ink">Category *</label>
          <select
            id="fb-category"
            ref={categoryRef}
            value={state.category}
            onChange={(e) => setState((p) => ({ ...p, category: e.target.value as Category }))}
            aria-invalid={!!errors.category || undefined}
            aria-describedby={errors.category ? "fb-category-err" : undefined}
            className="
              mt-2 h-11 w-full rounded-full border border-border px-4 outline-none bg-white
              focus-visible:ring-2 focus-visible:ring-primary/40
            "
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

        {/* Current page URL (read-only) */}
        <div>
          <label htmlFor="fb-url" className="block text-sm font-medium text-ink">Page URL</label>
          <input
            id="fb-url"
            type="url"
            value={state.pageUrl}
            readOnly
            className="
              mt-2 h-11 w-full rounded-full border border-border px-4 bg-gray-50 text-ink-soft
              focus-visible:ring-2 focus-visible:ring-primary/40
            "
            aria-readonly="true"
            disabled={submitting}
          />
        </div>

        {/* Message (required) */}
        <div>
          <label htmlFor="fb-message" className="block text-sm font-medium text-ink">Message *</label>
          <textarea
            id="fb-message"
            ref={messageRef}
            value={state.message}
            onChange={(e) => setState((p) => ({ ...p, message: e.target.value }))}
            aria-invalid={!!errors.message || undefined}
            aria-describedby={errors.message ? "fb-message-err" : undefined}
            className="
              mt-2 min-h-[140px] w-full rounded-2xl border border-border p-4 outline-none
              focus-visible:ring-2 focus-visible:ring-primary/40
            "
            placeholder="Describe the issue or your idea…"
            disabled={submitting}
          />
          {errors.message && (
            <p id="fb-message-err" className="mt-2 text-sm text-red-600">{errors.message}</p>
          )}
        </div>

        {/* Optional attachment (image only) */}
        <div>
          <label htmlFor="fb-file" className="block text-sm font-medium text-ink">
            Attachment (optional, image up to 3 MB)
          </label>
          <input
            id="fb-file"
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="mt-2 block w-full text-sm text-ink-soft file:mr-4 file:rounded-full file:border file:border-border file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-black/5"
            disabled={submitting}
          />
          {errors.file && (
            <p className="mt-2 text-sm text-red-600">{errors.file}</p>
          )}
          {state.file && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={URL.createObjectURL(state.file)}
                alt="Attachment preview"
                className="h-16 w-16 rounded-md object-cover"
              />
              <span className="text-sm text-ink-soft">{state.file.name}</span>
            </div>
          )}
        </div>

        {/* Consent (required) */}
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

        {/* Honeypot (hidden from humans) */}
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
            // For native form submit, prefer type="submit"
            // If your Button defaults to type="button", pass type prop through.

            type="submit"
          >
            {submitting ? "Sending…" : "Submit feedback"}
          </Button>

          {/* Success helper text (visible) */}
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
