/**
 * Feedback page (internal form)
 * - Validates inputs, maps to API schema, posts to /contact.
 * - ARIA live region for screen readers.
 * - Honeypot field for simple anti-spam.
 * - Message limited to 500 characters.
 */

import * as React from "react";
import Button from "../components/ui/Button";
import { sendFeedback } from "../lib/api/contact";
import type { FeedbackCategory, FeedbackReq } from "../types/feedback";

/** Local UI state (separate from API types) */
type FormState = {
  name: string;
  email: string;
  category: FeedbackCategory | "";
  message: string;
  consent: boolean;
  website: string; // honeypot field
};

/** Map field name -> error message */
type Errors = Partial<Record<keyof FormState, string>>;

/** Simple email validation */
function isValidEmail(value: string): boolean {
  return !!value && /\S+@\S+\.\S+/.test(value);
}

const MESSAGE_LIMIT = 500;

export default function FeedbackPage() {
  // Form state
  const [state, setState] = React.useState<FormState>({
    name: "",
    email: "",
    category: "",
    message: "",
    consent: false,
    website: "",
  });

  // UI flags
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<string>("");

  // Refs for focusing first invalid field
  const nameRef = React.useRef<HTMLInputElement | null>(null);
  const emailRef = React.useRef<HTMLInputElement | null>(null);
  const categoryRef = React.useRef<HTMLSelectElement | null>(null);
  const messageRef = React.useRef<HTMLTextAreaElement | null>(null);
  const consentRef = React.useRef<HTMLInputElement | null>(null);

  /** Validate inputs and return error messages */
  const validate = (s: FormState): Errors => {
    const errs: Errors = {};
    if (!s.category) errs.category = "Please choose a category.";
    if (!s.message.trim()) errs.message = "Please describe your feedback.";
    if (s.message.length > MESSAGE_LIMIT)
      errs.message = `Please keep your message within ${MESSAGE_LIMIT} characters.`;
    if (s.email && !isValidEmail(s.email)) errs.email = "Please provide a valid email.";
    if (!s.consent) errs.consent = "Please confirm you agree to our privacy notice.";
    if (s.website.trim()) errs.website = "Spam detected.";
    return errs;
  };

  /** Focus first invalid field by priority */
  const focusFirstError = (errs: Errors) => {
    if (errs.category && categoryRef.current) return categoryRef.current.focus();
    if (errs.message && messageRef.current) return messageRef.current.focus();
    if (errs.email && emailRef.current) return emailRef.current.focus();
    if (errs.consent && consentRef.current) return consentRef.current.focus();
    if (nameRef.current) nameRef.current.focus();
  };

  /** Submit: validate -> map -> call API -> handle result */
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(false);
    setStatusMsg("");

    const errs = validate(state);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }

    setSubmitting(true);
    setStatusMsg("Sending feedback…");

    try {
      // Map local state to backend contract
      const payload: FeedbackReq = {
        name: state.name || undefined,
        email: state.email || undefined,
        category: state.category as FeedbackCategory,
        message: state.message.slice(0, MESSAGE_LIMIT), // hard-cap
        agree: state.consent,
        meta: {
          source: "web",
          page: window.location?.pathname ?? "/feedback",
        },
      };

      const res = await sendFeedback(payload);

      if (res.status === "ok") {
        setSubmitted(true);
        setStatusMsg("Thanks! Your feedback has been received.");
        setState({
          name: "",
          email: "",
          category: "",
          message: "",
          consent: false,
          website: "",
        });
      } else {
        setStatusMsg(res.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatusMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onMessageChange = (v: string) => {
    // Enforce the limit at input level for UX
    setState((p) => ({ ...p, message: v.slice(0, MESSAGE_LIMIT) }));
    // Clear length error as user types back under the limit
    if (errors.message && v.length <= MESSAGE_LIMIT) {
      setErrors((e) => ({ ...e, message: undefined }));
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Heading */}
      <header>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-ink">Send Feedback</h1>
        <p className="mt-3 text-ink-soft">
          We value your input. Tell us what works well and what could be improved.
        </p>
      </header>

      {/* Live region for screen readers */}
      <p aria-live="polite" className="sr-only">
        {statusMsg}
      </p>

      <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
        {/* Name */}
        <div>
          <label htmlFor="fb-name" className="block text-sm font-medium text-ink">
            Name (optional)
          </label>
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
          <label htmlFor="fb-email" className="block text-sm font-medium text-ink">
            Email (optional)
          </label>
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
            <p id="fb-email-err" className="mt-2 text-sm text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="fb-category" className="block text-sm font-medium text-ink">
            Category *
          </label>
          <select
            id="fb-category"
            ref={categoryRef}
            value={state.category}
            onChange={(e) =>
              setState((p) => ({ ...p, category: e.target.value as FeedbackCategory }))
            }
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
            <p id="fb-category-err" className="mt-2 text-sm text-red-600">
              {errors.category}
            </p>
          )}
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="fb-message" className="block text-sm font-medium text-ink">
              Message *
            </label>
            <span className="text-xs text-ink-soft">
              {state.message.length}/{MESSAGE_LIMIT}
            </span>
          </div>
          <textarea
            id="fb-message"
            ref={messageRef}
            value={state.message}
            onChange={(e) => onMessageChange(e.target.value)}
            maxLength={MESSAGE_LIMIT}
            aria-invalid={!!errors.message || undefined}
            aria-describedby={errors.message ? "fb-message-err" : "fb-message-hint"}
            className="mt-2 min-h-[140px] w-full rounded-2xl border border-border p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="Describe the issue or your idea…"
            disabled={submitting}
          />
          <p id="fb-message-hint" className="mt-1 text-xs text-ink-soft">
            Up to {MESSAGE_LIMIT} characters.
          </p>
          {errors.message && (
            <p id="fb-message-err" className="mt-2 text-sm text-red-600">
              {errors.message}
            </p>
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
          <p id="fb-consent-err" className="text-sm text-red-600">
            {errors.consent}
          </p>
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
  );
}
