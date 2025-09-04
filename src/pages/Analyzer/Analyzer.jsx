import React, { useState } from "react";

// 页面通用 UI
import StageBox from "../../components/ui/StageBox";
import HelpToggle from "../../components/ui/HelpToggle";

// 你原来的向导页（保持默认导出不变）
import AnalyzerWizard from "./AnalyzerWizard";

/**
 * TwoCardScaffold
 * 统一的“两卡片”页面骨架：
 *  ┌─────────────────────────────────────────────┐
 *  │ StageBox：页面标题 + 指南（由 StageBox 自带的 tipTitle/tipContent 渲染）│
 *  └─────────────────────────────────────────────┘
 *  ┌─────────────────────────────────────────────┐
 *  │ 白底内容卡：问题标题 + 右侧 HelpToggle + 内容 │
 *  └─────────────────────────────────────────────┘
 *
 * Props:
 * - stepPill?: string
 * - title: string
 * - tipTitle?: string
 * - tipContent?: ReactNode
 * - question: string
 * - helpContent?: ReactNode
 * - headerExtras?: ReactNode
 * - children: ReactNode
 * - footer?: ReactNode
 */
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
        {/* 上卡片：标题 + 指南（由 StageBox 渲染，可折叠） + 可选额外状态 */}
        <StageBox pill={stepPill} title={title} tipTitle={tipTitle} tipContent={tipContent}>
          {headerExtras}
        </StageBox>

        {/* 下卡片：白底问题卡 + HelpToggle + 主体内容 */}
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

        {/* 页面底部操作（通常是 <PageActions />） */}
        {footer}
      </div>
    </section>
  );
}

/** 默认导出保持与现有路由一致 */
export default function Analyzer() {
  return <AnalyzerWizard />;
}
