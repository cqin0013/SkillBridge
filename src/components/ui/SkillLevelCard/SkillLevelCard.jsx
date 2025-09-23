
import { Card, Typography, Collapse, Tag, Alert } from "antd";
import "./SkillLevelCard.css";

const { Paragraph, Text, Title } = Typography;

const HELP = {
  1: {
    label: "Skill Level 1",
    bullets: [
      "Typically requires a Bachelor degree or higher qualification.",
      "At least ~5 years of relevant experience may substitute formal qualification.",
      "Examples: Software Engineer, Medical Practitioner.",
    ],
  },
  2: {
    label: "Skill Level 2",
    bullets: [
      "Usually requires an Associate Degree, Advanced Diploma or Diploma.",
      "Relevant experience and on-the-job training may also be needed.",
      "Examples: ICT Support Technician, Engineering Associate.",
    ],
  },
  3: {
    label: "Skill Level 3",
    bullets: [
      "Usually requires Certificate III with at least 2 years on-the-job training (or Certificate IV).",
      "Examples: Chef, Electrician.",
    ],
  },
  4: {
    label: "Skill Level 4",
    bullets: [
      "Usually requires Certificate II or III.",
      "Examples: Receptionist, Pharmacy Sales Assistant.",
    ],
  },
  5: {
    label: "Skill Level 5",
    bullets: [
      "Usually requires Certificate I or completion of compulsory secondary education.",
      "Examples: General Labourer, Fast-food Worker.",
    ],
  },
};

export default function SkillLevelCard({
  /** Display only; not used for deriving the level. */
  occupationTitle,
  /** Display only; not used for deriving the level. */
  anzscoCodeLike,
  /** REQUIRED: numeric level 1–5 */
  skillLevel,
}) {
  const lvl = Number.isFinite(Number(skillLevel)) ? Number(skillLevel) : null;
  const info = lvl && HELP[lvl] ? HELP[lvl] : null;

  return (
    <Card className="sl-card" title="Skill Level Requirement" bordered>
      <Title level={5} style={{ marginTop: 0, marginBottom: 6 }}>
        {occupationTitle || "Selected occupation"}{" "}
        {anzscoCodeLike ? <Tag>{anzscoCodeLike}</Tag> : null}
      </Title>

      {info ? (
        <>
          <Paragraph strong className="sl-card__level">
            Expected level: <Text code>{info.label}</Text>
          </Paragraph>

          <Collapse
            bordered={false}
            items={[
              {
                key: "help",
                label: `What does Level ${lvl} mean?`,
                children: (
                  <ul className="sl-card__list">
                    {info.bullets.map((b, i) => (
                      <li key={i}>
                        <Text>{b}</Text>
                      </li>
                    ))}
                    <li style={{ marginTop: 8, opacity: 0.8 }}>
                      Summary based on ANZSCO skill level guidance.
                    </li>
                  </ul>
                ),
              },
            ]}
          />
        </>
      ) : (
        <Alert
          type="info"
          showIcon
          className="sl-card__empty"
          message="No skill level provided"
          description="Pass a numeric level (1–5); the detailed meaning will appear here."
        />
      )}
    </Card>
  );
}
