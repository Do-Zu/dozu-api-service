/* Custom DTO for file upload and mindmap generation */
export interface FileUploadRequestInterface {
  /**
   * Path to the uploaded file
   */
  filePath?: string;
  /**
   * Original filename
   */
  fileName?: string;
  /**
   * MIME type of the uploaded file
   */
  mimeType?: string;
  /**
   * File content (if provided directly)
   */
  content?: string;
  /**
   * Type of generation (e.g., 'mindmap')
   */
  type: string;
  /**
   * Optional custom prompt for generation
   */
  customPrompt?: string;
  /**
   * User ID for the request
   */
  userId?: string;
}
