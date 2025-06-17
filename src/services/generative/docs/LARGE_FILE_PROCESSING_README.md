# Large File Processing for Mindmap Generation

## Overview

This implementation provides a robust system for processing large files (1000-3000 pages) and generating mindmaps using OpenAI's API. The system includes intelligent chunking, batch processing, progress tracking, and memory-efficient file handling.

## Key Features

### 1. Intelligent File Processing Strategies

- **Small Files (<10MB)**: Standard processing with full file content
- **Medium Files (10-50MB)**: Chunked processing with summaries
- **Large Files (>50MB)**: Hierarchical processing with progress tracking

### 2. Large File Capabilities

- **Maximum File Size**: 500MB (configurable)
- **Chunk Processing**: 50KB-100KB chunks with smart word boundary detection
- **Batch Processing**: 3 chunks processed concurrently to respect API rate limits
- **Progress Tracking**: Real-time progress updates with ETA
- **Memory Efficient**: Streaming file readers to handle large files without memory issues

### 3. File Format Support

- **Text Files**: .txt, .md, .log
- **JSON Files**: Structured data formatted for mindmap generation
- **PDF Files**: Basic text extraction (can be enhanced with pdf-parse library)
- **Fallback**: Attempts to read unsupported formats as text

### 4. API Endpoints

#### Upload and Generate Mindmap

```
POST /api/generate/v1/mindmap/upload
Content-Type: multipart/form-data

Body:
- file: The file to process
- customPrompt: Optional custom prompt
- userId: User identifier
```

#### Generate from Text

```
POST /api/generate/v1/mindmap/text
Content-Type: application/json

Body:
{
  "content": "Text content to process",
  "customPrompt": "Optional custom prompt",
  "userId": "user_id"
}
```

#### Check Processing Status

```
GET /api/generate/v1/status/{jobId}
```

#### Check Processing Progress (Large Files)

```
GET /api/generate/v1/progress/{jobId}
```

## Technical Implementation

### 1. File Processing Pipeline

```typescript
// File size detection and strategy selection
if (fileSize > 50MB) {
  // Hierarchical processing with progress tracking
  processLargeFileHierarchically()
} else if (fileSize > 10MB) {
  // Chunked processing with summaries
  processFileInChunks()
} else {
  // Standard processing
  processFileStandard()
}
```

### 2. Chunking Strategy

```typescript
// Memory-efficient chunk reading
const chunks = await readFileInChunks(filePath, chunkSize);

// Smart word boundary detection
if (lastSpaceIndex > 0 && bytesRead === chunkSize) {
  chunks.push(chunk.substring(0, lastSpaceIndex));
  position += lastSpaceIndex;
}
```

### 3. Batch Processing with Rate Limiting

```typescript
// Process chunks in batches
for (let i = 0; i < chunks.length; i += batchSize) {
  const batch = chunks.slice(i, i + batchSize);

  // Staggered delays to respect API limits
  const batchPromises = batch.map(async (chunk, batchIndex) => {
    await new Promise(resolve => setTimeout(resolve, batchIndex * 800));
    return processChunk(chunk);
  });

  const results = await Promise.allSettled(batchPromises);

  // Delay between batches
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### 4. Progress Tracking

```typescript
interface ProcessingProgress {
  currentStep: string;
  chunksProcessed: number;
  totalChunks: number;
  percentComplete: number;
  estimatedTimeRemaining?: number;
  startTime: number;
  errors: string[];
}
```

### 5. Hierarchical Mindmap Structure

The system creates a hierarchical mindmap structure:

- **Root Node**: Main document overview
- **Section Nodes**: Connected to root, represent major sections
- **Subtopic Nodes**: Connected to sections, represent detailed topics
- **Cross-References**: Edges between related concepts

## Configuration Options

```typescript
interface LargeFileProcessingConfig {
  maxChunkSize: 100000; // 100KB chunks
  batchSize: 3; // 3 concurrent chunks
  batchDelay: 2000; // 2 second delay between batches
  maxFileSizeMB: 500; // 500MB maximum file size
  enableProgress: true; // Enable progress tracking
}
```

## Usage Examples

### 1. Upload Large PDF (Academic Paper)

```bash
curl -X POST http://localhost:3000/api/generate/v1/mindmap/upload \
  -F "file=@large_academic_paper.pdf" \
  -F "customPrompt=Focus on methodology and results" \
  -F "userId=user123"
```

### 2. Process Large Text Document

```bash
curl -X POST http://localhost:3000/api/generate/v1/mindmap/text \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Very long text content...",
    "customPrompt": "Create a comprehensive overview",
    "userId": "user123"
  }'
```

### 3. Check Progress

```bash
curl -X GET http://localhost:3000/api/generate/v1/progress/job_12345
```

## Performance Considerations

### 1. Memory Usage

- Streaming file readers prevent memory overflow
- Chunk size optimization based on file size
- Automatic cleanup of temporary files

### 2. API Rate Limiting

- Configurable batch sizes and delays
- Exponential backoff on failures
- Staggered request timing

### 3. Error Handling

- Graceful degradation on chunk failures
- Comprehensive error logging
- Partial result recovery

## Scaling for Very Large Files (1000-3000 pages)

### 1. Optimizations for Large Documents

- **Adaptive Chunk Sizing**: Smaller chunks for very large files
- **Conservative Batch Processing**: Reduced concurrency for stability
- **Enhanced Progress Tracking**: Detailed progress with ETA
- **Background Processing**: Async processing for files >50MB

### 2. Memory Management

- **Streaming Readers**: Read files in chunks without loading entirely
- **Garbage Collection**: Automatic cleanup of processed chunks
- **Resource Monitoring**: Track memory usage during processing

### 3. Quality Assurance

- **Content Validation**: Ensure chunks contain meaningful content
- **Mindmap Validation**: Verify generated JSON structure
- **Error Recovery**: Retry failed chunks with different strategies

## Future Enhancements

1. **Enhanced PDF Support**: Integration with pdf-parse for better text extraction
2. **Document Format Support**: Add DOCX, PPT support
3. **Distributed Processing**: Scale across multiple servers
4. **Caching**: Cache intermediate results for faster re-processing
5. **User Preferences**: Customizable mindmap styles and layouts
6. **Real-time Updates**: WebSocket support for live progress updates

## Error Handling

The system includes comprehensive error handling:

- **File Read Errors**: Fallback to different encoding formats
- **API Errors**: Retry logic with exponential backoff
- **Memory Errors**: Automatic chunk size reduction
- **Timeout Errors**: Configurable timeout limits
- **Validation Errors**: Detailed error messages for debugging

This implementation provides a robust foundation for processing very large documents and generating meaningful mindmaps while maintaining system stability and user experience.
