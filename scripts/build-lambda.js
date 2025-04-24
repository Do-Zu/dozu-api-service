const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');

async function bundleLambda() {
  try {
    console.log('Building Lambda function with esbuild...');

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '../dist-lambda');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const srcDir = path.resolve(__dirname, '../src');

    // Bundle using esbuild
    const result = await build({
      entryPoints: [path.join(__dirname, '../src/libs/aws/lambda/generate/index.ts')],
      tsconfig: path.join(__dirname, '../tsconfig.esbuild.json'),
      bundle: true,
      minify: true,
      platform: 'node',
      target: 'node18',
      outfile: path.join(outputDir, 'index.js'),
      external: ['aws-sdk', '@aws-sdk/*'], // AWS Lambda includes these packages
      sourcemap: false,
      metafile: true,
      banner: {
        js: '// Lambda function for content generation - Built with esbuild',
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      resolveExtensions: ['.ts', '.js', '.json'],
      alias: {
        '@': srcDir,
      },

      //NOTE: update plugin!
      // plugins: [
      //   {
      //     name: 'alias-plugin',
      //     setup(build) {
      //       // Log the filter pattern
      //       console.log('Setting up alias resolution for @/ paths');

      //       build.onResolve({ filter: /^@\// }, args => {
      //         const resolvedPath = path.join(srcDir, args.path.slice(2));
      //         console.log(`Resolving ${args.path} to ${resolvedPath}`);
      //         return {
      //           path: resolvedPath,
      //           external: false,
      //         };
      //       });
      //     },
      //   },
      // ],
    });

    // Log bundle info
    console.log('Lambda function built successfully!');

    // Optional: Log bundle size info
    const outfile = path.join(outputDir, 'index.js');
    const stats = fs.statSync(outfile);
    console.log(`Bundle size: ${(stats.size / 1024).toFixed(2)} KB`);

    return result;
  } catch (error) {
    console.error('Error building Lambda function:', error);
    process.exit(1);
  }
}

bundleLambda();
