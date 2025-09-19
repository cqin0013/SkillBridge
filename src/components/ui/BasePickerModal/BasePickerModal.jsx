// src/components/shared/BasePickerModal.jsx
import React from "react";
import { Modal, Alert, List, Checkbox, Typography } from "antd";
import "./BasePickerModal.css";

const { Text } = Typography;

/**
 * BasePickerModal
 * 通用勾选列表弹窗
 *
 * Props:
 * - open: boolean
 * - loading: boolean
 * - items: any[]
 * - itemKey: (item) => string
 * - itemTitle: (item) => ReactNode
 * - itemDescription?: (item) => ReactNode
 * - checkedKeys: string[]
 * - onChangeChecked: (keys: string[]) => void
 * - disabledKeys?: string[]
 * - maxAdd?: number
 * - title?: ReactNode
 * - tip?: ReactNode
 * - onOk: () => void
 * - onCancel: () => void
 */
export default function BasePickerModal({
  open,
  loading,
  items,
  itemKey,
  itemTitle,
  itemDescription,
  checkedKeys,
  onChangeChecked,
  disabledKeys = [],
  maxAdd,
  title,
  tip,
  onOk,
  onCancel,
}) {
  const remain = typeof maxAdd === "number" ? maxAdd : Infinity;

  const handleChange = (keys) => {
    if (remain < Infinity) {
      onChangeChecked(keys.slice(0, remain));
    } else {
      onChangeChecked(keys);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      okButtonProps={{ disabled: loading }}
      destroyOnClose
      className="base-picker-modal"
    >
      {tip && (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message={tip} />
      )}

      {loading ? (
        <Alert
          type="info"
          showIcon
          message="Loading..."
          description="Please wait, fetching data."
        />
      ) : items.length === 0 ? (
        <Alert type="info" message="No results found." />
      ) : (
        <Checkbox.Group value={checkedKeys} onChange={handleChange}>
          <List
            dataSource={items}
            renderItem={(item) => {
              const key = itemKey(item);
              const alreadyDisabled = disabledKeys.includes(key);
              const disabled = alreadyDisabled || remain <= 0;
              return (
                <List.Item className="base-picker-item">
                  <Checkbox
                    value={key}
                    disabled={disabled}
                    className="base-picker-checkbox"
                  />
                  <div className="base-picker-content">
                    <div className="base-picker-title">
                      {itemTitle(item)}
                      {alreadyDisabled && (
                        <Text type="secondary" className="base-picker-tag">
                          (already selected)
                        </Text>
                      )}
                    </div>
                    {itemDescription && (
                      <div className="base-picker-desc">
                        {itemDescription(item)}
                      </div>
                    )}
                  </div>
                </List.Item>
              );
            }}
          />
        </Checkbox.Group>
      )}
    </Modal>
  );
}
