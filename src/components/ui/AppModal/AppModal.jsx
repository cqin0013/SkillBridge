import { Modal } from "antd";

/**
 * AppModal
 * Thin wrapper that applies shared defaults (padding, mask behaviour).
 * Callers still control mount/unmount behaviour via their own state.
 */
export default function AppModal({
  open,
  onClose,
  title,
  children,
  footer = null,
  width,
  top = 24,
  maskClosable = false,
  bodyPaddingBlock = 12,
  ...rest
}) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      footer={footer}
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
