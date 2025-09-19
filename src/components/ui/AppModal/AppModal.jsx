// src/components/ui/AppModal/AppModal.jsx
import React from "react";
import { Modal } from "antd";

/**
 * AppModal (Ant Design v5)
 * - Uses v5 props: `destroyOnHidden` and `styles.body` (no deprecated props).
 * - Sensible defaults; pass only what you need.
 */
export default function AppModal({
  open,
  onClose,
  title,
  children,
  footer = null,
  width,
  top = 24,                 // distance from viewport top; set to null to let antd center
  maskClosable = false,
  bodyPaddingBlock = 12,    // vertical padding inside body
  destroyOnHidden = true,   // unmount content when hidden
  ...rest
}) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      footer={footer}
      destroyOnHidden={destroyOnHidden}
      maskClosable={maskClosable}
      width={width}
      style={top != null ? { top } : undefined}
      styles={{ body: { paddingBlock: bodyPaddingBlock } }}
      {...rest}
    >
      {children}
    </Modal>
  );
}
