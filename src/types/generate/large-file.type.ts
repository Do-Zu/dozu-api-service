/**
 * Progress tracking interface for large file processing
 */
export interface ProcessingProgress {
  /** Current step being processed */
  currentStep: string;
  /** Number of chunks processed */
  chunksProcessed: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Percentage complete */
  percentComplete: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Start time timestamp */
  startTime: number;
  /** Any errors encountered */
  errors: string[];
}

/**
 * Configuration for large file processing
 */
export interface LargeFileProcessingConfig {
  /** Maximum chunk size in characters */
  maxChunkSize: number;
  /** Batch size for concurrent processing */
  batchSize: number;
  /** Delay between batches in milliseconds */
  batchDelay: number;
  /** Maximum file size to process in MB */
  maxFileSizeMB: number;
  /** Enable progress tracking */
  enableProgress: boolean;
}
