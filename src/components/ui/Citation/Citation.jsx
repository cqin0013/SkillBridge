
import "./Citation.css";

/**
 * Citation component for showing data sources.
 *
 * Props:
 * - source: string (required) → The name of the source 
 * - url?: string → If provided, the source will be a clickable link
 * - year?: number | string → Year of the dataset (optional)
 * - extra?: string → Extra note (optional, e.g. "Data reference")
 * - className?: string → Extra class for styling/positioning
 */
export default function Citation({ source, url, year, extra, className = "" }) {
  return (
    <div className={`citation ${className}`}>
      <span className="citation-prefix">Source:</span>{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {source}
        </a>
      ) : (
        <span>{source}</span>
      )}
      {year && <span> ({year})</span>}
      {extra && <span>, {extra}</span>}
    </div>
  );
}
