import swaggerJsdoc from 'swagger-jsdoc'

export const getApiDocs = async () => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'DreamsPOS API Documentation',
        version: '1.0.0',
        description: 'API documentation for DreamsPOS Inventory Management System',
        contact: {
          name: 'API Support',
          email: 'support@dreamspos.com',
        },
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'production' 
            ? 'https://your-domain.com' 
            : 'http://localhost:3000',
          description: process.env.NODE_ENV === 'production' 
            ? 'Production server' 
            : 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ['./src/app/api/**/*.ts', './src/app/api/**/*.js'],
  }
  
  const specs = swaggerJsdoc(options)
  return specs
}

export default getApiDocs
