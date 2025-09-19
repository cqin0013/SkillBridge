// src/pages/Analyzer/SkillGap/components/TrainingGuidanceCard.jsx
import React from "react";
import { Card, Typography, Divider, Tag } from "antd";
import "./TrainingGuidanceCard.css";

const { Paragraph, Link } = Typography;

const MOCK_INDUSTRIES = [
  "Health Care & Social Assistance",
  "Information Media & Telecommunications",
  "Professional, Scientific & Technical Services",
  "Education & Training",
  "Construction",
  "Manufacturing",
  "Retail Trade",
  "Public Administration & Safety",
];

function hashString(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function assignIndustryByKey(key) {
  const idx = hashString(String(key || "")) % MOCK_INDUSTRIES.length;
  return MOCK_INDUSTRIES[idx];
}

export default function TrainingGuidanceCard({
  occupationTitle,
  anzscoCodeLike,
  addressText = "Melbourne VIC 3000",
}) {
  const industry = assignIndustryByKey(occupationTitle || anzscoCodeLike);

  // A simple preset link – you can wire a real builder later

  return (
    <Card className="tg-card" title="Training Guidance" bordered>
      <div className="tg-card__tags">
        <Tag>Address: {addressText}</Tag>
        <Tag color="blue">Occupation: {occupationTitle || "-"}</Tag>
        <Tag color="purple">Industry: {industry}</Tag>
      </div>

      <Divider />

    </Card>
  );
}
