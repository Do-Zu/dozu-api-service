# File Conversion Service Documentation

## Overview

This document describes the architecture and implementation of the file conversion service, which converts various document formats (DOC, DOCX, TXT) and URLs to PDF format. The implementation follows SOLID principles and industry-standard design patterns for scalability, testability, and maintainability.

## Problem Statement

The original implementation had several issues:

- **Tight coupling**: Business logic mixed with routing and HTTP handling
- **Hard-coded values**: Configuration scattered throughout the code
- **Difficult to test**: No dependency injection or interfaces
- **Not extensible**: Adding new file formats required modifying existing code
- **Violation of SRP**: Single functions handling multiple responsibilities

## Solution Architecture

The refactored solution implements a clean, layered architecture with clear separation of concerns:

### 1. **Strategy Pattern** (Open/Closed Principle)

Allows adding new file converters without modifying existing code.

- **`BaseFileConverter`**: Abstract base class implementing Template Method pattern

    - Provides common validation logic
    - Enforces converter contract through `IFileConverter` interface
    - Subclasses implement specific conversion logic

- **`LibreOfficeConverter`**: Converts DOC/DOCX/TXT files to PDF

    - Uses Gotenberg service (LibreOffice in Docker)
    - Handles form data upload and binary response
    - Supports `.doc`, `.docx`, `.txt` formats

- **`UrlToPdfConverter`**: Converts web pages to PDF

    - Uses Puppeteer for headless browser rendering
    - Handles browser lifecycle management
    - Configurable PDF output options

- **`ConverterFactory`**: Factory Pattern for converter instantiation
    - Determines appropriate converter based on file extension
    - Supports runtime converter registration
    - Provides list of supported formats

### 2. **Dependency Injection** (Dependency Inversion Principle)

All components depend on abstractions (interfaces), not concrete implementations.

**Interfaces** (`convert.types.ts`):

```typescript
- IFileConverter: Contract for file converters
- IUrlConverter: Contract for URL converters
- IFileService: Contract for file operations
- IConversionResult: Standardized conversion output
```

**Benefits**:

- Easy to mock for unit testing
- Can swap implementations without changing consumers
- Loosely coupled components
- Supports testing in isolation

### 3. **Single Responsibility Principle**

Each component has one clear, well-defined responsibility:

#### **Routes Layer** (`convert.routes.ts`)

- Defines HTTP endpoints
- Maps routes to controller methods
- Applies middleware (auth, upload)
- Registers routes with the application

#### **Controller Layer** (`convert.controller.ts`)

- Handles HTTP request/response
- Performs input validation
- Delegates business logic to service layer
- Sets response headers and status codes
- Transforms service responses to HTTP format

#### **Service Layer** (`convert.service.ts`)

- Orchestrates conversion workflow
- Manages file lifecycle (upload → convert → cleanup)
- Coordinates between converters and file service
- Implements business rules
- Returns domain objects (`IConversionResult`)

#### **File Service** (`file.service.ts`)

- Handles all file system operations
- Generates unique filenames
- Ensures directories exist
- Provides consistent error handling for file operations

#### **Converter Strategies** (`strategies/`)

- Implement specific conversion algorithms
- Isolated, single-purpose classes
- Easy to add new converters

### 4. **Configuration Management**

All configuration centralized in `convert.config.ts`:

```typescript
- UPLOAD_DIR / OUTPUT_DIR: File storage locations
- MAX_FILE_SIZE: Upload size limit (10MB)
- GOTENBERG_URL: External service endpoint (environment-aware)
- SUPPORTED_EXTENSIONS: Allowed file types
- PDF_OPTIONS: PDF generation settings
- PUPPETEER_OPTIONS: Browser configuration
- NETWORK_TIMEOUT: HTTP timeout settings
```

**Benefits**:

- Type-safe constants with TypeScript
- Environment-aware configuration
- Single source of truth
- Easy to modify without code changes

### 5. **Type Safety**

Comprehensive TypeScript interfaces ensure type safety throughout the application:

```typescript
- IConversionResult: Conversion output structure
- IFileConverter: File converter contract
- IUrlConverter: URL converter contract
- IFileService: File service contract
- SupportedExtension: Type-safe file extensions
```

## Project Structure

```
src/
├── types/
│   └── convert.types.ts                    # Type definitions & interfaces
│
├── services/convert/
│   ├── config/
│   │   └── convert.config.ts               # Configuration constants
│   │
│   ├── strategies/
│   │   ├── base-converter.strategy.ts      # Abstract converter base class
│   │   ├── libreoffice-converter.strategy.ts # DOC/DOCX/TXT converter
│   │   ├── url-converter.strategy.ts       # URL to PDF converter
│   │   └── converter-factory.strategy.ts   # Factory for converters
│   │
│   ├── convert.service.ts                  # Main conversion orchestration
│   └── file.service.ts                     # File system operations
│
├── controllers/convert/
│   └── convert.controller.ts               # HTTP request handlers
│
├── middleware/
│   └── convert-upload.middleware.ts        # Multer file upload config
│
└── routes/convert/
    └── convert.routes.ts                   # Route definitions
```

## Data Flow

### File Conversion Flow:

```
1. Client uploads file → POST /convert/file
2. Multer middleware saves file to UPLOAD_DIR
3. Router forwards to controller.convertFile()
4. Controller validates request and calls service.convertFile()
5. Service determines converter via ConverterFactory
6. Converter performs conversion (e.g., via Gotenberg)
7. Service reads converted PDF
8. Service cleans up temporary files
9. Controller sends PDF buffer as response
```

### URL Conversion Flow:

```
1. Client sends URL → POST /convert/url
2. Router forwards to controller.convertUrl()
3. Controller validates URL and calls service.convertUrl()
4. Service uses UrlToPdfConverter (Puppeteer)
5. Converter renders page and generates PDF
6. Service reads converted PDF
7. Service cleans up temporary files
8. Controller sends PDF buffer as response
```

## Design Patterns Used

1. **Strategy Pattern**: Different conversion strategies (LibreOffice, Puppeteer)
2. **Factory Pattern**: `ConverterFactory` creates appropriate converters
3. **Template Method Pattern**: `BaseFileConverter` defines conversion workflow
4. **Dependency Injection**: Constructor injection for loose coupling
5. **Repository Pattern**: `FileService` abstracts file operations

## Key Benefits

### ✅ **Scalability**

- Add new converters by implementing `IFileConverter`
- Register converters with factory at runtime
- No modification of existing code required

### ✅ **Testability**

- All dependencies injected via constructors
- Easy to mock interfaces in unit tests
- Each component testable in isolation

### ✅ **Maintainability**

- Clear separation of concerns
- Single Responsibility Principle
- Well-documented code with JSDoc comments

### ✅ **Extensibility**

- Open/Closed Principle: Open for extension, closed for modification
- New file formats supported by adding new strategy classes

### ✅ **Type Safety**

- Comprehensive TypeScript interfaces
- Compile-time error detection
- IntelliSense support in IDEs

### ✅ **Error Handling**

- Proper try-catch-finally blocks
- Automatic cleanup of temporary files
- Meaningful error messages

## Configuration

### Environment Variables

```bash
GOTENBERG_URL=http://localhost:8100  # LibreOffice conversion service
```

### Supported File Formats

- `.doc` - Microsoft Word 97-2003
- `.docx` - Microsoft Word 2007+
- `.txt` - Plain text files

### Dependencies

- **Gotenberg**: LibreOffice-based conversion service (Docker)
- **Puppeteer**: Headless Chrome for URL conversion
- **Multer**: File upload handling

## API Endpoints

### POST `/convert/file`

Converts uploaded document to PDF.

**Request:**

- Content-Type: `multipart/form-data`
- Body: `file` (binary)

**Response:**

- Content-Type: `application/pdf`
- Body: PDF binary data

### POST `/convert/url`

Converts web page to PDF.

**Request:**

- Content-Type: `application/json`
- Body: `{ "url": "https://example.com" }`

**Response:**

- Content-Type: `application/pdf`
- Body: PDF binary data

## Future Enhancements

1. **Additional Converters**:

    - Excel to PDF converter
    - PowerPoint to PDF converter
    - Image to PDF converter

2. **Advanced Features**:

    - Batch conversion support
    - Async job queue for large files
    - Conversion progress tracking
    - Custom PDF watermarks

3. **Performance Optimizations**:

    - Caching for repeated URL conversions
    - Connection pooling for Gotenberg
    - Browser instance reuse for Puppeteer

4. **Monitoring & Logging**:
    - Structured logging
    - Metrics collection
    - Error tracking integration

## Conclusion

This refactored implementation provides a robust, maintainable, and extensible foundation for file conversion services. By following SOLID principles and leveraging proven design patterns, the codebase is well-positioned for future growth and feature additions while remaining easy to test and maintain.
