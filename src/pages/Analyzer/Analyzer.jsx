// src/pages/Analyzer/Analyzer.jsx
import React, { useState } from "react";

// 页面通用 UI
import StageBox from "../../components/ui/StageBox";
import HelpToggle from "../../components/ui/HelpToggle";
import Tip from "../../components/ui/Tip";

// 你原来的向导页（保持默认导出不变）
import AnalyzerWizard from "./AnalyzerWizard";

/**
 * TwoCardScaffold
 * 统一的“两卡片”页面骨架：
 *  ┌─────────────────────────────────────────────┐
 *  │ StageBox：页面标题 + 指南 Tip               │  ← 上卡片
 *  └─────────────────────────────────────────────┘
 *  ┌─────────────────────────────────────────────┐
 *  │ 白底内容卡：问题标题 + 右侧 HelpToggle + 内容 │  ← 下卡片
 *  └─────────────────────────────────────────────┘
 *
 * Props:
 * - stepPill?: string        e.g. "Step 2"
 * - title: string            上卡片标题
 * - tipTitle?: string        Tip 的标题（可选）
 * - tipContent?: ReactNode   Tip 的内容（可选）
 * - question: string         下卡片的问题标题
 * - helpContent?: ReactNode  问题右侧 HelpToggle 的内容（可选）
 * - headerExtras?: ReactNode 放在上卡片 Tip 下方的额外区域（例如加载/警告）
 * - children: ReactNode      下卡片的主体内容（表单/网格/表格等）
 * - footer?: ReactNode       页面底部操作（通常是 <PageActions />）
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
        {/* ===== 上卡片：标题 + 指南 Tip + 可选的额外区（加载/告警等） ===== */}
        <StageBox pill={stepPill} title={title}>
          {tipContent ? (
            <Tip title={tipTitle} defaultOpen={false}>
              {tipContent}
            </Tip>
          ) : null}
          {headerExtras}
        </StageBox>

        {/* ===== 下卡片：白底问题卡 + HelpToggle + 主体内容 ===== */}
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

            {/* 页面主体内容（表单/列表/网格/表格等） */}
            {children}
          </div>
        </StageBox>

        {/* ===== 页面底部操作（通常是 PageActions）===== */}
        {footer}
      </div>
    </section>
  );
}

/**
 * 默认导出：保持与现有路由一致
 * 如需在某一页使用通用骨架：
 *
 * import { TwoCardScaffold } from "../Analyzer";
 * ...
 * return (
 *   <TwoCardScaffold
 *     stepPill="Step 2"
 *     title="Your Abilities"
 *     tipContent={<ul><li>指南 1…</li><li>指南 2…</li></ul>}
 *     question="Add abilities you already have"
 *     helpContent={<>解释与示例…</>}
 *     footer={<PageActions .../>}
 *   >
 *     {/** 这里放页面主体，比如 AbilityList / JobCardGrid / GapTable 等 *\/}
 *   </TwoCardScaffold>
 * );
 */
export default function Analyzer() {
  return <AnalyzerWizard />;
}
