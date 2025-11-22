import { Request, Response } from 'express';
import { generativeService } from '@/services/generative/v3/generative.service';

import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { isEmptyObject } from '@/utils/validate';
import { GenerateContentRequestInterface, JobStatusResponseInterface } from '@/dtos/generate';
import { DEFAULT_MAX_ITEM_GEN } from '@/utils/prompt';

class GenerateController {
    constructor() {}

    async generateContent(req: Request, res: Response) {
        const { content, type, inputSetId, method, options } = req.body as GenerateContentRequestInterface;

        if (!content) {
            throw new BadRequest('Content is required');
        }

        if (!type || (typeof type === 'object' && !isEmptyObject(type))) {
            throw new BadRequest('Type is required');
        }

        if (options?.numberOfItem && options.numberOfItem > DEFAULT_MAX_ITEM_GEN) {
            throw new BadRequest(
                `Number of items requested (${options.numberOfItem}) exceeds the maximum limit of ${DEFAULT_MAX_ITEM_GEN}`
            );
        }

        const jobInfo = await generativeService.registerGenerateContentByLLM({
            content,
            type,
            inputSetId,
            method,
            options,
        });

        SuccessResponse.accepted(
            res,
            {
                ...jobInfo,
                sse: {
                    event: jobInfo.status,
                },
            },
            'Content generation in progress'
        );
    }

    async getGenerateContentStatus(req: Request, res: Response<JobStatusResponseInterface>) {
        const { jobId, type } = req.body;

        if (!jobId) {
            throw new BadRequest('Job ID is required ');
        }

        const result = await generativeService.getJobStatus(jobId, type);

        SuccessResponse.ok(res, result);
    }
}

export const generateController = new GenerateController();
