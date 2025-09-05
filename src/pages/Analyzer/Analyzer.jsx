// Analyzer.jsx
// Provides a reusable two-card scaffold (header StageBox + white content card)
// and exports the main AnalyzerWizard route. This keeps the route stable while
// offering a shared layout primitive for other steps.

import React, { useState } from "react";

// Shared page UI containers
import StageBox from "../../components/ui/StageBox";
import HelpToggle from "../../components/ui/HelpToggle";

// The main multi-step wizard for the Analyzer flow
import AnalyzerWizard from "./AnalyzerWizard";


export function TwoCardScaffold({
  stepPill,
  title,
  tipTitle = "What to do in this step",
  tipContent = null,
  question,
  helpContent = null,
  headerExtras = null,
  children,
  footer = null,
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <section className="anlz-page">
      <div className="container">
        {/* Top card: high-level title + collapsible tip (from StageBox) */}
        <StageBox pill={stepPill} title={title} tipTitle={tipTitle} tipContent={tipContent}>
          {headerExtras}
        </StageBox>

        {/* Bottom card: white content card with question + HelpToggle + content */}
        <StageBox>
          <div className="anlz-second-card">
            <div className="question-row">
              <h3 className="question-title">{question}</h3>
              {helpContent ? (
                <HelpToggle show={showHelp} onToggle={() => setShowHelp((v) => !v)}>
                  {helpContent}
                </HelpToggle>
              ) : null}
            </div>

            {children}
          </div>
        </StageBox>

        {/* Optional footer area (usually PageActions) */}
        {footer}
      </div>
    </section>
  );
}

/** Default export: keep the route stable with the main wizard */
export default function Analyzer() {
  return <AnalyzerWizard />;
}
