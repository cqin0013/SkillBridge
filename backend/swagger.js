// swagger.js
import swaggerJSDoc from 'swagger-jsdoc';

const isProd = process.env.NODE_ENV === 'production';


const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  'https://progressive-alysia-skillbridge-437200d9.koyeb.app';

// -- Prefer using "same-domain relative paths" to avoid localhost appearing online --
// This way, when the /docs page is deployed on the same domain as /api, both local and Koyeb can correctly request it.
const servers = [
  { url: '/api', description: 'same-origin' },
];


if (!isProd) {
  servers.push({ url: 'http://localhost:8080/api', description: 'Local' });
}

// Online optional: Explicitly display the public network full address (does not affect relative path work)
if (PUBLIC_BASE_URL) {
  servers.push({ url: `${PUBLIC_BASE_URL}/api`, description: 'Public' });
}

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SkillBridge API',
      version: '1.0.0',
      description: 'ANZSCO 搜索、技能映射、培训课程、地区需求（短缺评级）等接口',
    },
    servers,
    components: {
      schemas: {
        // —— ——
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
    },
  },
    apis: [
      './index.js',
      './anzsco.training.router.js',
      './anzsco.demand.router.js',
    ],
  });

