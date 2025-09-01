import React, { useMemo, useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import Chips from "../../../components/ui/Chips";
import PageActions from "../../../components/ui/PageActions";
import { Input } from "antd";
import "./AbilityAnalyzer.css";

const ABILITY_MASTER = [
  "SQL",
  "Python",
  "Excel",
  "PowerBI",
  "Tableau",
  "Statistics",
  "Pandas",
  "Data Modeling",
];

export default function AbilityAnalyzer({ abilities = [], onPrev, onNext }) {
  // 使用本地副本编辑，点击 Next 再提交
  const [localAbilities, setLocalAbilities] = useState([...abilities]);
  const [kw, setKw] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    return k.length >= 2
      ? ABILITY_MASTER.filter(
          (a) => a.toLowerCase().includes(k) && !localAbilities.includes(a)
        ).slice(0, 12)
      : [];
  }, [kw, localAbilities]);

  return (
    <section className="ability-page">
      <StageBox pill="Step 2" title="Your Abilities">
        <h3>Add abilities you already have</h3>
        <Input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="Type at least 2 letters to search abilities…"
          allowClear
        />

        <HelpToggle
          show={showHelp}
          onToggle={() => setShowHelp(!showHelp)}
          label="Show tips"
        >
          选择与你熟练掌握的技能；越准确，后续推荐越好。
        </HelpToggle>

        {filtered.length > 0 && (
          <div className="abl-suggest">
            {filtered.map((ab) => (
              <button
                key={ab}
                type="button"
                onClick={() => {
                  setLocalAbilities((xs) => [...xs, ab]);
                  setKw("");
                }}
              >
                {ab}
              </button>
            ))}
          </div>
        )}

        {localAbilities.length > 0 && (
          <Chips
            items={localAbilities}
            onRemove={(a) =>
              setLocalAbilities((xs) => xs.filter((x) => x !== a))
            }
          />
        )}
      </StageBox>

      {/* 页尾按钮：靠内容末尾 */}
      <PageActions
        onPrev={onPrev}
        onNext={() => onNext(localAbilities)}
        nextDisabled={!localAbilities.length}
      />
    </section>
  );
}
