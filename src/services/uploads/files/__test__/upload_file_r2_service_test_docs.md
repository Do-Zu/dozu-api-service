# Upload File R2 Service Unit Test Documentation

This document outlines the test cases for the Upload File R2 Service, formatted to assist in creating the Excel test report.

## 1. Process Single File
**Function Name:** processSingleFile
**Description:** Processes a single uploaded file, generating a new ID and status.

| Test Case ID | Condition / Precondition | Input (Params) | Return (Expected) |
| :--- | :--- | :--- | :--- |
| UTCID 01 | Valid file input | `file`: Valid FileUploadResult object, `userId`: "user-123" | Success object with new ID and COMPLETED status |

## 2. Generate Presigned URL (Upload)
**Function Name:** generatePresignedUrlWithR2Cloudflare
**Description:** Generates a presigned URL for uploading a file to Cloudflare R2.

| Test Case ID | Condition / Precondition | Input (Params) | Return (Expected) |
| :--- | :--- | :--- | :--- |
| UTCID 01 | Valid request | `fileName`: "test.pdf", `fileSize`: 1024, `fileType`: "application/pdf", `contentType`: "application/pdf" | Success object with `uploadUrl`, `fileId`, `fileKey` |
| UTCID 02 | Missing fileName | `fileName`: "", ... | Throws BadRequest Error |
| UTCID 03 | File size exceeds limit | `fileSize`: Huge number, ... | Throws BadRequest Error |
| UTCID 04 | Invalid content type | `contentType`: "application/x-msdownload", ... | Throws BadRequest Error |

## 3. Get File from R2
**Function Name:** getFileFromR2Cloudflare
**Description:** Retrieves a file's content from Cloudflare R2.

| Test Case ID | Condition / Precondition | Input (Params) | Return (Expected) |
| :--- | :--- | :--- | :--- |
| UTCID 01 | File exists in R2 | `fileKey`: "mock-uuid:test.txt" | Success object with `content` (Buffer) and `fileName` |
| UTCID 02 | File body empty/missing | `fileKey`: "key" | Throws InternalServerError |

## 4. Generate Download Presigned URL
**Function Name:** generateDownloadPresignedUrl
**Description:** Generates a presigned URL for downloading a file from Cloudflare R2.

| Test Case ID | Condition / Precondition | Input (Params) | Return (Expected) |
| :--- | :--- | :--- | :--- |
| UTCID 01 | Valid request | `fileKey`: "file-key" | Success object with `downloadUrl` |

## 5. Complete Single File Upload
**Function Name:** completeSingleFileUpload
**Description:** Finalizes the upload process by saving metadata to the database.

| Test Case ID | Condition / Precondition | Input (Params) | Return (Expected) |
| :--- | :--- | :--- | :--- |
| UTCID 01 | Database insert success | `fileName`: "test.pdf", `fileSize`: 1024, `contentType`: "application/pdf", `fileKey`: "key", `userId`: 1 | Success object (DB record) |
| UTCID 02 | Database insert failure | Same as above | Throws DatabaseError |
