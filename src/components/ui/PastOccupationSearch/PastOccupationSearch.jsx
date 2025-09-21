// src/components/ui/PastOccupationSearch/PastOccupationSearch.jsx
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
import useResponsive from "../../../lib/hooks/useResponsive";
import { MAX_SELECT } from "../../../lib/constants/app";
import { INDUSTRY_OPTIONS } from "../../../lib/constants/industries";
import "./PastOccupationSearch.css";

const { Paragraph, Text } = Typography;

// New ANZSCO search endpoint (absolute URL)
const ANZSCO_SEARCH_URL =
  "https://progressive-alysia-skillbridge-437200d9.koyeb.app/anzsco/search";

/**
 * PastOccupationSearch
 * - Select a past industry (ANZSCO major group 1–8) + search by keyword
 * - Opens a modal with results and supports add/remove up to MAX_SELECT
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
  const [renderPickerModal, setRenderPickerModal] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [expandedCodes, setExpandedCodes] = useState(new Set());
  const [tipAfterAction, setTipAfterAction] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { isMobile } = useResponsive();

  // Resolve industry name for the current selection (used when mapping results)
  const industryName = useMemo(() => {
    if (industryId == null) return undefined;
    const item = INDUSTRY_OPTIONS.find(
      (opt) => String(opt.id) === String(industryId)
    );
    return item?.name;
  }, [industryId]);

  // --------------------- Sync with parent via prop ---------------------
  const syncSelected = (next) => {
    setSelected(next);
    try {
      sessionStorage.setItem("pos_selected", JSON.stringify(next));
    } catch {}
    onChangeSelectedProp?.(next);
  };

  useEffect(() => {
    if (Array.isArray(selectedProp)) setSelected(selectedProp);
  }, [selectedProp]);

  useEffect(() => {
    if (pickerOpen) setRenderPickerModal(true);
  }, [pickerOpen]);

  // Remaining selection slots
  const remain = Math.max(0, MAX_SELECT - selected.length);

  const formGutter = isMobile ? [8, 8] : [12, 8];
  const controlSize = isMobile ? "middle" : "large";
  const modalWidth = isMobile ? undefined : 720;
  const searchButton = (
    <Button type="primary" {...(isMobile ? { block: true } : {})}>
      Search
    </Button>
  );

  // Fast lookup set for already-selected occupation codes
  const selectedCodes = useMemo(
    () => new Set(selected.map((item) => item.occupation_code)),
    [selected]
  );

  // --------------------- Search entry (validations) ---------------------
  const handlePickerOpen = () => setPickerOpen(true);
  const handlePickerClose = () => setPickerOpen(false);
  const handleAfterPickerChange = (open) => {
    if (!open) setRenderPickerModal(false);
  };

  const handleSearch = async () => {
    const q = titleKw.trim();
    setErrorMsg("");
    setTipAfterAction("");

    if (!industryId) {
      setErrorMsg("Please select a past industry before searching.");
      return;
    }
    if (q.length < 2) {
      setErrorMsg("Please enter at least 2 characters before searching.");
      return;
    }

    handlePickerOpen();
    await doSearch(q);
  };

  // --------------------- Actual search request (NEW ENDPOINT) ---------------------
  const doSearch = async (q) => {
    try {
      setSearchLoading(true);
      setResults([]);

      // Build URL: first=<major group> & s=<keyword> & limit=12
      const url =
        `${ANZSCO_SEARCH_URL}?first=${encodeURIComponent(industryId)}` +
        `&s=${encodeURIComponent(q)}&limit=12`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      // Map API fields (anzsco_code/title) -> internal fields (occupation_*)
      // NOTE: description removed for now; API does not return it.
      const mapped = items.map((it) => ({
        occupation_code:
          it.anzsco_code ?? it.code ?? it.anzsco ?? String(it.id ?? ""),
        occupation_title: it.anzsco_title ?? it.title ?? it.name ?? "(Untitled)",
        // occupation_description: it.anzsco_description ?? it.description ?? "",
        occupation_industry: industryName, // <-- use industry NAME (not code)
      }));

      setResults(mapped);
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
    if (selectedCodes.has(item.occupation_code)) return;
    if (remain <= 0) {
      setTipAfterAction(
        "You’ve reached the maximum of 5 occupations. Remove one to add a new entry."
      );
      return;
    }
    const next = [...selected, item].slice(0, MAX_SELECT);
    syncSelected(next);
    setTipAfterAction("Added. You can continue searching or close the picker.");
    setErrorMsg("");
  };

  const removeItem = (code) => {
    const next = selected.filter((x) => x.occupation_code !== code);
    syncSelected(next);
    setTipAfterAction("Removed. You can search again or refine your keywords.");
  };

  // --------------------- Render ---------------------
  return (
    <>
      <Form layout="vertical" className="pos">
        <Row gutter={formGutter} align="stretch">
          <Col xs={24} md={8}>
            <Form.Item label="Past industry" className="pos__field">
              <Select
                size={controlSize}
                value={industryId}
                onChange={(value) => {
                  setIndustryId(value);
                  setTipAfterAction("");
                }}
                options={INDUSTRY_OPTIONS.map((option) => ({
                  label: option.name,
                  value: option.id,
                }))}
                placeholder="Select past industry"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item label="Past job title" className="pos__field">
              <Input.Search
                size={controlSize}
                value={titleKw}
                onChange={(event) => {
                  setTitleKw(event.target.value);
                  setErrorMsg("");
                  setTipAfterAction("");
                }}
                onSearch={handleSearch}
                placeholder="Type your past job title (e.g., Data Analyst)"
                allowClear
                loading={searchLoading}
                enterButton={searchButton}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {selected.length > 0 && (
        <Space size={[8, 8]} wrap style={{ marginTop: 8 }}>
          {selected.map((c) => (
            <Tag
              key={c.occupation_code}
              closable
              onClose={(event) => {
                event.preventDefault();
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

      {errorMsg && (
        <Alert type="warning" showIcon style={{ marginTop: 8 }} message={errorMsg} />
      )}
      {tipAfterAction && (
        <Alert type="info" showIcon style={{ marginTop: 8 }} message={tipAfterAction} />
      )}

      {renderPickerModal && (
        <Modal
          open={pickerOpen}
          title={
            <div>
              Add past occupations <Text type="secondary">(up to {remain} more)</Text>
            </div>
          }
          onCancel={handlePickerClose}
          afterOpenChange={handleAfterPickerChange}
          footer={null}
          maskClosable={false}
          width={modalWidth}
        >
          {searchLoading ? (
            <Alert type="info" showIcon message="Searching… Please wait." />
          ) : results.length === 0 ? (
            <Alert type="info" showIcon message="No results found. Try another keyword." />
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
                    <div className="pos__main">
                      <div className="pos__title">
                        <span>{item.occupation_title}</span>
                        {isSelected && (
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            (selected)
                          </Text>
                        )}
                      </div>

                      <div className="pos__actions">
                        {isSelected ? (
                          <Button
                            size={isMobile ? "middle" : "small"}
                            danger
                            onClick={() => removeItem(code)}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size={isMobile ? "middle" : "small"}
                            type="primary"
                            onClick={() => addItem(item)}
                            disabled={disabledToAdd}
                          >
                            Add
                          </Button>
                        )}
                        <Button
                          size={isMobile ? "middle" : "small"}
                          type="text"
                          className="pos__show"
                          onClick={() => toggleDetails(code)}
                        >
                          {isOpen ? "Hide details" : "Show details"}
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="pos__details">
                        {/* Description disabled for now: API doesn't return it */}
                        {/* {item.occupation_description ? (
                          <Paragraph style={{ marginBottom: 8 }}>
                            {item.occupation_description}
                          </Paragraph>
                        ) : (
                          <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                            No description available.
                          </Paragraph>
                        )} */}
                        <div className="pos__meta">
                          <Text type="secondary">Industry:</Text>&nbsp;
                          {String(item.occupation_industry ?? "—")}
                        </div>
                      </div>
                    )}
                  </List.Item>
                );
              }}
            />
          )}
        </Modal>
      )}
    </>
  );
}
