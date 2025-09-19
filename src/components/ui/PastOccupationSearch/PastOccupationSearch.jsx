import React, { useMemo, useState, useEffect } from "react";
import {
  Form,
  Row,
  Col,
  Select,
  Input,
  Modal,
  List,
  Typography,
  Alert,
  Button,
  Space,
  Tag,
} from "antd";
import { MAX_SELECT } from "../../../lib/constants/app";
import { INDUSTRY_OPTIONS } from "../../../lib/constants/industries";
import { getApiBase } from "../../../lib/api/occupationsApi"; // ✅ centralized API base
import "./PastOccupationSearch.css";

const { Paragraph, Text } = Typography;

/**
 * PastOccupationSearch
 * - Lets users select a past industry + search past job titles
 * - Shows a modal picker with results and supports add/remove up to MAX_SELECT
 */
export default function PastOccupationSearch({
  selected: selectedProp,
  onChangeSelected: onChangeSelectedProp,
}) {
  // --------------------- Local state ---------------------
  const [selected, setSelected] = useState(
    Array.isArray(selectedProp) ? selectedProp : []
  );
  const [industryId, setIndustryId] = useState();
  const [titleKw, setTitleKw] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [expandedCodes, setExpandedCodes] = useState(new Set());
  const [tipAfterAction, setTipAfterAction] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // --------------------- Sync with parent via prop ---------------------
  const syncSelected = (next) => {
    setSelected(next);
    try {
      // Persist selection in this session so a refresh doesn’t lose it
      sessionStorage.setItem("pos_selected", JSON.stringify(next));
    } catch {}
    onChangeSelectedProp?.(next);
  };

  useEffect(() => {
    if (Array.isArray(selectedProp)) setSelected(selectedProp);
  }, [selectedProp]);

  // Remaining selection slots
  const remain = Math.max(0, MAX_SELECT - selected.length);

  // Fast lookup set for already-selected occupation codes
  const selectedCodes = useMemo(
    () => new Set(selected.map((x) => x.occupation_code)),
    [selected]
  );

  // --------------------- Search entry (validations) ---------------------
  const handleSearch = async () => {
    const q = titleKw.trim();
    setErrorMsg("");
    setTipAfterAction("");

    // Require industry selection to keep context consistent
    if (!industryId) {
      setErrorMsg("Please select a past industry before searching.");
      return;
    }
    // Minimum 2 chars to avoid noisy queries
    if (q.length < 2) {
      setErrorMsg("Please enter at least 2 characters before searching.");
      return;
    }
    setPickerOpen(true);
    await doSearch(q);
  };

  // --------------------- Actual search request ---------------------
  const doSearch = async (q) => {
    try {
      setSearchLoading(true);
      setResults([]);

      // 1) Resolve API base (ensured to be https, no trailing slash, and no quotes)
      const API_BASE = getApiBase();

      // 2) Build the final URL (avoid adding quotes anywhere)
      const url = `${API_BASE}/occupations/search-and-titles?s=${encodeURIComponent(
        q
      )}&include=title,description&limit=10`;

      // 3) Fire the request
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);

      // 4) Map response to the list we need in the modal
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const list = items.map((it) => ({
        occupation_code: it.occupation_code,
        occupation_title: it.occupation_title,
        occupation_description: it.occupation_description,
        occupation_industry: industryId, // keep currently chosen industry in each item
      }));
      setResults(list);
    } catch (err) {
      setResults([]);
      setErrorMsg(err?.message || "Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  // --------------------- Selection handlers ---------------------
  const toggleDetails = (code) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const addItem = (item) => {
    if (selected.length >= MAX_SELECT) return;
    if (selectedCodes.has(item.occupation_code)) return;

    const next = [...selected, item].slice(0, MAX_SELECT);
    syncSelected(next);

    // Only show the tip if there’s still space for more
    if (next.length < MAX_SELECT) {
      setTipAfterAction("Added. You can search again or try another keyword.");
    } else {
      setTipAfterAction("");
    }
  };

  const removeItem = (code) => {
    const next = selected.filter((x) => x.occupation_code !== code);
    syncSelected(next);
    setTipAfterAction("Removed. You can search again or refine your keywords.");
  };

  // --------------------- Render ---------------------
  return (
    <>
      {/* Search form */}
      <Form layout="vertical" className="pos">
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} md={8}>
            <Form.Item label="Past industry" className="pos__field">
              <Select
                value={industryId}
                onChange={(v) => {
                  setIndustryId(v);
                  setTipAfterAction("");
                }}
                options={INDUSTRY_OPTIONS.map((o) => ({
                  label: o.name,
                  value: o.id,
                }))}
                placeholder="Select past industry"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item label="Past job title" className="pos__field">
              <Input.Search
                value={titleKw}
                onChange={(e) => {
                  setTitleKw(e.target.value);
                  setErrorMsg("");
                  setTipAfterAction("");
                }}
                onSearch={handleSearch}
                placeholder="Type your past job title (e.g., Data Analyst)…"
                allowClear
                loading={searchLoading}
                enterButton="Search"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {/* Selected chips */}
      {selected.length > 0 && (
        <Space size={[8, 8]} wrap style={{ marginTop: 8 }}>
          {selected.map((c) => (
            <Tag
              key={c.occupation_code}
              closable
              onClose={(e) => {
                e.preventDefault();
                removeItem(c.occupation_code);
              }}
            >
              {c.occupation_title}
            </Tag>
          ))}
          <Text type="secondary">
            {selected.length}/{MAX_SELECT} selected
          </Text>
        </Space>
      )}

      {/* Inline tips */}
      {errorMsg && (
        <Alert type="warning" showIcon style={{ marginTop: 8 }} message={errorMsg} />
      )}
      {tipAfterAction && (
        <Alert type="info" showIcon style={{ marginTop: 8 }} message={tipAfterAction} />
      )}

      {/* Results picker modal */}
      <Modal
        open={pickerOpen}
        title={
          <div>
            Add past occupations{" "}
            <Text type="secondary">(up to {remain} more)</Text>
          </div>
        }
        onCancel={() => setPickerOpen(false)}
        footer={null}
        destroyOnHide
        maskClosable={false}
      >
        {searchLoading ? (
          <Alert type="info" showIcon message="Searching… Please wait." />
        ) : results.length === 0 ? (
          <Alert
            type="info"
            showIcon
            message="No results found. Try another keyword."
          />
        ) : (
          <List
            dataSource={results}
            renderItem={(item) => {
              const code = item.occupation_code;
              const isSelected = selectedCodes.has(code);
              const disabledToAdd = !isSelected && remain <= 0;
              const isOpen = expandedCodes.has(code);

              return (
                <List.Item className="pos__item" key={code}>
                  {/* Main row */}
                  <div className="pos__main">
                    <div className="pos__title">
                      <span>{item.occupation_title}</span>
                      {isSelected && (
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          (selected)
                        </Text>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pos__actions">
                      {isSelected ? (
                        <Button size="small" danger onClick={() => removeItem(code)}>
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => addItem(item)}
                          disabled={disabledToAdd}
                        >
                          Add
                        </Button>
                      )}
                      <Button
                        size="small"
                        type="text"
                        className="pos__show"
                        onClick={() => toggleDetails(code)}
                      >
                        {isOpen ? "Hide details" : "Show details"}
                      </Button>
                    </div>
                  </div>

                  {/* Details section */}
                  {isOpen && (
                    <div className="pos__details">
                      {item.occupation_description ? (
                        <Paragraph style={{ marginBottom: 8 }}>
                          {item.occupation_description}
                        </Paragraph>
                      ) : (
                        <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                          No description available.
                        </Paragraph>
                      )}

                      <div className="pos__meta">
                        <Text type="secondary">Industry:</Text>&nbsp;
                        {String(item.occupation_industry ?? "undefined")}
                      </div>
                    </div>
                  )}
                </List.Item>
              );
            }}
          />
        )}
      </Modal>
    </>
  );
}
