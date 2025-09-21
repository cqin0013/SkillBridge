// TrainingGuidanceCard.jsx
import React from "react";
import { Card, Divider, Tag, List, Empty, Typography } from "antd";
import "./TrainingGuidanceCard.css";

const { Text } = Typography;

/**
 * Render training guidance list WITHOUT advice or links.
 * data: {
 *   anzsco: string,
 *   found: number,
 *   items: [
 *     { tgaCode, title, componentType: string[] }
 *   ]
 * }
 */
export default function TrainingGuidanceCard({
  data,
  occupationTitle,
  anzscoCodeLike,
  addressText = "Melbourne VIC 3000",
}) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <Card className="tg-card" title="Training Guidance" bordered>
      <div className="tg-card__tags">
        <Tag>Address: {addressText}</Tag>
        <Tag color="blue">Occupation: {occupationTitle || "-"}</Tag>
        {anzscoCodeLike ? <Tag color="purple">ANZSCO: {anzscoCodeLike}</Tag> : null}
      </div>

      <Divider />

      {!items.length ? (
        <Empty description="No specific training advice available." />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={items}
          renderItem={(it) => (
            <List.Item key={`${it.tgaCode}-${it.title}`} style={{ paddingLeft: 0, paddingRight: 0 }}>
              <List.Item.Meta
                title={<Text strong>{it.title || it.tgaCode}</Text>}
                description={
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {it.tgaCode && <Tag color="geekblue">{it.tgaCode}</Tag>}
                    {(it.componentType || []).map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
