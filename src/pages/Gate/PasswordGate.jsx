
// A simple password gate page:
// - User enters a password
// - We verify it against a SHA-256 hash (set in VITE_GATE_HASH)
// - If correct, mark the session as unlocked and navigate to the target page

import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, Alert, Card, Typography } from "antd";
import { verifyPassword, unlockGate } from "../../lib/gate";

const { Title, Text } = Typography;

export default function PasswordGate() {
  // Loading state for the submit button
  const [loading, setLoading] = useState(false);
  // Error message to show in an Alert
  const [err, setErr] = useState("");

  // Router helpers
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  // After successful login, go to ?next=... or fallback to "/"
  const next = sp.get("next") || "/";

  // Handle form submit
  const onFinish = async ({ password }) => {
    setErr("");
    setLoading(true);
    try {
      // Check if the entered password matches the expected hash
      const ok = await verifyPassword(password);
      if (!ok) {
        setErr("Incorrect password");
        return;
      }
      // Remember that this session is unlocked
      unlockGate();
      // Redirect to the original target page
      navigate(next, { replace: true });
    } catch (e) {
      // Show any unexpected error
      setErr(e?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Center the card vertically and horizontally
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 16 }}>
      <Card style={{ width: 360 }}>
        <Title level={4} style={{ marginBottom: 4 }}>Enter System</Title>
        <Text type="secondary">Please enter the access password.</Text>

        {/* Show an error alert if there is an error */}
        {err ? <Alert style={{ marginTop: 12 }} type="error" showIcon message={err} /> : null}

        {/* Simple password form */}
        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 12 }}>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please enter the password" }]}
          >
            <Input.Password autoFocus placeholder="••••••••" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading}>
            Enter
          </Button>
        </Form>
      </Card>
    </div>
  );
}
