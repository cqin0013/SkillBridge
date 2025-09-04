// src/pages/Analyzer/JobSuggestion/JobSuggestion.jsx
import React, { useEffect, useMemo, useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import PageActions from "../../../components/ui/PageActions";
import JobCardGrid from "../../../components/ui/JobCardGrid";
import { Alert, Spin } from "antd";
import "../Analyzer.css";

// 本地开发建议使用 Vite 代理：/api -> 后端服务
const API_BASE = "https://skillbridge-hnxm.onrender.com";

export default function JobSuggestion({
  abilities = [],
  targetJob,
  setTargetJob,
  onUnmatchedChange, // 把选中岗位的 unmatched（含 title）原样回传给向导
  onPrev,
  onNext,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // 仅统计“带 code 的能力”，这是分母
  const payload = useMemo(() => {
    const knowledge_codes = [];
    const skill_codes = [];
    const tech_codes = [];
    abilities.forEach((a) => {
      const code = a.code;
      const t = a.aType || a.type;
      if (!code || !t) return;
      if (t === "knowledge") knowledge_codes.push(code);
      else if (t === "skill") skill_codes.push(code);
      else if (t === "tech") tech_codes.push(code);
    });
    return { knowledge_codes, skill_codes, tech_codes };
  }, [abilities]);

  const totalCodified = useMemo(
    () =>
      payload.knowledge_codes.length +
      payload.skill_codes.length +
      payload.tech_codes.length,
    [payload]
  );

  // 拉取推荐
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr("");
      setItems([]);
      try {
        if (totalCodified === 0) {
          setErr("No codified abilities to rank. Please keep some suggestions with codes.");
          return;
        }

        const res = await fetch(`${API_BASE}/occupations/rank-by-codes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();

        const arr = Array.isArray(data?.items) ? data.items : [];
        const sorted = [...arr].sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
        setItems(sorted.slice(0, 10));
      } catch (e) {
        console.error(e);
        setErr("Failed to fetch job suggestions. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [payload, totalCodified]);

  // 渲染给 JobCardGrid 的数据
  const jobs = useMemo(() => {
    return items.map((it) => {
      const count = Number(it.count || 0); // 后端已返回“匹配数量”
      const percent = totalCodified > 0 ? Math.round((count / totalCodified) * 100) : 0;

      // 按你的要求，本页不显示任何名称，只显示计数信息
      const details = [{ name: `${count} / ${totalCodified} matched` }];

      return {
        job: it.occupation_title,
        code: it.occupation_code,
        match: percent,
        details,
      };
    });
  }, [items, totalCodified]);

  // 统一处理选择（兼容 JobCardGrid 可能回传 code/title/对象）
  const handleSelect = (sel) => {
    let code = typeof sel === "string" ? sel : null;
    if (!code && sel && typeof sel === "object") {
      if (sel.code) code = sel.code;
      else if (sel.job) {
        const foundByTitle = items.find((x) => x.occupation_title === sel.job);
        if (foundByTitle) code = foundByTitle.occupation_code;
      }
    }
    if (!code && typeof sel === "string") {
      const foundByTitle = items.find((x) => x.occupation_title === sel);
      if (foundByTitle) code = foundByTitle.occupation_code;
    }
    if (!code) return;

    // 设置选中岗位
    setTargetJob(code);

    // 立刻把接口返回的 unmatched（自带 {code,title}）原样回传
    const found = items.find((x) => x.occupation_code === code);
    if (found) {
      const un = found.unmatched || {};
      const norm = (arr) => (Array.isArray(arr) ? arr : []);
      onUnmatchedChange?.({
        knowledge: norm(un.knowledge),
        skill: norm(un.skill),
        tech: norm(un.tech),
        matchedCount: Number(found.count || 0),
        // 这里的 percent 也按新的分母（totalCodified）算，保持一致
        percent: totalCodified > 0 ? Math.round((Number(found.count || 0) / totalCodified) * 100) : 0,
      });
    }
  };

  return (
    <section className="anlz-page">
      <div className="container">
        {/* 上卡片：说明 */}
        <StageBox pill="Step 3" title="Job Suggestions">
          {loading && (
            <div style={{ marginBottom: 12 }}>
              <Spin /> <span style={{ marginLeft: 8 }}>Ranking occupations…</span>
            </div>
          )}
          {err && <Alert type="warning" showIcon message={err} style={{ marginBottom: 12 }} />}
          {!loading && !err && (
            <p style={{ marginBottom: 0 }}>
              We rank occupations by how many of your selected ability <b>codes</b> they match.
              <br />
              <b>Match score</b> = <i>matched_count</i> ÷ <i>your codified abilities</i> × 100.
              The first chip on each card shows <i>X / total</i>.
            </p>
          )}
        </StageBox>

        {/* 下卡片：问题 + 帮助 + 网格（本页不展示任何能力名称） */}
        <StageBox>
          <div className="anlz-second-card">
            <div className="question-row">
              <h3 className="question-title">Recommended jobs for you</h3>
              <HelpToggle show={showHelp} onToggle={() => setShowHelp((v) => !v)}>
                Click a card to select a job. We only show match scores here.
                The next page will list the <i>unmatched</i> ability names in detail.
              </HelpToggle>
            </div>

            <JobCardGrid jobs={jobs} targetJob={targetJob} onSelect={handleSelect} />
          </div>
        </StageBox>

        <PageActions onPrev={onPrev} onNext={onNext} nextDisabled={!targetJob} />
      </div>
    </section>
  );
}
