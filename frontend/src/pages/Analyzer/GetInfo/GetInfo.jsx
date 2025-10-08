// Step 1: Collect past occupations, location, industries, and run ability analysis.
// - For each selected ANZSCO code, call /anzsco/{code}/skills
// - Normalize + dedupe abilities


import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Select, Space, Typography, Alert, Modal } from "antd";
import { TwoCardScaffold } from "../Analyzer";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import PastOccupationSearch from "../../../components/ui/PastOccupationSearch/PastOccupationSearch";
import useResponsive from "../../../lib/hooks/useResponsive";

import { MAX_SELECT } from "../../../lib/constants/app";
import { AU_STATES } from "../../../lib/constants/geo";
import { INDUSTRY_OPTIONS } from "../../../lib/constants/industries";

import {
  getAnzscoSkills,
  mapAbilitiesToFlat,
  dedupeAbilities,
} from "../../../lib/api/AbilityApi";

const { Title, Paragraph } = Typography;

export default function GetInfo({
  step,
  totalSteps,
  leftSidebar,
  progressBar,
  stateCode,
  setStateCode,
  selectedIndustryIds,
  setSelectedIndustryIds,
  setAbilities,
  setRoles,
  onChosenChange,
  onPrev,
  onNext,
}) {
  const [chosen, setChosen] = useState([]);
  const [helpOccOpen, setHelpOccOpen] = useState(false);
  const [helpWorkOpen, setHelpWorkOpen] = useState(false);
  const [helpIndustriesOpen, setHelpIndustriesOpen] = useState(false);
  const lastChosenKeyRef = useRef("");

  useEffect(() => {
    if (typeof onChosenChange !== "function") return;
    const codes = (chosen || [])
      .map((item) => String(item?.occupation_code || item?.code || "").trim())
      .filter(Boolean);
    const key = codes.join("|");
    if (lastChosenKeyRef.current === key) return;
    lastChosenKeyRef.current = key;
    onChosenChange(codes);
  }, [chosen, onChosenChange]);


  const [analyzing, setAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState("");
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [renderAnalysisModal, setRenderAnalysisModal] = useState(false);
  
  const { isMobile } = useResponsive();

  useEffect(() => {
    if (analysisModalOpen) setRenderAnalysisModal(true);
  }, [analysisModalOpen]);

  const handleAnalysisModalClose = () => setAnalysisModalOpen(false);
  const handleAnalysisModalOk = () => {
    setAnalysisModalOpen(false);
    onNext();
  };
  const handleAnalysisAfterChange = (open) => {
    if (!open) setRenderAnalysisModal(false);
  };

  /**
   * Run the ability analysis:
   * 1) Take the selected 6-digit ANZSCO codes.
   * 2) For each code, call /anzsco/{code}/skills.
   * 3) Normalize + dedupe abilities and store them for Step 2.
   */
  const runAnalyze = async () => {
    if (!chosen.length) return;

    try {
      setAnalyzing(true);
      setAnalysisDone(false);
      setAnalysisMsg("");

      const codes = chosen.map((c) => c.occupation_code);

      const settled = await Promise.allSettled(
        codes.map((code) => getAnzscoSkills(code))
      );

      const okPayloads = settled
        .filter((x) => x.status === "fulfilled")
        .map((x) => x.value);

      if (!okPayloads.length) {
        setAnalysisMsg("Failed to analyze. Please try again.");
        setAnalysisDone(false);
        return;
      }

      // Flatten -> normalize -> dedupe
      const all = okPayloads.flatMap((payload) => mapAbilitiesToFlat(payload));
      const unique = dedupeAbilities(all);

      // Pass to parent (Step 2)
      setAbilities(unique);
      setRoles(chosen.map((c) => c.occupation_title));

      // UX feedback
      setAnalysisDone(true);
      setAnalysisMsg("Analysis complete.");
      setAnalysisModalOpen(true);
    } catch (error) {
      setAnalysisMsg(error?.message || "Failed to analyze. Please try again.");
      setAnalysisDone(false);
    } finally {
      setAnalyzing(false);
    }
  };

  // Button guard + tooltip reason
  const nextDisabled = !analysisDone || analyzing || !chosen.length;
  const nextDisabledReason = !chosen.length
    ? "Please add at least one past occupation."
    : analyzing
    ? "Analyzing..."
    : !analysisDone
    ? "Please click Analyze first."
    : undefined;

  const stepPill = step > 0 ? `Step ${step}` : "Intro";

  // responsive 
  const cardHeaderStyle = {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "center",
    justifyContent: "space-between",
    gap: isMobile ? 8 : 12,
  };
  const actionListStyle = {
    paddingLeft: isMobile ? 18 : 20,
    margin: 0,
    lineHeight: isMobile ? 1.5 : 1.7,
  };
  const analyzeSpaceProps = {
    direction: isMobile ? "vertical" : "horizontal",
    size: isMobile ? 12 : 16,
    align: isMobile ? "stretch" : "center",
    wrap: isMobile,
    style: { marginBottom: 12 },
  };
  const selectSize = isMobile ? "middle" : "large";
  const selectMarginTop = isMobile ? 12 : 8;
  const showAnalysisFeedback = Boolean(analysisMsg);
  const analysisAlertType = analysisDone ? "success" : "warning";
  const analysisModalWidth = isMobile ? undefined : 520;

  return (
    <TwoCardScaffold
      progressBar={progressBar}
      stepPill={stepPill}
      title="Background, Work Location & Industries"
      introContent={
        <div>
          Provide a few of your <b>past occupations</b>, preferred <b>work location</b>, and
          <b> target industries</b>. We'll use them to tailor your analysis.
        </div>
      }
      actionsContent={
        <div>
          <ul style={actionListStyle}>
            <li>Add up to <b>{MAX_SELECT}</b> past occupations (search &amp; add).</li>
            <li>Select a preferred location, or choose <i>All</i>.</li>
            <li>(Optional) Pick target industries; leave blank to consider all.</li>
            <li>Click <b>Analyze your abilities</b> to continue.</li>
          </ul>
        </div>
      }
      leftSidebar={leftSidebar}
      leftOffsetTop={72}
      maxWidth="xl"
      actionsProps={{
        onPrev,
        onNext,
        nextDisabled,
        nextDisabledReason,
        revealAtBottom: true,
        sticky: false,
      }}
    >
      <SectionBox
        variant="question"
        title="1) Add your most important past occupations (1-5)"
        extra={
          <HelpToggle
            open={helpOccOpen}
            onOpenChange={setHelpOccOpen}
            iconSize={isMobile ? 20 : 22}
          >
            <div style={{ maxWidth: 360 }}>
              Select the closest <b>industry</b>, type a <b>job title</b>, then click <b>Search</b>.
              In the modal, click <b>Add</b>. If nothing matches, try another keyword.
            </div>
          </HelpToggle>
        }
      >
        <PastOccupationSearch
          selected={chosen}
          onChangeSelected={(next) => {
            setChosen(next);
            // Every change invalidates previous analysis
            setAnalysisDone(false);
            setAnalysisMsg("");
          }}
        />
      </SectionBox>

      <SectionBox variant="question" title="2) Location & industries">
        <Card variant="outlined" style={{ marginBottom: 12 }}>
          <div style={cardHeaderStyle}>
            <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
              Where would you like to work?
            </Title>
            <HelpToggle
              open={helpWorkOpen}
              onOpenChange={setHelpWorkOpen}
              iconSize={isMobile ? 20 : 22}
            >
              <div style={{ maxWidth: 360 }}>
                Choose your preferred Australian state/territory. Select <i>All</i> if you are open to
                any location.
              </div>
            </HelpToggle>
          </div>
          <Select
            size={selectSize}
            value={stateCode}
            onChange={setStateCode}
            style={{ width: "100%", marginTop: selectMarginTop }}
            options={AU_STATES}
          />
        </Card>

        <Card variant="outlined">
          <div style={cardHeaderStyle}>
            <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
              Which industries are you interested in next?
            </Title>
            <HelpToggle
              open={helpIndustriesOpen}
              onOpenChange={setHelpIndustriesOpen}
              iconSize={isMobile ? 20 : 22}
            >
              <div style={{ maxWidth: 360 }}>
                Pick one or more target industries. Leave blank to consider all industries.
              </div>
            </HelpToggle>
          </div>
          <Select
            mode="multiple"
            size={selectSize}
            value={selectedIndustryIds}
            onChange={setSelectedIndustryIds}
            options={INDUSTRY_OPTIONS.map((option) => ({ label: option.name, value: option.id }))}
            placeholder="(Optional) Leave blank to consider all industries"
            style={{ width: "100%", marginTop: selectMarginTop }}
            optionFilterProp="label"
            allowClear
          />
        </Card>
      </SectionBox>

      <div style={{ marginTop: isMobile ? 12 : 16 }}>
        <Space {...analyzeSpaceProps}>
          <Button
            type="primary"
            onClick={runAnalyze}
            loading={analyzing}
            disabled={!chosen.length}
            block={isMobile}
          >
            Analyze your abilities
          </Button>

          {showAnalysisFeedback && (
            <Alert
              type={analysisAlertType}
              showIcon
              message={analysisMsg}
              style={{ margin: 0, width: isMobile ? "100%" : "auto" }}
            />
          )}
        </Space>
      </div>

      {renderAnalysisModal && (
        <Modal
          open={analysisModalOpen}
          onOk={handleAnalysisModalOk}
          onCancel={handleAnalysisModalClose}
          afterOpenChange={handleAnalysisAfterChange}
          okText="OK"
          cancelText="Cancel"
          title="Analysis complete"
          width={analysisModalWidth}
        >
          <Paragraph>
            Analysis complete. Press <b>OK</b> to proceed to the next page to review your results, or
            <b> Cancel</b> if you want to re-analyze.
          </Paragraph>
        </Modal>
      )}
    </TwoCardScaffold>
  );
}
