/* Custom DTO for mindmap generation response */
export interface MindmapGenerationResponseInterface {
  /**
   * Unique identifier for the generation job
   */
  jobId: string;
  /**
   * Current status of the job
   */
  status: 'processing' | 'completed' | 'failed';
  /**
   * Response message
   */
  message: string;
  /**
   * Generated mindmap data (if completed)
   */
  mindmapData?: {
    nodes: Array<{
      id: string;
      position: { x: number; y: number };
      data: {
        label: string;
        pageStartIndex?: number;
        pageEndIndex?: number;
        pageCount?: number;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
  /**
   * Error message (if failed)
   */
  error?: string;
  /**
   * Processing timestamp
   */
  timestamp?: string;
}
