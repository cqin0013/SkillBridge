// src/components/ui/HelpToggle.tsx
import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import clsx from "clsx";
import { FileText, Target, Lightbulb, X } from "lucide-react";

export type HelpContent = {
  title?: string;
  subtitle?: string;
  features?: React.ReactNode[];
  howTo?: React.ReactNode[];
  tips?: React.ReactNode[];
};

type Props = {
  trigger?: React.ReactNode;
  content?: HelpContent;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export default function HelpToggle({
  trigger,
  content,
  children,
  defaultOpen = false,
  className,
}: Props) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent): void => {
      if (!dialogRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const renderStructured = (c: HelpContent): ReactElement => (
    <div className="space-y-5 text-sm leading-relaxed text-ink text-left">
      {(c.title || c.subtitle) && (
        <header>
          {c.title && <h2 className="text-xl font-semibold text-primary">{c.title}</h2>}
          {c.subtitle && <p className="mt-1 text-gray-600">{c.subtitle}</p>}
        </header>
      )}

      {c.features && c.features.length > 0 && (
        <section>
          <div className="mb-1 flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h4 className="font-semibold">Features</h4>
          </div>
          {c.features.length === 1 ? (
            <p className="text-gray-700">{c.features[0]}</p>
          ) : (
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              {c.features.map((t, i) => <li key={`f-${i}`}>{t}</li>)}
            </ul>
          )}
        </section>
      )}

      {c.howTo && c.howTo.length > 0 && (
        <section>
          <div className="mb-1 flex items-center gap-2">
            <Target size={16} className="text-primary" />
            <h4 className="font-semibold">How to</h4>
          </div>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            {c.howTo.map((t, i) => <li key={`h-${i}`}>{t}</li>)}
          </ul>
        </section>
      )}

      {c.tips && c.tips.length > 0 && (
        <section>
          <div className="mb-1 flex items-center gap-2">
            <Lightbulb size={16} className="text-primary" />
            <h4 className="font-semibold">Tips</h4>
          </div>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            {c.tips.map((t, i) => <li key={`t-${i}`}>{t}</li>)}
          </ul>
        </section>
      )}
    </div>
  );

  return (
    <div className={clsx("inline-block", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm
                   hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/40"
        title="Help"
      >
        {trigger ?? "?"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          id={id}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
        >
          <div
            ref={dialogRef}
            className="relative w-full max-w-xl rounded-xl bg-white p-6 shadow-xl text-left"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="absolute right-3 top-3 rounded-md p-1 text-gray-500 hover:text-primary
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <X size={18} />
            </button>

            <div className="max-h-[80vh] overflow-y-auto">
              {children ? children : content ? renderStructured(content) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
