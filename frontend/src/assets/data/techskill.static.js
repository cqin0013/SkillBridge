// src/assets/data/techskill.static.js

/**
 * 技术技能库
 * 分类大致分为：Business, Productivity, Development, Education, Industry, Network, Security, System, Communication, Management
 * 每一类有 [{ code, name }]
 */

export const techSkillCategories = {
  business: [
    { code: "43231501", name: "Helpdesk or call center software" },
    { code: "43231503", name: "Procurement software" },
    { code: "43231505", name: "Human resources software" },
    { code: "43231506", name: "Materials requirements planning logistics and supply chain software" },
    { code: "43231507", name: "Project management software" },
    { code: "43231508", name: "Inventory management software" },
    { code: "43231509", name: "Bar coding software" },
    { code: "43231510", name: "Label making software" },
    { code: "43231512", name: "License management software" },
    { code: "43231514", name: "Sales and marketing software" },
    { code: "43231515", name: "Mailing and shipping software" },
    { code: "43231516", name: "Audit software" },
    { code: "43231517", name: "Procedure management software" },
    { code: "43231518", name: "Process mapping and design software" },
    { code: "43231601", name: "Accounting software" },
    { code: "43231602", name: "Enterprise resource planning ERP software" },
    { code: "43231603", name: "Tax preparation software" },
    { code: "43231604", name: "Financial analysis software" },
    { code: "43231605", name: "Time accounting software" },
    { code: "43232303", name: "Customer relationship management CRM software" },
    { code: "43232314", name: "Business intelligence and data analysis software" },
  ],

  productivity: [
    { code: "43231513", name: "Office suite software" },
    { code: "43232104", name: "Word processing software" },
    { code: "43232105", name: "Charting software" },
    { code: "43232106", name: "Presentation software" },
    { code: "43232107", name: "Web page creation and editing software" },
    { code: "43232108", name: "Calendar and scheduling software" },
    { code: "43232110", name: "Spreadsheet software" },
    { code: "43232111", name: "Optical character reader OCR or scanning software" },
    { code: "43232112", name: "Desktop publishing software" },
    { code: "43232201", name: "Content workflow software" },
    { code: "43232202", name: "Document management software" },
    { code: "43232203", name: "File versioning software" },
    { code: "43232503", name: "Spell checkers" },
    { code: "43232507", name: "Dictionary software" },
  ],

  development: [
    { code: "43232401", name: "Configuration management software" },
    { code: "43232402", name: "Development environment software" },
    { code: "43232403", name: "Enterprise application integration software" },
    { code: "43232404", name: "Graphical user interface development software" },
    { code: "43232405", name: "Object or component oriented development software" },
    { code: "43232406", name: "Program testing software" },
    { code: "43232407", name: "Requirements analysis and system architecture software" },
    { code: "43232408", name: "Web platform development software" },
    { code: "43232409", name: "Compiler and decompiler software" },
  ],

  database: [
    { code: "43232304", name: "Data base management system software" },
    { code: "43232305", name: "Data base reporting software" },
    { code: "43232306", name: "Data base user interface and query software" },
    { code: "43232307", name: "Data mining software" },
    { code: "43232309", name: "Information retrieval or search software" },
    { code: "43232310", name: "Metadata management software" },
    { code: "43232311", name: "Object oriented data base management software" },
    { code: "43232312", name: "Portal server software" },
    { code: "43232313", name: "Transaction server software" },
  ],

  education: [
    { code: "43232501", name: "Foreign language software" },
    { code: "43232502", name: "Computer based training software" },
    { code: "43232504", name: "Route navigation software" },
    { code: "43232505", name: "Multi-media educational software" },
  ],

  industry: [
    { code: "43232601", name: "Aviation ground support software" },
    { code: "43232603", name: "Facilities management software" },
    { code: "43232604", name: "Computer aided design CAD software" },
    { code: "43232605", name: "Analytical or scientific software" },
    { code: "43232606", name: "Compliance software" },
    { code: "43232607", name: "Flight control software" },
    { code: "43232608", name: "Industrial control software" },
    { code: "43232609", name: "Library software" },
    { code: "43232610", name: "Medical software" },
    { code: "43232611", name: "Point of sale POS software" },
    { code: "43232612", name: "Computer aided manufacturing CAM software" },
    { code: "43232613", name: "Manufacturing execution system MES software" },
    { code: "43232614", name: "CAD and CAM system" },
    { code: "43232616", name: "Legal management software" },
    { code: "43232620", name: "Risk management data and analysis software" },
  ],

  network: [
    { code: "43232701", name: "Application server software" },
    { code: "43232702", name: "Desktop communications software" },
    { code: "43232703", name: "Interactive voice response software" },
    { code: "43232704", name: "Internet directory services software" },
    { code: "43232705", name: "Internet browser software" },
    { code: "43232801", name: "Network monitoring software" },
    { code: "43232802", name: "Network operating system enhancement software" },
    { code: "43232803", name: "Optical network management software" },
    { code: "43232804", name: "Administration software" },
    { code: "43232805", name: "IP multimedia subsystem software" },
    { code: "43232806", name: "Cloud-based management software" },
    { code: "43232901", name: "Access software" },
    { code: "43232902", name: "Communications server software" },
    { code: "43232903", name: "Contact center software" },
    { code: "43232904", name: "Fax software" },
    { code: "43232905", name: "LAN software" },
    { code: "43232907", name: "Storage networking software" },
    { code: "43232908", name: "Switch or router software" },
    { code: "43232909", name: "WAN switching software and firmware" },
    { code: "43232910", name: "Wireless software" },
    { code: "43232911", name: "Terminal emulation software" },
    { code: "43232912", name: "Gateway software" },
    { code: "43232913", name: "Bridge software" },
    { code: "43232915", name: "Platform interconnectivity software" },
    { code: "43232917", name: "Software defined networking/virtualization software" },
  ],

  system: [
    { code: "43233001", name: "Filesystem software" },
    { code: "43233002", name: "Network operation system software" },
    { code: "43233004", name: "Operating system software" },
    { code: "43233007", name: "Computer imaging software" },
    { code: "43233402", name: "Data conversion software" },
    { code: "43233403", name: "Data compression software" },
    { code: "43233405", name: "Device drivers or system software" },
    { code: "43233407", name: "Graphics card driver software" },
    { code: "43233410", name: "Printer driver software" },
    { code: "43233413", name: "Voice recognition software" },
    { code: "43233414", name: "Storage media loading software" },
    { code: "43233415", name: "Backup or archival software" },
    { code: "43233420", name: "Text to speech conversion software" },
  ],

  security: [
    { code: "43233201", name: "Authentication server software" },
    { code: "43233203", name: "VPN management software" },
    { code: "43233204", name: "VPN equipment software" },
    { code: "43233205", name: "Transaction security and virus protection software" },
    { code: "43233206", name: "Cloud-based protection or security software" },
  ],

  communication: [
    { code: "43233501", name: "Electronic mail software" },
    { code: "43233502", name: "Video conferencing software" },
    { code: "43233503", name: "Network conferencing software" },
    { code: "43233504", name: "Instant messaging software" },
    { code: "43233506", name: "Map creation software" },
    { code: "43233508", name: "Mobile operator specific application software" },
    { code: "43233509", name: "Mobile messaging service software" },
    { code: "43233511", name: "Mobile location based services software" },
    { code: "43233513", name: "Cloud-based data access and sharing software" },
  ],

  management: [
    { code: "43231511", name: "Expert system software" },
    { code: "43231701", name: "Enterprise system management software" }, // 注意：原表格最后一行
  ],
};

export default techSkillCategories;
