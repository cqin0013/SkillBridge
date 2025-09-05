import React from "react";
import { Progress } from "antd";
import "./ProgressBar.css";

/**
* Wizard progress bar
* @param {number} current - current step (0 means Intro)
* @param {number} total - total number of steps (including Intro), for example 5 (0..4)
* @param {boolean} showLabel - whether to show the right label
*/
export default function ProgressBar({ current, total}) {
// Business: effective progress starts from step 1, Intro(0) is not included in the percentage
const percent = total > 1 ? Math.round((current / (total - 1)) * 100) : 0;

return (
<div className="wiz-progress" aria-label="Wizard progress">
<Progress percent={percent} showInfo={false} />

</div>
);
}