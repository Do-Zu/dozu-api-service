# File Upload Service Documentation

This documentation explains how to use the comprehensive file upload service implemented in the Dozu API.

## Overview

The File Upload Service provides a complete solution for handling file uploads with the following features:

- Single and multiple file uploads
- File validation (size, type, extension)
- File management (move, delete, cleanup)
- File content retrieval
- Upload statistics
- Flexible configuration

## Service Architecture

### Core Components

1. **UploadFileService** - Main service class handling file operations
2. **UploadFileController** - HTTP request handlers
3. **Upload Routes** - API endpoints
4. **Validation Middleware** - Request validation
5. **Type Definitions** - TypeScript interfaces

## API Endpoints

### File Upload

#### Upload Single File

```
POST /api/upload/single
```

**Form Data:**

- `file`: File to upload (required)

**Response:**

```json
{
  "status": "created",
  "message": "File uploaded successfully",
  "data": {
    "id": "uuid-string",
    "originalName": "document.pdf",
    "fileName": "1234567890-document.pdf",
    "filePath": "/uploads/1234567890-document.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "uploadedAt": "2025-06-18T10:30:00Z",
    "status": "completed"
  }
}
```

#### Upload Multiple Files

```
POST /api/upload/multiple
```

**Form Data:**

- `files`: Multiple files to upload (required)

**Response:**

```json
{
  "status": "created",
  "message": "3 files uploaded successfully",
  "data": {
    "successful": [...],
    "failed": [...],
    "totalFiles": 3,
    "successCount": 3,
    "failureCount": 0
  }
}
```

#### Generate Presigned URL

```
POST /api/upload/presigned-url
```

**Body:**

```json
{
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "fileType": "pdf",
  "contentType": "application/pdf"
}
```

**Response:**

```json
{
  "status": "created",
  "message": "Presigned URL generated successfully",
  "data": {
    "uploadUrl": "http://localhost:3000/api/upload/presigned/uuid-string",
    "fileId": "uuid-string",
    "expiresIn": 3600,
    "conditions": {
      "maxFileSize": 52428800,
      "allowedContentTypes": ["application/pdf", "..."]
    }
  }
}
```

#### Upload File with Presigned URL

```
POST /api/upload/presigned/:fileId
```

**Form Data:**

- `file`: File to upload (must match presigned URL conditions)

**Response:**

```json
{
  "status": "created",
  "message": "File uploaded successfully",
  "data": {
    "id": "uuid-string",
    "originalName": "document.pdf",
    "fileName": "1234567890-document.pdf",
    "filePath": "/uploads/1234567890-document.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "uploadedAt": "2025-06-18T10:30:00Z",
    "status": "completed"
  }
}
```

### File Management

#### Get All Files

```
GET /api/upload/
```

#### Get File Information

```
GET /api/upload/:fileId
```

#### Download File

```
GET /api/upload/:fileId/download
```

#### Get File as Text

```
GET /api/upload/:fileId/text?encoding=utf-8
```

#### Delete File

```
DELETE /api/upload/:fileId
```

#### Delete Multiple Files

```
DELETE /api/upload/batch
```

**Body:**

```json
{
  "fileIds": ["file-id-1", "file-id-2"]
}
```

#### Move File

```
PUT /api/upload/:fileId/move
```

**Body:**

```json
{
  "newDirectory": "documents/2025"
}
```

#### Clean Up Old Files

```
POST /api/upload/cleanup
```

**Body:**

```json
{
  "maxAgeInHours": 48
}
```

#### Get Upload Statistics

```
GET /api/upload/stats
```

## Usage Examples

### Frontend Usage (JavaScript/TypeScript)

#### Single File Upload

```javascript
const uploadSingleFile = async file => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload/single', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log('File uploaded:', result.data);
    return result.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

#### Multiple Files Upload

```javascript
const uploadMultipleFiles = async files => {
  const formData = new FormData();

  files.forEach(file => {
    formData.append('files', file);
  });

  try {
    const response = await fetch('/api/upload/multiple', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log('Files uploaded:', result.data);
    return result.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

#### Download File

```javascript
const downloadFile = async (fileId, fileName) => {
  try {
    const response = await fetch(`/api/upload/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download failed:', error);
  }
};
```

### Backend Usage (Node.js/Express)

#### Using the Service Directly

```typescript
import { uploadFileService } from '@/services/uploads/files/upload.file.service';

// Process a file upload
const processUpload = async (file: Express.Multer.File) => {
  try {
    const result = await uploadFileService.processSingleFile(file);
    console.log('File processed:', result);
    return result;
  } catch (error) {
    console.error('Processing failed:', error);
    throw error;
  }
};

// Get file content
const getFileContent = async (fileId: string) => {
  try {
    const content = await uploadFileService.getFileContent(fileId);
    return content;
  } catch (error) {
    console.error('Failed to get content:', error);
    throw error;
  }
};
```

#### Custom Middleware Configuration

```typescript
import { uploadFileService } from '@/services/uploads/files/upload.file.service';

// Custom configuration for specific use case
const customConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png'],
  allowedExtensions: ['.jpg', '.jpeg', '.png'],
};

// Get custom upload middleware
const imageUploadMiddleware = uploadFileService.getSingleFileUploadMiddleware(
  'image',
  customConfig
);

// Use in route
router.post('/upload-image', imageUploadMiddleware, async (req, res) => {
  // Handle image upload
});
```

## Configuration

### Default Configuration

```typescript
{
  maxFileSize: 52428800, // 50MB
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    // Text files
    'text/plain',
    'text/csv',
    'application/json',
    // Archives
    'application/zip'
  ],
  uploadDir: 'uploads/',
  allowedExtensions: [
    '.pdf', '.doc', '.docx',
    '.jpg', '.jpeg', '.png', '.gif',
    '.txt', '.csv', '.json',
    '.zip'
  ]
}
```

### Custom Configuration

```typescript
import { UploadFileService } from '@/services/uploads/files/upload.file.service';

const customUploadService = new UploadFileService({
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: ['application/pdf'],
  uploadDir: 'custom-uploads/',
  allowedExtensions: ['.pdf'],
});
```

## Error Handling

The service provides comprehensive error handling:

### Common Error Responses

#### File Too Large

```json
{
  "error": "File too large",
  "message": "File size 52.5MB exceeds maximum allowed size of 50.0MB"
}
```

#### Invalid File Type

```json
{
  "error": "Invalid file type",
  "message": "File type application/exe is not allowed"
}
```

#### File Not Found

```json
{
  "error": "File not found",
  "message": "File with ID 'invalid-id' not found"
}
```

## Security Features

1. **File Type Validation** - Only allowed MIME types and extensions
2. **Size Limits** - Configurable maximum file sizes
3. **Authentication** - All endpoints require authentication
4. **Path Validation** - Prevents directory traversal attacks
5. **Input Sanitization** - All inputs are validated

## Performance Considerations

1. **Memory Usage** - Files are stored on disk, not in memory
2. **Concurrent Uploads** - Service handles multiple simultaneous uploads
3. **Cleanup** - Automatic cleanup of old files
4. **Streaming** - Large file downloads use streaming

## Monitoring and Statistics

The service provides detailed statistics:

- Total files uploaded
- Total storage used
- File type distribution
- Upload trends
- Largest files
- Most recent uploads

## Best Practices

1. **Cleanup Strategy** - Regularly clean up old files
2. **Storage Management** - Monitor disk usage
3. **Error Handling** - Always handle upload errors gracefully
4. **Validation** - Validate files on both client and server side
5. **Progress Tracking** - Show upload progress to users
6. **File Organization** - Use meaningful directory structures

## Troubleshooting

### Common Issues

1. **Upload Fails** - Check file size and type restrictions
2. **File Not Found** - Verify file ID and check if file was cleaned up
3. **Permission Errors** - Ensure upload directory has write permissions
4. **Memory Issues** - Use streaming for large files

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
import logger from '@/utils/logger';
logger.level = 'debug';
```

## Integration with Other Services

The upload service can be integrated with:

- **File Processing Services** - Process uploaded files (OCR, image manipulation)
- **Cloud Storage** - Move files to cloud storage after upload
- **Database** - Store file metadata in database
- **Notification Services** - Notify users of upload completion
- **Content Management** - Integrate with CMS systems
