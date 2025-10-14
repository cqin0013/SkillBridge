
interface GlobalErrorProps {
  /** Link to feedback page, e.g. "/feedback" */
  feedbackHref: string;
  /** Optional extra class on outer container */
  className?: string;
  /** Optional custom title */
  title?: string;
  /** Optional custom message */
  message?: string;
}

/** Centered, primary-accent global error card */
const GlobalError: React.FC<GlobalErrorProps> = ({
  feedbackHref,
  className,
  title,
  message,
}) => {
  const heading = title ?? "Something went wrong";
  const msg =
    message ??
    "There is an issue with the system. Please try again later, or send us feedback.";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        "relative overflow-hidden rounded-2xl border p-6 sm:p-7",
        "border-primary/20 bg-primary/5 text-ink text-center",
        className ?? "",
      ].join(" ")}
    >
      {/* Accent bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary to-primary/70" />

      {/* Icon */}
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/80 ring-1 ring-primary/20">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 text-primary">
          <path
            fill="currentColor"
            d="M12 2a1 1 0 0 1 .894.553l9 18A1 1 0 0 1 21 22H3a1 1 0 0 1-.894-1.447l9-18A1 1 0 0 1 12 2zm0 5a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1zm0 12a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"
          />
        </svg>
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-primary">{heading}</h3>
      <p className="mx-auto mt-1 max-w-prose text-sm text-ink-soft">{msg}</p>

      {/* Action */}
      <div className="mt-4 flex justify-center">
        <a
          href={feedbackHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Send feedback
        </a>
      </div>
    </div>
  );
};

export default GlobalError;
