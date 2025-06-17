# File Upload and Mindmap Generation Service

This implementation provides a complete service for uploading files and generating mindmaps using OpenAI's API.

## Features

1. **File Upload Support**: Upload text files, PDFs, and document files
2. **Text Input Support**: Generate mindmaps directly from text content
3. **OpenAI Integration**: Uses OpenAI's API to generate mindmap structures
4. **Structured Response**: Returns mindmap data in the format defined by the mindmap model

## API Endpoints

### 1. Upload File and Generate Mindmap

```
POST /api/generate/v1/mindmap/upload
Content-Type: multipart/form-data

Body:
- file: The file to upload (required)
- customPrompt: Custom prompt for generation (optional)
- userId: User ID (optional)
```

### 2. Generate Mindmap from Text

```
POST /api/generate/v1/mindmap/text
Content-Type: application/json

Body:
{
  "content": "Your text content here",
  "customPrompt": "Custom prompt (optional)",
  "userId": "user-id (optional)"
}
```

### 3. Get Processing Status

```
GET /api/generate/v1/status/:jobId
```

## Response Format

Both endpoints return a mindmap response in this format:

```json
{
  "status": "success",
  "message": "Mindmap generated successfully",
  "data": {
    "jobId": "mindmap_1234567890",
    "status": "completed",
    "message": "Mindmap generated successfully",
    "mindmapData": {
      "nodes": [
        {
          "id": "node_1",
          "position": { "x": 100, "y": 100 },
          "data": {
            "label": "Main Topic",
            "pageStartIndex": 1,
            "pageEndIndex": 5,
            "pageCount": 5
          }
        }
      ],
      "edges": [
        {
          "id": "edge_1",
          "source": "node_1",
          "target": "node_2"
        }
      ]
    },
    "timestamp": "2025-06-16T10:30:00.000Z"
  }
}
```

## How It Works

1. **File Processing**: Files are uploaded using multer and stored temporarily
2. **Content Extraction**: Text content is extracted from the uploaded file
3. **OpenAI API Call**: A specialized prompt is sent to OpenAI to generate mindmap structure
4. **Response Validation**: The AI response is validated against the mindmap data structure
5. **Cleanup**: Temporary files are removed after processing

## File Support

Currently supports:

- Plain text files (.txt)
- Markdown files (.md)
- PDF files (.pdf)
- Word documents (.doc, .docx)

## Configuration

The service uses the existing OpenAI configuration from the base LLM provider:

- API key from environment variables
- Base URL configuration
- Rate limiting and error handling

## Error Handling

- File upload validation
- Content extraction errors
- OpenAI API errors
- Response validation errors
- Automatic file cleanup on errors
