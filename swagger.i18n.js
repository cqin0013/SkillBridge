// swagger.i18n.js
import swaggerJSDoc from 'swagger-jsdoc';

// 你已有的两个服务器地址
const servers = [
  { url: 'http://localhost:8080', description: 'Local' },
  { url: 'https://progressive-alysia-skillbridge-437200d9.koyeb.app', description: 'Koyeb' },
];

// 生成“英文基础 spec”（用现有的英文 JSDoc 注释）
function buildBaseSpec() {
  return swaggerJSDoc({
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'SkillBridge API',
        version: '1.0.0',
        description: 'ANZSCO search, ability mapping, training courses, and shortage ratings.',
      },
      servers,
      components: {
        schemas: {
          AnzscoItem: {
            type: 'object',
            properties: {
              anzsco_code: { type: 'string', example: '261313' },
              anzsco_title: { type: 'string', example: 'Software Engineer' },
            },
          },
          SearchResponse: {
            type: 'object',
            properties: {
              major: {
                type: 'object',
                properties: {
                  first: { type: 'string', example: '2' },
                  name:  { type: 'string', example: 'Professionals' },
                }
              },
              items: {
                type: 'array',
                items: { $ref: '#/components/schemas/AnzscoItem' }
              }
            }
          },
          SkillsResponse: {
            type: 'object',
            properties: {
              anzsco: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: '261313' },
                  major_first: { type: 'string', example: '2' },
                  major_name:  { type: 'string', example: 'Professionals' }
                }
              },
              occupations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    occupation_code: { type: 'string', example: '15-2031.00' },
                    occupation_title:{ type: 'string', example: 'Operations Research Analysts' }
                  }
                }
              },
              knowledge_titles: {
                type: 'array',
                items: { type: 'object', properties: {
                  code: { type: 'string', example: '2.C.1.a' },
                  title:{ type: 'string', example: 'Administration and Management' }
                }}
              },
              skill_titles: {
                type: 'array',
                items: { type: 'object', properties: {
                  code: { type: 'string', example: '2.B.1.e' },
                  title:{ type: 'string', example: 'Instructing' }
                }}
              },
              tech_titles: {
                type: 'array',
                items: { type: 'object', properties: {
                  code: { type: 'string', example: '43233208' },
                  title:{ type: 'string', example: 'Version control software' }
                }}
              }
            }
          },
          TrainingAdviceResponse: {
            type: 'object',
            properties: {
              anzsco: { $ref: '#/components/schemas/AnzscoItem' },
              total:  { type: 'integer', example: 128 },
              vet_courses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    vet_course_code: { type: 'string', example: 'BSB20112' },
                    course_name:    { type: 'string', example: 'Certificate II in Business' }
                  }
                }
              }
            }
          },
          DemandAllStatesResponse: {
            type: 'object',
            properties: {
              anzsco: { $ref: '#/components/schemas/AnzscoItem' },
              skill_level: { type: 'string', example: '1' },
              ratings: {
                type: 'object',
                additionalProperties: { type: 'string', example: 'Shortage' },
                example: { national: 'Shortage', NSW: 'Shortage', VIC: 'Shortage' }
              }
            }
          },
          DemandOneStateResponse: {
            type: 'object',
            properties: {
              anzsco: { $ref: '#/components/schemas/AnzscoItem' },
              skill_level: { type: 'string', example: '1' },
              national_rating: { type: 'string', example: 'Shortage' },
              state:       { type: 'string', example: 'Victoria' },
              state_code:  { type: 'string', example: 'VIC' },
              state_rating:{ type: 'string', example: 'Shortage' }
            }
          }
        }
      }
    },
    apis: [
      './index.js',
      './anzsco.training.router.js',
      './anzsco.demand.router.js',
    ],
  });
}

// 一个非常轻量的翻译字典（可按需扩展）
const DICT = {
  // 顶部
  'SkillBridge API': 'SkillBridge 接口文档',
  'ANZSCO search, ability mapping, training courses, and shortage ratings.':
    'ANZSCO 搜索、能力映射、培训课程与短缺评级接口。',
  // 标签
  'ANZSCO': 'ANZSCO 接口',
  'Meta': '元信息',
  // 常见 summary（按你路由注释写的英文来配）
  'Health check': '健康检查',
  'Search ANZSCO by first-digit (major group) and keyword': '按首位行业与关键词搜索 ANZSCO',
  'Get ability (knowledge/skill/tech) mapped from an ANZSCO 6-digit code':
    '基于 ANZSCO 6 位代码获取能力项（知识/技能/技术）',
  'Training advice (VET courses) by ANZSCO code': '按 ANZSCO 代码获取培训建议（VET 课程）',
  'Shortage ratings (national & states) by ANZSCO code': '按 ANZSCO 代码获取短缺评级（全国与各州）',
};

// 简单替换工具
function zhifyText(s) {
  if (!s || typeof s !== 'string') return s;
  return DICT[s] || s; // 查不到就原文
}

// 生成中文规范：克隆英文 spec，然后覆盖 title/description/summary/tag
function buildZhSpecFrom(baseSpec) {
  const spec = JSON.parse(JSON.stringify(baseSpec));

  // 头部
  spec.info.title = spec.info['x-title-zh'] || spec.info.title;
  spec.info.description = spec.info['x-description-zh'] || spec.info.description;

  // tags
  if (Array.isArray(spec.tags)) {
    spec.tags = spec.tags.map(t => ({
      ...t,
      name: t['x-name-zh'] || t.name,
      description: t['x-description-zh'] || t.description
    }));
  }

  // paths + operations + parameters + responses
  for (const path of Object.values(spec.paths || {})) {
    for (const op of Object.values(path)) {
      if (!op || typeof op !== 'object') continue;

      op.summary = op['x-summary-zh'] || op.summary;
      op.description = op['x-description-zh'] || op.description;
      if (Array.isArray(op.tags)) {
        op.tags = op.tags.map(tag => (op['x-tags-zh'] && op['x-tags-zh'][tag]) ? op['x-tags-zh'][tag] : tag);
      }

      if (Array.isArray(op.parameters)) {
        op.parameters = op.parameters.map(p => ({
          ...p,
          name: p['x-name-zh'] || p.name,
          description: p['x-description-zh'] || p.description
        }));
      }

      if (op.responses) {
        for (const r of Object.values(op.responses)) {
          if (r && typeof r === 'object') {
            r.description = r['x-description-zh'] || r.description;
          }
        }
      }

      // requestBody（如果你用到）
      if (op.requestBody && op.requestBody.description) {
        op.requestBody.description = op.requestBody['x-description-zh'] || op.requestBody.description;
      }
    }
  }

  // 组件 schemas（可选：如果你想给字段中文名/说明）
  if (spec.components && spec.components.schemas) {
    for (const sch of Object.values(spec.components.schemas)) {
      if (sch && typeof sch === 'object') {
        if (sch.title) sch.title = sch['x-title-zh'] || sch.title;
        if (sch.description) sch.description = sch['x-description-zh'] || sch.description;
        if (sch.properties) {
          for (const prop of Object.values(sch.properties)) {
            if (prop && typeof prop === 'object' && prop.description) {
              prop.description = prop['x-description-zh'] || prop.description;
            }
          }
        }
      }
    }
  }

  return spec;
}


const base = buildBaseSpec();
export const swaggerSpecEn = base;
export const swaggerSpecZh = buildZhSpecFrom(base);
