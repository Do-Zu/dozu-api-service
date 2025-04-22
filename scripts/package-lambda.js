const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create a temporary directory for packaging
const tempDir = path.join(__dirname, '../dist-lambda');
const lambdaDir = path.join(tempDir, 'libs', 'aws', 'lambda', 'generate');
const packageJsonPath = path.join(tempDir, 'package.json');

// Ensure the lambda directory exists
if (!fs.existsSync(lambdaDir)) {
  console.error('Lambda directory not found. Make sure to run "npm run lambda:build" first.');
  process.exit(1);
}

// Create a minimal package.json for the lambda
const packageJson = {
  name: 'gen-content-lambda',
  version: '1.0.0',
  description: 'Lambda function for generating content',
  main: 'libs/aws/lambda/generate/handler.js',
  dependencies: {
    openai: require('../package.json').dependencies['openai'],
    ioredis: require('../package.json').dependencies['ioredis'],
    '@aws-sdk/client-lambda': require('../package.json').dependencies['@aws-sdk/client-lambda'],
    uuid: require('../package.json').dependencies['uuid'],
  },
};

// Write the package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install --production', { cwd: tempDir, stdio: 'inherit' });

// Create the Lambda handler with proper exports
const handlerPath = path.join(lambdaDir, 'handler.js');
const handlerContent = fs.readFileSync(handlerPath, 'utf8');

// Update the handler to use the correct AWS Lambda exports
const updatedHandlerContent = handlerContent.replace(
  'exports.handler =',
  'module.exports.handler ='
);
fs.writeFileSync(handlerPath, updatedHandlerContent);

// Create zip file
console.log('Creating ZIP file...');
const zipCommand =
  process.platform === 'win32'
    ? 'powershell Compress-Archive -Path ".\\*" -DestinationPath ".\\function.zip" -Force'
    : 'zip -r function.zip .';

try {
  execSync(zipCommand, { cwd: tempDir, stdio: 'inherit' });
  console.log('Lambda package created at dist-lambda/function.zip');
} catch (error) {
  console.error('Error creating ZIP file:', error);
}
