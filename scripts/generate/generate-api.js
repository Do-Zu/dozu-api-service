const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { isValidNameService, toKebabCase, toPascalCase, toCamelCase } = require('./utils/helper');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Main paths
const OPENAPI_PATH = path.join(__dirname, '../../src/openapi/generate.openai.json');
const SRC_PATH = path.join(__dirname, '../../src');

// Templates
const controllerTemplate = serviceName => `import { Request, Response } from 'express';
import { ${toCamelCase(serviceName)}Service } from '@/services/${toKebabCase(serviceName)}/${toCamelCase(serviceName)}.service';
import { SuccessResponse } from '@/core/success';

/**
 * Controller class for ${serviceName} functionality
 */
class ${toPascalCase(serviceName)}Controller {


  // ${toPascalCase(serviceName)}DemoController  async (req: Request, res: Response) => {
  // const data = null;
  // SuccessResponse.ok(res, data);
};

export const ${toCamelCase(serviceName)}Controller = new ${toPascalCase(serviceName)}Controller();

`;

const serviceTemplate = serviceName => `import logger from '@/utils/logger';
import { ${toCamelCase(serviceName)}Repo } from '@/repositories/${toKebabCase(serviceName)}/${toCamelCase(serviceName)}.repo';
import { NotFoundError } from '@/core/error';

/**
 * Service class for ${serviceName} functionality
 */
class ${toPascalCase(serviceName)}Service {
 

}

export const ${toCamelCase(serviceName)}Service = new ${toPascalCase(serviceName)}Service();
`;

const repositoryTemplate = serviceName => `import logger from '@/utils/logger';
import { getDbInstance } from '@/libs/drizzleClient.lib';

/**
 * Repository for ${serviceName} data access operations
 */
class ${toPascalCase(serviceName)}Repository {
  
}

export const ${toCamelCase(serviceName)}Repo = new ${toPascalCase(serviceName)}Repository();
`;

const routesTemplate = serviceName => `import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Define routes


// Register the router
registerRoute('/${toKebabCase(serviceName)}', router, {
  description: '${serviceName} API endpoints',
  version: 'v1',
  isEnabled: true,
});
  
export default router;
`;

// Function to generate API files
const generateSourceCodeStructure = async serviceName => {
  try {
    if (!isValidNameService(serviceName)) {
      console.log('Invalid service name. Only letters and spaces are allowed.');
      return;
    }
    // Create directories if they don't exist
    const directories = [
      path.join(SRC_PATH, 'controllers', toKebabCase(serviceName.toLowerCase())),
      path.join(SRC_PATH, 'services', toKebabCase(serviceName.toLowerCase())),
      path.join(SRC_PATH, `repositories`, toKebabCase(serviceName.toLowerCase())),
      path.join(SRC_PATH, 'routes', toKebabCase(serviceName.toLowerCase())),
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Generate files with templates
    const files = [
      {
        path: path.join(
          SRC_PATH,
          `controllers/${toKebabCase(serviceName.toLowerCase())}/${toCamelCase(serviceName)}.controller.ts`
        ),
        content: controllerTemplate(serviceName),
      },
      {
        path: path.join(
          SRC_PATH,
          `services/${toKebabCase(serviceName.toLowerCase())}/${toCamelCase(serviceName)}.service.ts`
        ),
        content: serviceTemplate(serviceName),
      },
      {
        path: path.join(
          SRC_PATH,
          `repositories/${toKebabCase(serviceName.toLowerCase())}/${toCamelCase(serviceName)}.repo.ts`
        ),
        content: repositoryTemplate(serviceName),
      },
      {
        path: path.join(
          SRC_PATH,
          `routes/${toKebabCase(serviceName.toLowerCase())}/${toCamelCase(serviceName)}.routes.ts`
        ),
        content: routesTemplate(serviceName),
      },
    ];

    // Write files
    files.forEach(file => {
      fs.writeFileSync(file.path, file.content);
      console.log(`✓ Created ${file.path}`);
    });

    console.log(`\nSource code structure for ${serviceName} successfully generated!`);
    console.log(
      `\nImportant: Remember to import '${serviceName.toLowerCase()}/${serviceName.toLowerCase()}.routes' in src/routes/api.routes.ts`
    );
  } catch (error) {
    console.error('Error generating source code structure:', error);
  }
};

// Main function
async function main() {
  console.log('\n=== API Generator ===\n');
  console.log('\n=== no numbers, no special characters, can be written separately  ===\n');

  rl.question('\nEnter the service name (e.g., user, product): ', async serviceName => {
    const formattedServiceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    await generateSourceCodeStructure(formattedServiceName);
    rl.close();
  });
}

// Run the script
main();
