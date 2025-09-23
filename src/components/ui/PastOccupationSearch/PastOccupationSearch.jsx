import { useMemo, useState, useEffect } from "react";
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
 * - Pick a past industry (ANZSCO major group 1–8) + search by keyword.
 * - Opens a modal with results and supports add/remove up to MAX_SELECT.
 * - Mobile layout stacks actions below the title so long titles never get cut off.
 */
export default function PastOccupationSearch({
  selected: selectedProp,
  onChangeSelected: onChangeSelectedProp,
}) {
  /** Controlled selection state */
  const [selected, setSelected] = useState(
    Array.isArray(selectedProp) ? selectedProp : []
  );

  /** Simple UI states */
  const [industryId, setIndustryId] = useState();
  const [titleKw, setTitleKw] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renderPickerModal, setRenderPickerModal] = useState(false);

  /** Data + feedback states */
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [expandedCodes, setExpandedCodes] = useState(new Set());
  const [tipAfterAction, setTipAfterAction] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  /** Responsive helpers */
  const { isMobile } = useResponsive();
  const formGutter = isMobile ? [8, 8] : [12, 8];
  const controlSize = isMobile ? "middle" : "large";
  const modalWidth = isMobile ? undefined : 720;

  /** Resolve industry name for the current selection (mapped into result items) */
  const industryName = useMemo(() => {
    if (industryId == null) return undefined;
    const item = INDUSTRY_OPTIONS.find(
      (opt) => String(opt.id) === String(industryId)
    );
    return item?.name;
  }, [industryId]);

  /** Keep parent in sync */
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

  /** Remaining selection slots */
  const remain = Math.max(0, MAX_SELECT - selected.length);

  /** Fast lookup set for already-selected occupation codes */
  const selectedCodes = useMemo(
    () => new Set(selected.map((item) => item.occupation_code)),
    [selected]
  );

  /* ----------------------- Search entry (validations) ----------------------- */
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

  /* --------------------- Actual search request (endpoint) ------------------- */
  const doSearch = async (q) => {
    try {
      setSearchLoading(true);
      setResults([]);

      // Build URL: first=<major group> & s=<keyword> & limit=10
      const url =
        `${ANZSCO_SEARCH_URL}?first=${encodeURIComponent(industryId)}` +
        `&s=${encodeURIComponent(q)}&limit=10`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      // Map API fields (anzsco_code/title/description) -> internal fields used by UI
      const mapped = items.map((it) => ({
        occupation_code:
          it.anzsco_code ?? it.code ?? it.anzsco ?? String(it.id ?? ""),
        occupation_title:
          it.anzsco_title ?? it.title ?? it.name ?? "(Untitled)",
        occupation_description:
          it.anzsco_description ?? it.description ?? "", // now supported
        occupation_industry: industryName,
      }));

      setResults(mapped);
    } catch (err) {
      setResults([]);
      setErrorMsg(err?.message || "Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  /* --------------------------- Selection handlers -------------------------- */
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
        "You've reached the maximum of 5 occupations. Remove one to add a new entry."
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

  /* --------------------------------- Render -------------------------------- */
  return (
    <>
      <Form layout="vertical" className={`pos pos--${controlSize}`}>
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
                // Keep input and button the same height via the same size prop
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
                // Custom button with the same size guarantees equal height
                enterButton={
                  <Button size={controlSize} type="primary">
                    Search
                  </Button>
                }
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
            <Alert
              type="info"
              showIcon
              message="Input error or we don’t have information about the job you’re looking for. Try another keyword or search for a similar occupation."
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
                    {/* Main row: stack on mobile so title gets full width */}
                    <div
                      className="pos__main"
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: isMobile ? "flex-start" : "center",
                        flexDirection: isMobile ? "column" : "row",
                        minWidth: 0, // let children shrink inside flex
                        width: "100%",
                      }}
                    >
                      {/* Title block should be able to wrap on small screens */}
                      <div
                        className="pos__title"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          width: "100%",
                        }}
                      >
                        <span
                          className="pos__title-text"
                          style={{
                            display: "block",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            lineHeight: 1.35,
                          }}
                        >
                          {item.occupation_title}
                        </span>
                        {isSelected && (
                          <Text type="secondary" style={{ marginLeft: 0 }}>
                            (selected)
                          </Text>
                        )}
                      </div>

                      {/* Actions: move under title on mobile */}
                      <div
                        className="pos__actions"
                        style={{
                          display: "flex",
                          gap: 8,
                          flexShrink: 0,
                          width: isMobile ? "100%" : "auto",
                        }}
                      >
                        {isSelected ? (
                          <Button
                            size={isMobile ? "middle" : "small"}
                            danger
                            onClick={() => removeItem(code)}
                            style={{ flex: isMobile ? 1 : undefined }}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size={isMobile ? "middle" : "small"}
                            type="primary"
                            onClick={() => addItem(item)}
                            disabled={disabledToAdd}
                            style={{ flex: isMobile ? 1 : undefined }}
                          >
                            Add
                          </Button>
                        )}
                        <Button
                          size={isMobile ? "middle" : "small"}
                          type="text"
                          className="pos__show"
                          onClick={() => toggleDetails(code)}
                          style={{ flex: isMobile ? 1 : undefined, textAlign: "left" }}
                        >
                          {isOpen ? "Hide details" : "Show details"}
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="pos__details" style={{ width: "100%", minWidth: 0 }}>
                        {/* Description if available; otherwise default message */}
                        {item.occupation_description ? (
                          <Paragraph style={{ marginBottom: 8 }}>
                            {item.occupation_description}
                          </Paragraph>
                        ) : (
                          <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                            no description for this occupation
                          </Paragraph>
                        )}
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
