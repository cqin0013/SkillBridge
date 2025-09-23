import React, { useState } from "react";
import { Affix, Card } from "antd";
import StageBox from "../../components/ui/StageBox/StageBox";
import HelpToggle from "../../components/ui/HelpToggle/HelpToggle";
import PageActions from "../../components/ui/PageActions/PageActions";
import "./Analyzer.css";
import AnalyzerWizard from "./AnalyzerWizard.jsx";

/**
 * TwoCardScaffold (layout-only)
 *
 * - Progress bar and the center lane are geometrically centered under the fixed header.
 * - Left sidebar (prevSummary) sits in the left-middle lane; it never pushes the center off-center.
 * - Bottom-right page actions are rendered at the end of the center lane (can be sticky/reveal via props).
 * - The first block in the center lane is StageBox; children hold any number of SectionBoxes.
 */
export function TwoCardScaffold({
  progressBar = null,

  // StageBox header meta (center lane)
  stepPill,                 // e.g. "Step 1"
  title,
  introTitle = "Page introduction",
  introContent = null,
  actionsTitle = "What you can do on this page",
  actionsContent = null,
  headerExtras = null,

  // Optional inline question card under StageBox
  question,
  helpContent = null,

  // Main content that follows StageBox (SectionBoxes)
  children,

  // Left sidebar (PrevSummary)
  leftSidebar = null,
  leftOffsetTop = 72,       // affix distance below site header

  // Container width preset
  maxWidth = "xl",
  containerClassName = "",

  // PageActions props (wire your onPrev/onNext/disabled etc. here)
  actionsProps = {},
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  // Width class for the outer container
  const widthClass =
    maxWidth === "full" ? "container--full" :
    maxWidth === "xl"   ? "container--xl"   :
    maxWidth === "wide" ? "container--wide" : "";

  return (
    <section className="anlz-page">
      {/* 1) Progress bar directly under the fixed header */}
      {progressBar && (
        <div className="anlz-progress anlz-progress--fullbleed">
          {progressBar}
        </div>
      )}

      {/* 2) Grid shell: 1fr | GAP | CENTER | GAP | 1fr */}
      <div className={`anlz-shell ${containerClassName}`}>
          {/* Left-middle summary (affixed; does not affect center geometry) */}
          {leftSidebar ? (
            <div className="anlz-left">
              <Affix offsetTop={leftOffsetTop} style={{ zIndex: 9 }}>
                <div className="prev-affix-wrap">{leftSidebar}</div>
              </Affix>
            </div>
          ) : null}

          {/* Center lane (StageBox first, then your sections) */}
          <div className="anlz-center">
            <div className="anlz-stack">
              <StageBox
                pill={stepPill}
                title={title}
                introTitle={introTitle}
                introContent={introContent}
                actionsTitle={actionsTitle}
                actionsContent={actionsContent}
                extra={headerExtras}
                defaultCollapsed={true}
                hint="Click to view details"
              />

              {(question || helpContent) && (
                <Card className="anlz-maincard" bordered>
                  <div className="question-row">
                    {question ? <h3 className="question-title">{question}</h3> : <div />}
                    {helpContent ? (
                      <HelpToggle open={helpOpen} onOpenChange={setHelpOpen} iconSize={22}>
                        {helpContent}
                      </HelpToggle>
                    ) : null}
                  </div>
                </Card>
              )}

              {/* Your SectionBox blocks go here */}
              <div className="anlz-stack-body">{children}</div>

              {/* 3) Page actions at page end (right-aligned) */}
              <div className="anlz-actions-end">
                <PageActions
                  revealAtBottom={true}
                  sticky={false}
                  {...actionsProps}
                />
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}

export default function Analyzer() {
  // Logic lives in the wizard; this file only provides the layout shell.
  return <AnalyzerWizard />;
}
