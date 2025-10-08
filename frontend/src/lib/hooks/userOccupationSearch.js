
import { useState, useCallback, useRef } from "react";
import { searchOccupations } from "../api/occupationsApi";
import { SEARCH_MIN_LEN } from "../constants/app";

/**
 * Encapsulates search UX for occupations:
 * - min length guard
 * - AbortController for quick consecutive queries
 * - error message + results + loading
 */
export function useOccupationsSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef(null);

  const clearResults = useCallback(() => setResults([]), []);

  const search = useCallback(async (raw) => {
    const q = (raw || "").trim();
    setErrorMsg("");

    if (q.length < SEARCH_MIN_LEN) {
      setErrorMsg(`Please enter at least ${SEARCH_MIN_LEN} characters to search.`);
      return false;
    }

    if (abortRef.current) {
    abortRef.current.abort(); 
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const list = await searchOccupations(q, { signal: controller.signal });
      setResults(list);
      return true;
    } catch (err) {
      if (err?.name !== "AbortError") {
        setErrorMsg("Search failed. Please try again.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    search,
    loading,
    results,
    errorMsg,
    setErrorMsg,   // allow page to reset on input change
    clearResults,
  };
}
