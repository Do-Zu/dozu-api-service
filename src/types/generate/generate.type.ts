export enum FileProcessingStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface FileMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  path: string;
  uploadedAt: Date;
}

export interface ProcessingResult {
  id: string;
  status: FileProcessingStatus;
  metadata: FileMetadata;
  startTime: number;
  endTime?: number;
  resultPath?: string;
  processedBytes?: number;
  error?: string;
}
