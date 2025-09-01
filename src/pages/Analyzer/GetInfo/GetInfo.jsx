import React, { useMemo, useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import Chips from "../../../components/ui/Chips";
import PageActions from "../../../components/ui/PageActions";
import { Input, Select } from "antd";
import "./GetInfo.css";

// 角色库
const ROLE_MASTER = [
  "Data Analyst",
  "Business Analyst",
  "Product Manager",
  "UX Designer",
  "ML Engineer",
  "BI Analyst",
  "Data Scientist",
];

// 澳大利亚所有州/领地
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

export default function GetInfo({
  roles,
  setRoles,
  stateCode,
  setStateCode,
  onPrev,
  onNext,
}) {
  const [keyword, setKeyword] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return k.length >= 2
      ? ROLE_MASTER.filter(
          (r) => r.toLowerCase().includes(k) && !roles.includes(r)
        ).slice(0, 10)
      : [];
  }, [keyword, roles]);

  return (
    <section className="getinfo-page">
      <StageBox pill="Step 1" title="Background & Work Location">
        {/* 标题和问号同行 */}
        <div className="heading-row">
          <h3 className="heading-title">
            Which roles match your experience?
            <HelpToggle
              show={showHelp}
              onToggle={() => setShowHelp(!showHelp)}
            >
              Type at least 2 letters to see role suggestions. Click on a suggestion
              to add it below.
            </HelpToggle>
          </h3>
        </div>

        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Type at least 2 letters to search roles…"
          allowClear
        />

        {filtered.length > 0 && (
          <div className="gi-suggest">
            {filtered.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRoles([...roles, role]);
                  setKeyword("");
                }}
              >
                {role}
              </button>
            ))}
          </div>
        )}

        {roles.length > 0 && (
          <Chips
            items={roles}
            onRemove={(r) => setRoles(roles.filter((x) => x !== r))}
          />
        )}

        {/* 第二个问题 */}
        <div className="heading-row">
          <h3 className="heading-title">Where would you like to work?</h3>
        </div>
        <Select
          value={stateCode}
          onChange={setStateCode}
          style={{ width: "100%" }}
          options={AU_STATES}
        />
      </StageBox>

      {/* 页尾按钮 */}
      <PageActions onPrev={onPrev} onNext={onNext} nextDisabled={!roles.length} />
    </section>
  );
}
