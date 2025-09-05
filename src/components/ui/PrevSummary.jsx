import React from "react";

/**
* Previous step summary
* - items: string[] | string. When string, separate with semicolons (; or ;).
* - pillText: string. Top left corner pill text (default: "Previous page")
*/
export default function PrevSummary({ items, pillText = "Previous page" }) {
const normalizeItems = (val) => {
if (Array.isArray(val)) {
return val.map(String).map(s => s.trim()).filter(Boolean);
}
if (typeof val === "string") {
// Supports Chinese/English semicolons, consecutive semicolons are also OK; remove leading and trailing whitespace and filter empty items
return val
.split(/[;；]+/)
.map(s => s.trim())
.filter(Boolean);
}
return [];
};

const list = normalizeItems(items); 

if (list.length === 0) return null; 

return ( 
<div className="prev-summary" role="note" aria-label="Previous step summary"> 
<span className="prev-pill">{pillText}</span> 
<ul className="prev-list"> 
{list.map((t, i) => ( 
<li key={i}>{t}</li> 
))} 
</ul> 
</div> 
);
}