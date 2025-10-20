// swagger.i18n.js
import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import path from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================
const isProd = process.env.NODE_ENV === 'production';
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  'https://progressive-alysia-skillbridge-437200d9.koyeb.app';

//Use the root path, without /api
const servers = [{ url: '/', description: 'same-origin' }];

if (!isProd) {
  servers.push({ url: 'http://localhost:8080', description: 'Local' });
}

if (PUBLIC_BASE_URL) {
  servers.push({ url: `${PUBLIC_BASE_URL}`, description: 'Public' });
}

// ============================================

// Generate "English base spec" (using existing English JSDoc comments)
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
                  name: { type: 'string', example: 'Professionals' },
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
                  major_name: { type: 'string', example: 'Professionals' }
                }
              },
              occupations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    occupation_code: { type: 'string', example: '15-2031.00' },
                    occupation_title: { type: 'string', example: 'Operations Research Analysts' }
                  }
                }
              },
              knowledge_titles: {
                type: 'array',
                items: {
                  type: 'object', properties: {
                    code: { type: 'string', example: '2.C.1.a' },
                    title: { type: 'string', example: 'Administration and Management' }
                  }
                }
              },
              skill_titles: {
                type: 'array',
                items: {
                  type: 'object', properties: {
                    code: { type: 'string', example: '2.B.1.e' },
                    title: { type: 'string', example: 'Instructing' }
                  }
                }
              },
              tech_titles: {
                type: 'array',
                items: {
                  type: 'object', properties: {
                    code: { type: 'string', example: '43233208' },
                    title: { type: 'string', example: 'Version control software' }
                  }
                }
              }
            }
          },
          TrainingAdviceResponse: {
            type: 'object',
            properties: {
              anzsco: { $ref: '#/components/schemas/AnzscoItem' },
              total: { type: 'integer', example: 128 },
              vet_courses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    vet_course_code: { type: 'string', example: 'BSB20112' },
                    course_name: { type: 'string', example: 'Certificate II in Business' }
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
              state: { type: 'string', example: 'Victoria' },
              state_code: { type: 'string', example: 'VIC' },
              state_rating: { type: 'string', example: 'Shortage' }
            }
          },

          GlossaryItem: {
            type: 'object',
            properties: {
              term: {
                type: 'string',
                description: 'Term or full form.',
                'x-description-zh': '术语或全称。'
              },
              description: {
                type: 'string',
                description: 'Definition or explanation.',
                'x-description-zh': '定义或解释。'
              },
              acronym: {
                type: 'string',
                nullable: true,
                description: 'Acronym (if any).',
                'x-description-zh': '缩写（若有）。'
              },
              also_called: {
                type: 'array',
                items: { type: 'string' },
                description: 'Alternative names.',
                'x-description-zh': '其他叫法。'
              },
              see_also: {
                type: 'array',
                items: { type: 'string' },
                description: 'Related terms.',
                'x-description-zh': '相关术语。'
              }
            }
          },

          ErrorResponse: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Error message.',
                'x-description-zh': '错误信息。'
              }
            }
          }

        }
      }
    },
    apis: [
      // Use absolute paths to avoid missing files when cwd is different
      path.join(__dirname, 'index.js'),
      path.join(__dirname, '*.router.js'),
      // Include the routes directory (including map.data.fromtemp.js)
      path.join(__dirname, 'routes/*.js'),
      path.join(__dirname, 'routes/**/*.js'),
    ],
  });
}

// 
const DICT = {

  'SkillBridge API': 'SkillBridge 接口文档',
  'ANZSCO search, ability mapping, training courses, and shortage ratings.':
    'ANZSCO 搜索、能力映射、培训课程与短缺评级接口。',

  'ANZSCO': 'ANZSCO 接口',
  'Meta': '元信息',

  'Health check': '健康检查',
  'Search ANZSCO by first-digit (major group) and keyword': '按首位行业与关键词搜索 ANZSCO',
  'Get ability (knowledge/skill/tech) mapped from an ANZSCO 6-digit code':
    '基于 ANZSCO 6 位代码获取能力项（知识/技能/技术）',
  'Training advice (VET courses) by ANZSCO code': '按 ANZSCO 代码获取培训建议（VET 课程）',
  'Shortage ratings (national & states) by ANZSCO code': '按 ANZSCO 代码获取短缺评级（全国与各州）',
};

// Simple replacement tool
function zhifyText(s) {
  if (!s || typeof s !== 'string') return s;
  return DICT[s] || s; // If you can't find the original text
}

// Generate Chinese specification: clone the English spec and then overwrite title/description/summary/tag
function buildZhSpecFrom(baseSpec) {
  const spec = JSON.parse(JSON.stringify(baseSpec));


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

      // requestBody
      if (op.requestBody && op.requestBody.description) {
        op.requestBody.description = op.requestBody['x-description-zh'] || op.requestBody.description;
      }
    }
  }

  //schemas
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
