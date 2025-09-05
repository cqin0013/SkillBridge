import React, { useMemo, useState } from "react";
import { Modal, Tabs, Input, Checkbox, Tag, Button } from "antd";
import "./SkillPicker.css";

/** 
*SkillPicker 
* - categories: { id, label, skills: string[] }[] 
* - open: boolean 
* - onClose(): void 
* - onConfirm(selected: string[]): void 
* - initiallySelected: string[] 
*/
//New props: maxSelectable?: number
export default function SkillPicker({ 
categories = [], 
open, 
onClose, 
onConfirm, 
initiallySelected = [], 
title = "Pick your skills", 
maxSelectable, // <= new
}) { 
const [activeKey, setActiveKey] = useState(categories[0]?.id || ""); 
const [kw, setKw] = useState(""); 
const [picked, setPicked] = useState(new Set(initiallySelected)); 

const limitReached = typeof maxSelectable === "number" && picked.size >= maxSelectable; 

const currentSkills = useMemo(() => { 
const cat = categories.find((c) => c.id === activeKey) || categories[0]; 
if (!cat) return []; 
const k = kw.trim().toLowerCase(); 
const list = cat.skills || []; 
return k ? list.filter((s) => s.toLowerCase().includes(k)) : list; 
}, [categories, activeKey, kw]); 

const toggle = (name) => { 
setPicked((prev) => { 
const next = new Set(prev); 
if (next.has(name)) { next.delete(name); 
return next; 
} 
// If the upper limit is reached, no more new additions will be made. 
if (limitReached) return next; 
next.add(name); 
return next; 
}); 
}; 

const tabsItems = categories.map((c) => ({ 
key: c.id, 
label: ( 
<span> 
{c.label}{" "} 
<Tag style={{ marginLeft: 6 }} bordered={false}> 
{c.skills.length} 
</Tag> 
</span> 
), 
children: ( 
<div className="sp-body"> 
<Input 
allowClear 
placeholder="Search in this category…" 
value={kw} 
onChange={(e) => setKw(e.target.value)} 
className="sp-search" 
/> 
<div className="sp-grid"> 
{currentSkills.map((name) => { 
const checked = picked.has(name); 
const disabled = !checked && limitReached; // When the limit is exceeded, unchecked items are disabled 
return ( 
<label 
key={name} 
className={`sp-item ${checked ? "is-picked" : ""} ${disabled ? "is-disabled" : ""}`} 
title={disabled ? `Up to ${maxSelectable} items` : ""} 
> 
<Checkbox 
checked={checked} 
onChange={() => toggle(name)} 
disabled={disabled} 
/> 
<span className="sp-name">{name}</span> 
</label> 
); 
})} 
{currentSkills.length === 0 && <div className="sp-empty">No results</div>} 
</div> 
</div> 
), 
})); 

return ( 
<Modal open={open} 
onCancel={onClose} 
title={title} 
width={720} 
footer={[ 
<div key="count" style={{ flex: 1, textAlign: "left" }}> 
<span className="sp-count"> 
Selected: {picked.size}{typeof maxSelectable === "number" ? ` / ${maxSelectable}` : ""} 
</span> 
{limitReached && ( 
<span style={{ marginLeft: 8, color: "var(--color-muted)" }}> 
(The upper limit has been reached) 
</span> 
)} 
</div>, 
<Button key="cancel" onClick={onClose}>Cancel</Button>, 
<Button 
key="ok" 
type="primary" 
onClick={() => onConfirm(Array.from(picked))} disabled={picked.size === 0} 
> 
Add {picked.size ? `(${picked.size})` : ""} 
</Button>, 
]} 
> 
<Tabs 
activeKey={activeKey || categories[0]?.id} 
onChange={(k) => { 
setActiveKey(k); 
setKw(""); 
}} 
items={tabsItems} 
/> 
</Modal> 
);
}