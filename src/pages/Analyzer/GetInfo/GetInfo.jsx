import React, { useState } from "react";
import { Button, Card, Select, Space, Tag, Tooltip, Typography, Alert, Modal } from "antd";
import { TwoCardScaffold } from "../Analyzer";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import PastOccupationSearch from "../../../components/ui/PastOccupationSearch/PastOccupationSearch";

import { MAX_SELECT } from "../../../lib/constants/app";
import { AU_STATES } from "../../../lib/constants/geo";
import { INDUSTRY_OPTIONS } from "../../../lib/constants/industries";

const { Title, Paragraph, Text } = Typography;

export default function GetInfo({
  step,
  totalSteps,
  leftSidebar,
  progressBar,              // passed from Wizard
  stateCode, setStateCode,
  selectedIndustryIds, setSelectedIndustryIds,
  setAbilities, setRoles,
  onPrev, onNext,
}) {
  const [chosen, setChosen] = useState([]);
  const [helpOccOpen, setHelpOccOpen] = useState(false);
  const [helpWorkOpen, setHelpWorkOpen] = useState(false);
  const [helpIndustriesOpen, setHelpIndustriesOpen] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState("");
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  const runAnalyze = async () => {
    if (!chosen.length) return;
    try {
      setAnalyzing(true); setAnalysisDone(false); setAnalysisMsg("");
      const codes = chosen.map((c) => c.occupation_code);
      const settled = await Promise.allSettled(
        codes.map(async (code) => {
          const r = await fetch(`https://skillbridge-hnxm.onrender.com/occupations/${encodeURIComponent(code)}/titles`);
          if (!r.ok) throw new Error(`Request failed: ${r.status}`);
          return r.json();
        })
      );
      const okResults = settled.filter((s) => s.status === "fulfilled").map((s) => s.value);
      if (!okResults.length) {
        setAnalysisMsg("Failed to analyze. Please try again.");
        setAnalysisDone(false);
        return;
      }

      const abilities = [];
      for (const data of okResults) {
        const knowledge = Array.isArray(data?.knowledge_titles) ? data.knowledge_titles : [];
        const skills = Array.isArray(data?.skill_titles) ? data.skill_titles : [];
        const techs = Array.isArray(data?.tech_titles) ? data.tech_titles : [];
        abilities.push(
          ...knowledge.map((x) => ({ title: x.title, code: x.code, type: "knowledge" })),
          ...skills.map((x) => ({ title: x.title, code: x.code, type: "skill" })),
          ...techs.map((x) => ({ title: x.title, code: x.code, type: "tech" }))
        );
      }
      const seen = new Set(); const unique = [];
      for (const a of abilities) {
        const key = a.code || `t:${a.title}`;
        if (!seen.has(key)) { seen.add(key); unique.push(a); }
      }
      setAbilities(unique);
      setRoles(chosen.map((c) => c.occupation_title));
      setAnalysisDone(true); setAnalysisMsg("Analysis complete."); setAnalysisModalOpen(true);
    } catch {
      setAnalysisMsg("Failed to analyze. Please try again."); setAnalysisDone(false);
    } finally { setAnalyzing(false); }
  };

  // Gated Next: must have chosen + analyzed
  const nextDisabled = !analysisDone || analyzing || !chosen.length;
  const nextDisabledReason =
    !chosen.length ? "Please add at least one past occupation."
    : analyzing ? "Analyzing…"
    : !analysisDone ? "Please click Analyze first."
    : undefined;

  // StageBox step pill (only shows 'Step N')
  const stepPill = step > 0 ? `Step ${step}` : "Intro";

  return (
    <TwoCardScaffold
      progressBar={progressBar}
      stepPill={stepPill}
      title="Background, Work Location & Industries"
      introContent={
        <div>
          Provide a few of your <b>past occupations</b>, preferred <b>work location</b>, and
          <b> target industries</b>. We’ll use them to tailor your analysis.
        </div>
      }
      actionsContent={
        <div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li>Add up to <b>5</b> past occupations (search &amp; add).</li>
            <li>Select a preferred location, or choose <i>All</i>.</li>
            <li>(Optional) Pick target industries; leave blank to consider all.</li>
            <li>Click <b>Analyze your abilities</b> to continue.</li>
          </ul>
        </div>
      }
      leftSidebar={leftSidebar}
      leftOffsetTop={72}
      maxWidth="xl"
      /* ✅ Hand PageActions via the scaffold */
      actionsProps={{
        onPrev,
        onNext,
        nextDisabled,
        nextDisabledReason,
        revealAtBottom: true,  // show at the end of the page
        sticky: false,         // not sticky; switch to true if you want it anchored
      }}
    >
      {/* Section 1: Past occupations */}
      <SectionBox
        variant="question"
        title="1) Add your most important past occupations (1–5)"
        extra={
          <HelpToggle open={helpOccOpen} onOpenChange={setHelpOccOpen} iconSize={22}>
            <div style={{ maxWidth: 360 }}>
              Select the closest <b>industry</b>, type a <b>job title</b>, then click <b>Search</b>.
              In the modal, click <b>Add</b>. If nothing matches, try another keyword.
            </div>
          </HelpToggle>
        }
      >
        <PastOccupationSearch
          selected={chosen}
          onChangeSelected={(next) => { setChosen(next); setAnalysisDone(false); setAnalysisMsg(""); }}
        />
        
      </SectionBox>

      {/* Section 2: Location & industries */}
      <SectionBox variant="question" title="2) Location & industries">
        <Card variant="outlined" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Title level={5} style={{ margin: 0 }}>Where would you like to work?</Title>
            <HelpToggle open={helpWorkOpen} onOpenChange={setHelpWorkOpen} iconSize={22}>
              <div style={{ maxWidth: 360 }}>
                Choose your preferred Australian state/territory. Select <i>All</i> if you are open to any location.
              </div>
            </HelpToggle>
          </div>
          <Select value={stateCode} onChange={setStateCode} style={{ width: "100%", marginTop: 8 }} options={AU_STATES} />
        </Card>

        <Card variant="outlined">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Title level={5} style={{ margin: 0 }}>Which industries are you interested in next?</Title>
            <HelpToggle open={helpIndustriesOpen} onOpenChange={setHelpIndustriesOpen} iconSize={22}>
              <div style={{ maxWidth: 360 }}>
                Pick one or more target industries. Leave blank to consider all industries.
              </div>
            </HelpToggle>
          </div>
          <Select
            mode="multiple"
            value={selectedIndustryIds}
            onChange={setSelectedIndustryIds}
            options={INDUSTRY_OPTIONS.map((o) => ({ label: o.name, value: o.id }))}
            placeholder="(Optional) Leave blank to consider all industries"
            style={{ width: "100%", marginTop: 8 }}
            optionFilterProp="label"
            allowClear
          />
        </Card>
      </SectionBox>

      {/* Analyze action row (remains inside content area) */}
      <div style={{ marginTop: 16 }}>
        <Space style={{ marginBottom: 12 }} align="center">
          <Button type="primary" onClick={runAnalyze} loading={analyzing} disabled={!chosen.length}>
            Analyze your abilities
          </Button>
          {analysisDone && <Alert type="info" showIcon message={analysisMsg} style={{ margin: 0 }} />}
        </Space>
      </div>

      {/* Post-analyze confirm modal */}
      <Modal
      open={analysisModalOpen}
      onOk={() => { setAnalysisModalOpen(false); onNext(); }}
      onCancel={() => setAnalysisModalOpen(false)}
      okText="OK"
      cancelText="Cancel"
      title="Analysis complete"
      destroyOnHidden
    >
        <Paragraph>
          Analysis complete. Press <b>OK</b> to proceed to the next page to review your results,
          or <b>Cancel</b> if you want to re-analyze.
        </Paragraph>
      </Modal>
    </TwoCardScaffold>
  );
}
