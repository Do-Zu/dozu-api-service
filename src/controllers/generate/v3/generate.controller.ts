import { Request, Response } from 'express';
import { generativeService } from '@/services/generative/v3/generative.service';
import { FileProcessingStatus } from '@/types/generate/generate.type';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { isEmptyObject } from '@/utils/validate';
import {
  GenerateContentRequestInterface,
  GenerateContentResponseInterface,
  JobStatusResponseInterface,
} from '@/dtos/generate';

class GenerateController {
  constructor() {}

  async generateContent(req: Request<{}, {}, GenerateContentRequestInterface>, res: Response) {
    const { content, type } = req.body;

    if (!content) {
      throw new BadRequest('Content is required');
    }

    if (!type || (typeof type === 'object' && !isEmptyObject(type))) {
      throw new BadRequest('Type is required');
    }

    const jobInfo = await generativeService.registerGenerateContentByLLM(req.body);

    SuccessResponse.accepted(
      res,
      {
        ...jobInfo,
        sse: {
          event: 'register',
        },
      },
      'Content generation in progress'
    );
  }

  async getGenerateContentStatus(req: Request, res: Response<JobStatusResponseInterface>) {
    const { jobId } = req.body;

    if (!jobId) {
      throw new BadRequest('Job ID is required ');
    }

    const result = await generativeService.getJobStatus(jobId);

    SuccessResponse.ok(res, result);
  }
}

export const generateController = new GenerateController();
