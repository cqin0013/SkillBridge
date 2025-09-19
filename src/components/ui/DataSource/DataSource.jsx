// src/components/DataSourceSection/DataSourceSection.jsx
import { Card, Row, Col, Typography, Button, Tag } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import "./DataSource.css";

const { Title, Paragraph, Text } = Typography;

/**
 * 数据源展示区
 * Props:
 * - title?: string
 * - description?: string
 * - sources: Array<{
 *     title: string,
 *     description?: string,
 *     href: string,
 *     image?: string,
 *     tag?: string
 *   }>
 */
export default function DataSourceSection({ title = "Data sources", description, sources = [] }) {
  return (
    <section className="ds-section">
      <div className="ds-head">
        <Title level={2} className="ds-title">{title}</Title>
        {description && <Paragraph className="ds-desc">{description}</Paragraph>}
      </div>

      <Row gutter={[20, 20]}>
        {sources.map((s, i) => (
          <Col key={i} xs={24} sm={12} md={12} lg={8} xl={8}>
            <Card
              className="ds-card"
              hoverable
              cover={
                s.image ? (
                  <div className="ds-cover">
                    <img src={s.image} alt={s.title} />
                  </div>
                ) : null
              }
              actions={[
                <Button type="link" href={s.href} target="_blank" rel="noreferrer" icon={<LinkOutlined />}>
                  Visit
                </Button>,
              ]}
            >
              <div className="ds-meta">
                <div className="ds-meta-top">
                  <Title level={4} className="ds-card-title">{s.title}</Title>
                  {s.tag && <Tag className="ds-tag">{s.tag}</Tag>}
                </div>
                {s.description && <Text className="ds-card-desc">{s.description}</Text>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
}
