// src/pages/Analyzer/JobSuggestion/components/JobCard/JobCard.jsx
import React, { useState } from "react";
import { Card, Tag, Typography, Collapse, theme, Space } from "antd";
import { CheckCircleFilled, ApartmentOutlined } from "@ant-design/icons";
import "./JobCard.css";

const { Paragraph, Text } = Typography;
const { Panel } = Collapse;

/** Inline: demand status tag */
function ShortageTag({ status }) {
  if (status === "in_demand") return <Tag color="green">In demand</Tag>;
  if (status === "not_in_demand") return <Tag color="red">Not in demand</Tag>;
  return <Tag>Not in shortage list</Tag>;
}

/** Inline: important skills list with collapsible “more” */
function SkillList({ skills, max = 5 }) {
  const [expanded, setExpanded] = useState(false);
  if (!skills?.length) return <Text type="secondary">No skills found.</Text>;

  const shown = expanded ? skills : skills.slice(0, max);
  const hasMore = skills.length > max;

  return (
    <div>
      <div className="jobcard-skillwrap">
        {shown.map((s, idx) => (
          <Tag key={`${s.title}-${idx}`} style={{ marginBottom: 6 }}>
            {s.title} <Text type="secondary">({Math.round(s.importance)})</Text>
          </Tag>
        ))}
      </div>
      {hasMore && (
        <a
          className="jobcard-morelink"
          onClick={(e) => {
            e.preventDefault();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? "Show less" : `Show ${skills.length - max} more`}
        </a>
      )}
    </div>
  );
}

function getIndustry(data) {
  return (
    data?.industry ||
    data?.sector ||
    data?.details?.[0]?.industry?.name ||
    data?.details?.[0]?.sector ||
    null
  );
}

/** JobCard: clickable card to select a job */
export default function JobCard({ data, status, selected, onSelect, metaIcon = null }) {
  const { token } = theme.useToken();

  const industry = getIndustry(data);
  const titleEl = (
    <div className="jobcard-title">
      <span className="jobcard-title-name">{data.job || data.code || "Occupation"}</span>
      {selected && (
        <CheckCircleFilled
          style={{ color: token.colorSuccess, marginLeft: 8, fontSize: 18, flex: "none" }}
          aria-label="Selected"
        />
      )}
    </div>
  );

  return (
    <div
      className={`job-card ${selected ? "job-card--selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      {/* use variant="outlined" for subtle border */}
      <Card title={titleEl} variant="outlined" hoverable>
        {/* 第一行：match + shortage */}
        <Paragraph style={{ marginBottom: 8 }}>
          <Space size={[8, 8]} wrap>
            <Tag color="blue">{data.match}% match</Tag>
            <ShortageTag status={status} />
          </Space>
        </Paragraph>

        {/* 第二行（单独一行）：industry */}
        <Paragraph style={{ marginTop: 0, marginBottom: 12 }}>
          <Tag icon={<ApartmentOutlined />} className="jobcard-industry-tag">
            {industry || "Unknown industry"}
          </Tag>
        </Paragraph>

        {/* Inline meta row（保留你原来的 metaIcon） */}
        {(metaIcon || data?.details?.[0]?.name) && (
          <Paragraph
            type="secondary"
            style={{ marginBottom: 12, display: "flex", alignItems: "center" }}
          >
            {metaIcon}
            <span style={{ marginLeft: 8 }}>{data?.details?.[0]?.name || ""}</span>
          </Paragraph>
        )}

        {/* Expandable details */}
        <Collapse ghost>
          <Panel header="Top Skills (importance > 60)" key="skills">
            <SkillList skills={data.importantSkills} max={5} />
          </Panel>
          <Panel header="Description" key="desc">
            <Paragraph style={{ marginBottom: 0 }}>{data.description}</Paragraph>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
}
