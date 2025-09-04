import React, { useMemo, useState } from "react";
import StageBox from "../../components/ui/StageBox";
import HelpToggle from "../../components/ui/HelpToggle";
import Chips from "../../components/ui/Chips";
import PageActions from "../../components/ui/PageActions";
import { Input, Select, Alert, Modal, List, Checkbox, Typography, Button } from "antd";
import "./Analyzer.css";

const { Paragraph, Text } = Typography;
const API_BASE = "https://skillbridge-hnxm.onrender.com";

const AU_STATES = [
  { label: "All states", value: "All" },
  { label: "New South Wales (NSW)", value: "NSW" },
  { label: "Victoria (VIC)", value: "VIC" },
  { label: "Queensland (QLD)", value: "QLD" },
  { label: "South Australia (SA)", value: "SA" },
  { label: "Western Australia (WA)", value: "WA" },
  { label: "Tasmania (TAS)", value: "TAS" },
  { label: "Northern Territory (NT)", value: "NT" },
  { label: "Australian Capital Territory (ACT)", value: "ACT" },
];

const MAX_SELECT = 5;

export default function GetInfo({ stateCode, setStateCode, onPrev, onNext }) {
  const [kw, setKw] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [checkedCodes, setCheckedCodes] = useState([]);

  const [chosen, setChosen] = useState([]); // [{occupation_code, occupation_title, occupation_description}]
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState("");
  const [preparedAbilities, setPreparedAbilities] = useState([]); // [{title, code, type}]

  // NEW: show "Please press Enter" hint when user has typed something
  const [showEnterHint, setShowEnterHint] = useState(false);

  // 两个 HelpToggle 的受控开关
  const [help1Open, setHelp1Open] = useState(false);
  const [help2Open, setHelp2Open] = useState(false);

  const atLimit = chosen.length >= MAX_SELECT;

  const handleEnter = async (e) => {
    e.preventDefault();
    const q = kw.trim();
    setShowEnterHint(false); // hide hint after Enter
    setErrorMsg("");
    setAnalysisDone(false);
    setAnalysisMsg("");

    if (q.length < 2) {
      setErrorMsg("Please enter at least 2 characters to search.");
      return;
    }

    try {
      setPickerOpen(true);
      setSearchLoading(true);
      setSearchResults([]);
      setCheckedCodes([]);

      const url = `${API_BASE}/occupations/search-and-titles?s=${encodeURIComponent(
        q
      )}&include=title,description&limit=10`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();

      const items = Array.isArray(data?.items) ? data.items : [];
      const list = items.map((it) => ({
        occupation_code: it.occupation_code,
        occupation_title: it.occupation_title,
        occupation_description: it.occupation_description,
      }));
      setSearchResults(list);
    } catch (err) {
      console.error(err);
      setErrorMsg("Search failed. Please try again.");
      setPickerOpen(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const confirmPick = () => {
    if (!checkedCodes.length) {
      setPickerOpen(false);
      return;
    }
    const currentCodes = new Set(chosen.map((x) => x.occupation_code));
    const additional = searchResults.filter(
      (r) => checkedCodes.includes(r.occupation_code) && !currentCodes.has(r.occupation_code)
    );
    const merged = [...chosen, ...additional].slice(0, MAX_SELECT);
    setChosen(merged);
    setPickerOpen(false);
    setCheckedCodes([]);
  };

  const cancelPick = () => {
    setPickerOpen(false);
    setCheckedCodes([]);
  };

  // 删除：按 title 删除（若担心同名不同 code，可以换成传 index 的方式）
  const removeChosen = (displayTitle) => {
    setChosen((prev) => prev.filter((x) => x.occupation_title !== displayTitle));
    setAnalysisDone(false);
    setAnalysisMsg("");
  };

  // Analyze：拉 titles 合成 abilities
  const runAnalyze = async () => {
    if (!chosen.length) {
      setErrorMsg("Please choose at least one occupation before analyzing.");
      return;
    }
    try {
      setAnalyzing(true);
      setErrorMsg("");
      setAnalysisDone(false);
      setAnalysisMsg("");

      const codes = chosen.map((c) => c.occupation_code);
      const results = await Promise.all(
        codes.map(async (code) => {
          const r = await fetch(`${API_BASE}/occupations/${encodeURIComponent(code)}/titles`);
          if (!r.ok) throw new Error(`Request failed: ${r.status}`);
          return r.json();
        })
      );

      const abilities = [];
      for (const data of results) {
        const knowledge = Array.isArray(data.knowledge_titles) ? data.knowledge_titles : [];
        const skills = Array.isArray(data.skill_titles) ? data.skill_titles : [];
        const techs = Array.isArray(data.tech_titles) ? data.tech_titles : [];
        abilities.push(
          ...knowledge.map((x) => ({ title: x.title, code: x.code, type: "knowledge" })),
          ...skills.map((x) => ({ title: x.title, code: x.code, type: "skill" })),
          ...techs.map((x) => ({ title: x.title, code: x.code, type: "tech" }))
        );
      }

      const seen = new Set();
      const unique = [];
      for (const a of abilities) {
        const key = a.code || `t:${a.title}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(a);
        }
      }

      setPreparedAbilities(unique);
      setAnalysisDone(true);
      setAnalysisMsg("Analysis complete. Click Next to review your abilities.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to analyze. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const nextDisabled = !analysisDone || analyzing || !chosen.length;
  const nextDisabledReason = !chosen.length
    ? "Please choose at least one occupation."
    : analyzing
    ? "Analyzing…"
    : !analysisDone
    ? "Please click Analyze first."
    : null;

  // Chips 只显示名称
  const chipItems = chosen.map((c) => c.occupation_title);

  // 点击 Next：把 abilities + roles（titles）一起返回
  const handleNext = () => {
    const roles = chosen.map((c) => c.occupation_title);
    onNext({ abilities: preparedAbilities, roles });
  };

  useMemo(() => {}, [kw]);

  return (
    <section className="anlz-page">
      <div className="container">
        {/* 顶部引导卡片 */}
        <StageBox
          pill="Step 1"
          title="Background & Work Location"
          tipTitle="What to do in this step"
          tipContent={
            <div className="tip-white">
              <ul className="tip-list">
                <li>
                  Type a keyword and press <b>Enter</b> to search occupations.
                </li>
                <li>
                  Select up to <b>five</b> occupations that best match your past roles.
                </li>
                <li>
                  Click <b>Analyze</b> to build your abilities from those occupations.
                </li>
                <li>
                  When analysis completes, click <b>Next</b> to review the results.
                </li>
              </ul>
            </div>
          }
        />

        {/* 题目 1 */}
        <StageBox>
          <div className="anlz-second-card">
            <div className="question-row">
              <h3 className="question-title">What job titles have you held in the past?</h3>
              <HelpToggle show={help1Open} onToggle={() => setHelp1Open((v) => !v)}>
                <div style={{ maxWidth: 380 }}>
                  <b>What does this question mean?</b>
                  <div style={{ marginTop: 6 }}>
                    Add job titles you’ve actually held (e.g., <i>Data Analyst</i>, <i>Project Manager</i>).
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <b>Examples:</b> "Business Analyst", "UX Designer", "BI Analyst".
                  </div>
                </div>
              </HelpToggle>
            </div>

            {/* Occupation search input */}
            <Input
              value={kw}
              onChange={(e) => {
                setKw(e.target.value);
                setShowEnterHint(!!e.target.value); // show hint once user types
                if (errorMsg) setErrorMsg(""); // clear any previous error as they type
              }}
              onPressEnter={handleEnter}
              placeholder="Type a keyword and press Enter to search…"
              allowClear
              disabled={searchLoading || atLimit}
            />

            {/* "Please press Enter" hint */}
            {showEnterHint && (
              <div
                aria-live="polite"
                style={{ marginTop: 6, fontSize: ".875rem", color: "var(--color-muted, #6b7280)" }}
            >
                Please press Enter ↵
              </div>
            )}

            {errorMsg && (
              <Alert type="warning" showIcon style={{ marginTop: ".6rem" }} message={errorMsg} />
            )}

            {chosen.length > 0 && (
              <div style={{ marginTop: ".6rem" }}>
                <Chips items={chipItems} onRemove={removeChosen} />
                <div className="muted-small">
                  {chosen.length}/{MAX_SELECT} selected
                </div>
              </div>
            )}

            <div className="actions-row">
              <Button type="primary" onClick={runAnalyze} loading={analyzing} disabled={!chosen.length}>
                Analyze
              </Button>
              {analysisDone && (
                <Alert type="info" showIcon message={analysisMsg} style={{ margin: 0, flex: 1, minWidth: 220 }} />
              )}
            </div>

            {/* 题目 2 */}
            <div className="question-row" style={{ marginTop: 16 }}>
              <h3 className="question-title">Where would you like to work?</h3>
              <HelpToggle show={help2Open} onToggle={() => setHelp2Open((v) => !v)}>
                <div style={{ maxWidth: 380 }}>
                  <b>How to answer:</b>
                  <div style={{ marginTop: 6 }}>
                    Choose the Australian state/territory where you’d prefer to work. This helps tailor job demand and training
                    info by region.
                  </div>
                  <div style={{ marginTop: 6 }}>
                    If you’re flexible, select <i>All states</i>.
                  </div>
                </div>
              </HelpToggle>
            </div>

            <Select value={stateCode} onChange={setStateCode} style={{ width: "100%" }} options={AU_STATES} />
          </div>
        </StageBox>

        <PageActions
          onPrev={onPrev}
          onNext={handleNext}
          nextDisabled={nextDisabled}
          nextDisabledReason={nextDisabledReason}
        />

        <Modal
          open={pickerOpen}
          title={
            <div>
              Select occupations <Text type="secondary">(up to {MAX_SELECT - chosen.length} more)</Text>
            </div>
          }
          onOk={confirmPick}
          onCancel={cancelPick}
          okButtonProps={{ disabled: searchLoading }}
          destroyOnClose
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Tip: After selecting, scroll to the bottom and click OK to save your choices."
          />

          {searchLoading ? (
            <Alert type="info" showIcon message="Searching…" description="First-time use may take a moment to initialize." />
          ) : searchResults.length === 0 ? (
            <Alert type="info" message="No occupations found for this keyword." />
          ) : (
            <Checkbox.Group
              value={checkedCodes}
              onChange={(arr) => {
                const remain = MAX_SELECT - chosen.length;
                setCheckedCodes(arr.slice(0, remain));
              }}
            >
              <List
                dataSource={searchResults}
                renderItem={(item) => {
                  const disabled = chosen.some((c) => c.occupation_code === item.occupation_code);
                  return (
                    <List.Item style={{ alignItems: "flex-start" }}>
                      <Checkbox value={item.occupation_code} disabled={disabled} style={{ marginRight: 8 }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.occupation_title}</div>
                        {item.occupation_description && (
                          <Paragraph style={{ marginTop: 4, marginBottom: 0 }} ellipsis={{ rows: 3 }}>
                            {item.occupation_description}
                          </Paragraph>
                        )}
                      </div>
                    </List.Item>
                  );
                }}
              />
            </Checkbox.Group>
          )}
        </Modal>
      </div>
    </section>
  );
}
