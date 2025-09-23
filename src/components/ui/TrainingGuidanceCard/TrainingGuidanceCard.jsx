
import { Card, Divider, Tag, List, Empty, Typography } from "antd";
import "./TrainingGuidanceCard.css";
import useResponsive from "../../../lib/hooks/useResponsive";

const { Text } = Typography;

/**
 * Render training guidance list WITHOUT address/links.
 * data: {
 *   anzsco: string,
 *   found: number,
 *   items: Array<{ tgaCode?: string, title?: string, componentType?: string[] }>
 * }
 */
export default function TrainingGuidanceCard({
  data,
  occupationTitle,
  anzscoCodeLike, // optional: show ANZSCO tag if provided
}) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const { isMobile } = useResponsive(); // responsive flags

  return (
    <Card
      className="tg-card"
      title="Training Guidance"
      variant="outlined"
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
    >
      {/* Top tags (stack vertically on mobile for better wrapping) */}
      <div
        className="tg-card__tags"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <Tag color="blue">Occupation: {occupationTitle || "-"}</Tag>
        {anzscoCodeLike ? <Tag color="purple">ANZSCO: {anzscoCodeLike}</Tag> : null}
      </div>

      <Divider style={{ margin: isMobile ? "8px 0" : "16px 0" }} />

      {!items.length ? (
        <Empty description="No specific training advice available." />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={items}
          renderItem={(it) => (
            <List.Item
              key={`${it.tgaCode ?? "NA"}-${it.title ?? "Untitled"}`}
              style={{ paddingLeft: 0, paddingRight: 0 }}
            >
              <List.Item.Meta
                title={<Text strong>{it.title || it.tgaCode || "(Unnamed course)"}</Text>}
                description={
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {it.tgaCode ? <Tag color="geekblue">{it.tgaCode}</Tag> : null}
                    {(Array.isArray(it.componentType) ? it.componentType : []).map((t) => (
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
