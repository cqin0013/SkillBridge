import React from "react";
import { Progress } from "antd";
import "./ProgressBar.css";



/**
 * 向导进度条
 * @param {number} current - 当前 step（0 表示 Intro）
 * @param {number} total   - 总步数（含 Intro），例如 5（0..4）
 * @param {boolean} showLabel - 是否显示右侧标签
 */
export default function ProgressBar({ current, total}) {
  // 业务里：有效进度从第 1 步开始，Intro(0) 不计入百分比
  const percent = total > 1 ? Math.round((current / (total - 1)) * 100) : 0;

  return (
    <div className="wiz-progress" aria-label="Wizard progress">
      <Progress percent={percent} showInfo={false} />

    </div>
  );
}
