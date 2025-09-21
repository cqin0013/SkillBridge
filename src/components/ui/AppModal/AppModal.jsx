
import { Modal } from "antd";

/**
 * AppModal 
 * - `destroyOnHidden` and `styles.body`
 * - Sensible defaults; pass only what you need.
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
  destroyOnHidden = true,   
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
