// src/pages/Analyzer/SkillGap/components/SkillLevelCard.jsx
import React from "react";
import { Card, Typography } from "antd";
import { SKILL_LEVEL_REQUIREMENTS } from "../../../../../lib/constants/skillLevel";
import "./SkillLevelCard.css";

const { Paragraph, Text, Title } = Typography;

/** Derive ANZSCO-ish leading digit → Skill Level mapping */
function deriveSkillLevelFromANZSCO(anzscoLike) {
  if (!anzscoLike) return null;
  const s = String(anzscoLike).trim();
  const first = s.replace(/\D/g, "").charAt(0);
  switch (first) {
    case "1":
    case "2":
      return 1;
    case "3":
      return 2;
    case "4":
    case "5":
    case "6":
    case "7":
      return 4;
    case "8":
      return 5;
    default:
      return null;
  }
}

export default function SkillLevelCard({ occupationTitle, anzscoCodeLike }) {
  const skillLevel = deriveSkillLevelFromANZSCO(anzscoCodeLike);
  const info = skillLevel ? SKILL_LEVEL_REQUIREMENTS[skillLevel] : null;

  return (
    <Card className="sl-card" title="Skill Level Requirement" bordered>
      <Title level={5} style={{ marginTop: 0, marginBottom: 6 }}>
        {occupationTitle || "Selected occupation"}
      </Title>

      {info ? (
        <>
          <Paragraph strong className="sl-card__level">
            {info.label}
          </Paragraph>
          <ul className="sl-card__list">
            {info.bullets.map((b, i) => (
              <li key={i}>
                <Text>{b}</Text>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Paragraph type="secondary" italic className="sl-card__empty">
          Could not determine Skill Level for this occupation (please check ANZSCO classification).
        </Paragraph>
      )}
    </Card>
  );
}
