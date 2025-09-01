import React, { useMemo, useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import Chips from "../../../components/ui/Chips";
import PageActions from "../../../components/ui/PageActions";
import { Input, Select } from "antd";
import "./GetInfo.css";

const ROLE_MASTER = [
  "Data Analyst",
  "Business Analyst",
  "Product Manager",
  "UX Designer",
  "ML Engineer",
  "BI Analyst",
  "Data Scientist",
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
        <h3>Which roles match your experience?</h3>
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Type at least 2 letters to search roles…"
          allowClear
        />

        <HelpToggle
          show={showHelp}
          onToggle={() => setShowHelp(!showHelp)}
          label="Show tips"
        >
          输入至少 2 个字母会出现建议列表；点击建议即可添加到下方已选角色。
        </HelpToggle>

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

        <h3>Where would you like to work?</h3>
        <Select
          value={stateCode}
          onChange={setStateCode}
          style={{ width: "100%" }}
          options={[
            { label: "All states", value: "All" },
            { label: "Victoria (VIC)", value: "VIC" },
            { label: "New South Wales (NSW)", value: "NSW" },
            { label: "Queensland (QLD)", value: "QLD" },
          ]}
        />
      </StageBox>

      {/* 页尾按钮：靠内容末尾 */}
      <PageActions onPrev={onPrev} onNext={onNext} nextDisabled={!roles.length} />
    </section>
  );
}
