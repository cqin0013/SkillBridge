import { Progress, Typography } from "antd";
import "./ProgressBar.css";

const { Text } = Typography;

export default function ProgressBar({ current = 0, total = 1, label }) {
  // Business rule: Intro (step=0) not counted in percentage
  const steps = Math.max(1, total);
  const cur = Math.min(Math.max(0, current), steps - 1);
  const percent = steps > 1 ? Math.round((cur / (steps - 1)) * 100) : 0;

  return (
    <div className="wiz-progress" role="group" aria-label="Wizard progress">
      <div className="wiz-progress-row">
        <Progress
          percent={percent}
          showInfo={false}
          className="wiz-progress-bar"
        />
        {label && (
          <Text className="wiz-progress-label" type="secondary">
            {label}
          </Text>
        )}
      </div>
    </div>
  );
}
