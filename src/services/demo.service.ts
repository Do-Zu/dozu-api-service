import { BadRequest, DatabaseError, NotFoundError } from '@/core/error';
import { handleRepositoryDemo } from '@/repositories/demo.repo';

export const handleServiceDemo = async (_param: any) => {
  if (!_param) {
    throw new BadRequest('param is required');
  }

  const data: any[] = await handleRepositoryDemo(_param);
  if (!data) {
    throw new DatabaseError('data not found');
  }

  // if (data.length === 0) {
  //   throw new NotFoundError('Not found');
  // }

  return {
    data,
    project: {
      name: 'DOZU API SERVICE',
      version: '1.0.0',
      description: 'Proper error handling, and standardized responses',
    },
    architecture: {
      pattern: 'Controller-Service-Repository',
      features: [
        'Type-safe Express application',
        'Modular route system',
        'Standardized error handling',
        'Environment-based configuration',
        'Custom response formatting',
        'Built-in security features',
        'Middleware pipeline architecture',
        'Logging system',
      ],
    },
    development: {
      setup: "Run 'npm install' followed by 'npm run dev' to start development server",
      commands: {
        dev: 'Start development server with hot-reload',
        build: 'Compile TypeScript to JavaScript',
        start: 'Start production server',
        lint: 'Run ESLint for code quality',
        typecheck: 'Run TypeScript type checking',
      },
    },
    apiGuide: {
      folderStructure: {
        controllers: 'Handle HTTP requests and responses',
        services: 'Contain business logic',
        repositories: 'Handle data access',
        routes: 'Define API endpoints',
        middleware: 'Process requests before they reach routes',
        core: 'Core functionality like error handling',
        config: 'Application configuration',
        utils: 'Utility functions',
      },
      routingGuide: 'Create routes in the routes/ directory with proper structure',
      errorHandling: 'Use custom error classes from core/error.ts',
      responseFormat: 'Use the success handler for consistent responses',
      securityBestPractices: [
        'All routes are protected by Helmet',
        'Apply rate limiting for production',
        'Use proper input validation',
        'Handle errors gracefully',
      ],
      exampleEndpoint: {
        path: '/api/demo',
        method: 'GET',
        controller: 'handleDemoController',
        service: 'handleServiceDemo',
        repository: 'handleRepositoryDemo',
      },
    },
    deploymentOptions: {
      vercel: 'Configure vercel.json for serverless deployment',
      docker: 'Use Dockerfile and docker-compose.yml for containerization',
      traditional: 'Deploy dist/ folder to a Node.js host',
    },
    documentation: {
      swagger: 'Available at /api-docs when enabled',
      readme: 'Check README.md for detailed documentation',
    },
  };
};
