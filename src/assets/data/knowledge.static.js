// src/assets/data/knowledge.static.js

/**
 * 静态知识库
 * - management: 管理/行政/经济/销售/客户/人力/运输
 * - production: 生产/食品
 * - technical: 计算机/工程/设计/建筑/机械
 * - science: 数学/物理/化学/生物/心理/社会/地理
 * - health: 医疗/治疗
 * - education: 教育
 * - culture: 语言/艺术/历史/哲学
 * - public: 公共安全/法律/政府
 * - communication: 通信/传媒
 */

export const knowledgeCategories = {
  management: [
    { code: "2.C.1.a", name: "Administration and Management" },
    { code: "2.C.1.b", name: "Administrative" },
    { code: "2.C.1.c", name: "Economics and Accounting" },
    { code: "2.C.1.d", name: "Sales and Marketing" },
    { code: "2.C.1.e", name: "Customer and Personal Service" },
    { code: "2.C.1.f", name: "Personnel and Human Resources" },
    { code: "2.C.10",  name: "Transportation" },
  ],

  production: [
    { code: "2.C.2.a", name: "Production and Processing" },
    { code: "2.C.2.b", name: "Food Production" },
  ],

  technical: [
    { code: "2.C.3.a", name: "Computers and Electronics" },
    { code: "2.C.3.b", name: "Engineering and Technology" },
    { code: "2.C.3.c", name: "Design" },
    { code: "2.C.3.d", name: "Building and Construction" },
    { code: "2.C.3.e", name: "Mechanical" },
  ],

  science: [
    { code: "2.C.4.a", name: "Mathematics" },
    { code: "2.C.4.b", name: "Physics" },
    { code: "2.C.4.c", name: "Chemistry" },
    { code: "2.C.4.d", name: "Biology" },
    { code: "2.C.4.e", name: "Psychology" },
    { code: "2.C.4.f", name: "Sociology and Anthropology" },
    { code: "2.C.4.g", name: "Geography" },
  ],

  health: [
    { code: "2.C.5.a", name: "Medicine and Dentistry" },
    { code: "2.C.5.b", name: "Therapy and Counseling" },
  ],

  education: [
    { code: "2.C.6", name: "Education and Training" },
  ],

  culture: [
    { code: "2.C.7.a", name: "English Language" },
    { code: "2.C.7.b", name: "Foreign Language" },
    { code: "2.C.7.c", name: "Fine Arts" },
    { code: "2.C.7.d", name: "History and Archeology" },
    { code: "2.C.7.e", name: "Philosophy and Theology" },
  ],

  public: [
    { code: "2.C.8.a", name: "Public Safety and Security" },
    { code: "2.C.8.b", name: "Law and Government" },
  ],

  communication: [
    { code: "2.C.9.a", name: "Telecommunications" },
    { code: "2.C.9.b", name: "Communications and Media" },
  ],
};

export default knowledgeCategories;
