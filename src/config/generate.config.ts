export const generateConfig = {
  uploadDir: process.env.UPLOAD_DIR || 'uploads/',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
  allowedMimeTypes: [
    'application/json',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    // Add more allowed types as needed
  ],
  processingTimeoutMs: 300000, // 5 minutes timeout for processing
};
