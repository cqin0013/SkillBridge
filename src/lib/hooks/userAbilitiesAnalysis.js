
import { useState, useCallback } from "react";
import { getOccupationTitles } from "../api/occupations";
import { MOCK_TITLES_RESPONSE } from "../constants/mocks";

/**
 * Analyze selected occupation codes into a merged, deduped abilities list.
 * Output schema: { title, code?, type: "knowledge" | "skill" | "tech" }
 */
export function useAbilitiesAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [abilities, setAbilities] = useState([]);

  const analyze = useCallback(async (codes = []) => {
    if (!Array.isArray(codes) || codes.length === 0) {
      setDone(false);
      setMessage("");
      setAbilities([]);
      return { ok: false, abilities: [] };
    }

    setAnalyzing(true);
    setDone(false);
    setMessage("");
    try {
      // fetch all in parallel; on per-item error, fallback to mock
      const payloads = await Promise.all(
        codes.map(async (code) => {
          try {
            return await getOccupationTitles(code);
          } catch {
            return MOCK_TITLES_RESPONSE;
          }
        })
      );

      // normalize + merge
      const merged = [];
      for (const data of payloads) {
        const k = Array.isArray(data?.knowledge_titles) && data.knowledge_titles.length
          ? data.knowledge_titles
          : MOCK_TITLES_RESPONSE.knowledge_titles;

        const s = Array.isArray(data?.skill_titles) && data.skill_titles.length
          ? data.skill_titles
          : MOCK_TITLES_RESPONSE.skill_titles;

        const t = Array.isArray(data?.tech_titles) && data.tech_titles.length
          ? data.tech_titles
          : MOCK_TITLES_RESPONSE.tech_titles;

        merged.push(
          ...k.map((x) => ({ title: x.title, code: x.code, type: "knowledge" })),
          ...s.map((x) => ({ title: x.title, code: x.code, type: "skill" })),
          ...t.map((x) => ({ title: x.title, code: x.code, type: "tech" }))
        );
      }

      // dedupe by code, fallback to title
      const seen = new Set();
      const uniq = [];
      for (const a of merged) {
        const key = a.code || `t:${a.title}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniq.push(a);
        }
      }

      setAbilities(uniq);
      setDone(true);
      setMessage("Analysis complete.");
      return { ok: true, abilities: uniq };
    } catch  {
      setAbilities([]);
      setDone(false);
      setMessage("Failed to analyze. Please try again.");
      return { ok: false, abilities: [] };
    } finally {
      setAnalyzing(false);
    }
  }, []);

  return { analyze, analyzing, done, message, abilities, setAbilities };
}
