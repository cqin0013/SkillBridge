// swagger.js
import swaggerJSDoc from 'swagger-jsdoc';

const servers = [
  { url: 'http://localhost:8080', description: 'Local' },
  { url: 'https://progressive-alysia-skillbridge-437200d9.koyeb.app', description: 'Koyeb' },
];

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
        // —— 通用 Schema（精简版）——
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
