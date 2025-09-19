import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// Vite 写法；如果你用 CRA，见下方注释
const GEO_URL = `${import.meta.env.BASE_URL}geo/au-states.geojson`;
// CRA：const GEO_URL = process.env.PUBLIC_URL + '/geo/au-states.geojson';

export default function InsightMapBare({ width = 760, height = 520 }) {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center: [134, -28], scale: 800 }}
      width={width}
      height={height}
      style={{ width: "100%", height: "auto" }}
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map((g) => (
            <Geography
              key={g.rsmKey}
              geography={g}
              style={{
                default: { fill: "#e6f2ff", stroke: "#ffffff", strokeWidth: 1.2, outline: "none" },
                hover:   { fill: "#2b7bd8",  outline: "none" },
                pressed: { fill: "#184d91",  outline: "none" },
              }}
            />
          ))
        }
      </Geographies>
    </ComposableMap>
  );
}
