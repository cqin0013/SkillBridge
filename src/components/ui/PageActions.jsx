import React from "react";
import { Button } from "antd";
import "./PageActions.css";

export default function PageActions({ onPrev, onNext, nextDisabled, finish }) {
  return (
    <div className="page-actions">
      {onPrev && (
        <Button onClick={onPrev}>
          Back
        </Button>
      )}
      {finish ? (
        <Button type="primary" onClick={finish} disabled={nextDisabled}>
          Finish
        </Button>
      ) : (
        <Button type="primary" onClick={onNext} disabled={nextDisabled}>
          Next
        </Button>
      )}
    </div>
  );
}
