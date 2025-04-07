import path from 'path';
import moduleAlias from 'module-alias';

// Use different alias paths for development and production
if (process.env.NODE_ENV === 'production') {
  // For production, use the dist folder
  moduleAlias.addAliases({
    '@': path.join(__dirname, '../dist'),
  });
} else {
  // For development, use the src folder
  moduleAlias.addAliases({
    '@': path.join(__dirname),
  });
}
