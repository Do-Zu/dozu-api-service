import { Request, Response } from 'express';
import { generativeService } from '@/services/generative/v3/generative.service';
import { FileProcessingStatus } from '@/types/generate/generate.type';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';

export class GenerateController {
  constructor() {}

  async generateFlashcards(req: Request, res: Response) {
    const { content } = req.body;

    if (!content) {
      throw new BadRequest('Content is required');
    }

    const jobInfo = await generativeService.generateFlashcardsByLLM(content);

    SuccessResponse.accepted(
      res,
      {
        ...jobInfo,
        // Include instructions for WebSocket connection
        websocket: {
          event: 'register',
          jobId: jobInfo.jobId,
        },
      },
      'Flashcard generation in progress'
    );
  }

  async getFlashcardStatus(req: Request, res: Response) {
    const { jobId } = req.params;

    if (!jobId) {
      throw new BadRequest('Job ID is required ');
    }

    const status = await generativeService.getJobStatus(jobId);

    return SuccessResponse.ok(res, status);
  }
}
