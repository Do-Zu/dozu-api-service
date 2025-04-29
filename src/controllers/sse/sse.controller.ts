import { Request, Response } from 'express';
import { sseManager } from '@/services/sse/sse.service';
import logger from '@/utils/logger';

export class SSEController {
  /**
   * Establishes SSE connection for a specific job
   */
  public static connectToJobEvents(req: Request, res: Response): void {
    const jobId = req.params.jobId;
    logger.info(`SSE connection request for job ${jobId}`);

    // Add client for this specific job - one client per job
    sseManager.addClient(jobId, res);
  }

  /**
   * Returns statistics about SSE connections (admin only)
   */
  public static getStats(req: Request, res: Response): void {
    res.json({
      totalConnections: sseManager.getTotalConnections(),
      timestamp: new Date().toISOString(),
    });
  }
}
