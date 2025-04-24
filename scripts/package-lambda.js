const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths
const distDir = path.join(__dirname, '../dist-lambda');
const finalZipPath = path.join(distDir, 'function.zip');

// Make sure the bundle exists
if (!fs.existsSync(path.join(distDir, 'index.js'))) {
  console.error('Lambda bundle not found. Run npm run lambda:build first.');
  process.exit(1);
}

// Create zip file
console.log('Creating ZIP file...');
if (fs.existsSync(finalZipPath)) {
  fs.unlinkSync(finalZipPath);
}

const zipCommand =
  process.platform === 'win32'
    ? `powershell Compress-Archive -Path "${distDir}\\*" -DestinationPath "${finalZipPath}" -Force`
    : `cd "${distDir}" && zip -r function.zip .`;

try {
  execSync(zipCommand, { stdio: 'inherit' });
  console.log(`Lambda package created at ${finalZipPath}`);
} catch (error) {
  console.error('Error creating ZIP file:', error);
  process.exit(1);
}
